# Report: f12 — F12 — Storico condiviso: righe per giorno, «Carica altri», filtro per locale

- **Issue:** #83
- **Branch:** feat/f12-storico-condiviso
- **Data:** 2026-11-27

## Obiettivo

Un solo componente (`components/RequestHistory.vue`) per lo storico del cliente (`/history`, `GET /requests/mine`) e dello staff/owner (`/staff/:venueId/history`): righe raggruppate per giorno, chip di stato, premio col nome, filtri con errore accanto al campo e chip dei filtri attivi, stati (vuoto a due cause, scheletro, errore con «Riprova», filtri non validi), «Carica altri» a cursore, filtro per locale solo per il cliente. Solo frontend, fuori dal TDD.

## Decisioni e motivazioni

- **Fuso orario (scelta richiesta dalla task): il giorno locale del dispositivo**, sia per «Oggi / Ieri» sia per i filtri. «Dal» e «Al» partono come istanti reali (inizio del giorno locale, ultimo millisecondo del giorno locale) in ISO: il backend li legge come istanti e non come giorni UTC, quindi **nessuna modifica backend serve**. È già il comportamento precedente, confermato. Limite noto: un dispositivo in un fuso diverso da quello del locale vede i giorni del proprio fuso. Alternativa scartata: fuso del locale (non esiste un campo `timezone` sul locale). **Proposta (non fatta):** se serve il fuso del locale, aggiungere `venues.timezone`.
- **Contatore totale:** «N richieste» è `total` del backend (non le righe caricate); sotto la lista «Mostrate X di N» (`role=status`) finché ci sono altre pagine.
- **Riga staff:** riga principale = codice card (design 4.8); il `displayName` (B39) va nella seconda riga, davanti al dettaglio («Marta · 2 timbri»). Il cliente vede il nome del locale e non il proprio `displayName`.
- **Riga con premio:** chip «Premio» al posto di «Approvata», fondo `prize-tint` con barra a sinistra, seconda riga «Premio riscattato: <nome>» (D23: un verbo, «riscattato»; il nome è `reward`, B33). Con più premi: «2 premi riscattati: <nome>».
- **Filtro per locale (D21):** solo `audience="customer"`, solo se il cliente ha almeno 2 card (con una sola è inutile); le opzioni vengono da `GET /cards/mine` (B30). Un `venueId` in URL che il backend rifiuta con 404 (card sparita) viene tolto in silenzio (`router.replace`). Per lo staff `venueId` in URL è scartato dal parse (il backend risponderebbe 400).
- **Filtri non validi (ST-10):** la lista sparisce e compare «Correggi i filtri» (invece di tenere la lista vecchia); il pannello si apre da solo. Errore sotto il **gruppo** di campi (Timbri, Periodo), non sotto il singolo campo, perché il gruppo è su due colonne strette: i campi colpevoli sono marcati (`aria-invalid`, `aria-describedby`). Il messaggio non ha spazio riservato: compare sotto il gruppo e sposta solo il contenuto sotto il pannello (dopo il debounce di 250 ms, mai sopra il campo in modifica).
- **Ricaricamento (cambio filtri):** barra sottile 3 px `action` in cima alla lista, lista non attenuata, nessun salto (CLS misurato 0,000).
- **Titolo unico «Storico richieste»** per cliente e staff (ST-14), invece di «Le tue richieste».
- **Azzera:** variante `link` (non più arancione). Rimossi da `stampy.scss` i blocchi `.filter-toggle/.filter-panel/.filter-reset` ormai morti; gli stili nuovi sono in `components.scss` (sezione «History»).
- **Modifiche additive a file condivisi:** `AppField` ha la prop `invalid` (stile invalido e `aria-invalid` senza messaggio proprio) e accetta `aria-describedby` da fuori; `icons.ts` ha `caret-up`.
- **Non fatto (fuori dalla task / da decidere):** preset del periodo («Oggi», «Ultimi 7 giorni», design 4.8 marcati [codice], ST-8 priorità bassa). Proposta di task.
- **Contraddizioni con la issue:** nessuna.

