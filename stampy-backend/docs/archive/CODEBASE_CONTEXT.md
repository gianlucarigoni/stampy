# Stampy — Mappa del codice (backend)

> Documento vivo. Descrive **dove sta cosa** e le convenzioni del codice, non le decisioni di prodotto (per quelle: `stampy_contesto_progetto.md`) né lo schema DB (`stampy_db_schema.md`).
> Ultimo aggiornamento: 27 ottobre 2026 — allineato alla **Fase 4d** (rate limit di `visit`, auth staff, coda, conferma/rifiuto, migration 3, regola dei timbri corretta).

---

## 1. Stack e versioni

- Node.js + Express **5.2.1** + TypeScript (`strict: true`), Drizzle ORM, PostgreSQL 16 (Docker in sviluppo).
- `cookie-parser` 1.4.x **senza segreto**: cookie di sessione non firmati, `req.signedCookies` non usato.
- `express-rate-limit` 8.7.1: solo limiter **in memoria per IP** sulle rotte `/auth/email/*`, attivo in produzione (attivabile in sviluppo con `IP_RATE_LIMIT=on`, disattivabile con `off`).
- Validazione: `class-validator`/`class-transformer` per i DTO HTTP, `zod` per env, branding, `promotions.config` e `auth_events.metadata`.
- Avvio: `npm run dev` (nodemon su `src`), `npm start` (`tsx src/index.ts`), `npm run typecheck` (`tsc --noEmit`). `tsconfig` include solo `src/**/*` e `drizzle.config.ts`: **gli script in `scripts/` non sono typechecked**.

## 2. Struttura

```text
src/
  app.ts                    express, cors() aperto, morgan, cookieParser(), bodyParser.json(),
                            trust proxy (solo se TRUST_PROXY > 0), /api, errorHandlers
  index.ts                  createServer, SELECT 1 prima di ascoltare
  config/
    env.ts                  zod su process.env (PORT, NODE_ENV, DATABASE_URL, APP_ORIGIN, wallet*,
                            OTP_HMAC_SECRET, TRUST_PROXY, IP_RATE_LIMIT)
    serviceAccount.ts       chiave del service account Wallet
  db/
    index.ts                pool pg + drizzle (logger: true), export db e pool
    tx.ts                   Tx e DbOrTx (service che girano sia da soli sia in transazione)
    schema.ts               schema Drizzle completo (11 tabelle, 9 enum); request_id con indice non unique
    drizzle.config.ts
  api/
    routes.ts               monta /health, /cards (dev), /auth, /venues, /requests
    health/
    cards/google/           GoogleService: LoyaltyClass per locale, object per card, JWT del saveUrl
    venues/
      venues.router.ts      /mine, /:venueId/visit, rotte staff (ordine dei middleware)
      venues.controller.ts  visit (con rate limit per card), mine
      venues.service.ts     locale, promozione attiva, query DB
      membership.service.ts ruolo da venue_members (+ locali dell'utente), venueId non-UUID → null
      membership.middleware.ts requireRole("owner","staff")
      staff.controller.ts   queue, confirm, reject
      staff.dto.ts          staffRequestParamsDTO, confirmDTO (quantità 1–50)
    requests/
      requests.router.ts    GET /:requestId (isAuthenticated)
      requests.controller.ts polling a 4 campi
      requests.service.ts   ownership in SQL, scadenza lazy, rate limit per card, coda staff, polling
      resolve.service.ts    conferma/rifiuto in transazione (splitStamps, eventi, saldo)
    users/users.service.ts  getUserById (esclude anonimizzati), getUserByEmail, addUser
    auth/
      auth.router.ts        /email/* pubblico (limiter IP); /me e /logout dietro isAuthenticated
      ip-rate-limit.middleware.ts  express-rate-limit per IP, pass-through in sviluppo
      session.middleware.ts isAuthenticated: cookie → service → req.auth, altrimenti 401
      session.service.ts    hashToken, create, authenticate (scorrimento + tetto), revoke, sessionCookieOptions
      auth.controller.ts    me, logout
      auth-events.service.ts log() append-only con whitelist zod dei metadata, hashSubject
      identity.service.ts   loginWithEmail: utente + identità `email` (ON CONFLICT), dentro una transazione
      otp.service.ts        codici OTP: create/consume/invalidate/attempts, cooldown, tetto orario
      email/                request e verify del codice
  errors/
    generic.ts              GenericError(message, statusCode) + genericErrorHandler (ULTIMO):
                            solo i GenericError espongono status/messaggio, il resto → 500 JSON
    unauthorized.error.ts   UnauthorizedError → 401 "Non autenticato"
    forbidden.error.ts      ForbiddenError → 403 "Non autorizzato"
    validation-error.ts     ValidationError → 400 con details
    *.error.ts              classi + handler specifici (404, 409, 429)
    index.ts                ordine degli handler: specifici prima, generico ultimo
  utils/
    typed-request.ts        TypedRequest<B,Q,P>, TypedAuthRequest (auth?: AuthContext)
    auth-context.ts         requireAuth(req) → { user, session }, 401 se manca
    validation-middleware.ts validate(dto, "body" | "query" | "params")
    stamps.ts               splitStamps(stampsRequired, currentCount, quantity) — funzione pura
    email/email-sender.ts   EmailSender + ConsoleEmailSender (vietato in produzione)
    types/                  enum (MemberRole), users, auth, card, venue, promotion, stamp-request, otp-challenge
    schemas/                branding.schema.ts, promotion-config.schema.ts ({v:1, stampsRequired 1–100, reward})
scripts/
  stamps-split.ts           test della funzione pura dei tratti (20 controlli, senza server/DB)
  staff-requests.ts         test end-to-end staff: coda, conferma, rifiuto, rate limit (24 controlli)
  create-owner.ts           crea/promuove il primo owner di un locale (idempotente, --force)
  otp-request.ts            test POST /api/auth/email/request
  otp-verify.ts             test POST /api/auth/email/verify
  session.ts                test isAuthenticated + GET /me + POST /logout
  poll-request.ts           test visit + polling
  verify-migration-2.sql    vincoli della migration 2, in transazione con ROLLBACK
  verify-migration-3.sql    vincoli della migration 3, in transazione con ROLLBACK
```

