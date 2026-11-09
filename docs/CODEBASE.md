# Stampy — Mappa del codice e stato

> Documento **vivo**: descrive il codice **così com'è adesso**. Si aggiorna nella stessa
> modifica che cambia codice, endpoint, schema o test. Se questo file contraddice il codice,
> **vince il codice** e questo file va corretto.
> Non contiene decisioni di prodotto (`CONTEXT.md`) né cose da fare (`BACKLOG.md`).
> Ultimo allineamento con il codice: 5 novembre 2026.

**Stato in una riga**: backend completo dal tocco del tag alla conferma dello staff (card,
richieste, auth email, sessioni, ruoli, coda, confirm/reject, aggiornamento del pass Google).
Mancano ancora: login Google e invio email reale. `stampy-frontend/` (Vue 3 + TS + Vite + Vue
Router, `/api` in proxy su `:3000` in sviluppo) ha il login email, le pagine del cliente
(schermata Wallet, polling della richiesta, storico), la coda dello staff e lo storico dello staff.

---

## 1. Stack e comandi

- Node.js + **Express 5.2.1** + TypeScript `strict`, Drizzle ORM, PostgreSQL 16 (Docker).
- `cookie-parser` senza segreto (cookie non firmati), `express-rate-limit` per il limiter per IP.
- `class-validator`/`class-transformer` per i DTO, `zod` per env, branding, config delle
  promozioni, metadata di audit.
- `jsonwebtoken` per firmare il link del Wallet, `nanoid` per `public_code` (fino a 3 tentativi
  in caso di collisione), `google-auth-library` è installata ma **inutilizzata** (serve per il
  futuro login Google).

```bash
# dalla radice del repo (package.json radice: solo `concurrently`, niente workspaces)
npm run dev            # backend + frontend (http://localhost:5173)

# da stampy-backend/
npm run dev            # nodemon su src (si riavvia da solo; .env è letto solo all'avvio)
npm start              # tsx src/index.ts
npm run typecheck      # tsc --noEmit (solo src)
npm run typecheck:all  # tsc --noEmit -p tsconfig.check.json (src + scripts + test)
npm run build          # tsc -> dist/ (dist NON è usato da start: build e start sono scollegati)
npm test               # Vitest: unit + api (avvia l'app da solo, usa il DB di sviluppo)
npm run test:unit      # solo test/unit (niente DB)
npm run test:api       # solo test/api
npm run test:watch     # Vitest in modalità watch
```

Variabili d'ambiente (`src/config/env.ts`, zod, il processo termina se non valide):
`PORT`, `NODE_ENV`, `DATABASE_URL`, `APP_ORIGIN` (origin del frontend), `WALLET_ISSUER_ID`,
`WALLET_SERVICE_ACCOUNT_EMAIL`, `WALLET_SERVICE_ACCOUNT_KEY_PATH`, `OTP_HMAC_SECRET`,
`TRUST_PROXY` (numero di hop, default 0), `IP_RATE_LIMIT` (`on`/`off`, facoltativa).

## 2. Struttura

```text
src/
  app.ts                    express: trust proxy (solo se > 0), cors() aperto, morgan,
                            cookieParser(), bodyParser.json(), /api, errorHandlers
  index.ts                  createServer + SELECT 1 prima di mettersi in ascolto
  config/
    env.ts                  zod su process.env (vedi §1)
    serviceAccount.ts       carica la chiave JSON del service account del Wallet
  db/
    index.ts                pg Pool + drizzle (logger: true), esporta db e pool
    tx.ts                   Tx e DbOrTx (servizi che girano da soli o dentro una transazione)
    schema.ts               schema Drizzle completo: 11 tabelle, 9 enum (fonte di verità)
    types.ts                tipi derivati ($inferSelect) + enum riesportati
  api/
    routes.ts               monta /health, /auth, /venues, /requests
    health/
      health.router.ts      GET /api/health
      health.controller.ts  health
    auth/
      auth.router.ts        /email/* pubbliche; /me e /logout dietro isAuthenticated
      auth.controller.ts    me, logout
      auth-events/
        auth-events.service.ts log() append-only, whitelist zod dei metadata, hashSubject
      email/
        email.router.ts     request/verify
        email.controller.ts request, verify
        email.dto.ts        emailDTO, verifyDTO
      identity/
        identity.service.ts loginWithEmail: utente + identità `email`, in una transazione
      otp/
        otp.service.ts      crea/consuma/invalida challenge, tentativi, cooldown, tetto orario
      session/
        session.service.ts  hashToken, create, authenticate (scorrevole + tetto),
                            revoke, sessionCookieOptions
    cards/
      cards.service.ts      addOrGetCard (INSERT ... ON CONFLICT su user_id+venue_id)
    wallet/
      wallet.service.ts     LoyaltyClass per locale, object per card, JWT del saveUrl,
                            `updateCard` (PATCH REST di saldo + moduli di testo)
    venues/
      venues.router.ts      /mine, /:venueId/visit, route staff (ordine dei middleware)
      venues.controller.ts  visit (rate limit per card), mine
      venues.dto.ts         venueIdDTO
      venues.service.ts     locale non archiviato, promozione attiva (now() del DB)
      membership/
        membership.service.ts ruolo da venue_members, locali dell'utente, venueId non-UUID -> null
      staff/
        staff.controller.ts queue, confirm, reject
        staff.dto.ts        params dello staff + confirmDTO (intero 1..50)
    requests/
      requests.router.ts    GET /mine (storico del cliente), GET /:requestId (isAuthenticated)
      requests.controller.ts  polling: status, publicCode, expiresAt, stampsCount, stampsRequired; `mine` (storico del cliente)
      history.mapper.ts     `historyRow`: l'unico mapping di una riga di storico (staff e cliente; `venueName` solo per il cliente)
      requests.dto.ts       requestIdDTO
      requests.service.ts   ownership in SQL, scadenza lazy, rate limit, coda, storico, polling
      resolve/
        resolve.service.ts  confirm/reject in una transazione
  errors/                   una classe + handler per errore; quello generico PER ULTIMO;
                            body-parser.error.ts: JSON malformato → 400, body troppo grande → 413
  utils/
    auth-context.ts         requireAuth(req) -> { user, session }, 401 se mancante
    typed-request.ts        TypedRequest<B,Q,P>, TypedAuthRequest (auth?: AuthContext)
    middlewares/
      session.middleware.ts isAuthenticated: cookie -> service -> req.auth
      membership.middleware.ts  requireRole("owner","staff")
      ip-rate-limit.middleware.ts  express-rate-limit per IP, pass-through in sviluppo
      validation.middleware.ts  validate(dto, "body" | "query" | "params")
    stamps.ts               splitStamps(stampsRequired, currentCount, quantity), pura
    email/email-sender.ts   EmailSender + ConsoleEmailSender (vietato in produzione)
    schemas/                branding.schema.ts, promotion-config.schema.ts
    types/auth.type.ts      AuthUser, AuthSessionInfo, AuthContext
scripts/                    utilità: create-owner, create-venue, reset-data.sql (vedi §7)
drizzle/                    migrazioni 0000-0003 + meta (fonte di verità dello schema SQL)
```

