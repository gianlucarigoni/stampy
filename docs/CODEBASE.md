# Stampy — Code map and state

> **Living** document: it describes the code **as it is now**. It is updated in the same
> change that alters code, endpoints, schema or tests. If this file contradicts the code,
> **the code wins** and this file must be fixed.
> It contains neither product decisions (`CONTEXT.md`) nor things to do (`BACKLOG.md`).
> Last aligned with the code: November 1, 2026.

**State in one line**: backend complete from the tag tap to staff confirmation (card,
requests, email auth, sessions, roles, queue, confirm/reject, Google pass update). Still
missing: Google login and real email delivery. `stampy-frontend/` (Vue 3 + TS + Vite + Vue
Router, `/api` proxied to `:3000` in dev) has the email login, the customer page and the
staff queue.

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
# from the repo root (root package.json: `concurrently` only, no workspaces)
npm run dev            # backend + frontend (http://localhost:5173)

# from stampy-backend/
npm run dev            # nodemon on src (restarts by itself; .env is read only at startup)
npm start              # tsx src/index.ts
npm run typecheck      # tsc --noEmit (src only)
npm run typecheck:all  # tsc --noEmit -p tsconfig.check.json (src + scripts)
npm run build          # tsc -> dist/ (dist is NOT used by start: build and start are disconnected)
```

Environment variables (`src/config/env.ts`, zod, the process exits if invalid):
`PORT`, `NODE_ENV`, `DATABASE_URL`, `APP_ORIGIN` (frontend origin), `WALLET_ISSUER_ID`,
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
      requests.router.ts    GET /mine (customer history), GET /:requestId (isAuthenticated)
      requests.controller.ts  polling: status, publicCode, expiresAt, stampsCount, stampsRequired; `mine` (customer history)
      history.mapper.ts     `historyRow`: the one mapping of a history row (staff and customer; `venueName` only for the customer)
      requests.dto.ts       requestIdDTO
      requests.service.ts   ownership in SQL, lazy expiry, rate limit, queue, history, polling
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

### Frontend (`stampy-frontend/src/`)

```text
api/client.ts               api(): single fetch wrapper, ApiError, 401 handler hook, request timeout (8 s; 4 s for `getMe`)
api/endpoints.ts            typed backend calls (contracts: §3)
router/index.ts             routes, `beforeEach` guard, 401 handler (-> /login?next=)
composables/useAuth.ts      session state (module-level), checkSession (cached), setUser, logout
composables/usePolling.ts   non-overlapping polling, stops on unmount
composables/useCountdown.ts countdown from the server's retryAfterSeconds
utils/tabStorage.ts         sessionStorage wrapped in try/catch
utils/redirect.ts           safeNext (open-redirect guard), destinationAfterLogin
utils/format.ts             wait and time formatting
styles/stampy.scss          Bootstrap 5.3 (Sass only, no JS): variables, then the parts we use
components/AppHeader.vue    header: wordmark left; with `centered`, three equal columns (`start` slot | wordmark | default slot) so the wordmark stays in the middle
components/AppLayout.vue    layout route for authenticated pages: ONE header for customers and staff (`<AppHeader centered>`), `<RouterView>`. Menu = burger (44 px, `aria-expanded`, closes on Escape / outside click / navigation) built from `menuItems`: staff screens of a venue the user belongs to (`getMyVenues()`, asked once, only on staff screens) → "Coda richieste", "Storico richieste"; every other screen → customer "Storico richieste" (`/history`); always "Esci" last. Back button (44 px, left, `aria-label="Indietro"`) only on the two history pages: staff → the queue of the venue, customer → the page the history was opened from (`router.afterEach` remembers it; not `router.back()`, because every filter change is a history entry; deep link → `/scan`). Links are only a convenience: the backend checks the role on every request
components/RequestHistory.vue the history screen (filters, URL state, list), shared by staff and customer: props `title`, `fetchHistory(filters)`; emits `forbidden` on a 403; the row title is `venueName ?? publicCode`
views/StaffHistoryView.vue  /staff/:venueId/history: `RequestHistory` + `getHistory(venueId)` + the "Non sei autorizzato" card
views/CustomerHistoryView.vue /history: `RequestHistory` + `getMyHistory`, title "Le tue richieste"
components/EmailLogin.vue   /login page (own layout): email -> code; challenge kept across tab reloads
components/StampProgress.vue balance; full card shown as "Premio disponibile"
components/RewardDialog.vue native <dialog> (showModal) for a redeemed reward, closed only by "Chiudi"/Esc
components/ToastStack.vue  non-blocking toasts (staff reward notice), aria-live, dismissible
utils/seenStorage.ts        localStorage flag "reward modal of this request was dismissed"
views/CustomerVisitView.vue /v/:venueId  (where tags point): visit, Wallet-save screen
views/CustomerRequestView.vue /r/:requestId  (polling only, never calls visit)
views/NoVenueView.vue       /scan  (logged in, no venue, no `next`)
views/StaffVenuesView.vue   /staff  (single venue: goes straight to its queue)
views/StaffQueueView.vue    /staff/:venueId  (queue, quantity stepper, confirm/reject)
views/SessionErrorView.vue  /session-error  (the session probe failed for a non-401 reason)
views/NotFoundView.vue      any other path
```

- **One login page, redirect after login** (BACKLOG B7, reversed on 2026-11-01): routes under
  `AppLayout` carry `meta.requiresAuth`. `router.beforeEach` calls `checkSession` once per tab
  load (cached); no session -> `/login?next=<fullPath>`. Opening `/login` while logged in
  continues as if just logged in. A `401` from any call mid-session (and a user already set)
  clears the user and goes to `/login?next=<current path>`.
- **`next` is validated** (`safeNext`): a string starting with `/`, not `//`, not `/\`, no
  control characters, not `/login...`; anything else is ignored. After login: valid `next`
  always wins (even for staff); otherwise `GET /venues/mine`: 0 venues -> `/scan`, 1 ->
  `/staff/:venueId` (replace), 2+ -> `/staff`. `logout()` clears tab storage and goes to `/login`.
