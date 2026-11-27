# Report: f11 — F11 — Staff: coda, esito, header

- **Issue:** #82
- **Branch:** feat/f11-staff-queue
- **Data:** 2026-11-27

## Obiettivo

Coda dello staff, esiti e header (solo frontend, fuori dal TDD), secondo le «Conferme di F6»: card compatta con codice in evidenza, geometria stabile (D25), «Annulla» solo UI (D27), richiesta nuova sobria (D28), «Conferma» sempre attiva (D26), chip «Premio» (D23, D29), nome del cliente (B39, D30), errori col codice, banner di connessione, header cliccabile con menu dei locali (P6), «Esci» con conferma (D32), nessun ultimo locale ricordato (D33), pagina «I tuoi locali» (L01–L02) e «non autorizzato» (Q11). Solo la versione a una colonna (mobile); due colonne = F13.

## Decisioni e motivazioni

- **Stato per card** (`QueueCard.vue`, un solo componente per tutti gli stati: in attesa, in invio ritardato, invio, esito, «Scaduta/Già gestita»). La quantità vive nella card, quindi sopravvive al polling.
- **«Annulla» (D27):** timer di **4 s** (`UNDO_MS`) che ritarda la chiamata di Conferma **e** di Rifiuta; «Annulla» lo cancella, nessuna chiamata. Durante i 4 s la card mostra «Confermo N prodotti» / «Rifiuto la richiesta» (i timbri non si calcolano: la regola è del backend). Se si lascia la pagina entro i 4 s la chiamata **parte subito** (meglio che perdere il tocco); chiudendo la scheda del browser il tocco si perde (limite dichiarato).
- **Ordine:** dalla più nuova in alto (ordinamento client per `createdAt`); le card restano al loro posto finché non si preme «Chiudi». Tolti il «1°» e il bordo della prima card (con l'ordine invertito la prima da servire è in fondo).
- **Geometria (D25):** una richiesta che sparisce dalla coda del server o che dà `409` resta come card «Scaduta» / «Già gestita» con l'altezza che aveva da in attesa (`min-height` misurata); `overflow-anchor: auto`; riga messaggio da 2 righe sempre riservata; i tocchi nei 300 ms dopo un cambio della lista sono ignorati (voce «audace» di 21 §5.6, la lascio: si toglie con `TAP_GUARD_MS = 0`).
- **Testo di «Scaduta/Già gestita»:** da `reason` del 409 (B38). Se la richiesta sparisce dalla coda **senza** nostra azione non c'è `reason`: stima dall'orologio del dispositivo (`expiresAt` già passato → «Scaduta», altrimenti «Già gestita da un collega» generico). È indicativa.
- **Premio:** card in attesa con card piena → chip «Premio» + «Consegna: premio» (D29, nessun nome). Nell'**esito** uso però il nome che arriva nella risposta del confirm («Consegna: Caffè E2E»), perché non viene dalla coda: se D29 va letto anche per l'esito, è una riga da togliere.
- **Header (P6):** `VenueSwitcher` al posto del wordmark nelle pagine staff (coda e storico del locale): con più locali il chip apre il menu (un clic cambia locale, resta nella stessa pagina), voce «Tutti i locali» verso `/staff`; con un solo locale è solo un'etichetta. Rimossa la voce «Cambia locale» dal burger (duplicata). Nessun locale ricordato (D33).
- **«Esci» con conferma (D32)** per **tutti** gli utenti (il menu è unico), con `<dialog>` nativo.
- **Lampeggio del bordo (D28, da provare):** alone sul bordo, 2 impulsi da 1,1 s, solo box-shadow; con `prefers-reduced-motion` diventa un bordo fisso. Nessuna vibrazione, nessun suono. Anche il puntino «In ascolto» è fermo (D28: niente animazioni); la barra dell'Annulla (4 s) è l'unica animazione prevista dal design system.
- **Non fatti per non allargare:** preset 1·2·5 dello stepper; «Conferma N timbri» nel bottone (N sono prodotti: la regola è del backend); il testo della quantità alta usa la soglia 5 [V].
- **Contraddizione da segnalare:** la issue dice «Dopo F8; il nome del cliente dipende da B39»: B39 è in main, quindi usato. D30 dice «nome completo o username»: il backend dà solo `displayName` (`null` se anonimizzato/senza nome).

## Testi nuovi da confermare in dev

Coda: «Richieste», «N in coda · la più vecchia da X», «In ascolto · aggiornato alle HH:MM», «Nessuna richiesta in attesa» (esistente), «Nome non indicato» (ripiego senza nome), «da X» / «scade tra X», «Nuova», «Premio», «Consegna: premio», «Nuova promozione: la card riparte da zero», «N / M timbri · card piena», «prodotti consumati (premio compreso)», «Minimo 1.», «Massimo 50.», «Inserisci un numero intero da 1 a 50.», «Stai confermando N prodotti.», «Confermo N prodotti», «Rifiuto la richiesta», «invio tra N s», «Annulla (N s)», «Invio…», «Confermata HH:MM · +N timbri», «Rifiutata HH:MM · nessun timbro», «Consegna: {premio}», «Premio disponibile alla prossima visita», «Scaduta», «Già gestita», «Non più in coda», «Il cliente può rifare la richiesta.», «Un collega l'ha già confermata / rifiutata / gestita.», «La richiesta non è più disponibile.», «Chiudi», «Chiudi tutti», «↑ N nuove», «{codice} · {messaggio}», «{codice} · Esito non confermato: controlla la coda prima di riprovare.», banner «Connessione assente: la coda potrebbe non essere aggiornata (ultimo aggiornamento HH:MM). Riprovo…» / «Non riesco ad aggiornare la coda (errore N): …». Header: «Tutti i locali», «Locale attivo: X. Cambia locale». «Esci»: «Vuoi uscire?», «Per rientrare ti servirà un nuovo codice via email.», «Resta connesso», «Esco…». Locali: «I tuoi locali», «Non siamo riusciti a caricare i tuoi locali», «Titolare» / «Staff». Non autorizzato: titolo «Non sei autorizzato» + testo esistente.

## Assunzioni e cose da validare

- Soglia «quantità alta» = 5 e durata 4 s: da validare con lo staff.
- Lampeggio del bordo: da provare su telefono.
- Il tocco reale (dito, tastiera su schermo), il tablet e i due pannelli (F13) **non sono verificati**.
- Contrasti AA: controllo automatico (colore del testo vs sfondo composto) su tutti gli stati a 360 e 390 px, chiaro e scuro: 0 coppie sotto soglia; non sostituisce una verifica a occhio.
- La coda richiede ancora `forbidden` per 400/403/404 (stessa pagina per locale altrui o inesistente).

## File toccati e test

- Nuovi: `components/QueueCard.vue`, `components/VenueSwitcher.vue`, `components/SignOutDialog.vue`.
- Modificati: `views/StaffQueueView.vue`, `views/StaffVenuesView.vue`, `components/AppLayout.vue`, `components/AppHeader.vue` (slot `title`), `styles/components.scss` (additivo), `api/client.ts` (`ApiError.reason`), `api/endpoints.ts` (`displayName` in `QueueItem`), `utils/format.ts` (`sinceText`).
- e2e: `staff-input.mjs` (aggiornato), `t6d.mjs` (riscritto per la coda nuova: ora funziona, T8), `feedback.mjs` (sezione staff riscritta: niente più toast). Esito: `staff-input` 12 ✔, `t6d` tutto ✔, `feedback` 27 ✔, `account-delete` 16 ✔, `display-name` 15 ✔, `profile-cards` 14 ✔. `history.mjs` **non verde** per cose fuori scopo (paginazione a 25 righe, «Filtri · 1», testo «Richiesta approvata!» lato cliente): F12/F10, non toccato.
- Backend non toccato: nessun test backend aggiunto o cambiato (suite invariata).
- `type-check` e `build` puliti.

## Modifiche proposte ai documenti

### CODEBASE.md
Frontend: `QueueCard.vue` (card della coda, tutti gli stati), `VenueSwitcher.vue` (chip del locale nell'header), `SignOutDialog.vue` («Esci» con conferma); `ApiError.reason` (409 di confirm/reject); la coda è ordinata dalla più nuova; `AppHeader` ha lo slot `title`; il burger non ha più «Cambia locale».

### BACKLOG.md
F11 → fatta (solo mobile; il layout a due colonne resta F13). Nuove voci: stima di `reason` per le richieste sparite senza azione propria (servirebbe backend); annullamento vero lato backend resta D27 b.

## Lacune emerse e task suggerite

- `history.mjs` è rosso su più punti (F12/F10) e non è nello script `npm run e2e`.
- `PromotionNotice` variante `staff` ora non è più usata dalla coda (usa un chip): da valutare se toglierla.

## Problemi di ambiente

Nessuno.

## Cosa ho capito e cosa no

Chiaro il perimetro. Ambigui: D28 (nessuna animazione vs lampeggio da provare: seguita la seconda come prova) e D29 nell'esito (vedi sopra).
