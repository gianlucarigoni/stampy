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

No item is currently blocking the end-to-end flow. B1 (Google pass update after
confirmation) was implemented on 2026-10-31 and is recorded in §8; what remains of it is
B14 and V1 below, plus B8 (a customer who never saved the pass cannot get the link again).

---

## 2. Decided and not yet implemented

| ID | Status | What is missing | Origin |
|---|---|---|---|
| B2 | `TO-DECIDE` | **Lazy promotion rollover.** The project planned: if `cards.promotion_id` is not the active promotion, on the first stamp reset `stamps_count`, update `promotion_id` and update the pass (no cron). Today `confirm` answers **409** and the code has no rollover. "What to do with accrued stamps" is a product decision (P2), so the mechanics are ready but must not be written beforehand. | `archive/stampy_db_schema.md` §6 |
| B3 | `DECIDED` | **CORS restricted to a single origin with `credentials`** + `Origin` check on state-changing routes. Today `app.ts` uses an open `cors()`. Decision of 2026-10-26: **no CSRF token for now** (relies on `SameSite=Lax`). | `archive/Stampy_Handoff_Fase_4c.md` §6.3 |
| B4 | `DECIDED` | **GDPR anonymization + retention.** Procedure: delete `auth_identities`, `users.email = NULL`, clear `display_name`, set `anonymized_at`, revoke sessions; cards and logs remain. Retention of `otp_challenges` and `auth_events` to be defined. Also to decide whether `auth_events.subject_hash` is still personal data (null it or rotate the secret). **Prerequisite: first real user.** | `archive/stampy_db_schema.md` §6, `archive/Stampy_Handoff_Fase_4c.md` §6.10 |
| B5 | `DECIDED` | **Google login** (`POST /api/auth/google`, body `{idToken}`). Verify signature/`aud`/`iss`/`exp` with `google-auth-library` (already installed); look up `(google, sub)`; link to the user with the same email **only** if `@gmail.com` or `email_verified` + `hd`; third-party email → rejection + `google_untrusted_email_rejected` event; then session and `login_success`. Requires external configuration (V4). Postponed "after staff", which is closed. | `archive/Stampy_Handoff_Fase_4c.md` §5D, §6.8 |
| B6 | `DECIDED` | **Real email delivery**: `GmailEmailSender` + `EMAIL_PROVIDER` (`console` \| `gmail`) in `env.ts`. Today only `ConsoleEmailSender` exists (it refuses to start in production). Gmail limits to be verified (V3); consider a transactional provider once there is a domain (SPF/DKIM). | `archive/Stampy_Handoff_Fase_4c.md` §5E, `archive/progress.md` §5.11 |
| B8 | `TODO` | **"Re-add card" route** for someone who removed the pass: regenerate the `saveUrl` of the existing card. Small, but it needs a product choice on exposure (public link? after login?). | `archive/stampy_contesto_progetto.md` §5 |
| B9 | `TO-DECIDE` | **Default branding** for a newly created venue (today `branding = {}` makes card creation fail) and self-service customization (postponed). | `archive/stampy_contesto_progetto.md` §5 |
| B10 | `TO-VERIFY` | **`wallet_status`**: today it is `not_added` and is neither read nor updated. It would become reliable only with a Google notification mechanism (V1). | `archive/stampy_contesto_progetto.md` §4.6 |
| B11 | `DECIDED` | **Venue manager dashboard** (members, stamps awarded, rewards redeemed + charts over time). Not started. | `archive/stampy_contesto_progetto.md` §4.8 |
| B12 | `DECIDED` | **Apple Wallet**, only after validating the flow on Google: $99/year, signed `.pkpass` passes, extraction of the Wallet code from `wallet/wallet.service.ts`. With Apple, login with Apple will also be considered. | `archive/stampy_contesto_progetto.md` §4.6, §5 |
| B14 | `TO-VERIFY` | **Push notification when the reward is reached** (`stamps_count = stampsRequired`) via `notifyPreference` on the PATCH, at most once per card cycle (cap ≈3 pushes/24 h). The accepted literal is not known (`notifyOnUpdate` / `NOTIFY` / `NOTIFY_ON_UPDATE`): test on a demo issuer before writing code (V1). Today every pass update is silent. | `google/wallet-pass-update.md` |
| B15 | `TODO` | **The customer page cannot identify the customer or the venue.** The queue identifies a request by `publicCode`, but `visit` returns it only with `card_created`, and neither `visit` nor `GET /requests/:id` returns the venue name. With two pending requests, staff cannot tell them apart from the customer's screen. Fix: add `publicCode` and the venue name to those responses. | Frontend, 2026-11-01 |
| B17 | `TODO` | **No committed frontend tests.** The browser checks of 2026-11-01 were a throwaway script. Decide whether to add Playwright to the repo as a dev dependency. | Frontend, 2026-11-01 |
| B18 | `TODO` | **Rubber-stamp animation on the customer page** (out of MVP): when staff confirms while `/r/:requestId` is open, show one ink stamp per confirmed stamp. Needs the number of stamps added in the polling response (today only the balance). | Frontend test, 2026-11-02 |
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
| T6 | `TODO` | **Manual test pass of the frontend**, in the browser, dev servers, empty DB (`stampy-backend/scripts/reset-data.sql`). **A done (2026-11-02)**; **B, C, D not tested.** Checklist below. |

