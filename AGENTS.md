# Stampy

Tessere fedeltà digitali (timbri) in Google Wallet per locali di ristorazione.
Il cliente non scarica nessuna app: tocca un tag NFC / inquadra un QR → login con codice via email →
card nel Wallet → lo staff conferma ogni richiesta di timbro da una web app.

Backend: Node.js + Express 5 + TypeScript (strict), Drizzle ORM, PostgreSQL 16.
Frontend (Vue) in `stampy-frontend/`: login email, pagina del cliente, coda dello staff. Sviluppatore solo, budget quasi zero, nessun cliente pilota ancora.

Più agenti possono lavorare in parallelo su task diverse, ognuno in un **proprio worktree**.
Le regole di questo file valgono per ogni agente, **ogni volta che parte**.

## Lingua

- **Parla italiano** con l'utente: tutte le risposte, i riepiloghi, le domande e i testi di commit/PR.
- Tutta la documentazione in `docs/` è in **italiano**. Mantieni la terminologia coerente con i
  documenti esistenti (es. *locale* per venue, *richiesta di timbro*, *segmento*, *premio*,
  *sfida*, *scadenza lazy*, *tetto assoluto*); non introdurre sinonimi.
- `README.md` e le skill in `.claude/skills/` restano per ora in inglese (non rientrano nella traduzione del 2026-11-05).
- Gli stati del backlog sono `DECIDED`, `TODO`, `TO-DECIDE`, `TO-VERIFY`, `BLOCKED`.
- Le stringhe API per l'utente e gli identificatori nel codice già in italiano (es. `"Riprova più
  tardi"`, `"Codice scaduto"`) sono letterali del codice: lasciali come sono
  salvo richiesta del proprietario, e citali alla lettera nei documenti.
- `docs/archive/` è storia congelata, in italiano originale: non modificarla.

## Da leggere prima (in `docs/` alla radice del repo)

| File | Che cos'è | Chi lo modifica |
|---|---|---|
| `docs/CONTEXT.md` | **Decisioni** di prodotto/architettura/sicurezza (statico) | Solo il proprietario, quando una decisione cambia |
| `docs/CODEBASE.md` | Com'è il codice **adesso** (vivo) | La skill `/docs-sync` (vedi "Documentazione") |
| `docs/BACKLOG.md` | Tutto ciò che non è ancora implementato | La skill `/docs-sync` |

Le decisioni in `CONTEXT.md` sono **chiuse**: non riaprirle né rimetterle in discussione. Se il codice
contraddice `CODEBASE.md`, vince il codice: segnalalo nel tuo report.
Prima di ogni compito, guarda `CODEBASE.md` §8 ("Da dove iniziare") per i file rilevanti.

## Cosa può e non può fare un agente

**Può, senza chiedere:**
- Lavorare nel proprio worktree e sul proprio branch.
- Leggere tutto il repo e la documentazione.
- Modificare i file di codice e di test pertinenti alla propria task.
- Usare il proprio database e le proprie porte (vedi "Worktree").
- Fare commit sul proprio branch, push del proprio branch, merge in `main` alle condizioni del ciclo.
- Scrivere il proprio report in `docs/reports/`.

**Non può, mai (salvo che la task lo dica esplicitamente):**
- Modificare `docs/` (tranne il proprio report), `AGENTS.md`, `.claude/` (skill, script, hook, settings), `.github/`.
  Negli worktree lo blocca un hook (`.claude/hooks/guard-protected.sh`): se la task richiede davvero uno di
  questi file, il proprietario avvia la sessione con `STAMPY_TASK_ALLOW="percorso1,percorso2"`.
  L'hook non vede le scritture via Bash: non aggirarlo con `sed -i` o redirect.
- Toccare worktree, branch, porte o database di altri agenti, né il database principale `stampy_dev`.
- Fare migrazioni di schema (vedi "Migrazioni").
- Lavorare su `main`, fare `push --force`, `--no-verify`, riscrivere la storia.
- Fare commit di segreti, `.env`, chiavi, token o `saveUrl` del Wallet.
- Allargare la task: se serve altro, annotalo nel report come proposta, non farlo.

**Si ferma e lo dice all'utente quando:**
- Un test fallisce (anche un flaky noto come T2), anche dopo un secondo tentativo.
- Il merge ha conflitti o `git pull` non è un fast-forward.
- La task richiede una migrazione, una decisione `TO-DECIDE`, o contraddice `CONTEXT.md`.
- Il diff contiene segreti o `.env`.
- Gli script di worktree falliscono o lasciano risorse a metà.

## Documentazione: report al posto dei docs

