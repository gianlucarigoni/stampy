# Stampy — Context and decisions

> **Static** document: edit it only when a decision changes (product, architecture,
> security), not to report progress. The state of the code lives in `CODEBASE.md`, what
> is left to do in `BACKLOG.md`, history in `archive/`.
> Last review: October 28, 2026.

---

## 1. What Stampy is

Stampy replaces paper stamp loyalty cards with a digital card in the smartphone Wallet
(Google Wallet, Apple Wallet in the future), for local food & beverage venues (bars,
pizzerias, restaurants, gelaterias, bakeries…). **No app for the customer to download.**

Goals: fast customer experience, low friction for staff, per-venue customization, useful
data for the venue manager on visits, rewards and trends.

Initial market: small/medium local businesses in Italy, often still on paper cards.

## 2. Constraints

- No confirmed pilot customer: development is solo.
- **Minimal budget: revenue comes before investment.** Every technical choice must stay
  at ~0 cost (this is why auth does not use paid SMS and the Wallet starts with Google).
- No fixed deadline.
- Business choices (price, model) come **after** talking to 2-3 real venue managers.
  They are not a technical task that can be postponed, but they do not block the backend.

## 3. Actors and flows

- **Customer**: a single account on the platform, one card for each venue they join.
  Enters from a link (NFC tag or QR on the counter) → login (email with code, or Google) →
  if they have no card for that venue, the backend creates it and returns the Wallet link.
- **Staff** (venue owner/staff): same web app, same login method, role per venue. Sees
  the queue of pending requests, confirms or rejects.
- **Stampy team**: configures venues and promotions with scripts (`create-venue`,
  `create-owner`); no self-service in the MVP.

## 4. Decisions — product

### 4.1 Customer and card

- **One customer per platform**, not duplicated per venue.
- **One card per venue**: more venues = more distinct cards in the Wallet. Each venue has
  its own brand identity and its own formula. A multi-venue summary view is a future
  evolution outside the Wallet (web app), not MVP.
- **Primary identifier: verified email.** No passwords. Sign-up and login are the same
  gesture (if the email does not exist, the user is created).
- **Future, unconfirmed** methods (the schema is ready): Apple, phone with SMS. Email and
  phone are not merged.
- No fuzzy matching. For edge cases (email change), manual merge by support/admin.
- **Same account with different methods**: someone who signs in with Google using the
  same email reaches the same account, but only under the conditions in §5.3.

### 4.2 Promotions

- A single model in the MVP: **stamps** (`type = "stamps"`), config `{v:1, stampsRequired, reward}`.
- The schema must make other models an extension: `type` + JSONB configuration.
- Promotions are configured by the Stampy team, not by the venue manager (self-service postponed).
- **Only one active promotion per venue**, enforced by the DB (range constraint).

### 4.3 In-venue interaction

- **NFC** as the main method, **QR** as fallback. The tag holds a plain NDEF record with
  a URL: it is read by the phone's operating system, not by JavaScript.
  **The Web NFC API is not used** (it does not exist on Safari/iOS).
- The operation (stamps or reward) is **always confirmed by staff**, never automatic:
  the tag can be copied and the customer could tap it several times.
- The complete flow, status codes and limits are in `CODEBASE.md` §5.

### 4.4 Stamp rule (product invariant)

Staff types **how many products were consumed, reward included**. The backend splits the
quantity into consecutive segments; the reward product **consumes one unit** of the
quantity and **is not a stamp**.

```
threshold 10, card 0, quantity 15
  products 1-10   → stamp 10      (card full: reward available)
  product 11      → redeem 1      (free, consumes 1 of the quantity)
  products 12-15  → stamp 4
  → card 4/10, 1 reward consumed
```

- Quantity **exactly** at the threshold (10 from 0): the card stays at **10/10** and the
  reward is **available**. The next product is free (`confirm` with quantity 1 → only
  `redeem`, card 0). **Do not reset the card at the threshold**: the reward would be lost.
- `stampsCount ∈ [0, stampsRequired]`; `rewards` = rewards **consumed** in that confirmation.
- Cap per confirmation: **50 products** (protects against typing mistakes).
- The rule applies **only** to `type = "stamps"`: other models will have their own function.
- The segment preview for staff is postponed.

### 4.5 Staff interface

- First phase: **web app** on any tablet/phone, no dedicated hardware.
- The dedicated terminal (and the real "tap POS", Apple VAS / Google Smart Tap) remains a
  stated goal for later: it requires certified hardware and is a second product.
- Hardware is designed **after** observing real staff with the web app.

### 4.6 Wallet

