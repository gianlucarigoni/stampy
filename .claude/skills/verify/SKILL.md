---
name: verify
description: Esegue la verifica completa di stampy-backend (typecheck + tutti gli script end-to-end, atteso 104 controlli ✔) e riporta cosa è fallito. Usala dopo OGNI modifica al codice del backend, refactor, migration o nuovo endpoint, prima di dire che un lavoro è finito, e ogni volta che l'utente chiede "lancia i test", "verifica", "controlla che funzioni", "è tutto verde?", anche se non nomina gli script.
---

# Verifica stampy-backend

Il progetto non ha un test runner: i test sono script `tsx` in `stampy-backend/scripts/`
che stampano una riga `✔`/`✘` per controllo e chiamano il server vero. `verify.sh` li lancia
tutti in fila e conta le spunte.

## Procedura

1. Esegui:
   ```bash
   .claude/skills/verify/scripts/verify.sh
   ```
   (dalla root del repo; `--skip-typecheck` se l'hai appena lanciato).
2. Exit 2 con "server non raggiungibile": il server `npm run dev` non è acceso. Avvialo
   in background da `stampy-backend/` (`npm run dev`, run_in_background), attendi che
   `/api/health` risponda, poi rilancia. Se l'hai avviato tu, fermalo alla fine.
   Nodemon osserva solo `src/`: dopo modifiche a `src/` aspetta il riavvio prima di rilanciare.
3. Leggi il riepilogo. Successo = exit 0 **e** `✔ 104`.

## Interpretare i fallimenti

- Uno `✘` è un fallimento vero: indaga il codice, non adattare l'asserzione dello script
  per farla passare, a meno che il comportamento sia cambiato di proposito (e allora dillo).
- Totale ≠ 104 senza `✘`: qualcuno ha aggiunto/tolto controlli. Se è voluto, aggiorna
  `EXPECTED` in `verify.sh` e il numero in `AGENTS.md`; altrimenti uno script è uscito presto.
- Errori di connessione al DB: controlla `DATABASE_URL` in `stampy-backend/.env` e che il
  container Postgres (`stampy-db`) sia acceso.
- Gli script puliscono i propri dati di test; non girano con `NODE_ENV=production`.

## Report

Riporta all'utente: typecheck ok/ko, tabella per script (✔/✘), totale vs 104, e per ogni
`✘` la riga di errore. Se qualcosa è fallito dillo chiaramente, senza ammorbidire.

Non usare `npm run script:all`: lancia anche `create-owner`/`create-venue` (non sono test)
e non passa `--env-file=.env`.
