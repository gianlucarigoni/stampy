# 02 · Ambiente di cattura

Scritto nella chat 2 (2026-11-25). **`stampy_dev` non è stato toccato** (letto solo da `pg_dump`).

## Ambiente

| Cosa | Valore |
|---|---|
| Worktree | `/home/rigoni_g/Personal/stampy-wt/dr` (branch `chore/dr-design-capture`, creato da `main` con `worktree-start.sh dr design-capture chore`, nessuna issue) |
| Slot | 1 → backend `http://localhost:3001`, frontend `http://localhost:5174` |
| Database | `stampy_wt_dr` (container `stampy-db`, migrazioni applicate da zero, poi dati copiati) |
| OTP | `OTP_PROVIDER=console` passato come variabile d'ambiente: nessuna email vera (il `.env` ha `both`, **non modificato**). Il codice appare nel log del backend |
| Google | `VITE_GOOGLE_CLIENT_ID` non è nei `.env` del frontend: `start-app.sh` lo ricava da `GOOGLE_CLIENT_ID` del backend e lo passa **solo come variabile del processo** (non scritto in nessun file, non riportato qui) |
| Playwright | quello già nelle devDependencies del frontend del worktree (`stampy-frontend/node_modules`) + Chromium già in cache: **nessuna installazione**, nessun `package.json` toccato |
| Cartella degli script | `design-review/scripts/` (nella cartella principale, fuori dal worktree: il worktree è `main` pulito, `design-review/` è non tracciata) |

Il worktree ha anche `docs/reports/dr-design-capture.md` (modello creato dallo script, non compilato, non committato). Il branch non verrà unito: è solo un contenitore per DB e porte. La pulizia (`worktree-clean.sh`) spetta al proprietario.

## Dati inseriti nel DB del worktree (oltre alla copia di `stampy_dev`)

Copia: `pg_dump --data-only` di `stampy_dev` **senza** `sessions`, `otp_challenges` e schema `drizzle` (96 utenti, 3 locali, 9 membri, 46 richieste, 17 card, 3 promozioni). Poi `design-review/scripts/seed-capture.sql`:

| # | Cosa | Dettaglio |
|---|---|---|
| 1 | **Utente senza nome** | `senza.nome@stampy.test`, `display_name` NULL, identità `email` (per `/name`) |
| 2 | **Card piena** | `lorenzo.fontana@stampy.test` da **Da Gennaro** (`fcabed57-…`, soglia 8): `stamps_count` 7 → **8** (codice card `QDY68FCC`). Nessun `stamp_events` coerente è stato creato: il conteggio è solo modificato |
| 3 | **3 richieste in attesa** (`pending`, scadenza **+7 giorni** per non scadere durante le catture) | `lorenzo.fontana` @ Fiordilatte (7/10) · `sofia.conti` @ Rossi (1/10) · `matteo.ricci` @ Rossi (7/10) |

⚠ Le richieste durano 7 giorni *nel DB del worktree*: non rappresentano il tempo reale (in produzione scadono in pochi minuti). «Scade tra N min» nella coda mostrerà quindi giorni/ore: **da non valutare nella critica** (o rifare il seed con `interval '4 minutes'` subito prima di catturare la coda).
Dopo ogni cattura Staff che conferma/rifiuta richieste, rilanciare il seed (cancella le `pending` e le ricrea; l'aggiornamento della card piena è idempotente).

## Rifare tutto da zero

```bash
cd /home/rigoni_g/Personal/stampy            # cartella principale, branch main
docker ps --filter name=stampy-db            # deve essere Up
.claude/scripts/worktree-start.sh dr design-capture chore     # worktree + DB vuoto + porte (3001/5174 se lo slot 1 è libero)

# copia dei dati di stampy_dev nel DB del worktree
source .claude/scripts/lib-worktree.sh
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d stampy_dev --data-only --disable-triggers --no-owner \
  --exclude-schema=drizzle -T sessions -T otp_challenges > /tmp/dev-data.sql
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d stampy_wt_dr -v ON_ERROR_STOP=1 -q -1 < /tmp/dev-data.sql

# stati mancanti (SOLO sul DB del worktree)
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d stampy_wt_dr -v ON_ERROR_STOP=1 -q < design-review/scripts/seed-capture.sql

# avvio (OTP in console, bottone Google attivo), in background, log in /tmp/dr-dev.log
bash design-review/scripts/start-app.sh /home/rigoni_g/Personal/stampy-wt/dr /tmp/dr-dev.log

# cattura
E2E_APP_URL=http://localhost:5174 node design-review/scripts/capture-accesso.mjs

# stop (per porta, mai pkill -f)
lsof -ti:3001,5174 | xargs kill
```

Se lo slot assegnato non è il 1, le porte sono `3000+N` / `5173+N`: leggerle da `stampy-wt/dr/stampy-backend/.env` e `stampy-frontend/.env.local`, e passare `E2E_APP_URL` di conseguenza.

## Metodo di cattura (deciso nella chat 2)

- Playwright (Chromium), **viewport 390×844, `deviceScaleFactor` 2** (PNG 780×1688 per una pagina corta), `hasTouch`, locale `it-IT`.
- Tema: `colorScheme: 'dark' | 'light'` del contesto (equivale a `browser_emulate_media`; l'app segue `prefers-color-scheme`). Un contesto nuovo per tema e per scenario → storage di tab pulito.
- **Full-page** per tutte le schermate dell'Accesso (sono corte: il file ha l'altezza del viewport se la pagina non scrolla). **Solo viewport** per overlay, menu ☰ e `RewardDialog` (sezioni Cliente/Staff): non servono ancora nell'Accesso.
- Gli stati d'errore non producibili in modo naturale (429, 400, errore di rete, codice scaduto, risposta lenta, `/auth/me` irraggiungibile) sono **simulati con `page.route`** sulle chiamate `/api/auth/*`: il frontend non viene modificato e il backend non viene toccato. Gli stati che il backend produce davvero (codice sbagliato, tentativi finiti, 404) sono **reali**.
- Convenzione cartelle: `screens/<sezione>/<ruolo>/…`; per l'Accesso il «ruolo» è **`anonimo`** (nessuno è loggato). I viewport futuri (tablet, desktop) andranno in una sottocartella `tablet/` / `desktop/` accanto ai file; il telefono sta nella cartella base.
