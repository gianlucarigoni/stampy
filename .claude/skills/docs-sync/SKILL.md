---
name: docs-sync
description: Folds the per-task reports written by parallel agents (docs/reports/*.md) into the real documents (CODEBASE.md, BACKLOG.md, CONTEXT.md proposals), realigns the test baseline, deletes the reports and cleans orphan worktrees. Run it ONLY when the owner asks (/docs-sync, "aggiorna i docs", "integra i report"), in the main checkout, never from an agent's worktree.
---

# docs-sync

Agents in parallel worktrees do not edit `docs/` (a hook blocks it): each writes
`docs/reports/<id>-<slug>.md` (template: `.claude/scripts/report-template.md`). This skill, run by the
owner in the main checkout, turns those reports into the real documentation. Documents and
commit messages are in **Italian**, with the terminology of the existing docs (see `AGENTS.md`).

## Procedure

1. **Start clean.** In the main checkout: `git checkout main && git pull --ff-only`. Create a branch
   `docs/sync-reports-<YYYY-MM-DD>` (never work on `main`). Move to `In Progress` only if there is an issue.
2. **List reports.** `ls docs/reports/*.md`. Skip anything starting with `_`. If there are none, say so and stop.
3. **Read each report fully** and, for each, check the claims against the code (`git log`,
   the files it lists). If the code contradicts the report, the code wins: note it.
4. **Apply** to the documents, one report at a time:
   - `docs/CODEBASE.md`: the "Modifiche proposte" text, in the right section (§8 "Da dove iniziare" too if files moved).
   - `docs/BACKLOG.md`: move finished items to §8 with the date; add new gaps; keep the statuses
     `DECIDED`, `TODO`, `TO-DECIDE`, `TO-VERIFY`, `BLOCKED`.
   - `docs/CONTEXT.md` is for decisions that **changed**. Never edit it on your own: if a report
     proposes a change, show the exact text to the owner and ask.
   - Do not touch `docs/archive/`.
5. **Test baseline.** Run `.claude/skills/verify/scripts/verify.sh`. Set `BASELINE` in `verify.sh`
   to the real total, and update the number in `docs/CODEBASE.md` §7 and in the `description` of
   `.claude/skills/verify/SKILL.md`. If the run is red, stop and report: do not align on a red suite.
6. **Delete the reports** that were fully integrated: `git rm docs/reports/<file>`. If something in
   a report could not be integrated (needs a decision), leave that file and say why.
7. **Orphans.** Run `.claude/scripts/worktree-clean.sh` (dry run), show the output to the owner and
   run it with `--yes` only if they agree.
8. **Close.** Commit (Italian message, with the required attribution), push the branch, merge into
   `main` with `--no-ff`, push `main`. Stop and ask on any conflict. The branch is not deleted.

## Report back

In Italian: which reports were integrated and deleted, which were left (and why), the new test
baseline, decisions that need the owner (CONTEXT.md proposals), and what `worktree-clean.sh` found.
