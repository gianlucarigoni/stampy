# Stampy backend: struttura e convenzioni

Documenti di riferimento in `docs/`: `stampy_contesto_progetto.md` (decisioni di
prodotto), `stampy_db_schema.md` (schema, fonte di verità del DB),
`CODEBASE_CONTEXT.md` (mappa del codice), `progress.md` (storico e test).
Se un documento contraddice il codice, vince il codice.

## Struttura

src/
  api/<dominio>/     router, controller, service, dto di un dominio
    auth/ cards/ health/ requests/ users/ venues/ wallet/
  config/            env.ts (zod), serviceAccount.ts
  db/                index.ts (pool, db), schema.ts, tx.ts (Tx, DbOrTx), types.ts (tipi e enum derivati)
  errors/            una classe + un handler per errore; generico per ultimo
  utils/             auth-context, typed-request, validation-middleware, stamps, email, schemas (zod)
scripts/             test end-to-end e utility (create-owner, create-venue)

Un dominio = una cartella. Nessun import tra router di domini diversi;
i service si importano tra domini solo come dipendenze esplicite.

## Regole

- Tipi di dominio SOLO da `db/types.ts` (derivati da Drizzle). Mai tipi scritti a mano per tabelle.
- Enum: derivati dai `pgEnum` in `schema.ts`. Mai enum TS paralleli.
- Wallet: tutto il codice Google in `api/wallet/`. `cards.service` conosce solo `buildObjectId`.
- Ordine middleware: rate limit -> isAuthenticated -> requireRole -> validate(params) -> validate(body) -> controller.
- Utente autenticato in `req.auth` (letto con `requireAuth`). Ruoli mai in sessione: da `venue_members` a ogni richiesta.
- Il `venueId` del path è un selettore, mai una prova di autorizzazione. Mai fidarsi del client per quantità o tratti.
- `new GenericError(msg, status)`: lo status è sempre obbligatorio. Errori ricorrenti: classe + handler prima del generico.
- Tempo: `now()` del DB nelle query, mai `new Date()` per scadenze.
- Ogni UPDATE di stato ha il filtro di stato nel WHERE.
- Risposte sempre mappate, mai `res.json(riga)`. Nessun dato personale nei log o in `auth_events.metadata`.
- Timbri: la regola sta solo in `utils/stamps.ts` (`splitStamps`).
- Migration: `generate` + `migrate`, mai `push`. Leggere il SQL prima di applicarlo.

## Test (server acceso con `npm run dev`, DB di sviluppo)

npm run typecheck && npm run typecheck:all
npx tsx scripts/stamps-split.ts
npx tsx --env-file=.env scripts/staff-requests.ts
npx tsx --env-file=.env scripts/poll-request.ts
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts

Atteso: 101 controlli verdi. Dopo ogni refactor: typecheck + tutti gli script.

## Da non fare

- Non reintrodurre repository, DI container o layer `domain/` senza un motivo concreto.
- Non reintrodurre un'interfaccia "wallet provider" astratta finché non c'è Apple.
- Non committare `.env`, `secrets/`, `bundle*.txt`.