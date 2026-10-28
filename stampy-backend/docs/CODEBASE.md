# Stampy — Mappa del codice e stato

> Documento **vivo**: descrive com'è il codice **adesso**. Si aggiorna nella stessa
> modifica che cambia codice, endpoint, schema o test. Se questo file contraddice il
> codice, **vince il codice** e questo file va corretto.
> Non contiene decisioni di prodotto (`CONTEXT.md`) né cose da fare (`BACKLOG.md`).
> Ultimo allineamento al codice: 28 ottobre 2026.

**Stato in una riga**: backend completo dal tocco del tag alla conferma dello staff
(card, richieste, auth email, sessioni, ruoli, coda, conferma/rifiuto). Mancano
aggiornamento del pass Google, login Google, invio email reale e frontend.

---

## 1. Stack e comandi

- Node.js + **Express 5.2.1** + TypeScript `strict`, Drizzle ORM, PostgreSQL 16 (Docker).
- `cookie-parser` senza segreto (cookie non firmati), `express-rate-limit` per il limiter IP.
- `class-validator`/`class-transformer` per i DTO, `zod` per env, branding, config
  promozione, metadata di audit.
- `jsonwebtoken` per firmare il link Wallet, `nanoid` per `public_code`,
  `google-auth-library` è installata ma **non usata** (serve al login Google futuro).

```bash
npm run dev            # nodemon su src (riavvia da solo; il .env si legge solo all'avvio)
npm start              # tsx src/index.ts
npm run typecheck      # tsc --noEmit (solo src)
npm run typecheck:all  # tsc --noEmit -p tsconfig.check.json (src + scripts)
npm run build          # tsc -> dist/ (dist NON è usato da start: build e start sono scollegati)
```

Variabili d'ambiente (`src/config/env.ts`, zod, il processo esce se non valide):
`PORT`, `NODE_ENV`, `DATABASE_URL`, `APP_ORIGIN`, `WALLET_ISSUER_ID`,
`WALLET_SERVICE_ACCOUNT_EMAIL`, `WALLET_SERVICE_ACCOUNT_KEY_PATH`, `OTP_HMAC_SECRET`,
`TRUST_PROXY` (numero di hop, default 0), `IP_RATE_LIMIT` (`on`/`off`, opzionale).

## 2. Struttura

```text
src/
  app.ts                    express: trust proxy (solo se > 0), cors() aperto, morgan,
                            cookieParser(), bodyParser.json(), /api, errorHandlers
  index.ts                  createServer + SELECT 1 prima di ascoltare
  config/
    env.ts                  zod su process.env (vedi §1)
    serviceAccount.ts       carica la chiave JSON del service account Wallet
  db/
    index.ts                Pool pg + drizzle (logger: true), export db e pool
    tx.ts                   Tx e DbOrTx (service che girano da soli o in transazione)
    schema.ts               schema Drizzle completo: 11 tabelle, 9 enum (fonte di verità)
    types.ts                tipi derivati ($inferSelect) + enum ri-esportati
  api/
    routes.ts               monta /health, /auth, /venues, /requests
    health/                 GET /api/health
    auth/
      auth.router.ts        /email/* pubblico; /me e /logout dietro isAuthenticated
      email/                request/verify + DTO + limiter IP
      ip-rate-limit.middleware.ts  express-rate-limit per IP, pass-through in sviluppo
      session.middleware.ts isAuthenticated: cookie -> service -> req.auth
      session.service.ts    hashToken, create, authenticate (scorrimento + tetto),
                            revoke, sessionCookieOptions
      auth.controller.ts    me, logout
      auth-events.service.ts log() append-only, whitelist zod dei metadata, hashSubject
      identity.service.ts   loginWithEmail: utente + identità `email`, in transazione
      otp.service.ts        crea/consuma/invalida sfide, tentativi, cooldown, tetto orario
    cards/
      cards.service.ts      addOrGetCard (INSERT ... ON CONFLICT su user_id+venue_id)
    wallet/
      google-wallet.service.ts  LoyaltyClass per locale, object per card, JWT del saveUrl
    venues/
      venues.router.ts      /mine, /:venueId/visit, rotte staff (ordine middleware)
      venues.controller.ts  visit (rate limit per card), mine
      venues.service.ts     locale non archiviato, promozione attiva (now() del DB)
      membership.service.ts ruolo da venue_members, locali dell'utente, venueId non-UUID -> null
      membership.middleware.ts  requireRole("owner","staff")
      staff.controller.ts   queue, confirm, reject
      staff.dto.ts          params staff + confirmDTO (intero 1..50)
    requests/
      requests.router.ts    GET /:requestId (isAuthenticated)
      requests.controller.ts  polling: status, expiresAt, stampsCount, stampsRequired
      requests.service.ts   ownership in SQL, scadenza lazy, rate limit, coda, polling
      resolve.service.ts    conferma/rifiuto in transazione
    users/
      users.service.ts      NON USATO da nessuna rotta (vedi BACKLOG.md §2)
  errors/                   una classe + handler per errore; generico ULTIMO
  utils/
    auth-context.ts         requireAuth(req) -> { user, session }, 401 se manca
    typed-request.ts        TypedRequest<B,Q,P>, TypedAuthRequest (auth?: AuthContext)
    validation-middleware.ts  validate(dto, "body" | "query" | "params")
    stamps.ts               splitStamps(stampsRequired, currentCount, quantity), pura
    email/email-sender.ts   EmailSender + ConsoleEmailSender (vietato in produzione)
    schemas/                branding.schema.ts, promotion-config.schema.ts
    types/auth.type.ts      AuthUser, AuthSessionInfo, AuthContext
scripts/                    test end-to-end + utility (vedi §8)
drizzle/                    migration 0000-0003 + meta (fonte di verità dello schema SQL)
```

