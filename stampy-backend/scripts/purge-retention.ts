/**
 * Cancella le righe di sicurezza oltre la retention (BACKLOG B4).
 *
 * Esecuzione (manuale oggi; lo scheduler dell'host si decide con P5):
 *   npx tsx --env-file=.env scripts/purge-retention.ts
 *
 * Cancella: otp_challenges oltre 1 giorno, sessioni scadute o revocate da oltre 30 giorni,
 * auth_events oltre 12 mesi. Non tocca utenti, card, richieste né timbri. Idempotente.
 */
import { pool } from "../src/db";
import retentionSrv from "../src/api/auth/retention/retention.service";

async function main() {
  const r = await retentionSrv.purgeExpired();
  console.log(`otp_challenges: ${r.otpChallenges}, sessions: ${r.sessions}, auth_events: ${r.authEvents} righe cancellate`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
