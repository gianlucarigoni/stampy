# 01b · Componenti interattivi e stati

Fonte: `src/styles/stampy.scss` (Bootstrap 5.3 Sass), template `.vue`. Letti **tutti** i `.vue` e lo SCSS.
Legenda: ✅ esiste · ⚠ ereditato da Bootstrap (non verificato a vista) · ❌ manca.
«Solo tablet/PC» = lo stato serve solo con puntatore (su telefono non esiste hover).

## Regole globali (valgono per tutti)

- **Focus**: `:focus-visible { outline: 3px solid #f16417; outline-offset: 2px }` ✅ globale. In più Bootstrap aggiunge `box-shadow` di focus ai `.btn`/`.form-control` (`$input-btn-focus-width: .2rem`): **doppio anello** (outline + ombra) — da verificare a vista.
- **`main:focus`** senza outline (la route sposta il focus su `<main>`): voluto.
- **`prefers-reduced-motion`**: rispettato solo da `.dot` e dal bottone Google.
- **Target touch**: `.btn` min 3rem (48px), `.btn-link` 2.75rem; bottoni header 44×44 (inline style).
- Nessuna transizione/animazione di stato (a parte `.dot` 0.2s e il bottone Google 0.15s), nessuno stato `loading` con spinner: il «loading» è sempre **testo** («Invio…», «Un momento…», «Caricamento…»).

## Inventario

### 1. Bottone primario `.btn.btn-primary` (arancione)
- **Dove**: Login («Invia il codice», «Accedi»), «Riprova» ovunque, Visita («Aggiungi a Google Wallet» come `<a>`, «Richiedi il timbro»), «Richiedi di nuovo», «Conferma» coda, «Chiudi» del dialog, DisplayNameForm («Continua»/«Salva»), «Invia un nuovo codice» quando il codice è morto.
- **Esistenti**: default ✅ · hover ⚠ (Bootstrap scurisce) · active/pressed ⚠ · focus-visible ✅ · disabled ⚠ (opacità .65) · loading ✅ solo come testo («Invio…», «Verifica…», «Salvo…») ma **senza spinner**.
- **Mancanti**: ❌ nessun indicatore visivo di loading (solo testo); ❌ nessuna variante «successo/fatto» sul bottone. Contrasto bianco su arancione ≈3.2:1 (soglia abbassata a 3 di proposito in `$min-contrast-ratio`): **da riesaminare nella critica** (sotto 4.5:1 per testo normale).
- **Come catturare** (Playwright): default → screenshot; hover → `locator.hover()` *(solo tablet/PC)*; pressed → `hover()` + `page.mouse.down()` senza `up()` *(su telefono: touch-active)*; focus → `page.keyboard.press('Tab')` fino al bottone; disabled → form vuoto (login: email vuota ⇒ «Invia il codice» disabled); loading → rallentare la rete (`page.route` con delay su `/auth/...`) e catturare «Invio…».

### 2. Bottone outline `.btn-outline-primary`
- **Dove**: menu ☰ e Indietro (header), «Filtri», stepper − / + della coda, link locali in `/staff`, bottoni della Visita (variante invertita dopo il tap Wallet).
- **Esistenti**: hover ✅ (forzato testo bianco, riempimento) · active ⚠ · focus ✅ · disabled ✅ (− a 1 / + a 50).
- **Mancanti**: ❌ stato `selected/aperto` solo per «Filtri» (`.filter-toggle.active` ✅ lì); il burger menu **non cambia aspetto da aperto** (esiste solo `aria-expanded`) → ❌ stato «menu aperto» del bottone.
- **Cattura**: come §1; menu aperto → click sul burger; disabled → stepper a 1 (−) o digitare 50 (+).

### 3. Bottone `.filter-toggle` e `.filter-reset`
- **Dove**: Storico (Filtri / Azzera).
- **Esistenti**: filtro: hover (75% tinta) ✅, aperto/active ✅; reset: arancione solo se abilitato ✅, pressed arancione scuro ✅ (`#c2410c`), disabled grigio ✅ (ma `Azzera` compare solo con filtri attivi, quindi il disabled di fatto non si vede: **non sicuro**).
- **Cattura**: aprire Filtri (click); Azzera → impostare un filtro (select Esito) e catturare hover/pressed.

### 4. Bottoni danger
- `btn-outline-danger` (+ `.btn-danger-soft`): «Rifiuta» (coda), «Elimina account» (profilo). `btn-danger` pieno: elimina account (intro, finale).
- **Esistenti**: hover/active definiti per `.btn-danger-soft` ✅; «Rifiuta» usa il danger standard Bootstrap ⚠ (non il rosso tematico `--stampy-danger`: **incoerenza** da segnalare).
- **Mancanti**: ❌ nessuna conferma a due passi su «Rifiuta» (il click rifiuta subito) — è una scelta UX, non uno stato mancante; da valutare nella critica.
- **Cattura**: coda con richiesta; per «Elimina» arrivare allo stato intro senza confermare.