## 3. Endpoint

| Metodo e percorso | Auth | Comportamento |
|---|---|---|
| `GET /api/health` | no | `200` |
| `POST /api/auth/email/request` | no (limiter IP) | `202 {challengeId}`; cooldown 45 s e tetto 5/ora → `429` + `Retry-After`; email fallita → `503` |
| `POST /api/auth/email/verify` | no (limiter IP) | `200 {user:{id,email,displayName}}` + cookie `sid`; ogni fallimento → `400` con lo stesso messaggio |
| `GET /api/auth/me` | sì | `200 {user:{id,email,displayName}}` (sonda read-only) |
| `POST /api/auth/logout` | sì | `204`, cookie rimosso, evento `logout` |
| `POST /api/venues/:venueId/visit` | sì | card nuova → `201 {state:"card_created", saveUrl, publicCode}`; pendente viva → `200 {state:"request_pending", requestId, expiresAt}`; nuova richiesta → `201`; oltre 10 nuove/ora per card → `429` + `Retry-After` |
| `GET /api/requests/:requestId` | sì | `200 {status, expiresAt, stampsCount, stampsRequired}`; richiesta altrui o inesistente → `404` identico |
| `GET /api/venues/mine` | sì | `200 {venues:[{venueId,name,slug,role}]}` |
| `GET /api/venues/:venueId/requests` | sì + owner/staff | `200 {requests:[{requestId,publicCode,stampsCount,stampsRequired,createdAt,expiresAt}]}`, max 50, mai l'email |
| `POST /api/venues/:venueId/requests/:requestId/confirm` | sì + owner/staff | body `{stamps}` = **prodotti consumati, premio compreso** (intero 1–50) → `200 {status:"approved", stampsCount, stampsRequired, rewards}`; `404`/`409` |
| `POST /api/venues/:venueId/requests/:requestId/reject` | sì + owner/staff | `200 {status:"rejected"}`, non tocca la card; `404`/`409` |

Non esiste nessuna rotta `/cards`: la card nasce solo da `visit`.

Errori: `400` validazione (`details` con `value`), `400` codice OTP, `401` unico,
`403` non membro, `404` risorsa inesistente o altrui, `409` richiesta non più valida /
promozione cambiata, `429` limiti, `500` generico JSON.

## 4. Convenzioni