- **Customer flow is split** (closes B16): `/v/:venueId` calls `POST /visit` on load.
  `card_created` / `card_not_added` show the Wallet screen (the backend returns `saveUrl`
  every time, so nothing is kept in `sessionStorage` and a reload opens no stamp request).
  "Aggiungi a Google Wallet" opens `saveUrl` and fires `POST /card/wallet-added`
  (best effort); "Richiedi il timbro" calls `visit?requestStamp=1`. Once the card is
  `active`, a plain tap opens the request by itself. `request_pending` / a new request ->
  `router.replace` to `/r/:requestId`. `/r/:requestId` only polls `GET /requests/:id`
  (every 2 s), so reloading it never creates a request. Its "try again" needs the venue, which
  the API does not return (B15): `/v` stores it in `sessionStorage` under
  `stampy.request.<requestId>`; without it the page asks to tap the tag again.
- **Polling**: customer every 2 s, staff every 3 s on the queue. Network and `5xx` errors keep
  polling. `usePolling` refreshes at once when the tab becomes visible; the customer page
  skips polls while the tab is hidden, the staff queue does not (new requests) and shows the
  pending count in the tab title.
- **Staff queue feedback** (2026-11-03 review): the error of the last action (`error`) is kept
  apart from the background refresh state (`pollError`), so a `404`/`409` is no longer wiped by
  the next poll; messages are sticky at the top; a network error on confirm/reject says the
  outcome is unknown ("Esito non confermato…"). Each card shows "scade tra …" (device clock,
  display only), a typeable quantity (1–50, the backend still validates), "Rifiuta" in
  `btn-outline-danger`, and button names that include the request code.
