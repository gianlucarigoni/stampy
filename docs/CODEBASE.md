# Stampy — Code map and state

> **Living** document: it describes the code **as it is now**. It is updated in the same
> change that alters code, endpoints, schema or tests. If this file contradicts the code,
> **the code wins** and this file must be fixed.
> It contains neither product decisions (`CONTEXT.md`) nor things to do (`BACKLOG.md`).
> Last aligned with the code: October 28, 2026.

**State in one line**: backend complete from the tag tap to staff confirmation (card,
requests, email auth, sessions, roles, queue, confirm/reject). Still missing: Google pass
update, Google login, real email delivery and the frontend.

---

## 1. Stack and commands

- Node.js + **Express 5.2.1** + TypeScript `strict`, Drizzle ORM, PostgreSQL 16 (Docker).
- `cookie-parser` without a secret (unsigned cookies), `express-rate-limit` for the IP limiter.
- `class-validator`/`class-transformer` for DTOs, `zod` for env, branding, promotion
  config, audit metadata.
- `jsonwebtoken` to sign the Wallet link, `nanoid` for `public_code` (up to 3 attempts on
  collision), `google-auth-library` is installed but **unused** (it is for the future
  Google login).

```bash
npm run dev            # nodemon on src (restarts by itself; .env is read only at startup)
npm start              # tsx src/index.ts
npm run typecheck      # tsc --noEmit (src only)
npm run typecheck:all  # tsc --noEmit -p tsconfig.check.json (src + scripts)
npm run build          # tsc -> dist/ (dist is NOT used by start: build and start are disconnected)
```

Environment variables (`src/config/env.ts`, zod, the process exits if invalid):
`PORT`, `NODE_ENV`, `DATABASE_URL`, `APP_ORIGIN`, `WALLET_ISSUER_ID`,
`WALLET_SERVICE_ACCOUNT_EMAIL`, `WALLET_SERVICE_ACCOUNT_KEY_PATH`, `OTP_HMAC_SECRET`,
`TRUST_PROXY` (number of hops, default 0), `IP_RATE_LIMIT` (`on`/`off`, optional).

## 2. Structure

```text
src/
  app.ts                    express: trust proxy (only if > 0), open cors(), morgan,
                            cookieParser(), bodyParser.json(), /api, errorHandlers
  index.ts                  createServer + SELECT 1 before listening
  config/
    env.ts                  zod on process.env (see §1)
    serviceAccount.ts       loads the Wallet service account JSON key
  db/
    index.ts                pg Pool + drizzle (logger: true), exports db and pool
    tx.ts                   Tx and DbOrTx (services that run alone or inside a transaction)
    schema.ts               full Drizzle schema: 11 tables, 9 enums (source of truth)
    types.ts                derived types ($inferSelect) + re-exported enums
  api/
    routes.ts               mounts /health, /auth, /venues, /requests
    health/
      health.router.ts      GET /api/health
      health.controller.ts  health
    auth/
      auth.router.ts        /email/* public; /me and /logout behind isAuthenticated
      auth.controller.ts    me, logout
      auth-events/
        auth-events.service.ts log() append-only, zod whitelist of metadata, hashSubject
      email/
        email.router.ts     request/verify
        email.controller.ts request, verify
        email.dto.ts        emailDTO, verifyDTO
      identity/
        identity.service.ts loginWithEmail: user + `email` identity, in a transaction
      otp/
        otp.service.ts      create/consume/invalidate challenges, attempts, cooldown, hourly cap
      session/
        session.service.ts  hashToken, create, authenticate (sliding + cap),
                            revoke, sessionCookieOptions
    cards/
      cards.service.ts      addOrGetCard (INSERT ... ON CONFLICT on user_id+venue_id)
    wallet/
      wallet.service.ts     per-venue LoyaltyClass, per-card object, saveUrl JWT,
                            `updateCard` (REST PATCH of balance + text modules)
    venues/
      venues.router.ts      /mine, /:venueId/visit, staff routes (middleware order)
      venues.controller.ts  visit (per-card rate limit), mine
      venues.dto.ts         venueIdDTO
      venues.service.ts     non-archived venue, active promotion (DB now())
      membership/
        membership.service.ts role from venue_members, user's venues, non-UUID venueId -> null
      staff/
        staff.controller.ts queue, confirm, reject
        staff.dto.ts        staff params + confirmDTO (integer 1..50)
    requests/
      requests.router.ts    GET /:requestId (isAuthenticated)
      requests.controller.ts  polling: status, expiresAt, stampsCount, stampsRequired
      requests.dto.ts       requestIdDTO
      requests.service.ts   ownership in SQL, lazy expiry, rate limit, queue, polling
      resolve/
        resolve.service.ts  confirm/reject in a transaction
  errors/                   one class + handler per error; generic one LAST;
                            body-parser.error.ts: malformed JSON → 400, oversized body → 413
  utils/
    auth-context.ts         requireAuth(req) -> { user, session }, 401 if missing
    typed-request.ts        TypedRequest<B,Q,P>, TypedAuthRequest (auth?: AuthContext)
    middlewares/
      session.middleware.ts isAuthenticated: cookie -> service -> req.auth
      membership.middleware.ts  requireRole("owner","staff")
      ip-rate-limit.middleware.ts  express-rate-limit per IP, pass-through in development
      validation.middleware.ts  validate(dto, "body" | "query" | "params")
    stamps.ts               splitStamps(stampsRequired, currentCount, quantity), pure
    email/email-sender.ts   EmailSender + ConsoleEmailSender (forbidden in production)
    schemas/                branding.schema.ts, promotion-config.schema.ts
    types/auth.type.ts      AuthUser, AuthSessionInfo, AuthContext
scripts/                    end-to-end tests + utilities (see §7)
drizzle/                    migrations 0000-0003 + meta (source of truth of the SQL schema)
```

