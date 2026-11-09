---
name: verify
description: Runs the full verification of stampy-backend (typecheck + the Vitest suite, expected 215 ✔ tests) and reports what failed. Use it after EVERY change to backend code, refactor, migration or new endpoint, before saying a job is finished, and whenever the user asks "run the tests", "verify", "check it works", "is everything green?", even if they do not name the tests.
---

# Verify stampy-backend

Tests are Vitest files in `stampy-backend/test/` (`unit/` = no DB, `api/` = starts the app
in-process and uses the dev DB, which must be up: container `stampy-db`). No `npm run dev`
is needed. `verify.sh` runs the typecheck and the whole suite.

## Procedure

1. Run:
   ```bash
   .claude/skills/verify/scripts/verify.sh
   ```
   (from the repo root; `--skip-typecheck` if you just ran it).
2. DB connection errors: start the container (`docker start stampy-db`) and check
   `DATABASE_URL` in `stampy-backend/.env`.
3. Read the summary. Success = exit 0 **and** `✔ 215`.

## Interpreting failures

- A `✘` is a real failure: investigate the code, do not adapt the test's assertion to make
  it pass, unless the behavior changed on purpose (and then say so: tests are agreed with the
  owner, see `AGENTS.md`).
- Total ≠ 215 with no `✘`: someone added/removed tests. If intended, update `EXPECTED` in
  `verify.sh`, the number here and in `docs/CODEBASE.md` §7.
- The `api/` tests clean up their own data in `afterAll`; they do not run with
  `NODE_ENV=production`.

## Report

Report to the user: typecheck ok/ko, the Vitest total vs 215, and for each failure the test
name and the error line. If something failed, say so clearly, without softening it.
