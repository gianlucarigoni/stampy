# Stampy

Tessere fedeltà digitali (timbri) in Google Wallet per locali di ristorazione.
Il cliente non scarica nessuna app: tocca un tag NFC / inquadra un QR → login con codice via email →
card nel Wallet → lo staff conferma ogni richiesta di timbro da una web app.

Backend: Node.js + Express 5 + TypeScript (strict), Drizzle ORM, PostgreSQL 16.
Frontend (Vue) in `stampy-frontend/`: login email, pagina del cliente, coda dello staff. Sviluppatore solo, budget quasi zero, nessun cliente pilota ancora.

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

| File | Che cos'è | Quando toccarlo |
|---|---|---|
| `docs/CONTEXT.md` | **Decisioni** di prodotto/architettura/sicurezza (statico) | Solo quando una decisione cambia |
| `docs/CODEBASE.md` | Com'è il codice **adesso** (vivo) | Nella STESSA modifica che cambia codice, endpoint, schema o test |
| `docs/BACKLOG.md` | Tutto ciò che non è ancora implementato | Sposta le voci nel §8 con una data quando sono fatte |

Le decisioni in `CONTEXT.md` sono **chiuse**: non riaprirle né rimetterle in discussione. Se il codice
contraddice `CODEBASE.md`, vince il codice e il documento va corretto.
Prima di ogni compito, guarda `CODEBASE.md` §8 ("Da dove iniziare") per i file rilevanti.

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
- Niente mock del DB: i test `api/` usano il DB di sviluppo con dati propri, ripuliti in `afterAll`.
- I test che meritano la proposta anche per cambi piccoli: invarianti di sicurezza (404 identico tra
  locali, ruoli, idempotenza, filtri di stato nelle `UPDATE`), regola dei timbri, auth.
- Eccezioni dove il TDD non si applica (dillo e prosegui): configurazione, documentazione, migrazioni
  senza logica nuova, integrazioni con API esterne ancora da verificare (BACKLOG §5).

## Comandi

```bash
npm run dev             # dalla radice del repo: backend + frontend insieme
                        # (in stampy-backend/: solo nodemon; .env è letto solo all'avvio)
npm run typecheck:all   # tsc su src + scripts + test — deve essere pulito prima di finire
npm test                # Vitest: test/unit (niente DB) + test/api (DB di sviluppo, app in-process)
npm run test:unit       # solo i test puri
npm run test:watch      # Vitest in modalità watch
npx vitest run -t "nome"  # un solo test per nome
```

I test stanno in `stampy-backend/test/`: `unit/` (mai DB), `api/` (usano il DB e ripuliscono),
`helpers/` (server, builder). Struttura `describe` → `it`. L'output di default mostra solo il
riepilogo e i test falliti. Elenco completo e prerequisiti: `CODEBASE.md` §7.
Dopo aver cambiato un comportamento, esegui i test rilevanti e riporta i numeri.
In `stampy-backend/scripts/` restano solo utilità (non test): `create-owner.ts`, `create-venue.ts`
e `reset-data.sql` (svuota tutti i dati del DB di sviluppo, mantiene lo schema).

Migrazioni: `drizzle-kit generate` poi `migrate` (comandi esatti in `CODEBASE.md` §6).
**Leggi sempre l'SQL generato prima di applicarlo. Mai `push` né `introspect`** — cancellerebbero
i vincoli scritti a mano (es. `promotions_no_overlap`, un EXCLUDE di `btree_gist`).

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
- Per finire: `npm run typecheck:all` pulito, test rilevanti eseguiti, `CODEBASE.md` aggiornato,
  `BACKLOG.md` aggiornato se una voce è stata completata o è emersa una nuova lacuna.
