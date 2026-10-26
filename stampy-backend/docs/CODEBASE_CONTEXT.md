# Stampy — Mappa del codice (backend)

> Documento vivo. Descrive **dove sta cosa** e le convenzioni del codice, non le decisioni di prodotto (per quelle: `stampy_contesto_progetto.md`) né lo schema DB (`stampy_db_schema.md`).
> Ultimo aggiornamento: 26 ottobre 2026 (sera) — allineato a `isAuthenticated`/sessione/logout e a `visit`/polling con l'utente di sessione.

---

## 1. Stack e versioni

- Node.js + Express **5.2.1** + TypeScript (`strict: true`), Drizzle ORM, PostgreSQL 16 (Docker in sviluppo).
- `cookie-parser` 1.4.x **senza segreto**: cookie di sessione non firmati, `req.signedCookies` non usato.
- Validazione: `class-validator`/`class-transformer` per i DTO HTTP, `zod` per env, branding, `promotions.config` e `auth_events.metadata`.
- Avvio: `npm run dev` (nodemon su `src`), `npm start` (`tsx src/index.ts`), `npm run typecheck` (`tsc --noEmit`). `tsconfig` include solo `src/**/*` e `drizzle.config.ts`: **gli script in `scripts/` non sono typechecked**.

## 2. Struttura

```text
src/
  app.ts                    express, cors() aperto, morgan, cookieParser(), bodyParser.json(), /api, errorHandlers
  index.ts                  createServer, SELECT 1 prima di ascoltare
  config/
    env.ts                  zod su process.env (PORT, NODE_ENV, DATABASE_URL, APP_ORIGIN, wallet*, OTP_HMAC_SECRET)
    serviceAccount.ts       chiave del service account Wallet
  db/
    index.ts                pool pg + drizzle (logger: true), export db e pool
    tx.ts                   Tx e DbOrTx (service che girano sia da soli sia in transazione)
    schema.ts               schema Drizzle completo (11 tabelle, 9 enum)
    drizzle.config.ts
  api/
    routes.ts               monta /health, /cards (dev), /auth, /venues, /requests
    health/
    cards/google/           GoogleService: LoyaltyClass per locale, object per card, JWT del saveUrl
    venues/                 visit (POST /:venueId/visit, isAuthenticated), service, dto, router
    requests/               polling cliente (GET /:requestId, isAuthenticated + ownership), scadenza lazy, service
    users/users.service.ts  getUserById (esclude anonimizzati), getUserByEmail, addUser
    auth/
      auth.router.ts        /email/* pubblico; /me e /logout dietro isAuthenticated
      session.middleware.ts isAuthenticated: cookie → service → req.auth, altrimenti 401
      session.service.ts    hashToken, create, authenticate (scorrimento + tetto), revoke, sessionCookieOptions
      auth.controller.ts    me, logout
      auth-events.service.ts log() append-only con whitelist zod dei metadata, hashSubject
      identity.service.ts   loginWithEmail: utente + identità `email` (ON CONFLICT), dentro una transazione
      otp.service.ts        codici OTP: create/consume/invalidate/attempts, cooldown, tetto orario
      email/                request e verify del codice
  errors/
    generic.ts              GenericError(message, statusCode = 500) + genericErrorHandler (ULTIMO)
    unauthorized.error.ts   UnauthorizedError → 401 "Non autenticato"
    validation-error.ts     ValidationError → 400 con details
    *.error.ts              classi + handler specifici (404, 409, 429)
    index.ts                ordine degli handler: specifici prima, generico ultimo
  utils/
    typed-request.ts        TypedRequest<B,Q,P>, TypedAuthRequest (auth?: AuthContext)
    auth-context.ts         requireAuth(req) → { user, session }, 401 se manca
    validation-middleware.ts validate(dto, "body" | "query" | "params")
    email/email-sender.ts   EmailSender + ConsoleEmailSender (vietato in produzione)
    types/                  enum, users, auth, card, venue, promotion, stamp-request, otp-challenge
    schemas/branding.schema.ts
scripts/
  otp-request.ts            test POST /api/auth/email/request
  otp-verify.ts             test POST /api/auth/email/verify
  session.ts                test isAuthenticated + GET /me + POST /logout
  poll-request.ts           test visit + polling
  verify-migration-2.sql    vincoli della migration 2, in transazione con ROLLBACK
```

## 3. Endpoint

| Metodo e percorso | Auth | Note |
|---|---|---|
| `GET /api/health` | no | |
| `POST /api/cards/google` | no (dev) | creazione card/link Wallet per prove |
| `POST /api/venues/:venueId/visit` | **sì** | `userId` dalla sessione (il body non è letto); 201 `card_created` / 201-200 `request_pending` |
| `GET /api/requests/:requestId` | **sì** | polling; ownership in SQL, richiesta altrui → 404 identico a inesistente |
| `POST /api/auth/email/request` | no | 202 `{challengeId}`; cooldown e tetto orario |
| `POST /api/auth/email/verify` | no | 200 `{user}` + cookie `sid` |
| `GET /api/auth/me` | **sì** | `{user:{id,email,displayName}}`, sonda read-only |
| `POST /api/auth/logout` | **sì** | 204, cookie rimosso, evento `logout` |

## 4. Convenzioni

