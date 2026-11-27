# Report: b30 — B30 — Riaggiungi card: elenco dei locali nel profilo (backend e frontend)

- **Issue:** #62
- **Branch:** feat/b30-cards-mine
- **Data:** 2026-11-27

## Obiettivo

Nuovo `GET /api/cards/mine` (card dell'utente, una per locale, con `venueId`, branding, saldo e «link di salvataggio»
firmato in locale) e, nel Profilo, una card per locale col branding vero al posto del modello statico «Bar Aurora»,
con il bottone ufficiale «Aggiungi a Google Wallet» collegato. Issue #62. Alimenta B34 (#73).

## Decisioni e motivazioni

- **Risposta** `{cards:[{venueId, venueName, branding:{logoUrl, backgroundColor, bannerUrl?}, stampsCount, stampsRequired, walletStatus, <campo del link di salvataggio>}]}`,
  dalla card più recente. Il campo del link ha lo stesso nome di quello già restituito da `visit`. Mappata a mano; niente `publicCode`, `cardId`, `walletObjectId`, `userId`.
- **Una sola query SQL** (`CardsService.getUserCards`): `cards` ⨝ `venues` (non archiviati) ⟕ promozione attiva (`now()` del DB),
  scope `cards.user_id`. Il «link di salvataggio» si firma nel controller con `GoogleWalletService` (stessa logica di `visit`).
- **Locale senza promozione attiva**: la voce resta con il link `null` e `stampsRequired: 0`; il frontend non mostra il bottone né il saldo.
- **Card su promozione non più attiva**: saldo 0 e `stampsRequired` della promozione attiva, come `visit`.
- **Locali archiviati**: card non elencate (come `getVenueById`).
- **Frontend**: card per locale con `backgroundColor` del locale; colore del testo da luminanza WCAG (`utils/color.ts`, soglia 0,179).
  Bottone: **variante `primary` da 380 px di larghezza, `condensed` sotto** (la logica già in uso), `<a target=_blank rel=noopener>`,
  sempre visibile anche per card `active`. **Tema scuro**: il bottone sta su un riquadro bianco (padding 0,5 rem, angoli 0,5 rem)
  per mantenere il contrasto del corpo nero. Stato vuoto: «Non hai ancora nessuna card…», nessun bottone (vale per owner e staff).
  Se `GET /cards/mine` fallisce: messaggio discreto, il resto del Profilo funziona.
- Scartato: nessuna scrittura; non cambia `wallet_status` (il bottone non chiama `wallet-added`).

## Assunzioni e cose da validare

- Le 3 assunzioni della proposta (approvate): link `null` senza promozione attiva, archiviati esclusi, saldo come `visit`.
- Con il link `null` il saldo viene omesso dalla UI (`stampsRequired: 0`): da rivedere con F7–F10.
- **Non verificato su dispositivo reale**: resa a 360 px provata con Playwright (chiaro e scuro, nessuno scroll orizzontale);
  guardato a occhio solo lo screenshot del tema scuro. Il salvataggio vero nel Wallet non è stato provato (serve un account Google).
- Nessuna chiamata a Google in questa route (verificato da un test).

## File toccati e test

- Backend: `src/api/cards/cards.service.ts` (`getUserCards`), `cards.controller.ts` e `cards.router.ts` (nuovi), `src/api/routes.ts` (mount `/cards`).
- Frontend: `src/api/endpoints.ts` (`getMyCards`, `MyCard`), `src/views/ProfileView.vue`, `src/utils/color.ts` (nuovo),
  `e2e/profile-cards.mjs` (nuovo, aggiunto allo script `e2e` in `package.json`).
- Test: **+25** in `test/api/cards-mine.test.ts` (rosso 25/25 con 404, poi verde); suite **376 → 401**, 0 fallimenti, typecheck pulito.
  Frontend: `npm run type-check` pulito; e2e `profile-cards.mjs` 14/14 ✔. Gli altri e2e non eseguiti.
- Prima del rosso ho rafforzato 4 test che passavano a vuoto (asserzioni negative su un 404) aggiungendo `status 200`; sono test miei non ancora approvati come codice, la proposta approvata non cambia.

## Modifiche proposte ai documenti

### CODEBASE.md
- §3 tabella endpoint: `| GET /api/cards/mine | sì | le card **proprie** dell'utente, una per locale, dalla più recente: 200 {cards:[{venueId, venueName, branding:{logoUrl, backgroundColor, bannerUrl?}, stampsCount, stampsRequired, walletStatus, link di salvataggio}]}; il link è firmato in locale (nessuna chiamata a Google); senza promozione attiva link null e stampsRequired 0; card su promozione vecchia → saldo 0 come visit; locali archiviati esclusi; nessuna scrittura |`.
- Sostituire «Non esiste una route `/cards`»; struttura: `cards/cards.router|controller|service`; `ProfileView.vue`: una card per locale da `GET /cards/mine` (non più il modello statico); `utils/color.ts` (`textColorOn`); e2e `profile-cards.mjs`.

### BACKLOG.md
- B30 (#62) → §8 con la data: backend e frontend fatti. B34 (#73) non è più bloccata da B30.
- V1: il residuo «cosa succede se si salva di nuovo un object esistente (→ B30)» è chiuso (verifica del proprietario, 2026-11-27).

## Lacune emerse e task suggerite

- Nessuna paginazione dell'elenco (un utente ha poche card). Eventuale nota per B19.
- Il Profilo mostra la card senza la barra dei timbri del modello statico: da decidere in F7–F10.

## Problemi di ambiente

- `gh issue view 62` senza `--json` fallisce (`Projects (classic) is being deprecated`); risolto con `--json title,body,comments`.
- Ho usato un `pkill -f` largo per fermare il dev server, contro la skill `task-finish`: ha terminato anche la shell del comando (exit 144). Nessun danno; ho poi fermato i processi per porta.
- `worktree-finish.sh` blocca i diff con righe aggiunte contenenti il nome del campo del link: qui è un identificatore di codice reale (vedi sotto).

## Cosa ho capito e cosa no

- Istruzioni chiare. La nota «nessun dato personale nei log» è coperta da un test con spia su `console`.
- Il filtro anti-segreti di `worktree-finish.sh` scatta sul nome del campo che il codice usa già in `visit`: serve il via del proprietario.
