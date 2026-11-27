# Il report della task

I file in `docs/` li aggiorna **solo il proprietario**, con la skill `/docs-sync`. L'agente scrive **un solo file**:
`docs/reports/<id-minuscolo>-<slug>.md` (es. `docs/reports/b3-cors-origin.md`), in italiano, nello stesso branch.
`worktree-start.sh` lo crea già dal modello (`.claude/scripts/report-template.md`); l'agente lo compila.

## Le sezioni

1. **Obiettivo** della task e riferimento alla issue.
2. **Decisioni** prese e **motivazioni**, con le alternative scartate.
3. **Assunzioni** fatte e cose **da validare**.
4. **File toccati** e test aggiunti (con quanti: il totale della suite **prima → dopo**).
5. **Modifiche proposte** a `CODEBASE.md` e `BACKLOG.md`: testo pronto da incollare, con le voci da spostare nel §8.
6. **Lacune emerse** e task suggerite.

Il modello contiene anche "Problemi di ambiente" e "Cosa ho capito e cosa no": compilale (o scrivi "Nessuno").

## Il totale dei test

Il totale (`BASELINE` in `.claude/skills/verify/scripts/verify.sh`, `CODEBASE.md` §7) lo riallinea `/docs-sync`,
non l'agente. Tu riporti "prima → dopo": la base attuale la leggi in quello script o nell'output di `/verify`.
Non esiste `.claude/scripts/verify.sh`.

## Dopo il merge

Il report finisce in `main` col merge; `/docs-sync` lo integra nei documenti e lo elimina.
