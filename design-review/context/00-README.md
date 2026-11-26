# Design review di Stampy: regole del flusso

Obiettivo: rifare look & UX dell'app (oggi solo mobile) rendendola responsive:
telefono → tablet → PC. Il lavoro è diviso in **chat separate, una per lavoro**;
la memoria tra una chat e l'altra sta nei file `.md` di questa cartella.

## Regole

1. **Una chat = un lavoro.** Ogni chat legge `00-README.md` e `STATE.md` all'inizio,
   scrive il proprio `.md` di output e, alla fine, aggiorna `STATE.md` con il
   "Passaggio di consegne" (fatto / non fatto / decisioni / prossimo passo).
2. **Solo analisi.** Non si modifica il codice dell'app (`src/`, componenti, stili),
   non si creano migrazioni, non si tocca `docs/`, non si fanno commit.
   Le regole TDD/worktree di `AGENTS.md` non si applicano finché non cambia il codice.
   Si scrive solo in `design-review/` (più righe in `.gitignore`).
3. **Ordine dei lavori**
   1. setup + mappa (questa cartella, `01-screen-map.md`, `01b-component-states.md`)
   2. cattura per sezione (screenshot con Playwright)
   3. critica per sezione
   4. design system
   5. pilota Canva
   6. Canva mobile
   7. tablet
   8. desktop
4. **Le chat di cattura NON aprono i PNG** (costano contesto): producono i file e
   un elenco di cosa è stato catturato / cosa è mancato. **Le chat di critica sì**,
   **una sezione alla volta**.
5. **Convenzione file** (in `design-review/screens/`, ignorata da git):
   - schermata: `screens/<sezione>/<ruolo>/<schermata>__<stato>__<tema>.png`
   - stato di interazione di un componente:
     `screens/<sezione>/<ruolo>/<schermata>__<componente>-<stato>__<tema>.png`
   - `<tema>` = `light` | `dark` (l'app segue `prefers-color-scheme`, vedi `main.ts`).
   - Se serve il formato dello schermo, aggiungere il viewport nella cartella
     (es. `screens/mobile/...`) o in coda al nome: **da decidere nella chat 2**
     e annotare in `STATE.md`.
6. **Ruoli** (verificati sul codice e sul DB, vedi `01-screen-map.md` §0):
   `cliente`, `staff`, `proprietario`. Esistono davvero tutti e tre come dati
   (`venue_members.role` = `owner` | `staff`; chi non è membro è cliente).
   Attenzione: **nel frontend `owner` e `staff` vedono le stesse schermate**:
   non esiste una UI separata per il proprietario. Cartella `proprietario/` solo
   se la chat 2 conferma differenze visibili.
7. **Canva**: usare il connettore Canva (`mcp__ebbc6a19-…`); **nessun Brand Kit
   esistente è di Stampy**: non riusarne uno, partire dai token reali del codice
   (arancione `#f16417`, fondo scuro `#171310`, ecc.).
8. **Segreti**: niente `.env`, cookie `sid` o link di salvataggio del Wallet nei file di
   questa cartella. Gli screenshot possono contenere email di test: la cartella
   `screens/` è ignorata da git proprio per questo.

## File di questa cartella (`context/`)

| File | Contenuto |
|---|---|
| `00-README.md` | regole (questo file) |
| `STATE.md` | stato e passaggio di consegne |
| `01-screen-map.md` | schermate per sezione/ruolo, URL, accesso, stati, dati necessari |
| `01b-component-states.md` | componenti interattivi, stati esistenti/mancanti, come catturarli |
| `01c-login-and-accounts.md` | come entrare con ogni ruolo senza email vere, account di test in `stampy_dev` |
