# Stampy — Progress

> Documento vivo, complementare a `stampy_contesto_progetto.md` (decisioni di prodotto).
> Qui si tiene traccia di **cosa è stato fatto**, **cosa è stato verificato** e **cosa resta da fare**.
> Ultimo aggiornamento: 26 ottobre 2026 (sera) — fase: pre-MVP, **Fase 3 chiusa; Fase 4 in corso: migration 2, percorso email, `isAuthenticated`/sessione/logout, `visit` e polling con l'utente di sessione chiusi e testati**. Prossimo: rate limit di `visit`, poi coda staff; Google rimandato dopo lo staff. Nessun frontend, nessun cliente pilota confermato.
> Questa versione consolida e sostituisce le sezioni precedenti (Fase A, aggiornamenti del 19/10, 23/10, 24/10): quanto è superato è stato rimosso.

---

## 1. Stato in breve

- **Wallet**: un backend nostro emette un pass Google Wallet (testato su Android, demo mode). Il link "Add to Google Wallet" si firma in locale con la chiave del service account.
- **Database**: PostgreSQL 16 in Docker, Drizzle con migration versionate (0000, 0001, **0002_auth_foundation**), **11 tabelle** e tutti i vincoli principali verificati. Dettagli, con spiegazione di ogni vincolo, in `stampy_db_schema.md`.
- **API**: `GET /api/health`, `POST /api/cards/google` (dev), **`POST /api/venues/:venueId/visit`** e **`GET /api/requests/:requestId`** (entrambe dietro `isAuthenticated`, `userId` non più nel body), **`POST /api/auth/email/request`**, **`POST /api/auth/email/verify`**, **`GET /api/auth/me`**, **`POST /api/auth/logout`**. Dettagli in `CODEBASE_CONTEXT.md`.
- **Flusso cliente**: tocco del tag → creazione card o richiesta di timbro `pending` → polling dello stato con scadenza lazy (3 minuti). Testato anche con race tra richieste parallele.
- **Auth — percorso email (implementato e testato da terminale il 26/10)**: richiesta del codice con cooldown 45 s e tetto 5 invii/ora, verifica con 5 tentativi, creazione/collegamento di utente e identità `email`, sessione con cookie `httpOnly`. Niente password. **Google non ancora implementato**; Apple e telefono (SMS) sono evoluzioni future non confermate. Parametri e regole in `stampy_contesto_progetto.md` §4.11 e `stampy_db_schema.md` §6.
- **`visit` e polling con l'utente di sessione (implementati e testati il 26/10)**: l'utente viene da `req.auth`, il `userId` nel body è ignorato; il polling verifica l'ownership **in SQL** (join `stamp_requests ⋈ cards`) e la richiesta altrui dà **404 identico** a un id inesistente, senza scrivere nulla. Dettagli in §2.9.
- **Auth — sessione e logout (implementati e testati il 26/10)**: cookie `sid` `httpOnly`, `SameSite=Lax`, `Secure` solo in produzione, `Path=/`; in DB solo lo SHA-256 del token. Sessione **scorrevole 30 giorni dall'ultima attività con tetto assoluto di 90 giorni** da `created_at`, rinnovo al massimo ogni 5 minuti; cookie con `maxAge` = tetto assoluto. Ogni fallimento (assente, alterato, scaduto, revocato, anonimizzato, tetto superato) dà lo **stesso 401**. Logout revoca la sola sessione corrente, cancella il cookie con le stesse opzioni e scrive un evento `logout` senza metadata. L'utente sta in `req.auth` (non `req.user`, vedi §4).
- **Mancano**: rate limit di `visit`, invio email reale (Gmail), login Google, endpoint staff, `confirm`/`reject`, tratti e quantità, aggiornamento del pass da server, frontend, hosting con URL fisso.
- **Ancora non verificati**: aggiornamento del pass da server (**gate tecnico per la `confirm`**), lettura da tag NFC fisico (iPhone e Android), tempi di approvazione Google per il publishing access, limiti di invio di Gmail per le email automatiche, configurazione di Google Sign-In.

---

## 2. Fatto

### 2.1 Account e configurazione Google
- Account Google **dedicato a Stampy**, con verifica in due passaggi.
- **Issuer account** in **demo mode** (Google Pay & Wallet Console). Attenzione: il **Merchant ID** alfanumerico non è l'**Issuer ID** (numerico, 19 cifre) da usare nel codice.
- **Progetto Google Cloud** con Google Wallet API abilitata; **service account** con chiave JSON (in `secrets/`, fuori da Git), aggiunto in console come **Sviluppatore**.
- **Account tester** configurato; amministratori e sviluppatori della console possono comunque testare in demo mode.
- Business Profile ancora **incompleto** (serve per richiedere il publishing access).
- Google Sign-In (login cliente) **non ancora configurato** (client ID, schermata di consenso).

