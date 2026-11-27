---
name: task-start
description: Procedure for starting any Stampy task that will modify files - check Docker, create the isolated worktree (own branch, database and ports) with worktree-start.sh, and handle failures. Use it BEFORE the first edit of every task that changes files, never for read-only questions or analysis, and never work on main instead.
---

# Starting a task (worktree)

Every task that modifies files runs in its own worktree, with its own branch, database `stampy_wt_<id>` and ports.
The main folder stays on `main`: it is only for merges and for the owner. Read-only tasks need no worktree
and no status change.

## 1. Pick the id

`<id>` is the backlog id in lowercase (`b3`, `c21`). If the task is a new item, find the first free number
in `docs/BACKLOG.md` **and** with `gh issue list --state all` before naming it; never reuse an existing id.

## 2. Check Docker yourself, before the script

```bash
docker ps --filter name=stampy-db --format '{{.Names}} {{.Status}}'
```

If the container is not listed as `Up`, **stop and tell the user** (they can run `! docker start stampy-db`),
then wait. Do not discover it from the script's error.

## 3. Start

```bash
.claude/scripts/worktree-start.sh <id> <slug> [feat|fix|docs|chore] [issue-number]
# e.g. .claude/scripts/worktree-start.sh b3 cors-origin feat 12
```

Result: worktree in `../stampy-wt/<id>`, branch `<type>/<id>-<slug>`, database `stampy_wt_<id>`, ports and
`DATABASE_URL` written in the worktree's `.env`, report template at `docs/reports/<id>-<slug>.md`, and the
issue moved to `In Progress` if you passed its number. If the task has no issue, omit the number and say so.

## 4. Work only there

- `cd` into the worktree and stay there. Read ports and `DATABASE_URL` from **its** `.env`, never write them in code.
- Tests and `npm run dev` use only your database. Never `stampy_dev`, never another agent's.
- The TDD test proposal is made inside the worktree with the issue already `In Progress`; no production code
  is committed before the owner approves the tests.

## If something fails

Do not patch ports, `.env` or the database by hand, and do not create the worktree manually. Re-run the script once;
if it fails again, or leaves a half-created worktree/database, **stop and report the exact output** to the user.
