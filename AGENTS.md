# Stampy
Scopo: tessere fedeltà digitali nel Google Wallet per locali food & beverage (una card per locale, cliente unico, timbri confermati sempre dallo staff).
Fase: pre-MVP, Fase 4 (auth). Stack: Node/Express 5/TypeScript, Drizzle, PostgreSQL 16, Vue (non iniziato).

## Come lavorare
- Rispondi in italiano. Se il codice contraddice i documenti, vince il codice.
- Prima di modificare file: proponi il piano (file, motivo, test) e aspetta il mio ok.
- Non decidere al posto mio: raccomanda con pro e contro.
- Non inventare API di servizi esterni (Google Wallet, Gmail, Google Sign-In): segnala "da verificare".
- Mai leggere, stampare o citare .env e secrets/.
- Ogni `GenericError` va scritto con lo status. Mai `drizzle-kit push`. Leggi sempre il SQL di una migration prima di applicarla.

## Documenti (leggili quando servono)
- docs/stampy_contesto_progetto.md: decisioni di prodotto e cosa NON fare
- docs/stampy_db_schema.md: schema DB e vincoli (fonte di verità)
- docs/progress.md: cosa è fatto, testato, da fare
- docs/CODEBASE_CONTEXT.md: mappa del codice (può essere datata)
- docs/Stampy_Handoff_Fase_4c.md: stato attuale e decisioni aperte