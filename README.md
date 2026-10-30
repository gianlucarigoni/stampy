# Stampy

Digital loyalty card in the smartphone Wallet (Google Wallet, Apple in the future) for
local food & beverage venues. No app for the customer to download.

For now only the backend exists: `stampy-backend/` (Node.js + Express 5 + TypeScript,
PostgreSQL 16, Drizzle). Frontend not started.

## Documentation

Three living documents: one static and two to keep updated:

| File | Role | When to touch it |
|---|---|---|
| [`docs/CONTEXT.md`](docs/CONTEXT.md) | product/architecture context and decisions | only when a decision changes |
| [`docs/CODEBASE.md`](docs/CODEBASE.md) | code map, endpoints, data, tests | in the same change that alters the code |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | what is missing, including things designed and never built | when an entry is closed or a new one opens |

Documents from past phases are frozen in [`docs/archive/`](docs/archive/): they serve as
history, not as a guide. Conventions for whoever writes code are in [`AGENTS.md`](AGENTS.md).

## Quick start

```bash
cd stampy-backend
npm install
# .env: see the list of variables in ../docs/CODEBASE.md §1
docker run --name stampy-db -e POSTGRES_USER=stampy -e POSTGRES_PASSWORD=... \
  -e POSTGRES_DB=stampy_dev -p 5432:5432 -d postgres:16
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
npm run dev
```

## Verification

```bash
cd stampy-backend
npm run typecheck:all
npx tsx scripts/stamps-split.ts
npx tsx --env-file=.env scripts/staff-requests.ts   # and the other scripts: ../docs/CODEBASE.md §7
```

Expected: 104 checks green with the dev server and DB running.
