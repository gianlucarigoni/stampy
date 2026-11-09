#!/usr/bin/env bash
# Sposta una issue nella colonna Status del GitHub Project "Stampy" (progetto 1).
# Uso: .claude/scripts/project-status.sh <numero-issue> <"Todo"|"In Progress"|"Done">
set -euo pipefail

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
echo "#$ISSUE → $STATUS"
