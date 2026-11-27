# Report: c21 — Ristrutturazione delle istruzioni per gli agenti (opzione C)

- **Issue:** nessuna (task assegnata dal proprietario senza issue)
- **Branch:** chore/c21-agents-docs
- **Data:** 2026-11-27

## Obiettivo

Ridurre `AGENTS.md` (sempre caricato) da 294 a circa 120–150 righe senza perdere regole, spostando il dettaglio in file
letti solo quando servono: due skill con le procedure (`task-start`, `task-finish`) e quattro riferimenti in `docs/agents/`
(`tdd.md`, `migrazioni.md`, `e2e.md`, `report.md`). Task di documentazione: nessun TDD, nessun codice, nessuna migrazione.

## Decisioni e motivazioni

- **ID `c21`.** In `BACKLOG.md` l'ultimo `C` è C19, ma su GitHub esiste già C20; il primo libero è C21.
- **Una sola lista "Vietato" e una sola "Fermati e dillo".** Fuse le vecchie "Non può", "Non fare" e "Si ferma quando";
  i divieti ripetuti 2–3 volte (segreti, `push --force`, codice prima dei test) restano una volta sola.
- **Motivazioni brevi accanto alle regole** (404 identico, `now()` del DB, EXCLUDE `promotions_no_overlap`, ecc.).
- **Skill in inglese, `docs/agents/` in italiano**, come da regola attuale.
- **`migrazioni.md` rimanda alla skill `db-migration`** per la procedura e tiene solo le regole di processo
  (chi decide, stop dell'agente, niente `push`/`introspect`). Alternativa scartata: duplicare i passi di `db-migration`.
- **Tabella "Quando → leggi/usa"** in fondo ad `AGENTS.md`, con le skill già esistenti (`new-endpoint`, `db-migration`, `decisione`, `/verify`).
- **Scartati** il funzionamento interno degli script, `worktree-clean.sh` e `audit.sh` (note al proprietario).
  Dell'audit resta solo "riporta la riga di audit" nel messaggio finale.

## Assunzioni e cose da validare

- Le skill si attivano dalla `description`: vanno provate in una task vera (`task-start` a inizio, `task-finish` a fine).
  Non l'ho potuto verificare in questa task.
- Ho assunto che il codice di uscita 5 si applichi alle righe aggiunte con la parola vietata, come da vecchio `AGENTS.md`.
  Nei file nuovi non ho scritto quella parola (uso «link di salvataggio»).
- Ho assunto che `docs/agents/` sia modificabile solo dal proprietario (vedi domande aperte).

## File toccati e test

- Modificato: `AGENTS.md` (294 → 141 righe).
- Nuovi: `.claude/skills/task-start/SKILL.md` (47), `.claude/skills/task-finish/SKILL.md` (58),
  `docs/agents/tdd.md` (35), `migrazioni.md` (15), `e2e.md` (22), `report.md` (26); questo report.
- Test: nessuno aggiunto o tolto. Suite prima → dopo: **376 → 376** (`/verify`: typecheck pulito, ✔ 376 ✘ 0, base 376).

### Mappatura: vecchio `AGENTS.md` → destinazione

Sigle: **A** = AGENTS.md · **S-start/S-fin** = skill · **tdd/mig/e2e/rep** = `docs/agents/*.md` · **R** = riportata qui come stato corrente · **✗** = eliminata.

| Regola / istruzione | Dove |
|---|---|
| Contesto, stack, più agenti nei worktree | A |
| Lingua: italiano; docs in italiano e terminologia; README/skill in inglese; stati backlog | A |
| ID del backlog univoci, cerca il primo libero | A (aneddoto B24/B25: ✗, resta in R) |
| Stringhe API italiane letterali | A |
| `docs/archive/` congelata | A → Vietato |
| Tabella CONTEXT/CODEBASE/BACKLOG; decisioni chiuse; il codice vince; §8 | A |
| Può: lavorare nel worktree, leggere, committare/pushare/unire secondo il ciclo | A (autorizzazione stabile) + S-fin |
| Non può: modificare `docs/`/`AGENTS.md`/`.claude/`/`.github/`, hook e `STAMPY_TASK_ALLOW`, no Bash per aggirarlo | A → Vietato |
| Non può: toccare altri agenti o `stampy_dev`; porte e `DATABASE_URL` dal `.env`; `reset-data.sql` solo sul proprio DB | A → Vietato |
| Non può: `main`, `push --force`, `--no-verify`, riscrivere la storia; segreti e link di salvataggio; allargare la task | A → Vietato |
| `Done` solo da `worktree-finish.sh`, mai `gh issue close` | A → Vietato + S-fin |
| Si ferma: test rosso, conflitti, script a metà, migrazione/`TO-DECIDE`/contraddizione, diff con segreti, richiesta prematura | A → Fermati |
| Documentazione: un solo report, sezioni, "prima → dopo", `BASELINE`, `/docs-sync` lo integra | rep (+ riga in A) |
| TDD: 4 passi, proposta e stop, rosso/verde/refactoring, bug con test rosso, non modificare un test approvato | A |
| TDD: mutazione, `vi.spyOn` per le race, niente mock del DB, casi con proposta obbligatoria, eccezioni, proposta nel worktree | tdd |
| Worktree: Docker da controllare prima, comando di avvio, esito, nessuna correzione a mano | S-start |
| Worktree: cosa fa lo script (fast-forward, `npm ci`, slot, migrazioni, ecc.) | ✗ |
| E2E: `E2E_APP_URL`, fixture, rifiuto di `stampy_dev`, "non verificato a vista" | e2e |
| E2E: script che falliscono per F4 (T8, #69) | R |
| Prima di `worktree-finish.sh` fermare i processi, per PID/porta, mai `pkill -f` largo | S-fin |
| `worktree-clean.sh`, `audit.sh`, passi del proprietario dopo una pulizia fallita | ✗ |
| Ciclo: `/verify`, `worktree-finish.sh`, codici 0/3/4/5, pulizia fallita dopo il merge, messaggio finale, task senza codice | S-fin |
| Ciclo: issue `In Progress`, task senza issue, sola esplorazione senza worktree | S-start + A (tabella) |
| Rosso = nessun merge; `/verify` fallisce sotto `BASELINE` | A → Fermati + S-fin |
| Migrazioni: non in parallelo, stop e report; `generate` poi `migrate`; SQL letto; mai `push`/`introspect` | mig + A → Vietato |
| Comandi (`dev`, `typecheck:all`, `test`, `test:unit`, `vitest -t`, `type-check`, `verify.sh`) e struttura dei test | A |
| Regole non negoziabili di sicurezza/auth, dati/correttezza, errori | A, per intero |
| Non fare: password, email non verificata, wallet provider, Web NFC, motore di regole, Apple Wallet | A → Vietato |
| Non fare: funzioni `TO-DECIDE`; inventare API esterne | A → Vietato |
| Modo di lavorare: piccole modifiche, convenzione `api/`, fatti/assunzioni, conflitto con CONTEXT | A |
| "Per finire…" e ripetizioni (segreti, codice prima dei test) | ✗ duplicati |

### Verifica «niente è andato perso»

Confronto con `git show main:AGENTS.md` regola per regola: tutte presenti, tranne le **due omissioni di dettaglio** qui sotto.
Righe: **294 → 141** (`AGENTS.md`); in più 47 + 58 (skill) e 98 (`docs/agents/`), caricate solo quando servono.

- `npm run test:watch` non è nel blocco comandi (da riaggiungere, vedi lacune).
- La riga "l'output di default mostra solo il riepilogo e i test falliti" è stata tolta di proposito (vive in `CODEBASE.md` §7).

## Modifiche proposte ai documenti

### CONTEXT.md
Aggiungere nella sezione sul processo di sviluppo: «Le istruzioni per gli agenti sono a tre livelli: `AGENTS.md` (regole sempre
caricate, circa 140 righe), skill `task-start`/`task-finish` (procedure con comandi) e `docs/agents/` (riferimenti letti solo
quando servono). Ogni regola sta in un solo punto.»

### CODEBASE.md
Nella sezione sugli strumenti/processo: «`docs/agents/` contiene `tdd.md`, `migrazioni.md`, `e2e.md`, `report.md`;
le skill `task-start` e `task-finish` coprono l'avvio e la chiusura di una task nel worktree.»

### BACKLOG.md
- Nuova voce (primo ID libero, da ricontrollare): riaggiungere `npm run test:watch` ai comandi di `AGENTS.md` (P3).
- Nuova voce: gli e2e `feedback`, `history`, `t6d` falliscono per i testi cambiati da F4 (T8, #69). Era nel vecchio `AGENTS.md`;
  se T8 non è chiusa, la voce esiste già.
- Nuova voce: provare le skill `task-start`/`task-finish` su una task vera e correggere le `description` se non si attivano.
- Nota storica: l'ID B24/B25 riusato per errore è all'origine della regola sugli ID univoci (ora senza l'aneddoto in `AGENTS.md`).
- Date tolte da `AGENTS.md`: «dal 2026-11-05» (TDD) e «traduzione del 2026-11-05» (README e skill in inglese).

## Lacune emerse e task suggerite

- **`STAMPY_TASK_ALLOW` accetta solo percorsi esatti di file**, non cartelle né prefissi; la prima sessione era partita con le cartelle
  e il blocco è rimasto. Suggerito: documentarlo nel commento dell'hook, oppure accettare i prefissi con la barra finale.
- Una sessione già avviata non rilegge la variabile d'ambiente: dopo averla cambiata serve riavviare.
- `npm run test:watch` da riaggiungere ad `AGENTS.md` (2 secondi di lavoro, ma richiede una sessione con `AGENTS.md` consentito).

## Problemi di ambiente

- Container `stampy-db` fermo all'avvio (`Exited (0)`): l'utente l'ha riavviato, poi `worktree-start.sh` è andato a buon fine.
- L'hook `guard-protected.sh` ha bloccato la scrittura delle skill e di `docs/agents/` (allowlist con cartelle, non con file).
  Non l'ho aggirato: i sei file sono stati creati dal proprietario copiandoli a mano nel worktree.

## Cosa ho capito e cosa no

- Chiaro: obiettivo, struttura di arrivo, divieto di toccare gli script.
- Ambiguo: «riporta l'hook a come era prima». Non avevo modificato l'hook; l'ho letto come «non cambiarlo».
- Domande aperte: (1) `/docs-sync` deve aggiornare `docs/agents/`? Per ora no: lo lancia il proprietario e `docs/agents/` resta solo suo.
  (2) Le skill nuove vanno aggiunte alla lista di quelle elencate in `docs-sync`, se questa le richiama?
