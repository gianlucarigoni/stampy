# Report: t2 — T2 — Fallimento isolato in otp-request (5 richieste simultanee)

- **Issue:** #36
- **Branch:** fix/t2-otp-request-concorrenza
- **Data:** 2026-11-18

## Obiettivo

Capire il fallimento isolato del test "5 richieste simultanee" di `POST /api/auth/email/request` (T2), coprirlo con test
di concorrenza (backend: risposte + stato del DB; frontend: Playwright con screenshot) e correggere la causa.

## Decisioni e motivazioni

- **Causa individuata (race in `OtpService.createChallenge`).** Con transazioni in READ COMMITTED, la richiesta B può leggere le
  statistiche (0 sfide) *prima* del commit della richiesta A; poi `invalidateLiveChallenge` di B vede la sfida di A (ormai
  committata, viva), la **invalida** e ne inserisce una nuova: due 202 e il codice mandato ad A non vale più. L'indice UNIQUE
  parziale non protegge, perché l'invalidazione libera il posto prima dell'INSERT.
- **Riproduzione.** Con tempi normali la race **non** esce (30 giri × 5 richieste e 20 simultanee passavano già prima del fix):
  è rarissima, coerente con "visto una volta dopo un riavvio di nodemon". Si riproduce in modo deterministico con `vi.spyOn`
  su `invalidateLiveChallenge` (inserisce una sfida viva via `pool` esattamente in quel punto): rosso prima del fix (202 invece di 429).
- **Fix, due difese:**
  1. `pg_advisory_xact_lock` sul destinatario a inizio transazione: le richieste dello stesso destinatario si serializzano; le
     perdenti vedono lo stato committato e rispondono 429 loggando `otp_send_blocked` (prima, perdendo sull'UNIQUE, la transazione
     faceva rollback e **non** lasciava l'evento: test "eventi" rosso).
  2. `invalidateLiveChallenge` non tocca più una sfida più giovane del cooldown e ancora utilizzabile (se compare lì è di una
     richiesta concorrente): l'INSERT fallisce sull'UNIQUE e si risponde 429 (gestione già esistente).
- Alternative scartate: livello di isolamento SERIALIZABLE/REPEATABLE READ (richiede retry su 40001, più invasivo); solo il lock
  (non soddisfa la race simulata, che scrive fuori dal lock).
- **Nessuna migrazione.**

## Assunzioni e cose da validare

- Che questa fosse davvero la causa del fallimento originale è un'**ipotesi coerente col codice, non una prova**: il fallimento non
  è mai stato osservato con l'output salvato. Se T2 ricompare dopo questo fix, salvare l'output.
- `pg_advisory_xact_lock` usa l'hash 64 bit di `otp:<canale>:<destinatario>`: collisioni tra destinatari sono teoricamente
  possibili e darebbero solo serializzazione inutile, mai errori.
- Gli e2e frontend non sono eseguibili con `OTP_PROVIDER=both`/`gmail` (manderebbero email vere): girano con `OTP_PROVIDER=console`.
  Il 503 è una risposta **simulata dal browser** (`page.route`), non un vero fallimento del sender.
- Tema scuro e resa a schermo: **non verificato a vista** (solo gli screenshot mobile 390 px e desktop 1280 px, guardati a campione).

## File toccati e test

- `stampy-backend/src/api/auth/otp/otp.service.ts` (lock + guardia in `invalidateLiveChallenge`).
- `stampy-backend/test/api/otp-request-race.test.ts` (nuovo, **9 test**): 30 giri × 5 richieste; 20 richieste; `challengeId` = sfida viva nel DB;
  eventi `otp_sent`/`otp_send_blocked`; race simulata; 2 email diverse; raffica dopo il cooldown; raffica col tetto orario;
  maiuscole/minuscole mischiate.
- `stampy-frontend/e2e/email-request.mjs` (nuovo, **18 controlli**) e screenshot in `docs/reports/t2-screenshots/` (11 immagini).
- Test backend: totale suite prima 367 → dopo **376** (✔ 376 ✘ 0). Rosso prima del fix: 2 dei 9 nuovi test.

## Modifiche proposte ai documenti

### CODEBASE.md
Nella sezione dell'OTP/`createChallenge`: «`createChallenge` prende un `pg_advisory_xact_lock` sul destinatario a inizio transazione
(serializza le richieste concorrenti); `invalidateLiveChallenge` non invalida una sfida più giovane del cooldown e ancora utilizzabile».
§7 test: aggiungere `test/api/otp-request-race.test.ts` (9) e `stampy-frontend/e2e/email-request.mjs` (richiede `OTP_PROVIDER=console`). `BASELINE` 367 → 376.

### BACKLOG.md
T2: passare a risolto/da osservare (fix della race di `createChallenge`, 2026-11-18). Lasciare una nota: se si ripresenta, salvare l'output.
Aggiungere a T8/e2e: `email-request.mjs` non è nella catena `npm run e2e` (richiede il provider console).

## Lacune emerse e task suggerite

- `.env` ha `OTP_PROVIDER=both`: qualunque `npm run dev` o e2e da worktree manda email vere dagli indirizzi `@test.it`. Proposta: negli
  script e2e rifiutare `OTP_PROVIDER` diverso da `console`, o default `console` nel `.env` dei worktree creato da `worktree-start.sh`.
- Gli `auth_events` degli e2e non si ripuliscono (la chiave è un hash con segreto): restano nel DB del worktree, innocui.
