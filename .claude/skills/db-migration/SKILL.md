---
name: db-migration
description: Procedura per modificare lo schema Postgres di stampy-backend con Drizzle (schema.ts -> generate -> lettura SQL -> migrate -> tipi -> verifica). Usala ogni volta che serve aggiungere/togliere una colonna, tabella, indice, vincolo, enum o FK, o quando l'utente parla di migration, schema, drizzle-kit, o di un dato che "va salvato nel DB" — anche se non dice esplicitamente "migration".
---

# Migration in stampy-backend

Una migration applicata al DB non si annulla facilmente: per questo il SQL va letto prima.
Tutti i comandi da `stampy-backend/`.

## 1. Modifica `src/db/schema.ts`

- Enum: solo `pgEnum` qui, mai enum TS paralleli.
- FK `RESTRICT` (anonimizzazione invece di cancellazione); vincoli `check` dove servono.
- Una migration per modifica logica.

## 2. Genera

```bash
npx drizzle-kit generate --config=src/drizzle.config.ts --name=<nome_snake_case>
```

Mai `drizzle-kit push` né `introspect`.

## 3. Leggi il SQL generato (`drizzle/NNNN_<nome>.sql`)

Controlla e riporta all'utente:
- `DROP` di colonne/tabelle o rename interpretati come drop+add → perdita di dati.
- `NOT NULL` aggiunto a una tabella con righe senza `DEFAULT` → fallisce o serve backfill.
- Cambi di tipo, enum (aggiungere valori va bene; toglierli no).
- Vincoli/indici con il nome atteso.

Se il SQL non va bene, correggi lo schema e rigenera (cancella il file e la voce in
`drizzle/meta/_journal.json` + snapshot generati, solo se la migration **non** è ancora
applicata). Chiedi conferma all'utente prima di applicare migration distruttive.

## 4. Applica

```bash
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
```

Solo sul DB di sviluppo.

## 5. Tipi

Aggiorna `src/db/types.ts`: `typeof tabella.$inferSelect` per le tabelle,
`(typeof enumX.enumValues)[number]` per gli enum. Mai tipi scritti a mano.
Poi `npm run typecheck && npm run typecheck:all` e sistema gli usi.

## 6. Verifica dei vincoli (se ne hai aggiunti)

Crea `scripts/verify-migration-<N>.sql` sul modello di `verify-migration-3.sql`:
`BEGIN; DO $$ ... RAISE NOTICE 'OK ...' ... $$; ROLLBACK;` così non sporca il DB.

```bash
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-<N>.sql
```

## 7. Chiudere

- Codice che scrive le nuove colonne: `now()` del DB per i tempi, filtro di stato nel WHERE.
- Skill `verify` per tutti gli script.
- Aggiorna la sezione dati di `docs/CODEBASE.md`; la motivazione di un vincolo va in
  `docs/CONTEXT.md`.
