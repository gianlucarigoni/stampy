# 21b · Mappatura dei token sul Bootstrap 5.3 (Sass)

Chat 10, 2026-11-26. **Nulla è applicato al codice**: è una guida per quando si passerà all'implementazione (in un worktree, con le regole di `AGENTS.md`).
Riferimento: `21-design-system.md` (token e componenti). Stato attuale letto in sola lettura da `stampy-frontend/src/styles/stampy.scss` e da `node_modules/bootstrap` **5.3.8** (i nomi delle variabili Sass sotto sono stati controllati nei file `_variables.scss` / `_variables-dark.scss` installati).

Legenda del livello
- **V** = basta una variabile Sass prima di `@import "bootstrap/scss/variables"`.
- **CSS** = override di una custom property (`--bs-*`) in uno scope (`[data-bs-theme=dark]`, `.btn-primary`, …): poche righe, nessuna nuova regola.
- **S** = SCSS/CSS **nuovo** (regola o componente che Bootstrap non ha). Quantità stimata in righe.
- **C** = serve anche **codice Vue** (logica), non solo stile.

Come funziona il tema oggi: `main.ts` imposta `data-bs-theme="light|dark"` su `<html>` seguendo `prefers-color-scheme`; Bootstrap genera le variabili `--bs-*` per i due temi (`$color-mode-type: data`, `$enable-dark-mode: true`). Il design system aggiunge `--app-*` per i ruoli che Bootstrap non ha, **definiti una volta per tema** nello stesso modo.

---

## 1. Colore

