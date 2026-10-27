# Stampy — Handoff Fase 4d (rate limit, staff, coda, conferma/rifiuto: si riparte dall'aggiornamento del pass Google)

**Data snapshot:** 27 ottobre 2026
**Branch:** `main`. Ultimo commit noto: `948036d` ("visit e polling con l'utente di sessione"). **La Fase 4d è scritta e testata in locale ma non committata**: `git status` mostra i file nuovi e modificati elencati al §4. Il commit va fatto dall'utente.
**Tag consigliato:** `fase-4d-chiusa` dopo il commit.
**Esito test:** **101 controlli verdi** su 6 script, `npm run typecheck` pulito, DB di sviluppo ripulito, server dev fermato.

> Incollare come primo messaggio della nuova chat. Il codice prevale sempre sui documenti. Collegati: `stampy_contesto_progetto.md` (decisioni di prodotto), `stampy_db_schema.md` (schema e vincoli, fonte di verità), `CODEBASE_CONTEXT.md` (mappa del codice), `progress.md` (storico e test), `Report_Fase_4d.md` (report della fase, con la correzione della regola dei timbri al §7).
> Questo file **sostituisce `Stampy_Handoff_Fase_4c.md`**.

## 0. Istruzioni operative per la nuova chat

- Rispondi in italiano. Critica quando serve, raccomanda con motivazioni, **l'utente decide**.
- **Nessuna modifica senza approvazione esplicita, punto per punto.** Per ogni proposta: fatti verificati, alternative con pro/contro, raccomandazione, file toccati, comandi e test attesi. Poi attendere.
- Distingui FATTO VERIFICATO / IPOTESI / RISCHIO / DA VERIFICARE. Non inventare API, SDK o limiti di servizi esterni (Google Wallet, Google Sign-In, Gmail, Apple, Bruno): ricerca nella documentazione ufficiale **solo quando l'utente lo dice**.
- Non chiedere `.env`, chiave JSON del service account, né il `saveUrl` completo. Mai leggere o citare `secrets/`.
- **Vincolo di budget**: l'utente incassa prima di investire. Soluzioni a costo 0 o minimo.
- Per i test si usano **script TypeScript** in `scripts/` con controlli ✔/✘ (nessun framework automatico). Gli script stampano risposta e singoli controlli: per diagnosticare servono quelle righe, non il solo riepilogo.
- **Ogni `GenericError` va scritto con lo status** (es. `, 400`): senza risponde 500.
- Mai `drizzle-kit push`. Leggere sempre il SQL di una migration prima di applicarla.

## 1. Stato di partenza (fatti al 27/10)

- **Fase 3 chiusa**: schema DB e migration 1, card Google Wallet, richieste pendenti con scadenza lazy, polling cliente.
- **Fase 4a-c chiusa (24-26/10)**: migration 2 (11 tabelle), percorso email con OTP, `isAuthenticated`, sessione scorrevole con tetto assoluto, logout, `visit`/polling con l'utente di sessione e ownership in SQL.
- **Fase 4d chiusa (27/10)**:
  - **migration 3** applicata e verificata (6 controlli): `stamp_events.request_id` non più UNIQUE, indice `stamp_events_request_idx`;
  - **rate limit di `visit`**: 10 richieste nuove/ora per card, contate su `stamp_requests`, 429 con `Retry-After`, nessun cooldown;
  - **limiter IP** `express-rate-limit` sulle rotte `/auth/email/*` (30/15 minuti), attivo in produzione o con `IP_RATE_LIMIT=on`, `TRUST_PROXY` numerico;
  - **auth staff**: `requireRole("owner","staff")` su `venue_members` a ogni richiesta, `GET /api/venues/mine`, `scripts/create-owner.ts`;
  - **coda staff**: `GET /api/venues/:venueId/requests` (senza email, max 50);
  - **conferma/rifiuto** in transazione: `splitStamps`, eventi con `idempotency_key = {requestId}:{n}`, saldo sulla card lockata, 404/409 distinti;
  - **polling cliente** esteso a `{status, expiresAt, stampsCount, stampsRequired}`;
  - **regola dei timbri corretta**: la quantità è il **totale dei prodotti, premio compreso**.
- **API esistenti**: `GET /api/health`, `POST /api/cards/google` (dev, **senza auth**), `POST /api/venues/:venueId/visit`, `GET /api/requests/:requestId`, `GET /api/venues/mine`, le tre rotte staff, `POST /api/auth/email/request`, `POST /api/auth/email/verify`, `GET /api/auth/me`, `POST /api/auth/logout`.
- **Non esiste ancora**: aggiornamento del pass Google dopo la conferma, login Google, `GmailEmailSender`, frontend, collection Bruno.

## 2. Decisioni chiuse nella Fase 4d (non riaprire)

