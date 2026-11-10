#!/usr/bin/env bash
# Elenca (e con --yes elimina) worktree e database rimasti orfani. Lo lancia il proprietario.
# Orfano =
#   - slot il cui worktree non esiste più                      → elimina DB e slot
#   - slot il cui branch è già stato unito in main             → elimina worktree, DB e slot
#   - database stampy_wt_* senza slot                          → elimina DB
# Non tocca mai i branch né i worktree con lavoro non ancora unito.
# Uso: .claude/scripts/worktree-clean.sh [--yes]
set -euo pipefail
source "$(dirname "$0")/lib-worktree.sh"

APPLY=0; [ "${1:-}" = "--yes" ] && APPLY=1
require_docker
mkdir -p "$SLOTS_DIR"
git -C "$MAIN_ROOT" worktree prune

act() { echo "  - $1"; [ "$APPLY" = 1 ] && eval "$2"; return 0; }
FOUND=0

for f in "$SLOTS_DIR"/*; do
  [ -e "$f" ] || continue
  ID="$(basename "$f")"; DB="$(slot_field "$ID" 2)"; BRANCH="$(slot_field "$ID" 3)"
  if [ ! -d "$WT_ROOT/$ID" ]; then
    FOUND=1; act "$ID: worktree mancante → DB $DB e slot" \
      "db_psql -c 'DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)'; rm -f '$f'"
  elif git -C "$MAIN_ROOT" merge-base --is-ancestor "$BRANCH" main 2>/dev/null \
       && [ -z "$(git -C "$WT_ROOT/$ID" status --porcelain)" ]; then
    FOUND=1; act "$ID: $BRANCH già in main → worktree, DB $DB e slot" \
      "git -C '$MAIN_ROOT' worktree remove --force '$WT_ROOT/$ID'; db_psql -c 'DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)'; rm -f '$f'"
  else
    echo "  · $ID: in corso ($BRANCH), lo lascio"
  fi
done

while read -r DB; do
  [ -n "$DB" ] || continue
  grep -qsw "$DB" "$SLOTS_DIR"/* 2>/dev/null && continue
  FOUND=1; act "database $DB senza slot → elimina" "db_psql -c 'DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)'"
done < <(db_psql -At -c "SELECT datname FROM pg_database WHERE datname LIKE 'stampy\_wt\_%'")

[ "$FOUND" = 1 ] || echo "Niente da pulire."
[ "$FOUND" = 1 ] && [ "$APPLY" = 0 ] && echo "Per eseguire davvero: $0 --yes"
exit 0
