/**
 * Crea un locale + la sua promozione "timbri" attiva, validando con gli stessi
 * schema zod del backend. Idempotente sullo slug: se esiste non tocca nulla.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/create-venue.ts \
 *     --name "Pizzeria Da Mario" --slug pizzeria-da-mario \
 *     --logo https://placehold.co/512x512.png --color "#AA0000" \
 *     --stamps 10 --reward "Pizza gratis" [--banner https://...] [--yes]
 */
import { eq } from "drizzle-orm";
import { parseArgs } from "node:util";
import { db, pool } from "../src/db";
import { promotions, venues } from "../src/db/schema";
import { env } from "../src/config/env";
import { brandingSchema } from "../src/utils/schemas/branding.schema";
import { promotionConfigSchema } from "../src/utils/schemas/promotion-config.schema";

function fail(msg: string): never {
  console.error(`✘ ${msg}`);
  process.exit(1);
}

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      slug: { type: "string" },
      logo: { type: "string" },
      color: { type: "string" },
      banner: { type: "string" },
      stamps: { type: "string" },
      reward: { type: "string" },
      yes: { type: "boolean", default: false },
    },
  });

  if (env.NODE_ENV === "production" && !values.yes) fail("In produzione serve --yes");

  const { name, slug, logo, color, stamps, reward } = values;
  if (!name || !slug || !logo || !color || !stamps || !reward) {
    fail("Obbligatori: --name --slug --logo --color --stamps --reward (opzionale: --banner)");
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail("Slug non valido (solo a-z, 0-9 e trattini)");

  const branding = brandingSchema.safeParse({
    v: 1,
    logoUrl: logo,
    backgroundColor: color,
    ...(values.banner && { bannerUrl: values.banner }),
  });
  if (!branding.success) fail(`Branding non valido: ${branding.error.message}`);

  const config = promotionConfigSchema.safeParse({ v: 1, stampsRequired: Number(stamps), reward });
  if (!config.success) fail(`Config promozione non valida: ${config.error.message}`);

  const [existing] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, slug)).limit(1);
  if (existing) {
    console.log(`= Locale già esistente, nessuna modifica. venueId: ${existing.id}`);
    return;
  }

  const created = await db.transaction(async (tx) => {
    const [venue] = await tx
      .insert(venues)
      .values({ name, slug, branding: branding.data })
      .returning({ id: venues.id });

    const [promotion] = await tx
      .insert(promotions)
      .values({
        venueId: venue.id,
        type: "stamps",
        name: `${config.data.stampsRequired} timbri: ${config.data.reward}`,
        config: config.data,
        startsAt: new Date(Date.now() - 60_000), // un minuto nel passato: attiva subito
      })
      .returning({ id: promotions.id });

    return { venueId: venue.id, promotionId: promotion.id };
  });

  console.log(`✔ Locale creato`);
  console.log(`  venueId:     ${created.venueId}`);
  console.log(`  promotionId: ${created.promotionId}`);
  console.log(`  URL del tag: ${env.APP_ORIGIN}/api/venues/${created.venueId}/visit`);
}

main()
  .catch((err) => fail(err instanceof Error ? err.message : String(err)))
  .finally(() => pool.end());