- **Ordine dei middleware** (quando si aggiunge una rotta protetta): `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`. `isAuthenticated` si monta **per rotta**, mai su `/api/auth` in blocco (`/email/*` è pubblico). Conseguenza: senza cookie un param malformato dà **401**, non 400.
- **Rotte protette e params tipizzati**: `isAuthenticated` e `requireAuth` hanno il generic `P` aperto (`Request<P,…>`). Serve per combinare tre handler sulla stessa rotta con un controller tipizzato dal DTO dei params: con `P = ParamsDictionary` fisso il controller non è assegnabile a `RequestHandler`. Nessun cast nei controller.
- **Utente autenticato**: `req.auth = { user: {id, email, displayName, isPlatformAdmin}, session: {id, authProvider} }`, letto con `requireAuth(req)`. **Mai `req.user`**: `@types/passport` (dipendenza in disuso, ma inclusa nel programma perché `tsconfig` non limita `types`) dichiara già `Express.Request.user` e un tipo nostro renderebbe l'handler non assegnabile ai `RequestHandler`. Nessun ruolo nella sessione: si legge da `venue_members` a ogni richiesta.
- **Errori**: ogni `GenericError` si scrive con lo status (senza risponde 500). Un errore ricorrente con status proprio (401, 403, 404, 409, 429) merita classe + handler registrato **prima** di `genericErrorHandler`.
- **Tempo**: sempre `now()` del DB nelle query, mai `new Date()` per confronti di scadenza.
- **UPDATE di stato**: sempre con il filtro di stato nel `WHERE` (`revoked_at IS NULL`, `status = 'pending'`, `consumed_at IS NULL`, …).
- **Risposte**: mai `res.json(riga)`, sempre mappate; il token di sessione non compare mai nel body.
- **Input**: `validate(dto, origin)` con class-validator; i params (`venueId`, `requestId`) validati come UUID.
- **`res.cookie` / `res.clearCookie`**: passare da `sessionCookieOptions()` (httpOnly, secure solo in produzione, SameSite=Lax, path `/`); il `maxAge` lo aggiunge solo il login.
- **Audit**: `authEventsSrv.log(type, { email?, userId?, provider?, metadata? }, tx?)`; l'email finisce solo in `subject_hash`, i metadata sono validati da zod per tipo.

## 5. Flussi

**Login con email** — `request`: transazione con statistiche (cooldown 45 s, tetto 5/ora) → invalidazione della sfida viva → insert → `otp_sent` → invio dopo il commit. `verify`: tentativo atomico fuori transazione → codice giusto → transazione (consumo, utente, identità, sessione, eventi) → cookie dopo il commit.

**Richiesta autenticata** — cookie `sid` → SHA-256 → `sessionSrv.authenticate`: SELECT con join su `users` e filtri (`revoked_at NULL`, `expires_at > now()`, `created_at > now() - 90 giorni`, `anonymized_at NULL`) e `needs_touch` calcolato dal DB; se serve, UPDATE `last_seen_at = now()` e `expires_at = LEAST(now()+30d, created_at+90d)`. Qualsiasi fallimento → stesso 401.

**Logout** — transazione: `revoke` condizionata a `revoked_at IS NULL`; evento `logout` solo se la revoca è avvenuta; poi `clearCookie` e 204.

**Timbro (parziale)** — `visit` parte da `req.auth.user.id` (body ignorato): crea la card (201 + saveUrl) o una `stamp_request` `pending` (201) o restituisce quella viva (200). Il polling legge lo stato con scadenza lazy a 3 minuti e filtra per proprietario in SQL (join `stamp_requests ⋈ cards` su `(card_id, venue_id)` + `cards.user_id`); la richiesta altrui dà 404. La `confirm` non esiste ancora.

## 6. Test da terminale

Server acceso (`npm run dev`) e DB di sviluppo. Gli script creano fixture nel DB con email `*@test.it` e ripuliscono a fine run.

```bash
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts
npx tsx --env-file=.env scripts/poll-request.ts
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql
```

Stato al 26/10: `otp-request` 13/13, `otp-verify` 16/16, `session` 16/16, `poll-request` 12/12, typecheck pulito. `poll-request` crea i propri utenti/sessioni di test e sceglie dal DB il locale con promozione attiva.

## 7. Debito noto (non blocca lo sviluppo, blocca il deploy)

- `genericErrorHandler` espone `err.message`/`err.name` anche per i 5xx, non gestisce errori non-`GenericError`, non controlla `res.headersSent`; il 400 della validazione restituisce anche `value`.
- `logger: true` in `src/db/index.ts`: stampa query e parametri (anche email e hash dei codici).
- `cors()` aperto; nessuna protezione CSRF oltre a `SameSite=Lax`; `trust proxy` non configurato.
- `visit` non è in transazione; il 409 ha lo status nel codice ma non è esercitabile a runtime senza forzare una race.
- `start` usa `tsx` con `build`/`dist` scollegati.
- Dipendenze inutilizzate: `mongoose`, `bcrypt`, `lodash`, `passport*` (la rimozione di `@types/passport` libererebbe `Express.Request.user`).
- Duplicati in `GoogleService` (`getUserById`/`getVenueById`/`getActivePromotion`), import inutilizzati, `venues.response.ts` da correggere.
- `scripts/` fuori dal typecheck.
