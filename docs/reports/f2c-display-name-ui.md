# Report: f2c — display-name-ui

- **Issue:** nessuna (la funzione verificata è #56)
- **Branch:** fix/f2c-display-name-ui
- **Data:** 2026-11-16

## Obiettivo

Verifica visiva e di flusso in un browser vero (Playwright) della pagina `/name` e del campo nome nel Profilo, mobile first. Correzione dei soli difetti piccoli e chiari; il resto è proposto qui.

## Decisioni e motivazioni

- Corretti in `stampy-frontend/src/components/DisplayNameForm.vue` tre difetti piccoli (voci 1, 3, 4). Il frontend è escluso dal TDD.
- Non toccati: contrasto dell'arancione (scelta già scritta in `stampy.scss`), header, layout del Profilo. Sono proposte.

## Assunzioni e cose da validare

- Screenshot **guardati davvero** (Chromium via Playwright, `prefers-color-scheme` emulato): 360×640 chiaro e scuro per tutti gli stati; 768 e 1280 per `/name` vuoto e Profilo in modifica. **Non verificati a vista**: 390×844 (solo misure: input e bottone 48px, font 17px, niente scroll orizzontale, come a 360), 768 in scuro, `/name` a 1280.
- **Tastiera virtuale, zoom iOS e safe area non verificabili da desktop**: ho solo simulato la tastiera con viewport 360×340 (il bottone "Salva" resta raggiungibile scorrendo). Font del campo 17px (≥16px: niente zoom su iOS). Il viewport non usa `viewport-fit=cover`, quindi non serve la safe area. Da provare su un telefono vero.
- Gli screenshot stanno in `/tmp/claude-1000/-home-rigoni-g-Personal-stampy/e9b8d192-3567-4343-bc1e-4012bd52e0ab/scratchpad/shots/` (fuori dal repo, non committati).

## Esito della verifica

Funziona (nessun bloccante):
- Flusso: login → `/name?next=…` → salvataggio → destinazione di `next`. `done()` usa `replace`, quindi "Indietro" non riporta a `/name`. Utente con nome già presente che apre `/name?next=/profile` → rimandato a `/profile`. Ricarica ok.
- Stati: vuoto o solo spazi → bottone disabilitato; "ab", `Mario <3 @rossi`, `12345`, 51 caratteri → messaggio giusto in `role="alert"`, focus sul campo, `aria-invalid` e `aria-describedby`; 400 del server → "Usa solo lettere…"; offline → "Connessione non riuscita, riprova"; in corso → "Salvo…" e bottone disabilitato.
- Contenuti: nome cirillico, accenti (Ñandú, Zoë, Ü) e 50 caratteri ok; titolo del Profilo a capo senza scroll orizzontale.
- Misure: campo e bottoni 48px (Annulla 46px), `autocomplete="name"`, `autocapitalize="words"`. Ordine del focus: menu → campo → bottone; il focus entra nel campo all'apertura dal Profilo e torna su "Modifica nome" dopo Salva/Annulla. Snapshot di accessibilità coerente.
- Rete: solo `PATCH /api/auth/me`, nome nel body e mai nell'URL, nessuna richiesta inutile. Console: solo il 401 atteso di `GET /api/auth/me` prima del login (più gli errori provocati da me con route simulate).

## Problemi trovati (per gravità)

**Bloccanti:** nessuno.

**Da sistemare**
1. *(corretto)* Il campo non risultava in errore: c'era `aria-invalid` ma non la classe `is-invalid`, quindi niente bordo rosso e icona (in chiaro l'errore si confondeva con l'anello di focus arancione). `DisplayNameForm.vue`: `:class="{ 'is-invalid': error }"`.
2. *(proposta)* Contrasto AA: testo bianco su `#f16417` (bottoni "Continua"/"Salva") e link arancioni su sfondo chiaro ("Annulla", "Modifica nome") = **3,19:1**, sotto 4,5:1 per testo normale. In scuro i link sono 7,09:1 (ok). La scelta è documentata in `stampy-frontend/src/styles/stampy.scss` (`$min-contrast-ratio: 3`) e vale per tutto il progetto. Proposta: `$primary` più scuro nel tema chiaro (es. `#c2410c`, circa 5:1, già usato per lo stato pressed).

**Rifinitura**
3. *(corretto)* L'errore restava visibile mentre si riscriveva: ora `@input="error = ''"`.
4. *(corretto)* Durante il salvataggio il campo era modificabile: ora `:readonly="busy"` (non `disabled`, per non perdere il focus).
5. *(proposta)* `ProfileView.vue`: con un nome lungo "Modifica nome" va a capo su due righe a 360px. Proposta: portarlo sotto il nome sotto `sm`.
6. *(proposta)* Anello di focus del campo debole in chiaro (box-shadow arancione al 19%). Proposta: `$input-btn-focus-color-opacity: .5` in `stampy.scss`.
7. *(proposta)* Su `/name`, pagina obbligatoria, l'header mostra il menu; le voci rimandano comunque a `/name` per la guardia del router. Proposta: nasconderlo finché `displayName` è null.
8. *(proposta)* Il 401 di `GET /api/auth/me` prima del login compare in console come errore: normale ma rumoroso (decisione di API del proprietario).

## File toccati e test

- File: `stampy-frontend/src/components/DisplayNameForm.vue`, questo report.
- Test: nessuno aggiunto (frontend escluso dal TDD); `vue-tsc` pulito. Suite backend non toccata: 367 → 367. e2e non eseguiti.

## Modifiche proposte ai documenti

### CODEBASE.md
Nessuna.

### BACKLOG.md
Aggiungere come `TODO` di frontend le voci 2, 5, 6, 7 (la 2 cambia una scelta di stile: serve la conferma del proprietario).

## Lacune emerse e task suggerite

- Contrasto AA nel tema chiaro (voce 2); resa del Profilo con nomi lunghi (voce 5).
- Provare su un telefono vero tastiera, zoom e safe area.

## Problemi di ambiente

Nessuno. (Il `.env` sta in `stampy-backend/`, non alla radice del worktree.)

## Cosa ho capito e cosa no

Ho verificato in Chromium desktop, non su un dispositivo mobile reale: tastiera virtuale, notch e zoom iOS restano da provare.