### 2.2 Ambiente di sviluppo
- Progetto in **WSL2** (filesystem Linux, non `/mnt/c`), Node v24, Docker per PostgreSQL, DBeaver collegato (driver `.jar` a mano in `C:\Drivers`).
- `cloudflared` installato per i quick tunnel (URL casuale a ogni riavvio, niente SSE). Oggi non indispensabile: il link si apre da PC e il pass compare anche sul telefono; l'URL pubblico servirà per tag NFC/QR e per il logo.
- `.gitignore` e `.env` configurati; repository su Git, lavoro su `main` dopo il merge di `wip-fase-b` alla chiusura della Fase 3.

### 2.3 Fase A — spike Wallet (conclusa)
Verificato: link firmato RS256, class e object nel JWT accettati in demo mode, salvataggio con account Admin e tester, card visibile su Android. Il codice della Fase A (`modules/wallet`, `routes/devWallet`, `scripts/wallet-check.ts`) è stato rimosso e sostituito dal modulo attuale.

### 2.4 Fase B — database e backend (conclusa fino alla Fase 3)
- Schema, migration 0000 e 0001 (con `btree_gist` ed EXCLUDE a mano), seed di sviluppo.
- Backend collegato al DB: all'avvio `SELECT 1`, parte solo se il DB risponde.
- Wallet: **una LoyaltyClass per locale** (ID `{issuerId}.{venue.id}`, solo identità e branding), tutto ciò che dipende dalla promozione sta nell'**object** della card. `branding` validato con zod strict, `promotions.config` `{v:1, stampsRequired, reward}`.
- Query estratte in `UserService`/`VenueService` (filtro anonimizzati/archiviati, promozione attiva con `now()` del DB).
- `visit`: validazione `venueIdDTO` sui params, `GenericError` con `statusCode` (409 per "riprova"), richieste pendenti con `ON CONFLICT` sul vincolo parziale.
- `GET /api/requests/:requestId`: scadenza lazy con UPDATE condizionato a `status = 'pending'`; un `approved` con `expires_at` nel passato resta `approved`.
- Script `poll-request.ts` per testare il polling dal terminale.

### 2.5 Fase 4 — design dell'auth e migration 2 (24/10/2026)
- **Ricerca nelle documentazioni** (Google Sign-In, Apple `id_token`, OWASP, NIST, Microsoft MSRC sul pre-hijacking): fonti e limiti al §9.
- **Decisioni**: niente password; email + OTP via email e Google; Apple e telefono rimandati; email verificata come identificatore primario; `users.email` UNIQUE; collegamento tra metodi solo con prova di possesso; Google con email di terzi rifiutato; OTP 6 cifre, 5 minuti, 5 tentativi, 45 s di attesa, 5 invii/ora; nessun limite per IP per ora; audit su `auth_events`.
- **Migration 2 `0002_auth_foundation`**: `users` senza telefono e con `email` (UNIQUE + CHECK di normalizzazione); nuove tabelle `auth_identities`, `otp_challenges`, `sessions`, `auth_events`; 3 nuovi enum. SQL generato letto e controllato prima dell'applicazione (nessuna regressione su `promotions_no_overlap`).
- Tipo `User` nel codice adeguato (`phone*` tolti, `email: string | null`); `npm run typecheck` pulito dopo l'adeguamento.

