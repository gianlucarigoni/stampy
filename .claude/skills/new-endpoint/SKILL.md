---
name: new-endpoint
description: Procedure for adding or changing an HTTP endpoint in stampy-backend (router, controller, service, class-validator DTO, middleware, error class, documentation). Use it whenever the user asks for a new route/API, a new handler, to expose an operation, to add a parameter or body to an existing route, or a new HTTP error — even if they only say "let staff be able to..." or "we need a call to...".
---

# New endpoint in stampy-backend

The rules live in `AGENTS.md`; here is the order in which to apply them. Reference models
to copy: `src/api/venues/venues.router.ts` + `staff/` (with roles) and `src/api/requests/` (simple).

## 1. Where it goes

- One domain = one folder `src/api/<domain>/`. Helper files in a subfolder
  (`venues/staff/staff.controller.ts`). New domain → mount it in `src/api/routes.ts`.
- No imports between routers of different domains. A service may import a service from
  another domain only as an explicit dependency.

## 2. DTO (`<name>.dto.ts`)

DTOs are **class-validator classes** (not zod: zod is for `config/env.ts` and `utils/schemas/`).
`validate` uses `whitelist` + `forbidNonWhitelisted`, so every accepted field must have a
decorator.

```ts
import { IsUUID } from "class-validator";
export class requestIdDTO {
  @IsUUID()
  requestId: string;
}
```

Never fields the server must decide (stamp quantity, role, prices): the service computes them.

## 3. Router — fixed middleware order

`rate limit -> isAuthenticated -> requireRole(...) -> validate(params) -> validate(body) -> controller`

```ts
router.post(
  "/:venueId/requests/:requestId/confirm",
  isAuthenticated,
  requireRole("owner", "staff"),
  validate(staffRequestParamsDTO, "params"),
  validate(confirmDTO, "body"),
  confirm,
);
```

Rate limit (`ipAuthRateLimit`) only where needed (auth/OTP). `requireRole` reads `venue_members`
on every request: the path's `venueId` selects, it does not authorize.

## 4. Controller

- `req: TypedAuthRequest<Body, Query, Params>`; user via `requireAuth(req).user.id`.
- Everything in `try { ... } catch (err) { next(err); }`.
- **Mapped** response field by field: never `res.json(row)`.
- No domain logic: call the service. No personal data in logs.

## 5. Service

- Drizzle queries; for multiple writes `db.transaction`, passing `Tx`/`DbOrTx` from `db/tx.ts`.
- Time: DB `now()`/`sql\`now()\``, never `new Date()` for expiry.
- Every state UPDATE filters the state in the WHERE (e.g. `status = 'pending'`) and checks
  how many rows it touched: that is how double confirmations are avoided.
- Types only from `db/types.ts`. Stamps: only through `utils/stamps.ts`.
- Google Wallet code only in `api/wallet/`.
- If you touch the schema → use the `db-migration` skill.

## 6. Errors

Recurring error → new file `src/errors/<name>.error.ts` with class + handler (copy
`request-not-found.error.ts`), then add the handler in `src/errors/index.ts` **before**
`genericErrorHandler`. Isolated case → `new GenericError(msg, status)` with the status
always explicit.

## 7. Wrap up

1. Tests: add checks to the domain's script in `scripts/` (same `✔`/`✘` format) or create
   `scripts/<name>.ts` copying the structure of an existing one, with data cleanup.
2. Run the `verify` skill. If the count changes, update the expected total.
3. Update `docs/CODEBASE.md` (endpoints table). If it closes an item in `docs/BACKLOG.md`,
   move it to "Recently closed". No new files in `docs/`.
