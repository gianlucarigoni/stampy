> 🇮🇹 **Traduzione italiana di sola lettura** di `docs/CODEBASE.md`.
> La fonte di verità è la versione inglese: in caso di dubbio o differenza vince l'inglese.
> Il codice vince su entrambe. Nomi di file, comandi, tabelle e stringhe API restano letterali.

# Stampy — Mappa del codice e stato

> Documento **vivo**: descrive il codice **così com'è adesso**. Si aggiorna nella stessa
> modifica che cambia codice, endpoint, schema o test. Se questo file contraddice il codice,
> **vince il codice** e questo file va corretto.
> Non contiene decisioni di prodotto (`CONTEXT.md`) né cose da fare (`BACKLOG.md`).
> Ultimo allineamento con il codice: 28 ottobre 2026.

**Stato in una riga**: backend completo dal tocco del tag alla conferma dello staff (card,
richieste, auth email, sessioni, ruoli, coda, confirm/reject). Mancano ancora: aggiornamento
del pass Google, login Google, invio email reale e il frontend.

---

## 1. Stack e comandi

- Node.js + **Express 5.2.1** + TypeScript `strict`, Drizzle ORM, PostgreSQL 16 (Docker).
- `cookie-parser` senza segreto (cookie non firmati), `express-rate-limit` per il limiter per IP.
- `class-validator`/`class-transformer` per i DTO, `zod` per env, branding, config delle
  promozioni, metadata di audit.
- `jsonwebtoken` per firmare il link del Wallet, `nanoid` per `public_code` (fino a 3 tentativi
  in caso di collisione), `google-auth-library` è installata ma **inutilizzata** (serve per il
  futuro login Google).

```bash
npm run dev            # nodemon su src (si riavvia da solo; .env è letto solo all'avvio)
npm start              # tsx src/index.ts
npm run typecheck      # tsc --noEmit (solo src)
npm run typecheck:all  # tsc --noEmit -p tsconfig.check.json (src + scripts)
npm run build          # tsc -> dist/ (dist NON è usato da start: build e start sono scollegati)
```

Variabili d'ambiente (`src/config/env.ts`, zod, il processo termina se non valide):
`PORT`, `NODE_ENV`, `DATABASE_URL`, `APP_ORIGIN`, `WALLET_ISSUER_ID`,
`WALLET_SERVICE_ACCOUNT_EMAIL`, `WALLET_SERVICE_ACCOUNT_KEY_PATH`, `OTP_HMAC_SECRET`,
`TRUST_PROXY` (numero di hop, default 0), `IP_RATE_LIMIT` (`on`/`off`, facoltativa).

## 2. Struttura

