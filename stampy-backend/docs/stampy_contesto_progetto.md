# Stampy — Contesto di progetto

> Documento vivo. Aggiornarlo a ogni decisione presa, non riscriverlo da zero.
> Ultimo aggiornamento: 26 ottobre 2026 (pomeriggio) — fase: pre-MVP, **Fase 3 chiusa** (DB, creazione card Google Wallet, richieste pendenti, polling cliente); **Fase 4 in corso: migration 2 chiusa, percorso email dell'auth e `isAuthenticated`/logout implementati e testati**. Prossimo: `visit` e polling con l'utente di sessione, poi login Google e staff. Nessun frontend, nessun cliente pilota confermato.

---

## 1. Idea in breve

Stampy sostituisce le tessere fedeltà cartacee a timbri con una card digitale salvabile nel Wallet dello smartphone (Apple Wallet / Google Wallet), per attività locali food & beverage (bar, pizzerie, ristoranti, gelaterie, panifici...). Niente app dedicata da scaricare per il cliente.

## 2. Obiettivo

Rendere i programmi fedeltà accessibili anche a piccole attività, con:
- esperienza rapida per il cliente
- esperienza poco invasiva per lo staff
- personalizzazione della card e della formula promozionale per ogni locale
- dati utili al gestore su visite, premi, andamento

Mercato iniziale: piccole/medie attività locali in Italia, spesso ancora su cartoncino cartaceo o senza programma fedeltà.

## 3. Stato del progetto