### T6 setup

1. Reset the DB, restart `npm run dev`; `APP_ORIGIN=http://localhost:5173` in `.env`.
2. `create-venue.ts --stamps 5 ...` (prints the tag URL), log in once as the staff email on `/login` (code printed in the backend log), then `create-owner.ts <email> <slug>`.
3. Customer in a second browser profile or incognito (separate `sid` cookie). Open the app on `:5173`, never `:3000`.
4. Limits: code 5 min, 45 s between sends, 5 sends/hour, 5 attempts, stamp request 3 min, 10 new requests/hour per card, quantity 1–50.

### T6-A. Login: DONE (2026-11-02)

Bugs found and fixed: attempts left shown, "scaduto" vs "non valido" split, cooldown skipped for a dead code, countdown cleared when the code is dead or the email changes (commits `5872fe5`, plus the countdown fixes).

### T6-B. Redirects and guards: NOT TESTED

| Action | Expected |
|---|---|
| Logged out, open `/staff` | `/login?next=/staff`, then back to `/staff` after login |
| `/login?next=//evil.com`, `?next=/\evil`, `?next=https://evil.com`, `?next=/login` | `next` ignored; default destination, never an external site |
| Login without `next`: 0 / 1 / 2+ venues | `/scan` / `/staff/:id` / `/staff` |
| Logged in, open `/login` | continues as if just logged in |
| Unknown URL | "not found" page |
| Backend stopped, reload | `/session-error`; after restart, retry recovers |
| Delete the `sid` cookie (or `DELETE FROM sessions`) and click anything | `/login?next=<current path>` |
| Logout | `/login`; back button shows nothing private; tab `sessionStorage` cleared |

### T6-C. Customer flow: NOT TESTED

| Action | Expected |
|---|---|
| First visit `/v/<venueId>`, logged out | login, then back to `/v/...` |
| First visit, logged in | "La tua card è pronta", Wallet button, card code |
| Reload there | same screen, **no** stamp request created (`select * from stamp_requests`) |
| "Richiedi il timbro" | `/r/<id>`, "Richiesta inviata", balance 0/5 |
| Reload `/r/<id>` | same page, no new request |
| `/v/...` again with a pending request | back to the same `/r/<id>`, quota not consumed |
| Staff confirms | within 2 s: "Timbro confermato" with the new balance |
| Staff rejects | "Richiesta non confermata", "Richiedi di nuovo" |
| 3 minutes with no action | "Richiesta scaduta", then "Richiedi di nuovo" |
| "Richiedi di nuovo" in a new tab | venue not stored: asks to tap the tag again (B15) |
| `/r/<random UUID>`, `/r/xyz`, another customer's `/r/<id>` | "Richiesta non trovata" (same 404 for all) |
| `/v/xyz`, `/v/<random UUID>` | "Questo link non è valido.", no retry button |
| 11th request in one hour | "Troppe richieste. Riprova tra …" |
| Backend stopped during polling, then restarted | keeps polling and recovers |
| Wallet button | opens `saveUrl` in a new tab (needs the real service account; origin-related failure: check `APP_ORIGIN`, V1) |

### T6-D. Staff flow: NOT TESTED

| Action | Expected |
|---|---|
| Empty queue | "Nessuna richiesta in attesa" |
| Customer opens a request | appears within 3 s: code, time, `0 / 5 timbri` |
| Stepper | "−" disabled at 1; max 50; quantity kept across polls |
| Confirm 1 product | `CODE: 1 prodotto, saldo 1/5.` |
| Confirm more than the missing stamps (e.g. 3 at 3/5) | card fills, reward applied: "Premio applicato: non far pagare il prodotto in premio." |
| Full card (5/5) in the queue | "Premio disponibile" |
| Confirm the same request from two tabs | second gets an error (409), queue refreshes |
| Reject | "richiesta rifiutata", balance unchanged |
| Double-click confirm | one request only |
| Request expires while staff has it open | error on confirm, then it leaves the queue |
| `/staff/<other venue id>` or a customer-only account on `/staff/<id>` | "Non sei autorizzato…" |
| 2 venues, `/staff` | picker, and "Cambia locale" on the queue |