```text
src/
  app.ts                    express: trust proxy (solo se > 0), cors() aperto, morgan,
                            cookieParser(), bodyParser.json(), /api, errorHandlers
  index.ts                  createServer + SELECT 1 prima di mettersi in ascolto
  config/
    env.ts                  zod su process.env (vedi §1)
    serviceAccount.ts       carica la chiave JSON del service account del Wallet
  db/
    index.ts                pg Pool + drizzle (logger: true), esporta db e pool
    tx.ts                   Tx e DbOrTx (servizi che girano da soli o dentro una transazione)
    schema.ts               schema Drizzle completo: 11 tabelle, 9 enum (fonte di verità)
    types.ts                tipi derivati ($inferSelect) + enum riesportati
  api/
    routes.ts               monta /health, /auth, /venues, /requests
    health/
      health.router.ts      GET /api/health
      health.controller.ts  health
    auth/
      auth.router.ts        /email/* pubbliche; /me e /logout dietro isAuthenticated
      auth.controller.ts    me, logout
      auth-events/
        auth-events.service.ts log() append-only, whitelist zod dei metadata, hashSubject
      email/
        email.router.ts     request/verify
        email.controller.ts request, verify
        email.dto.ts        emailDTO, verifyDTO
      identity/
        identity.service.ts loginWithEmail: utente + identità `email`, in una transazione
      otp/
        otp.service.ts      crea/consuma/invalida challenge, tentativi, cooldown, tetto orario
      session/
        session.service.ts  hashToken, create, authenticate (scorrevole + tetto),
                            revoke, sessionCookieOptions
    cards/
      cards.service.ts      addOrGetCard (INSERT ... ON CONFLICT su user_id+venue_id)
    wallet/
      wallet.service.ts     LoyaltyClass per locale, object per card, JWT del saveUrl
    venues/
      venues.router.ts      /mine, /:venueId/visit, route staff (ordine dei middleware)
      venues.controller.ts  visit (rate limit per card), mine
      venues.dto.ts         venueIdDTO
      venues.service.ts     locale non archiviato, promozione attiva (now() del DB)
      membership/
        membership.service.ts ruolo da venue_members, locali dell'utente, venueId non-UUID -> null
      staff/
        staff.controller.ts queue, confirm, reject
        staff.dto.ts        params dello staff + confirmDTO (intero 1..50)
    requests/
      requests.router.ts    GET /:requestId (isAuthenticated)
      requests.controller.ts  polling: status, expiresAt, stampsCount, stampsRequired
      requests.dto.ts       requestIdDTO
      requests.service.ts   ownership in SQL, scadenza lazy, rate limit, coda, polling
      resolve/
        resolve.service.ts  confirm/reject in una transazione
  errors/                   una classe + handler per errore; quello generico PER ULTIMO;
                            body-parser.error.ts: JSON malformato → 400, body troppo grande → 413
  utils/
    auth-context.ts         requireAuth(req) -> { user, session }, 401 se mancante
    typed-request.ts        TypedRequest<B,Q,P>, TypedAuthRequest (auth?: AuthContext)
    middlewares/
      session.middleware.ts isAuthenticated: cookie -> service -> req.auth
      membership.middleware.ts  requireRole("owner","staff")
      ip-rate-limit.middleware.ts  express-rate-limit per IP, pass-through in sviluppo
      validation.middleware.ts  validate(dto, "body" | "query" | "params")
    stamps.ts               splitStamps(stampsRequired, currentCount, quantity), pura
    email/email-sender.ts   EmailSender + ConsoleEmailSender (vietato in produzione)
    schemas/                branding.schema.ts, promotion-config.schema.ts
    types/auth.type.ts      AuthUser, AuthSessionInfo, AuthContext
scripts/                    test end-to-end + utility (vedi §7)
drizzle/                    migrazioni 0000-0003 + meta (fonte di verità dello schema SQL)
```

Convenzione di `api/`: ogni cartella di dominio espone i file `<domain>.router.ts`,
`<domain>.controller.ts`, `<domain>.service.ts` e `<domain>.dto.ts` (dove servono);
i file di supporto vivono in una sottocartella col nome del loro ambito (`email/`, `staff/`,
`membership/`, `resolve/`, `otp/`, `identity/`, `session/`, `auth-events/`). Tutti i
middleware vivono in `utils/middlewares/`.

## 3. Endpoint

| Metodo e path | Auth | Comportamento |
|---|---|---|
| `GET /api/health` | no | `200` |
| `POST /api/auth/email/request` | no (limiter IP) | `202 {challengeId}`; cooldown di 45 s e tetto 5/ora → `429` + `Retry-After`; errore email → `503` |
| `POST /api/auth/email/verify` | no (limiter IP) | `200 {user:{id,email,displayName}}` + cookie `sid`; ogni fallimento → `400` con lo stesso messaggio |
| `GET /api/auth/me` | sì | `200 {user:{id,email,displayName}}` (sonda in sola lettura) |
| `POST /api/auth/logout` | sì | `204`, cookie rimosso, evento `logout` |
| `POST /api/venues/:venueId/visit` | sì | nuova card → `201 {state:"card_created", saveUrl, publicCode}`; richiesta pending viva → `200 {state:"request_pending", requestId, expiresAt}`; nuova richiesta → `201`; più di 10 nuove/ora per card → `429` + `Retry-After` |
| `GET /api/requests/:requestId` | sì | `200 {status, expiresAt, stampsCount, stampsRequired}`; richiesta di un altro o inesistente → `404` identico |
| `GET /api/venues/mine` | sì | `200 {venues:[{venueId,name,slug,role}]}` |
| `GET /api/venues/:venueId/requests` | sì + owner/staff | `200 {requests:[{requestId,publicCode,stampsCount,stampsRequired,createdAt,expiresAt}]}`, max 50, mai l'email |
| `POST /api/venues/:venueId/requests/:requestId/confirm` | sì + owner/staff | body `{stamps}` = **prodotti consumati, premio incluso** (intero 1–50) → `200 {status:"approved", stampsCount, stampsRequired, rewards}`; `404`/`409` |
| `POST /api/venues/:venueId/requests/:requestId/reject` | sì + owner/staff | `200 {status:"rejected"}`, non tocca la card; `404`/`409` |