I file in `docs/` li aggiorna **solo il proprietario**, con la skill `/docs-sync`.
L'agente invece scrive **un solo file**: `docs/reports/<id-minuscolo>-<slug>.md` (es. `docs/reports/b3-cors-origin.md`),
in italiano, nello stesso branch. `worktree-start.sh` lo crea già dal modello
(`.claude/scripts/report-template.md`); l'agente lo compila:

1. **Obiettivo** della task e riferimento alla issue.
2. **Decisioni** prese e **motivazioni**, con le alternative scartate.
3. **Assunzioni** fatte e cose **da validare**.
4. **File toccati** e test aggiunti (con quanti: il totale della suite prima e dopo).
5. **Modifiche proposte** a `CODEBASE.md` e `BACKLOG.md` (testo pronto da incollare, con le voci da spostare nel §8).
6. **Lacune emerse** e task suggerite.

Il report va committato e finisce in `main` col merge. `/docs-sync` lo integra nei documenti e lo elimina.
Il totale dei test (`BASELINE` in `verify.sh`, `CODEBASE.md` §7) lo riallinea `/docs-sync`, non l'agente.

## Metodo di sviluppo: TDD (backend)

Dal 2026-11-05 il **backend** si sviluppa in **TDD con test concordati prima**. Il frontend per ora
è escluso (se ne riparla dopo).

Per ogni nuova funzione, endpoint, regola o bug nel backend, in quest'ordine:

1. **Proponi i test e fermati.** Scrivi l'elenco dei test come `describe`/`it` (descrizioni in
   italiano, con input e risultato atteso) e **aspetta l'approvazione del proprietario**.
   Non scrivere codice di produzione prima di averla.
2. **Rosso**: scrivi i test approvati, eseguili e mostra che falliscono per il motivo giusto.
3. **Verde**: scrivi il codice minimo che li fa passare.
4. **Refactoring** a test verdi, senza cambiare il comportamento.

Regole:
- **Non modificare un test approvato per farlo passare.** Se il test è sbagliato o il requisito è
  cambiato, dillo esplicitamente e chiedi conferma prima di cambiarlo.
- Un bug si riproduce prima con un test rosso, poi si corregge.
- **Test su comportamento che esiste già** (la task è solo coprirlo): il rosso non c'è. Al suo posto
  fai una **verifica per mutazione**: rompi per un momento il codice di produzione (es. cambia lo
  status), mostra che i test falliscono per il motivo giusto, ripristina e mostra che `git diff` contiene solo i test.
  Dichiaralo nella proposta dei test. I test di rami non raggiungibili senza una race possono simulare
  la race con `vi.spyOn` su una funzione di servizio (mai sul DB); la scelta va nella proposta.
- Niente mock del DB: i test `api/` usano il DB **del proprio worktree** con dati propri, ripuliti in `afterAll`.
- I test che meritano la proposta anche per cambi piccoli: invarianti di sicurezza (404 identico tra
  locali, ruoli, idempotenza, filtri di stato nelle `UPDATE`), regola dei timbri, auth.
- Eccezioni dove il TDD non si applica (dillo e prosegui): configurazione, documentazione, migrazioni
  senza logica nuova, integrazioni con API esterne ancora da verificare (BACKLOG §5).

## Worktree: un agente, un ambiente

Ogni task che modifica file gira in un **worktree separato**, con branch, database e porte propri.
La cartella principale del repo resta su `main`: serve solo ai merge (che fa lo script) e al
proprietario (per `/docs-sync` e per le task sul flusso stesso).
Prerequisito: Docker acceso e container `stampy-db` avviato (gli script lo controllano).

Avvio: `.claude/scripts/worktree-start.sh <id> <slug> [feat|fix|docs|chore] [numero-issue]`
(es. `worktree-start.sh b3 cors-origin feat 12`). Lo script:
- parte da `main` aggiornato (solo fast-forward) e crea il worktree in `../stampy-wt/<id>` col branch `<tipo>/<id>-<slug>`;
- copia `.env`, collega `secrets/`, fa `npm ci` (root, backend, frontend);
- assegna uno **slot** N libero e scrive le porte (backend `3000+N` → `PORT`, frontend `5173+N` → `stampy-frontend/.env.local`),
  `APP_ORIGIN` coerente con la porta del frontend e `DATABASE_URL` verso il database `stampy_wt_<id>`;
- crea quel database nel container condiviso e applica le migrazioni da zero;
- crea `docs/reports/<id>-<slug>.md` dal modello;
- se è data la issue, la sposta in `In Progress`.

Regole:
- Lavora **solo** nella cartella del tuo worktree; porte e `DATABASE_URL` si leggono **sempre** dal suo `.env`. Mai scriverle nel codice.
- I test e `npm run dev` usano il tuo database `stampy_wt_<id>`. Mai il database principale, mai quello di altri agenti.
- Se qualcosa non parte o le porte sono occupate, non cambiare a mano: rilancia lo script o fermati.
- Gli script e2e del frontend (`npm run e2e`) puntano a `E2E_APP_URL`: impostalo alla porta del tuo frontend.