Convenzione di `api/`: ogni cartella di dominio espone i file `<domain>.router.ts`,
`<domain>.controller.ts`, `<domain>.service.ts` e `<domain>.dto.ts` (dove servono);
i file di supporto vivono in una sottocartella col nome del loro ambito (`email/`, `staff/`,
`membership/`, `resolve/`, `otp/`, `identity/`, `session/`, `auth-events/`). Tutti i
middleware vivono in `utils/middlewares/`.

### Frontend (`stampy-frontend/src/`)

```text
api/client.ts               api(): unico wrapper di fetch, ApiError, hook per il 401, timeout (8 s; 4 s per `getMe`)
api/endpoints.ts            chiamate tipizzate al backend (contratti: §3)
router/index.ts             route, guardia `beforeEach`, handler del 401 (-> /login?next=)
composables/useAuth.ts      stato di sessione (a livello di modulo), checkSession (in cache), setUser, logout
composables/usePolling.ts   polling senza sovrapposizioni, si ferma allo smontaggio
composables/useCountdown.ts countdown da retryAfterSeconds del server
utils/tabStorage.ts         sessionStorage avvolto in try/catch
utils/redirect.ts           safeNext (guardia open-redirect), destinationAfterLogin
utils/format.ts             formattazione di attese e orari
styles/stampy.scss          Bootstrap 5.3 (solo Sass, niente JS): variabili, poi le parti usate
components/AppHeader.vue    header: wordmark a sinistra; con `centered`, tre colonne uguali (slot `start` | wordmark | slot di default) così il wordmark sta al centro
components/AppLayout.vue    route di layout per le pagine autenticate: UN header per clienti e staff (`<AppHeader centered>`), `<RouterView>`. Menu = burger (44 px, `aria-expanded`, si chiude con Escape / clic fuori / navigazione) costruito da `menuItems`: schermate staff di un locale di cui l'utente è membro (`getMyVenues()`, chiesto una volta, solo sulle schermate staff) → "Storico richieste" e, solo se l'utente è membro di più di un locale, "Cambia locale" (`/staff`; la coda si raggiunge con il pulsante indietro, il vecchio link "Cambia locale" nella pagina della coda è stato tolto); elenco dei locali dello staff (`/staff`) o locale non ancora confermato → nessuna voce di pagina (e nessun divisore), solo "Esci"; ogni altra schermata → "Storico richieste" del cliente (`/history`); sempre "Esci" per ultimo. Pulsante indietro (44 px, a sinistra, `aria-label="Indietro"`) solo sulle due pagine di storico: staff → la coda del locale, cliente → la pagina da cui si è aperto lo storico (lo ricorda `router.afterEach`; non `router.back()`, perché ogni cambio di filtro è una voce di cronologia; deep link → `/scan`). I link sono solo una comodità: il backend controlla il ruolo a ogni richiesta
components/RequestHistory.vue la schermata di storico (filtri, stato nell'URL, elenco), condivisa da staff e cliente: props `title`, `fetchHistory(filters)`; emette `forbidden` su un 403; il titolo della riga è `venueName ?? publicCode`
views/StaffHistoryView.vue  /staff/:venueId/history: `RequestHistory` + `getHistory(venueId)` + la card "Non sei autorizzato"
views/CustomerHistoryView.vue /history: `RequestHistory` + `getMyHistory`, titolo "Le tue richieste"
components/EmailLogin.vue   pagina /login (layout proprio): email -> codice; sfida mantenuta tra i reload della tab
components/PromotionNotice.vue avviso "nuova promozione, card da zero" (`variant` customer | staff), mostrato se `promotionChanged`
components/StampProgress.vue saldo; card piena mostrata come "Premio disponibile"
components/RewardDialog.vue <dialog> nativo (showModal) per un premio ritirato, si chiude solo con "Chiudi"/Esc
components/ToastStack.vue  toast non bloccanti (avviso di premio per lo staff), aria-live, chiudibili
utils/seenStorage.ts        flag in localStorage "il modale del premio di questa richiesta è stato chiuso"
views/CustomerVisitView.vue /v/:venueId  (dove puntano i tag): visita, schermata di salvataggio nel Wallet
views/CustomerRequestView.vue /r/:requestId  (solo polling, non chiama mai visit)
views/NoVenueView.vue       /scan  (connesso, nessun locale, nessun `next`)
views/StaffVenuesView.vue   /staff  (un solo locale: va dritto alla sua coda)
views/StaffQueueView.vue    /staff/:venueId  (coda, stepper della quantità, conferma/rifiuto)
views/SessionErrorView.vue  /session-error  (la sonda di sessione è fallita per un motivo diverso da 401)
views/NotFoundView.vue      qualsiasi altro percorso
```

