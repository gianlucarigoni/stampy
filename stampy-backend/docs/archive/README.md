# Archivio documenti

Documenti **congelati**: non si aggiornano. Restano per storia e per recuperare il
dettaglio di decisioni e verifiche. In caso di dubbio vince il codice.

I documenti vivi sono tre, in `docs/`:

| File | Ruolo |
|---|---|
| `CONTEXT.md` | contesto e decisioni (statico: cambia solo una decisione) |
| `CODEBASE.md` | mappa del codice, endpoint, dati, test (vivo) |
| `BACKLOG.md` | cosa manca, incluse le cose progettate e mai fatte (vivo) |

| File archiviato | Cosa conteneva |
|---|---|
| `stampy_contesto_progetto.md` | decisioni di prodotto e auth (assorbito in `CONTEXT.md`) |
| `stampy_db_schema.md` | schema e vincoli con esempi, test e motivazioni (assorbito in `CODEBASE.md` §6; il dettaglio completo è in `src/db/schema.ts` e `drizzle/`) |
| `CODEBASE_CONTEXT.md` | mappa del codice al 27/10 (assorbita in `CODEBASE.md`) |
| `progress.md` | storico fasi, test, lezioni, fonti consultate (assorbito in `BACKLOG.md` §8) |
| `Stampy_Handoff_Fase_4c.md` | handoff Fase 4c (email, sessione, `visit`/polling) |
| `Stampy_Handoff_Fase_4d.md` | handoff Fase 4d (rate limit, staff, coda, conferma/rifiuto) |
| `Report_Fase_4d.md` | report della Fase 4d, con la correzione della regola dei timbri |