## Testi nuovi o cambiati (da confermare in dev; non approvati)

- Titolo: «Storico richieste» (cliente e staff).
- Filtri: «Filtri · N», «Azzera», «Azzera filtri», opzioni Esito «Approvate / Non confermate / Scadute / In attesa» («Rifiutate» → «Non confermate», come il chip), «Locale», «Tutti i locali»; chip attivi «Esito: …», «Locale: …», «Timbri: da 3 a 5 / almeno 3 / al massimo 5», «Dal 1 ott», «Al …»; aria-label «Rimuovi filtro: …», «Filtri attivi».
- Righe: «Premio riscattato: <nome>», «N premi riscattati: <nome>», «Nessun timbro», chip «Non confermata» (era «Rifiutata»), chip «Premio».
- Stati: «Non hai ancora richieste» + «Quando chiedi un timbro, la vedrai qui.» + «Torna al profilo» (cliente); «Nessuna richiesta» + «Le richieste di timbro del locale compariranno qui.» + «Torna alla coda» (staff); «Nessun risultato» + «Nessun risultato con questi filtri.»; «Correggi i filtri» + «Finché i filtri non sono validi non mostriamo l'elenco.»; errore «Non siamo riusciti a caricare le richieste» + «Controlla la connessione e riprova.» + «Riprova» / «Riprovo…»; «Non siamo riusciti a caricare altre richieste. Controlla la connessione e riprova.»; «Carica altri» / «Carico…»; «Mostrate X di N»; «N richieste».
- Invariati (letterali del codice): «I timbri devono essere un numero intero da 1 a 50.», «Il minimo dei timbri supera il massimo.», «Le date nel futuro non sono ammesse.», «La data "Al" è prima della data "Dal".».

## Assunzioni e cose da validare