### 2.6 Fase 4 — percorso email dell'auth (25-26/10/2026)
Struttura (da `Stampy_Handoff_Fase_4c.md` §4): service dedicati in `src/api/auth/`, controller in `src/api/auth/email/`.
- **`POST /api/auth/email/request`**: una transazione che legge in **una sola query** secondi dall'ultimo invio, invii nell'ultima ora e età del più vecchio della finestra; **controlli prima** di toccare le righe (cooldown 45 s → 429, tetto 5/ora → 429, con `Retry-After`); poi chiude la sfida viva (solo righe non consumate e non invalidate), inserisce la nuova, scrive `otp_sent`. L'evento `otp_send_blocked` resta committato perché il service restituisce un risultato invece di lanciare. 23505 dall'indice UNIQUE parziale → trattato come 429. Invio tramite `EmailSender` (console in sviluppo, rifiuta di partire con `NODE_ENV=production`); se fallisce 503 e la sfida resta.
- **`POST /api/auth/email/verify`**: tentativo contato in modo atomico **fuori** dalla transazione; codice errato → `otp_failed`, invalidazione al quinto errore, errore generico; codice giusto → **una transazione** con consumo monouso (con filtro di stato), utente (`INSERT … ON CONFLICT DO NOTHING` poi `SELECT`), identità `email`, sessione, eventi `otp_verified`, `identity_linked` (solo se l'identità è stata aggiunta a un utente già esistente) e `login_success` con `user_id`. Cookie `sid` dopo il commit, token mai nel body.
- **Risposta di errore unica**: 400 `"Codice non valido o scaduto"` per codice errato, scaduto, usato, invalidato, inesistente, tentativi esauriti, utente anonimizzato.
- **Valori della sessione**: vedi §2.7 (30 giorni scorrevoli + tetto assoluto di 90). `res.cookie` non richiede `cookie-parser`; da allora `cookie-parser` è installato e usato da `isAuthenticated`.
- `EmailService` spezzato in `OtpService`, `AuthEventsService`, `IdentityService`, `SessionService`; tipo `Tx`/`DbOrTx` in `src/db/tx.ts`.

### 2.7 Fase 4 — `isAuthenticated`, sessione scorrevole, logout (26/10/2026)

File nuovi: `src/api/auth/session.middleware.ts` (`isAuthenticated`), `src/api/auth/auth.controller.ts` (`me`, `logout`), `src/errors/unauthorized.error.ts` (401 + handler), `src/utils/auth-context.ts` (`requireAuth`), `src/utils/types/auth.type.ts`, `scripts/session.ts`.
File modificati: `session.service.ts` (costanti, `sessionCookieOptions`, `authenticate`, `revoke`), `app.ts` (`cookieParser()` senza segreto), `auth.router.ts` (`GET /me`, `POST /logout` dietro `isAuthenticated`), `errors/index.ts` (`unauthorizedHandler` prima del generico), `auth-events.service.ts` (whitelist zod dei `metadata` per tipo), `email.controller.ts` (cookie con l'helper condiviso, `maxAge` = 90 giorni, rimosso lo statement morto `400;`), `typed-request.ts` (`TypedAuthRequest`), `enum.ts` (`IdentityProvider`).

- **Sessione scorrevole con tetto assoluto**: `SESSION_IDLE_TTL_DAYS=30`, `SESSION_ABSOLUTE_TTL_DAYS=90`, `SESSION_TOUCH_MINUTES=5`. `authenticate(token)` fa **una SELECT** con join su `users` e i filtri `revoked_at IS NULL`, `expires_at > now()`, `created_at > now() - 90 days`, `anonymized_at IS NULL`, e calcola nel DB il booleano `needs_touch` (`last_seen_at < now() - 5 min`). Solo se serve, una **UPDATE condizionata** scrive `last_seen_at = now()` e `expires_at = LEAST(now()+30d, created_at+90d)`. Nessun confronto temporale con l'orologio di Node, nessuna colonna nuova.
- **Cookie**: `sessionCookieOptions()` è l'unica fonte per `httpOnly`, `secure` (solo in produzione), `sameSite:"lax"`, `path:"/"`. Il `maxAge` (90 giorni) lo aggiunge il login; il logout cancella con le stesse opzioni senza `maxAge`.
- **401 unico**: `UnauthorizedError` ("Non autenticato") + handler dedicato, senza `console.error`; risposta identica per cookie assente, alterato, malformato, scaduto, revocato, utente anonimizzato, tetto superato. Il middleware scarta prima i token che non hanno 43 caratteri (32 byte base64url) senza toccare il DB.
- **Logout**: `POST /api/auth/logout` dietro `isAuthenticated`. Revoca + evento `logout` nella stessa transazione; l'evento si scrive solo se `revoke` ha scritto (`revoked_at IS NULL` nel WHERE). 204, cookie rimosso con le stesse opzioni. Solo la sessione corrente: "esci da tutti i dispositivi" non è implementato.
- **`req.auth`, non `req.user`**: il typecheck ha mostrato che `@types/passport` (dipendenza in disuso ma inclusa nel programma perché `tsconfig` non limita `types`) dichiara `Express.Request.user?: Express.User`, e un `user?: AuthUser` rende l'handler non assegnabile ai `RequestHandler`. Quindi `req.auth = { user:{id,email,displayName,isPlatformAdmin}, session:{id,authProvider} }`, letto con `requireAuth(req)`; `TypedAuthRequest` ha il campo opzionale per restare assegnabile a Express.
- **`GET /api/auth/me`**: aggiunto come sonda read-only (serve al frontend per sapere se c'è sessione, e ai test per verificare lo scorrimento senza revocare).
- **`auth_events.metadata`**: schema zod esaustivo sui 9 tipi dell'enum, `.strict()`; `logout` accetta solo `{}`. Un metadata fuori whitelist lancia (bug di programmazione) invece di finire a DB.
- **Test**: `scripts/session.ts` **16/16** (dettagli al §2.8). `scripts/otp-verify.ts` rieseguito 16/16 (aggiornata l'asserzione `Max-Age` a 90 giorni), `scripts/otp-request.ts` 13/13, `npm run typecheck` pulito. Pulizia dei dati di test verificata (0 righe residue).

### 2.8 Verificato sul campo

| Cosa | Esito |
|---|---|
| Link "Add to Google Wallet" firmato e pass salvato su Android | OK |
| ID object con UUID e trattini accettati da Google in demo mode | OK |
| Vincoli DB della migration 1 sul DB reale | OK |
| Insert con Drizzle in transazione (`returning`, `tx`) | OK |
| `visit`: 201 / 200 / scadenza lazy / race con due richieste parallele | OK |
| `visit` con UUID malformato nel path | 400 |
| `GET /requests/:id`: pending, scaduta → expired, approved resta approved, UUID malformato | OK |
| Vincoli della migration 2 (script `verify-migration-2.sql`, 19 controlli, ROLLBACK) | OK (24/10) |
| `npm run typecheck` | pulito (24/10, dopo la migration 2) |
| `POST /auth/email/request` (`scripts/otp-request.ts`): validazione, 202, normalizzazione, cooldown con `Retry-After`, tetto orario (la sfida viva resta viva), finestra oraria, 5 richieste simultanee (una 202, quattro 429, nessun 5xx), risposta uguale per utente esistente/inesistente | OK (25/10, RIPORTATO; rieseguito 13/13 il 26/10) |
| `POST /auth/email/verify` (`scripts/otp-verify.ts`): **16/16** — validazione senza consumare tentativi; utente nuovo con cookie/utente/identità/sessione/eventi; nessuna email in chiaro in `auth_events`; codice riusato; errato; 5 errati poi il giusto fallisce; quinto tentativo giusto passa; sfida a 5 tentativi; scaduta; sostituita; inesistente; utente esistente senza identità (`identity_linked`) e con identità; 5 verify simultanee (una 200, un utente, una sessione) | OK (26/10, RIPORTATO; rieseguito 16/16 dopo le sessioni) |
| `isAuthenticated` + logout (`scripts/session.ts`): **16/16** — cookie valido (200, body mappato), richiesta ravvicinata senza riscrittura di `last_seen_at`, cookie assente/alterato/malformato, sessione scaduta, revocata, utente anonimizzato, tetto assoluto superato, scorrimento dopo 10 minuti, tetto rispettato a 89 giorni, login vero con OTP e cookie accettato, logout (204, cookie rimosso con le stesse opzioni, un evento senza metadata), 401 dopo logout, logout ripetuto (401, `revoked_at` invariato, nessun secondo evento), due logout simultanei (un solo evento), whitelist dei metadata | OK (26/10, verificato in questa sessione) |
| `visit` + polling con sessione (`scripts/poll-request.ts`): **12/12** — 401 senza cookie/fasullo/utente anonimizzato, `userId` nel body ignorato, card creata per l'utente di sessione, secondo tocco `request_pending`, polling del proprietario, params malformati (401 senza sessione / 400 con sessione), richiesta altrui → 404 identico a inesistente e nessuna scrittura, scadenza lazy → `expired`, nuovo tocco dopo la scadenza | OK (26/10) |
| `npm run typecheck` | pulito (26/10, dopo `isAuthenticated`/logout e dopo `visit`/polling) |

### 2.9 Fase 4 — `visit` e polling con l'utente di sessione (26/10/2026)

File modificati: `venues/venues.router.ts` e `venues/venues.controller.ts` (`isAuthenticated` prima della validazione, `userId = requireAuth(req).user.id`), `venues/venues.dto.ts` (rimossa `userIdDTO`), `requests/requests.router.ts`, `requests/requests.controller.ts`, `requests/requests.service.ts` (ownership in SQL), `auth/session.middleware.ts` e `utils/auth-context.ts` (generics aperti su `P`), `scripts/poll-request.ts` (riscritto come test completo). `venues/venues.service.ts` non è stato toccato. Il server locale (nodemon) ha ricaricato da solo.

- **`visit`**: `userId` dal body rimosso e **ignorato** se inviato; la card nasce per l'utente della sessione. Rimossi `userSrv.getUserById` e il ramo `UserNotFoundError`: `isAuthenticated` garantisce già utente esistente e non anonimizzato, quindi la seconda lettura era una query in più senza nuovi controlli.
- **Polling**: ownership in SQL con join `stamp_requests ⋈ cards` su `(card_id, venue_id)` e filtro `cards.user_id`; la scadenza lazy ha in più un `EXISTS` sulla stessa condizione, così non scrive mai righe di altri. Richiesta altrui → **404 identico** a un id inesistente (deciso il 26/10: nessun 403, nessuna conferma dell'esistenza).
- **Ordine dei middleware**: `isAuthenticated → validate(params) → controller`. Conseguenza accettata: senza cookie un UUID malformato dà **401**, non 400; con sessione valida resta 400.
- **Typecheck**: con tre handler sulla rotta (`isAuthenticated`, `validate`, controller tipizzato dal DTO) `isAuthenticated` con `P = ParamsDictionary` fisso rendeva il controller non assegnabile a `RequestHandler`. Risolto aprendo i generics di `isAuthenticated` e `requireAuth` su `P`; nessun cast nei controller. Stesso tipo di problema già documentato per `req.auth`/`req.user`.
- **Test**: `scripts/poll-request.ts` **12/12** (§2.8). Lo script non usa più id scritti a mano: sceglie il primo locale con promozione attiva, crea utenti `visit-test-*@test.it` e sessioni con token noto (in tabella solo SHA-256), e ripulisce a fine run. Verificata la pulizia a mano sul DB (0 utenti/sessioni/card/richieste residue).
- **Debito dichiarato**: `visit` **resta non transazionale** (come concordato); il 409 ha lo status nel codice ma non è esercitabile a runtime senza forzare una race; `src/api/cards/google/google.controller.ts` (rotta dev) legge ancora `userId` dal body e resta fuori ambito; il rate limit di `visit` non è implementato (§6.9 dell'handoff).

---

## 3. Procedura di test

- **Server**: `npm run dev` (il `.env` si legge solo all'avvio: dopo ogni modifica va riavviato; un `tsx watch` vivo non implica un server in ascolto).
- **`visit` e polling (con sessione)**: `npx tsx --env-file=.env scripts/poll-request.ts`. Crea utenti `visit-test-*@test.it` e sessioni con token noto, sceglie dal DB il primo locale con promozione attiva ed esegue i controlli (401, card, richiesta pending, ownership → 404, scadenza lazy, nuovo tocco). Pulizia a fine run.
- **Auth, richiesta codice**: `npx tsx --env-file=.env scripts/otp-request.ts` (il tempo si simula spostando `created_at` via SQL: verifica la logica sulle righe, non l'orologio). Indirizzi `otp-test-*@test.it`, pulizia a fine run.
- **Auth, verifica codice**: `npx tsx --env-file=.env scripts/otp-verify.ts` (crea le sfide direttamente nel DB con un codice noto, usando lo stesso `OTP_HMAC_SECRET`; non passa dall'email). Indirizzi `otp-verify-*@test.it`, pulizia a fine run.
- **Auth, sessione e logout**: `npx tsx --env-file=.env scripts/session.ts` (crea le sessioni direttamente nel DB con un token noto — in tabella solo SHA-256 — e fa un login vero con una sfida OTP preparata a mano). Copre scadenza, revoca, anonimizzazione, tetto assoluto, scorrimento, 401 unico, logout e whitelist dei metadata. Indirizzi `auth-session-*@test.it`, pulizia a fine run.
- **Verifica dei vincoli del DB**: `docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql` (ogni riga `OK`; lo script termina con ROLLBACK e non sporca il DB).
- **Wallet**: aprire il link `saveUrl` con un account Admin o tester. Se compare l'errore generico di Google, gli errori dettagliati sono visibili solo ad Admin/Developer dell'Issuer.
- **Con tunnel** (quando serve): `cloudflared tunnel --url http://localhost:3000`, poi allineare l'URL pubblico nel `.env` e riavviare.

---

## 4. Lezioni e problemi incontrati

- **Merchant ID ≠ Issuer ID.**
- **Errore generico di Google Wallet**: provare con un account Admin (anche in incognito) per l'errore dettagliato.
- **`PUBLIC_BASE_URL` non allineato al tunnel** (o server vecchio sulla porta 3000) ha prodotto 401, timeout e URL del logo irraggiungibile (causa esatta non confermata).
- **Quick tunnel Cloudflare**: URL casuale, nessuna garanzia di uptime, niente Server-Sent Events.
- **Un UPDATE senza filtro di stato nel `WHERE`** sovrascrive righe già concluse: valeva per la scadenza delle richieste (`status = 'pending'`) e vale per le sfide OTP (`consumed_at`/`invalidated_at` NULL, `expires_at > now()` per il consumo). Errore intercettato due volte in revisione.
- **Segreti**: il segreto di sviluppo era passato in chat durante il debug; la route che lo usava non esiste più, ma se `DEV_ENDPOINT_SECRET` è ancora nel `.env` va ruotato o rimosso.
- **Migration con vincoli scritti a mano**: leggere sempre il SQL generato prima di applicarlo (ordine dei DROP, nessuna riga su `promotions_no_overlap` o `btree_gist`).
- **Rinviare una decisione ha un costo diverso dal cambiarla**: rifiutare i Google con email di terzi è logica applicativa, accettarli dopo richiederà una migration additiva; per questo si è scelto di rifiutare ora.
- **Controllo invertito sul cooldown** (revisione 25/10): un `!` di troppo bloccava dopo i 45 s invece che prima. Un test che aggira il tempo via SQL lo avrebbe visto: ogni controllo temporale va provato in entrambi i versi.
- **Invalidare prima di controllare i limiti** spegne il codice vivo anche quando la richiesta viene rifiutata: ordine corretto = controlli, poi invalidazione, poi insert, nella stessa transazione.
- **Dopo un errore dentro una transazione Postgres la transazione è abortita**: niente 23505 + rilettura; usare `INSERT … ON CONFLICT DO NOTHING RETURNING` e poi `SELECT`.
- **Parametri posizionali al posto dell'oggetto** (`logEvent(type, email, tx)` con `tx` finito nei metadata): passare un oggetto per le opzioni.
- **`new GenericError(msg)` senza status risponde 500** anche se il messaggio è giusto (26/10): il `genericErrorHandler` è corretto, serve passare sempre lo status. I test hanno distinto il caso dal bug logico.
- **`req.user` non è tipizzabile con `@types/passport` nel programma** (26/10): il typecheck fallisce perché `Express.Request.user` è già dichiarato come `Express.User`. Soluzione adottata: `req.auth = { user, session }`. L'alternativa sarebbe togliere `passport*` dalle dipendenze, ma è una pulizia a parte.
- **Il cookie può rendere inutile lo scorrimento della sessione** (26/10): con `maxAge` di 30 giorni fissi dal login, un utente attivo viene disconnesso al trentesimo giorno anche se la sessione si è rinnovata. Ora il cookie dura quanto il tetto assoluto (90 giorni). Se un giorno si vuole che segua l'idle, serve il *reissue* del cookie a ogni tocco.
- **Logout dietro `isAuthenticated` è idempotente sullo stato, non sulla risposta** (26/10): il secondo logout dà 401, ma `revoked_at` non viene riscritto e non nasce un secondo evento. Due logout simultanei possono dare 204 + 401, sempre con un solo evento.
- **Il typecheck non copre `scripts/`** (`tsconfig` include solo `src`): gli script girano con `tsx` senza controllo dei tipi. Un errore di tipo in uno script si vede solo a runtime.
- **Il solo riepilogo "passati/falliti" non basta a diagnosticare**: lo script stampa risposta e singoli controlli, e va letto quell'output.

---

## 5. Da fare

### Pre-merge / chiusura Fase 3 (esito non ancora comunicato)
1. Sicurezza sulla storia Git (mostrare solo nomi di file, atteso vuoto):
   ```bash
   git grep -lI -e '-----BEGIN' $(git rev-list --all)
   git grep -lIE '://[^ ]+:[^ ]+@' $(git rev-list --all)
   git log --all --oneline -- .env secrets
   ```
   Se una chiave è stata pushata, ruotarla dalla console Google Cloud.
2. Pulizie facili: duplicati in `GoogleService`, controllo date morto, import inutilizzati, `venues.response.ts`, test del ramo `card_created` da `visit`, decisione su `.vscode`. Elenco completo in `Stampy_Handoff_Fase_4c.md` §8.
3. Ruotare o rimuovere `DEV_ENDPOINT_SECRET` se ancora nel `.env`.
4. Committare il percorso email e la sessione (file in `src/api/auth/`, `src/utils/auth-context.ts`, `src/utils/types/auth.type.ts`, `src/db/tx.ts`, `src/utils/email/`, `src/errors/unauthorized.error.ts`, gli script in `scripts/`) e fare un tag.

### Fase 4 — auth e staff (in corso)
5. ~~Design dell'auth e migration 2~~ **fatto** (24/10).
6. ~~Percorso email: `OtpService`, `IdentityService`, `SessionService`, `AuthEventsService`, `EmailSender` console, endpoint di richiesta e verifica~~ **fatto e testato** (26/10).
7. ~~**`isAuthenticated`**, **logout**, `cookie-parser`, `last_seen_at` con scorrimento, errore 401~~ **fatto e testato** (26/10, §2.7): sessione scorrevole 30 giorni + tetto assoluto 90, tocco ogni 5 minuti, `req.auth`, `GET /api/auth/me`, `POST /api/auth/logout`.
8. ~~Sostituire `userId` nel body con l'utente di sessione in `visit` e in `GET /requests/:requestId`~~ **fatto e testato** (26/10, §2.9): `userId` dal body ignorato, ownership del polling in SQL, richiesta altrui → 404 identico a inesistente.
9. **Rate limit di `visit`** (deciso il 26/10, handoff §6.9): contatori nel DB per card/utente, più un limite in memoria per IP sulle rotte `/auth` con `trust proxy` da configurare. **Prossimo passo.**
10. **Login con Google** (verifica del token con `google-auth-library`, collegamento solo se autorevole, rifiuto delle email di terzi con `google_untrusted_email_rejected`). **Rimandato dopo lo staff** (deciso il 26/10). Richiede configurazione esterna e un modo di ottenere un token in test: da leggere nella documentazione ufficiale.
11. **Invio email reale** (`GmailEmailSender`, limiti di Gmail da verificare; `EMAIL_PROVIDER` in `env.ts`).
12. ~~Decisioni ancora aperte su auth/CORS/staff/retention~~ **chiuse il 26/10** (handoff §6): CORS ristretto a una sola origine con `credentials` e controllo `Origin` sulle rotte che modificano stato, senza token CSRF per ora; staff con lo stesso metodo di login del cliente e ruolo letto da `venue_members`; primo `owner` con uno script dopo il suo primo login; `venueId` nell'URL con login sulla stessa pagina (frontend); retention e anonimizzazione rimandate a prima del primo utente reale.
13. Endpoint staff: coda delle pendenti, `requireRole`, `venue_id` da `venue_members`; creazione del primo `owner` con uno script.
14. **Migration 3** (togliere UNIQUE su `stamp_events.request_id`), funzione pura dei tratti con test, `confirm`/`reject` in transazione con `idempotency_key`.
15. **Ricerca nella documentazione Google**: aggiornamento dell'object via REST (scope, patch vs sostituzione, campi aggiornabili, latenza, class modificabile). Non cercare finché l'utente non lo dice.
16. `wallet_status`, branding di default, personalizzazione estetica.

### Infrastruttura e Wallet in produzione
17. **Dominio** (circa 10 €/anno) e URL fisso per il backend di test; verificare nella documentazione Cloudflare cosa serve per un tunnel con nome. Il dominio serve anche per l'email (SPF/DKIM) quando si lascerà l'account Gmail.
18. **Tag NFC di prova**: adesivi NTAG213 più qualche card PVC NFC. **Non bloccare mai i tag in sola lettura** prima di aver fissato l'URL definitivo. Test su iPhone (lettura in background da XS/XR in poi) e Android.
19. **Web app staff e cliente** (Vue.js); polling cliente ogni 1–2 s.
20. **Publishing access Google**: completare il Business Profile, creare la class definitiva, preparare gli screenshot dei pass. **Tempi di review e requisiti per un individuo senza P.IVA da verificare**, non assunti.
21. Decidere se tenere il barcode sul pass (l'identificazione avviene dal tag/QR del banco; potrebbe bastare `accountId`) e come mostrare il codice leggibile.
22. Prima di qualunque deploy: `genericErrorHandler` che espone `err.message` e `err.name` (e non gestisce errori che non sono `GenericError`), `logger: true` di Drizzle (stampa query e parametri, quindi anche email e dati personali), `cors()` aperto, `start` via `tsx` con `build`/`dist` scollegati.

### Prodotto e mercato
23. **Parlare con 2-3 gestori reali** (bar, gelaterie, pizzerie): prerequisito per il modello di business e per le decisioni su scadenza/rollover. Non è un compito tecnico rimandabile.
24. **Supporto fisico per il locale**, in fasi: prototipo (adesivo NTAG213 su porta-menù in acrilico a L, QR stampato in casa), pilota (stampa curata col brand), scala (plexiglass su misura con chip incassato). Da testare: schermatura da metallo e inchiostri metallici, posizione dell'antenna, spessore, cover dei telefoni.
25. **Apple Wallet** solo dopo aver validato il flusso su Google Wallet (99 $/anno Apple Developer Program). Con Apple Wallet si valuterà anche l'accesso con Apple.
26. **Telefono con SMS** (accesso): solo con un cliente reale, per costo per messaggio e perché NIST lo classifica come metodo "restricted". Costi e requisiti dei provider da verificare nelle loro documentazioni.

---

## 6. Regole di sicurezza da rispettare nelle API vere

- **Auth prima della validazione**, poi ruolo, poi validazione, poi controller:
  `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- **Il `venue_id` dello staff non arriva mai da body o params**: si ricava dalla sessione.
- **Ownership** su ogni risorsa (`:cardId`, `:requestId`): il ruolo giusto non basta. La verifica è **in SQL** (join su `cards.user_id`), non in memoria; una richiesta altrui dà lo **stesso 404** di un id inesistente e non viene mai scritta.
- **Validazione input**: vietare i campi non previsti (mass assignment), limite massimo su ogni valore numerico, regole strette sulle query string (`Number('')` vale 0, `Number('0x64')` vale 100), 400 e non 500 per input mancanti, nessuna eccezione non gestita nei middleware (verificare la versione di Express).
- **Nessuna route che riceve dati senza validazione**: idealmente un test automatico che elenca le rotte POST/PUT/PATCH/DELETE e fallisce se manca il middleware. `visit` non legge più il body (l'utente viene dalla sessione): l'eccezione storica è stata rimossa.
- **Tag e QR sono copiabili**: la conferma manuale dello staff resta la protezione contro chi si timbra da solo. Rate limit per utente e carta e `idempotency_key`.
- **Manomissione fisica** del QR o del tag: supporto con QR non sovrapponibile, dominio corto e riconoscibile.
- **Segreti**: la chiave JSON del service account non va mai in Git, in chiaro in chat o nei documenti; in produzione nei secret dell'hosting. Vale anche per il segreto HMAC degli OTP e per le credenziali dell'invio email.
- **Mai `res.json(riga)`**: sempre risposte mappate (la verifica del codice risponde `{user:{id,email,displayName}}`).
- **Auth (decise il 24/10, applicate il 26/10 al percorso email e alla sessione)**: nessun utente o identità senza prova di possesso; chiave dell'identità `(provider, sub)`, mai l'email; nessun collegamento per email non verificata; limiti degli invii per destinatario (mai un contatore globale); risposta identica per email esistente e inesistente; sessioni create solo dopo la verifica; codici e token salvati solo come hash; nessun dato personale in `auth_events.metadata`; errore unico per ogni fallimento della verifica; ogni UPDATE di stato (consumo, invalidazione, scadenza, revoca) con il filtro di stato nel `WHERE`.
- **Sessione**: l'utente autenticato sta in `req.auth`, non in `req.user`; nessun ruolo nella sessione (si legge da `venue_members`); `last_seen_at`/`expires_at` si aggiornano al massimo ogni 5 minuti e mai oltre `created_at + 90 giorni`; il cookie dura quanto il tetto assoluto e non viene rinnovato; ogni fallimento dell'autenticazione dà lo stesso 401; il logout revoca solo la sessione corrente e scrive l'evento solo se la revoca è avvenuta.

---

## 7. Punti aperti / da verificare (non assunti)

- Aggiornamento del pass via REST: scope, patch vs sostituzione, campi aggiornabili, latenza, se la class è modificabile (reinviare una class in un nuovo JWT non è confermato che la aggiorni).
- Tempi reali di review Google per il publishing access e requisiti del Business Profile per un individuo.
- Se Google offre un meccanismo di notifica per mantenere `wallet_status`.
- Dimensioni e requisiti grafici consigliati del logo del pass (PNG, meglio quadrato); `public/logo.png` non è servito.
- Comportamento del tocco del tag su iPhone (lettura in background e apertura del link).
- Requisiti Cloudflare per un tunnel con URL fisso; scelta hosting di staging (es. Railway, Fly.io).
- Rollover della promozione e destino dei timbri maturati alla scadenza (decisione di prodotto).
- Rotta "riaggiungi card" per chi ha rimosso il pass.
- Comportamento di Safari/iOS sul cookie `httpOnly` dopo il primo deploy di staging: il limite ITP dei 7 giorni non dovrebbe applicarsi ai cookie scritti dal server, ma se l'IP del server è scollegato dal sito principale Safari può limitarlo. Frontend e `/api` dovranno stare sulla stessa origine.
- **Sessione/logout/`visit`, non provato**: testati via HTTP in locale con sessioni create nel DB e con un login vero; non ancora su un browser reale, su HTTPS (cookie `Secure`) né su un iPhone. Il flusso "esci da tutti i dispositivi" non esiste. Il **409** di `visit` ha lo status nel codice ma non è esercitabile a runtime senza forzare una race.
- **Auth**: limiti di invio e consegna di Gmail per le email automatiche; configurazione di Google Sign-In in produzione (client ID, schermata di consenso, requisiti di verifica), da riprendere **dopo lo staff**; se `email_verified` di Apple sia sempre vero (la documentazione ufficiale dice che può essere falso per Work & School, un tutorial di terzi dice sempre vero); come collegare un login Apple con email proxy; trattamento GDPR di `subject_hash` con la procedura di anonimizzazione (rimandata a prima del primo utente reale).
- **Percorso email, non provato**: il primo accesso simultaneo con la stessa email da due sfide diverse non è riproducibile (una sola sfida viva per destinatario); la protezione è per costruzione (`ON CONFLICT`). Il ramo "utente anonimizzato" di `loginWithEmail` non ha un test dedicato (quello di `authenticate` è coperto da `scripts/session.ts`).

---

## 8. Comandi utili

```bash
# sviluppo
npm run dev
npm run typecheck
npm run seed          # solo sviluppo

# test di visit + polling (crea utenti/sessioni di test, pulisce a fine run)
npx tsx --env-file=.env scripts/poll-request.ts

# test dell'auth (server acceso)
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts

# database
docker exec -it stampy-db psql -U stampy -d stampy_dev
npx drizzle-kit generate --config=src/drizzle.config.ts --name=NOME
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql

# tunnel (quando serve)
cloudflared tunnel --url http://localhost:3000

# controlli su .env senza mostrare i valori
awk -F= '/^[A-Z_]+=/{print $1, length($2)}' .env

# versione di Express
npm ls express
```

---

## 9. Fonti consultate per l'auth (24/10/2026) e loro limiti

**Lette direttamente (documentazione ufficiale):**
- Google Sign-In, verifica del token lato server: firma, `aud`, `iss`, `exp`; `sub` come chiave (l'email può cambiare); Google è autorevole per l'email solo con `@gmail.com` oppure `email_verified` + `hd`, altrimenti raccomanda una verifica aggiuntiva.
- Apple, `id_token` di Sign in with Apple: email reale o proxy, `is_private_email`, email assente o non verificata possibile per Work & School; `sub` come identificativo (via fonti di terzi, `sub` legato al team sviluppatore).
- OWASP Forgot Password Cheat Sheet: risposta uguale per account esistenti e non, nessun blocco dell'account, token monouso.
- Microsoft MSRC, "Pre-hijacking attacks" (2022): analisi di 75 servizi, almeno 35 vulnerabili; causa radice: mancata verifica del possesso dell'identificativo.

**Lette solo tramite fonti di terzi (non i testi originali):**
- NIST SP 800-63B-4: 6 cifre minimo, validità massima 10 minuti, tetto di 100 fallimenti consecutivi, SMS "restricted", email non valida come canale "out-of-band" per autenticazione forte.
- OWASP ASVS 4.0 §2.7 (versione annotata): scadenza a 10 minuti, monouso, solo hash. La numerazione della versione 5.0 è diversa e non è stata verificata.
- Blog e documentazione di vendor (Ory, WorkOS, Stytch, Bird, altri) su collegamento degli account, cooldown dei re-invii, limiti per destinatario.

**Valori che sono scelte nostre, non standard:** 5 minuti di validità, 5 tentativi per codice, 45 secondi di attesa, 5 invii all'ora con sospensione di 1 ora, uso dell'HMAC per il codice, finestra scorrevole.
