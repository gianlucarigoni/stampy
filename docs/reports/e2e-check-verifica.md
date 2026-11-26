# Report: e2e-check — verifica

- **Issue:** nessuna
- **Branch:** chore/e2e-check-verifica
- **Data:** 2026-11-26

## Obiettivo

Verificare se `npm run e2e` parte su un worktree appena creato (punto 4 di B27, #67) e correggere ciò che
impedisce di farlo. Nessuna issue: la correzione è stata chiesta direttamente dal proprietario.

## Decisioni e motivazioni

- **Il DB delle fixture viene dal `.env` del worktree** (`stampy-backend/.env`, `DATABASE_URL`), lo stesso
  che usa l'API sotto test. `E2E_DB` resta come sovrascrittura. Prima il predefinito era `stampy_dev`: su un
  worktree le fixture scrivevano nel database principale mentre l'API leggeva il proprio, quindi il `401`
  su `visit`. Alternativa scartata: fallire sempre se `E2E_DB` non è impostato (obbligherebbe a ricordarlo a ogni giro).
- **Rifiuto esplicito di `stampy_dev`**, salvo `E2E_ALLOW_MAIN_DB=1`: nessun agente scrive per sbaglio sul DB principale.
- **Branding di ripiego nelle fixture** se il DB non ha un locale con branding (forma di `brandingSchema`,
  logo segnaposto). Se esiste un locale con branding, si copia quello, come prima.
- **`cleanup()` non esce più subito** se ci sono locali ma nessun utente (prima lasciava locale e promozione orfani).
- **`t6d.mjs`** aveva `stampy_dev` scritto a mano: ora usa `psql` di `lib.mjs`, quindi lo stesso DB.

## Assunzioni e cose da validare

- Verificato: `staff-input` 7 ✔, `account-delete` 16 ✔, `display-name` 15 ✔ su un worktree nuovo, con DB vuoto e senza `E2E_DB`.
- **Non verificato:** `feedback.mjs`, `history.mjs`, `t6d.mjs` falliscono. È coerente con T8 (#69): dopo F4 sono
  cambiati i testi e il toast del premio non esiste più. Non ho controllato se falliscono allo stesso punto su `main`.
- Dopo un crash di `history`/`t6d` resta un locale nel DB del worktree (nessun danno: il DB si elimina con il worktree).
- `email-request.mjs` non lanciato (richiede `OTP_PROVIDER=console`).
- Il percorso del `.env` è relativo a `lib.mjs` (`../../stampy-backend/.env`).
- Nessuna verifica a vista: gli e2e girano headless.
- Durante il primo giro, prima della correzione, le fixture hanno scritto per default su `stampy_dev`; il
  proprietario ha autorizzato il controllo e non è rimasto nessun residuo (0 utenti `e2e-*`, 0 locali `E2E %`, 0 sessioni `e2e`).

## File toccati e test

- File: `stampy-frontend/e2e/lib.mjs`, `stampy-frontend/e2e/t6d.mjs`.
- Test: nessun test del backend aggiunto o tolto; totale della suite prima 376 → dopo 376. Il frontend è escluso dal TDD.

## Modifiche proposte ai documenti

### CODEBASE.md
Negli e2e del frontend: «Le fixture usano il DB di `DATABASE_URL` in `stampy-backend/.env` (o `E2E_DB`);
rifiutano `stampy_dev` senza `E2E_ALLOW_MAIN_DB=1`; se il DB non ha un locale con branding ne usano uno di ripiego.»

### BACKLOG.md
- B27 punto 5 (e2e su worktree nuovo): **risolto**, da spostare nel §8 con la data.
- `AGENTS.md`, sezione «Worktree»: la frase «gli e2e non partono finché non ne crei uno» non è più vera;
  va riscritta dal proprietario (file protetto).
- `.claude/scripts/worktree-start.sh` potrebbe esportare `E2E_APP_URL`; non fatto (file protetto).

## Lacune emerse e task suggerite

- T8 (#69): `feedback.mjs`, `history.mjs`, `t6d.mjs` falliscono per i testi cambiati da F4.
- Gli script che si fermano a metà lasciano un locale `E2E second` nel DB.
