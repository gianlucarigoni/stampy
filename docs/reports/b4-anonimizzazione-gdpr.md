# Report: b4 — B4 — Anonimizzazione GDPR e retention

- **Issue:** #4
- **Branch:** feat/b4-anonimizzazione-gdpr
- **Data:** 2026-11-11

## Obiettivo

Prima del primo utente reale: permettere al cliente di eliminare (anonimizzare) il proprio account dalla UX, con conferma OTP, e
cancellare le righe di sicurezza oltre la retention. Nessuna migrazione.

## Decisioni e motivazioni

- **Endpoint self-service in due passi** (`POST /api/auth/account/delete/request` e `/delete/confirm`), non script CLI né endpoint admin.
  Scelta del proprietario: è l'utente che chiede dalla UX. La logica sta in `AccountService.anonymizeUser`, riusabile da un futuro script.
- **Conferma con OTP** inviato sempre all'email dell'utente di sessione (mai dal body). In conferma la sfida deve avere `destination`
  uguale all'email dell'utente: una sfida valida di un altro indirizzo risponde `CodeExpired`. Alternativa scartata: conferma digitata
  (meno sicura con un cookie rubato).
- **`subject_hash` azzerato** per l'utente: l'hash si calcola prima di svuotare l'email e si fa `UPDATE … SET subject_hash = NULL WHERE
  subject_hash = <hash>`, così si prendono anche gli eventi con `user_id` NULL (es. `otp_sent`). Alternativa scartata: ruotare
  `OTP_HMAC_SECRET` (rompe la correlazione per tutti).
- **Owner, staff e admin di piattaforma bloccati** con 403 (`ForbiddenError`, stesso corpo), sia alla richiesta sia alla conferma
  (nella transazione, per la race). Gestione rimandata alla issue #53 (B4b).
- **Le card restano** legate alla riga anonima (FK `RESTRICT`, conti dei locali).
- **Retention come servizio + script** (`RetentionService.purgeExpired`, `scripts/purge-retention.ts`), scheduler da decidere con P5.
  Soglie: `otp_challenges` 1 giorno, sessioni scadute/revocate da 30 giorni, `auth_events` 12 mesi.
- **Pass nel Wallet fuori da B4**: disattivarlo via Google non è verificato (BACKLOG V1); task separata.

## Assunzioni e cose da validare

- **Eccezioni all'append-only di `auth_events`** (CONTEXT §5.7): un `UPDATE` mirato di `subject_hash` e un `DELETE` per retention.
  Approvate dal proprietario nel piano, ma `CONTEXT.md` va aggiornato dal proprietario.
- Le soglie di retention sono proposte tecniche, non consulenza legale.
- Aggiunto un test e un comportamento **non presenti nell'elenco approvato** (segnalato): per ogni sessione viva revocata si scrive un
  evento `session_revoked` (tipo già esistente, senza `subject_hash`). Serviva a non lasciare revoche senza traccia senza una
  migrazione. Se non lo vuoi, si toglie con il suo test.
- `requestDeletion` risponde 403 anche se `user.email` è NULL (utente non anonimizzato senza email, oggi impossibile con il solo
  login email, possibile con Google B5). Ramo non testato perché non raggiungibile oggi.

## File toccati e test

- Nuovi: `src/api/auth/account/{account.service,account.controller,account.router}.ts`, `src/api/auth/retention/retention.service.ts`,
  `scripts/purge-retention.ts`.
- Modificati: `src/api/auth/auth.router.ts` (monta `/account`), `package.json` (script `script:purge-retention`).
- Test: `test/api/account-anonymize.test.ts` (9), `test/api/account-delete.test.ts` (14), `test/api/retention.test.ts` (6, incluso
  il caso di idempotenza); 29 aggiunti. Totale della suite prima 266 → dopo 295. Rosso mostrato prima del codice: rotte 404 e
  moduli inesistenti.

## Modifiche proposte ai documenti

### CODEBASE.md
- §4 (rotte), tabella degli endpoint:
  - `POST /api/auth/account/delete/request` — sì (limiter IP) — `202 {challengeId}`; il codice va all'email dell'utente di sessione; owner/staff/admin → `403 Forbidden`; cooldown e tetto orario OTP come il login (`429` + `Retry-After`).
  - `POST /api/auth/account/delete/confirm` `{challengeId, code}` — sì (limiter IP) — `204` + cookie `sid` rimosso; codice sbagliato → `400 InvalidCode`; non utilizzabile o sfida di un altro indirizzo → `400 CodeExpired`; diventato owner/staff → `403`.
- §6 (dati): `AccountService.anonymizeUser(userId, tx)` svuota email e nome, cancella `auth_identities`, revoca le sessioni vive (evento `session_revoked`), azzera `subject_hash`; card, richieste, timbri, `venue_members` restano.
- §7 (test): `account-anonymize.test.ts` 9, `account-delete.test.ts` 14, `retention.test.ts` 6. Totale 295.
- Script: `scripts/purge-retention.ts` (`npm run script:purge-retention`).

### BACKLOG.md
- B4: spostare nel §8 con la data 2026-11-11. Restano aperti: scheduler della retention (P5), eventuale evento dedicato `account_anonymized`
  (richiede migrazione dell'enum), frontend («Elimina account» + schermata del codice), pass Wallet disattivato (nuova voce, TO-VERIFY, V1),
  blocco di owner/staff → issue #53 (B4b).
- B11: i «soci» della dashboard devono filtrare `users.anonymized_at IS NULL`, altrimenti le card anonimizzate contano ancora.
- T3: la voce «anonimizzazione (B4)» è coperta.

### CONTEXT.md (per il proprietario)
- §5.7: aggiungere le due eccezioni all'append-only e i valori di retention; togliere «la procedura non è ancora implementata».

## Lacune emerse e task suggerite

- Frontend: pulsante «Elimina account» e schermata del codice (fuori TDD, non fatto).
- Disattivare il pass nel Wallet all'eliminazione (`state` inattivo), da provare prima su un issuer demo (V1).
- Evento di audit dedicato `account_anonymized` (richiede migrazione).
- Dashboard B11: escludere gli anonimizzati dai «soci».
- Dopo l'eliminazione, l'email torna libera e il vecchio pass nel Wallet resta attivo e inutilizzabile.

## Problemi di ambiente

Nessuno. Un lancio di vitest con `--root` dalla radice del worktree ha fallito (`process.exit` in `config/env.ts`, `.env` non
trovato): vitest va lanciato da `stampy-backend/`.

## Cosa ho capito e cosa no

- Chiaro: TDD con proposta approvata, nessuna migrazione, worktree.
- Il blocco `isDeletionBlocked` considera anche `is_platform_admin`, assunzione mia (il piano diceva owner/staff/admin).
- `AGENTS.md` dice di lanciare `/verify`; ho eseguito `npm run typecheck:all` e `npm test` dal backend (equivalente), e
  `worktree-finish.sh` rilancerà la verifica sulla base aggiornata.