| Token (`--app-…`) | Chiaro / scuro | Come lo realizza Bootstrap | Liv. | Note |
|---|---|---|---|---|
| `bg` | `#f1ede0` / `#1a1410` | `$body-bg` (chiaro), `$body-bg-dark` (scuro) | V | oggi `$body-bg-dark: #171310` |
| `surface` | `#fbf9f1` / `#251d17` | `$card-bg`, `$input-bg`, `$dropdown-bg`; `--bs-body-bg` resta `bg` | V | `$card-bg` di default è `body-bg`: va impostato a parte. Scuro: `$body-secondary-bg-dark` o `--bs-secondary-bg` |
| `surface-2` | `#dfe5d2` / `#31261e` | `$body-tertiary-bg` / `$body-tertiary-bg-dark` (usato da `$dropdown-link-hover-bg`) | V | stessi due valori usati per chip, premuto, scheletro |
| `border` | `#d6dac8` / `#4a3b30` | `$border-color`, `$border-color-dark`; `$card-border-color` (oggi `border-color-translucent`) | V | decorativo |
| `field` | `#7d6a58` / `#9a8878` | `$input-border-color` (oggi `var(--bs-border-color)`) | V | **separato** da `border`: Bootstrap usa lo stesso colore per bordo card e campo, qui sono due. Per `.btn-outline-secondary`: `--bs-btn-border-color` → **CSS** |
| `text` | `#2a1f18` / `#f4e9dc` | `$body-color`, `$body-color-dark`, `$headings-color` | V | |
| `text-2` | `#5f4e40` / `#c0ad9c` | `$body-secondary-color` (default `rgba(body, .75)`), `$body-secondary-color-dark` | V | in chiaro `rgba` darebbe un colore diverso: usare l'hex |
| `link` | `#b43a0a` / `#f4813f` | `$link-color`, `$link-color-dark` (oggi già `#f4813f`), `$link-hover-color(-dark)` | V | hover: scurire/schiarire del 10% (non misurato) |
| `brand` | `#f16417` | `$primary` (oggi), `--stampy-brand` | V | marca per timbri e wordmark |
| `action` + `action-fg` | fondo `#f16417`; testo `#1f1612` / `#1a1410` | `$primary` + `$min-contrast-ratio: 4.5` + `$color-contrast-dark: #1f1612` → `color-contrast()` sceglie il testo scuro da solo (5,56) | V | **sparisce l'hack** `$min-contrast-ratio: 3` e la regola `.btn-outline-primary` con testo bianco. In scuro il testo `#1a1410` è un secondo valore: **CSS** `--bs-btn-color` nel tema scuro (o accettare `#1f1612` in entrambi: 5,56 da `contrasts-21.mjs`) |
| `action-bd` | `#9a3412` / trasparente | `--bs-btn-border-color` su `.btn-primary` per tema | CSS | |
| `action-hover` / `action-pressed` | `#f7782f`,`#db5a11` / `#f87a35`,`#db5a11` | `--bs-btn-hover-bg`, `--bs-btn-active-bg` (+ `-border-color`, `-color`) | CSS | Bootstrap li calcola con `shade-color($primary, 15% / 20%)`: **valori diversi** da quelli scelti; vanno impostati a mano. `$btn-hover-bg-shade-amount`/`$btn-active-bg-shade-amount` non bastano: il testo scuro richiede **schiarire** l'hover |
| `danger` (+ fill, fg, tint, tt) | `#b3261e`/`#ff8d82`; tint `#fbe5e1`/`#3a1714`; tt `#7a1610`/`#ffc9c3` | `$danger: #b3261e`; chiaro: `$danger-bg-subtle`, `$danger-text-emphasis`, `$danger-border-subtle`; scuro: `$danger-bg-subtle-dark`, `$danger-text-emphasis-dark`, `$danger-border-subtle-dark`; testo del bottone pieno scuro (`#2a0a07`) | V + CSS | **un solo danger**: elimina `--stampy-danger`, `#c92a3a`, `#f0808b` e il `#dc3545` standard (EL-9). Il fondo del bottone in scuro è **chiaro** (`#ff8d82`): `--bs-btn-bg`/`--bs-btn-color` per tema → CSS |
| `ok` (+ tint, tt) | `#14633b`/`#86dca0`; … | `$success`, `$success-bg-subtle(-dark)`, `$success-text-emphasis(-dark)`, `$success-border-subtle(-dark)` | V | oggi `text-success` in scuro è `#198754` stimato: 4,08 con la vecchia coppia **[V]** |
| `warn-tint/tt` | `#f2e1a3`/`#3a2f0a`; `#4a3300`/`#ffe39a` | `$warning-bg-subtle(-dark)`, `$warning-text-emphasis(-dark)` | V | bordo dell'alert = `warn-tt`: **CSS** (`--bs-alert-border-color`) |
| `info-tint/tt` | `#e9eef9`/`#1b2540`; `#1d2f66`/`#c6d4ff` | `$info-bg-subtle(-dark)`, `$info-text-emphasis(-dark)` | V | |
| `prize` (+ fg, tint, tt, bd, pressed) | `#ff5fa2`, `#2b1408`, … | **tema nuovo**: `$custom-colors: ("prize": #ff5fa2)` e `$theme-colors: map-merge($theme-colors, $custom-colors)` **dopo** `@import "functions"` e **prima** di `maps`: genera `.btn-prize`, `.alert-prize`, `.text-bg-prize` e le variabili `--bs-prize-*` | V + S | richiede i `*-bg-subtle`/`*-text-emphasis` anche per `prize` (map `$theme-colors-bg-subtle`, ecc., da estendere) ~10 righe. In alternativa classi `.chip-prize`, `.alert-prize` interamente custom (~20 righe): più semplice |
| `stamp`, `stamp-ink` | `#f16417` / `#2b1408`,`#1a1410` | nessuna variabile Bootstrap | S | custom property `--app-stamp*` e `fill: var(…)` nell'SVG |
| `ring`, `ring-on-prize` | `#1d4ed8`/`#8fb0ff`; `#2b1408` | `$focus-ring-color` (solo per `.focus-ring`, che non usiamo) | CSS + S | vedi §3: **non basta una variabile** |
| `scrim` | `rgba(10,6,3,.72)` | `$modal-backdrop-bg` non c'è (modal non importato); `<dialog>::backdrop` | S | 1 regola |

