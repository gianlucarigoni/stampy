# Report: b4f — B4c — Frontend: elimina account con conferma OTP

- **Issue:** #54
- **Branch:** feat/b4f-frontend-elimina-account
- **Data:** 2026-11-11

## Obiettivo

Dare al cliente la UX per eliminare il proprio account usando il backend di B4 (già in `main`): voce di menu, avviso, codice OTP, conferma.
Frontend, quindi fuori dal TDD.

## Decisioni e motivazioni

- **Rotta `/account/delete`** (vista `DeleteAccountView.vue`) dentro `AppLayout`, raggiungibile dal menu come «Elimina account».
  La voce compare solo sulle schermate cliente (come «Storico richieste»), non su quelle dello staff.
- **Flusso a due passi**, ricalcato su `EmailLogin.vue`: avviso → «Invia il codice» → campo a 6 cifre → «Elimina il mio account».
  Riuso di `useCountdown`, `tabStorage`, `formatWait` e della gestione di `InvalidCode`/`CodeExpired`/429.
- **Niente invio automatico alla sesta cifra** (a differenza del login): l'azione è irreversibile, serve un clic esplicito.
- **Blocco owner/staff**: la vista chiede `GET /venues/mine`; se l'utente ha un locale mostra il messaggio e nessun pulsante. Il 403 del
  backend (anche per l'admin di piattaforma, che `mine` non rivela) produce lo stesso messaggio. Alternativa scartata: nascondere la voce
  dal menu per chi ha locali (richiede di caricare le membership su ogni schermata cliente).
- **Dopo l'eliminazione**: `accountDeleted()` in `useAuth` svuota la sessione della tab, poi `/login?deleted=1` con «Account eliminato».
  `EmailLogin.vue` ora mostra l'avviso verde anche nel passo email (prima esisteva solo nel passo del codice).

## Assunzioni e cose da validare

- **Il testo italiano dell'avviso e del messaggio di blocco è scritto da me**: il proprietario deve approvarlo (come per UX-10).
  In particolare «il pass nel Wallet resta sul telefono, ma non funziona più: puoi rimuoverlo tu» descrive il comportamento attuale,
  finché non c'è la task che disattiva il pass.
- Verificato nel browser (Chromium headless) sul DB del worktree: 15 controlli nuovi; gli e2e esistenti restano verdi (7 + 32).
  **Non verificato** su un telefono reale né con una vera email (il codice OTP del test è sostituito direttamente nel DB).
- «Annulla» usa `router.back()`: se la pagina è stata aperta da un link diretto, torna a una pagina precedente qualsiasi.

## File toccati e test

- Nuovi: `src/views/DeleteAccountView.vue`, `e2e/account-delete.mjs` (15 controlli).
- Modificati: `src/api/endpoints.ts` (`requestAccountDeletion`, `confirmAccountDeletion`), `src/composables/useAuth.ts` (`accountDeleted`),
  `src/router/index.ts`, `src/components/AppLayout.vue` (voce di menu), `src/components/EmailLogin.vue` (avviso `?deleted=1`),
  `e2e/lib.mjs` (esportati `psql` e `newUser`; `cleanup()` non si rompe senza locali), `package.json` (`npm run e2e` include il nuovo script).
- Backend: nessuna modifica; la suite resta a 295 (la `BASELINE` 266 la riallinea `/docs-sync`). `npm run build` (vue-tsc + vite) pulito.

## Modifiche proposte ai documenti

### CODEBASE.md
- §2 (frontend), viste: `DeleteAccountView.vue` — `/account/delete`, eliminazione account con OTP; voce «Elimina account» nel menu cliente.
- §7 (e2e): `account-delete.mjs` 15 controlli. Totale e2e: staff-input 7, feedback 32, account-delete 15.

### BACKLOG.md
- B4 lato frontend fatta il 2026-11-11 (issue #54): spostare nel §8. Resta aperto il pass nel Wallet.
- Nota per gli e2e: nel DB di un worktree nuovo serve un locale con `branding` (gli script lo cercano in `venues`).

## Lacune emerse e task suggerite

- Disattivare il pass nel Wallet all'eliminazione (da provare prima su un issuer demo, V1).
- Il messaggio per l'admin di piattaforma è lo stesso del blocco staff («gestisce un locale»): impreciso, ma non riguarda i clienti.
- Gli e2e leggono `OTP_HMAC_SECRET` dal `.env` del backend per sostituire il codice: se cambia il formato dell'HMAC va aggiornato.

## Problemi di ambiente

- `lib.mjs` → `cleanup()` falliva con `IN ()` quando lo script non crea locali: corretto con un UUID segnaposto.
- Gli e2e esistenti richiedono un locale con branding già nel DB: nel DB nuovo del worktree l'ho seminato a mano.
- Un `pkill -f` con il percorso del worktree ha ucciso anche la mia shell (il comando conteneva lo stesso testo): nessun danno.

## Cosa ho capito e cosa no

- Chiaro: frontend fuori dal TDD, nessuna modifica a `docs/` oltre al report.
- `AGENTS.md` ricorda `E2E_APP_URL`; ho impostato anche `E2E_DB` sul DB del worktree, altrimenti gli script userebbero `stampy_dev`.