`api/` convention: each domain folder exposes the files `<domain>.router.ts`,
`<domain>.controller.ts`, `<domain>.service.ts` and `<domain>.dto.ts` (where needed);
helper files live in a subfolder named after their concern (`email/`, `staff/`,
`membership/`, `resolve/`, `otp/`, `identity/`, `session/`, `auth-events/`). All
middlewares live in `utils/middlewares/`.

## 3. Endpoints

| Method and path | Auth | Behavior |
|---|---|---|
| `GET /api/health` | no | `200` |
| `POST /api/auth/email/request` | no (IP limiter) | `202 {challengeId}`; 45 s cooldown and 5/hour cap → `429` + `Retry-After`; email failure → `503` |
| `POST /api/auth/email/verify` | no (IP limiter) | `200 {user:{id,email,displayName}}` + `sid` cookie; every failure → `400` with the same message |
| `GET /api/auth/me` | yes | `200 {user:{id,email,displayName}}` (read-only probe) |
| `POST /api/auth/logout` | yes | `204`, cookie removed, `logout` event |
| `POST /api/venues/:venueId/visit` | yes | new card → `201 {state:"card_created", saveUrl, publicCode}`; live pending request → `200 {state:"request_pending", requestId, expiresAt}`; new request → `201`; more than 10 new/hour per card → `429` + `Retry-After` |
| `GET /api/requests/:requestId` | yes | `200 {status, expiresAt, stampsCount, stampsRequired}`; someone else's or missing request → identical `404` |
| `GET /api/venues/mine` | yes | `200 {venues:[{venueId,name,slug,role}]}` |
| `GET /api/venues/:venueId/requests` | yes + owner/staff | `200 {requests:[{requestId,publicCode,stampsCount,stampsRequired,createdAt,expiresAt}]}`, max 50, never the email |
| `POST /api/venues/:venueId/requests/:requestId/confirm` | yes + owner/staff | body `{stamps}` = **products consumed, reward included** (integer 1–50) → `200 {status:"approved", stampsCount, stampsRequired, rewards}`; `404`/`409`; after the commit the Google pass is updated best effort (a Wallet failure never changes the response) |
| `POST /api/venues/:venueId/requests/:requestId/reject` | yes + owner/staff | `200 {status:"rejected"}`, does not touch the card; `404`/`409` |

There is no `/cards` route: the card is only created by `visit`.

