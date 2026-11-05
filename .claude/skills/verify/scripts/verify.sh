#!/usr/bin/env bash
# Typecheck + Vitest di stampy-backend. Uso: verify.sh [--skip-typecheck]
# Vitest avvia l'app da solo (non serve `npm run dev`) e usa il DB di sviluppo (container stampy-db).
set -u
cd "$(dirname "$0")/../../../../stampy-backend" || exit 2
EXPECTED=189
fail=0

if [ "${1:-}" != "--skip-typecheck" ]; then
  echo "▶ typecheck"
  npm run -s typecheck && npm run -s typecheck:all || { echo "✘ typecheck FALLITO"; fail=1; }
fi

echo "▶ vitest"
out=$(npx vitest run 2>&1); rc=$?
passed=$(grep -oP 'Tests +.*?\K[0-9]+(?= passed)' <<<"$out" | tail -1); passed=${passed:-0}
failed=$(grep -oP 'Tests +\K[0-9]+(?= failed)' <<<"$out" | tail -1); failed=${failed:-0}
grep -E '^ *(FAIL|×|❯)|Error' <<<"$out" | head -30
printf 'vitest ✔ %d  ✘ %d  exit %d  (atteso ✔ %d)\n' "$passed" "$failed" "$rc" "$EXPECTED"

[ "$rc" -ne 0 ] || [ "$failed" -gt 0 ] && fail=1
[ "$passed" -ne "$EXPECTED" ] && echo "⚠ numero di test diverso dall'atteso: se hai aggiunto/tolto test aggiorna EXPECTED qui, in SKILL.md e in docs/CODEBASE.md §7"
exit $fail
