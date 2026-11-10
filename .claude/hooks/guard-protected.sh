#!/usr/bin/env bash
# Hook PreToolUse (Edit|Write|NotebookEdit): negli worktree degli agenti blocca la scrittura di
# docs/ (tranne docs/reports/*.md), AGENTS.md, .claude/ e .github/.
# Nella cartella principale (il checkout del proprietario) non fa nulla.
# Override per una singola sessione, deciso dal proprietario quando la task lo richiede:
#   STAMPY_TASK_ALLOW="docs/BACKLOG.md,docs/CODEBASE.md" claude …
# Limite noto: non intercetta la scrittura via Bash (sed -i, redirect); è una rete di sicurezza
# contro gli errori, non una barriera contro un agente che aggira apposta la regola.
set -u
INPUT="$(cat)"

python3 -I - "$INPUT" <<'PY'
import json, os, subprocess, sys

try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)

path = (data.get("tool_input") or {}).get("file_path") or (data.get("tool_input") or {}).get("notebook_path")
if not path:
    sys.exit(0)

def git(*args, cwd):
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True).stdout.strip()

cwd = data.get("cwd") or os.getcwd()
abs_path = os.path.realpath(path if os.path.isabs(path) else os.path.join(cwd, path))
# Il worktree si deduce dalla posizione del FILE, non dalla cartella della sessione: un agente
# avviato dalla cartella principale che scrive nel suo worktree con percorso assoluto è coperto.
probe = os.path.dirname(abs_path)
while probe and not os.path.isdir(probe) and probe != os.path.dirname(probe):
    probe = os.path.dirname(probe)
top = git("rev-parse", "--show-toplevel", cwd=probe)
if not top:
    sys.exit(0)
# Solo nei worktree collegati: lì .git è un file, nel checkout principale è una cartella.
if os.path.isdir(os.path.join(top, ".git")):
    sys.exit(0)
top = os.path.realpath(top)
if not abs_path.startswith(top + os.sep):
    sys.exit(0)
rel = os.path.relpath(abs_path, top).replace(os.sep, "/")

allow = {p.strip() for p in os.environ.get("STAMPY_TASK_ALLOW", "").split(",") if p.strip()}
if rel in allow:
    sys.exit(0)

is_report = rel.startswith("docs/reports/") and rel.endswith(".md") and rel.count("/") == 2
protected = (
    (rel.startswith("docs/") and not is_report)
    or rel == "AGENTS.md"
    or rel.startswith(".claude/")
    or rel.startswith(".github/")
)
if protected:
    sys.stderr.write(
        f"Bloccato: '{rel}' è protetto negli worktree degli agenti.\n"
        "I documenti li aggiorna il proprietario con /docs-sync: scrivi le modifiche proposte nel tuo "
        "report (docs/reports/<id>-<slug>.md). Se la task richiede davvero questo file, dillo al "
        "proprietario: deve avviare la sessione con STAMPY_TASK_ALLOW.\n"
    )
    sys.exit(2)
sys.exit(0)
PY
