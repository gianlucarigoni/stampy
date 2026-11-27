---
name: task-finish
description: Procedure for closing a Stampy task that ran in a worktree - run /verify, stop leftover dev processes, complete the report, run worktree-finish.sh, interpret its exit codes and handle a failed cleanup after the merge. Use it when the work is done and green, right before merging into main; also for tasks with no code changes (report only).
---

# Finishing a task

Only when everything is green. **Red = no merge**: re-run to understand, report the output, leave the issue
`In Progress`. Never reduce or edit an approved test to get green.

## 1. Verify

Run `/verify` (typecheck + suite) in your worktree. It also fails if the total is **lower** than `BASELINE`:
tests are never removed silently. Complete the report (`docs/agents/report.md`) with the totals "before → after".
Tasks with no code changes (obsolete item, analysis only) are closed the same way: the report is the content
to merge, and the verification still runs. Never merge by hand.

## 2. Stop every process left in the worktree

A running `npm run dev`, vite or nodemon keeps the folder open: cleanup then fails with «Directory not empty»
*after* the merge and push.

```bash
lsof -ti:<backend port>,<frontend port>     # ports from your .env / stampy-frontend/.env.local
lsof -ti:<port> | xargs kill                # only your ports, only servers you started
```

Never `pkill -f` with a broad pattern (it can kill the tool's own shell, exit 144). If the owner started the
server, ask them to stop it; do not do it unannounced.

## 3. Finish

```bash
.claude/scripts/worktree-finish.sh <id> -m "messaggio in italiano"
```

The commit message is in Italian and ends with the attribution line requested in the session. The script commits,
merges into `main` (fast-forward only), re-runs the verification on the updated base, pushes, and sets the issue
to `Done` (the project then closes it by itself: intended). **Only this script sets `Done`.** The branch stays;
the owner deletes it.

| Exit | Meaning | What you do |
|---|---|---|
| 0 | merged and cleaned | report (step 4) |
| 3 | merge conflicts; `main` untouched, worktree/database/issue unchanged | **stop**, tell the owner |
| 4 | verification red on the updated base | **stop**, report the output |
| 5 | suspicious diff (`.env`, `secrets`, keys, or an added line containing the word for the Wallet save link) | **stop**; remove the cause. In texts write «link di salvataggio»; if the word is a real code identifier, ask the owner |

## If cleanup fails after a successful merge

`main` is already published, but folder, slot and database remain and the issue is not `Done`. **Stop and report
the exact state.** Do not delete the folder by hand, do not re-run the script repeatedly, do not set `Done`.
The owner finishes the cleanup.

## 4. Final message

Report: branch, test totals (before → after), merge outcome, path of the report
(`docs/reports/<id>-<slug>.md`), and the audit line for the issue (`../stampy-wt/audit.log`, last entry).