- **Ordine middleware** su una rotta protetta:
  `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
  `isAuthenticated` si monta **per rotta** (mai su `/api/auth` in blocco: `/email/*` è
  pubblico). Conseguenza accettata: senza cookie un param malformato dà **401**; con
  ruolo mancante un `venueId` malformato dà **403**.
- **Generics aperti su `P`** in `isAuthenticated`, `requireRole` e `requireAuth`: servono
  per combinare più handler con controller tipizzati dal DTO dei params. Nessun cast nei
  controller.
- **Utente autenticato in `req.auth`**, letto con `requireAuth(req)`. **Mai `req.user`**:
  `@types/passport` dichiara già `Express.Request.user` e un tipo nostro renderebbe
  l'handler non assegnabile ai `RequestHandler`.
- **Ruoli**: mai in sessione o `req.auth`; `requireRole` legge `venue_members` a ogni
  richiesta. `venueId` non-UUID è trattato come "non membro" (evita il 22P02 di Postgres).
- **Errori**: ogni `GenericError` va scritto con lo status. Un errore ricorrente merita
  classe + handler registrato **prima** di `genericErrorHandler`. Il generico espone
  status e messaggio **solo** per `GenericError`; tutto il resto → `500` JSON generico
  con i dettagli solo nei log.
- **Tempo**: sempre `now()` del DB nelle query, mai `new Date()` per le scadenze.
- **UPDATE di stato**: sempre con il filtro di stato nel `WHERE` (`revoked_at IS NULL`,
  `status = 'pending'`, `consumed_at IS NULL`, …).
- **Risposte**: sempre mappate, mai `res.json(riga)`; il token di sessione non compare
  mai nel body.
- **Input**: `validate(dto, origin)`; validate usa whitelist e forbidNonWhitelisted 
(campi extra → 400), e un body assente dà 400 "missing body" tramite GenericError.
- **Cookie**: sempre da `sessionCookieOptions()` (httpOnly, secure solo in produzione,
  SameSite=Lax, path `/`); il `maxAge` lo aggiunge solo il login.
- **Audit**: `authEventsSrv.log(type, { email?, userId?, provider?, metadata? }, tx?)`;
  l'email finisce solo in `subject_hash`, i metadata sono validati per tipo.
- **Timbri**: la regola sta **solo** in `splitStamps`; nessun altro punto ricalcola i
  tratti. Vale solo per `type = "stamps"`.
- **Dati**: passare sempre `venueId` insieme agli id delle risorse (FK composite e
  ownership). Tipi di dominio solo da `db/types.ts`; enum solo dai `pgEnum`.

## 5. Flussi

**Login con email — request**: una transazione legge secondi dall'ultimo invio, invii
nell'ultima ora ed età del più vecchio; i controlli stanno **prima** di toccare le righe
(evento `otp_send_blocked` committato); poi chiude la sfida viva, inserisce la nuova,
scrive `otp_sent`; 23505 dall'indice parziale → 429. Dopo il commit invia l'email
(`ConsoleEmailSender` in sviluppo).

**Login con email — verify**: tentativo contato atomicamente **fuori** transazione;
codice errato → `otp_failed`, invalidazione al quinto errore, 400 generico; codice
giusto → una transazione con consumo monouso, `loginWithEmail`, sessione, eventi
(`otp_verified`, `identity_linked` se l'identità è stata aggiunta, `login_success`).
Cookie scritto **dopo** il commit.

**Richiesta autenticata**: cookie `sid` → controllo di forma (43 caratteri) → SHA-256 →
SELECT con join su `users` e filtri (`revoked_at NULL`, `expires_at > now()`,
`created_at > now() - 90 giorni`, `anonymized_at NULL`) e `needs_touch` calcolato dal
DB; se serve, UPDATE `last_seen_at` e `expires_at = LEAST(now()+30d, created_at+90d)`.
Qualsiasi fallimento → stesso 401.

**Logout**: transazione (revoca condizionata + evento solo se la revoca è avvenuta) →
`clearCookie` → 204.

**Tocco del cliente (`visit`)**: utente da `req.auth` (body ignorato) → locale e
promozione attiva → `addOrGetCard`. Card nuova → 201 `card_created` + `saveUrl`. Card
esistente → scadenza lazy → pendente viva? 200 **senza consumare quota** → altrimenti
`checkCardRateLimit` (10/ora per card) → `newRequest` con `ON CONFLICT` sul vincolo
parziale; se la race perde, restituisce la pendente appena creata.

**Polling cliente**: `refreshStatus` (scadenza lazy, solo da `pending`, ownership in
SQL) → `getRequestById` con join su card e promozione → 4 campi. Richiesta altrui → 404.

**Coda staff**: scadenza lazy di **tutto il locale** (una richiesta senza polling
resterebbe `pending` per sempre) → pendenti in ordine di arrivo, max 50.

**Conferma**: `expireIfDue` fuori transazione → transazione: UPDATE condizionato
`status='pending' AND expires_at > now()` (mutex, doppia conferma → 409) → `SELECT …
FOR UPDATE` della card → 409 se la promozione della card non è quella attiva →
`splitStamps` → un `stamp_event` per tratto con `idempotency_key = {requestId}:{n}` →
`cards.stamps_count = finalCount`. Dopo il commit **non** aggiorna il pass Google: il
DB e il polling web sono corretti, il Wallet resta indietro (vedi `BACKLOG.md`).

**Rifiuto**: stesso UPDATE condizionato con `status='rejected'`; nessuna scrittura su
card o eventi; stessa distinzione 404/409.

**Primo owner**: `scripts/create-owner.ts <email> <slug> [--force]` — l'utente deve
esistere e non essere anonimizzato, il locale non archiviato; `INSERT … ON CONFLICT DO
NOTHING`; non promuove uno `staff` senza `--force`.

**Nuovo locale**: `scripts/create-venue.ts --name … --slug … --logo … --color …
--stamps … --reward … [--banner …]` — valida con gli stessi schema zod del backend,
crea locale + promozione attiva in transazione, idempotente sullo slug, stampa l'URL
del tag.

## 6. Dati

Fonte di verità: `src/db/schema.ts`; per i vincoli scritti a mano, il SQL in `drizzle/`.

**11 tabelle**: `users`, `auth_identities`, `otp_challenges`, `sessions`, `auth_events`,
`venues`, `venue_members`, `promotions`, `cards`, `stamp_requests`, `stamp_events`.

**9 enum**: `member_role`, `promotion_type`, `wallet_provider`, `wallet_status`,
`request_status`, `event_type`, `identity_provider`, `otp_channel`, `auth_event_type`.

Relazioni:

```text
users ──< auth_identities
  │ ──< sessions
  │ ──< auth_events            (user_id nullable: NULL = utente sconosciuto)
  ├──< venue_members >── venues ──< promotions
  └──< cards >──────────────────────┘  (card -> promotion dello stesso locale)
          ├──< stamp_requests
          └──< stamp_events (-> promotion, -> stamp_request opzionale, -> operator=users)
otp_challenges   (nessuna FK: il destinatario può non essere ancora un utente)
```

Invarianti da non rompere:

- `users.email` UNIQUE, minuscola e senza spazi (CHECK); NULL ammesso (anonimizzato).
- `auth_identities`: UNIQUE `(provider, provider_user_id)` e `(user_id, provider)`.
- `otp_challenges`: indice UNIQUE parziale su `(channel, destination)` dove
  `consumed_at` e `invalidated_at` sono NULL — **una sola sfida viva**; il vincolo non
  guarda `expires_at`, quindi una sfida scaduta va chiusa prima di inserirne una nuova.
- `sessions.token_hash` UNIQUE (SHA-256, mai il token).
- `venues.slug` UNIQUE; `venue_members` PK `(user_id, venue_id)`.
- `promotions_no_overlap`: EXCLUDE `btree_gist` su `(venue_id, tstzrange(starts_at,
  ends_at))` — **scritto a mano nella migration 0001**, non in `schema.ts`. Una
  promozione senza fine occupa il locale per sempre.
- `cards`: UNIQUE `(user_id, venue_id)`, UNIQUE `(id, venue_id)`, FK composita
  `(promotion_id, venue_id) → promotions(id, venue_id)`.
- `stamp_requests`: indice UNIQUE parziale su `card_id` dove `status='pending'`; indice
  parziale `(venue_id, created_at)` per la coda.
- `stamp_events`: `request_id` **non** UNIQUE (indice semplice); `idempotency_key`
  UNIQUE; `quantity > 0`; FK composite su card, promozione e richiesta.
- `stamps_count >= 0` e **nessun** tetto superiore: `= stampsRequired` è lo stato
  normale "premio disponibile".
- Anonimizzazione invece di cancellazione: tutte le FK sono `RESTRICT`.

Migration (una per modifica):

```bash
npx drizzle-kit generate --config=src/drizzle.config.ts --name=NOME
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
```

Leggere **sempre** il SQL generato prima di applicarlo. Mai `push`/`introspect`.
Verifica dei vincoli: `scripts/verify-migration-2.sql` e `-3.sql` (transazione con
ROLLBACK, non sporcano il DB).

## 7. Test

Script TypeScript da terminale, nessun framework: ogni controllo stampa ✔/✘, il
riepilogo da solo non basta a diagnosticare. Prerequisiti: server acceso (`npm run dev`)
e DB di sviluppo, tranne dove indicato. Gli script creano fixture `*@test.it` e
ripuliscono a fine run.

```bash
npx tsx scripts/stamps-split.ts                      # nessun server, nessun DB
npx tsx --env-file=.env scripts/staff-requests.ts    # crea locale + membri di test
npx tsx --env-file=.env scripts/poll-request.ts      # sceglie il locale con promo attiva
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-3.sql
```

| Script | Controlli | Copertura |
|---|---|---|
| `stamps-split.ts` | 20 | soglie, soglia esatta, premi multipli, card piena, soglia 1, tetto 50, input impossibili |
| `staff-requests.ts` | 24 | 401/403, `/venues/mine`, coda senza email, conferma 15 → 4/10 con 3 eventi, doppia conferma 409, validazione, rifiuto, scadenza, cross-venue 404, promozione cambiata 409, owner, soglia esatta, card piena, rate limit |
| `poll-request.ts` | 12 | `visit`/polling con sessione, ownership, scadenza lazy, race |
| `otp-request.ts` | 13 | cooldown, tetto orario, finestra, race, risposta uniforme |
| `otp-verify.ts` | 16 | tentativi, monouso, scadenza, eventi, race |
| `session.ts` | 16 | 401 unico, scorrimento, tetto assoluto, logout, metadata |
| `verify-migration-2.sql` | 19 | vincoli della migration 2 |
| `verify-migration-3.sql` | 6 | vincoli della migration 3 |

Ultima esecuzione registrata: **28 ottobre 2026, 101 controlli verdi** (20+24+12+13+16+16)
e 25 controlli SQL verdi (19+6), `npm run typecheck:all` pulito.

Utility (non test): `scripts/create-owner.ts`, `scripts/create-venue.ts`.
`npm run script:all` esiste ma si ferma: `create-owner`/`create-venue` richiedono
argomenti (vedi `BACKLOG.md` §2).

## 8. Da dove partire

| Se devi… | Guarda prima |
|---|---|
| aggiungere una rotta protetta | `venues.router.ts` (ordine middleware) + `membership.middleware.ts` |
| toccare la regola dei timbri | `utils/stamps.ts` + `scripts/stamps-split.ts` + `CONTEXT.md` §4.4 |
| toccare la conferma | `requests/resolve.service.ts` + `staff.controller.ts` |
| toccare l'auth | `auth/` (otp, identity, session, auth-events) + `CONTEXT.md` §5 |
| toccare lo schema | `db/schema.ts` → `generate` → leggere il SQL → `migrate` → aggiornare §6 |
| aggiornare il pass Wallet | `wallet/google-wallet.service.ts` (oggi solo creazione, nessun REST) |
| capire cosa manca | `BACKLOG.md` |
