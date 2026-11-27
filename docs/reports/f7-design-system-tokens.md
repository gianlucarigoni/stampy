# Report: f7 — F7 — Design system dir-i: token e fondamenta

- **Issue:** #78
- **Branch:** feat/f7-design-system-tokens
- **Data:** 2026-11-27

## Obiettivo

Mappare i token di dir-i sul Bootstrap 5.3 Sass (colori chiaro/scuro, ruoli semantici, accento premio, tipografia, raggi, bordi, anello di focus unico, movimento, nome del prodotto come variabile), con i tre font self-hosted. Risolve il contrasto AA di B28 (D1-a). Solo frontend, fuori dal TDD; nessuna schermata né componente riscritti (F8–F12).

## Decisioni e motivazioni

- **Token in due livelli**: variabili Sass per ciò che Bootstrap ha (`$primary`, `$body-*`, `*-bg-subtle`, `$border-radius*`, …); custom property `--app-*` (un blocco per tema, `:root,[data-bs-theme=light]` e `[data-bs-theme=dark]`) per i ruoli senza equivalente: `field`, `action*`, `danger*`, `prize*`, `stamp*`, `ring`, `scrim`, durate di movimento. Valori da `21-design-system.md` §2.1.
- **B28 risolto**: `$min-contrast-ratio: 4.5` e `$color-contrast-dark: #1f1612`; sparisce l'hack «3» e il testo bianco forzato su `.btn-outline-primary`. Testo del primario `#1f1612` (chiaro) / `#1a1410` (scuro), bordo `#9a3412` solo in chiaro, hover/premuto a mano.
- **Anello di focus unico**: `:focus-visible` e gli stessi stati di `.btn`, `.btn-check`, `.form-control`, `.form-select`, `.dropdown-item`; alone di Bootstrap spento (`$input-btn-focus-width: 0`); il focus di `.btn` non prende più i colori di hover. Ring `#1d4ed8` / `#8fb0ff`.
- **Hover solo da puntatore**: sui dispositivi `(hover: none), (pointer: coarse)` i `.btn:hover` tornano ai colori di riposo (con `:not(:active)` per non coprire il premuto).
- **Font**: 3 woff2 variabili latin in `public/fonts/` (identici byte per byte ai `@fontsource-variable/*` 5.3.0, sha256 confrontato), un file per famiglia (≈101 kB in tutto), `font-display: swap`, `unicode-range` latin, preload di Instrument Sans e Unbounded in `index.html`. Licenze OFL-1.1 copiate dai pacchetti come `OFL-<famiglia>.txt` accanto ai file. Nessuna dipendenza npm aggiunta (i tarball sono stati scaricati solo in una cartella temporanea per leggere le licenze).
- **Nome del prodotto (D5)**: `$product-name` in Sass ed `--app-product-name` in CSS; nessun uso ancora (wordmark, `<title>` e testi restano «Stampy»).
- **Wordmark in chiaro**: l'arancione puro dava 2,73:1; ora usa `--app-link` (AA in entrambi i temi). Alternativa scartata: lasciarlo come logotipo esente da WCAG.
- **Menu a tendina**: la voce attiva non è più piena arancione con testo bianco (3,2:1) ma `surface-2` con barra a sinistra (come da 21b §4).
- `$spacers` **non** cambiati (21b §7.13: rischio di regressione su `mb-3`/`mb-5`). `$grid-gutter-width` portato a 1rem. `$enable-rfs: false` per avere la scala fissa 28/19/17.
- `GoogleSignInButton.vue`: tre ritocchi di stile (bordo = `field`, anello = `--app-ring`, altezza 3.25rem) perché il bottone restasse coerente con i campi e col focus unico.

## Assunzioni e cose da validare