Errors: `400` validation (`details` with `property` and `constraints`, never an echo of
`value`), `400 MalformedBody` for malformed JSON, `413 BodyTooLarge`, `404 NotFound` JSON
for every non-existent `/api` route, `400` OTP code, single `401`, `403` non-member,
`404` missing or someone else's resource, `409` request no longer valid / promotion
changed, `429` limits (always `{error:"TryLaterError", message:"Riprova più tardi",
retryAfterSeconds}` + `Retry-After` header with the same value, also from the IP
limiter), generic JSON `500`. (The `message` strings are Italian literals in the code.)

## 4. Conventions

- **Middleware order** on a protected route:
  `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
  `isAuthenticated` is mounted **per route** (never on `/api/auth` as a block: `/email/*`
  is public). Accepted consequence: without a cookie a malformed param gives **401**; with
  a missing role a malformed `venueId` gives **403**.
- **Open generics on `P`** in `isAuthenticated`, `requireRole` and `requireAuth`: needed
  to combine several handlers with controllers typed by the params DTO. No casts in
  controllers.
- **Authenticated user in `req.auth`**, read with `requireAuth(req)`. **Never `req.user`**:
  `@types/passport` already declares `Express.Request.user` and a type of our own would
  make the handler not assignable to `RequestHandler`.
- **Roles**: never in the session or `req.auth`; `requireRole` reads `venue_members` on
  every request. A non-UUID `venueId` is treated as "not a member" (avoids Postgres 22P02).
- **Errors**: every `GenericError` must be written with its status. A recurring error
  deserves a class + handler registered **before** `genericErrorHandler`. The generic
  handler exposes status and message **only** for `GenericError`; everything else → generic
  JSON `500` with details only in the logs. Body-parser errors (malformed JSON, body too
  large) have a dedicated handler (`400 MalformedBody`, `413 BodyTooLarge`).
- **Time**: always the DB `now()` in queries, never `new Date()` for expiry.
- **State UPDATEs**: always with the state filter in the `WHERE` (`revoked_at IS NULL`,
  `status = 'pending'`, `consumed_at IS NULL`, …).
- **Responses**: always mapped, never `res.json(row)`; the session token never appears in
  the body.
- **Input**: `validate(dto, origin)`; validate uses whitelist and forbidNonWhitelisted
  (extra fields → 400), and a missing body gives 400 "missing body" via GenericError.
- **Cookies**: always from `sessionCookieOptions()` (httpOnly, secure only in production,
  SameSite=Lax, path `/`); only login adds the `maxAge`.
- **Audit**: `authEventsSrv.log(type, { email?, userId?, provider?, metadata? }, tx?)`;
  the email only ends up in `subject_hash`, metadata is validated per type.
- **Stamps**: the rule lives **only** in `splitStamps`; no other place recomputes the
  segments. It applies only to `type = "stamps"`.
- **Data**: always pass `venueId` together with resource ids (composite FKs and
  ownership). Domain types only from `db/types.ts`; enums only from the `pgEnum`s.

## 5. Flows

**Email login — request**: one transaction reads the seconds since the last send, the
sends in the last hour and the age of the oldest; the checks come **before** touching the
rows (`otp_send_blocked` event committed); then it closes the live challenge, inserts the
new one, writes `otp_sent`; 23505 from the partial index → 429. After the commit it sends
the email (`ConsoleEmailSender` in development).

**Email login — verify**: the attempt is counted atomically **outside** the transaction;
wrong code → `otp_failed`, invalidation at the fifth error, generic 400; correct code →
one transaction with single-use consumption, `loginWithEmail`, session, events
(`otp_verified`, `identity_linked` if the identity was added, `login_success`). Cookie
written **after** the commit.

**Authenticated request**: `sid` cookie → shape check (43 characters) → SHA-256 → SELECT
with a join on `users` and filters (`revoked_at NULL`, `expires_at > now()`,
`created_at > now() - 90 days`, `anonymized_at NULL`) and `needs_touch` computed by the
DB; if needed, UPDATE `last_seen_at` and `expires_at = LEAST(now()+30d, created_at+90d)`.
Any failure → same 401.

**Logout**: transaction (conditional revocation + event only if the revocation happened)
→ `clearCookie` → 204.

**Customer tap (`visit`)**: user from `req.auth` (body ignored) → venue and active
promotion → `addOrGetCard`. New card → 201 `card_created` + `saveUrl`. Existing card →
lazy expiry → live pending request? 200 **without consuming quota** → otherwise
`checkCardRateLimit` (10/hour per card) → `newRequest` with `ON CONFLICT` on the partial
constraint; if the race is lost, it returns the pending request just created.

**Customer polling**: `refreshStatus` (lazy expiry, only from `pending`, ownership in
SQL) → `getRequestByUserId` with a join on card and promotion → 4 fields. Someone else's
request → 404.

**Staff queue**: lazy expiry of **the whole venue** (a request with no polling would stay
`pending` forever) → pending requests in arrival order, max 50.

**Confirm**: `expireIfDue` outside the transaction → transaction: conditional UPDATE
`status='pending' AND expires_at > now()` (mutex, double confirm → 409) → `SELECT …
FOR UPDATE` on the card → 409 if the card's promotion is not the active one →
`splitStamps` → one `stamp_event` per segment with `idempotency_key = {requestId}:{n}` →
`cards.stamps_count = finalCount`. `confirm` also returns the `cardId` (internal, the controller strips it from the body).
After the commit the controller runs `syncWalletPass`: it loads venue, active promotion
and the card (fresh `stamps_count`) and calls `GoogleWalletService.updateCard`, a PATCH
on `loyaltyObject/{walletObjectId}` with `loyaltyPoints` and the 3 text modules (absolute
values, so repeatable; 5 s timeout, 2 retries on transient errors; silent, no
notification). Any error (pass not yet saved, Google down) is only logged as
`[wallet] … (card <id>): <status|code>` — no personal data — and the response stays 200:
the DB is the source of truth, the pass a derived view. Behavior against a real issuer is
still unverified (`BACKLOG.md` V1).

**Reject**: same conditional UPDATE with `status='rejected'`; no writes to card or
events; same 404/409 distinction.

**First owner**: `scripts/create-owner.ts <email> <slug> [--force]` — the user must exist
and not be anonymized, the venue not archived; `INSERT … ON CONFLICT DO NOTHING`; it does
not promote a `staff` without `--force`.

**New venue**: `scripts/create-venue.ts --name … --slug … --logo … --color … --stamps …
--reward … [--banner …]` — validates with the same zod schemas as the backend, creates
venue + active promotion in a transaction, idempotent on the slug, prints the tag URL.

## 6. Data

Source of truth: `src/db/schema.ts`; for hand-written constraints, the SQL in `drizzle/`.

**11 tables**: `users`, `auth_identities`, `otp_challenges`, `sessions`, `auth_events`,
`venues`, `venue_members`, `promotions`, `cards`, `stamp_requests`, `stamp_events`.

**9 enums**: `member_role`, `promotion_type`, `wallet_provider`, `wallet_status`,
`request_status`, `event_type`, `identity_provider`, `otp_channel`, `auth_event_type`.

Relations:

```text
users ──< auth_identities
  │ ──< sessions
  │ ──< auth_events            (user_id nullable: NULL = unknown user)
  ├──< venue_members >── venues ──< promotions
  └──< cards >──────────────────────┘  (card -> promotion of the same venue)
          ├──< stamp_requests
          └──< stamp_events (-> promotion, -> optional stamp_request, -> operator=users)
otp_challenges   (no FK: the recipient may not be a user yet)
```

Invariants not to break:

- `users.email` UNIQUE, lowercase and without spaces (CHECK); NULL allowed (anonymized).
- `auth_identities`: UNIQUE `(provider, provider_user_id)` and `(user_id, provider)`.
- `otp_challenges`: partial UNIQUE index on `(channel, destination)` where `consumed_at`
  and `invalidated_at` are NULL — **only one live challenge**; the constraint ignores
  `expires_at`, so an expired challenge must be closed before inserting a new one.
- `sessions.token_hash` UNIQUE (SHA-256, never the token).
- `venues.slug` UNIQUE; `venue_members` PK `(user_id, venue_id)`.
- `promotions_no_overlap`: `btree_gist` EXCLUDE on `(venue_id, tstzrange(starts_at,
  ends_at))` — **hand-written in migration 0001**, not in `schema.ts`. A promotion with
  no end occupies the venue forever.
- `cards`: UNIQUE `(user_id, venue_id)`, UNIQUE `(id, venue_id)`, composite FK
  `(promotion_id, venue_id) → promotions(id, venue_id)`.
- `stamp_requests`: partial UNIQUE index on `card_id` where `status='pending'`; partial
  index `(venue_id, created_at)` for the queue.
- `stamp_events`: `request_id` is **not** UNIQUE (plain index); `idempotency_key` UNIQUE;
  `quantity > 0`; composite FKs on card, promotion and request.
- `stamps_count >= 0` and **no** upper cap: `= stampsRequired` is the normal "reward
  available" state.
- Anonymization instead of deletion: all FKs are `RESTRICT`.

Migrations (one per change):

```bash
npx drizzle-kit generate --config=src/drizzle.config.ts --name=NAME
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
```

**Always** read the generated SQL before applying it. Never `push`/`introspect`.
Constraint verification: `scripts/verify-migration-2.sql` and `-3.sql` (transaction with
ROLLBACK, they do not dirty the DB).

## 7. Tests

TypeScript scripts run from the terminal, no framework: each check prints ✔/✘, the
summary alone is not enough to diagnose. Prerequisites: running server (`npm run dev`)
and dev DB, except where noted. Scripts create `*@test.it` fixtures and clean up at the
end of the run.

```bash
npx tsx scripts/stamps-split.ts                      # no server, no DB
npx tsx --env-file=.env scripts/wallet-update.ts     # mocked Google client, no server/DB
npx tsx --env-file=.env scripts/staff-requests.ts    # creates test venue + members
npx tsx --env-file=.env scripts/poll-request.ts      # picks the venue with an active promotion
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-3.sql
```

| Script | Checks | Coverage |
|---|---|---|
| `stamps-split.ts` | 20 | thresholds, exact threshold, multiple rewards, full card, threshold 1, cap 50, impossible inputs |
| `staff-requests.ts` | 24 | 401/403, `/venues/mine`, queue without email, confirm 15 → 4/10 with 3 events, double confirm 409, validation, reject, expiry, cross-venue 404, promotion changed 409, owner, exact threshold, full card, rate limit |
| `wallet-update.ts` | 11 | `updateCard` with a mocked client: PATCH, URL, balance, 3 modules, no id/classId in the body, timeout/retry, no notify, error propagates (needs `.env`, no server/DB) |
| `poll-request.ts` | 12 | `visit`/polling with session, ownership, lazy expiry, race |
| `otp-request.ts` | 16 | malformed JSON, 400 without echo, JSON 404, cooldown and 429 body, hourly cap, window, race, uniform response |
| `otp-verify.ts` | 16 | attempts, single use, expiry, events, race |
| `session.ts` | 16 | single 401, sliding, absolute cap, logout, metadata |
| `verify-migration-2.sql` | 19 | migration 2 constraints |
| `verify-migration-3.sql` | 6 | migration 3 constraints |

Last recorded run: **October 31, 2026, 115 checks green** (20+24+12+16+16+16 + 11 of `wallet-update.ts`) and 25 SQL
checks green (19+6), `npm run typecheck:all` clean.

Utilities (not tests): `scripts/create-owner.ts`, `scripts/create-venue.ts`.
`npm run script:all` exists but stops: `create-owner`/`create-venue` require arguments
(see `BACKLOG.md` §3, C11).

## 8. Where to start

| If you need to… | Look first at |
|---|---|
| add a protected route | `venues.router.ts` (middleware order) + `utils/middlewares/membership.middleware.ts` |
| touch the stamp rule | `utils/stamps.ts` + `scripts/stamps-split.ts` + `CONTEXT.md` §4.4 |
| touch confirm | `requests/resolve/resolve.service.ts` + `venues/staff/staff.controller.ts` |
| touch auth | `auth/` (otp, identity, session, auth-events) + `CONTEXT.md` §5 |
| touch the schema | `db/schema.ts` → `generate` → read the SQL → `migrate` → update §6 |
| update the Wallet pass | `wallet/wallet.service.ts` (`updateCard`) + `syncWalletPass` in `venues/staff/staff.controller.ts` + `docs/google/wallet-pass-update.md` |
| find out what is missing | `BACKLOG.md` |
