# Report: f2b — display-name-review

- **Issue:** nessuna (la #56 è già chiusa)
- **Branch:** fix/f2b-display-name-review
- **Data:** 2026-11-16

## Obiettivo

Rivedere il frontend della #56 (nome visualizzato, F2) dopo le modifiche al backend (`PATCH /api/auth/me`, #58): allineare la regola, verificare guardia del router, stato/errori del form, accessibilità e coerenza con AGENTS.md. Frontend escluso dal TDD.

## Decisioni e motivazioni

**1. Regola allineata a `auth.dto.ts`** (`utils/displayName.ts`). Fatti verificati con uno script che confronta frontend e backend (regex backend + `validator.isLength`) su 20 input: 0 differenze dopo la correzione. Prima mancavano: NFC prima di tutto, `\p{M}` (rifiutava "José Rossi" e il devanagari "राहुल शर्मा"), "almeno una lettera" (accettava "..." e "123"), e la lunghezza era in unità UTF-16 mentre class-validator conta i code point (un nome di 50 ideogrammi fuori dal BMP veniva rifiutato). Messaggi in italiano, uno per causa: troppo corto, troppo lungo, caratteri non ammessi, «Scrivi almeno una lettera». NBSP interno, emoji, tab, zero-width: «caratteri non ammessi» (come il backend, che ammette solo lo spazio U+0020).

**2. 400 con `details`.** `ApiError` ora porta `details` (campo opzionale, mai mostrato così com'è). Se la regola locale passa ma il server rifiuta (regole che si sono disallineate), `problemFromDetails` sceglie il messaggio dal vincolo (`isLength`/`matches`), altrimenti il generico. Scartato: leggere `message` del server (testo inglese di class-validator).

**3. Form.** Focus sul campo a ogni errore (validazione o server); `aria-describedby` punta sempre al suggerimento «Da 3 a 50 caratteri» e, con errore, anche al messaggio; 429 mostra «riprova tra N secondi» se il server lo dice; `maxlength` portato da 60 a 200 (con 60 si troncava in silenzio un nome incollato in forma decomposta, che dopo NFC sarebbe stato valido); aggiunti `autocapitalize="words"` e `spellcheck="false"`. `inputmode` lasciato al default (testo): per un nome è corretto.

**4. Profilo.** Il focus entra nel campo quando si apre «Modifica nome» e torna sul pulsante quando il form si chiude (salva/annulla); prima andava perso sul body. `DisplayNameView`: `aria-labelledby` come le altre view.

## Verifiche senza modifiche (fatti)

- **Guardia del router.** Login con codice e con Google: entrambi chiamano `destinationAfterLogin(next)`, poi la guardia manda a `/name?next=…` se `displayName === null`. Sessione già aperta su `/login`: stessa strada. `/name` con nome già impostato: `destinationAfterLogin(to.query.next)`, nessun ciclo (anche con `next=/name`, perché la navigazione di ritorno non ha `next`). 401 durante il salvataggio: `setUnauthorizedHandler` pulisce l'utente e manda al login con `next=/name?next=…`; dopo il login si torna a `/name` o direttamente alla destinazione se il nome è nel frattempo impostato. Utente anonimizzato: l'`UPDATE` backend ha `anonymized_at IS NULL` e risponde 401 (`UnauthorizedError`), quindi stesso percorso del 401.
- **`safeNext`.** Provato con `//evil.com`, `/\evil`, `/\t/evil.com`, `https://…`, `javascript:`, array: tutti `null`. `/%5Cevil` passa ma resta un path interno: vue-router fa `pushState` sulla stessa origine, non assegna mai `location`. Nessun open redirect.
- **Doppio invio.** `busy` è impostato prima di qualunque `await`, il pulsante è disabilitato e `submit` esce subito se `busy`: un solo PATCH. `setUser` si chiama prima di `emit('saved')`. Nessun `console.*` nei file della feature; il nome viaggia solo nel body del PATCH, mai nell'URL.
- **Timeout/rete.** `api()` converte il timeout di 8 s in `ApiError(0, 'NetworkError', 'Connessione non riuscita, riprova')`; il PATCH è idempotente, il retry è sicuro.

## Assunzioni e cose da validare

- 403 sul PATCH: dal controllo di `Origin` (B3), non provato; mostra il messaggio del server.
- Il tema scuro e la resa a schermo del suggerimento (`form-text`) **non sono verificati a vista**.
- Lettura con screen reader non provata: l'a11y è verificata solo nel codice e con gli e2e (focus e `aria-invalid`).
- Il pulsante resta disabilitato con campo vuoto: Invio non fa nulla e non dà feedback. Lasciato come prima (scelta di UX, non un bug).

## File toccati e test

- File: `stampy-frontend/src/utils/displayName.ts`, `src/components/DisplayNameForm.vue`, `src/api/client.ts`, `src/views/ProfileView.vue`, `src/views/DisplayNameView.vue`, `e2e/display-name.mjs`.
- Test backend: nessuno toccato; suite 367 → 367 (`verify.sh`: typecheck + vitest ✔ 367 ✘ 0).
- `npm run type-check` (frontend): pulito.
- e2e (DB `stampy_wt_f2b`, locale creato con `create-venue.ts`): `display-name.mjs` 15 ✔ (erano 10: aggiunti focus+`aria-invalid`, solo cifre, NBSP, focus dopo il salvataggio, NFC+devanagari); `account-delete.mjs` 16 ✔; `staff-input.mjs` 7 ✔; **`feedback.mjs` ✘**: timeout in attesa di `.toast-stack .alert` (toast del premio) dopo 9 ✔. Fallisce **identico sul codice originale** (provato con `git stash`), quindi non dipende da questa task. `npm run e2e` si ferma lì (catena `&&`), perciò `display-name.mjs` va lanciato a parte.

## Modifiche proposte ai documenti

### CODEBASE.md
Nella riga frontend `utils/displayName.ts`: «specchio di `auth.dto.ts`: NFC, trim, spazi, 3-50 code point, `\p{L}\p{M}\p{N}`, almeno una lettera; un messaggio per causa; `problemFromDetails` per i 400». `ApiError` ha anche `details` (solo 400 del validator).

### BACKLOG.md
Nessuna voce da chiudere. Nuova lacuna: `e2e/feedback.mjs` fallisce sul toast del premio (vedi sotto).

## Lacune emerse e task suggerite

- Indagare `feedback.mjs` (toast del premio non compare in un worktree con DB appena creato; non so se è un difetto dell'e2e, del fixture o dell'app). Non toccato: fuori scopo.
- Il frontend duplica la regola del backend a mano. Non esiste un test che le confronti; il confronto qui è stato fatto con uno script usa e getta. Un test di allineamento potrebbe valere la pena se la regola cambia ancora.
- `npm run e2e` si ferma al primo script rosso: gli script successivi non girano.

## Problemi di ambiente

`feedback.mjs` ✘ come sopra. Nessun altro. Server dev del worktree avviato sulle porte 3001/5174 e poi fermato.

## Cosa ho capito e cosa no

Istruzioni chiare. «Chiudi con worktree-finish.sh solo se tutto è verde» e la regola di AGENTS.md («un test fallisce, anche dopo un secondo tentativo: ti fermi») in conflitto con un e2e già rosso su `main`: ho scelto di **non** unire e di chiedere. Per l'e2e ho usato `E2E_DB=stampy_wt_f2b` esplicitamente (il default sarebbe `stampy_dev`).