## 3. Endpoint

| Metodo e percorso | Auth | Note |
|---|---|---|
| `GET /api/health` | no | |
| `POST /api/cards/google` | no (dev) | creazione card/link Wallet per prove; da mettere dietro auth o togliere |
| `POST /api/venues/:venueId/visit` | **sì** | `userId` dalla sessione (il body non è letto); 201 `card_created` / 201-200 `request_pending`; **429** con `Retry-After` oltre 10 richieste nuove/ora per card |
| `GET /api/requests/:requestId` | **sì** | polling `{status, expiresAt, stampsCount, stampsRequired}`; ownership in SQL, richiesta altrui → 404 identico a inesistente |
| `GET /api/venues/mine` | **sì** | locali non archiviati in cui l'utente è membro, con il ruolo |
| `GET /api/venues/:venueId/requests` | **sì + owner/staff** | coda delle pendenti (max 50, ordine di arrivo, mai email); scadenza lazy del locale |
| `POST /api/venues/:venueId/requests/:requestId/confirm` | **sì + owner/staff** | body `{stamps}` = **quantità di prodotti consumati, premio compreso** (intero 1–50); 200 `{status, stampsCount, stampsRequired, rewards}`; 404/409 |
| `POST /api/venues/:venueId/requests/:requestId/reject` | **sì + owner/staff** | 200 `{status:"rejected"}`; non tocca la card; 404/409 |
| `POST /api/auth/email/request` | no (limiter IP) | 202 `{challengeId}`; cooldown e tetto orario |
| `POST /api/auth/email/verify` | no (limiter IP) | 200 `{user}` + cookie `sid` |
| `GET /api/auth/me` | **sì** | `{user:{id,email,displayName}}`, sonda read-only |
| `POST /api/auth/logout` | **sì** | 204, cookie rimosso, evento `logout` |

**Contratto di `confirm`**: `stampsCount` ∈ `[0, stampsRequired]`; `stampsRequired` = soglia della promozione applicata; `rewards` = premi **consumati** in quella conferma (0 = nessun prodotto gratis in quel conto). Card piena (`stampsCount === stampsRequired`) = premio disponibile, non ancora consumato.

## 4. Convenzioni

