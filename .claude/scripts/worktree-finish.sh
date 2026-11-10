#!/usr/bin/env bash
# Chiude una task: commit, aggiorna il branch con main, verifica, merge in main solo se
# non ci sono conflitti, poi elimina worktree e database (il branch resta).
# Uso: .claude/scripts/worktree-finish.sh <id> -m "messaggio di commit (con l'attribuzione)"
# Codici di uscita: 0 ok · 2 uso errato · 3 conflitti (nulla cambiato) · 4 verifica rossa · 5 diff sospetto
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"  # assoluto: il worktree (e la sua copia degli script) viene eliminato prima di project-status.sh
source "$SCRIPT_DIR/lib-worktree.sh"

ID="$(tr 'A-Z' 'a-z' <<<"${1:?id della task}")"; shift
MSG=""
while getopts "m:" o; do case $o in m) MSG="$OPTARG";; *) exit 2;; esac; done

[ -f "$(slot_file "$ID")" ] || die "nessuno slot per '$ID': la task è stata avviata con worktree-start.sh?"
WT_DIR="$WT_ROOT/$ID"
[ -d "$WT_DIR" ] || die "manca $WT_DIR"
DB="$(slot_field "$ID" 2)"; BRANCH="$(slot_field "$ID" 3)"; ISSUE="$(slot_field "$ID" 4)"
[ "$(git -C "$WT_DIR" rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || die "il worktree non è sul branch $BRANCH"
require_docker

# 1. Commit di quello che c'è, dopo un controllo anti-segreti sul diff.
if [ -n "$(git -C "$WT_DIR" status --porcelain)" ]; then
  [ -n "$MSG" ] || die "ci sono modifiche non committate: serve -m \"messaggio\""
  git -C "$WT_DIR" add -A
  BAD="$(git -C "$WT_DIR" diff --cached --name-only | grep -E '(^|/)(\.env[^/]*|secrets|secrets/.*|.*\.pem|.*-credentials\.json|service-account\.json)$' || true)"
  SECRET="$(git -C "$WT_DIR" diff --cached -U0 | grep -E '^\+.*(saveUrl|BEGIN [A-Z ]*PRIVATE KEY|private_key)' || true)"
  if [ -n "$BAD$SECRET" ]; then
    git -C "$WT_DIR" reset -q
    echo "✘ il diff contiene file o contenuti sospetti (segreti/.env/saveUrl): niente commit" >&2
    [ -n "$BAD" ] && echo "$BAD" >&2
    exit 5
  fi
  git -C "$WT_DIR" commit -q -m "$MSG"
fi

# 2. Un solo agente alla volta da qui in poi.
mkdir -p "$SLOTS_DIR"; exec 9>"$LOCK_FILE"
echo "▶ attendo il turno per il merge…"; flock -w 900 9 || die "lock di merge occupato da troppo tempo"

# 3. main aggiornato, poi main dentro il branch: la verifica gira sulla base reale.
[ "$(git -C "$MAIN_ROOT" rev-parse --abbrev-ref HEAD)" = "main" ] || die "la cartella principale non è su main"
[ -z "$(git -C "$MAIN_ROOT" status --porcelain --untracked-files=no)" ] || die "la cartella principale ha modifiche non committate"
git -C "$MAIN_ROOT" pull --ff-only -q || die "git pull non è un fast-forward: fermati e chiedi al proprietario"

conflict() {
  echo "✘ CONFLITTI in $1. main non è cambiato; worktree, database e issue restano come sono (l'eventuale commit resta sul branch)." >&2
  echo "  File in conflitto:" >&2; echo "$2" | sed 's/^/   - /' >&2
  exit 3
}
if ! git -C "$WT_DIR" merge -q --no-edit main >/dev/null 2>&1; then
  FILES="$(git -C "$WT_DIR" diff --name-only --diff-filter=U)"
  git -C "$WT_DIR" merge --abort
  conflict "main → $BRANCH" "$FILES"
fi

# 4. Verifica nel worktree (porte e DB suoi).
echo "▶ verifica"
"$WT_DIR/.claude/skills/verify/scripts/verify.sh" || { echo "✘ verifica ROSSA: nessun merge" >&2; exit 4; }

# 5. Push del branch e merge --no-ff dalla cartella principale.
git -C "$WT_DIR" push -q -u origin "$BRANCH"
if ! git -C "$MAIN_ROOT" merge -q --no-ff -m "Merge $BRANCH" "$BRANCH" >/dev/null 2>&1; then
  FILES="$(git -C "$MAIN_ROOT" diff --name-only --diff-filter=U)"
  git -C "$MAIN_ROOT" merge --abort
  conflict "$BRANCH → main" "$FILES"
fi
git -C "$MAIN_ROOT" push -q origin main

# 6. Pulizia: worktree e database. Il branch resta (lo cancella il proprietario).
git -C "$MAIN_ROOT" worktree remove --force "$WT_DIR"
db_psql -c "DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)"
rm -f "$(slot_file "$ID")"
echo "✔ $BRANCH unito in main e pubblicato. Worktree e database $DB eliminati; il branch resta."

# Done si imposta SOLO qui, a merge riuscito. Il workflow "Auto-close issue" del progetto chiude poi
# la issue; chi e quando finisce in audit.log (vedi .claude/scripts/audit.sh).
if [ -n "$ISSUE" ] && [ "$ISSUE" != "-" ]; then
  cd "$MAIN_ROOT"  # la cwd era il worktree, ormai eliminato
  STAMPY_AGENT="$ID" "$MAIN_ROOT/.claude/scripts/project-status.sh" "$ISSUE" Done \
    || echo "⚠ merge fatto ma la issue #$ISSUE non è passata a Done: dillo al proprietario"
else
  echo "  Nessuna issue associata: nessun cambio di stato."
fi