### 5. Bottone `.btn-link` (testuale)
- **Dove**: «Modifica nome», «Annulla», «Cambia email», «Invia un nuovo codice».
- **Esistenti**: hover ⚠ (sottolineato Bootstrap) · focus ✅ · disabled ⚠.
- **Mancanti**: ❌ nessun segnale di «area toccabile» (nessun bordo/riempimento) e allineamento a sinistra con `px-0`; contrasto del link arancione su chiaro da verificare.
- **Cattura**: login, passo codice; «Invia un nuovo codice» disabled → subito dopo l'invio con attesa 429, o mentre `busy`.

### 6. Bottone «Ok» esito (coda) `.btn-outline-secondary`
- Solo default/hover ⚠/focus ✅. Cattura dopo una conferma.

### 7. Input testo / email / codice `.form-control`
- **Dove**: Login email, Login/Elimina codice (`.form-control-code`, 1.75rem, spaziato), DisplayNameForm, filtri storico (Min/Max testo), quantità in coda (`.quantity-input`), date nel filtro.
- **Esistenti**: default ✅ · focus ⚠ (bordo+ombra Bootstrap, **più** outline globale) · disabled ✅ (codice morto) · invalid ✅ (`is-invalid` in DisplayNameForm; `aria-invalid` altrove ma **senza** classe `.is-invalid` nel login e nella quantità) · readonly (busy) ✅.
- **Mancanti**: ❌ stato invalid **visivo** nel campo email/codice (l'errore sta solo nell'alert sopra al bottone) e nella quantità (solo testo rosso sotto); ❌ stato valid/success; ❌ placeholder: nessun input ne ha uno (`placeholder` assente).
- **Cattura**: focus → `locator.focus()` o Tab; disabled → codice morto (**5** codici sbagliati / aspettare 5 min; con `OTP_PROVIDER=console` si può digitare un codice errato 5 volte; correzione della chat 3: prima diceva 3); invalid → DisplayNameForm con 1 carattere; quantità invalida → cancellare il numero.

### 8. Select `.form-select` (Esito)
- Default ✅, focus ⚠, disabled ❌ mai. Il menu a tendina aperto è **nativo del browser/OS** (non catturabile in modo affidabile con Playwright headless: **non sicuro**; usare `page.screenshot` non lo mostra → segnare «non catturabile»).

### 9. Input data `type=date`
- Stato nativo del browser (picker non catturabile in modo affidabile). Errore «date nel futuro» solo come testo rosso ⚠.
- **Cattura**: filtro con `from` > `to` o data futura (via URL `?from=2099-01-01`: la query viene scartata in silenzio, quindi usare valori inseribili: Al < Dal).

### 10. Switch / toggle / checkbox / radio / tab / chip
- ❌ **Non esistono** in tutta l'app (nessun `switch`, `form-check`, tab, chip, badge cliccabile). Le «pillole» (`PromotionNotice staff`, contatore 3/10 del modello Wallet) sono solo decorative.

### 11. Stepper quantità (coda)
- − / input / + (`grid 3.5rem 1fr 3.5rem`). **Esistenti**: disabled ai limiti ✅, aria-label ricco ✅.
- **Mancanti**: ❌ nessun feedback di «pressione continua»; ❌ lo `<input type=number>` mostra le frecce native su desktop (spin buttons) — su PC ⚠ da verificare.
- **Cattura**: richiesta in coda; − disabled (default 1); digitare 50 → + disabled; cancellare → invalid.

### 12. Card cliccabili
- **`.profile-row`** (Profilo → «Storico richieste»): hover ✅ (tinta arancione 15%) *(solo tablet/PC)*; pressed ❌ (nessun `:active`), focus ✅ (outline globale), cursor da link ✅.
- **Link locale** in `/staff`: sono bottoni outline (vedi §2), non card.
- Le altre card (`card card-body`) **non sono cliccabili**: l'elemento riga storico/coda non ha hover né click.
- **Cattura**: profilo cliente; hover *(solo tablet/PC)*; pressed = `mouse.down()`; focus con Tab.

### 13. Link
- `RouterLink` «I tuoi locali» (non autorizzato) e `.dropdown-item`: hover ⚠, focus ✅. Il link «Aggiungi a Google Wallet» è `<a class="btn">` ( → vedi §1 ).
- **Mancanti**: ❌ stato `visited` irrilevante; ❌ nessun link ha icona/indicatore di «esce dall'app» (il link Wallet apre in nuova tab).

