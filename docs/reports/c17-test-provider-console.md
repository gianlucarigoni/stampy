# Report: c17 — C17 — I test otp-request usano il sender reale

- **Issue:** #51
- **Branch:** chore/c17-test-provider-console
- **Data:** 2026-11-11

## Obiettivo

Impedire che i test mandino email vere: con `OTP_PROVIDER=both` o `gmail` nel `.env`, i test `api/otp-request*` spedivano a indirizzi `@test.it` (timeout, `503`, rimbalzi dannosi per l'account Gmail).

## Decisioni e motivazioni

- `test.env: { OTP_PROVIDER: "console" }` in `vitest.config.mts`. `env.ts` carica il `.env` con `dotenv/config`, che non sovrascrive le variabili già presenti: il valore di Vitest vince.
- Due test unit (approvati dal proprietario): `process.env.OTP_PROVIDER === "console"` e `emailSender` istanza di `ConsoleEmailSender`.
- Rosso: lanciato con `OTP_PROVIDER=gmail` + credenziali finte da riga di comando → 2 falliti (`expected 'gmail' to be 'console'`, `GmailEmailSender` al posto di `ConsoleEmailSender`). Verde: stessi comandi dopo la modifica → 2 passati.
- Alternativa scartata: solo lasciare `console` nel `.env` (protezione fragile, non verificata).

## Assunzioni e cose da validare

- I test che costruiscono un `GmailEmailSender` a mano (`email-sender.test.ts`) usano già `jsonTransport`, quindi non spediscono.

## File toccati e test

- File: `stampy-backend/vitest.config.mts`, `stampy-backend/test/unit/vitest-env.test.ts` (nuovo).
- Test: +2; totale della suite prima 264 → dopo 266. Typecheck pulito.

## Modifiche proposte ai documenti

### CODEBASE.md
§7: i test forzano `OTP_PROVIDER=console` via `vitest.config.mts`; `test/unit/vitest-env.test.ts` lo verifica.

### BACKLOG.md
Spostare C17 nel §8 con la data 2026-11-11. Base dei test a 266.

## Lacune emerse e task suggerite

Nessuna.

## Problemi di ambiente

Nessuno (Docker spento al primo avvio degli script, risolto riavviando `stampy-db`).

## Cosa ho capito e cosa no

Istruzioni chiare.
