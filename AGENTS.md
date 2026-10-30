# Stampy

Digital loyalty (stamp) cards in Google Wallet for local food & beverage venues.
Customers need no app: tap NFC tag / scan QR → email-code login → card in Wallet →
staff confirms each stamp request in a web app.

Backend: Node.js + Express 5 + TypeScript (strict), Drizzle ORM, PostgreSQL 16.
Frontend (Vue) not started. Solo developer, near-zero budget, no pilot customer yet.

## Language

- **Speak English** with the user: all replies, summaries, questions and commit/PR text.
- All documentation (`docs/`, `README.md`, skills) is in **English**. Keep terminology
  consistent with the existing docs (e.g. *venue*, *stamp request*, *segment*, *reward*,
  *challenge*, *lazy expiry*, *absolute cap*); do not introduce synonyms.
- Backlog statuses are `DECIDED`, `TODO`, `TO-DECIDE`, `TO-VERIFY`, `BLOCKED`.
- User-facing API strings and code identifiers currently in Italian (e.g. `"Riprova più
  tardi"`, `"Codice non valido o scaduto"`) are code literals: leave them as they are
  unless the owner asks to change them, and quote them verbatim in docs.
- `docs/archive/` is frozen history, kept in its original Italian; do not translate it.

## Read these first (in `docs/` at the repo root)

| File | What it is | When to touch it |
|---|---|---|
| `docs/CONTEXT.md` | Product/architecture/security **decisions** (static) | Only when a decision changes |
| `docs/CODEBASE.md` | How the code is **right now** (living) | In the SAME change that alters code, endpoints, schema or tests |
| `docs/BACKLOG.md` | Everything not yet implemented | Move items to §8 with a date when done |

Decisions in `CONTEXT.md` are **closed**: do not reopen or re-litigate them. If the code
contradicts `CODEBASE.md`, the code wins and the doc must be fixed.
Before any task, check `CODEBASE.md` §8 ("Where to start") for the relevant files.

## Commands

```bash
npm run dev             # nodemon; .env is read only at startup
npm run typecheck:all   # tsc over src + scripts — must be clean before finishing
npx tsx scripts/stamps-split.ts                     # pure test, no server/DB
npx tsx --env-file=.env scripts/<test>.ts           # e2e tests: need `npm run dev` + dev DB
```

Test scripts print ✔/✘ per check (no framework). Full list and prerequisites: `CODEBASE.md` §7.
After changing behavior, run the relevant scripts and report the check counts.

Migrations: `drizzle-kit generate` then `migrate` (exact commands in `CODEBASE.md` §6).
**Always read the generated SQL before applying. Never `push` or `introspect`** — it would
drop hand-written constraints (e.g. `promotions_no_overlap`, a `btree_gist` EXCLUDE).

## Non-negotiable rules

Security / auth
- Protected route middleware order: `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- Authenticated user lives in `req.auth` via `requireAuth(req)`. **Never `req.user`.**
- Roles are read from `venue_members` on every request. Never in session, `req.auth`, or body.
  The `venueId` in the path is a selector, not proof of authorization.
- Ownership is checked in SQL. Someone else's resource returns the **same 404** as a missing one.
- Never trust the client for authorization, quantities, or stamp splits.
- Never put personal data (emails, codes, IPs) in logs or `auth_events.metadata`.
- Never `res.json(row)` — always map the response. Session token never appears in a body.
- Cookies only via `sessionCookieOptions()`.

Data / correctness
- Time: always DB `now()` in queries, **never `new Date()`** for expiry.
- Every state UPDATE carries the state filter in `WHERE` (`status='pending'`, `revoked_at IS NULL`, …).
- Always pass `venueId` together with resource ids (composite FKs enforce tenant isolation).
- Stamp rule lives **only** in `utils/stamps.ts` (`splitStamps`). Never recompute it elsewhere.
  Full card (`stamps_count = stampsRequired`) = reward available, not a bug.
- `stamp_events.request_id` is NOT unique (one request → several events); uniqueness is on `idempotency_key`.
- Users are anonymized, never deleted. All FKs are `RESTRICT`.
- Domain types only from `db/types.ts`; enums only from the `pgEnum` definitions.

Errors
- Every `GenericError` carries an explicit status. Recurring error = class + handler registered
  **before** `genericErrorHandler`. Unknown errors → generic JSON 500, details only in logs.

## Do not

- Add password login, unverified-email login, a "wallet provider" abstraction (until Apple exists),
  Web NFC API, a generic promotion rule engine, or Apple Wallet before Google is validated.
- Build features marked `TO-DECIDE` in `BACKLOG.md` (e.g. promotion rollover B2) — they need a product decision first.
- Invent behavior of external APIs (Google Wallet REST, Gmail, Google Sign-In). Items in
  `BACKLOG.md` §5 must be verified against official docs; say so instead of guessing.
- Commit secrets, service-account keys, `.env`, tokens, or Wallet `saveUrl`s.

## Working style

- Small, focused changes. No speculative abstractions; this is an MVP.
- Follow the `api/` folder convention: `<domain>.router.ts / .controller.ts / .service.ts / .dto.ts`,
  helpers in a subfolder named after their concern, middlewares in `utils/middlewares/`.
- New logic with regression risk → add or extend a test script in `scripts/` (same ✔/✘ style).
- If a request conflicts with a decision in `CONTEXT.md`, or looks premature/insecure/over-engineered,
  say so with the reason and an alternative before implementing. The owner has the final say.
- Distinguish facts, assumptions, and things to validate. Ask only when truly blocked; otherwise
  state your assumption and proceed.
- Finish by: `npm run typecheck:all` clean, relevant tests run, `CODEBASE.md` updated,
  `BACKLOG.md` updated if an item was completed or a new gap was found.