- **Ordine dei middleware** (quando si aggiunge una rotta protetta): `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`. `isAuthenticated` si monta **per rotta**, mai su `/api/auth` in blocco (`/email/*` è pubblico). Conseguenza: senza cookie un param malformato dà **401**, non 400; con ruolo mancante un `venueId` malformato dà **403**.
- **Rotte protette e params tipizzati**: `isAuthenticated` e `requireAuth` hanno il generic `P` aperto (`Request<P,…>`). Serve per combinare più handler sulla stessa rotta con un controller tipizzato dal DTO dei params: con `P = ParamsDictionary` fisso il controller non è assegnabile a `RequestHandler`. Nessun cast nei controller.
- **Utente autenticato**: `req.auth = { user: {id, email, displayName, isPlatformAdmin}, session: {id, authProvider} }`, letto con `requireAuth(req)`. **Mai `req.user`**: `@types/passport` (dipendenza in disuso, ma inclusa nel programma perché `tsconfig` non limita `types`) dichiara già `Express.Request.user` e un tipo nostro renderebbe l'handler non assegnabile ai `RequestHandler`.
- **Ruoli**: mai nella sessione né in `req.auth`; `requireRole("owner","staff")` legge `venue_members` a ogni richiesta. Il `venueId` nel path è solo un selettore; un id non-UUID è trattato come "non membro" (evita il 22P02 di Postgres) → 403.
- **Errori**: ogni `GenericError` si scrive con lo status (senza risponde 500). Un errore ricorrente con status proprio (401, 403, 404, 409, 429) merita classe + handler registrato **prima** di `genericErrorHandler`. Il generico espone status/messaggio **solo** per i `GenericError`: qualsiasi altro errore (ZodError, driver, body-parser) → 500 JSON generico.
- **Tempo**: sempre `now()` del DB nelle query, mai `new Date()` per confronti di scadenza.
- **UPDATE di stato**: sempre con il filtro di stato nel `WHERE` (`revoked_at IS NULL`, `status = 'pending'`, `consumed_at IS NULL`, …).
- **Risposte**: mai `res.json(riga)`, sempre mappate; il token di sessione non compare mai nel body.
- **Input**: `validate(dto, origin)` con class-validator; i params (`venueId`, `requestId`) validati come UUID; la quantità della conferma è un intero 1–50, mai una stringa (niente coercizione implicita).
- **`res.cookie` / `res.clearCookie`**: passare da `sessionCookieOptions()` (httpOnly, secure solo in produzione, SameSite=Lax, path `/`); il `maxAge` lo aggiunge solo il login.
- **Audit**: `authEventsSrv.log(type, { email?, userId?, provider?, metadata? }, tx?)`; l'email finisce solo in `subject_hash`, i metadata sono validati da zod per tipo.
- **Timbri**: la regola sta **solo** in `splitStamps` (`src/utils/stamps.ts`), funzione pura e testata: nessun altro punto del codice deve ricalcolare i tratti. Vale solo per `type = "stamps"`.
- **Limiti**: per card su `stamp_requests` (10/ora, sempre attivo) e per IP sulle rotte `/auth` (30/15 minuti, attivo in produzione o `IP_RATE_LIMIT=on`). `TRUST_PROXY` è un numero di hop, mai `true`.

## 5. Flussi

**Login con email** — `request`: transazione con statistiche (cooldown 45 s, tetto 5/ora) → invalidazione della sfida viva → insert → `otp_sent` → invio dopo il commit. `verify`: tentativo atomico fuori transazione → codice giusto → transazione (consumo, utente, identità, sessione, eventi) → cookie dopo il commit.

**Richiesta autenticata** — cookie `sid` → SHA-256 → `sessionSrv.authenticate`: SELECT con join su `users` e filtri (`revoked_at NULL`, `expires_at > now()`, `created_at > now() - 90 giorni`, `anonymized_at NULL`) e `needs_touch` calcolato dal DB; se serve, UPDATE `last_seen_at = now()` e `expires_at = LEAST(now()+30d, created_at+90d)`. Qualsiasi fallimento → stesso 401.

**Logout** — transazione: `revoke` condizionata a `revoked_at IS NULL`; evento `logout` solo se la revoca è avvenuta; poi `clearCookie` e 204.