**Per tema**: il pattern è definire in Sass le variabili `*-dark` (che Bootstrap usa dentro `[data-bs-theme=dark]`) e, dove Bootstrap non ha il ruolo (`field`, `stamp`, `prize`, `ring`, `scrim`), due blocchi `:root, [data-bs-theme=light] { --app-… }` / `[data-bs-theme=dark] { --app-… }` (come il blocco `--stampy-danger` di oggi). I componenti custom leggono **solo** `--app-*`.

## 2. Tipografia, spazi, raggi, bordi, ombre

| Token | Mappatura | Liv. | Note |
|---|---|---|---|
| Font corpo (Instrument Sans) | `$font-family-sans-serif: "Instrument Sans", system-ui, …`; `$font-size-base: 1.0625rem` (17 px), `$line-height-base: 1.5`, `$input-font-size: 1.0625rem` (già) | V | `@font-face` ×3 con `woff2` locali, `font-display: swap`: **S** (~15 righe) |
| Titoli (Unbounded) | `$headings-font-family: "Unbounded", …`; `$headings-font-weight: 800`; `$headings-line-height: 1.05`; `$h1-font-size: 1.75rem` (28 px), `$h2-font-size: 1.1875rem` (19 px, peso 700) | V | letter-spacing −0,03em: Bootstrap non ha una variabile per `h1`: **S** 3 righe. Il peso 700 di `t-section` è un secondo livello (classe) |
| Etichette, chip, bottoni (Figtree 700) | `$btn-font-family: "Figtree", …`; `$btn-font-weight: 700`; `$form-label-font-weight: 700`; `$input-btn-font-family` | V | |
| Numero grande, codice | classi `.t-big`, `.t-code` (Unbounded, tabulare) | S | ~8 righe |
| Spaziature | `$spacers` con chiavi aggiunte: `1:.25rem 2:.5rem 3:.75rem(12) 4:1rem 5:1.25rem 6:1.5rem 7:2.25rem(36) 8:3rem` | V | di default 3 = 1rem e 5 = 3rem: cambiano **tutte** le utilità `mb-3`/`mb-5` già nel codice: da verificare caso per caso, **non** mappare alla cieca |
| Raggi | `$border-radius: .75rem` (12, `r-sm`), `$border-radius-sm: .75rem`, `$border-radius-lg: 1.125rem` (18, `r-card`), `$border-radius-xl: 1.75rem` (28), `$border-radius-pill`; `$btn-border-radius: .875rem` (14), `$input-border-radius: .875rem`, `$card-border-radius: 1.125rem`, `$alert-border-radius: .75rem`, `$dropdown-border-radius: .875rem` | V | |
| Bordi | `$border-width: 1.5px` (card, bottoni); `$input-border-width: 2px`; `$btn-border-width: 1.5px`; alert **3px**: `$alert-border-width: 3px` | V | `$alert-border-width` è `var(--bs-border-width)` di default: va reso esplicito |
| Ombre | `$enable-shadows: false` (già); `$box-shadow` solo per `$dropdown-box-shadow` (livello 1) | V | |
| Z-index | invariati (`$zindex-dropdown 1000`, `$zindex-sticky 1020`) | — | il `<dialog>` è nel top layer |
| Altezze dei controlli | `$btn-padding-y`, `$input-padding-y` per ottenere 52 px (oggi `min-height: 3rem` in `.btn`/`.form-control`) → portare a `3.25rem` (52); compatto `3rem`; stepper 2.75rem | V + S | |

## 3. Focus ring e bordi dei campi (token globale)

Cosa fa Bootstrap oggi (verificato nei sorgenti): `.form-control:focus` e `.btn:focus-visible` mettono **`outline: 0`** e disegnano un `box-shadow` (alone) con `--bs-btn-focus-box-shadow`; per di più `.btn:focus-visible` applica i colori **di hover** (`btn-hover-bg`), e per questo oggi focus ≈ hover ≈ premuto (L-7).