- **Una sola pagina di login, redirect dopo il login** (BACKLOG B7, ribaltata il 2026-11-01): le route sotto
  `AppLayout` hanno `meta.requiresAuth`. `router.beforeEach` chiama `checkSession` una volta per
  caricamento della tab (in cache); nessuna sessione -> `/login?next=<fullPath>`. Aprire `/login`
  da connessi continua come se si fosse appena fatto il login. Un `401` da qualunque chiamata
  a sessione avviata (con un utente già impostato) azzera l'utente e va su `/login?next=<percorso corrente>`.
- **`next` è validato** (`safeNext`): una stringa che inizia con `/`, non `//`, non `/\`, senza
  caratteri di controllo, non `/login...`; qualsiasi altra cosa viene ignorata. Dopo il login: un
  `next` valido vince sempre (anche per lo staff); altrimenti `GET /venues/mine`: 0 locali -> `/scan`, 1 ->
  `/staff/:venueId` (replace), 2+ -> `/staff`. `logout()` svuota lo storage della tab e va su `/login`.
- **Il flusso del cliente è diviso** (chiude B16): `/v/:venueId` chiama `POST /visit` al caricamento.
  `card_created` / `card_not_added` mostrano la schermata Wallet (il backend restituisce `saveUrl`
  ogni volta, quindi non si tiene nulla in `sessionStorage` e un reload non apre nessuna richiesta di timbro).
  "Aggiungi a Google Wallet" apre `saveUrl` e fa partire `POST /card/wallet-added`
  (best effort); "Richiedi il timbro" chiama `visit?requestStamp=1`. Quando la card è
  `active`, un semplice tocco apre da solo la richiesta. `request_pending` / una nuova richiesta ->
  `router.replace` su `/r/:requestId`. `/r/:requestId` fa solo polling su `GET /requests/:id`
  (ogni 2 s), quindi ricaricarla non crea mai una richiesta. Il suo "riprova" ha bisogno del locale, che
  l'API non restituisce (B15): `/v` lo memorizza in `sessionStorage` sotto
  `stampy.request.<requestId>`; senza, la pagina chiede di toccare di nuovo il tag.
- **Polling**: cliente ogni 2 s, staff ogni 3 s sulla coda. Gli errori di rete e i `5xx` continuano
  il polling. `usePolling` si aggiorna subito quando la tab torna visibile; la pagina del cliente
  salta i polling mentre la tab è nascosta, la coda dello staff no (nuove richieste) e mostra il
  conteggio dei pending nel titolo della tab.
- **Feedback della coda dello staff** (revisione 2026-11-03): l'errore dell'ultima azione (`error`) è tenuto
  separato dallo stato del refresh in background (`pollError`), quindi un `404`/`409` non viene più cancellato dal
  polling successivo; i messaggi sono sticky in alto; un errore di rete su confirm/reject dice che
  l'esito è sconosciuto ("Esito non confermato…"). Ogni card mostra "scade tra …" (orologio del dispositivo,
  solo visualizzazione), una quantità digitabile (1–50, il backend valida comunque), "Rifiuta" in
  `btn-outline-danger`, e nomi dei pulsanti che includono il codice della richiesta.
- **Feedback sulle richieste** (2026-11-03): l'alert `success` generico in alto non c'è più. Staff: dopo confirm/reject la card viene sostituita **sul posto** da una card di esito (`alert-success` "✔ Richiesta approvata" con `+N timbri` e il saldo, oppure `alert-warning` "⚠ Richiesta rifiutata"; un rifiuto è un successo tecnico) mantenuta 8 s (2026-11-04) o fino a "Ok", più un annuncio per gli screen reader. Una conferma con `rewards > 0` aggiunge un toast per richiesta (5 s dal 2026-11-04, chiudibile) che nomina il premio reale. Cliente: la card approvata mostra "Richiesta approvata!" con `+N timbri aggiunti` (oppure "Nessun nuovo timbro: questo prodotto era il premio."); se `rewardsRedeemed > 0` si apre `RewardDialog` finché non viene chiuso; la chiusura salva `stampy.reward-seen.<requestId>` in `localStorage`, quindi un reload prima della chiusura lo mostra di nuovo e dopo la chiusura mai. Raggiungere N/N da solo non mostra nessun modale (resta il banner "Premio disponibile"). Tutti i numeri e il nome del premio vengono dal backend.
- **Tempi del feedback** (2026-11-04): il toast del premio dura 5 s e dice solo "Premio ritirato · CODE: <premio>" (nessuna istruzione sul prodotto: il modo di onorare un premio dipende dal locale e dalla promozione); le card di esito sul posto durano 8 s ("Ok" le chiude prima). Mentre un toast è visibile, uno spaziatore vuoto sotto l'elenco mantiene cliccabili i pulsanti dell'ultima card.
- **Storico** (`components/RequestHistory.vue`, montato da `/staff/:venueId/history` (staff, dal menu dell'header) e `/history` (cliente, dal menu dell'header)): la query string dell'URL è la fonte di verità (`?status=approved&minStamps=3&from=2026-11-01&to=2026-11-04`, stessi nomi dell'API; assente = non filtrato; i valori malformati vengono scartati in silenzio). Un watcher su `route.query` riempie il form e fa la richiesta (deep link, reload, avanti/indietro); un watcher con debounce (250 ms) sul form valida e fa `router.push` della query solo se è diversa, così Indietro ripristina i filtri precedenti e una raffica di digitazione è una sola voce. Nessun pulsante Filtra; "Azzera" svuota la query. Filtri: stato, **Timbri** (Min / Max, quantità confermata, premio incluso), **Periodo** (Dal / Al; entrambi con `max` = oggi, "Al" ha `min` = "Dal"; le date future digitate e `to < from` mostrano un errore inline e non inviano nessuna richiesta). Un contatore di richieste ignora le risposte obsolete. Nessuna paginazione: l'elenco completo è renderizzato, con un conteggio live gentile ("12 richieste"). Mobile: toggle "Filtri" ripiegato (44 px, `aria-expanded`; nessun conteggio dei filtri attivi) + "Azzera" (mostrato solo mentre un filtro è attivo), pannello chiuso di default (~278 px aperto a 375 px). I giorni scelti sono inviati come istanti reali (inizio del giorno "dal", ultimo millisecondo del giorno "al", fuso orario del dispositivo). Le righe mostrano il codice, mai l'email.
- **Codice card sulla pagina del cliente**: `/r/:requestId` mostra "Codice card: …" mentre è pending e dopo la chiusura della richiesta (da `publicCode` nella risposta del polling).
- **Quantità digitata** (corregge il bug del reset): l'input mostra una stringa `drafts` per richiesta (`@input`), quindi i re-render di polling/orologio non possono sovrascriverla (il vecchio `:value` + `@change` veniva riportato al valore confermato a ogni polling). Una bozza valida aggiorna anche `products`; una non valida (vuota, non intera, fuori da 1–50) mostra "Quantità non valida…" e disabilita Conferma invece di essere forzata in silenzio. `+`/`−` mantengono i limiti 1–50. Le bozze delle richieste uscite dalla coda vengono scartate.
- **Accessibilità**: le pagine hanno un `<main>`; dopo ogni navigazione (non la prima) `router.afterEach`
  vi sposta il focus. Login: l'errore è collegato al campo (`aria-describedby`), il focus va al
  campo del codice dopo l'invio, il countdown è annunciato al massimo una volta al minuto.
- `/staff` con 0 locali reindirizza a `/scan` (quindi `/` fa lo stesso per un cliente).
- **I timbri non si calcolano mai qui**: lo stepper invia i prodotti consumati, e il saldo
  e i `rewards` mostrati vengono dalla risposta del backend.
- **Stile**: Bootstrap 5.3 solo via Sass. `styles/stampy.scss` sovrascrive le variabili
  (`$primary` = l'arancione del logo `#f16417`, esposto anche come `--stampy-brand`; il bianco sopra è ~3,2:1,
  quindi `$min-contrast-ratio: 3` evita che `color-contrast()` di Bootstrap scelga testo nero sull'arancione,
  e `.btn-outline-primary` forza il testo bianco in hover/active; il più scuro `#c2410c` è solo lo stato
  premuto di "Azzera"; i link sul tema scuro usano `#f4813f`), poi importa le parti usate.
  `main.ts` imposta `data-bs-theme` da `prefers-color-scheme` e segue i cambi.
