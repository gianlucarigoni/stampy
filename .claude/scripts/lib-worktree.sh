#!/usr/bin/env bash
# Funzioni condivise dagli script worktree-*.sh. Da includere con `source`, non si esegue.

# Cartella principale del repo (il checkout con `main`), anche se chiamato da un worktree.
MAIN_ROOT="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
# Dove vivono i worktree degli agenti, accanto al repo, e il registro degli slot.
WT_ROOT="$(dirname "$MAIN_ROOT")/stampy-wt"
SLOTS_DIR="$WT_ROOT/.slots"
LOCK_FILE="$WT_ROOT/.lock"

DB_CONTAINER="${STAMPY_DB_CONTAINER:-stampy-db}"
DB_USER="${STAMPY_DB_USER:-stampy}"
MAX_SLOTS=20
API_BASE_PORT=3000
WEB_BASE_PORT=5173

die() { echo "✘ $*" >&2; exit 1; }

# Nome del DB del worktree: stampy_wt_<id con i trattini convertiti in _>.
db_name_for() { echo "stampy_wt_$(tr -c 'a-z0-9\n' '_' <<<"$1")"; }

# psql dentro il container, collegato al DB di manutenzione "postgres".
db_psql() { docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

require_docker() {
  docker exec "$DB_CONTAINER" true >/dev/null 2>&1 \
    || die "il container '$DB_CONTAINER' non risponde: avvia Docker e poi 'docker start $DB_CONTAINER'"
}

# 0 se nessuno ascolta sulla porta (sul lato Linux). Non si usa /dev/tcp: in WSL la connessione
# a una porta chiusa può restare appesa.
port_free() {
  if command -v ss >/dev/null 2>&1; then [ -z "$(ss -ltnH "sport = :$1")" ]
  else ! timeout 1 bash -c "exec 3<>/dev/tcp/127.0.0.1/$1" 2>/dev/null; fi
}

slot_file() { echo "$SLOTS_DIR/$1"; }
# Il file dello slot contiene: <N> <nome-db> <branch>
slot_field() { awk -v f="$2" '{print $f}' "$(slot_file "$1")"; }