### 14. Menu a tendina ☰ (`#app-menu`, dropdown Bootstrap senza JS)
- **Esistenti**: chiuso/aperto ✅ (`v-show`), voce attiva arancione ✅, hover tinta 15% ✅ *(solo tablet/PC)*, focus ✅, Esc ✅, click fuori ✅, `aria-expanded/controls` ✅.
- **Mancanti**: ❌ nessuna animazione di apertura; ❌ nessuna navigazione con frecce ↑↓ (solo Tab); ❌ bottone ☰ senza stato «aperto» visivo; ❌ nessun overlay sotto (non è un bottom sheet); ❌ voce `Esci` non è visivamente distinta (nessun colore «uscita»).
- **Cattura**: click sul burger → screenshot aperto, con 1/2/3 voci (cliente: Profilo+Esci; staff in locale: +Storico; staff multi-locale: +Cambia locale). Hover su una voce (`hover()`) *(solo tablet/PC)*; voce attiva = trovarsi in `/profile`.

### 15. Dialog modale `RewardDialog` (`<dialog>`)
- **Esistenti**: aperto ✅, backdrop 60% ✅, focus su «Chiudi» (`autofocus`) ✅, Esc ✅.
- **Mancanti**: ❌ nessuna animazione di entrata/uscita; ❌ non si chiude con click sul backdrop (voluto); ❌ nessuna celebrazione visiva («Premio sbloccato!» è solo testo).
- **Cattura**: cliente su `/r/:id` con richiesta **approvata** che riscatta un premio (card a soglia, vedi `01-screen-map.md`). ⚠ richiede preparazione dati; il dialog si chiude una volta sola (flag in localStorage per richiesta: per ricatturare, ripulire `localStorage`).

### 16. Alert Bootstrap (`.alert-danger/-warning/-success`) e messaggi di stato
- Solo stati statici; `role=alert` / `status`. Non c'è chiusura (✕) né animazione. Il box «feedback» della coda è **sticky** `top:0` (può sovrapporsi al contenuto: da verificare a vista).
- **Cattura**: login con email errata (400 «Email non valida»: attenzione, la validazione browser `type=email` blocca prima; usare `a@b` valido per il browser ma rifiutato dal server, **non sicuro**), 429 attesa (inviare più codici di fila), esito coda (confermare), session-error (backend spento).

### 17. Pallini `StampProgress` (`.dot`)
- Vuoto (bordo arancione) / pieno ✅ con transizione 0.2s; card piena = alert di successo. Nessuno stato «appena aggiunto» animato ❌.
- **Cattura**: richiesta pending (bassa/alta), approvata con timbri, card piena (soglia raggiunta).

### 18. Bottone Google («Continua con Google»)
- Doppio: finto visibile (`.google-signin-face`) + vero Google sopra, trasparente. Hover ✅ via `:hover` del contenitore, focus ✅ via `:focus-within`, disabled ❌ (il form email si disabilita ma questo no). Su **tablet/PC** l'hover può non registrarsi sopra l'iframe (nota nel CSS).
- **Cattura**: richiede lo script Google (rete). **Non sicuro** che nell'ambiente di cattura il bottone compaia.

### 19. Bottone ufficiale «Aggiungi a Google Wallet» (profilo, modello statico)
- `<button>` trasparente con SVG ufficiale (`it` ≥380px, `it-condensed` sotto); **non fa nulla** (modello). Hover/pressed/focus: ❌ nessuno stile (solo outline globale al focus). Da trattare come asset di marca (regole Google: non modificabile).

## Riepilogo degli stati MANCANTI più rilevanti

1. Nessun indicatore visivo di caricamento (spinner/skeleton): solo testo.
2. `:active` assente su `.profile-row` e sul bottone Wallet; il resto lo eredita da Bootstrap.
3. Stato «invalid» visivo mancante su email/codice/quantità (solo alert o testo).
4. Bottone ☰ senza stato «aperto»; menu senza frecce.
5. Nessun switch/tab/chip: se il redesign ne introduce, vanno disegnati da zero.
6. Nessuna transizione tra stati (pagine che cambiano di colpo).
7. Danger incoerente («Rifiuta» usa il danger standard; «Elimina» usa `--stampy-danger`).

## Stati che servono **solo** per tablet/PC (hover/cursore)

hover di: bottoni (tutti), `.profile-row`, voci del menu, `.dropdown-item`, `.filter-toggle`, bottone Google, link, righe di storico/coda se le renderemo cliccabili. Su telefono si cattura solo `pressed` (touch) e `focus` da tastiera esterna.
