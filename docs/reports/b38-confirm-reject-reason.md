# Report: b38 — B38 — Motivo (reason) nel 409 di confirm/reject e card «Scaduta/Già gestita» dello staff

- **Issue:** #85
- **Branch:** feat/b38-confirm-reject-reason
- **Data:** 2026-11-27

## Obiettivo

Il `409 «Richiesta non più valida»` di `confirm`/`reject` aggiunge `reason` = `expired` | `approved` | `rejected`
(dallo stato della riga). Solo backend, nessuna migrazione; il frontend (F11) resta fuori.

## Decisioni e motivazioni

- Nuova classe `RequestNotValidError` (estende `GenericError`, status 409, porta `reason`) con handler
  `requestNotValidHandler` registrato **prima** di `genericErrorHandler` (errore ricorrente = classe + handler).
  Alternativa scartata: aggiungere campi opzionali a `GenericError`, che toccherebbe tutti gli errori.
- Il body è `{error: "GenericError", message: "Richiesta non più valida", reason}`: `error` e `message` identici a prima
  (campo additivo).
- Riga ancora `pending` al momento del 409 → `reason: "expired"`. Succede solo se la scadenza lazy non ha ancora
  marcato la riga ma `expires_at <= now()` (orologio al limite): per il chiamante è scaduta.
- Il `404` (richiesta inesistente o di un altro locale) e il `409 «Nessuna promozione attiva…»` non cambiano e non hanno `reason`.

## Assunzioni e cose da validare

- Il frontend (F11) leggerà `reason`; i testi «Scaduta» / «Già gestita da un collega» restano da confermare in dev.
- `reason: "approved"` e `"rejected"` non distinguono chi ha gestito la richiesta (nessun `resolvedBy` esposto, come da issue).

## File toccati e test

- File: `src/errors/request-not-valid.error.ts` (nuovo), `src/errors/index.ts`,
  `src/api/requests/resolve/resolve.service.ts`, `test/api/resolve-reason.test.ts` (nuovo).
- Test: 10 aggiunti in `resolve-reason.test.ts` (7 rossi prima del codice, 3 di regressione già verdi); nessun test esistente modificato.
  Totale della suite: base di `verify.sh` 401 → 425 (24 in più della base: 10 miei, gli altri 14 vengono da task già
  in `main` dopo l'ultimo riallineamento della base).
- Test 7 (race sull'orologio): `vi.spyOn` su `expireIfDue`, funzione di servizio, non sul DB.

## Modifiche proposte ai documenti

### CODEBASE.md
Nella sezione di `confirm`/`reject`: «Il 409 `Richiesta non più valida` ha il body `{error, message, reason}` con
`reason` = `expired` | `approved` | `rejected` (da `RequestNotValidError`, `src/errors/request-not-valid.error.ts`).
Il 404 e il 409 `Nessuna promozione attiva per questo locale` non hanno `reason`.»

### BACKLOG.md
B38 (#85): parte backend fatta il 2026-11-27; resta la parte frontend, già in F11 (#82). Test: base 401 → 425.

## Lacune emerse e task suggerite

Nessuna.

## Problemi di ambiente

Nessuno.

## Cosa ho capito e cosa no

Istruzioni chiare. `gh issue view` senza `--json` fallisce per la deprecazione di Projects (classic): ho usato `--json`.
