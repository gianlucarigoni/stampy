# Report: f2 — F2 — Pagina del nome visualizzato dopo il login (frontend)

- **Issue:** #56
- **Branch:** feat/f2-display-name-page
- **Data:** 2026-11-12

## Obiettivo

Chiedere il nome visualizzato a chi ha `displayName === null` con una pagina "Come ti chiami?" prima della destinazione, e renderlo modificabile dal Profilo. Usa `PATCH /auth/me` (B5, #58, già in `main`).

## Decisioni e motivazioni

- **Quando compare:** solo se `user.displayName === null`. Le risposte di login non dicono se l'account è appena creato, quindi "solo alla creazione" avrebbe richiesto un flag nel backend. La regola copre anche gli utenti esistenti con nome `NULL` (domanda aperta nella issue) e non riappare dopo il salvataggio.
- **Non saltabile** (scelta del proprietario): nessun "Salta"; il campo è obbligatorio.
- **Dove:** guard in `router/index.ts`, non nei due punti di login. Copre login con codice, login con Google e sessioni già aperte; `?next=` si conserva (passato da `safeNext`). La route `/name` sta dentro il layout autenticato, quindi l'utente può sempre uscire dal menu.
- **Chi vede il nome:** nessuna modifica a staff/owner: nessuna API oggi restituisce il nome del cliente (vedi lacune).
- **Validazione lato client** (`utils/displayName.ts`) speculare al backend (trim, 3-50, lettere/cifre/spazio/`'`/`-`/`.`); il backend resta il controllo vero e il 400 ha un messaggio generico.
- **Form riusabile** (`DisplayNameForm.vue`) per la pagina e per il Profilo ("Modifica nome" → form inline con Annulla).
- `api()` accetta ora anche `PATCH`.

## Assunzioni e cose da validare

- Visuale non rivista dal proprietario (il frontend è fuori dal TDD): da guardare a schermo, in chiaro e scuro.
- Chi ha già un nome e apre `/name` viene rimandato alla destinazione.
- Un utente staff/owner con nome `NULL` vede la pagina come tutti.

## File toccati e test

- File: `src/api/client.ts`, `src/api/endpoints.ts`, `src/router/index.ts`, `src/views/ProfileView.vue`, `src/views/DisplayNameView.vue` (nuovo), `src/components/DisplayNameForm.vue` (nuovo), `src/utils/displayName.ts` (nuovo), `e2e/display-name.mjs` (nuovo), `package.json` (script `e2e`).
- Test: nessun test backend (solo frontend). Nuovo e2e `display-name.mjs`: 10 controlli, tutti verdi (redirect, nessun "Salta", validazione, normalizzazione e salvataggio, destinazione originale, reload, `/name` con nome già presente, modifica dal Profilo, utente con nome mai interrotto). `vue-tsc` pulito.
- Gli altri e2e (`staff-input`, `feedback`, `account-delete`) non li ho potuti eseguire: i fixture cercano un locale con branding e il DB del worktree è vuoto ("No venue with branding in the DB"). Le fixture creano utenti con nome "E2E", quindi non dovrebbero essere toccati dalla guardia, ma non verificato.

## Modifiche proposte ai documenti

### CODEBASE.md
Frontend: route `/name` (`DisplayNameView`, dentro il layout autenticato). Guard del router: utente autenticato con `displayName === null` → `/name?next=…`; `/name` con nome già impostato → destinazione. `DisplayNameForm.vue` (pagina e Profilo), `utils/displayName.ts` (regole speculari al backend). `api()` supporta `PATCH`. Aggiungere `e2e/display-name.mjs` all'elenco degli e2e.

### BACKLOG.md
Spostare F2 (#56) nel §8 con la data 2026-11-12.

## Lacune emerse e task suggerite

- Staff e owner non vedono il nome del cliente (né nella coda né nello storico): serve una decisione di prodotto e un campo nelle risposte backend.
- `npm run e2e` non gira su un worktree appena creato (serve un locale con branding): si potrebbe far creare al fixture un branding di default.
- Messaggi del 400 più specifici dal backend, se servono.

## Problemi di ambiente

`pkill -f "stampy-wt/f2"` ha terminato anche la shell del tool (exit 144): i processi `npm run dev` si fermano comunque. Nessun altro.

## Cosa ho capito e cosa no

AGENTS.md dice di lanciare i comandi dalla radice del worktree, ma `npm test`/`type-check` stanno in `stampy-backend/` e `stampy-frontend/`. Il tema scuro non l'ho verificato a vista.