| # | Tema | Decisione |
|---|---|---|
| D1 | Ambito della fase | Rate limit + staff + coda + migration 3 + tratti + confirm/reject **solo DB**; il pass Wallet può restare invariato (Fase 4e) |
| D2 | `venueId` delle rotte staff | Nel **path**, validato contro `venue_members`; il ruolo non arriva mai da body o sessione |
| D3 | Non-membro | **403** con `ForbiddenError` + handler dedicato, come gli altri errori |
| D4 | Rate limit di `visit` | Derivato da `stamp_requests`: **10 richieste nuove/ora per card**, `Retry-After`, nessun cooldown |
| D5 | Limiter IP | `express-rate-limit` attivo **in produzione** (attivabile in sviluppo con `IP_RATE_LIMIT=on`, disattivabile con `off`); `TRUST_PROXY` numerico (default 0) |
| D6 | Quantità della conferma | Lo staff inserisce **quanti prodotti sono stati consumati, premio compreso** (corretta il 27/10, vedi §3) |
| D7 | Tetto per conferma | **50** prodotti |
| D8 | Doppia conferma | **409**, nessun doppio conteggio |
| D9 | Contenuto della coda | `{requestId, publicCode, stampsCount, stampsRequired, createdAt, expiresAt}`, **mai l'email** |
| D10 | Polling cliente | Esteso con `stampsCount` e `stampsRequired` |
| D11 | Test | Script TypeScript con ✔/✘ come gli esistenti, nessun framework |
| D12 | Primo `owner` | `scripts/create-owner.ts <email> <slug>`, idempotente, `--force` per promuovere uno `staff` |

**Nome del campo body**: resta `stamps` (approvato in fase 4d) ma il valore è la **quantità totale di prodotti**, premio compreso. È documentato nel DTO.

## 3. Regola dei timbri (corretta il 27/10)

La prima implementazione contava il prodotto in premio **fuori** dalla quantità: 15 prodotti da 0 davano card 5/10 e, con quantità esattamente sulla soglia, la card veniva azzerata consumando un premio mai erogato. La regola corretta (già nei documenti di prodotto, §4.4 passo 7):

```
soglia 10, card 0, quantità 15
  prodotti 1-10   → stamp 10      (card piena: premio disponibile)
  prodotto 11     → redeem 1      (gratis, consuma 1 della quantità)
  prodotti 12-15  → stamp 4
  → card 4/10, 1 premio consumato
```

- Quantità **esattamente** sulla soglia (10 da 0): card resta **10/10**, premio **disponibile**; il prodotto successivo è gratis (`confirm` con quantità 1 → solo `redeem`, card 0).
- `stampsCount` ∈ `[0, stampsRequired]`; `rewards` = premi **consumati**.
- Vale solo per `type = "stamps"` (l'unico modello dell'MVP).

## 4. Struttura dei file toccati nella 4d

**Nuovi**

```text
src/utils/stamps.ts                         splitStamps (funzione pura)
src/utils/schemas/promotion-config.schema.ts {v:1, stampsRequired 1–100, reward}
src/api/venues/membership.service.ts        ruolo da venue_members, locali dell'utente
src/api/venues/membership.middleware.ts     requireRole
src/api/venues/staff.controller.ts          queue, confirm, reject
src/api/venues/staff.dto.ts                 params staff + confirmDTO (1–50)
src/api/requests/resolve.service.ts         conferma/rifiuto in transazione
src/api/auth/ip-rate-limit.middleware.ts    express-rate-limit per IP
src/errors/forbidden.error.ts               403 + handler
drizzle/0003_stamp_events_request_id_not_unique.sql
drizzle/meta/0003_snapshot.json
scripts/stamps-split.ts                     20 controlli (funzione pura)
scripts/staff-requests.ts                   24 controlli end-to-end
scripts/create-owner.ts                     primo owner
scripts/verify-migration-3.sql              6 controlli (ROLLBACK)
docs/Report_Fase_4d.md                      report della fase
```

**Modificati**

```text
src/db/schema.ts                  request_id con indice non unique
src/api/requests/requests.service.ts   rate limit, coda, polling con saldo, refreshStatus → boolean
src/api/requests/requests.controller.ts 4 campi nel polling
src/api/venues/venues.controller.ts    visit con rate limit, mine
src/api/venues/venues.router.ts        rotte staff, ordine middleware
src/api/auth/email/email.router.ts     limiter IP
src/config/env.ts                      TRUST_PROXY, IP_RATE_LIMIT
src/app.ts                             trust proxy (solo se > 0)
src/errors/generic.ts                  solo GenericError espone status/messaggio
src/errors/index.ts                    forbiddenHandler
src/utils/types/enum.ts                MemberRole
scripts/poll-request.ts                contratto a 4 campi
package.json / package-lock.json       express-rate-limit 8.7.1
drizzle/meta/_journal.json
docs/*.md                              aggiornati il 27/10
```

## 5. Cosa resta (in ordine consigliato)

