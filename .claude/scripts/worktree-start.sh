#!/usr/bin/env bash
# Crea l'ambiente isolato di una task: worktree + branch + porte + database.
# Uso: .claude/scripts/worktree-start.sh <id> <slug> [feat|fix|docs|chore] [numero-issue]
#   es.: worktree-start.sh b3 cors-origin feat 12
# Si lancia dalla cartella principale del repo o da un worktree: non importa.
set -euo pipefail
source "$(dirname "$0")/lib-worktree.sh"

ID="$(tr 'A-Z' 'a-z' <<<"${1:?id della task (es. b3)}")"
SLUG="${2:?slug (es. cors-origin)}"
KIND="${3:-feat}"
ISSUE="${4:-}"
[[ "$ID" =~ ^[a-z0-9-]+$ ]] || die "id non valido: usa solo lettere, numeri e trattini"
[[ "$SLUG" =~ ^[a-z0-9-]+$ ]] || die "slug non valido: usa solo lettere minuscole, numeri e trattini"
[[ "$KIND" =~ ^(feat|fix|docs|chore)$ ]] || die "tipo non valido: feat|fix|docs|chore"

BRANCH="$KIND/$ID-$SLUG"
WT_DIR="$WT_ROOT/$ID"
DB="$(db_name_for "$ID")"

[ -e "$WT_DIR" ] && die "esiste già $WT_DIR (task già avviata?)"
git -C "$MAIN_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH" && die "il branch $BRANCH esiste già"
[ -f "$MAIN_ROOT/stampy-backend/.env" ] || die "manca stampy-backend/.env nella cartella principale"
require_docker

mkdir -p "$SLOTS_DIR"
exec 9>"$LOCK_FILE"
flock -w 120 9 || die "un altro avvio è in corso da troppo tempo"

# main aggiornato (solo fast-forward).
CUR="$(git -C "$MAIN_ROOT" rev-parse --abbrev-ref HEAD)"
[ "$CUR" = "main" ] || die "la cartella principale è su '$CUR', non su main: riportala su main"
git -C "$MAIN_ROOT" pull --ff-only -q || die "git pull non è un fast-forward: fermati e chiedi al proprietario"

