# Stampy — Backlog

> **The single list of what is not yet in the code.** If something was designed in a
> handoff and not implemented, it lives here: it is not deleted and not lost.
> When it is done, the entry moves to §8 with a date (the full history stays in
> `archive/` and in Git).
> Decisions already made live in `CONTEXT.md` and **are not reopened**: here we only say
> whether they have been implemented.
> Last updated: October 28, 2026.

**Statuses**

| Status | Meaning |
|---|---|
| `DECIDED` | decision made, implementation not started |
| `TODO` | to do, nothing blocking |
| `TO-DECIDE` | a choice is needed (usually product): no code before it |
| `TO-VERIFY` | an external check is needed (official documentation, field test) |
| `BLOCKED` | depends on another entry (indicated) |

---

## 1. Next step

### B1 — Google pass update after confirmation (`DECIDED`)

**Why it is next**: the DB and the web polling are correct, but after confirmation the
pass in the Wallet still shows the old balance. It is the gate of the end-to-end flow.

- After the confirmation commit, update the object (`loyaltyPoints.balance` and the
  `user_progress` text) via REST, **best effort**: if it fails, the DB stays correct.
- To be checked in the official documentation **before** writing code (V1): auth/scope,
  patch vs replace, updatable fields, latency, whether the class is editable, behavior
  with an object not yet added to the Wallet.
- Never commit output containing tokens or `saveUrl`s.
- Done when: confirm → pass updated within a few seconds; end-to-end test recorded; a
  REST error does not corrupt the DB.
- Origin: `archive/progress.md` §5.15, `archive/Stampy_Handoff_Fase_4d.md` §5.2,
  `archive/stampy_contesto_progetto.md` §5.

---

## 2. Decided and not yet implemented

| ID | Status | What is missing | Origin |
|---|---|---|---|
| B2 | `TO-DECIDE` | **Lazy promotion rollover.** The project planned: if `cards.promotion_id` is not the active promotion, on the first stamp reset `stamps_count`, update `promotion_id` and update the pass (no cron). Today `confirm` answers **409** and the code has no rollover. "What to do with accrued stamps" is a product decision (P2), so the mechanics are ready but must not be written beforehand. | `archive/stampy_db_schema.md` §6 |
| B3 | `DECIDED` | **CORS restricted to a single origin with `credentials`** + `Origin` check on state-changing routes. Today `app.ts` uses an open `cors()`. Decision of 2026-10-26: **no CSRF token for now** (relies on `SameSite=Lax`). | `archive/Stampy_Handoff_Fase_4c.md` §6.3 |
| B4 | `DECIDED` | **GDPR anonymization + retention.** Procedure: delete `auth_identities`, `users.email = NULL`, clear `display_name`, set `anonymized_at`, revoke sessions; cards and logs remain. Retention of `otp_challenges` and `auth_events` to be defined. Also to decide whether `auth_events.subject_hash` is still personal data (null it or rotate the secret). **Prerequisite: first real user.** | `archive/stampy_db_schema.md` §6, `archive/Stampy_Handoff_Fase_4c.md` §6.10 |
| B5 | `DECIDED` | **Google login** (`POST /api/auth/google`, body `{idToken}`). Verify signature/`aud`/`iss`/`exp` with `google-auth-library` (already installed); look up `(google, sub)`; link to the user with the same email **only** if `@gmail.com` or `email_verified` + `hd`; third-party email → rejection + `google_untrusted_email_rejected` event; then session and `login_success`. Requires external configuration (V4). Postponed "after staff", which is closed. | `archive/Stampy_Handoff_Fase_4c.md` §5D, §6.8 |
| B6 | `DECIDED` | **Real email delivery**: `GmailEmailSender` + `EMAIL_PROVIDER` (`console` \| `gmail`) in `env.ts`. Today only `ConsoleEmailSender` exists (it refuses to start in production). Gmail limits to be verified (V3); consider a transactional provider once there is a domain (SPF/DKIM). | `archive/Stampy_Handoff_Fase_4c.md` §5E, `archive/progress.md` §5.11 |
| B7 | `DECIDED` | **Vue frontend: staff and customer.** Backend already ready (`/venues/mine`, queue, confirm, reject, polling with balance, `visit`). To respect: `venueId` in the URL with login on the same page (no redirect), customer polling every 1–2 s, **product quantity stepper** (not stamps), "reward applied" notice when `rewards > 0`, full card shown as "reward available". | `archive/Stampy_Handoff_Fase_4d.md` §5.3, `archive/Report_Fase_4d.md` §5.3 |
| B8 | `TODO` | **"Re-add card" route** for someone who removed the pass: regenerate the `saveUrl` of the existing card. Small, but it needs a product choice on exposure (public link? after login?). | `archive/stampy_contesto_progetto.md` §5 |
| B9 | `TO-DECIDE` | **Default branding** for a newly created venue (today `branding = {}` makes card creation fail) and self-service customization (postponed). | `archive/stampy_contesto_progetto.md` §5 |
| B10 | `TO-VERIFY` | **`wallet_status`**: today it is `not_added` and is neither read nor updated. It would become reliable only with a Google notification mechanism (V1). | `archive/stampy_contesto_progetto.md` §4.6 |
| B11 | `DECIDED` | **Venue manager dashboard** (members, stamps awarded, rewards redeemed + charts over time). Not started. | `archive/stampy_contesto_progetto.md` §4.8 |
| B12 | `DECIDED` | **Apple Wallet**, only after validating the flow on Google: $99/year, signed `.pkpass` passes, extraction of the Wallet code from `wallet/wallet.service.ts`. With Apple, login with Apple will also be considered. | `archive/stampy_contesto_progetto.md` §4.6, §5 |
| B13 | `TO-DECIDE` | **Phone + SMS access**: only with a real customer (cost per message, NIST classifies it as "restricted"). Schema already prepared. | `archive/progress.md` §5.27 |

