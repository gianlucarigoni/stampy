# Report: f8 — F8 — Componenti base e pattern di errore

- **Issue:** #79
- **Branch:** feat/f8-base-components
- **Data:** 2026-11-27

## Obiettivo

Costruire i componenti base riusabili del design system dir-i in `stampy-frontend/src/components/ui/` (bottone, campo, avviso, chip e chip di stato, card, header e menu, scheletro, stato vuoto, riga di stato) e i pattern di errore §5.1–§5.6, applicandoli 1:1 alle viste esistenti. Solo frontend, fuori dal TDD.

## Decisioni e motivazioni

- **Toast: non costruito.** La issue lo elenca, ma `21-design-system.md` §4.12 dice «Toast: non servono» (un messaggio che sparisce da solo viola WCAG 2.2.1 e copre i controlli). Ho seguito il design system e ho costruito `AppStatusLine` (`role=status`, resta finché l'utente non interagisce). Correzione proposta al testo della voce F8: «toast» → «riga di stato».
- **Primari mai disabilitati, ovunque.** Login («Invia il codice», «Accedi»), nome, Elimina account (anche il pericolo pieno, D20), «Conferma» della coda. Il tocco con dato non valido non invia, mette il messaggio sotto il campo e porta il focus lì (`focusFirstInvalid`, `AppField`). In lavorazione: spinner + testo distinto, `aria-busy`, tocchi ignorati, mai `disabled`. Rimosso l'opacità dei disabilitati (`--bs-btn-disabled-opacity: 1`).
- **Errore di campo ≠ errore di sistema.** `AppField` riceve solo `error` (dato sbagliato); rete/5xx/429/Google vanno in un `AppAlert` in cima alla card e il campo resta neutro (login, nome, Elimina account). Verificato a vista: dopo un errore di rete `aria-invalid` non c'è.
- **429:** il bottone resta pieno; il tocco prima della scadenza mostra «Aspetta ancora N min» (riga di stato, testo che cambia al massimo una volta al minuto). **Non** ho cambiato l'etichetta del bottone in «Riprova tra N min» (cambierebbe a ogni secondo nel nome accessibile, A11Y-03).
- **Testi:** i testi esistenti restano letterali (AGENTS.md, e gli e2e li citano). Nuovi testi, necessari solo per i nuovi stati e presi da `21 §8`: «Controlla l'indirizzo: manca la @ o il dominio.» (email vuota/non valida, anche per il 400 del backend al posto di «Email non valida»), «Scrivi le 6 cifre.», «Aspetta ancora N min», «Vai alla pagina iniziale» (404, uscita obbligatoria del pattern di pagina). Tutti da confermare in dev.
- **Stepper della coda:** `AppIconButton` 44×44 con icone Phosphor; al minimo/massimo `aria-disabled` + icona quieta, non più `disabled`. Il messaggio «Minimo 1» (`role=status`) non c'è: è logica di F11.
- **Icone:** 25 Phosphor SVG (MIT) copiate come dati di path in `components/ui/icons.ts`, inline, nessuna libreria. Qualcuna è in più (inserita per F9–F12): da potare se non serve.
- **`$spacers` non introdotti:** nessun componente li richiede (21b §7.13).
- **Pagina di prova:** route `/dev/components`, solo con `import.meta.env.DEV` (la route e l'import spariscono dalla build; verificato con grep su `dist/`). Scelta: route in dev, non file in `e2e/`.
- **Stile:** nuovo `styles/components.scss`, importato da `stampy.scss`; rimossi `.btn-outline-primary`, `.profile-row` (non più usati) e il vecchio `.form-control-code`; `.filter-toggle` aperto ora è `surface-2` + bordo `text`, non arancione (21 §4.1, ST-6).
- **Altre sostituzioni 1:1:** `AppLayout` usa `AppHeader`, `AppIconButton`, `AppMenu` (voci con icona, 48 px, «Esci» dopo un separatore, segnaposto mentre i ruoli non sono noti); `ProfileView` (card-link, bottoni, alert), `StaffVenuesView` (scheletro al posto di «Caricamento…»), `CustomerVisit/RequestView`, `SessionErrorView`, `StaffHistoryView`, `StampProgress`, `RequestHistory` (solo alert e toggle).
- **Non toccato (di F9–F12):** layout e testi delle schermate, `RewardDialog`, `PromotionNotice`, esiti della coda (con glifi Unicode ✔ ⚠), il pannello filtri, «Azzera» (resta arancione).

## Assunzioni e cose da validare

- Contrasti: misurati in Chromium sui colori calcolati di ogni testo della pagina di prova (soglia 4,5, o 3 per testo grande), 360 e 390 px, chiaro e scuro: nessuna violazione. Contrasti di hover/premuto/anello: solo dai token (`contrasts-21.mjs`), non rimisurati sui pixel.
- Target ≥ 44 px: misurati su tutti i controlli visibili della pagina di prova: nessuno sotto 44 px. Nessuno scroll orizzontale a 360 e 390 (chiaro e scuro). Nessun salto del bottone al comparire dell'errore di campo (spostamento 0 px).
- Visti a occhio (screenshot Playwright): hover, premuto (secondario), focus da tastiera, campo invalido con focus, campo codice con focus, tutti i bottoni in lavorazione, alert, chip, card, scheletro, stato vuoto, in chiaro e scuro.
- **Non verificato:** telefono reale, screen reader (VoiceOver/TalkBack), tab order oltre il controllo a vista di focus sequenziale, premuto del primario e del pericolo ripreso a pixel, hover dei componenti su dispositivo con puntatore, `prefers-reduced-motion`, header e menu aperto in tutte le viste (verificato solo via e2e e pagina di prova), zoom 200%.

## File toccati e test

- Nuovi: `components/ui/` (`AppIcon`, `AppButton`, `AppIconButton`, `AppField`, `AppAlert`, `AppChip`, `AppStatusChip`, `AppCard`, `AppSkeleton`, `AppEmptyState`, `AppStatusLine`, `AppMenu`, `icons.ts`), `styles/components.scss`, `utils/focus.ts`, `views/dev/ComponentsDemo.vue`.
- Modificati: `styles/stampy.scss`, `router/index.ts`, `AppHeader`, `AppLayout`, `EmailLogin`, `DisplayNameForm`, `RequestHistory`, `StampProgress`, e le viste `Profile`, `DeleteAccount`, `CustomerVisit`, `CustomerRequest`, `SessionError`, `NotFound`, `StaffVenues`, `StaffHistory`, `StaffQueue`.
- e2e: aggiornate **3 asserzioni** che testavano «bottone disabilitato» (`staff-input` «Confirm is disabled», `email-request` ×2): ora verificano il contrario e il nuovo comportamento (focus sul campo; «Aspetta ancora»). Nessun altro e2e toccato.
- Esiti e2e (baseline → dopo): `staff-input` 7 → 8, `account-delete` 16 → 16, `display-name` 15 → 15, `profile-cards` 14 → 14, `email-request` 18 → 20; `feedback` e `history` **rotti già su main** (T8, #69), stessi fallimenti prima e dopo, non toccati. `npm run type-check` e `npm run build` puliti. Backend non toccato: suite backend invariata (488).

## Modifiche proposte ai documenti

### CODEBASE.md
Nella voce **Stile** (§8): «Componenti base (F8, 2026-11-27) in `components/ui/`: `AppButton` (primari mai `disabled`; `busy` = spinner + etichetta distinta + `aria-busy`, tocchi ignorati; varianti primary/secondary/link/danger/danger-outline; `to`/`href`), `AppIconButton` (44×44, `limited` = `aria-disabled`), `AppField` (errore al posto del suggerimento, 2 righe riservate; solo i dati sbagliati sono `error`), `AppAlert` (icona + testo + colore; error/warning/success/info/prize), `AppChip`/`AppStatusChip`, `AppCard`, `AppSkeleton`, `AppEmptyState`, `AppStatusLine` (al posto dei toast), `AppMenu`, `AppIcon` (Phosphor inline da `icons.ts`). Stile in `styles/components.scss`. `utils/focus.ts#focusFirstInvalid`. Pagina di prova `/dev/components` solo in sviluppo.»

### BACKLOG.md
- **F8 (#79)** → §8 con la data 2026-11-27. Testo «toast» → «riga di stato» (§4.12 del design system).
- Da portare a F9–F12: applicare i testi del §8 del design system (oggi solo i nuovi stati li usano); «Azzera» ancora arancione (F12); esiti della coda con glifi Unicode, «Minimo 1» e alert di quantità alta (F11); `AppAlert` prize per «Premio disponibile» (F10); etichetta «Riprova tra N min» nel bottone per il 429 (da decidere: nome accessibile).
- Gli e2e `staff-input` e `email-request` ora asseriscono i bottoni non disabilitati.

## Lacune emerse e task suggerite

- Potare le icone non usate di `icons.ts` quando F9–F12 saranno chiuse.
- Un e2e per la pagina `/dev/components` (overflow, target, salto del layout) potrebbe diventare uno script di regressione.

## Problemi di ambiente

Nessuno. Gli e2e hanno lasciato `profile-cards-*.png` in `stampy-frontend/` (artefatto di `profile-cards.mjs`, non committato).

## Cosa ho capito e cosa no

- La task chiede «toast» e il design system dice di non farli: ho seguito il design system (vedi sopra).
- «Non rifare testi» e «testi proposti» sono in tensione: ho usato i testi proposti solo dove nasce uno stato nuovo.
- Non so se per il 429 il proprietario volesse davvero l'etichetta nel bottone (§5.1): non fatto per l'accessibilità.