# Slot libero: nessun file di slot e porte libere.
SLOT=""
for n in $(seq 1 "$MAX_SLOTS"); do
  if ! grep -qs "^$n " "$SLOTS_DIR"/* 2>/dev/null \
     && port_free $((API_BASE_PORT + n)) && port_free $((WEB_BASE_PORT + n)); then SLOT=$n; break; fi
done
[ -n "$SLOT" ] || die "nessuno slot libero (max $MAX_SLOTS worktree)"
API_PORT=$((API_BASE_PORT + SLOT)); WEB_PORT=$((WEB_BASE_PORT + SLOT))

echo "▶ worktree $WT_DIR ($BRANCH), slot $SLOT: api $API_PORT, web $WEB_PORT, db $DB"
echo "$SLOT $DB $BRANCH ${ISSUE:--}" > "$(slot_file "$ID")"
cleanup_on_error() { echo "✘ avvio fallito: pulisco" >&2
  db_psql -c "DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE)" 2>/dev/null || true
  git -C "$MAIN_ROOT" worktree remove --force "$WT_DIR" 2>/dev/null || true
  git -C "$MAIN_ROOT" branch -D "$BRANCH" 2>/dev/null || true
  rm -f "$(slot_file "$ID")"; }
trap cleanup_on_error ERR

git -C "$MAIN_ROOT" worktree add -q -b "$BRANCH" "$WT_DIR" main

# .env del backend: copia dell'originale con porta, origin e database del worktree.
# Mai stampare questo file: contiene segreti.
python3 -I - "$MAIN_ROOT/stampy-backend/.env" "$WT_DIR/stampy-backend/.env" "$API_PORT" "http://localhost:$WEB_PORT" "$DB" <<'PY'
import re, sys
src, dst, port, origin, db = sys.argv[1:6]
lines = open(src).read().splitlines()
base = next((l.split("=", 1)[1] for l in lines if l.startswith("DATABASE_URL=")), None)
if not base:
    sys.exit("DATABASE_URL mancante in stampy-backend/.env")
# Cambia solo il nome del database (ultimo segmento del path), tenendo credenziali e query.
url = re.sub(r"/[^/?]+(\?.*)?$", lambda m: "/" + db + (m.group(1) or ""), base)
over = {"PORT": port, "APP_ORIGIN": origin, "DATABASE_URL": url}
seen, out = set(), []
for line in lines:
    k = line.split("=", 1)[0].strip()
    if k in over: out.append(f"{k}={over[k]}"); seen.add(k)
    else: out.append(line)
out += [f"{k}={v}" for k, v in over.items() if k not in seen]
open(dst, "w").write("\n".join(out) + "\n")
PY
chmod 600 "$WT_DIR/stampy-backend/.env"
# Il frontend legge le porte da qui (vite.config.ts); .env.local è già ignorato da git.
printf 'API_PORT=%s\nWEB_PORT=%s\n' "$API_PORT" "$WEB_PORT" > "$WT_DIR/stampy-frontend/.env.local"
# Le credenziali restano in un solo posto: link alla cartella segreti originale.
if [ -d "$MAIN_ROOT/stampy-backend/secrets" ]; then
  ln -s "$MAIN_ROOT/stampy-backend/secrets" "$WT_DIR/stampy-backend/secrets"
  # `secrets/` nel .gitignore non copre un link: lo escludo a mano, così non finisce in un commit.
  echo "stampy-backend/secrets" >> "$(git -C "$WT_DIR" rev-parse --git-path info/exclude)"
fi

# Database del worktree + migrazioni da zero.
db_psql -c "CREATE DATABASE \"$DB\""
( cd "$WT_DIR" && npm ci --silent --no-audit --no-fund \
  && npm --prefix stampy-backend ci --silent --no-audit --no-fund \
  && npm --prefix stampy-frontend ci --silent --no-audit --no-fund )
( cd "$WT_DIR/stampy-backend" \
  && node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts >/dev/null )

# Report della task, pronto da compilare: titolo e issue li riempie lo script.
TITLE="$SLUG"
if [ -n "$ISSUE" ]; then TITLE="$(gh issue view "$ISSUE" --json title -q .title 2>/dev/null || echo "$SLUG")"; fi
REPORT="$(<"$(dirname "$0")/report-template.md")"
REPORT="${REPORT//<id>/$ID}"
REPORT="${REPORT//<titolo della task>/$TITLE}"
REPORT="${REPORT//<branch>/$BRANCH}"
REPORT="${REPORT//<AAAA-MM-GG>/$(date +%F)}"
if [ -n "$ISSUE" ]; then ISSUE_TXT="#$ISSUE"; else ISSUE_TXT="nessuna"; fi
REPORT="${REPORT//'#<numero> (o "nessuna")'/$ISSUE_TXT}"
mkdir -p "$WT_DIR/docs/reports"
printf '%s\n' "$REPORT" > "$WT_DIR/docs/reports/$ID-$SLUG.md"

trap - ERR
if [ -n "$ISSUE" ]; then
  STAMPY_AGENT="$ID" "$(dirname "$0")/project-status.sh" "$ISSUE" "In Progress" || echo "⚠ issue #$ISSUE non spostata: fallo a mano"
fi

cat <<EOF
✔ pronto
  cartella : $WT_DIR
  branch   : $BRANCH
  api/web  : $API_PORT / $WEB_PORT   (npm run dev dalla cartella del worktree)
  database : $DB
  report   : docs/reports/$ID-$SLUG.md
Lavora SOLO in $WT_DIR. Alla fine: .claude/scripts/worktree-finish.sh $ID -m "messaggio"
EOF