- Nessun cliente pilota reale confermato al momento.
- Sviluppo in autonomia, **budget minimo: si incassa prima di investire** (vincolo che ha guidato la scelta dell'auth: costo ~0, niente SMS a pagamento al lancio).
- Nessun vincolo di tempo fisso.
- Fase 3 chiusa: schema DB e migration 1, creazione card e link Wallet, richieste di timbro pendenti con scadenza lazy, polling del cliente. Dettagli in `progress.md` e `CODEBASE_CONTEXT.md`.
- Fase 4 avviata: **migration 2** (`auth_identities`, `otp_challenges`, `sessions`, `auth_events`; telefono tolto da `users`, email aggiunta) applicata e verificata sul DB reale (19 controlli OK, 24/10).
- Fase 4 — **percorso email** (`POST /api/auth/email/request` e `/verify`: utente, identità `email`, sessione, cookie) e **`isAuthenticated` + logout** implementati e testati da terminale il 26/10 (`scripts/session.ts` 16/16, `scripts/otp-verify.ts` 16/16, `scripts/otp-request.ts` 13/13, typecheck pulito). API di sessione: `GET /api/auth/me`, `POST /api/auth/logout`.

---

## 4. Decisioni prese

### 4.1 Modello cliente / card

- **Cliente unico sulla piattaforma**: un profilo per persona (dati minimi), non duplicato per ogni locale.
- **Una card per locale**: se un cliente aderisce a più locali, ha più card distinte nel Wallet (non una card unica multi-locale). Motivo: ogni locale ha la propria identità di brand e la propria formula promozionale, incompatibili in un layout condiviso; è anche il modello mentale già noto ai clienti (una tessera = un negozio).
- Una eventuale "vista riassuntiva multi-locale" per il cliente è un'evoluzione futura fuori dal Wallet (web app Stampy), non necessaria per l'MVP.
- **Identificazione e deduplica del cliente (decisione del 24/10/2026, sostituisce "telefono verificato via OTP")**: l'identificatore primario è l'**email verificata**. Nessuna password. Il cliente entra con:
  - **email inserita a mano + codice OTP ricevuto via email**, oppure
  - **Google** (accesso con un tap).
  Registrazione e login sono lo stesso gesto: se l'email non esiste si crea l'utente, se esiste si entra.
  Metodi **futuri, non confermati** (lo schema è già predisposto): Apple e telefono con SMS. Email e telefono non si uniscono.
  Nessun matching fuzzy automatico. Come rete di sicurezza per i casi limite (cambio email, ecc.): merge manuale su richiesta, gestito da supporto/admin.
- **Stesso account con metodi diversi**: se un utente registrato con email entra poi con Google usando la stessa email, accede allo **stesso account** (e viceversa), ma solo con le condizioni di sicurezza del §4.11. Con Apple "Hide My Email" l'indirizzo è un proxy mai uguale all'email registrata: il collegamento automatico non è possibile, si farà con un passaggio guidato (da decidere quando si implementa Apple).
- **Flusso di registrazione/onboarding**: il cliente non si iscrive al singolo negozio, si iscrive al sistema Stampy (account unico) e poi crea una card per ogni locale a cui aderisce. Flusso: cliente scannerizza il QR (o tocca il tag NFC) esposto dal negozio → redirect alla web app → se non c'è sessione valida, schermata di accesso ("Continua con Google" oppure email con codice) → dopo l'accesso (o se già loggato) → il backend crea la card per quel locale.

### 4.2 Promozioni

- Si parte con **un solo modello promozionale** (timbri: es. 10/10 → premio).
- Backend e database vanno progettati in modo che aggiungere altri modelli (punti, crediti, importo speso, premi intermedi, promo a tempo) sia un'estensione, non una riscrittura. A livello di schema dati: campo `type` + configurazione parametrica (JSONB) per non dover riscrivere tabelle quando si aggiungono modelli.
- Nella prima fase le promozioni le configura il team Stampy (non self-service per il gestore del locale), per non caricare lo staff di un compito in più.

### 4.3 Registrazione cliente

- Self-service: il cliente si registra da solo dalla web app (non lo staff).
- Prima priorità: card funzionante e aggiornata correttamente. Notifiche/offerte push sulla card: eventuale evoluzione successiva, non MVP.

### 4.4 Interazione in negozio — flusso NFC (assegnazione timbro / riscatto premio)

- **NFC** come metodo principale di riconoscimento, **QR code** come alternativa/fallback (registrazione, telefoni senza NFC, malfunzionamento tag).
- Operazione (assegnazione timbri, validazione premio) confermata **sempre dallo staff, mai automatica** — anche per le promozioni a consumazione singola (es. "ogni tot consumazioni, sconto fisso"): cambia solo che lo staff non deve scegliere una quantità (azione a bottone singolo invece di stepper numerico), ma la conferma manuale resta sempre necessaria per evitare abusi (es. cliente che tocca il tag più volte da solo).
- **Chiarimento tecnico importante**: il tag NFC fisico sul banco viene letto **nativamente dal sistema operativo del telefono** (iOS e Android), non da codice JavaScript dentro il browser. Un tag NFC con un semplice record NDEF di tipo URL fa aprire il link di default al tocco, esattamente come i tag NFC per condividere il WiFi — funziona identico su iPhone e Android, nessuna app richiesta. Questo è diverso e non va confuso con la **Web NFC API** (lettura NFC programmatica da dentro una pagina web già aperta): quella API è supportata solo su Chrome/Android e **non esiste su Safari/iOS** (nessun segnale che Apple la implementerà). Il flusso Stampy usa solo la lettura nativa del tag, quindi non è soggetto a questo limite.
- **Flusso completo assegnazione timbro (coda in tempo reale):**
  1. Cliente avvicina il telefono al tag NFC del banco.
  2. Il sistema operativo legge il link dal tag e lo apre nel browser.
  3. Il link contiene `venue_id` (backend: `POST /api/venues/:venueId/visit`). Con l'auth, se la sessione è valida si procede, altrimenti accesso.
  4. Se il cliente non ha la card per il locale, il backend la crea e restituisce il link Wallet (`state: card_created`). Se la card esiste, crea una `stamp_request` `pending`; se ce n'è già una valida restituisce quella (`state: request_pending`; una sola pendente per card, garantito da indice parziale).
  5. Il cliente vede "in attesa di approvazione": polling ogni 1–2 secondi su `GET /api/requests/:requestId` (`{status, expiresAt}`; implementato, testato). WebSocket/SSE solo se i numeri lo richiederanno.
  6. La web app staff (autenticata; il `venue_id` si ricava dalla sessione tramite `venue_members`, mai da body o params) mostra le richieste pendenti del locale.
  7. Lo staff inserisce la **quantità di prodotti consumati** (es. 15), non i timbri. Il backend la scompone in tratti consecutivi: con soglia 10 e card a 0, 15 prodotti → 10 timbri, 1 premio (`redeem`), 4 timbri → card 4/10. Un limite massimo evita errori di digitazione. Anteprima dei tratti: rimandata.
  8. In un'unica transazione il backend ricalcola i tratti (non si fida del client), registra uno `stamp_event` per tratto (`idempotency_key = {requestId}:{n}`), aggiorna `stamps_count` con UPDATE atomico e marca la richiesta `approved`. Se la promozione della card non è quella attiva, risponde 409. Dopo il commit aggiorna il pass via REST (best effort: se fallisce il DB resta corretto).
  9. Il cliente vede "approvata" insieme al saldo aggiornato (il pass può avere latenza, quindi il saldo si mostra anche nella pagina web).
  10. Timeout 3 minuti con scadenza lazy: la verità è `expires_at`, ogni lettura riporta a `expired` le pendenti scadute (solo da `pending`: mai richieste già `approved`/`rejected`), niente cron. Dopo un rifiuto o una scadenza il cliente può rifare subito il tocco.
- **Riscatto premio**: stesso meccanismo, nessun hardware. L'azione (`stamp` o `redeem`) la decide il backend alla conferma in base allo stato della card; una singola richiesta può contenere più tratti, compreso un `redeem`.
- **Vero "tap POS" (NFC bidirezionale tipo Apple Pay/loyalty native, es. Apple Wallet VAS / Google Wallet Smart Tap)**: resta un obiettivo dichiarato ma **non è fattibile via browser/web app** — richiede terminale hardware certificato che parla i protocolli proprietari Apple/Google. Coincide con l'"hardware dedicato" del punto 4.5: da valutare insieme, non nell'MVP.

### 4.5 Interfaccia staff

- Prima fase: **web app** utilizzabile da un tablet/telefono qualsiasi già in commercio (no hardware dedicato).
- Motivazione: un terminale dedicato è un secondo prodotto (hardware + firmware + provisioning + assistenza) che rallenterebbe la validazione se sviluppato in parallelo al software. Verrà progettato meglio *dopo* aver osservato l'uso reale dello staff con la web app.
- Hardware dedicato: rimane un obiettivo dichiarato per una fase successiva, non nell'MVP. **Include anche** l'eventuale vera esperienza "tap POS" (vedi 4.4), che richiede terminale certificato.

### 4.6 Wallet

- **Si parte solo con Google Wallet** (gratuito, nessun costo di attivazione).
- **Apple Wallet aggiunto in una seconda fase**, quando il costo dell'Apple Developer Program (99$/anno, necessario per firmare i pass `.pkpass`) sarà sostenibile rispetto ai primi clienti paganti.
- **Decisione (ottobre 2026)**: l'interfaccia astratta "wallet provider" è stata rimossa (c'era una sola implementazione); si estrae da `GoogleService` quando si aggiunge Apple. Il codice Wallet resta isolato in un solo modulo. Aggiungere Apple non deve richiedere di toccare dati, logica timbri e app staff.
- **Modello Google**: una LoyaltyClass per locale (solo identità e branding: nome, logo, colore, banner); tutto ciò che dipende dalla promozione (premio, soglia, contatore) sta nell'object della card, così la card sopravvive al cambio di promozione.
- Il link "Add to Google Wallet" si firma in locale (JWT con la chiave del service account). L'**aggiornamento dell'object da server via REST non è ancora verificato**: è il gate tecnico prima di implementare la conferma.
- `wallet_status` oggi vale `not_added` e non viene letto né aggiornato; sarebbe affidabile solo se Google offre un meccanismo di notifica (da verificare).
- Issuer account ancora in demo mode.
- **Task da avviare appena possibile** (non legato alle altre decisioni): richiesta di pubblicazione/business review per **Google Wallet Issuer account** (necessaria prima di poter emettere pass a utenti reali fuori da un elenco di tester). Da verificare in fase di richiesta, senza inventare risposte: tempi tipici di review, eventuale necessità di una web app pubblica già online per la richiesta, limiti di pass in stato "test" prima dell'approvazione.