- Start **with Google Wallet only** (free). Apple in a second phase, when the
  $99/year Apple Developer Program becomes affordable.
- **No abstract "wallet provider" interface**: there is only one provider. It is extracted
  when Apple arrives. All Google code lives in `api/wallet/`; `cards.service` only knows
  `buildObjectId`.
- **Google model**: one LoyaltyClass per venue (identity and branding: name, logo, color,
  banner); everything that depends on the promotion (reward, threshold, counter) lives in
  the card's object, so the card survives a promotion change.
- The "Add to Google Wallet" link is signed locally (RS256 JWT with the service account key).
- `wallet_status` is `not_added` and is **neither read nor updated**.
- Issuer account in demo mode; publishing access still has to be requested.

### 4.7 Multi-tenant

Multi-tenant **from the first schema**: every child table carries `venue_id` and the
composite FKs `(id, venue_id)` prevent inconsistencies across venues. We do not go from
"isolated" to multi-tenant later.

### 4.8 Venue manager dashboard

Hybrid: simple numbers (members, stamps awarded, rewards redeemed) + charts over time.
Not started.

### 4.9 Stack

- **Backend**: Node.js + Express 5 + TypeScript (`strict`), Drizzle ORM, PostgreSQL 16.
- **Frontend**: Vue.js (not started).
- **Relational DB, not document**: the model is relational (card → user + venue, events →
  card) and constraints are needed (multi-tenant, idempotency, one active promotion). The
  variable part of promotions uses `type` + `JSONB`.
- **Validation**: `class-validator` for HTTP DTOs; `zod` for env, branding,
  `promotions.config`, `auth_events` metadata.
- **Migrations**: `generate` + `migrate`, **never `push`** (it would drop hand-written
  constraints, e.g. `promotions_no_overlap` with `btree_gist`). Always read the generated SQL.
- **Auth**: `httpOnly` cookie + revocable session in the DB, not a JWT in `localStorage`.

## 5. Decisions — auth and sessions

Goal: ~0 cost at launch, good experience at the counter, everything traceable in the DB,
a structure that can be extended to Apple and phone without a rewrite.

### 5.1 Principles

- **No passwords.** The residual risk is a compromised mailbox, accepted for this risk
  level (no payments, staff confirmation).
- **No account or identity without proof of possession** (OTP code or authoritative IdP):
  defense against *pre-hijacking*. No unverified "change email" feature.
- **Identity key: `(provider, sub)`**, never the email (it can change).
- `users.email` is UNIQUE and set **only after** proof of possession: one account per
  email even with simultaneous requests.
- `users` (who they are) is separate from `auth_identities` (how they prove it).
- **Identical** response for existing and non-existing email.

### 5.2 OTP codes

- 6 digits, valid for **5 minutes**, single use, bound to the challenge (the client sends
  `challengeId` + code), stored only as an **HMAC** with a server secret.
- A new send **invalidates the previous one** in the same transaction.
- **5 attempts** per code; the fifth with the correct code succeeds; at the fifth wrong
  attempt the challenge is invalidated.
- **45 seconds** between two sends to the same recipient (server side).
- **5 sends/hour** per recipient (sliding window), then a 1-hour suspension.
- Limits are **per recipient**, never a global counter (it would block the whole app).
- A single error `400 "Codice non valido o scaduto"` (Italian literal in code) for every
  verification failure.
- Our own values, not standard ones: the standards (NIST/OWASP) set looser caps.

### 5.3 Google (login not implemented yet)

- Verification of the token's signature, `aud`, `iss`, `exp`.
- Automatic linking to an existing account **only** if the email is `@gmail.com` or
  `email_verified` is true **with `hd` set**.
- **Google with third-party email (e.g. libero.it): rejected** in the MVP, with an
  invitation to use email with code and a `google_untrusted_email_rejected` event.
  Accepting them in the future will require an additive migration, not a rewrite.

### 5.4 Sessions and cookies

- Random 32-byte token (43 base64url characters); only its **SHA-256** is stored in the DB.
- `sid` cookie: `httpOnly`, **`SameSite=Lax`** (Strict would break opening from an
  NFC/QR tag), `Secure` only in production, `Path=/`, unsigned (`cookie-parser` without
  a secret). `maxAge` = absolute cap (90 days), **not renewed**.
- **Sliding with absolute cap**: 30 days from last activity, renewed at most every
  **5 minutes**, never beyond **90 days** from `created_at` (no new column).
- **Single 401** for missing, tampered, expired, revoked cookie, anonymized user or cap
  exceeded. No logging on 401s.