- **Non verificato:** telefono reale (tocco, tastiera numerica, `input type=date` nativo su iOS/Android), screen reader (annunci di `role=status`/`alert`, focus sulla prima riga nuova dopo l'ultima pagina), tablet e desktop (la colonna è la `narrow` di 28 rem: non ho toccato il layout).
- Il formato dell'`input type=date` (mm/dd/yyyy negli screenshot) dipende dalla lingua del browser di Chromium, non dal codice.
- «Oggi» è giorno locale calcolato con l'orologio del dispositivo: è solo un'etichetta, nessuna scadenza.
- Una richiesta `pending` scaduta passa a `expired` per la scadenza lazy del backend: l'e2e ne tiene conto.

## File toccati e test

- File: `src/components/RequestHistory.vue` (riscritto), `src/views/CustomerHistoryView.vue`, `src/views/StaffHistoryView.vue`, `src/api/endpoints.ts` (tipi `HistoryPage`, `reward`, `displayName`, `venueId/limit/cursor`), `src/components/ui/AppField.vue` (prop `invalid`), `src/components/ui/icons.ts` (`caret-up`), `src/styles/components.scss` (+ sezione History), `src/styles/stampy.scss` (rimossi gli stili morti dei filtri), `e2e/history.mjs` (riscritto), `e2e/lib.mjs` (`createVenue`, `seedRequests`).
- Non toccati: `docs/` (salvo questo report), `AGENTS.md`, `.claude/`, backend, coda staff, login, area cliente, `AppLayout/AppHeader/AppMenu`, `router/index.ts`. Nessuna dipendenza nuova.
- Test: nessun codice backend toccato; la suite backend resta alla baseline 488 (rilanciata da `/verify` in task-finish). `e2e/history.mjs` riscritto per lo storico nuovo (era rotto su main per T8): **65 ✔ / 0 ✘**. Copre: raggruppamento Oggi/Ieri, 25 righe a pagina, totale, «Carica altri» ×2 con cursore e focus, premio col nome, filtri in URL, chip rimovibili (≥ 44 px), burst di digitazione, Back/Forward, errori min>max / date future / Al<Dal, «Correggi i filtri», risposte obsolete, deep link e query malformata, scheletro, errore + «Riprova», errore di «Carica altri» + ritentativo, 403, storico cliente (nome locale, filtro per locale, `venueId` sconosciuto scartato, back al profilo, stato vuoto, overflow a 360/390). Non fa parte di `npm run e2e` (come prima).
- `npm run type-check` e `npm run build`: puliti.
- Verifica a schermo (Playwright, Chromium): 360 e 390 px, chiaro e scuro; stati: lista, filtri aperti con chip, filtri non validi, vuoto (nessuna richiesta / nessun risultato), scheletro, errore, «Carica altri» su 61 righe, staff e cliente. Nessuno scroll orizzontale; nessun target < 44 px; contrasti calcolati ≥ 5,85:1 in tutte le coppie misurate (chip `ok` 9,7/11,7, `prize` 6,1, errore 6,2/7,4); CLS 0,000 su «Carica altri» e cambio filtro. Il chip `warn` non è stato misurato (nessuna riga «Non confermata» nel set dell'audit; è la coppia di token del design system). Screenshot non versionati.

## Modifiche proposte ai documenti

### CODEBASE.md
Sostituire la voce «Storico» (§ frontend) con: «**Storico** (`components/RequestHistory.vue`, prop `audience: 'customer' | 'staff'`, montato da `/staff/:venueId/history` e `/history`): query string come fonte di verità (`status`, `minStamps`, `maxStamps`, `from`, `to` e, solo cliente, `venueId`; valori malformati scartati). Prima pagina con i filtri, «Carica altri» con `cursor = nextCursor` degli stessi filtri (dedup per `requestId`); `total` dal backend come «N richieste», «Mostrate X di N». Righe raggruppate per giorno locale del dispositivo (Oggi / Ieri / data, intestazione sticky) con `AppStatusChip`; riga premio col nome (`reward`) e fondo `prize-tint`; staff: codice card + `displayName`, cliente: nome del locale. «Filtri · N», chip rimovibili, «Azzera» link, errori per gruppo (Timbri, Periodo), «Correggi i filtri» al posto della lista, filtro locale (solo cliente con ≥ 2 card, da `GET /cards/mine`; `venueId` non valido → 404 → filtro tolto), stati scheletro / errore con «Riprova» / vuoto a due cause. «Dal»/«Al» inviati come istanti locali (nessuna modifica backend). `e2e/history.mjs` (65 check) usa `seedRequests` / `createVenue` di `e2e/lib.mjs`.»

### BACKLOG.md
Spostare F12 (#83) nel §8 con la data 2026-11-27. Nuova voce suggerita: preset del periodo («Oggi», «Ultimi 7 giorni»).

## Lacune emerse e task suggerite

- Preset del periodo (ST-8).
- `venues.timezone` se serve il fuso del locale invece di quello del dispositivo.
- Il backend non vieta ancora lo storico cliente a staff e owner (già in BACKLOG F5): la UI reindirizza al profilo.
- Layout largo (tablet/desktop) dello storico: la colonna resta 28 rem; spetta a F7 e ai fotogrammi tablet/desktop.

## Problemi di ambiente

Nessuno. (`pkill -f` ha ucciso la mia shell una volta, exit 144: già vietato dalla skill `task-finish`, poi ho fermato i server per porta.)

## Cosa ho capito e cosa no

- La task chiedeva «tutti gli stati H01–H05 e SH01–SH03 per cliente e staff»: li ho confrontati con i sorgenti HTML dei mockup e verificati a schermo; non ho fatto un confronto pixel per pixel.
- L'istruzione sul fuso («oggi fine giornata UTC») riguardava il backend: il frontend manda già istanti, quindi per i filtri il problema non si pone; scelta dichiarata, nessuna modifica backend.
