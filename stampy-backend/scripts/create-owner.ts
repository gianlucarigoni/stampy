/**
 * Crea (o promuove) il primo `owner` di un locale.
 *
 * Esecuzione (solo sviluppo/amministrazione, DB raggiungibile):
 *   npx tsx --env-file=.env scripts/create-owner.ts <email> <slug> [--force]
 *
 * Perché serve: il seed non crea righe in `venue_members` e un locale senza owner
 * non è usabile dallo staff. L'utente deve esistere già: la prova di possesso
 * dell'email avviene con il login (codice OTP), mai con questo script.
 *
 * Comportamento:
 *  - utente inesistente / anonimizzato -> errore, nessuna scrittura;
 *  - locale inesistente / archiviato    -> errore, nessuna scrittura;
 *  - non membro                         -> crea la riga con role = owner;
 *  - già owner                          -> nessuna modifica (idempotente);
 *  - già staff                          -> non lo promuove, a meno di `--force`.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db, pool } from "../src/db";
import { users, venueMembers, venues } from "../src/db/schema";

function usage(message: string): never {
  console.error(message);
  console.error("Uso: npx tsx --env-file=.env scripts/create-owner.ts <email> <slug> [--force]");
  process.exit(1);
}

async function main() {
  const force = process.argv.includes("--force");
  const args = process.argv.slice(2).filter((a) => a !== "--force");
  if (args.length !== 2) usage("Servono esattamente due argomenti: email e slug del locale.");

  const email = args[0].trim().toLowerCase();
  const slug = args[1].trim();

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.anonymizedAt)))
    .limit(1);

  if (!user) {
    usage("Nessun utente attivo con questa email. L'utente deve fare prima il primo login (email + codice).");
  }

  const [venue] = await db
    .select({ id: venues.id, name: venues.name })
    .from(venues)
    .where(and(eq(venues.slug, slug), isNull(venues.archivedAt)))
    .limit(1);

  if (!venue) usage(`Nessun locale attivo con slug "${slug}".`);

  const [inserted] = await db
    .insert(venueMembers)
    .values({ userId: user.id, venueId: venue.id, role: "owner" })
    .onConflictDoNothing({ target: [venueMembers.userId, venueMembers.venueId] })
    .returning({ role: venueMembers.role });

  if (inserted) {
    console.log(`Owner creato: ${venue.name} (${venue.id}) per l'utente ${user.id}.`);
    return;
  }

  const [existing] = await db
    .select({ role: venueMembers.role })
    .from(venueMembers)
    .where(and(eq(venueMembers.userId, user.id), eq(venueMembers.venueId, venue.id)))
    .limit(1);

  if (existing?.role === "owner") {
    console.log(`Nessuna modifica: l'utente è già owner di ${venue.name} (${venue.id}).`);
    return;
  }

  if (!force) {
    usage(
      `L'utente è già membro di ${venue.name} con ruolo "${existing?.role ?? "sconosciuto"}". Usa --force per promuoverlo a owner.`,
    );
  }

  await db
    .update(venueMembers)
    .set({ role: "owner" })
    .where(and(eq(venueMembers.userId, user.id), eq(venueMembers.venueId, venue.id)));

  console.log(`Ruolo aggiornato a owner: ${venue.name} (${venue.id}) per l'utente ${user.id}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
