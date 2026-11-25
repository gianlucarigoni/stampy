# Report: b8 — B8 — "Riaggiungi card" per una card active

- **Issue:** #7
- **Branch:** feat/b8-riaggiungi-card
- **Data:** 2026-11-23

## Obiettivo

Portare nel Profilo il bottone ufficiale «Add to Google Wallet» (italiano) al posto di un bottone nostro, **senza collegarlo**, per vedere come sta nei due temi. Il collegamento (elenco dei locali + link di salvataggio) è la issue #62 (B25); la callback di Google è #61 (B24).

## Decisioni e motivazioni

- Asset presi da `add-to-wallet-svg.zip` di Google, non modificati: `primary` (319×50) e `condensed` (199×55), in `public/google-wallet/`. Alternativa scartata: ridisegnarli (vietato dalle linee guida).
- Il Profilo mostra un **modello statico** di card di locale («Bar Aurora», colore `#1e3a5f`, 3/10 timbri) con il bottone ufficiale dentro, tutto in HTML inline con le utility Bootstrap (nessun componente né classe nuova, decisione del 2026-11-25; componente e SCSS del bottone tolti). Card ridisegnata il 2026-11-25: parte alta col colore del locale (sfumatura, logo, pillola «3/10», timbri con spunta), parte bassa su una superficie leggermente più chiara dello sfondo (`bg-body-tertiary` + bordo, così la fine della card si vede nei due temi) con testo e bottone. Il bottone nero sta così su fondo chiaro (regola di Google) nel tema chiaro; nel tema scuro sta su fondo scuro e si distingue solo dal bordo dell'SVG (da valutare). Verificato con Playwright a 390 e 360 px, tema chiaro e scuro, senza scroll orizzontale (auth e `venues/mine` simulate nel browser); alto 48 px; `<picture>`: primario da 380 px in su, sotto il condensed. I dati sono finti: colore, logo e testi veri verranno dal branding del locale (#62).

## Assunzioni e cose da validare

- **Dimensione rispetto agli altri bottoni** (letto il 2026-11-25 su due pagine di brand guidelines Google, testo identico): «uguale o più grande» degli altri bottoni, mai più piccolo; altezza minima 48 dp; il confronto è con «other similar buttons or elements of the page». Google NON dice se contano altezza, larghezza o area, né cosa sia «full-width». Scelta del proprietario: dimensioni attuali (48 px di altezza, come «Elimina account»; larghezza 306 px o 174 px col condensed, contro i 332 px di «Elimina account» a 390 px). Rischio residuo basso ma non azzerabile: da riconsiderare se la revisione Google contesta il bottone.
- Resa verificata con Playwright (screenshot a 390/360 px, tema chiaro e scuro) e dal proprietario a vista; e2e (`npm run e2e`) non eseguiti (DB del worktree vuoto). `vue-tsc` pulito.
- Il nome dei file italiani dentro lo zip (`it_add_to_google_wallet_*`) è verificato sullo zip scaricato il 2026-11-23.

## File toccati e test

- File: `src/views/ProfileView.vue`, `public/google-wallet/*.svg`.
- Test: nessuno (frontend escluso dal TDD); backend invariato, suite 376 → 376 (`verify.sh`, 2026-11-25).

## Modifiche proposte ai documenti

### CODEBASE.md
- §frontend, `views/ProfileView.vue`: aggiungere «contiene un **modello statico** di card di locale (Bar Aurora, dati finti, bottone ufficiale «Aggiungi a Google Wallet» non collegato); va sostituito dall'elenco reale di #62 (B25)».
- Asset del bottone in `stampy-frontend/public/google-wallet/` (SVG italiani ufficiali, primary e condensed; `<picture>` cambia a 380 px).

### BACKLOG.md
- B8: la parte «bottone ufficiale al posto del nostro» è fatta (2026-11-25) ma **non** il «Riaggiungi» vero: la voce resta aperta e passa a B25 (#62, elenco dei locali + link di salvataggio); B24 (#61) è la callback di Google. Il §8 può registrare solo il bottone statico.
- Nuova nota in V2/§6.1: la regola «uguale o più grande degli altri bottoni» di Google non precisa se conti la larghezza (letto su due pagine il 2026-11-25).

## Lacune emerse e task suggerite

- Collegamento del bottone ed elenco dei locali: #62. Callback di Google: #61.
- **Attenzione**: con il merge, ogni utente vede nel Profilo la card finta «Bar Aurora» (anche owner e staff). Scelta del proprietario per mostrarla durante lo sviluppo; va nascosta o sostituita prima di un uso reale.
- Il colore del testo sulla parte colorata andrà scelto in base alla luminosità del `backgroundColor` del locale (un colore chiaro renderebbe illeggibile il bianco).

## Problemi di ambiente

Il primo `worktree-start.sh` si è fermato: «il container 'stampy-db' non risponde» (Docker spento). Dopo l'avvio di Docker è partito senza problemi.

## Cosa ho capito e cosa no

- Le istruzioni erano chiare. La task è cresciuta rispetto alla issue #7 (da «riaggiungi per card active» a «bottone ufficiale + card statica»): il resto è stato spostato su #61 e #62.
- Backend non toccato, quindi niente proposta di test né TDD; verifica finale: typecheck + suite 376 ✔ (base 376).
- Server di sviluppo del worktree già acceso sulla porta 5174 (dal proprietario): usato per i controlli Playwright, con auth simulata nel browser.
