# Migrazioni di schema

Le migrazioni **non si fanno in parallelo**: numerazione e journal di Drizzle andrebbero in conflitto.

## Se la task richiede di cambiare lo schema

L'agente **si ferma**, descrive nel report la modifica necessaria e lo dice al proprietario, che decide chi la fa e quando.

## Quando una migrazione è autorizzata

- La procedura è nella skill `db-migration` (`drizzle-kit generate` poi `migrate`; comandi esatti in `CODEBASE.md` §6).
- **Leggi sempre l'SQL generato prima di applicarlo.**
- **Mai `push` né `introspect`**: cancellerebbero i vincoli scritti a mano, come `promotions_no_overlap`
  (un EXCLUDE di `btree_gist`).
- Si applica solo al database del proprio worktree.
