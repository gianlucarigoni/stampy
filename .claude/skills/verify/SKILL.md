---
name: verify
description: Runs the full verification of stampy-backend (typecheck + the Vitest suite, at least the 264 ✔ baseline, no failures) and reports what failed. Use it after EVERY change to backend code, refactor, migration or new endpoint, before saying a job is finished, and whenever the user asks "run the tests", "verify", "check it works", "is everything green?", even if they do not name the tests.
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
3. Read the summary. Success = exit 0, no `✘`, and a total **≥ the baseline** (264, `BASELINE` in `verify.sh`).

## Interpreting failures

- A `✘` is a real failure: investigate the code, do not adapt the test's assertion to make
  it pass, unless the behavior changed on purpose (and then say so: tests are agreed with the
  owner, see `AGENTS.md`).
- Total > baseline: tests were added (normal). Write the delta in the task report; the baseline is
  realigned by `/docs-sync`, not by the agent. Total < baseline: tests were removed or are not
  running; the script fails. If intended, say it in the report and ask the owner.
- The `api/` tests clean up their own data in `afterAll`; they do not run with
  `NODE_ENV=production`.

## Report

Report to the user: typecheck ok/ko, the Vitest total vs the baseline, and for each failure the test
name and the error line. If something failed, say so clearly, without softening it.
