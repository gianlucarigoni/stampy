# Stampy

Tessere fedeltà digitali (timbri) in Google Wallet per locali di ristorazione.
Il cliente non scarica nessuna app: tocca un tag NFC / inquadra un QR → login con codice via email →
card nel Wallet → lo staff conferma ogni richiesta di timbro da una web app.
Backend: Node.js + Express 5 + TypeScript (strict), Drizzle ORM, PostgreSQL 16. Frontend Vue in `stampy-frontend/`.
Sviluppatore solo, budget quasi zero. Più agenti lavorano in parallelo, ognuno nel **proprio worktree**.

## Lingua

- **Parla italiano** con l'utente: risposte, riepiloghi, domande, testi di commit/PR.
- Tutta la documentazione in `docs/` è in italiano, con la terminologia esistente (*locale*, *richiesta di timbro*,
  *segmento*, *premio*, *sfida*, *scadenza lazy*, *tetto assoluto*): niente sinonimi.
- `README.md` e le skill in `.claude/skills/` restano in inglese.
- Stati del backlog: `DECIDED`, `TODO`, `TO-DECIDE`, `TO-VERIFY`, `BLOCKED`.
- Gli ID del backlog (`B…`, `T…`, `V…`, `P…`, `C…`, `F…`) sono univoci: per una issue nuova cerca il primo numero
  libero in `docs/BACKLOG.md` e con `gh issue list --state all` **prima** di dare il titolo; non riusare l'ID di una voce esistente.
- Le stringhe API per l'utente e gli identificatori già in italiano (`"Riprova più tardi"`, `"Codice scaduto"`)
  sono letterali del codice: lasciali come sono e citali alla lettera nei documenti.

## Da leggere prima (in `docs/`)

| File | Che cos'è | Chi lo modifica |
|---|---|---|
| `docs/CONTEXT.md` | **Decisioni** di prodotto/architettura/sicurezza (statico) | Solo il proprietario |
| `docs/CODEBASE.md` | Com'è il codice **adesso** (vivo) | `/docs-sync`, lanciata solo dal proprietario |
| `docs/BACKLOG.md` | Tutto ciò che non è ancora implementato | `/docs-sync`, lanciata solo dal proprietario |

Le decisioni di `CONTEXT.md` sono **chiuse**: non riaprirle. Se il codice contraddice `CODEBASE.md` vince il codice:
segnalalo nel report. Prima di ogni compito guarda `CODEBASE.md` §8 ("Da dove iniziare").

## Regole non negoziabili

