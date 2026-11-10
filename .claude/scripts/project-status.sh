#!/usr/bin/env bash
# Sposta una issue nella colonna Status del GitHub Project "Stampy" (progetto 1) e registra chi
# l'ha fatto e quando in un log di audit (../stampy-wt/audit.log, fuori da git).
# Attenzione: il progetto ha il workflow "Auto-close issue": impostare Done CHIUDE la issue.
# GitHub attribuisce tutto al tuo account, quindi il "chi" (agente o proprietario) lo scrive questo log.
# Uso: .claude/scripts/project-status.sh <numero-issue> <"Todo"|"In Progress"|"Done">
# Chi agisce: variabile STAMPY_AGENT (la imposta worktree-finish.sh); altrimenti si deduce dalla cartella.
set -euo pipefail
source "$(dirname "$0")/lib-worktree.sh"

OWNER="gianlucarigoni"
PROJECT=1
ISSUE="${1:?numero issue}"
STATUS="${2:?Todo | In Progress | Done}"

PROJECT_ID=$(gh project view "$PROJECT" --owner "$OWNER" --format json -q .id)
FIELDS=$(gh project field-list "$PROJECT" --owner "$OWNER" --format json)
ITEMS=$(gh project item-list "$PROJECT" --owner "$OWNER" --limit 200 --format json)

read -r FIELD_ID OPTION_ID ITEM_ID < <(python3 -I - "$ISSUE" "$STATUS" "$FIELDS" "$ITEMS" <<'PY'
import json, sys
issue, status, fields, items = int(sys.argv[1]), sys.argv[2], json.loads(sys.argv[3]), json.loads(sys.argv[4])
f = next(x for x in fields["fields"] if x["name"] == "Status")
o = next((x["id"] for x in f["options"] if x["name"] == status), None)
i = next((x["id"] for x in items["items"] if x.get("content", {}).get("number") == issue), None)
if not o: sys.exit("Stato sconosciuto: " + status)
if not i: sys.exit("Issue #%d non trovata nel progetto" % issue)
print(f["id"], o, i)
PY
)

gh project item-edit --id "$ITEM_ID" --project-id "$PROJECT_ID" --field-id "$FIELD_ID" --single-select-option-id "$OPTION_ID" >/dev/null

# Chi: STAMPY_AGENT, oppure il nome del worktree in cui gira lo script, oppure il proprietario.
AGENT="${STAMPY_AGENT:-}"
if [ -z "$AGENT" ]; then
  TOP="$(git rev-parse --show-toplevel)"
  if [ -f "$TOP/.git" ]; then AGENT="agente:$(basename "$TOP")"; else AGENT="cartella-principale"; fi
fi

# Se è Done, l'automazione chiude la issue: aspetto un attimo e registro lo stato reale.
CLOSED="-"
if [ "$STATUS" = "Done" ]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
  for _ in 1 2 3 4 5; do
    CLOSED="$(gh issue view "$ISSUE" --repo "$REPO" --json state,closedAt -q 'if .state=="CLOSED" then "chiusa "+.closedAt else "aperta" end')"
    [ "${CLOSED#aperta}" != "$CLOSED" ] || break
    sleep 2
  done
fi

mkdir -p "$WT_ROOT"
printf '%s\t#%s\t%s\tchi=%s\tgh=%s\t%s\n' \
  "$(date -u +%FT%TZ)" "$ISSUE" "$STATUS" "$AGENT" "$(gh api user -q .login)" "$CLOSED" >> "$WT_ROOT/audit.log"

echo "#$ISSUE → $STATUS${CLOSED:+ ($CLOSED)} [chi: $AGENT]"
