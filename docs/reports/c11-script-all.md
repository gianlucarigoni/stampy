# Report: c11 — `npm run script:all` si ferma

- **Issue:** #22
- **Branch:** chore/c11-script-all
- **Data:** 2026-11-10

## Obiettivo

Sistemare `npm run script:all`, che secondo il backlog (C11) si fermava perché `create-owner` e `create-venue` richiedono argomenti e la catena non passava `--env-file=.env`.

## Decisioni e motivazioni

La voce è **superata**: lo script `script:all` non esiste più. Verificato sul codice attuale:
- `package.json` (radice) ha solo `dev`, `dev:api`, `dev:web`.
- `stampy-backend/package.json` ha `dev`, `start`, `start:dev`, `build`, `typecheck`, `script:create-owner`, `script:create-venue`, `typecheck:all`, `test*`. Nessun `script:all`.
- `grep -rn "script:all"` (escluso `node_modules` e `.git`) trova solo la riga C11 in `docs/BACKLOG.md`.
- La storia git mostra che `script:all` è comparso in `db696eb` ed è sparito in `3db0cc6` (TDD con Vitest, script di test portati in `test/`): la catena serviva a lanciare gli script di prova, ora sono test Vitest.

Nessun codice modificato (la scelta "togliere" o "accettare argomenti" non serve). `script:create-owner` e `script:create-venue` restano utility indipendenti con argomenti.

## Assunzioni e cose da validare

- Assunto che nessun documento esterno (README, CI) citi `script:all`: il grep sul repo non lo trova.
- Fuori scopo: non ho verificato se `script:create-owner/venue` leggano `.env` quando lanciati da `stampy-backend/`.

## File toccati e test

- File: solo questo report.
- Test: nessuno aggiunto o tolto; suite non eseguita (nessuna modifica al codice).

## Modifiche proposte ai documenti

### CODEBASE.md
Nessuna.

### BACKLOG.md
Spostare C11 nel §8 come "superata: `script:all` già rimosso (3db0cc6), verificato 2026-11-10" e toglierla dalla tabella dei TODO.

## Lacune emerse e task suggerite

Nessuna.

## Problemi di ambiente

Nessuno. `worktree-start.sh c11 script-all chore 22` è andato a buon fine (slot 2, api 3002, web 5175, db `stampy_wt_c11`, issue #22 in `In Progress`).

## Cosa ho capito e cosa no

- AGENTS.md e la task erano chiari; l'avvertenza «la voce potrebbe essere superata» era corretta.
- Domanda aperta: AGENTS.md non dice come chiudere una task senza modifiche al codice se il report va comunque in `main`. Non ho lanciato `worktree-finish.sh` (richiederebbe `/verify` e un merge per il solo report): attendo indicazioni.
- Ho sostituito io i segnaposto del titolo e dell'issue nel modello.