### 4.7 Multi-tenant

- Il sistema va progettato **multi-tenant fin dal primo schema dati**, anche partendo da un solo locale pilota. Cambiare da isolato a multi-tenant dopo richiederebbe una migrazione dati costosa.

### 4.8 Dashboard gestore

- Ibrida: numeri semplici per una panoramica immediata (iscritti, timbri assegnati, premi riscattati) + grafici di andamento nel tempo per analisi più approfondite.

### 4.9 Test tecnico (NFC, Wallet, hardware)

- Sviluppo quotidiano: tunnel locale (es. Cloudflare Tunnel) per esporre il backend in sviluppo con URL HTTPS pubblico, necessario perché NFC e push Wallet non funzionano su `localhost`.
- Test sul campo (hardware, demo, prove più stabili): deploy su un ambiente di staging reale (es. Railway, Fly.io), separato dalla futura produzione, con URL fisso da programmare nei tag NFC definitivi.

### 4.10 Stack tecnico

- **Backend**: Node.js + Express + TypeScript.
- **Frontend**: Vue.js.
- **Database**: **PostgreSQL** (SQL), non MongoDB. Motivazione: il modello dati è intrinsecamente relazionale (card → 1 utente + 1 venue, transazioni → 1 card), e due requisiti già decisi pesano sulla scelta — isolamento multi-tenant nativo tramite foreign key/vincoli (4.7) e idempotenza delle transazioni di timbro tramite unique constraint + transazioni ACID, entrambi più naturali e sicuri su un DB relazionale che a livello applicativo con un DB documentale. La parte variabile (parametri delle promozioni, 4.2) si gestisce con una colonna `type` + campo `JSONB`.
- **Strumenti**: Drizzle ORM con migration versionate (mai auto-sync, mai `push`), PostgreSQL 16 in Docker in sviluppo. Validazione: class-validator per i DTO, zod per env, branding, config e metadata degli eventi di auth. Express **5.2.1** (verificato con `npm ls express`). `cookie-parser` 1.4.x senza segreto per leggere il cookie di sessione.
- **Auth**: cookie `httpOnly` + sessione nel DB revocabile, non JWT eterno in `localStorage`. Dettagli e parametri in §4.11.
- **Schema dati**: la fonte di verità è `stampy_db_schema.md`. Tabelle attuali (11): `users` (con `email` e `is_platform_admin`), `venues`, `venue_members` (ruolo `owner`/`staff` per locale), `promotions`, `cards`, `stamp_requests`, `stamp_events`, `auth_identities`, `otp_challenges`, `sessions`, `auth_events`. Il ruolo staff/gestore non sta su `users` ma su `venue_members`.