- **Logout**: revokes **only the current session** (`revoked_at` written only if NULL),
  `logout` event in the same transaction and only if the revocation happened, cookie
  removed with the same options. "Sign out of all devices" does not exist.
- Frontend and `/api` must be **on the same origin** (Safari ITP risk).

### 5.5 Staff and roles

- Same login method as the customer, **personal account**.
- Role (`owner`/`staff`) in `venue_members`, read **on every request**: never in the
  session, never in `req.auth`, never from the body. The `venueId` in the path is only a selector.
- Non-member → **403**.
- First `owner` with `scripts/create-owner.ts <email> <slug>` after the user's first
  login (idempotent, `--force` to promote a `staff`).
- For now owner and staff have the same powers.

### 5.6 Limits

- **Per card**: 10 **new** stamp requests/hour, counted on `stamp_requests` (any status),
  429 with `Retry-After`. It is not a cooldown: a retap with a live pending request
  returns that one and does not consume quota; after a rejection or expiry a new one can
  be made immediately.
- **Per IP** on `/auth/email/*` routes: 30 requests/15 minutes (`express-rate-limit`),
  active in production or with `IP_RATE_LIMIT=on`, off with `off`. In development it is a
  pass-through. Depends on `TRUST_PROXY` (number of hops, **never `true`**).
- The two limits have different purposes: the per-card one protects the card, the per-IP
  one protects the app from scripted bursts.

### 5.7 Audit and privacy

- `auth_events` append-only (INSERT only): sends, blocked sends, failed attempts,
  verifications, logins, linkings, Google rejected, logout, revocations.
- Never plaintext email: only `subject_hash` (HMAC). `metadata` with a zod whitelist per
  event type; no IPs, no email domain, no codes.
- **Users are not deleted, they are anonymized** (GDPR): identities removed, email and
  personal data cleared, `anonymized_at` set, sessions revoked; stamp and event logs
  remain. The procedure is not implemented yet (see `BACKLOG.md`).
- Retention of `otp_challenges`/`auth_events`: **postponed until before the first real user**.

## 6. Decisions — data (invariants)

Technical detail in `CODEBASE.md` §6; here are the rules that cannot be violated.

- One card per person per venue (`UNIQUE user_id, venue_id`); the card is the
  customer ↔ venue relationship and does not expire with the promotion.
- Only one active promotion per venue (`btree_gist` EXCLUDE on range overlap).
- Only one `pending` request per card (partial UNIQUE index).
- A request can generate **several** `stamp_event`s (one per segment): `request_id` is
  **not** UNIQUE, uniqueness is on `idempotency_key = {requestId}:{n}`.
- Full card (`stamps_count = stampsRequired`) = **reward available**, not data to be fixed.
- The source of truth for expiry is `expires_at`: **lazy** expiry (no cron), only from
  `pending`, applied by polling, queue and confirm/reject.
- FKs are always `ON DELETE RESTRICT`: logs are immutable, which is why we anonymize.
- Emails always lowercase and without spaces (CHECK in the DB); no other normalization.

## 7. What not to do

- Do not develop dedicated hardware or the "tap POS" (Apple VAS / Google Smart Tap) in
  parallel with the software: it is certified hardware, not an extension of the web app.
- Do not implement Apple Wallet before validating the flow on Google Wallet.
- Do not model the customer as isolated per venue (we need one customer + several cards).
- Do not build a generic promotion rule engine until it is really needed.
- Do not use the Web NFC API: it does not exist on iOS. The tag is read natively (URL).
- Do not decide the business model before talking to real venue managers.
- Do not reintroduce an abstract "wallet provider" interface until Apple exists.
- Do not reintroduce passwords, unverified-email login, or a UNIQUE on
  `stamp_events.request_id`.
- Never trust the client for authorization, quantity or segments.
- Do not put roles in the session or in `req.auth`, nor personal data in logs or in
  `auth_events.metadata`.
- Do not update `last_seen_at`/`expires_at` on every request, nor exceed the absolute cap
  computed from `created_at`.
- Do not update a request's status without the `status = 'pending'` filter.
- Do not use `new Date()` for expiry: always the DB `now()`.
- Do not use `drizzle-kit push`.

## 8. Open product questions

These are not decisions: they are choices still to be made (tracked in `BACKLOG.md` §6).

- What happens to accrued stamps at expiry or when the promotion changes (reset, keep,
  warn). Today confirm answers 409 if the card's promotion is not the active one.
- Business model and price.
- Look and content of the physical support (tag/QR) and of the pass.
- Dashboard: which numbers the venue manager really needs.
