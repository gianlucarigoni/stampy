#!/usr/bin/env bash
# Avvia backend+frontend del worktree di cattura con OTP in console (nessuna email vera).
# Uso: design-review/scripts/start-app.sh <cartella-worktree> <file-log>
# VITE_GOOGLE_CLIENT_ID viene preso dal GOOGLE_CLIENT_ID del backend e passato solo come variabile
# d'ambiente del processo (non scritto in nessun file).
set -euo pipefail
WT="${1:?cartella worktree}"; LOG="${2:?file log}"
cd "$WT"
GID="$(grep '^GOOGLE_CLIENT_ID=' stampy-backend/.env | cut -d= -f2- || true)"
OTP_PROVIDER=console VITE_GOOGLE_CLIENT_ID="$GID" setsid npm run dev > "$LOG" 2>&1 &
echo "avviato (pid $!), log: $LOG"