---

## 3. Technical debt verified in the code

None of these blocks development; almost all of them block the deploy.

| ID | Status | What | Where |
|---|---|---|---|
| C1 | `TODO` | `logger: true` prints queries and parameters (so also emails and code hashes). To be removed before the deploy. | `src/db/index.ts` |
| C5 | `TODO` | `start` uses `tsx` and `build`/`dist` are disconnected; `dist/` is stale and ignored by Git. Decide the deploy (tsx or build) and align the scripts. | `package.json`, `dist/` |
| C6 | `TODO` | `visit` is not in a transaction (the steps are idempotent, but a card can be left without a request if it fails halfway). | `src/api/venues/venues.controller.ts` |
| C7 | `TODO` | The **409** of `visit` has its status in the code but cannot be exercised without forcing a race: no test covers it. | `venues.controller.ts` |
| C11 | `TODO` | `npm run script:all` stops: `create-owner` and `create-venue` require arguments and exit with 1; moreover the chain does not pass `--env-file=.env`. Either remove them from the chain or accept arguments. | `package.json` |
| C13 | `TODO` | `addOrGetCard` does `INSERT` before `SELECT` (accepted choice: avoids the race). If the code grows, consider a more explicit `CardsService`. | `cards.service.ts` |
| C14 | `TODO` | `.vscode/settings.json` is tracked: decide whether to keep it. | `.vscode/` |
| C15 | `TODO` | Tag `fase-4d-chiusa` was never created (the repo only has `refactor-struttura-chiuso`). Tags are not essential, but phase closure is tracked only by commits. | Git |

---

## 4. Tests

| ID | Status | What |
|---|---|---|
| T2 | `TODO` | An isolated, unreproduced failure in `otp-request.ts` ("5 simultaneous requests" after a nodemon restart). If it happens again, save the output before investigating. |
| T3 | `TODO` | Tests to add when the feature exists: end-to-end pass update (B1), Google login with valid/tampered token/wrong `aud`/third-party email (B5), anonymization (B4), `visit` 409 (C7). |
| T4 | `TODO` | **Bruno collection** for structured manual tests: proposal only, nothing created. The plan had folders `00–09` and fixtures generated by scripts (Bruno has no access to the DB or the OTP codes). |
| T5 | `TODO` | Real test on browser/iPhone/HTTPS: `Secure` cookie, `SameSite=Lax` when opened from a tag, session sliding. Today everything is tested only over local HTTP. |

---

## 5. External verifications (only on the user's explicit request)

Do not invent APIs, SDKs or limits: these entries are closed by reading the official
documentation or testing in the field, and the answer is written here.

| ID | What to verify |
|---|---|
| V1 | **Google Wallet REST**: auth/scope, patch vs replace, updatable fields (`loyaltyPoints.balance`, `user_progress`), latency, whether the class is editable, notifications for `wallet_status`. |
| V2 | **Google publishing access**: review times, Business Profile requirements for an individual without a VAT number, pass limits in demo/test, required screenshots. |
| V3 | **Gmail**: sending and delivery limits for automated emails, authentication (app password vs OAuth). |
| V4 | **Google Sign-In**: client ID, consent screen, verification requirements, **how to obtain an ID token in tests** without a frontend. |
| V5 | **Apple**: `id_token`, whether `email_verified` can be false (Work & School), handling of "Hide My Email". |
| V6 | **Physical NFC**: background reading on iPhone (XS/XR onwards) and Android; behavior with cases and metal surfaces. |
| V7 | **Cloudflare**: tunnel with a fixed name/URL; number of hops for `TRUST_PROXY` behind the staging proxy (never `true`). |
| V8 | **Safari ITP**: the `httpOnly` cookie written by the server should not fall under the 7-day cap, but if the server IP is disconnected from the site it can kick in → frontend and `/api` on the same origin. |
| V9 | **Pass graphics**: logo size and requirements (PNG, preferably square). `public/logo.png` is not served by any route. |

