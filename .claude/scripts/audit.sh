#!/usr/bin/env bash
# Mostra chi ha cambiato lo stato (e quindi chiuso) le issue, e quando.
# Unisce due fonti: il log locale degli script (chi = agente/proprietario) e la timeline di GitHub
# (orario ufficiale; l'attore è sempre il tuo account, anche per le automazioni del progetto).
# Uso: .claude/scripts/audit.sh [numero-issue]     (senza numero: gli ultimi 20 eventi del log)
set -euo pipefail
source "$(dirname "$0")/lib-worktree.sh"

LOG="$WT_ROOT/audit.log"
echo "== Log degli script ($LOG)"
if [ -f "$LOG" ]; then
  if [ -n "${1:-}" ]; then grep -P "\t#$1\t" "$LOG" || echo "  (nessuna riga per #$1)"; else tail -n 20 "$LOG"; fi
else
  echo "  (ancora vuoto)"
fi

if [ -n "${1:-}" ]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo gianlucarigoni/stampy)"
  echo; echo "== Timeline GitHub di #$1"
  gh api "repos/$REPO/issues/$1/timeline" --paginate \
    --jq '.[] | select(.event=="project_v2_item_status_changed" or .event=="closed" or .event=="reopened") | [.created_at, .event, (.actor.login // "-")] | @tsv'
  echo
  echo "Nota: uno 'closed' nello stesso secondo di uno 'status_changed' a Done è l'automazione"
  echo "'Auto-close issue' del progetto. Chi ha impostato Done lo dice la riga del log sopra."
fi