- Il testo della UI è in italiano, scritto direttamente nei componenti; niente i18n, Pinia, JS di Bootstrap né bootstrap-vue.

## 3. Endpoint

| Metodo e path | Auth | Comportamento |
|---|---|---|
| `GET /api/health` | no | `200` |
| `POST /api/auth/email/request` | no (limiter IP) | `202 {challengeId}`; cooldown di 45 s e tetto 5/ora → `429` + `Retry-After`; errore email → `503` |
| `POST /api/auth/email/verify` | no (limiter IP) | `200 {user:{id,email,displayName}}` + cookie `sid`; codice sbagliato su una sfida viva → `400 {error:"InvalidCode", message:"Codice non valido", attemptsRemaining}`; qualsiasi sfida non utilizzabile (scaduta, tentativi esauriti, già usata, sostituita, sconosciuta) → `400 {error:"CodeExpired", message:"Codice scaduto"}` |
| `GET /api/auth/me` | sì | `200 {user:{id,email,displayName}}` (sonda in sola lettura) |
| `POST /api/auth/logout` | sì | `204`, cookie rimosso, evento `logout` |
| `POST /api/venues/:venueId/visit[?requestStamp=1]` | sì | nuova card → `201 {state:"card_created", saveUrl, publicCode}`; richiesta pending viva → `200 {state:"request_pending", requestId, expiresAt, promotionChanged}`; card `not_added` e senza `requestStamp=1` → `200 {state:"card_not_added", saveUrl, publicCode}` (nessuna richiesta); nuova richiesta → `201` (stessi campi; `promotionChanged` = la card è ferma su una promozione non più attiva); più di 10 nuove/ora per card → `429` + `Retry-After`; `requestStamp` diverso da `1` → `400` |
| `POST /api/venues/:venueId/card/wallet-added` | sì | `204`; `not_added` → `active` (UPDATE condizionato, idempotente); nessuna card per questo utente e locale → `404` |
| `GET /api/requests/:requestId` | sì | `200 {status, publicCode, expiresAt, stampsCount, stampsRequired, promotionChanged}` (se `promotionChanged` è `true`, mai per `approved`, `stampsCount` è `0` e `stampsRequired` quello della promozione attiva; `publicCode` = il codice della card, così il cliente può leggerlo allo staff a qualsiasi passo); se `approved` anche `stampsAdded` (somma degli eventi `stamp` di quella richiesta), `rewardsRedeemed` (conteggio dei suoi eventi `redeem`) e `reward` (nome del premio della promozione); richiesta di un altro o inesistente → `404` identico |
| `GET /api/venues/mine` | sì | `200 {venues:[{venueId,name,slug,role}]}` |
| `GET /api/venues/:venueId/requests` | sì + owner/staff | `200 {requests:[{requestId,publicCode,stampsCount,stampsRequired,promotionChanged,createdAt,expiresAt}]}`, max 50, mai l'email (con `promotionChanged` `true`: `stampsCount` `0` e soglia della promozione attiva) |
| `GET /api/venues/:venueId/requests/history` | sì + owner/staff | tutte le richieste del locale, dalla più recente, **mai l'email**, **senza paginazione** (nessun tetto sulle righe; `limit`/`offset` → `400`). Query facoltativa (tutti in AND, campi sconosciuti → `400`): `status` (`pending\|approved\|rejected\|expired`), `minStamps` / `maxStamps` (1–50, quantità confermata, premio incluso = somma di `stamp_events.quantity` della richiesta, quindi corrispondono solo richieste `approved`), `from` / `to` (su `created_at`; `YYYY-MM-DD` letto come UTC, `to` inclusivo fino alla fine di quel giorno, oppure un istante ISO 8601 completo; `from` successivo a `to` → `400`; le date future sono accettate, il blocco è una regola della UI). Nessuna data → tutte le date; solo `from` → da quel momento; solo `to` → fino a quel momento. Le righe scadute ma ancora `pending` vengono prima fatte scadere (scadenza lazy). `200 {requests:[{requestId,publicCode,status,createdAt,resolvedAt,stamps,stampsAdded,rewardsRedeemed}]}` (`stamps`, `stampsAdded`, `rewardsRedeemed` sono `null` se non `approved`) |
| `GET /api/requests/mine` | sì | le richieste **proprie** del cliente connesso in **tutti** i locali, dalla più recente; stessi filtri, stessa scadenza lazy e stessa riga dello storico staff, più `venueName` (scope `cards.user_id` in SQL, così nessuno vede la richiesta di un altro). `200 {requests:[{requestId,publicCode,venueName,status,createdAt,resolvedAt,stamps,stampsAdded,rewardsRedeemed}]}`. Entrambi gli storici chiamano `requestsSrv.getHistory(scope, filters)` con scope `{venueId}` (staff) o `{userId}` (cliente). Route fissa registrata prima di `/:requestId` |
| `POST /api/venues/:venueId/requests/:requestId/confirm` | sì + owner/staff | body `{stamps}` = **prodotti consumati, premio incluso** (intero 1–50) → `200 {status:"approved", stampsCount, stampsRequired, rewards, stampsAdded, reward}` (`stampsAdded` = timbri registrati, `rewards` = premi consumati); `404`/`409` (`409` anche senza promozione attiva); **promozione della card cambiata → rollover**: la card riparte da 0 sulla promozione attiva; dopo il commit il pass Google viene aggiornato best effort (un fallimento del Wallet non cambia mai la risposta) |
| `POST /api/venues/:venueId/requests/:requestId/reject` | sì + owner/staff | `200 {status:"rejected"}`, non tocca la card; `404`/`409` |