Also check at 360 px (no horizontal scroll), light and dark theme, favicon, no 404 in the Network tab. Expected non-bugs: the first confirm may log `[wallet] …` (pass not saved yet, response stays 200); a staff user opening `/v/...` gets a card too; the UI text is Italian by design.

---

## 5. External verifications (only on the user's explicit request)

Do not invent APIs, SDKs or limits: these entries are closed by reading the official
documentation or testing in the field, and the answer is written here.

| ID | What to verify |
|---|---|
| V1 | **Google Wallet REST**: the PATCH is implemented but never run against a real demo issuer. Still to test: patch vs replace for `textModulesData` (all 3 modules are always sent), the response for an object **not yet saved** (404?), latency, `notifyPreference` literal, whether the class is editable, notifications for `wallet_status`. See `google/wallet-pass-update.md` (UNVERIFIED table). |
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
| 2026-11-02 | **OTP errors split** (login test, flow A): verify answers `InvalidCode` (+ `attemptsRemaining`) or `CodeExpired`; the login screen shows the attempts left, disables the field when the code is dead and highlights "new code"; the 45 s cooldown is skipped when the last code is expired or out of attempts (hourly cap unchanged). `CONTEXT.md` §5.2 updated. `otp-request.ts` 16→21 checks. |
| 2026-11-01 | **B7 wording reversed, B16 closed**: login is now one dedicated `/login` page with a router guard and `?next=` redirect (validated against open redirects), instead of `AuthGate` showing it in place; after login: `next`, else 0 venues -> `/scan`, 1 -> `/staff/:id`, 2+ -> `/staff`. Customer flow split into `/v/:venueId` (visit, Wallet-save screen) and `/r/:requestId` (polling only: reload creates no request). Bootstrap 5.3 (Sass only) replaces `main.css`, with `data-bs-theme` following the system. 47 browser checks green. B15 and B17 stay open. |
| 2026-11-01 | **B7 closed**: Vue frontend with email login in place (`AuthGate`, `EmailLogin`), customer page `/v/:venueId` (card, stamp request, polling, full card as reward available), staff `/staff` and `/staff/:venueId` (queue, product quantity stepper, confirm/reject, "reward applied" notice). `create-venue` now prints the frontend tag URL. 40 browser checks green. Real device test still open (T5); new gaps B15, B16, B17. |
| 2026-10-31 | **B1 closed (code side)**: after the confirm commit, `staff.controller.ts` calls `GoogleWalletService.updateCard` (authenticated PATCH of `loyaltyPoints` + 3 text modules; 5 s timeout, 2 retries) in a best-effort wrapper that only logs card id + status/code, so a Google failure never changes the 200. `confirm` now returns `cardId` (internal, stripped from the body). New `scripts/wallet-update.ts` (11 checks, mocked client). Removed the unscoped `getRequestById` and the unused `CardNotFoundError`. Real-issuer behavior still open (V1). |
| 2026-10-30 | **C2, C4, C8 closed**: JSON 404 on non-existent `/api` routes; validation 400 without `value`; single 429 `TryLaterError` / "Riprova più tardi" / `retryAfterSeconds` (also from the IP limiter). `otp-request.ts` 13→16 checks, total 104. |
| 2026-10-30 | **C3, C9, C10, C12 closed**: malformed JSON → 400 (`bodyParserHandler` handler); removed `users.service.ts`, `UserNotFoundError`, `PromotionExpiredError`, `CardNotFoundError`; `req.auth` comment fixed; retry on `public_code` collision. 101 checks green, `typecheck:all` clean. |
| 2026-10-30 | **`docs/` folder moved to the repo root** (from `stampy-backend/docs/`); references aligned in `README.md`, `AGENTS.md`, `opencode.json`. `archive/` left unchanged. |
| 2026-10-28 | **Suite re-run** after the last commit: 101 checks green (20+24+12+13+16+16) and 25 SQL checks (19+6), `typecheck:all` clean. |
| 2026-10-28 | **Documentation reorganized**: 3 living files (`CONTEXT.md`, `CODEBASE.md`, `BACKLOG.md`), the 7 historical docs in `docs/archive/`. |
| 2026-10-27 | **Phase 4d**: `visit` rate limit (10 new/hour per card), staff auth with roles, `/venues/mine`, queue, confirm/reject in a transaction, migration 3, stamp rule fixed. 101 checks green. |
| 2026-10-26 | Email (OTP) path, `isAuthenticated`, sliding session with absolute cap, logout, `visit`/polling with the session user and ownership in SQL. |
| 2026-10-24 | Migration 2 (`auth_identities`, `otp_challenges`, `sessions`, `auth_events`; email on `users`, phone removed), auth decisions. |
| 2026-10-27/28 | `typecheck:all` script (scripts included), removal of unused dependencies, enums derived from the `pgEnum`s, `CardsService` separated from the Wallet, `create-venue`. |