- **Non verificato su telefono reale** (né iOS né Android): resa a schermo, dimensioni tattili e rendering dei font solo in Chromium desktop con viewport 360 e 390 px.
- Contrasti misurati da script (testo con sfondo effettivo, soglia 4,5 o 3 per testo grande) su 9 viste × 2 temi × 2 larghezze: dopo la correzione del wordmark **nessun testo sotto soglia**; bordi dei campi 4,89 (chiaro) / 4,87 (scuro) ≥ 3. Non misurati: elementi senza nodo di testo (icone SVG, bordi dei `btn-outline`), stati hover/premuto, bottoni disabilitati (esenti), il testo dentro il bottone Google (iframe).
- Anello di focus verificato premendo Tab su ogni vista: 3px solido, blu, senza box-shadow, in entrambi i temi. Non verificato: focus dentro l'iframe del bottone Google (L-10 di 21b, non risolvibile da token).
- Tema scuro e resa a schermo controllati a vista sugli screenshot Playwright (login, scan, visita, richiesta, profilo, storico, coda staff, storico staff, elimina account), non con un dispositivo.
- Nessuna richiesta esterna dall'app: l'unica origine diversa è `placehold.co`, il logo del locale **dei dati di fixture** degli e2e (non del codice). I tre font arrivano da `/fonts/` (`document.fonts` li segna `loaded`).
- Nessun overflow orizzontale (`scrollWidth <= innerWidth`) in nessuna vista, tema o larghezza.
- `prefers-reduced-motion`: regole scritte (durate a 0, animazioni dei componenti futuri `.spin/.pulse/.newring/.conf` spente, scala del premuto a 1) ma non esercitabili finché i componenti non esistono.
- Il peso 500 dei campi e la resa dei codici con cifre di Unbounded (`.form-control-code`, ora Unbounded 1.5rem): il design segnala le cifre tabulari come **[V]**, da guardare a vista.

## File toccati e test

- File: `stampy-frontend/src/styles/stampy.scss` (riscritto), `stampy-frontend/index.html` (2 preload), `stampy-frontend/src/components/GoogleSignInButton.vue` (3 righe di stile), `stampy-frontend/public/fonts/` (3 woff2 + 3 OFL, nuovi).
- Test: nessuno aggiunto (frontend, fuori dal TDD). Backend non toccato. `/verify`: vitest ✔ 415 ✘ 0 (base 401: +14 che non vengono da questa task, da riallineare con `/docs-sync`); typecheck pulito. `npm run type-check` e `npm run build` puliti.
- E2E (`E2E_APP_URL=http://localhost:5174`): `staff-input` 7 ✔, `account-delete` 16 ✔, `display-name` 15 ✔, `profile-cards` 14 ✔, `email-request` 18 ✔. **`feedback` e `history` falliscono** (timeout su un locator; `history`: «toggle shows the active count "Filtri · 1"»). Ho rilanciato entrambi con le modifiche messe da parte (git stash): **identico risultato sul codice di base**, quindi già rotti (T8, #69), non per mia causa. Non corretti.

## Modifiche proposte ai documenti

### CODEBASE.md
Sezione frontend/stili: «`src/styles/stampy.scss` contiene i token dir-i: variabili Sass per Bootstrap e custom property `--app-*` per tema (`:root,[data-bs-theme=light]` / `[data-bs-theme=dark]`); `$min-contrast-ratio: 4.5`; anello di focus unico `--app-ring`; font self-hosted in `public/fonts/` (Unbounded, Instrument Sans, Figtree, OFL). `--stampy-brand` resta come alias di `--app-brand`. Il nome del prodotto è `$product-name` / `--app-product-name`.»

### BACKLOG.md
- F7 (#78): fatto, dopo il merge. B28 (contrasto AA dei bottoni arancioni): risolto da F7.
- Nuove voci suggerite: (a) F8+ deve sostituire `.btn-outline-primary` nelle icone dell'header e nello stepper (ora arancione-link su `surface`) con i componenti dir-i; (b) usare `--app-product-name` / `$product-name` quando si rinomina (D5) e nel `<title>` di `index.html`.

## Lacune emerse e task suggerite

- Gli e2e `feedback` e `history` sono rotti già su `main` (T8, #69): confermato.
- `$spacers` di dir-i (12/36 px) non applicati: vanno introdotti per gradi con F8–F12.
- Il bottone «Invia il codice» disabilitato mantiene l'opacità .65 di Bootstrap: sparirà con la regola «primari mai disabilitati» (parte Vue, F8+).
- Hover/premuto, bordi dei btn-outline e icone SVG non coperti dalla misura dei contrasti: da rivedere nelle schermate nuove.

## Problemi di ambiente

Nessuno. Nota: gli e2e scrivono file nel working tree (`docs/reports/t2-screenshots/`, `stampy-frontend/profile-cards-*.png`): li ho eliminati prima del commit.

## Cosa ho capito e cosa no

Task chiara. Assunzione: «sulle viste esistenti» include ritoccare le poche regole custom di `stampy.scss` (menu, filtri, wordmark, avatar, danger zone) perché non usassero più il bianco su arancione. Il comando `worktree-start.sh` ha funzionato al primo colpo.
