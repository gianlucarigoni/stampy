// Test di GoogleWalletService.updateCard con client HTTP finto (nessuna chiamata a Google).
// Richiede .env (service account): npx tsx --env-file=.env scripts/wallet-update.ts
import walletSrv from "../src/api/wallet/wallet.service";
import type { Card, Promotion, Venue } from "../src/db/types";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "✔" : "✘"} ${name}`);
  ok ? passed++ : failed++;
}

const card = {
  id: "11111111-1111-1111-1111-111111111111",
  walletObjectId: walletSrv.buildObjectId(
    "11111111-1111-1111-1111-111111111111",
  ),
  publicCode: "ABCD2345",
  stampsCount: 4,
} as Card;
const promotion = {
  config: { v: 1, stampsRequired: 10, reward: "Caffè gratis" },
} as unknown as Promotion;
const venue = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Bar Test",
  branding: {
    logoUrl: "https://example.com/l.png",
    backgroundColor: "#112233",
  },
} as unknown as Venue;

async function main() {
  const calls: any[] = [];
  const svc = walletSrv as any;
  const realAuth = svc.auth;

  svc.auth = {
    request: async (opts: any) => (calls.push(opts), { status: 200 }),
  };
  await walletSrv.updateCard(card, promotion, venue);

  const call = calls[0];
  check("una sola chiamata REST", calls.length === 1);
  check("metodo PATCH", call.method === "PATCH");
  check(
    "URL sul loyaltyObject della card (id codificato)",
    call.url.endsWith(
      `/loyaltyObject/${encodeURIComponent(card.walletObjectId)}`,
    ),
  );
  check(
    "saldo = stamps_count della card",
    call.data.loyaltyPoints.balance.int === 4,
  );
  check(
    "tre text module (reward, stamps, progress)",
    call.data.textModulesData.length === 3,
  );
  check(
    "user_progress allineato al saldo",
    call.data.textModulesData.find((m: any) => m.id === "user_progress")
      .body === "4/10 timbri raccolti",
  );
  check(
    "body senza id/classId/state/barcode",
    ["id", "classId", "state", "barcode"].every((k) => !(k in call.data)),
  );
  check(
    "timeout impostato",
    typeof call.timeout === "number" && call.timeout > 0,
  );
  check(
    "retry abilitato anche per PATCH",
    call.retryConfig?.retry > 0 &&
      call.retryConfig.httpMethodsToRetry.includes("PATCH"),
  );
  check(
    "nessuna notifica (notifyPreference assente)",
    !("notifyPreference" in call.data),
  );

  svc.auth = {
    request: async () => {
      throw Object.assign(new Error("not found"), {
        response: { status: 404 },
      });
    },
  };
  let rejected = false;
  try {
    await walletSrv.updateCard(card, promotion, venue);
  } catch {
    rejected = true;
  }
  check(
    "l'errore Google si propaga al chiamante (che lo logga e lo ignora)",
    rejected,
  );

  svc.auth = realAuth;
  console.log(`\n${passed} ✔, ${failed} ✘`);
  process.exit(failed ? 1 : 0);
}
main();