---

## 6. Product and field

| ID | Status | What |
|---|---|---|
| P1 | `TODO` | **Talk to 2-3 real venue managers** (bars, gelaterias, pizzerias): prerequisite for the business model and for decisions on expiry/rollover. Not a technical task that can be postponed. |
| P2 | `TO-DECIDE` | What happens to accrued stamps at **expiry or promotion change** (reset, keep, warn on the card). Blocks B2. |
| P3 | `TO-DECIDE` | **Business model** and price. |
| P4 | `TODO` | **Physical support for the venue**, in phases: prototype (NTAG213 sticker on an L-shaped acrylic menu holder + printed QR), pilot (branded print), scale (custom plexiglass with embedded chip). Never lock tags to read-only before the final URL. |
| P5 | `TODO` | **Domain** (~€10/year) and **staging hosting** (e.g. Railway, Fly.io) with a fixed URL; the domain is also needed for email SPF/DKIM. |
| P6 | `TO-DECIDE` | Keep the barcode on the pass? Identification happens from the counter tag/QR; `accountId` might be enough. Also decide how to show the readable `publicCode`. |
| P7 | `TO-DECIDE` | Dashboard: which numbers the venue manager really needs (beyond members, stamps, rewards). |
| P8 | `TODO` | **Segment preview** for staff before confirmation (postponed: basic flow first). |
| P9 | `TODO` | Show **rewards to the customer too** in polling (today `rewards` only appears in the `confirm` response, so only staff sees it). |

---

## 7. Security rules to follow in the real APIs

Operational reminder (the decisions are in `CONTEXT.md` §5).

- Auth before validation: `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- The path's `venueId` is a **selector**, never proof of authorization: the role is read
  from `venue_members` on every request.
- **Ownership** on every resource: the check is in SQL (join on `cards.user_id`); someone
  else's resource gives the **same 404** as a missing one and is never written.
- Confirmation is idempotent by construction: UPDATE conditioned on `status='pending'` +
  unique `idempotency_key`. Double confirm → 409, never a double count.
- Validation: no unexpected fields, a cap on every numeric value, no implicit coercion,
  400 (not 500) for missing input.
- Limits at two levels (card and IP), never a global counter; `TRUST_PROXY` = number of hops.
- Secrets: service account, `OTP_HMAC_SECRET`, email credentials never in Git, in chat or
  in documents; in production in the hosting secrets.
- Never `res.json(row)`; never personal data in logs or in `auth_events.metadata`.
- Every state UPDATE with the state filter in the `WHERE`.

---

## 8. Recently closed

Not reopened: if you need the detail, it is in `archive/` and in the commits.

| Date | What |
|---|---|
| 2026-10-30 | **C2, C4, C8 closed**: JSON 404 on non-existent `/api` routes; validation 400 without `value`; single 429 `TryLaterError` / "Riprova più tardi" / `retryAfterSeconds` (also from the IP limiter). `otp-request.ts` 13→16 checks, total 104. |
| 2026-10-30 | **C3, C9, C10, C12 closed**: malformed JSON → 400 (`bodyParserHandler` handler); removed `users.service.ts`, `UserNotFoundError`, `PromotionExpiredError`, `CardNotFoundError`; `req.auth` comment fixed; retry on `public_code` collision. 101 checks green, `typecheck:all` clean. |
| 2026-10-30 | **`docs/` folder moved to the repo root** (from `stampy-backend/docs/`); references aligned in `README.md`, `AGENTS.md`, `opencode.json`. `archive/` left unchanged. |
| 2026-10-28 | **Suite re-run** after the last commit: 101 checks green (20+24+12+13+16+16) and 25 SQL checks (19+6), `typecheck:all` clean. |
| 2026-10-28 | **Documentation reorganized**: 3 living files (`CONTEXT.md`, `CODEBASE.md`, `BACKLOG.md`), the 7 historical docs in `docs/archive/`. |
| 2026-10-27 | **Phase 4d**: `visit` rate limit (10 new/hour per card), staff auth with roles, `/venues/mine`, queue, confirm/reject in a transaction, migration 3, stamp rule fixed. 101 checks green. |
| 2026-10-26 | Email (OTP) path, `isAuthenticated`, sliding session with absolute cap, logout, `visit`/polling with the session user and ownership in SQL. |
| 2026-10-24 | Migration 2 (`auth_identities`, `otp_challenges`, `sessions`, `auth_events`; email on `users`, phone removed), auth decisions. |
| 2026-10-27/28 | `typecheck:all` script (scripts included), removal of unused dependencies, enums derived from the `pgEnum`s, `CardsService` separated from the Wallet, `create-venue`. |
