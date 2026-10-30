---
name: decisione
description: Use when the user brings a problem with more than one possible solution, or a design/product/architecture choice to discuss or challenge. Produces problem, options, pros and cons, and a recommendation grounded in the Stampy docs. Do not use for simple questions, bug fixes with one obvious cause, or when the user just asks to write code.
---

# Decisione: structured analysis of a problem or choice

Help the owner decide. Recommend, never impose: the owner has the final say.
Reply in English (the project docs are in English), unless the user asks otherwise.

## Step 0 — State what the analysis is based on

Open with one line saying what you actually read:

- "Based on the code I read: <files>" or
- "Based only on the docs (`CONTEXT.md`, `CODEBASE.md`, `BACKLOG.md`), I have not read the code."

Never present a doc claim as verified code. Label statements as
**VERIFIED** (read in code or tool output), **REPORTED** (stated in a doc),
**ASSUMPTION**, or **TO VALIDATE**.

## Step 1 — Check whether it is already decided

Read the relevant parts of `CONTEXT.md` (especially §7 "What not to do") and the
matching item in `BACKLOG.md` (status `DECIDED`, `TO-DECIDE`, `TO-VERIFY`...).

- If a closed decision in `CONTEXT.md` already answers it: say so, cite the section,
  and stop. Do not reopen it. If the user explicitly wants to challenge it, state what
  new information would justify reopening it.
- If the item is `TO-DECIDE` or open, continue.
- If the request contradicts a decision or a "do not" rule, say so first, with the reason.

## Step 2 — The real problem

2-5 lines: what actually needs solving and why now. Separate facts, assumptions and
risks. If the stated problem hides a different one, name it.

## Step 3 — Options

Give 2 to 4 concrete options, tied to this project (Node/Express 5/TypeScript,
Drizzle/PostgreSQL, Google Wallet first, multi-tenant schema, one developer).
Always include **"do nothing / postpone"** when it is realistic for an MVP with no
pilot customer. Never invent APIs, SDK behavior or service limits: if an option
depends on an external service, mark it TO VALIDATE and point to the official docs.

## Step 4 — Pros and cons

One Markdown table, same criteria for every option:

| Option | Dev effort | Cost | Security/privacy | Maintenance | Staff/customer UX | Reversibility |
| ------ | ---------- | ---- | ---------------- | ----------- | ----------------- | ------------- |

Add a short pros/cons list under the table only where the table cannot say it
(e.g. lock-in, impact on an invariant, GDPR). Drop criteria that do not apply.

## Step 5 — Recommendation

Pick **one** option and justify it with the project's constraints: near-zero budget,
solo developer, no pilot customer, closed decisions, existing invariants
(`CODEBASE.md` §4 and §6). State the stage it fits: **prototype**, **MVP / first
customers**, or **scale**. List what would make you change your mind.

## Step 6 — Premature decisions

If a missing piece of information makes any choice a guess (e.g. needs feedback from
2-3 real venue owners, a Google doc check, a field test), do not pick. Say the decision
is premature, name exactly what is missing and how to get it, and what can proceed
meanwhile.

## Step 7 — Close the loop

Propose where the outcome should be recorded, but **do not edit anything** without the
owner's approval:

- open item or new gap → `BACKLOG.md`;
- confirmed decision → `CONTEXT.md` (only after the owner confirms);
- change in how code works → `CODEBASE.md`, in the same change that alters the code.

## Rules

- Be direct. If the idea is wrong, premature, insecure, too costly or over-engineered,
  say it clearly, explain why and give an alternative. Do not agree by default.
- No enterprise complexity for an MVP. No shortcuts that weaken security, privacy,
  reliability or future maintenance.
- Do not write code unless asked. Short snippets as examples are fine.
- Keep it short: skip sections that add nothing, but never skip Step 0, Step 1 and the
  recommendation.
- If the question is small (one obvious answer), answer it directly and do not run the
  full structure.