**Tocco del cliente (`visit`)** — parte da `req.auth.user.id` (body ignorato): locale e promozione attiva → `addOrGetCard`. Card nuova → 201 `card_created` + `saveUrl`. Card esistente → scadenza lazy della pendente → pendente viva? 200 `request_pending` **senza consumare quota** → altrimenti `checkCardRateLimit` (10/ora per card, 429 + `Retry-After`) → `newRequest` (201) con `ON CONFLICT` sul vincolo parziale; race → restituisce la pendente creata dall'altro tocco.

**Polling cliente** — `refreshStatus` (scadenza lazy, solo da `pending`, con ownership in SQL) → `getRequestById` con join su card e promozione: `{status, expiresAt, stampsCount, stampsRequired}`. Richiesta altrui → 404.

**Coda staff** — `GET /venues/:venueId/requests`: scadenza lazy di **tutto il locale** (una richiesta senza polling resterebbe `pending` per sempre) → pendenti in ordine di arrivo con `publicCode`, saldo e soglia.

**Conferma** — `expireIfDue` fuori transazione → transazione: UPDATE condizionato `status='pending' AND expires_at > now()` (mutex; doppia conferma → 409) → `SELECT … FOR UPDATE` della card → 409 se la promozione della card non è quella attiva → `splitStamps` → un `stamp_event` per tratto con `idempotency_key = {requestId}:{n}` → `cards.stamps_count = finalCount`. Richiesta inesistente o di altro locale → 404 `RequestNotFound`. Dopo il commit **non** aggiorna il pass Google (Fase 4e): il Wallet resta indietro, il polling web è corretto.

**Rifiuto** — stesso UPDATE condizionato con `status='rejected'`, nessuna scrittura su card o eventi; stessa distinzione 404/409.

**Primo owner** — `scripts/create-owner.ts <email> <slug>`: l'utente deve esistere (primo login già fatto) e non essere anonimizzato; locale esistente e non archiviato; `INSERT … ON CONFLICT DO NOTHING` su `(user_id, venue_id)`; non promuove uno `staff` senza `--force`.

## 6. Test da terminale

Server acceso (`npm run dev`) e DB di sviluppo. Gli script creano fixture nel DB con email `*@test.it` e ripuliscono a fine run.

```bash
npx tsx scripts/stamps-split.ts
npx tsx --env-file=.env scripts/staff-requests.ts
npx tsx --env-file=.env scripts/poll-request.ts
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-3.sql
```

Stato al 27/10: `stamps-split` 20/20, `staff-requests` 24/24, `poll-request` 12/12, `otp-request` 13/13, `otp-verify` 16/16, `session` 16/16 → **101 controlli verdi**, typecheck pulito, `verify-migration-2` 19/19 e `verify-migration-3` 6/6. `stamps-split` non richiede server né DB; `staff-requests` crea un locale dedicato con membri `owner`/`staff`; `poll-request` sceglie dal DB il locale con promozione attiva.

## 7. Debito noto (non blocca lo sviluppo, blocca il deploy)

- **Errori HTTP non ancora uniformi**: JSON malformato nel body → oggi 500 (atteso 400); rotta inesistente → pagina HTML di Express invece del JSON; il 400 della validazione restituisce anche `value`.
- `logger: true` in `src/db/index.ts`: stampa query e parametri (anche email e hash dei codici).
- `cors()` aperto (`*`); nessuna protezione CSRF oltre a `SameSite=Lax`; `TRUST_PROXY` da impostare al primo deploy.
- `visit` non è in transazione; il 409 ha lo status nel codice ma non è esercitabile a runtime senza forzare una race.
- `POST /api/cards/google` è ancora montata senza auth (rotta dev).
- `start` usa `tsx` con `build`/`dist` scollegati.
- Dipendenze inutilizzate: `mongoose`, `bcrypt`, `lodash`, `passport*` (la rimozione di `@types/passport` libererebbe `Express.Request.user`).
- Duplicati in `GoogleService` (`getUserById`/`getVenueById`/`getActivePromotion`), import inutilizzati, `venues.response.ts` da correggere.
- `TryLaterError` ha `name = "TryLaterFound"` (refuso) e messaggio inglese; il corpo del 429 non è ancora concordato con il frontend.
- `scripts/` fuori dal typecheck.
- Dopo la conferma il pass Google **non** viene aggiornato (Fase 4e): il Wallet mostra il saldo vecchio.