- **Request feedback** (2026-11-03): the generic top `success` alert is gone. Staff: after confirm/reject the card is replaced **in place** by an outcome card (`alert-success` "✔ Richiesta approvata" with `+N timbri` and the balance, or `alert-warning` "⚠ Richiesta rifiutata"; a rejection is a technical success) kept ≈20 s or until "Ok", plus a screen-reader announcement. A confirm with `rewards > 0` adds one toast per request (≈10 s, dismissible) naming the real reward. Customer: the approved card shows "Richiesta approvata!" with `+N timbri aggiunti` (or "Nessun nuovo timbro: questo prodotto era il premio."); if `rewardsRedeemed > 0` `RewardDialog` opens until closed; closing stores `stampy.reward-seen.<requestId>` in `localStorage`, so a reload before closing shows it again and after closing never. Reaching N/N alone shows no modal (it keeps the "Premio disponibile" banner). All numbers and the reward name come from the backend.
- **Feedback timing** (2026-11-04): the reward toast lasts 5 s and says only "Premio ritirato · CODE: <reward>" (no instruction about the product: the way a reward is honoured depends on the venue and promotion); the in-place outcome cards last 8 s ("Ok" closes them sooner). While a toast shows, an empty spacer under the list keeps the last card's buttons clickable.
- **History** (`components/RequestHistory.vue`, mounted by `/staff/:venueId/history` (staff, via the header menu) and `/history` (customer, via the header menu)): the URL query string is the source of truth (`?status=approved&minStamps=3&from=2026-11-01&to=2026-11-04`, same names as the API; absent = not filtered; malformed values are dropped silently). A watcher on `route.query` fills the form and fetches (deep links, reload, back/forward); a debounced (250 ms) watcher on the form validates and `router.push`es the query only if it differs, so Back restores the previous filters and a burst of typing is one entry. No Filter button; "Azzera" clears the query. Filters: status, **Timbri** (Min / Max, confirmed quantity, reward included), **Periodo** (Dal / Al; both `max` = today, "Al" has `min` = "Dal"; typed future dates and `to < from` show an inline error and send no request). A request counter ignores stale responses. No pagination: the full list is rendered, with a polite live count ("12 richieste"). Mobile: collapsed "Filtri · N" toggle (44 px, `aria-expanded`) + "Azzera", panel closed by default (~278 px open at 375 px). The picked days are sent as real instants (start of the "from" day, last millisecond of the "to" day, device time zone). Rows show the code, never the email.
- **Card code on the customer page**: `/r/:requestId` shows "Codice card: …" while pending and after the request closes (from `publicCode` in the polling response).
- **Typed quantity** (fixes the reset bug): the input shows a per-request `drafts` string (`@input`), so polling/clock re-renders cannot overwrite it (the old `:value` + `@change` was reset to the committed value at every poll). A valid draft also updates `products`; an invalid one (empty, not an integer, outside 1–50) shows "Quantità non valida…" and disables Confirm instead of being clamped silently. `+`/`−` keep the 1–50 limits. Drafts of requests that left the queue are dropped.
- **Accessibility**: pages have a `<main>`; after each navigation (not the first) `router.afterEach`
  moves focus to it. Login: the error is linked to the field (`aria-describedby`), focus goes to
  the code field after sending, the countdown is announced at most once a minute.
- `/staff` with 0 venues redirects to `/scan` (so `/` does the same for a customer).
- **Stamps are never computed here**: the stepper sends products consumed, and the balance
  and `rewards` shown come from the backend's answer.
- **Styling**: Bootstrap 5.3 via Sass only. `styles/stampy.scss` overrides variables
  (`$primary` `#c2410c` for contrast with white text; the logo orange `#f16417` only as
  `--stampy-brand`, used by the wordmark and stamp dots), then imports the used parts.
  `main.ts` sets `data-bs-theme` from `prefers-color-scheme` and follows changes.
- UI text is Italian, written directly in the components; no i18n, Pinia, Bootstrap JS or bootstrap-vue.

## 3. Endpoints