| Obiettivo | Come | Liv. |
|---|---|---|
| Spegnere l'alone | `$input-btn-focus-width: 0`, `$input-focus-box-shadow: none`, `$btn-focus-box-shadow: none` | V |
| Un solo anello | regola globale `:focus-visible { outline: 3px solid var(--app-ring); outline-offset: 2px; box-shadow: none }` **e** la stessa per `.btn:focus-visible`, `.form-control:focus`, `.form-select:focus`, `.btn-check:focus-visible + .btn`, `.dropdown-item:focus-visible` (le regole di Bootstrap hanno specificità maggiore di `:focus-visible` nudo, quindi l'anello va riscritto per questi selettori) | S (~12 righe) |
| Focus ≠ hover | su `.btn:focus-visible` rimettere `background/color/border` ai valori di riposo (`var(--bs-btn-bg)`, …) | S (3 righe) |
| Bordo campo ≥ 3:1 | `$input-border-color` → `field`; `$input-border-width: 2px`; `$input-focus-border-color` = `field` (non il tint arancione) | V |
| Anello nel dialog rosa | `.dialog-prize { --app-ring: var(--app-ring-on-prize) }` | CSS |
| Anello del Google button | iframe cross-origin: può non scattare `:focus-within` (L-10) | **[V]** non risolvibile da token |

## 4. Componenti

| Componente | Cosa fa Bootstrap | Cosa serve in più | Liv. |
|---|---|---|---|
| **Bottone primario** | `.btn-primary` con `$primary`; con `$min-contrast-ratio: 4.5` il testo diventa scuro in automatico | bordo `action-bd` in chiaro; hover/pressed a mano (§1); stato in lavorazione (spinner) = classe `.btn-busy` + `aria-busy` | CSS + S (~10 righe) + **C** (ignorare i tocchi senza `disabled`) |
| **Mai disabilitato** | Bootstrap stila `:disabled`/`.disabled` (opacity .65): basta **non usarlo** | la validazione al tocco è logica | **C** (oggi `:disabled` in 5+ punti) |
| **Secondario** | `.btn-outline-secondary` | `--bs-btn-color: var(--app-text)`, bordo `field`, hover/pressed `surface-2` | CSS |
| **Pericolo pieno / outline** | `.btn-danger`, `.btn-outline-danger` | `--bs-btn-*` per tema (fondo chiaro in scuro) | CSS |
| **Link** | `.btn-link` | `min-height: 2.75rem`, sottolineato (già) | V |
| **Campo** | `.form-control` | altezza 52, bordo 2px, raggio 14: variabili | V |
| **Campo invalido** | `.is-invalid` (bordo rosso + icona SVG in `background-image` + `.invalid-feedback`) | **barra interna sinistra 4px**, icona `warning-circle` fill (SVG nostro, non quella di Bootstrap: `$form-feedback-icon-invalid`), **messaggio al posto del suggerimento** con altezza riservata (2 righe), `aria-describedby` | V (colore `$form-feedback-invalid-color`, `$form-feedback-icon-invalid`) + S (~15 righe) + **C** (logica dei messaggi di campo/di sistema) |
| **Alert** | `.alert-danger/warning/success/info` con `--bs-alert-*` da `*-bg-subtle`/`*-text-emphasis` | bordo **3px** del colore del tipo, icona SVG a sinistra (`display:flex`), titolo `<b>`; variante `prize` (§1); banner sticky; ✕ da 44 | CSS + S (~20 righe) |
| **Card** | `.card` | raggio 18, bordo 1,5, `$card-bg` = surface; riga-link tappabile (`.profile-row` oggi) | V + S (esiste già) |
| **Card timbri** | nessuno | SVG timbro (pieno/vuoto/nuovo), griglia a 5 colonne (`.row-cols-5` o CSS grid), numero grande, chip, rotazioni deterministiche, animazione `.newring`, scheletro | S (~60 righe + 3 SVG) |
| **Dialog del premio** | `<dialog>` nativo (già); Bootstrap `modal` non importato | blocco rosa, bordo 2,5, raggio 28, coriandoli (`@keyframes`, 12 elementi `i`), `::backdrop` scrim, variante sobria, `prefers-reduced-motion` | S (~50 righe) |
| **Chip / chip di stato** | `.badge` (non importato) o `.rounded-pill` + utilità | classi `.chip`, `.chip-ok/warn/prize/neutral` con icona SVG | S (~25 righe) |
| **Riga di lista / Storico** | `.list-group` (non importato) | gruppi per giorno, riga con chip; `RequestHistory` esiste già: restyle | S (~30 righe) |
| **Pannello filtri** | `.collapse` (JS non usato; oggi gestito da Vue) | chip rimovibili, conteggio, `is-invalid` per campo | S (~20) + **C** |
| **Header** | `AppHeader` custom | 56 px, chip del locale, burger con stato aperto | S (~15) |
| **Menu a tendina** | `dropdown` (importato), `#app-menu` custom | larghezza min 220 (`$dropdown-min-width: 13.75rem`), voci 48 (`$dropdown-item-padding-y`), voce attiva con barra, separatore, ombra livello 1; **togliere** il pieno arancione sull'attivo | V + CSS (~10 righe) |
| **Card della coda** | `.card` | codice a gruppi, chip «1°», stepper, preset, esito con barra, scaduta/già gestita con altezza congelata, «Nuova» | S (~80 righe) + **C** (annulla a tempo, altezze, contatore, segnale di nuova richiesta) |
| **Stepper** | `.input-group` (non importato) / custom | 44×44, stato minimo/massimo non sbiadito, preset | S (~25) |
| **Banner connessione / contatore sticky** | `.sticky-top` (helpers importati) | contenuto e z-index 1020 | CSS + **C** |
| **Spinner** | `.spinner-border` (non importato) | `.spin` 1,1em | S (5 righe) (oppure importare `spinners`, ma `prefers-reduced-motion` e testo diverso comunque custom) |
| **Scheletro** | `.placeholder` (non importato) | blocchi `surface-2`, senza shimmer | S (~10) |
| **Stato vuoto / pagina di errore** | — | struttura icona+titolo+testo+azione | S (~15) |
| **Toast** | non servono (vedi `21`) | — | — |

## 5. Movimento

| Token | Come |
|---|---|
| Durate/easing | custom properties `--app-dur-press/state/dialog/new/confetti` e `--app-ease-*`; **S** |
| `$enable-transitions` | Bootstrap lo tiene `true`; con `$enable-reduced-motion: true` (default) Bootstrap spegne **le sue** transizioni se `prefers-reduced-motion`. Le nostre animazioni vanno spente a mano |
| Snippet reduced-motion (da mettere una volta) | `@media (prefers-reduced-motion: reduce) { .spin, .pulse, .newring, .conf i { animation: none !important } .dialog-prize { transition: none } .btn:active { transform: none } }` + stato statico di «nuovo» (anello fisso più spesso) e testo «…» al posto dello spinner |

## 6. Responsive

| Token | Mappatura | Liv. |
|---|---|---|
| Breakpoint | `$grid-breakpoints` default (576/768/992/1200/1400) ✓ | — |
| Contenitori | `$container-max-widths` (540/720/960/1140/1320): non coincidono con 28rem/36rem/1100: usare `.narrow` (già) con `max-width: 28rem` e, da `md`, `36rem`; staff largo: `.container` con `max-width: 1100px` | S (~6 righe) |
| Gutter | `$grid-gutter-width: 1rem` (16) sotto `md` e 1.5rem da `md` | V + S |
| Hover solo puntatore | Bootstrap 5.3 applica `:hover` anche al tocco (`$enable-hover-media-query` non esiste più): ogni regola hover custom va dentro `@media (hover: hover) and (pointer: fine)`; per i `.btn` di Bootstrap si resettano le variabili hover alla base e si assegnano i valori hover **solo** dentro quella media query | S (~12 righe) |
| Coda a due pannelli / tabella (≥ 768 / ≥ 992) | grid Bootstrap + componenti nuovi | S + **C** (si decide nelle chat 7-8) |
| Barra laterale / nav orizzontale | `navbar` non importato | S (si decide nelle chat 7-8) |

## 7. Cosa NON si ottiene con i soli token

Elenco di ciò che richiede **più di una modifica di variabile** (livello S o C):

1. **Anello di focus unico**: riscrivere gli stati `:focus` di `.btn`, `.form-control`, `.dropdown-item`, `.btn-check` (Bootstrap mette `outline: 0` e usa gli stili di hover). ~12 righe.
2. **Hover solo da puntatore**: Bootstrap non lo gestisce; media query a mano.
3. **Primario mai disabilitato**: è comportamento (Vue), e va concordato come test quando ci sarà un frontend in TDD.
4. **Un solo danger e il bottone danger in scuro con fondo chiaro**: variabili `--bs-btn-*` per tema.
5. **Il colore «premio»** (tema nuovo o classi custom) e la sua variante per tema.
6. **Campo invalido** (barra, icona nostra, messaggio al posto del suggerimento, altezza riservata).
7. **Card timbri, timbro SVG, stato «nuovo»**, scheletro.
8. **Dialog del premio** (coriandoli, sobria/reduced-motion, bordo rosa).
9. **Chip di stato** con icona SVG.
10. **Card della coda** (codice a gruppi, esito a tempo, annulla, altezza congelata, segnale di nuova richiesta): in gran parte **logica Vue**.
11. **Tre font in self-hosting** (`@font-face`, preload), **icone SVG inline** (Phosphor MIT, sprite).
12. **Messaggi del banner di connessione, ora dell'ultimo aggiornamento**: logica.
13. **`$spacers` che cambiano il significato di utilità già usate** (`mb-3`, `mb-5`): rischio di regressione visiva sull'app esistente: va applicato per gradi.
14. **Cifre tabulari di Unbounded**: dipende dal font **[V]**.
15. **Il bottone Google** (iframe): non si stila con i token e le regole di Google valgono (D2).

Stima complessiva (per orientarsi, non una promessa): variabili Sass ≈ 60; blocchi CSS per tema ≈ 40 righe; componenti nuovi ≈ 350–450 righe di SCSS (card timbri, dialog, coda, chip, campo invalido, focus) più ~3 `@font-face`; logica Vue per annulla, layout stabile, segnale nuova richiesta, validazione al tocco, segnaposto dei ruoli.

## 8. Esempio di blocco `variables` (illustrativo, NON applicato)

```scss
// --- tema chiaro (le variabili *-dark fanno quello scuro) ---
$min-contrast-ratio: 4.5;               // sparisce l'hack «3» (D1-a)
$color-contrast-dark: #1f1612;          // testo scuro sul primario
$primary: #f16417;
$danger: #b3261e;
$success: #14633b;
$body-bg: #f1ede0;        $body-bg-dark: #1a1410;
$body-color: #2a1f18;     $body-color-dark: #f4e9dc;
$body-secondary-color: #5f4e40;  $body-secondary-color-dark: #c0ad9c;
$body-tertiary-bg: #dfe5d2;      $body-tertiary-bg-dark: #31261e;
$border-color: #d6dac8;   $border-color-dark: #4a3b30;
$input-border-color: #7d6a58;    // field (chiaro); lo scuro (#9a8878) via CSS per tema
$input-border-width: 2px;
$link-color: #b43a0a;     $link-color-dark: #f4813f;
$input-btn-focus-width: 0;  $input-focus-box-shadow: none;  $btn-focus-box-shadow: none;
$font-family-sans-serif: "Instrument Sans", system-ui, sans-serif;
$headings-font-family: "Unbounded", system-ui, sans-serif;
$btn-font-family: "Figtree", system-ui, sans-serif;
$font-size-base: 1.0625rem;
$btn-font-weight: 700;  $headings-font-weight: 800;
$border-radius: .75rem; $btn-border-radius: .875rem; $card-border-radius: 1.125rem;
```