### 4.11 Auth e identità (decisioni del 24/10/2026)

Obiettivo: costo ~0 al lancio, buona esperienza al banco, tutto tracciabile a DB, struttura estendibile a Apple e telefono senza riscrivere.

- **Niente password.** Rischi evitati: riuso delle password, data breach a nostro carico, codice di reset. Il rischio principale del metodo scelto è la compromissione della casella email dell'utente, che esiste anche con la password (il reset passa dall'email). Per il livello di rischio di Stampy (nessun pagamento, conferma dello staff) è accettato.
- **Invio codici**: email dall'account Google dedicato a Stampy per ora. Interfaccia `EmailSender` con implementazione "console" in sviluppo e Gmail in staging: **proposta, non ancora confermata**. Limiti di invio e consegna di Gmail per messaggi automatici: **da verificare**.
- **Schema (migration 2)**: l'utente (`users`) è separato da come dimostra di essere se stesso (`auth_identities`: email, google; in futuro apple, phone). `users.email` è UNIQUE e valorizzata solo dopo prova di possesso: è la garanzia di un account per email anche con richieste simultanee.
- **Chiave dell'identità**: `(provider, sub)` per Google, mai l'email (può cambiare).
- **Codici OTP**: 6 cifre, validità **5 minuti**, monouso, un nuovo invio invalida il precedente, salvati solo come HMAC. **5 tentativi** per codice. **45 secondi** tra due invii allo stesso destinatario (imposti lato server). **5 invii all'ora** per destinatario (finestra scorrevole), poi sospensione di 1 ora. Nessun limite per IP per ora. Risposta identica per email esistente e inesistente.
- **Google**: si verificano firma, `aud`, `iss`, `exp` del token. Collegamento automatico a un account esistente solo se l'email è `@gmail.com` oppure `email_verified` è vero con `hd` valorizzato (Google è autorevole per quell'indirizzo). **Google con email di terzi (es. libero.it): rifiutato** nell'MVP, con invito a usare l'email con codice. Cambiarlo in futuro non richiede di toccare lo schema esistente, solo una migration additiva.
- **Nessun account esiste senza prova di possesso** dell'identificativo e non esiste funzione "cambia email" non verificata: difesa dal *pre-hijacking* (Microsoft MSRC, 2022).
- **Audit**: tabella `auth_events` append-only (invii, tentativi falliti, login, collegamenti, rifiuti, logout), senza dati personali in chiaro. I `metadata` sono validati con uno schema zod **per tipo di evento** dentro `log()`: whitelist chiusa, niente IP, niente dominio dell'email, mai email o codici; `logout` non ha metadata.
- **Sessioni (deciso il 26/10/2026)**: cookie `sid` `httpOnly`, **`SameSite=Lax`** (Strict romperebbe l'apertura da tag NFC/QR), `Secure` solo in produzione, `Path=/`, senza segreto (`cookie-parser` senza firma). In DB solo lo **SHA-256** del token. Sessione **scorrevole con tetto assoluto**: dura **30 giorni dall'ultima attività**, si rinnova al massimo **una volta ogni 5 minuti** (non a ogni richiesta) e **mai oltre 90 giorni dalla creazione**; il tetto si calcola da `sessions.created_at`, nessuna colonna nuova. Il cookie ha `maxAge` = tetto assoluto (90 giorni) e non viene rinnovato: dopo 90 giorni si riaccede. Valori nostri, non standard.
- **Fallimenti dell'autenticazione**: cookie assente, alterato, scaduto, revocato, utente anonimizzato o tetto superato danno tutti lo **stesso 401** (`{error:"Unauthorized", message:"Non autenticato"}`). Nessuna distinzione, nessun log sui 401.
- **Logout**: revoca **solo la sessione corrente** (`revoked_at` scritto solo se NULL), cancella il cookie con le stesse opzioni della scrittura e scrive un evento `logout` nella stessa transazione, solo se la revoca è avvenuta. "Esci da tutti i dispositivi" non è implementato.
- **Utente autenticato nel codice**: `req.auth = { user: {id, email, displayName, isPlatformAdmin}, session: {id, authProvider} }`, letto con `requireAuth(req)`. **Non `req.user`**: `@types/passport` (dipendenza in disuso) dichiara già `Express.Request.user` e un tipo nostro renderebbe gli handler non assegnabili ai `RequestHandler` di Express. I ruoli non stanno né in `req.auth` né nella sessione: si leggono da `venue_members` a ogni richiesta.
- **Apple**: non deciso. Nota tecnica: l'email "Hide My Email" non coincide mai con quella registrata; collegamento guidato dall'utente (email + codice), da confermare all'implementazione.
- **Fonti consultate** (24/10): documentazione Google Sign-In (verifica del token), documentazione Apple (`id_token`), Microsoft MSRC (pre-hijacking), OWASP (Forgot Password Cheat Sheet, ASVS 4.0 §2.7), NIST SP 800-63B (solo tramite citazioni di terzi). Dettagli e limiti in `progress.md` §9.

---

## 5. Punti aperti / da validare

- **Modello di business**: invariato, rimandato; prerequisito parlare con 2-3 gestori reali prima del primo pilota.
- **Cosa succede alla scadenza o al cambio di promozione** (azzerare le card, tenere i timbri maturati, avviso sulla card): decisione di prodotto da prendere, da chiedere anche ai gestori. Per ora la `confirm` rifiuterà con 409 se la promozione della card non è quella attiva.
- **Rotta "riaggiungi card"** per chi ha rimosso il pass.
- **Google Wallet**: aggiornamento del pass via REST (latenza, campi aggiornabili), tempi e requisiti del publishing access per un individuo senza P.IVA, mantenimento di `wallet_status`.
- **Branding di default** per un locale appena creato e personalizzazione self-service (rimandata).
- **Auth (aperti)**: CORS/CSRF con i cookie (CORS ristretto a una sola origine con `credentials` e controllo `Origin` sulle rotte che modificano stato), come creare il primo `owner` di un locale, login dello staff (stesso metodo o più forte, visto che un account staff compromesso può approvare timbri falsi), come conservare il `venueId` durante l'accesso, limiti di Gmail per l'invio, configurazione Google Sign-In (client ID e schermata di consenso, da leggere nella documentazione ufficiale), retention di `otp_challenges` e `auth_events`, trattamento GDPR di `subject_hash`. Vedi `Stampy_Handoff_Fase_4c.md` §6.
- **Safari/iOS**: il cookie impostato dal server con `Set-Cookie` httpOnly non rientra nel limite ITP dei 7 giorni (che riguarda i cookie scritti da JS), ma se il server che lo imposta ha un IP scollegato dal sito principale Safari può limitarlo a 7 giorni. Per questo frontend e `/api` dovranno stare sulla stessa origine. Da provare su un iPhone vero dopo il primo deploy di staging.
- **Apple** (futuro): collegamento con email proxy, verificare nella documentazione quando si implementa.
- **Hosting e URL fisso** (dominio, tunnel con nome o staging).
- *Risolti*: polling breve invece di WebSocket per l'MVP; quantità "B" con tratti; scadenza lazy delle richieste; **metodo di accesso (email con codice + Google, niente password, niente SMS al lancio)**; struttura delle tabelle di auth (migration 2); **durata e revoca delle sessioni (scorrevole 30 giorni + tetto assoluto 90 giorni, logout della sola sessione corrente)**.

---

## 6. Cosa NON fare (promemoria da non dimenticare)

- Non sviluppare il terminale hardware dedicato in parallelo al software nella fase attuale (questo include il vero "tap POS" via Apple VAS / Google Smart Tap — è hardware certificato, non un'estensione della web app).
- Non implementare Apple Wallet prima di aver validato il flusso su Google Wallet.
- Non modellare il cliente come isolato per locale (serve cliente unico + iscrizioni multiple).
- Non costruire un motore di regole promozionali generico finché non è chiaro se serve davvero (partire da un modello solo, ma estendibile).
- Non usare Web NFC API per il riconoscimento cliente: non supportata su iOS/Safari. Il tag NFC sul banco va sempre letto in modo nativo dal sistema operativo (semplice record URL).
- Non decidere il modello di business prima di aver parlato con potenziali clienti reali.
- **Privacy (GDPR)**: gli utenti non si cancellano, si anonimizzano (identità eliminate, email e dati personali svuotati, `anonymized_at` valorizzato, sessioni revocate); i log di timbri ed eventi restano.
- **Una card per persona per locale** è garantita a livello DB (UNIQUE `user_id, venue_id`). La card è la relazione cliente ↔ locale e non scade con la promozione.
- **Onboarding (versione attuale del backend)**: al primo tocco del tag senza card, il backend crea la card e restituisce il link "Add to Google Wallet"; non c'è una richiesta di timbro automatica, il primo timbro è un secondo tocco.
- **Una sola promozione attiva per locale** (vincolo DB sugli intervalli di date; la fine di una può coincidere con l'inizio della successiva).
- Config del modello timbri: `{v:1, stampsRequired, reward}`, validata e versionata.
- **Regola**: N prodotti pagati, l'(N+1)-esimo è gratuito (es. 10 pagati → l'11ª gratis → card a 0/10 → si riparte).
- Cosa fare alla scadenza/cambio promozione è **ancora aperto** (vedi §5).
- Non reintrodurre un'interfaccia "wallet provider" astratta finché non c'è un secondo provider reale.
- Non fidarsi mai del client per `venue_id` dello staff, quantità o tratti: si ricavano o si ricalcolano nel backend.
- Non implementare rollover delle promozioni, self-service del branding o anteprima della quantità finché il flusso base (richiesta → conferma → pass aggiornato) non funziona end to end.
- Non aggiornare mai la scadenza di una richiesta senza il filtro `status = 'pending'`: si rischia di sovrascrivere richieste già approvate o rifiutate.
- **Auth — non creare mai un utente o un'identità senza prova di possesso** (codice OTP o IdP autorevole), e non collegare mai due account per email non verificata: è la porta del pre-hijacking.
- **Auth — non usare l'email come chiave dell'identità** nei login Google/Apple: la chiave è `(provider, sub)`.
- **Auth — non collegare automaticamente un login Apple con email proxy** a un account esistente: serve l'azione guidata dell'utente.
- **Auth — non introdurre password né una funzione "cambia email" senza verifica** senza prima rivedere le difese dal pre-hijacking.
- **Auth — non mettere codici, email in chiaro o dati personali in `auth_events.metadata`.**
- **Auth — non limitare gli invii con un contatore globale** (permette di bloccare l'intera app): i limiti sono per destinatario.
- **Auth — l'utente autenticato sta in `req.auth`, non in `req.user`**: `@types/passport` dichiara già `Express.Request.user` e un tipo nostro renderebbe gli handler non assegnabili a Express.
- **Auth — nessun ruolo nella sessione né in `req.auth`**: si legge da `venue_members` a ogni richiesta.
- **Auth — nessuna risposta diversa per i fallimenti dell'autenticazione**: cookie assente, alterato, scaduto, revocato, utente anonimizzato e tetto superato danno lo stesso 401.
- **Auth — non aggiornare `last_seen_at`/`expires_at` a ogni richiesta** (una scrittura ogni 5 minuti al massimo) e **non superare il tetto assoluto** calcolato da `created_at`.
- **Auth — logout dietro `isAuthenticated`**: il secondo logout risponde 401 ma non riscrive `revoked_at` e non crea un secondo evento; l'evento si scrive solo se la revoca è avvenuta (`revoked_at IS NULL` nel WHERE).
- **Auth — il cookie dura quanto il tetto assoluto e non viene rinnovato**: se cambia la politica di sessione vanno rivisti cookie, test e questo documento.