Non esiste una route `/cards`: la card viene creata solo da `visit`.

Errori: `400` validazione (`details` con `property` e `constraints`, mai un'eco di
`value`), `400 MalformedBody` per JSON malformato, `413 BodyTooLarge`, `404 NotFound` JSON
per ogni route `/api` inesistente, `400` codice OTP, `401` unico, `403` non membro,
`404` risorsa inesistente o di un altro, `409` richiesta non più valida / nessuna promozione
attiva, `429` limiti (sempre `{error:"TryLaterError", message:"Riprova più tardi",
retryAfterSeconds}` + header `Retry-After` con lo stesso valore, anche dal limiter per IP),
`500` JSON generico. (Le stringhe di `message` sono letterali italiani nel codice.)

## 4. Convenzioni

- **Ordine dei middleware** su una route protetta:
  `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
  `isAuthenticated` è montato **per route** (mai su `/api/auth` in blocco: `/email/*`
  è pubblica). Conseguenza accettata: senza cookie un parametro malformato dà **401**; con
  un ruolo mancante un `venueId` malformato dà **403**.
- **Generics aperti su `P`** in `isAuthenticated`, `requireRole` e `requireAuth`: servono
  per combinare più handler con controller tipizzati dal DTO dei params. Nessun cast nei
  controller.
- **Utente autenticato in `req.auth`**, letto con `requireAuth(req)`. **Mai `req.user`**:
  `@types/passport` dichiara già `Express.Request.user` e un nostro tipo renderebbe
  l'handler non assegnabile a `RequestHandler`.
- **Ruoli**: mai nella sessione o in `req.auth`; `requireRole` legge `venue_members` a ogni
  richiesta. Un `venueId` non-UUID è trattato come "non membro" (evita Postgres 22P02).
- **Errori**: ogni `GenericError` va scritto col suo status. Un errore ricorrente merita una
  classe + handler registrato **prima** di `genericErrorHandler`. L'handler generico espone
  status e messaggio **solo** per `GenericError`; tutto il resto → `500` JSON generico con
  i dettagli solo nei log. Gli errori del body-parser (JSON malformato, body troppo
  grande) hanno un handler dedicato (`400 MalformedBody`, `413 BodyTooLarge`).
- **Tempo**: sempre il `now()` del DB nelle query, mai `new Date()` per le scadenze.
- **UPDATE di stato**: sempre col filtro di stato nel `WHERE` (`revoked_at IS NULL`,
  `status = 'pending'`, `consumed_at IS NULL`, …).
- **Risposte**: sempre mappate, mai `res.json(row)`; il token di sessione non compare mai nel
  body.
- **Input**: `validate(dto, origin)`; validate usa whitelist e forbidNonWhitelisted
  (campi extra → 400), e un body mancante dà 400 "missing body" tramite GenericError.
- **Cookie**: sempre da `sessionCookieOptions()` (httpOnly, secure solo in produzione,
  SameSite=Lax, path `/`); solo il login aggiunge il `maxAge`.
- **Audit**: `authEventsSrv.log(type, { email?, userId?, provider?, metadata? }, tx?)`;
  l'email finisce solo in `subject_hash`, i metadata sono validati per tipo.
- **Timbri**: la regola vive **solo** in `splitStamps`; nessun altro posto ricalcola i
  segmenti. Vale solo per `type = "stamps"`.
- **Dati**: passare sempre `venueId` insieme agli id delle risorse (FK composte e
  ownership). Tipi di dominio solo da `db/types.ts`; enum solo dai `pgEnum`.

## 5. Flussi

**Login email — request**: una transazione legge i secondi dall'ultimo invio, gli invii
nell'ultima ora e l'età del più vecchio; i controlli vengono **prima** di toccare le righe
(evento `otp_send_blocked` committato); poi chiude la challenge viva, inserisce la nuova,
scrive `otp_sent`; il 23505 dall'indice parziale → 429. Dopo il commit invia l'email
(`ConsoleEmailSender` in sviluppo).

**Login email — verify**: il tentativo viene contato in modo atomico **fuori** dalla
transazione; codice sbagliato → `otp_failed`, invalidazione al quinto errore, 400 generico;
codice giusto → una transazione con consumo monouso, `loginWithEmail`, sessione, eventi
(`otp_verified`, `identity_linked` se l'identità è stata aggiunta, `login_success`). Cookie
scritto **dopo** il commit.

**Richiesta autenticata**: cookie `sid` → controllo della forma (43 caratteri) → SHA-256 → SELECT
con join su `users` e filtri (`revoked_at NULL`, `expires_at > now()`,
`created_at > now() - 90 days`, `anonymized_at NULL`) e `needs_touch` calcolato dal
DB; se serve, UPDATE di `last_seen_at` e `expires_at = LEAST(now()+30d, created_at+90d)`.
Qualsiasi fallimento → stesso 401.

**Logout**: transazione (revoca condizionata + evento solo se la revoca è avvenuta)
→ `clearCookie` → 204.

**Tocco del cliente (`visit`)**: utente da `req.auth` (body ignorato) → locale e promozione
attiva → `addOrGetCard`. Card nuova → 201 `card_created` + `saveUrl`. Card esistente →
scadenza lazy → richiesta pending viva? 200 **senza consumare quota** → card `not_added`
e senza `?requestStamp=1` → 200 `card_not_added` + `saveUrl` (firmato di nuovo in locale) +
`publicCode`, **nessuna richiesta creata** → altrimenti `checkCardRateLimit` (10/ora per card) → `newRequest` con `ON CONFLICT` sul vincolo parziale;
se la race è persa, restituisce la richiesta pending appena creata. Le risposte con richiesta portano `promotionChanged` (`card.promotionId !== promozione attiva`); `visit` non modifica la card.
Polling e coda calcolano `promotionChanged` confrontando `cards.promotion_id` con la promozione attiva (`venueSrv.getActivePromotion`, `now()` del DB), senza salvare nulla.

**Polling del cliente**: `refreshStatus` (scadenza lazy, solo da `pending`, ownership in
SQL) → `getRequestByUserId` con join su card e promozione → `status`, `publicCode`,
`expiresAt`, `stampsCount`, `stampsRequired` (+ i campi di esito se `approved`).
Richiesta di un altro → 404.

**Coda dello staff**: scadenza lazy di **tutto il locale** (una richiesta senza polling
resterebbe `pending` per sempre) → richieste pending in ordine di arrivo, max 50.

**Confirm**: `expireIfDue` fuori dalla transazione → transazione: UPDATE condizionato
`status='pending' AND expires_at > now()` (mutex, doppia conferma → 409) → `SELECT …
FOR UPDATE` sulla card → promozione attiva (409 se non c'è) → se `card.promotion_id` è diverso il
**rollover lazy** (saldo di partenza 0, card piena compresa) → `splitStamps` con la soglia attiva → uno `stamp_event` per segmento con `idempotency_key = {requestId}:{n}` →
`cards.stamps_count = finalCount` e `cards.promotion_id` = promozione attiva. `confirm` restituisce anche il `cardId` (interno, il controller lo toglie dal body).
Dopo il commit il controller esegue `syncWalletPass`: carica locale e card (`stamps_count` e `promotion_id` aggiornati) e la promozione
scritta sulla card (`getPromotionById`, non la «attiva» riletta dopo il commit) e chiama `GoogleWalletService.updateCard`, un PATCH
su `loyaltyObject/{walletObjectId}` con `loyaltyPoints` e i 3 moduli di testo (valori
assoluti, quindi ripetibile; timeout 5 s, 2 retry sugli errori transitori; silenzioso, nessuna
notifica). Qualsiasi errore (pass non ancora salvato, Google giù) viene solo loggato come
`[wallet] … (card <id>): <status|code>` — nessun dato personale — e la risposta resta 200:
il DB è la fonte di verità, il pass una vista derivata. Il comportamento con un vero issuer
è ancora non verificato (`BACKLOG.md` V1).

**Reject**: stesso UPDATE condizionato con `status='rejected'`; nessuna scrittura su card o
eventi; stessa distinzione 404/409.

**Primo owner**: `scripts/create-owner.ts <email> <slug> [--force]` — l'utente deve esistere
e non essere anonimizzato, il locale non archiviato; `INSERT … ON CONFLICT DO NOTHING`; non
promuove uno `staff` senza `--force`.

**Nuovo locale**: `scripts/create-venue.ts --name … --slug … --logo … --color … --stamps …
--reward … [--banner …]` — valida con gli stessi schemi zod del backend, crea
locale + promozione attiva in una transazione, idempotente sullo slug, stampa l'URL del tag
(`APP_ORIGIN/v/<venueId>`). `APP_ORIGIN` è l'origin del **frontend** (sviluppo: `http://localhost:5173`): il tag deve aprire nel browser la pagina del cliente, ed è anche il campo `origins` del JWT di salvataggio nel Wallet. Riavviare il backend dopo aver cambiato `.env`.

## 6. Dati

Fonte di verità: `src/db/schema.ts`; per i vincoli scritti a mano, l'SQL in `drizzle/`.

**11 tabelle**: `users`, `auth_identities`, `otp_challenges`, `sessions`, `auth_events`,
`venues`, `venue_members`, `promotions`, `cards`, `stamp_requests`, `stamp_events`.

**9 enum**: `member_role`, `promotion_type`, `wallet_provider`, `wallet_status`,
`request_status`, `event_type`, `identity_provider`, `otp_channel`, `auth_event_type`.

Relazioni:

```text
users ──< auth_identities
  │ ──< sessions
  │ ──< auth_events            (user_id nullable: NULL = utente sconosciuto)
  ├──< venue_members >── venues ──< promotions
  └──< cards >──────────────────────┘  (card -> promozione dello stesso locale)
          ├──< stamp_requests
          └──< stamp_events (-> promotion, -> stamp_request opzionale, -> operatore=users)
otp_challenges   (nessuna FK: il destinatario può non essere ancora un utente)
```

Invarianti da non rompere:

- `users.email` UNIQUE, minuscola e senza spazi (CHECK); NULL ammesso (anonimizzato).
- `auth_identities`: UNIQUE `(provider, provider_user_id)` e `(user_id, provider)`.
- `otp_challenges`: indice UNIQUE parziale su `(channel, destination)` dove `consumed_at`
  e `invalidated_at` sono NULL — **una sola challenge viva**; il vincolo ignora
  `expires_at`, quindi una challenge scaduta va chiusa prima di inserirne una nuova.
- `sessions.token_hash` UNIQUE (SHA-256, mai il token).
- `venues.slug` UNIQUE; `venue_members` PK `(user_id, venue_id)`.
- `promotions_no_overlap`: `btree_gist` EXCLUDE su `(venue_id, tstzrange(starts_at,
  ends_at))` — **scritto a mano nella migrazione 0001**, non in `schema.ts`. Una promozione
  senza fine occupa il locale per sempre.
- `cards`: UNIQUE `(user_id, venue_id)`, UNIQUE `(id, venue_id)`, FK composta
  `(promotion_id, venue_id) → promotions(id, venue_id)`.
- `stamp_requests`: indice UNIQUE parziale su `card_id` dove `status='pending'`; indice
  parziale `(venue_id, created_at)` per la coda.
- `stamp_events`: `request_id` **non** è UNIQUE (indice semplice); `idempotency_key` UNIQUE;
  `quantity > 0`; FK composte su card, promotion e request.
- `stamps_count >= 0` e **nessun** tetto massimo: `= stampsRequired` è il normale stato
  "premio disponibile".
- Anonimizzazione invece di cancellazione: tutte le FK sono `RESTRICT`.

Migrazioni (una per modifica):

```bash
npx drizzle-kit generate --config=src/drizzle.config.ts --name=NAME
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
```

Leggere **sempre** l'SQL generato prima di applicarlo. Mai `push`/`introspect`.
Verifica dei vincoli: `test/api/db-constraints.test.ts` (transazione con
ROLLBACK, non sporcano il DB).

## 7. Test

**Metodo (deciso il 2026-11-05, solo backend): TDD** con test concordati col proprietario prima
del codice (regola completa in `AGENTS.md`). Runner: **Vitest**. Non ci sono più script di test
`tsx`: tutti sono stati portati in Vitest il 2026-11-05.

```text
stampy-backend/test/
  unit/      niente server, niente DB            (stamps, wallet-update)
  api/       app in-process + DB di sviluppo     (tutti gli altri)
  helpers/   server.ts (startServer, request, cookieToken), fixtures.ts (utenti, sessioni, locali, cleanup),
             auth-db.ts (sfide OTP, conteggi eventi)
```

- La **cartella dice se il test tocca il DB**: `unit/` mai, `api/` sempre.
- Un test `api/` crea i propri dati (utenti `<prefisso>-<run>-<tag>@test.it`, locali con slug
  `<prefisso>-<run>-<tag>`, promozione da 10 timbri) con `makeFixtures(prefisso)` e li elimina in
  `afterAll` con `fx.cleanup()`; non dipende dall'ordine né dai dati di un altro file, e non
  richiede nessun locale preesistente nel DB.
- Struttura `describe` (endpoint o funzione) → `describe` (scenario) → `it` (comportamento in italiano).
- `vitest.config.mts`: `fileParallelism: false` (un file alla volta sul DB condiviso). Con
  `NODE_ENV=test` (impostato da Vitest) `morgan` e il logger di Drizzle sono spenti.
- L'aggiornamento del pass Google dopo `confirm` è sostituito da un finto (`vi.spyOn(walletSrv, "updateCard")`):
  i test non chiamano mai Google.
- L'output di default stampa solo il riepilogo e i test falliti; `npx vitest run --reporter=verbose`
  elenca ogni test.

```bash
npm test                         # tutto Vitest
npm run test:unit                # solo test/unit
npm run test:api                 # solo test/api
npx vitest run -t "5 codici"     # un solo test per nome
.claude/skills/verify/scripts/verify.sh   # typecheck + suite, atteso 221
```

| File | Test | Copertura |
|---|---|---|
| `unit/stamps.test.ts` | 24 | soglie, soglia esatta, più premi, card piena, soglia 1, tetto 50, input impossibili (19 casi + 5 errori) |
| `unit/wallet-update.test.ts` | 5 | `updateCard` con un client mockato: PATCH, URL, saldo, 3 moduli, niente id/classId/notifyPreference, timeout/retry, l'errore si propaga |
| `api/otp-request.test.ts` | 20 | JSON malformato, 400 senza eco, 404 JSON, cooldown e body 429, cooldown saltato per un codice morto, tetto orario, finestra, race, risposta uniforme |
| `api/otp-verify.test.ts` | 16 | validazione, utente nuovo (cookie, sessione, eventi), nessuna email in chiaro, riuso, tentativi, scaduta/sostituita/inesistente, utente esistente con e senza identità, race |
| `api/session.test.ts` | 18 | 401 unico, sessione scorrevole, tetto assoluto, cookie del login vero, logout (cookie, evento, race), whitelist dei metadata di `auth_events` |
| `api/visit-polling.test.ts` | 16 | `visit`/polling con sessione, ownership, scadenza lazy; schermata wallet per `not_added`, `requestStamp=1`, `wallet-added` (204, idempotente, 401/404/400, card di un altro utente intatta) |
| `api/promotion-rollover.test.ts` | 33 | rollover alla conferma (saldo ripartito da 0, card piena, soglia nuova, eventi sulla promozione nuova, rifiuto/scadenza/senza promozione/altro locale invariati, doppia conferma concorrente), `promotionChanged` in `visit`, polling e coda (mai il numero dei timbri persi), sync del pass dopo il rollover (promozione della card, errore Google ignorato, race) e `saveUrl` a 0 timbri per card vecchia `not_added` |
| `api/staff-requests.test.ts` | 28 | `/venues/mine`, coda (401/403, senza email, isolamento tra locali), confirm 15 → 4/10 con 3 eventi, pass Google best effort, doppia conferma 409, validazione, reject, scadenza, 404 tra locali, owner, soglia esatta, card piena, rate limit di `visit` |
| `api/history.test.ts` | 47 | storico staff e cliente (`GET /api/requests/mine`): auth/403, campi e nessuna email, filtri per stato / timbri / date (ISO, `from > to` → `400`), filtri combinati, nessuna paginazione, isolamento tra tenant, scadenza lazy, attraversa i locali, `publicCode` nel polling |
| `api/db-constraints.test.ts` | 14 | vincoli delle migrazioni 2 e 3 (email minuscole, unicità, una sfida OTP attiva, FK RESTRICT, `request_id` non univoco, `promotions_no_overlap`), ognuno in una transazione con ROLLBACK |

Totale atteso: **221**.

Ultima esecuzione registrata: **9 novembre 2026: `npm test` 221 ✔ sul DB di sviluppo, `npm run typecheck:all` pulito**, nessun dato di test rimasto nel DB.

Frontend: `npm run build` in `stampy-frontend/` esegue `vue-tsc` e la build di produzione.
Test nel browser (Playwright, devDependency `playwright`, chiude B17): `npm run e2e` esegue entrambi: `node e2e/staff-input.mjs` (7 check: la quantità digitata sopravvive al polling, il testo non valido blocca Conferma, Conferma invia esattamente il valore digitato) e `node e2e/feedback.mjs` (32 check: approvazione/rifiuto/toast del premio dello staff, testo di approvazione del cliente, persistenza/focus/tastiera/reload del modale del premio, overflow a 390 px). Richiedono `npm run dev`, il container `stampy-db` e un locale con branding nel DB; creano utenti `e2e-*@test.it` più un locale `e2e-*` e li eliminano. Se non è stato eseguito `playwright install`, puntare `E2E_CHROMIUM` a un binario di Chromium. `node e2e/t6d.mjs` (43 check, la checklist staff T6-D) e `node e2e/history.mjs` (48 check, uno ancora fallito: si aspetta l'etichetta "Filtri · N" che il toggle non mostra più: storico dello staff aperto dal menu dell'header, stato nell'URL, filtri dal vivo, avanti/indietro, regole sulle date, nessuna paginazione, pannello mobile, codice card del cliente, storico del cliente: solo richieste proprie, nome del locale, stessi filtri, header con pulsante indietro e logo centrato); nessuno dei due fa parte di `npm run e2e`. Ultima esecuzione: 2026-11-04, t6d 43 ✔, history 38 ✔, feedback 32 ✔, staff-input 7 ✔; 2026-11-03, 38 check verdi. L'esecuzione del 2026-11-01 era uno script usa-e-getta. Ultima esecuzione manuale nel browser:
1 novembre 2026 (dopo il cambio di login/redirect e bootstrap), 47 check verdi (Chromium
headless a 360 px contro i server di sviluppo, script usa-e-getta fuori dal repo).
Giro manuale di test del frontend (`BACKLOG.md` T6), 2–3 novembre 2026: **A (login), B (redirect e guardie) e C (flusso del cliente) fatti**;
**D (flusso dello staff) non fatto (in pausa dal 2026-11-03).**

Utility (non test) in `stampy-backend/scripts/`: `create-owner.ts`, `create-venue.ts` e `reset-data.sql`
(svuota tutte le righe del DB di sviluppo mantenendo schema e vincoli:
`docker exec -i stampy-db psql -U stampy -d stampy_dev -v ON_ERROR_STOP=1 < scripts/reset-data.sql`).

## 8. Da dove iniziare

| Se devi… | Guarda prima |
|---|---|
| aggiungere una route protetta | `venues.router.ts` (ordine dei middleware) + `utils/middlewares/membership.middleware.ts` |
| toccare la regola dei timbri | `utils/stamps.ts` + `test/unit/stamps.test.ts` + `CONTEXT.md` §4.4 |
| toccare confirm | `requests/resolve/resolve.service.ts` + `venues/staff/staff.controller.ts` |
| toccare l'auth | `auth/` (otp, identity, session, auth-events) + `CONTEXT.md` §5 |
| toccare lo schema | `db/schema.ts` → `generate` → leggere l'SQL → `migrate` → aggiornare §6 |
| scrivere o cambiare un test | `test/` (`unit/` senza DB, `api/` con DB, `helpers/`) + `vitest.config.mts` + §7 |
| aggiornare il pass del Wallet | `wallet/wallet.service.ts` (`updateCard`) + `syncWalletPass` in `venues/staff/staff.controller.ts` + `docs/google/wallet-pass-update.md` |
| toccare il login del frontend | `stampy-frontend/src/components/EmailLogin.vue`, `router/index.ts`, `utils/redirect.ts`, `composables/useAuth.ts` |
| toccare le schermate del cliente o dello staff | `stampy-frontend/src/views/` + `api/endpoints.ts` |
| scoprire cosa manca | `BACKLOG.md` |