Pulizia: `.claude/scripts/worktree-clean.sh` elenca (e con `--yes` elimina) worktree e database orfani:
lo lancia solo il proprietario.

## Ciclo di ogni task (Git + GitHub Project)

Ogni task è una issue del GitHub Project "Stampy" (progetto 1 di `gianlucarigoni`, colonne Status:
`Todo` → `In Progress` → `Done`). Questo ciclo è **un'autorizzazione stabile del proprietario**:
branch, commit, push e merge in `main` non richiedono di chiedere ogni volta, ma solo alle condizioni sotto.

1. **Inizio.** Lancia `worktree-start.sh` (vedi sopra), passando il numero della issue. Se la task non
   ha una issue, omettilo e dillo. Mai lavorare direttamente su `main`.
2. **Durante.** Segui il TDD: la proposta dei test si fa **nel worktree**, con la issue già
   `In Progress`; finché il proprietario non approva, non c'è commit di codice di produzione.
   Intanto puoi compilare il report.
3. **Fine, solo se tutto è verde.** Esegui `/verify` (typecheck + suite) nel tuo worktree e completa
   il report. Poi `.claude/scripts/worktree-finish.sh <id> -m "messaggio"` (messaggio in italiano, con
   l'attribuzione richiesta). Lo script:
   - fa commit di quello che c'è, rifiutando il diff se contiene `.env`, `secrets`, chiavi o `saveUrl`;
   - prende il lock di merge (un solo agente alla volta) e aggiorna `main` (solo fast-forward);
   - porta `main` dentro il branch e **rilancia la verifica su quella base aggiornata**;
   - fa `git push -u origin <branch>`, poi `merge --no-ff` in `main` dalla cartella principale e `git push origin main`;
   - se ci sono **conflitti** (in uno dei due merge): `merge --abort`, esce con codice 3, `main` non cambia;
     worktree, database e issue restano come sono. Lo dici al proprietario e ti fermi.
   Codici di uscita: 0 ok · 3 conflitti · 4 verifica rossa · 5 diff sospetto.
4. **Chiusura.** Dopo un merge riuscito lo script elimina worktree e database; **il branch resta**.
   **`Done` lo imposta `worktree-finish.sh` e nessun altro**, a merge riuscito, per la issue data a
   `worktree-start.sh`. Non lanciare `project-status.sh … Done` a mano e non usare `gh issue close`.
   Il progetto GitHub ha il workflow "Auto-close issue": con `Done` la issue **si chiude da sola**, ed è voluto.
   Ogni cambio di stato finisce in `../stampy-wt/audit.log` (quando, quale issue, **chi**: agente o
   proprietario, e se la issue risulta chiusa); il proprietario lo legge con `.claude/scripts/audit.sh [issue]`.
   Nel messaggio finale riporta: branch, numeri dei test, esito del merge, percorso del report e la riga di audit.
   **Task senza modifiche al codice** (la voce è superata, solo analisi, solo report): si chiude comunque con
   `worktree-finish.sh`; il report è il contenuto da unire, e la verifica gira lo stesso. Non unire a mano.

Regole:
- **Rosso = nessun merge.** Se un test fallisce, rilancia per capire, riporta l'output e lascia la
  issue in `In Progress`. Mai ridurre o modificare un test approvato per ottenere il verde.
  `/verify` fallisce anche se i test sono *meno* della base (`BASELINE`): non se ne tolgono di nascosto.
- Mai `push --force`, mai `--no-verify`, mai riscrivere la storia di `main`.
- Se il diff contiene segreti, `.env`, chiavi o `saveUrl` del Wallet, fermati prima del commit.
- Il branch di lavoro non si cancella da solo: lo decide il proprietario.
- Task di sola esplorazione/risposta (nessuna modifica ai file) non hanno né worktree né cambio di stato.

## Migrazioni di schema

Le migrazioni non si fanno in parallelo (numerazione e journal di Drizzle andrebbero in conflitto).
Se la task richiede di cambiare lo schema, l'agente **si ferma**, descrive nel report la modifica
necessaria e lo dice al proprietario, che decide chi la fa e quando.
Quando una migrazione è autorizzata: `drizzle-kit generate` poi `migrate` (comandi esatti in
`CODEBASE.md` §6), e **leggi sempre l'SQL generato prima di applicarlo. Mai `push` né `introspect`** —
cancellerebbero i vincoli scritti a mano (es. `promotions_no_overlap`, un EXCLUDE di `btree_gist`).

## Comandi

```bash
npm run dev             # dalla radice del worktree: backend + frontend (porte dal .env del worktree)
                        # (in stampy-backend/: solo nodemon; .env è letto solo all'avvio)
npm run typecheck:all   # tsc su src + scripts + test — deve essere pulito prima di finire
npm test                # Vitest: test/unit (niente DB) + test/api (DB del worktree, app in-process)
npm run test:unit       # solo i test puri
npm run test:watch      # Vitest in modalità watch
npx vitest run -t "nome"  # un solo test per nome
```

I test stanno in `stampy-backend/test/`: `unit/` (mai DB), `api/` (usano il DB e ripuliscono),
`helpers/` (server, builder). Struttura `describe` → `it`. L'output di default mostra solo il
riepilogo e i test falliti. Elenco completo e prerequisiti: `CODEBASE.md` §7.
Dopo aver cambiato un comportamento, esegui i test rilevanti e riporta i numeri.
In `stampy-backend/scripts/` restano solo utilità (non test): `create-owner.ts`, `create-venue.ts`
e `reset-data.sql` (svuota tutti i dati del DB, mantiene lo schema: usalo solo sul tuo DB).

## Regole non negoziabili

Sicurezza / auth
- Ordine dei middleware sulle route protette: `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- L'utente autenticato sta in `req.auth` tramite `requireAuth(req)`. **Mai `req.user`.**
- I ruoli si leggono da `venue_members` a ogni richiesta. Mai in sessione, `req.auth` o body.
  Il `venueId` nel path è un selettore, non una prova di autorizzazione.
- L'ownership si controlla in SQL. La risorsa di un altro restituisce lo **stesso 404** di una inesistente.
- Mai fidarsi del client per autorizzazione, quantità o suddivisione dei timbri.
- Mai dati personali (email, codici, IP) nei log né in `auth_events.metadata`.
- Mai `res.json(row)` — mappa sempre la risposta. Il token di sessione non compare mai in un body.
- Cookie solo tramite `sessionCookieOptions()`.

Dati / correttezza
- Tempo: sempre `now()` del DB nelle query, **mai `new Date()`** per le scadenze.
- Ogni UPDATE di stato porta il filtro di stato nel `WHERE` (`status='pending'`, `revoked_at IS NULL`, …).
- Passa sempre `venueId` insieme agli id delle risorse (le FK composite garantiscono l'isolamento tra tenant).
- La regola dei timbri vive **solo** in `utils/stamps.ts` (`splitStamps`). Non ricalcolarla altrove.
  Card piena (`stamps_count = stampsRequired`) = premio disponibile, non è un bug.
- `stamp_events.request_id` NON è univoco (una richiesta → più eventi); l'unicità è su `idempotency_key`.
- Gli utenti si anonimizzano, non si cancellano. Tutte le FK sono `RESTRICT`.
- Tipi di dominio solo da `db/types.ts`; enum solo dalle definizioni `pgEnum`.

Errori
- Ogni `GenericError` porta uno status esplicito. Errore ricorrente = classe + handler registrato
  **prima** di `genericErrorHandler`. Errori sconosciuti → 500 JSON generico, dettagli solo nei log.

## Non fare

- Aggiungere login con password, login con email non verificata, un'astrazione "wallet provider" (finché
  non esiste Apple), Web NFC API, un motore generico di regole per le promozioni, o Apple Wallet prima che Google sia validato.
- Costruire funzionalità marcate `TO-DECIDE` in `BACKLOG.md` (es. rollover della promozione B2): prima serve una decisione di prodotto.
- Inventare il comportamento di API esterne (Google Wallet REST, Gmail, Google Sign-In). Le voci in
  `BACKLOG.md` §5 vanno verificate sulla documentazione ufficiale; dillo invece di tirare a indovinare.
- Fare commit di segreti, chiavi di service account, `.env`, token o `saveUrl` del Wallet.
- Scrivere codice di produzione del backend prima che i test siano stati approvati (vedi TDD).

## Modo di lavorare

- Modifiche piccole e mirate. Nessuna astrazione speculativa; è un MVP.
- Segui la convenzione della cartella `api/`: `<dominio>.router.ts / .controller.ts / .service.ts / .dto.ts`,
  helper in una sottocartella col nome del loro ambito, middleware in `utils/middlewares/`.
- Se una richiesta è in conflitto con una decisione di `CONTEXT.md`, o sembra prematura/insicura/sovradimensionata,
  dillo con il motivo e un'alternativa prima di implementare. L'ultima parola è del proprietario.
- Distingui fatti, assunzioni e cose da validare. Chiedi solo se sei davvero bloccato; altrimenti
  dichiara l'assunzione e procedi (ma i test del TDD vanno sempre concordati prima).
- Per finire: `npm run typecheck:all` pulito, test rilevanti eseguiti, report compilato in
  `docs/reports/`; poi `worktree-finish.sh` e issue in `Done` come descritto in "Ciclo di ogni task".
