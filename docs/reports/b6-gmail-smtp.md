# Report: b6 — B6 — Invio email reale (GmailEmailSender)

- **Issue:** #6
- **Branch:** feat/b6-gmail-smtp
- **Data:** 2026-11-10

## Obiettivo

Inviare i codici OTP per email tramite SMTP con un account Google personale creato per Stampy (app password),
mantenendo il log su console come doppio controllo in sviluppo.

## Decisioni e motivazioni

- **`OTP_PROVIDER` = `console` | `gmail` | `both`** (default `console`). `both` è un'aggiunta rispetto a BACKLOG B6
  (che prevedeva solo `console | gmail`), chiesta dal proprietario per i test.
- **App password via SMTP (`smtp.gmail.com:465`, nodemailer)**, scartato OAuth2: il refresh token in stato «Testing»
  scade dopo 7 giorni (V3) e per un MVP senza clienti è manutenzione inutile.
- **`console` e `both` vietati in produzione**, già in `env.ts` (l'app non parte): loggano il codice OTP, dato personale.
  In produzione è ammesso solo `gmail`.
- **Credenziali obbligatorie solo se il provider non è `console`**; stringa vuota = assente (il `.env` di partenza ha le chiavi vuote).
- **`both`**: prima la console, poi Gmail. Se Gmail fallisce, il codice è comunque nel log e il controller risponde 503 (invariato).
- **Errore di Gmail visibile anche in sviluppo**: `console.error("[EMAIL] invio fallito: <messaggio>")`, mai destinatario o codice.
- **Email** (`otp-email.ts`): HTML con CSS inline, arancione `#f16417` e toni scuri di `stampy.scss`, versione scura via
  `prefers-color-scheme`, più versione testo. Nessuna immagine o risorsa esterna.
- `envSchema` esportato da `env.ts` per testare la validazione senza avviare l'app (nessun cambio di comportamento).

## Assunzioni e cose da validare

- **Invio reale**: provato dal proprietario il 2026-11-10 con `OTP_PROVIDER=both`: la mail arriva (in spam).
- **Spam**: provato il 2026-11-10 con un Gmail personale: l'OTP arriva ma finisce in posta indesiderata. Si risolve col dominio (SPF/DKIM). Invio reale e consegna verificati dal proprietario.
- **Resa dell'email nei client** (Gmail web/app, Outlook, Apple Mail, tema scuro): verificata solo l'HTML, non nei client.
- Versioni: `nodemailer` ^10.5.0 e `@types/nodemailer` ^8.0.2 sono quelle risolte da npm al momento; i tipi non seguono la stessa major.
- Il test `sendOtp riceve email normalizzata e un codice di 6 cifre` non era nell'elenco approvato: l'ho aggiunto io. La prima
  versione usava spazi attorno all'email e falliva con 400 (il DTO li rifiuta); l'ho corretta in solo maiuscolo.

## File toccati e test

- File: `src/config/env.ts`, `src/utils/email/email-sender.ts`, `src/utils/email/gmail-email-sender.ts` (nuovo),
  `src/utils/email/otp-email.ts` (nuovo), `package.json`, `package-lock.json`.
  `.env` (non versionato): aggiunte `OTP_PROVIDER=console`, `GMAIL_USER=`, `GMAIL_APP_PASSWORD=`.
- Test: +27 (`test/unit/env-email.test.ts` 12, `test/unit/email-sender.test.ts` 13, `test/api/otp-request-email-failure.test.ts` 2);
  totale della suite prima 237 → dopo 264.

## Modifiche proposte ai documenti

### CODEBASE.md
- §struttura (riga `email/email-sender.ts`): sostituire con
  `email/email-sender.ts   EmailSender, ConsoleEmailSender, createEmailSender(provider) (console | gmail | both)`,
  `email/gmail-email-sender.ts   GmailEmailSender (SMTP smtp.gmail.com:465, app password)`,
  `email/otp-email.ts   renderOtpEmail(code): oggetto, testo e HTML`.
- §env: `OTP_PROVIDER` (default `console`; in produzione solo `gmail`), `GMAIL_USER`, `GMAIL_APP_PASSWORD` (obbligatorie se il provider non è `console`).
- §7 test: +3 file (vedi sopra), totale 264.

### BACKLOG.md
- B6 → §8 (fatto il 2026-11-10), con la nota: invio reale e consegna in spam ancora da provare a mano.
- V3: «spam» resta non verificato.

## Lacune emerse e task suggerite

- Provider transazionale con dominio (SPF/DKIM) quando ci sarà: già in B6, non fatto.
- Template email: se serviranno altre email (oltre l'OTP), estrarre un layout comune; per ora no (MVP).

## Problemi di ambiente

- Primo avvio di `worktree-start.sh` fallito: `il container 'stampy-db' non risponde` (Docker spento). Risolto dal proprietario, secondo avvio ok.
- `npm install` stampa avvisi su `esbuild` (script di installazione non approvati): non bloccanti, i test girano.

## Cosa ho capito e cosa no

- Chiaro: TDD con proposta dei test approvata prima del codice.
- Assunzione: `.env` del main aggiornato prima di `worktree-start.sh` così il worktree lo eredita; il `.env` principale non è versionato.