Non esiste una route `/cards`: la card viene creata solo da `visit`.

Errori: `400` validazione (`details` con `property` e `constraints`, mai un'eco di
`value`), `400 MalformedBody` per JSON malformato, `413 BodyTooLarge`, `404 NotFound` JSON
per ogni route `/api` inesistente, `400` codice OTP, `401` unico, `403` non membro,
`404` risorsa inesistente o di un altro, `409` richiesta non più valida / promozione
cambiata, `429` limiti (sempre `{error:"TryLaterError", message:"Riprova più tardi",
retryAfterSeconds}` + header `Retry-After` con lo stesso valore, anche dal limiter per IP),
`500` JSON generico. (Le stringhe di `message` sono letterali italiani nel codice.)

## 4. Convenzioni

- **Ordine dei middleware** su una route protetta:
  `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
  `isAuthenticated` è montato **per route** (mai su `/api/auth` in blocco: `/email/*`
  è pubblica). Conseguenza accettata: senza cookie un parametro malformato dà **401**; con
  un ruolo mancante un `venueId` malformato dà **403**.
- **Generics aperti su `P`** in `isAuthenticated`, `requireRole` e `requireAuth`: servono
  per combinare più handler con controller tipizzati dal DTO dei params. Nessun cast nei
  controller.
- **Utente autenticato in `req.auth`**, letto con `requireAuth(req)`. **Mai `req.user`**:
  `@types/passport` dichiara già `Express.Request.user` e un nostro tipo renderebbe
  l'handler non assegnabile a `RequestHandler`.
- **Ruoli**: mai nella sessione o in `req.auth`; `requireRole` legge `venue_members` a ogni
  richiesta. Un `venueId` non-UUID è trattato come "non membro" (evita Postgres 22P02).
- **Errori**: ogni `GenericError` va scritto col suo status. Un errore ricorrente merita una
  classe + handler registrato **prima** di `genericErrorHandler`. L'handler generico espone
  status e messaggio **solo** per `GenericError`; tutto il resto → `500` JSON generico con
  i dettagli solo nei log. Gli errori del body-parser (JSON malformato, body troppo
  grande) hanno un handler dedicato (`400 MalformedBody`, `413 BodyTooLarge`).
- **Tempo**: sempre il `now()` del DB nelle query, mai `new Date()` per le scadenze.
- **UPDATE di stato**: sempre col filtro di stato nel `WHERE` (`revoked_at IS NULL`,
  `status = 'pending'`, `consumed_at IS NULL`, …).
- **Risposte**: sempre mappate, mai `res.json(row)`; il token di sessione non compare mai nel
  body.
- **Input**: `validate(dto, origin)`; validate usa whitelist e forbidNonWhitelisted
  (campi extra → 400), e un body mancante dà 400 "missing body" tramite GenericError.
- **Cookie**: sempre da `sessionCookieOptions()` (httpOnly, secure solo in produzione,
  SameSite=Lax, path `/`); solo il login aggiunge il `maxAge`.
- **Audit**: `authEventsSrv.log(type, { email?, userId?, provider?, metadata? }, tx?)`;
  l'email finisce solo in `subject_hash`, i metadata sono validati per tipo.
- **Timbri**: la regola vive **solo** in `splitStamps`; nessun altro posto ricalcola i
  segmenti. Vale solo per `type = "stamps"`.
- **Dati**: passare sempre `venueId` insieme agli id delle risorse (FK composte e
  ownership). Tipi di dominio solo da `db/types.ts`; enum solo dai `pgEnum`.

## 5. Flussi

**Login email — request**: una transazione legge i secondi dall'ultimo invio, gli invii
nell'ultima ora e l'età del più vecchio; i controlli vengono **prima** di toccare le righe
(evento `otp_send_blocked` committato); poi chiude la challenge viva, inserisce la nuova,
scrive `otp_sent`; il 23505 dall'indice parziale → 429. Dopo il commit invia l'email
(`ConsoleEmailSender` in sviluppo).

**Login email — verify**: il tentativo viene contato in modo atomico **fuori** dalla
transazione; codice sbagliato → `otp_failed`, invalidazione al quinto errore, 400 generico;
codice giusto → una transazione con consumo monouso, `loginWithEmail`, sessione, eventi
(`otp_verified`, `identity_linked` se l'identità è stata aggiunta, `login_success`). Cookie
scritto **dopo** il commit.

**Richiesta autenticata**: cookie `sid` → controllo della forma (43 caratteri) → SHA-256 → SELECT
con join su `users` e filtri (`revoked_at NULL`, `expires_at > now()`,
`created_at > now() - 90 days`, `anonymized_at NULL`) e `needs_touch` calcolato dal
DB; se serve, UPDATE di `last_seen_at` e `expires_at = LEAST(now()+30d, created_at+90d)`.
Qualsiasi fallimento → stesso 401.

**Logout**: transazione (revoca condizionata + evento solo se la revoca è avvenuta)
→ `clearCookie` → 204.

**Tocco del cliente (`visit`)**: utente da `req.auth` (body ignorato) → locale e promozione
attiva → `addOrGetCard`. Card nuova → 201 `card_created` + `saveUrl`. Card esistente →
scadenza lazy → richiesta pending viva? 200 **senza consumare quota** → altrimenti
`checkCardRateLimit` (10/ora per card) → `newRequest` con `ON CONFLICT` sul vincolo parziale;
se la race è persa, restituisce la richiesta pending appena creata.

**Polling del cliente**: `refreshStatus` (scadenza lazy, solo da `pending`, ownership in
SQL) → `getRequestByUserId` con join su card e promozione → 4 campi. Richiesta di un altro
→ 404.

**Coda dello staff**: scadenza lazy di **tutto il locale** (una richiesta senza polling
resterebbe `pending` per sempre) → richieste pending in ordine di arrivo, max 50.

**Confirm**: `expireIfDue` fuori dalla transazione → transazione: UPDATE condizionato
`status='pending' AND expires_at > now()` (mutex, doppia conferma → 409) → `SELECT …
FOR UPDATE` sulla card → 409 se la promozione della card non è quella attiva →
`splitStamps` → uno `stamp_event` per segmento con `idempotency_key = {requestId}:{n}` →
`cards.stamps_count = finalCount`. Dopo il commit **non** aggiorna il pass Google: il DB e il
polling web sono corretti, il Wallet resta indietro (vedi `BACKLOG.md`).

**Reject**: stesso UPDATE condizionato con `status='rejected'`; nessuna scrittura su card o
eventi; stessa distinzione 404/409.

**Primo owner**: `scripts/create-owner.ts <email> <slug> [--force]` — l'utente deve esistere
e non essere anonimizzato, il locale non archiviato; `INSERT … ON CONFLICT DO NOTHING`; non
promuove uno `staff` senza `--force`.

**Nuovo locale**: `scripts/create-venue.ts --name … --slug … --logo … --color … --stamps …
--reward … [--banner …]` — valida con gli stessi schemi zod del backend, crea
locale + promozione attiva in una transazione, idempotente sullo slug, stampa l'URL del tag.

## 6. Dati

Fonte di verità: `src/db/schema.ts`; per i vincoli scritti a mano, l'SQL in `drizzle/`.

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
  └──< cards >──────────────────────┘  (card -> promozione dello stesso locale)
          ├──< stamp_requests
          └──< stamp_events (-> promotion, -> stamp_request opzionale, -> operatore=users)
otp_challenges   (nessuna FK: il destinatario può non essere ancora un utente)
```

Invarianti da non rompere:

- `users.email` UNIQUE, minuscola e senza spazi (CHECK); NULL ammesso (anonimizzato).
- `auth_identities`: UNIQUE `(provider, provider_user_id)` e `(user_id, provider)`.
- `otp_challenges`: indice UNIQUE parziale su `(channel, destination)` dove `consumed_at`
  e `invalidated_at` sono NULL — **una sola challenge viva**; il vincolo ignora
  `expires_at`, quindi una challenge scaduta va chiusa prima di inserirne una nuova.
- `sessions.token_hash` UNIQUE (SHA-256, mai il token).
- `venues.slug` UNIQUE; `venue_members` PK `(user_id, venue_id)`.
- `promotions_no_overlap`: `btree_gist` EXCLUDE su `(venue_id, tstzrange(starts_at,
  ends_at))` — **scritto a mano nella migrazione 0001**, non in `schema.ts`. Una promozione
  senza fine occupa il locale per sempre.
- `cards`: UNIQUE `(user_id, venue_id)`, UNIQUE `(id, venue_id)`, FK composta
  `(promotion_id, venue_id) → promotions(id, venue_id)`.
- `stamp_requests`: indice UNIQUE parziale su `card_id` dove `status='pending'`; indice
  parziale `(venue_id, created_at)` per la coda.
- `stamp_events`: `request_id` **non** è UNIQUE (indice semplice); `idempotency_key` UNIQUE;
  `quantity > 0`; FK composte su card, promotion e request.
- `stamps_count >= 0` e **nessun** tetto massimo: `= stampsRequired` è il normale stato
  "premio disponibile".
- Anonimizzazione invece di cancellazione: tutte le FK sono `RESTRICT`.

Migrazioni (una per modifica):

```bash
npx drizzle-kit generate --config=src/drizzle.config.ts --name=NAME
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
```

Leggere **sempre** l'SQL generato prima di applicarlo. Mai `push`/`introspect`.
Verifica dei vincoli: `scripts/verify-migration-2.sql` e `-3.sql` (transazione con
ROLLBACK, non sporcano il DB).

## 7. Test

Script TypeScript lanciati dal terminale, nessun framework: ogni check stampa ✔/✘, il
riepilogo da solo non basta per diagnosticare. Prerequisiti: server in esecuzione (`npm run dev`)
e DB di sviluppo, salvo dove indicato. Gli script creano fixture `*@test.it` e puliscono alla
fine dell'esecuzione.

```bash
npx tsx scripts/stamps-split.ts                      # niente server, niente DB
npx tsx --env-file=.env scripts/staff-requests.ts    # crea locale di test + membri
npx tsx --env-file=.env scripts/poll-request.ts      # sceglie il locale con una promozione attiva
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-3.sql
```

| Script | Check | Copertura |
|---|---|---|
| `stamps-split.ts` | 20 | soglie, soglia esatta, più premi, card piena, soglia 1, tetto 50, input impossibili |
| `staff-requests.ts` | 24 | 401/403, `/venues/mine`, coda senza email, confirm 15 → 4/10 con 3 eventi, doppia conferma 409, validazione, reject, scadenza, 404 tra locali, promozione cambiata 409, owner, soglia esatta, card piena, rate limit |
| `poll-request.ts` | 12 | `visit`/polling con sessione, ownership, scadenza lazy, race |
| `otp-request.ts` | 16 | JSON malformato, 400 senza eco, 404 JSON, cooldown e body 429, tetto orario, finestra, race, risposta uniforme |
| `otp-verify.ts` | 16 | tentativi, monouso, scadenza, eventi, race |
| `session.ts` | 16 | 401 unico, scorrevole, tetto assoluto, logout, metadata |
| `verify-migration-2.sql` | 19 | vincoli della migrazione 2 |
| `verify-migration-3.sql` | 6 | vincoli della migrazione 3 |

Ultima esecuzione registrata: **30 ottobre 2026, 104 check verdi** (20+24+12+16+16+16) e 25 check
SQL verdi (19+6), `npm run typecheck:all` pulito.

Utility (non test): `scripts/create-owner.ts`, `scripts/create-venue.ts`.
`npm run script:all` esiste ma si ferma: `create-owner`/`create-venue` richiedono argomenti
(vedi `BACKLOG.md` §3, C11).

## 8. Da dove iniziare

| Se devi… | Guarda prima |
|---|---|
| aggiungere una route protetta | `venues.router.ts` (ordine dei middleware) + `utils/middlewares/membership.middleware.ts` |
| toccare la regola dei timbri | `utils/stamps.ts` + `scripts/stamps-split.ts` + `CONTEXT.md` §4.4 |
| toccare confirm | `requests/resolve/resolve.service.ts` + `venues/staff/staff.controller.ts` |
| toccare l'auth | `auth/` (otp, identity, session, auth-events) + `CONTEXT.md` §5 |
| toccare lo schema | `db/schema.ts` → `generate` → leggere l'SQL → `migrate` → aggiornare §6 |
| aggiornare il pass del Wallet | `wallet/wallet.service.ts` (oggi solo creazione, niente REST) |
| scoprire cosa manca | `BACKLOG.md` |
