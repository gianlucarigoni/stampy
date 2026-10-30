# Stampy

Card fedeltà digitale nel Wallet dello smartphone (Google Wallet, Apple in futuro) per
attività locali food & beverage. Nessuna app da scaricare per il cliente.

Per ora esiste solo il backend: `stampy-backend/` (Node.js + Express 5 + TypeScript,
PostgreSQL 16, Drizzle). Frontend non iniziato.

## Documentazione

Tre documenti vivi, uno statico e due da aggiornare:

| File | Ruolo | Quando si tocca |
|---|---|---|
| [`docs/CONTEXT.md`](docs/CONTEXT.md) | contesto e decisioni di prodotto/architettura | solo quando cambia una decisione |
| [`docs/CODEBASE.md`](docs/CODEBASE.md) | mappa del codice, endpoint, dati, test | nella stessa modifica che cambia il codice |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | cosa manca, incluse le cose progettate e mai fatte | quando una voce si chiude o se ne apre una |

I documenti delle fasi passate sono congelati in
[`docs/archive/`](docs/archive/): servono come storia, non
come guida. Le convenzioni per chi scrive codice sono in [`AGENTS.md`](AGENTS.md).

## Avvio rapido

```bash
cd stampy-backend
npm install
# .env: vedi la lista delle variabili in ../docs/CODEBASE.md §1
docker run --name stampy-db -e POSTGRES_USER=stampy -e POSTGRES_PASSWORD=... \
  -e POSTGRES_DB=stampy_dev -p 5432:5432 -d postgres:16
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
npm run dev
```

## Verifiche

```bash
cd stampy-backend
npm run typecheck:all
npx tsx scripts/stamps-split.ts
npx tsx --env-file=.env scripts/staff-requests.ts   # e gli altri script: ../docs/CODEBASE.md §7
```

Atteso: 104 controlli verdi con server e DB di sviluppo accesi.
