---
name: db-migration
description: Procedure for changing the Postgres schema of stampy-backend with Drizzle (schema.ts -> generate -> read SQL -> migrate -> types -> verify). Use it whenever a column, table, index, constraint, enum or FK must be added/removed, or when the user talks about migrations, schema, drizzle-kit, or data that "has to be saved in the DB" — even if they do not explicitly say "migration".
---

# Migration in stampy-backend

A migration applied to the DB is not easily undone: that is why the SQL must be read first.
All commands from `stampy-backend/`.

## 1. Edit `src/db/schema.ts`

- Enums: only `pgEnum` here, never parallel TS enums.
- `RESTRICT` FKs (anonymization instead of deletion); `check` constraints where needed.
- One migration per logical change.

## 2. Generate

```bash
npx drizzle-kit generate --config=src/drizzle.config.ts --name=<snake_case_name>
```

Never `drizzle-kit push` or `introspect`.

## 3. Read the generated SQL (`drizzle/NNNN_<name>.sql`)

Check and report to the user:
- `DROP` of columns/tables, or renames interpreted as drop+add → data loss.
- `NOT NULL` added to a table with rows and no `DEFAULT` → fails or needs a backfill.
- Type changes, enums (adding values is fine; removing them is not).
- Constraints/indexes with the expected name.

If the SQL is wrong, fix the schema and regenerate (delete the file and the generated
entry in `drizzle/meta/_journal.json` + snapshot, only if the migration is **not** yet
applied). Ask the user for confirmation before applying destructive migrations.

## 4. Apply

```bash
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
```

Only on the development DB.

## 5. Types

Update `src/db/types.ts`: `typeof table.$inferSelect` for tables,
`(typeof enumX.enumValues)[number]` for enums. Never hand-written types.
Then `npm run typecheck && npm run typecheck:all` and fix the usages.

## 6. Constraint verification (if you added any)

Create `scripts/verify-migration-<N>.sql` modeled on `verify-migration-3.sql`:
`BEGIN; DO $$ ... RAISE NOTICE 'OK ...' ... $$; ROLLBACK;` so it does not dirty the DB.

```bash
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-<N>.sql
```

## 7. Wrap up

- Code that writes the new columns: DB `now()` for times, state filter in the WHERE.
- `verify` skill for all scripts.
- Update the data section of `docs/CODEBASE.md`; the rationale for a constraint goes in
  `docs/CONTEXT.md`.
