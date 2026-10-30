#!/usr/bin/env bash
# Typecheck + script end-to-end di stampy-backend. Uso: verify.sh [--skip-typecheck]
set -u
cd "$(dirname "$0")/../../../../stampy-backend" || exit 2
BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
EXPECTED=104
fail=0

if [ "${1:-}" != "--skip-typecheck" ]; then
  echo "▶ typecheck"
  npm run -s typecheck && npm run -s typecheck:all || { echo "✘ typecheck FALLITO"; fail=1; }
fi

if ! curl -sf --max-time 3 -o /dev/null "$BASE_URL/api/health"; then
  echo "✘ server non raggiungibile su $BASE_URL: avvia 'npm run dev' in stampy-backend"
  exit 2
fi

ok=0; ko=0
run() {
  local out
  out=$(npx tsx "$@" 2>&1); local rc=$?
  local p k
  # conta i test dal riepilogo "Passati: N   Falliti: M" di ogni script (stessa unità dei doc)
  p=$(grep -oP 'Passati: *\K[0-9]+' <<<"$out" | tail -1); k=$(grep -oP 'Falliti: *\K[0-9]+' <<<"$out" | tail -1)
  p=${p:-0}; k=${k:-1}
  ok=$((ok + p)); ko=$((ko + k))
  printf '%-28s ✔ %3d  ✘ %d  exit %d\n' "${@: -1}" "$p" "$k" "$rc"
  if [ "$k" -gt 0 ] || [ "$rc" -ne 0 ]; then
    fail=1; grep -E '✘|ECCEZIONE|Error' <<<"$out" | head -20 | sed 's/^/    /'
  fi
}

run scripts/stamps-split.ts
run --env-file=.env scripts/staff-requests.ts
run --env-file=.env scripts/poll-request.ts
run --env-file=.env scripts/otp-request.ts
run --env-file=.env scripts/otp-verify.ts
run --env-file=.env scripts/session.ts

echo "TOTALE: ✔ $ok  ✘ $ko  (atteso ✔ $EXPECTED)"
[ "$ok" -ne "$EXPECTED" ] && echo "⚠ numero di controlli diverso dall'atteso: se hai aggiunto/tolto controlli aggiorna EXPECTED qui e AGENTS.md"
exit $fail
