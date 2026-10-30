---
name: verify
description: Runs the full verification of stampy-backend (typecheck + all end-to-end scripts, expected 104 ✔ checks) and reports what failed. Use it after EVERY change to backend code, refactor, migration or new endpoint, before saying a job is finished, and whenever the user asks "run the tests", "verify", "check it works", "is everything green?", even if they do not name the scripts.
---

# Verify stampy-backend

The project has no test runner: tests are `tsx` scripts in `stampy-backend/scripts/` that
print a `✔`/`✘` line per check and call the real server. `verify.sh` runs them all in
sequence and counts the ticks.

## Procedure

1. Run:
   ```bash
   .claude/skills/verify/scripts/verify.sh
   ```
   (from the repo root; `--skip-typecheck` if you just ran it).
2. Exit 2 with "server non raggiungibile" (unreachable server; the message is an Italian
   literal in `verify.sh`): the `npm run dev` server is not running. Start it in the
   background from `stampy-backend/` (`npm run dev`, run_in_background), wait for
   `/api/health` to answer, then rerun. If you started it, stop it at the end.
   Nodemon only watches `src/`: after changes to `src/` wait for the restart before rerunning.
3. Read the summary. Success = exit 0 **and** `✔ 104`.

## Interpreting failures

- A `✘` is a real failure: investigate the code, do not adapt the script's assertion to
  make it pass, unless the behavior changed on purpose (and then say so).
- Total ≠ 104 with no `✘`: someone added/removed checks. If intended, update `EXPECTED` in
  `verify.sh` and the number in `AGENTS.md`; otherwise a script exited early.
- DB connection errors: check `DATABASE_URL` in `stampy-backend/.env` and that the Postgres
  container (`stampy-db`) is running.
- The scripts clean up their own test data; they do not run with `NODE_ENV=production`.

## Report

Report to the user: typecheck ok/ko, a table per script (✔/✘), total vs 104, and for each
`✘` the error line. If something failed, say so clearly, without softening it.

Do not use `npm run script:all`: it also runs `create-owner`/`create-venue` (they are not
tests) and does not pass `--env-file=.env`.