Sicurezza / auth
- Ordine dei middleware sulle route protette: `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- L'utente autenticato sta in `req.auth` tramite `requireAuth(req)`. **Mai `req.user`.**
- I ruoli si leggono da `venue_members` a ogni richiesta, mai in sessione, `req.auth` o body (un ruolo in sessione resta
  valido dopo la revoca). Il `venueId` nel path è un selettore, non una prova di autorizzazione.
- L'ownership si controlla in SQL. La risorsa di un altro locale restituisce lo **stesso 404** di una inesistente
  (un 403 rivelerebbe che esiste).
- Mai fidarsi del client per autorizzazione, quantità o suddivisione dei timbri.
- Mai dati personali (email, codici, IP) nei log né in `auth_events.metadata`.
- Mai `res.json(row)`: mappa sempre la risposta. Il token di sessione non compare mai in un body.
- Cookie solo tramite `sessionCookieOptions()`.

Dati / correttezza
- Tempo: sempre `now()` del DB nelle query, **mai `new Date()`** per le scadenze (orologi diversi tra app e DB).
- Ogni UPDATE di stato porta il filtro di stato nel `WHERE` (`status='pending'`, `revoked_at IS NULL`, …): rende idempotenti le race.
- Passa sempre `venueId` insieme agli id delle risorse (le FK composite garantiscono l'isolamento tra tenant).
- La regola dei timbri vive **solo** in `utils/stamps.ts` (`splitStamps`): non ricalcolarla altrove.
  Card piena (`stamps_count = stampsRequired`) = premio disponibile, non è un bug.
- `stamp_events.request_id` NON è univoco (una richiesta → più eventi); l'unicità è su `idempotency_key`.
- Gli utenti si anonimizzano, non si cancellano. Tutte le FK sono `RESTRICT`.
- Tipi di dominio solo da `db/types.ts`; enum solo dalle definizioni `pgEnum`.

Errori
- Ogni `GenericError` porta uno status esplicito. Errore ricorrente = classe + handler registrato **prima** di
  `genericErrorHandler`. Errori sconosciuti → 500 JSON generico, dettagli solo nei log.

## TDD (backend; il frontend è escluso)

1. **Proponi i test e fermati**: elenco `describe`/`it` in italiano, con input e risultato atteso. Aspetta l'approvazione
   del proprietario; fino ad allora nessun codice di produzione.
2. **Rosso**: scrivi i test approvati, eseguili e mostra che falliscono per il motivo giusto. Un bug si riproduce prima con un test rosso.
3. **Verde**: il codice minimo che li fa passare.
4. **Refactoring** a test verdi, senza cambiare il comportamento.

**Non modificare un test approvato per farlo passare**: se è sbagliato o il requisito è cambiato, dillo e chiedi conferma.
Dettagli (mutazione, race, DB, eccezioni): `docs/agents/tdd.md`.

## Vietato

- Modificare `docs/` (salvo il tuo report), `AGENTS.md`, `.claude/`, `.github/`; `docs/archive/` è storia congelata.
  Nei worktree lo blocca un hook: se la task lo richiede davvero, il proprietario avvia la sessione con `STAMPY_TASK_ALLOW`.
  L'hook non vede le scritture via Bash: non aggirarlo con `sed -i` o redirect.
- Toccare worktree, branch, porte o database di altri agenti, né `stampy_dev`. Lavora solo nella cartella del tuo worktree;
  porte e `DATABASE_URL` si leggono sempre dal suo `.env`, mai nel codice. `scripts/reset-data.sql` (svuota il DB) solo sul tuo.
- Lavorare su `main`; `push --force`, `--no-verify`, riscrivere la storia.
- Fare commit di segreti, `.env`, chiavi, token o link di salvataggio del Wallet (nei testi scrivi «link di salvataggio»).
- Impostare `Done` a mano o usare `gh issue close`: lo fa `worktree-finish.sh`.
- Migrazioni di schema; mai `drizzle-kit push` né `introspect` (cancellerebbero i vincoli scritti a mano, es. `promotions_no_overlap`, un EXCLUDE di `btree_gist`).
- Allargare la task: se serve altro, annotalo nel report come proposta.
- Costruire funzioni `TO-DECIDE` (es. rollover della promozione B2): prima serve una decisione di prodotto.
- Aggiungere login con password, login con email non verificata, un'astrazione "wallet provider" (finché non esiste Apple),
  Web NFC API, un motore generico di regole per le promozioni, Apple Wallet prima che Google sia validato.
- Inventare il comportamento di API esterne (Google Wallet REST, Gmail, Google Sign-In): le voci di `BACKLOG.md` §5
  si verificano sulla documentazione ufficiale; se non puoi, dillo.

## Fermati e dillo all'utente quando

- Un test fallisce (anche un flaky noto come T2), anche dopo un secondo tentativo. Rosso = nessun merge.
- Il merge ha conflitti, `git pull` non è un fast-forward, o `worktree-start.sh`/`worktree-finish.sh` falliscono o lasciano risorse a metà.
- La task richiede una migrazione (descrivila nel report), una decisione `TO-DECIDE`, o contraddice `CONTEXT.md`.
- Il diff contiene segreti o `.env`.
- Una richiesta è in conflitto con `CONTEXT.md` o sembra prematura/insicura/sovradimensionata: dillo con il motivo e un'alternativa
  prima di implementare. L'ultima parola è del proprietario.

## Comandi

Tutti i percorsi partono dalla radice del tuo worktree (il `package.json` della radice ha solo `dev`, `dev:api`, `dev:web`).

```bash
npm run dev                # dalla radice: backend + frontend (porte dal .env del worktree)
# da stampy-backend/
npm run typecheck:all      # tsc su src + scripts + test: pulito prima di finire
npm test                   # Vitest: test/unit (niente DB) + test/api (DB del worktree, app in-process)
npm run test:unit          # solo i test puri
npx vitest run -t "nome"   # un solo test per nome
# da stampy-frontend/
npm run type-check         # vue-tsc
# dalla radice
.claude/skills/verify/scripts/verify.sh   # typecheck + suite + confronto con BASELINE (è ciò che fa /verify)
```

I test stanno in `stampy-backend/test/` (`unit/`, `api/`, `helpers/`); elenco e prerequisiti in `CODEBASE.md` §7.
Dopo aver cambiato un comportamento esegui i test rilevanti e riporta i numeri.

## Modo di lavorare

- Modifiche piccole e mirate; nessuna astrazione speculativa (è un MVP).
- Convenzione di `api/`: `<dominio>.router.ts / .controller.ts / .service.ts / .dto.ts`, helper in una sottocartella col nome
  del loro ambito, middleware in `utils/middlewares/`.
- Distingui fatti, assunzioni e cose da validare. Chiedi solo se sei davvero bloccato; altrimenti dichiara l'assunzione e procedi
  (i test del TDD vanno però sempre concordati prima).
- Branch, commit, push e merge in `main` sono un'**autorizzazione stabile del proprietario**, solo secondo il ciclo delle skill sotto.

## Quando → leggi / usa

| Quando | Leggi / usa |
|---|---|
| Prima di iniziare una task che modifica file | skill `task-start` (ogni task è una issue del Project "Stampy") |
| Task di sola lettura o risposta | niente worktree né cambio di stato |
| Prima di proporre o scrivere test | `docs/agents/tdd.md` |
| Nuovo endpoint o modifica di una route | skill `new-endpoint` |
| La task tocca lo schema | `docs/agents/migrazioni.md` (poi, se autorizzata, skill `db-migration`) |
| Tocchi il frontend o lanci gli e2e | `docs/agents/e2e.md` |
| Problema con più soluzioni | skill `decisione` |
| Dopo ogni modifica al backend | `/verify` |
| Prima di compilare il report | `docs/agents/report.md` (un solo file in `docs/reports/`) |
| Prima di chiudere | skill `task-finish` |
| Aggiornare `docs/` | non tocca a te: `/docs-sync`, solo il proprietario |