1. **Commit della Fase 4d** (i file del §4) + tag `fase-4d-chiusa`. Prima: `git status --short`, `npm run typecheck`, riesecuzione degli script.
2. **Fase 4e — aggiornamento del pass Google via REST** dopo la conferma: **prossimo passo tecnico**, è il gate del flusso end-to-end. Da verificare nella documentazione ufficiale (solo se l'utente lo dice): auth/scope, patch vs sostituzione, campi aggiornabili (`loyaltyPoints.balance`, `user_progress`), latenza, se la class è modificabile. Oggi il DB e il polling web sono corretti ma il Wallet mostra il saldo vecchio.
3. **Frontend** (Vue) staff e cliente: il backend espone già tutto. Polling cliente ogni 1–2 s.
4. **Invio email reale** (`GmailEmailSender`; limiti di Gmail da verificare).
5. **Login Google** (rimandato dopo lo staff; configurazione esterna e token di test da verificare).
6. `wallet_status`, branding di default, personalizzazione estetica, hosting con URL fisso.

## 6. Punti aperti e verifiche (non assunti)

- **Aggiornamento del pass via REST**: scope, patch vs sostituzione, campi aggiornabili, latenza, class modificabile. **Non committare mai** output con token o `saveUrl`.
- **`TRUST_PROXY`** dietro il proxy di staging: numero di hop, non `true`; altrimenti il limiter IP mette tutti gli utenti nello stesso secchio.
- **Cookie `httpOnly` su iPhone/HTTPS**: il limite ITP dei 7 giorni non dovrebbe applicarsi ai cookie scritti dal server, ma se l'IP è scollegato dal sito può scattare. Frontend e `/api` sulla stessa origine.
- **Findings aperti dalla 4d, non corretti**: JSON malformato → 500 (atteso 400); rotta inesistente → HTML Express; `cors()` aperto; `POST /api/cards/google` senza auth; `TryLaterError` con `name="TryLaterFound"` e messaggio inglese.
- **Rollover/cambio promozione** e destino dei timbri maturati: decisione di prodotto, da discutere con i gestori.
- **Rotta "riaggiungi card"**, publishing access Google, NFC su iPhone/Android, dominio e URL fisso, supporto fisico per il locale.
- **Collection Bruno**: solo proposta (cartelle `00–09`, fixture via script: Bruno non ha accesso al DB né ai codici OTP). Nulla creato.

## 7. Test: cosa è coperto

| Script | Controlli | Copertura |
|---|---|---|
| `scripts/stamps-split.ts` | **20/20** | funzione pura: soglie, soglia esatta, premi multipli, card piena, soglia 1, tetto 50, input impossibili |
| `scripts/staff-requests.ts` | **24/24** | 401/403, `/venues/mine`, coda senza email, conferma 15 → card 4/10 con 3 eventi, polling con saldo, doppia conferma 409, validazione, rifiuto, scadenza, cross-venue 404, promozione cambiata 409 con rollback, owner, soglia esatta, prodotto su card piena, card piena +13, rate limit 429 e ritocco senza quota |
| `scripts/poll-request.ts` | 12/12 | `visit`/polling con sessione, ownership, scadenza lazy |
| `scripts/otp-request.ts` | 13/13 | cooldown, tetto orario, race, risposta uniforme |
| `scripts/otp-verify.ts` | 16/16 | tentativi, monouso, scadenza, eventi, race |
| `scripts/session.ts` | 16/16 | 401 unico, scorrimento, tetto, logout, metadata |
| `scripts/verify-migration-2.sql` | 19/19 | vincoli della migration 2 (ROLLBACK) |
| `scripts/verify-migration-3.sql` | 6/6 | vincoli della migration 3 (ROLLBACK) |

Non provati: il pass Google dopo la conferma (non implementato), il 409 di `visit` a runtime senza forzare una race, il flusso su un browser reale/iPhone, la creazione di un owner con un utente reale.

## 8. Primo messaggio operativo nella nuova chat

1. Conferma in una frase che riprendi dalla Fase 4d: rate limit, auth staff, coda, conferma/rifiuto e regola dei timbri sono **chiusi e testati** (101 controlli); le decisioni del §2 sono **chiuse**, non riaprirle. Approvazione punto per punto.
2. Chiedi `git status --short`, `git log --oneline -5`, se la Fase 4d è stata committata, l'esito di `npm run typecheck` e degli script.
3. Chiedi, solo se servono: `src/api/requests/resolve.service.ts`, `src/api/venues/staff.controller.ts`, `src/api/venues/membership.middleware.ts`, `src/api/requests/requests.service.ts`, `src/api/venues/venues.router.ts`, `src/db/schema.ts`.
4. Proponi la **Fase 4e (aggiornamento del pass Google)** nel formato fatti / alternative / raccomandazione / file / test. Non cercare nella documentazione Google finché l'utente non lo dice.
