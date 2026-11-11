#!/usr/bin/env bash
# Typecheck + Vitest di stampy-backend. Uso: verify.sh [--skip-typecheck]
# Vitest avvia l'app da solo (non serve `npm run dev`) e usa il DB di sviluppo (container stampy-db).
set -u
cd "$(dirname "$0")/../../../../stampy-backend" || exit 2
# Base di partenza della suite (non un totale esatto): con più agenti in parallelo ognuno aggiunge
# test, quindi si controlla che non ce ne siano meno e nessuno fallito. Lo riallinea /docs-sync.
BASELINE=335
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
printf 'vitest ✔ %d  ✘ %d  exit %d  (base ✔ %d)\n' "$passed" "$failed" "$rc" "$BASELINE"

[ "$rc" -ne 0 ] || [ "$failed" -gt 0 ] && fail=1
[ "$passed" -lt "$BASELINE" ] && { echo "✘ meno test della base ($passed < $BASELINE): ne è stato tolto qualcuno? Se è voluto, dillo nel report"; fail=1; }
[ "$passed" -gt "$BASELINE" ] && echo "ℹ $((passed - BASELINE)) test in più della base: scrivilo nel report (la base la riallinea /docs-sync)"
exit $fail