| Method and path | Auth | Behavior |
|---|---|---|
| `GET /api/health` | no | `200` |
| `POST /api/auth/email/request` | no (IP limiter) | `202 {challengeId}`; 45 s cooldown and 5/hour cap → `429` + `Retry-After`; email failure → `503` |
| `POST /api/auth/email/verify` | no (IP limiter) | `200 {user:{id,email,displayName}}` + `sid` cookie; wrong code on a live challenge → `400 {error:"InvalidCode", message:"Codice non valido", attemptsRemaining}`; any unusable challenge (expired, attempts used up, used, replaced, unknown) → `400 {error:"CodeExpired", message:"Codice scaduto"}` |
| `GET /api/auth/me` | yes | `200 {user:{id,email,displayName}}` (read-only probe) |
| `POST /api/auth/logout` | yes | `204`, cookie removed, `logout` event |
| `POST /api/venues/:venueId/visit[?requestStamp=1]` | yes | new card → `201 {state:"card_created", saveUrl, publicCode}`; live pending request → `200 {state:"request_pending", requestId, expiresAt}`; card `not_added` and no `requestStamp=1` → `200 {state:"card_not_added", saveUrl, publicCode}` (no request); new request → `201`; more than 10 new/hour per card → `429` + `Retry-After`; `requestStamp` other than `1` → `400` |
| `POST /api/venues/:venueId/card/wallet-added` | yes | `204`; `not_added` → `active` (conditional UPDATE, idempotent); no card for this user and venue → `404` |
| `GET /api/requests/:requestId` | yes | `200 {status, publicCode, expiresAt, stampsCount, stampsRequired}` (`publicCode` = the card code, so the customer can read it to staff at any step); when `approved` also `stampsAdded` (sum of the `stamp` events of that request), `rewardsRedeemed` (count of its `redeem` events) and `reward` (promotion's reward name); someone else's or missing request → identical `404` |
| `GET /api/venues/mine` | yes | `200 {venues:[{venueId,name,slug,role}]}` |
| `GET /api/venues/:venueId/requests` | yes + owner/staff | `200 {requests:[{requestId,publicCode,stampsCount,stampsRequired,createdAt,expiresAt}]}`, max 50, never the email |
| `GET /api/venues/:venueId/requests/history` | yes + owner/staff | all requests of the venue, newest first, **never the email**, **no pagination** (no cap on rows; `limit`/`offset` → `400`). Optional query (all AND, unknown fields → `400`): `status` (`pending\|approved\|rejected\|expired`), `minStamps` / `maxStamps` (1–50, confirmed quantity, reward included = sum of the request's `stamp_events.quantity`, so only `approved` requests match), `from` / `to` (on `created_at`; `YYYY-MM-DD` read as UTC, `to` inclusive up to the end of that day, or a full ISO 8601 instant; `from` later than `to` → `400`; future dates are accepted, the block is a UI rule). No dates → all dates; only `from` → from then on; only `to` → up to then. Expired-but-still-`pending` rows are expired first (lazy expiry). `200 {requests:[{requestId,publicCode,status,createdAt,resolvedAt,stamps,stampsAdded,rewardsRedeemed}]}` (`stamps`, `stampsAdded`, `rewardsRedeemed` are `null` unless `approved`) |
| `GET /api/requests/mine` | yes | the logged-in customer's **own** requests in **all** venues, newest first; same query filters, same lazy expiry and same row as the staff history, plus `venueName` (scope `cards.user_id` in SQL, so nobody sees someone else's request). `200 {requests:[{requestId,publicCode,venueName,status,createdAt,resolvedAt,stamps,stampsAdded,rewardsRedeemed}]}`. Both histories call `requestsSrv.getHistory(scope, filters)` with scope `{venueId}` (staff) or `{userId}` (customer). Fixed route registered before `/:requestId` |
| `POST /api/venues/:venueId/requests/:requestId/confirm` | yes + owner/staff | body `{stamps}` = **products consumed, reward included** (integer 1–50) → `200 {status:"approved", stampsCount, stampsRequired, rewards, stampsAdded, reward}` (`stampsAdded` = stamps recorded, `rewards` = rewards consumed); `404`/`409`; after the commit the Google pass is updated best effort (a Wallet failure never changes the response) |
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
lazy expiry → live pending request? 200 **without consuming quota** → card `not_added`
and no `?requestStamp=1` → 200 `card_not_added` + `saveUrl` (signed again locally) +
`publicCode`, **no request created** → otherwise
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
venue + active promotion in a transaction, idempotent on the slug, prints the tag URL
(`APP_ORIGIN/v/<venueId>`). `APP_ORIGIN` is the **frontend** origin (dev: `http://localhost:5173`): the tag must open the customer page in the browser, and it is also the `origins` of the Wallet save JWT. Restart the backend after changing `.env`.

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
| `poll-request.ts` | 17 | `visit`/polling with session, ownership, lazy expiry, race; wallet screen for `not_added`, `requestStamp=1`, `wallet-added` (204, idempotent, 401/404/400, other user's card untouched) |
| `otp-request.ts` | 21 | malformed JSON, 400 without echo, JSON 404, cooldown and 429 body, cooldown skipped for a dead code (attempts used up / expired), hourly cap, window, race, uniform response |
| `otp-verify.ts` | 16 | attempts, single use, expiry, events, race |
| `session.ts` | 16 | single 401, sliding, absolute cap, logout, metadata |
| `history.ts` | 11 | history (staff + customer `GET /api/requests/mine`: own requests only, `venueName`, filters, lazy expiry, spans venues, 401/400): auth/403, fields and no email (body is only `{requests}`), status / stamps / date filters (none, only from, only to, both, ISO instants, `from > to` → `400`), combined filters, full list with no cap, `limit`/`offset`/old names → `400`, tenant isolation, lazy expiry, polling `publicCode`; creates its own second venue |
| `verify-migration-2.sql` | 19 | migration 2 constraints |
| `verify-migration-3.sql` | 6 | migration 3 constraints |

Last recorded run: **November 4, 2026: `history.ts` re-run alone on the dev DB after the customer history: 11 green (`verify.sh` expects 125 now, full run not repeated). Before: after the history filters iteration (no pagination, `minStamps`/`maxStamps`): `verify.sh` 124 green** (20+24+17+21+16+16+10; `wallet-update.ts` not re-run, 11 on November 3), run on a throwaway DB `stampy_verify` (migrate + two 10-stamp venues, backend on port 3100); the dev DB has one venue, so `staff-requests.ts` cannot run there. Before that: November 3, 2026, 125 checks green and 25 SQL checks green (19+6), `npm run typecheck:all` clean. Run on a freshly reset DB with two 10-stamp venues (`create-venue.ts`); `poll-request.ts` assumes the first venue has a 10-stamp promotion and `staff-requests.ts` needs 2 venues.

Frontend: `npm run build` in `stampy-frontend/` runs `vue-tsc` and the production build.
Browser tests (Playwright, `playwright` devDependency, closes B17): `npm run e2e` runs both: `node e2e/staff-input.mjs` (7 checks: typed quantity survives polling, invalid text blocks Confirm, Confirm sends exactly the typed value) and `node e2e/feedback.mjs` (32 checks: staff approval/rejection/reward toast, customer approval text, reward modal persistence/focus/keyboard/reload, 390 px overflow). They need `npm run dev`, the `stampy-db` container and a venue with branding in the DB; they create `e2e-*@test.it` users plus one `e2e-*` venue and delete them. If `playwright install` was not run, point `E2E_CHROMIUM` at a Chromium binary. `node e2e/t6d.mjs` (43 checks, the T6-D staff checklist) and `node e2e/history.mjs` (48 checks: staff history opened from the header menu, URL state, live filters, back/forward, date rules, no pagination, mobile panel, customer card code, customer history: own requests only, venue name, same filters, header with back button and centered logo); neither is part of `npm run e2e`. Last run: 2026-11-04, t6d 43 ✔, history 38 ✔, feedback 32 ✔, staff-input 7 ✔; 2026-11-03, 38 checks green. The 2026-11-01 run was a throwaway script. Last manual browser run:
November 1, 2026 (after the login/redirect and bootstrap change), 47 checks green (headless
Chromium at 360 px against the dev servers, throwaway script outside the repo).
Manual test pass of the frontend (`BACKLOG.md` T6), November 2–3, 2026: **A (login), B (redirects and guards) and C (customer flow) done**;
**D (staff flow) not done (paused 2026-11-03).**

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
| touch the frontend login | `stampy-frontend/src/components/EmailLogin.vue`, `router/index.ts`, `utils/redirect.ts`, `composables/useAuth.ts` |
| touch the customer or staff screens | `stampy-frontend/src/views/` + `api/endpoints.ts` |
| find out what is missing | `BACKLOG.md` |
