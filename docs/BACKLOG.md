# Stampy — Backlog

> **L'unica lista di ciò che non è ancora nel codice.** Se qualcosa è stato progettato in un
> handoff e non implementato, vive qui: non viene cancellato né perso.
> Quando è fatto, la voce passa al §8 con una data (la storia completa resta in
> `archive/` e in Git).
> Le decisioni già prese stanno in `CONTEXT.md` e **non vengono riaperte**: qui si dice solo
> se sono state implementate.
> Ultimo aggiornamento: 9 novembre 2026.

**Stati**

| Stato | Significato |
|---|---|
| 2026-11-09 | **Avviso di cambio promozione nel frontend** (B21 chiusa): nuovo `PromotionNotice.vue`. Pagina del cliente `/r/:requestId`: mentre la richiesta è `pending` e `promotionChanged` è `true`, una riga discreta con icona «Nuova promozione! La tua card riparte da zero.». Coda dello staff: pillola «Nuova promozione · card da 0» sulla richiesta. Nessun modale e nessun numero di timbri persi. Verificato a mano con Playwright (API simulate, 390 px, tema chiaro e scuro); `vue-tsc` pulito, nessun test automatico (frontend fuori dal TDD). |
| `DECIDED` | decisione presa, implementazione non iniziata |
| `TODO` | da fare, niente lo blocca |
| `TO-DECIDE` | serve una scelta (di solito di prodotto): nessun codice prima |
| `TO-VERIFY` | serve una verifica esterna (documentazione ufficiale, prova sul campo) |
| `BLOCKED` | dipende da un'altra voce (indicata) |

---

## 1. Prossimo passo

Nessuna voce blocca al momento il flusso end-to-end. B1 (aggiornamento del pass Google dopo la
conferma) è stato implementato il 2026-10-31 ed è registrato nel §8; ne restano B14 e V1 qui
sotto, più B8 (riaggiungere il pass al Wallet quando la card è `active`; una card `not_added`
riceve il link a ogni tocco dal 2026-11-03).

**Metodo di lavoro (deciso il 2026-11-05)**: backend in TDD con test concordati con il
proprietario prima di scrivere codice (vedi `AGENTS.md`).

---

## 2. Deciso e non ancora implementato

| ID | Stato | Cosa manca | Origine |
|---|---|---|---|
| B4 | `DECIDED` | **Anonimizzazione GDPR + retention.** Procedura: cancellare `auth_identities`, `users.email = NULL`, svuotare `display_name`, impostare `anonymized_at`, revocare le sessioni; card e log restano. Retention di `otp_challenges`, `auth_events` e `sessions` (righe scadute/revocate/orfane) da definire. Da decidere anche se `auth_events.subject_hash` è ancora un dato personale (azzerarlo o ruotare il segreto). **Prerequisito: primo utente reale.** | `archive/stampy_db_schema.md` §6, `archive/Stampy_Handoff_Fase_4c.md` §6.10 |
| B5 | `DECIDED` | **Login con Google** (`POST /api/auth/google`, body `{idToken}`). Verificare firma/`aud`/`iss`/`exp` con `google-auth-library` (già installata); cercare `(google, sub)`; collegare all'utente con la stessa email **solo** se `@gmail.com` oppure `email_verified` + `hd`; email di terzi → rifiuto + evento `google_untrusted_email_rejected`; poi sessione e `login_success`. Richiede configurazione esterna (V4). Rimandato a "dopo lo staff", che è chiuso. | `archive/Stampy_Handoff_Fase_4c.md` §5D, §6.8 |
| B6 | `DECIDED` | **Invio email reale**: `GmailEmailSender` + `EMAIL_PROVIDER` (`console` \| `gmail`) in `env.ts`. Oggi esiste solo `ConsoleEmailSender` (si rifiuta di partire in produzione). Limiti di Gmail da verificare (V3); valutare un provider transazionale quando ci sarà un dominio (SPF/DKIM). | `archive/Stampy_Handoff_Fase_4c.md` §5E, `archive/progress.md` §5.11 |
| B8 | `TODO` | **"Riaggiungi card" per una card `active`**: chi ha rimosso il pass non ha un posto dove riottenere il link (una card `not_added` lo riceve già a ogni tocco). La parte backend è banale (il `saveUrl` è firmato in locale); aperto: dove mettere il link nella UI e cosa fa Google quando si salva di nuovo un object esistente (V1). | `archive/stampy_contesto_progetto.md` §5 |
| B9 | `TO-DECIDE` | **Branding di default** per un locale appena creato (oggi `branding = {}` fa fallire la creazione della card) e personalizzazione self-service (rimandata). | `archive/stampy_contesto_progetto.md` §5 |
| B10 | `TO-VERIFY` | **Affidabilità di `wallet_status`**: dal 2026-11-03 diventa `active` dopo che il cliente tocca "Aggiungi a Google Wallet" (intenzione, non prova). `removed` non viene ancora mai impostato; diventerebbe affidabile solo con un meccanismo di notifica di Google (V1). | `archive/stampy_contesto_progetto.md` §4.6 |
| B11 | `DECIDED` | **Dashboard del gestore del locale** (soci, timbri assegnati, premi riscattati + grafici nel tempo). Non iniziata. | `archive/stampy_contesto_progetto.md` §4.8 |
| B12 | `DECIDED` | **Apple Wallet**, solo dopo aver validato il flusso su Google: 99 $/anno, pass `.pkpass` firmati, estrazione del codice Wallet da `wallet/wallet.service.ts`. Con Apple si valuterà anche il login con Apple. | `archive/stampy_contesto_progetto.md` §4.6, §5 |
| B14 | `TO-VERIFY` | **Notifica push quando si raggiunge il premio** (`stamps_count = stampsRequired`) via `notifyPreference` sul PATCH, al massimo una volta per ciclo di card (tetto ≈3 push/24 h). Il literal accettato non è noto (`notifyOnUpdate` / `NOTIFY` / `NOTIFY_ON_UPDATE`): provare su un issuer demo prima di scrivere codice (V1). Oggi ogni aggiornamento del pass è silenzioso. | `google/wallet-pass-update.md` |
| B15 | `TODO` | **La pagina del cliente non sa identificare il locale** (2026-11-04: `publicCode` è ora nella risposta del polling e viene mostrato su `/r/:requestId`; mancano ancora nome e id del locale). La coda identifica una richiesta con `publicCode`, ma `visit` lo restituisce solo con `card_created`, e né `visit` né `GET /requests/:id` restituiscono il nome del locale. Con due richieste pending, lo staff non riesce a distinguerle dallo schermo del cliente. Soluzione: aggiungere `publicCode` e nome del locale a quelle risposte. | Frontend, 2026-11-01 |
| B18 | `TODO` | **Animazione del timbro a inchiostro sulla pagina del cliente** (**nell'MVP** dal 2026-11-06, decisione del proprietario): quando lo staff conferma mentre `/r/:requestId` è aperta, mostrare un timbro per ogni timbro confermato. La risposta del polling ha ora `stampsAdded` (2026-11-03); l'animazione resta da fare. | Test frontend, 2026-11-02 |
| B19 | `TODO` | **Storico: limite di visualizzazione e paginazione nel frontend.** Dal 2026-11-04 `GET /venues/:venueId/requests/history` non ha `limit`/`offset` e restituisce ogni riga che soddisfa i filtri, e `RequestHistory.vue` (storico staff e cliente) le renderizza tutte. Limiti di visualizzazione e paginazione vanno gestiti nel frontend (es. render a blocchi). Rischio di prestazioni: la risposta è illimitata, quindi quando un locale avrà migliaia di richieste payload e render cresceranno senza limite; da rivedere (tetto lato server o cursore) prima che un locale ci arrivi. | `RequestHistory.vue`, `requests.service.ts` (`getHistory`) |
| B20 | `TODO` | **Pagina di landing `/stampy`** (**nell'MVP**, decisione del proprietario del 2026-11-06): descrizione del servizio e informazioni per i locali e per i clienti. **Ultima cosa da fare dell'MVP**: contenuti e struttura da definire più avanti, nessun lavoro prima. Frontend, quindi fuori dal TDD. | Proprietario, 2026-11-06 |
| B22 | `TO-VERIFY` | **Messaggio con notifica sul pass al cambio di promozione** (es. «Nuova promozione dal GG/MM», `addMessage` con `TEXT_AND_NOTIFY`). Decisione del proprietario 2026-11-09: per ora **non servono notifiche push**; la parte che serviva (il pass mostra la promozione nuova alla conferma) è fatta (§8, 2026-11-09). Resta aperto solo il messaggio: la documentazione non dice la forma del body di `addMessage`, se `id` è univoco, lo scopo del tetto di 3 push/24 h (condiviso con B14?) né il codice HTTP di `QuotaExceededException`; provare su un issuer demo (V1). | Proprietario, 2026-11-09 |
| B13 | `TO-DECIDE` | **Accesso con telefono + SMS**: solo con un cliente reale (costo per messaggio, il NIST lo classifica come "restricted"). Schema già predisposto. | `archive/progress.md` §5.27 |

---

## 3. Debito tecnico verificato nel codice

Nessuna di queste voci blocca lo sviluppo; quasi tutte bloccano il deploy.

| ID | Stato | Cosa | Dove |
|---|---|---|---|
| C5 | `TODO` | `start` usa `tsx` mentre `build`/`dist` sono scollegati; `dist/` è vecchio e ignorato da Git. Decidere il deploy (tsx o build) e allineare gli script. | `package.json`, `dist/` |
| C6 | `TODO` | `visit` non è in una transazione (i passi sono idempotenti, ma una card può restare senza richiesta se fallisce a metà). | `src/api/venues/venues.controller.ts` |
| C7 | `TODO` | Il **409** di `visit` ha lo status nel codice ma non si può esercitare senza forzare una race: nessun test lo copre. | `venues.controller.ts` |
| C11 | `TODO` | `npm run script:all` si ferma: `create-owner` e `create-venue` richiedono argomenti e escono con 1; inoltre la catena non passa `--env-file=.env`. O si tolgono dalla catena o si accettano argomenti. | `package.json` |
| C13 | `TODO` | `addOrGetCard` fa `INSERT` prima di `SELECT` (scelta accettata: evita la race). Se il codice cresce, valutare un `CardsService` più esplicito. | `cards.service.ts` |
| C14 | `TODO` | `.vscode/settings.json` è tracciato: decidere se tenerlo. | `.vscode/` |
| C15 | `TODO` | Il tag `fase-4d-chiusa` non è mai stato creato (il repo ha solo `refactor-struttura-chiuso`). I tag non sono essenziali, ma la chiusura delle fasi è tracciata solo dai commit. | Git |

---

## 4. Test

| ID | Stato | Cosa |
|---|---|---|
| T2 | `TODO` | Un fallimento isolato e non riprodotto in `otp-request` ("5 richieste simultanee" dopo un riavvio di nodemon). Se si ripresenta, salvare l'output prima di indagare. |
| T3 | `TODO` | Test da aggiungere quando la funzionalità esiste: aggiornamento end-to-end del pass (B1), login Google con token valido/manomesso/`aud` sbagliato/email di terzi (B5), anonimizzazione (B4), `visit` 409 (C7). |
| T4 | `TODO` | **Collezione Bruno** per test manuali strutturati: solo proposta, non è stato creato nulla. Il piano prevedeva cartelle `00–09` e fixture generate da script (Bruno non ha accesso al DB né ai codici OTP). |
| T5 | `TODO` | Test reale su browser/iPhone/HTTPS: cookie `Secure`, `SameSite=Lax` quando si apre da un tag, sliding della sessione. Oggi tutto è testato solo su HTTP locale. |
| T6 | `TODO` | **Giro di test manuale del frontend**, nel browser, server di sviluppo, DB vuoto (`stampy-backend/scripts/reset-data.sql`). **A fatto (2026-11-02)**, **B fatto (2026-11-03)**, **C fatto (2026-11-03)**, da rifare per le schermate del wallet cambiate lo stesso giorno (passi 1–4, 6); **D automatizzato il 2026-11-04 (43 ✔), il giro umano è ancora aperto.** Checklist qui sotto. |

### Revisione del frontend, 2026-11-03

Implementato dalla revisione (lotti L1–L4, `UX-11` = B15 escluso): BUG-01, UX-02..UX-10, A11Y-01..03, TECH-01.
**Verificato solo con `npm run build` (vue-tsc) — nessuna esecuzione nel browser**: Chromium headless non riusciva a partire (libreria di sistema `libnspr4.so` mancante). Da ricontrollare dal vivo: BUG-01 (il 409 da due tab mantiene il suo messaggio), feedback sticky a 360 px, quantità digitata, focus su `<main>`/campo del codice, `/` per un account solo cliente → `/scan`. Il testo di UX-10 ("Il prossimo prodotto è gratis…") attende l'approvazione del proprietario. Non fatto: L5 (UI-01 flash del tema, UI-02 layout staff più largo, DOC-01 README/CONTEXT §4.9 "frontend non iniziato" non aggiornati).

### Setup di T6

1. Resettare il DB, riavviare `npm run dev`; `APP_ORIGIN=http://localhost:5173` in `.env`.
2. `create-venue.ts --stamps 5 ...` (stampa l'URL del tag), fare login una volta come email dello staff su `/login` (il codice è stampato nel log del backend), poi `create-owner.ts <email> <slug>`.
3. Cliente in un secondo profilo del browser o in incognito (cookie `sid` separato). Aprire l'app su `:5173`, mai su `:3000`.
4. Limiti: codice 5 min, 45 s tra gli invii, 5 invii/ora, 5 tentativi, richiesta di timbro 3 min, 10 nuove richieste/ora per card, quantità 1–50.

### T6-A. Login: FATTO (2026-11-02)

Bug trovati e corretti: tentativi rimasti mostrati, distinzione "scaduto" / "non valido", cooldown saltato per un codice morto, countdown azzerato quando il codice è morto o l'email cambia (commit `5872fe5`, più le correzioni del countdown).

### T6-B. Redirect e guardie: FATTO (2026-11-03)

Bug trovato e corretto: con il backend fermo, il proxy di sviluppo di Vite non risponde mai (nessun errore) e `fetch` non aveva timeout, quindi un reload lasciava una pagina bianca. `api()` ora va in timeout dopo 8 s (4 s per la sonda `GET /auth/me`) e l'app va su `/session-error`. In produzione un reverse proxy risponde subito 502, quindi era una stranezza solo dello sviluppo.
Decisione: cancellare `sid` e rifare il login lascia orfana la vecchia riga di `sessions`. È previsto (una sessione per dispositivo o browser, `CONTEXT.md` §5.4); la riga scade da sola. Le righe non vengono mai cancellate, vedi la nota sulla retention in B4.

Checklist come eseguita:

| Azione | Atteso |
|---|---|
| Disconnesso, aprire `/staff` | `/login?next=/staff`, poi di nuovo `/staff` dopo il login |
| `/login?next=//evil.com`, `?next=/\evil`, `?next=https://evil.com`, `?next=/login` | `next` ignorato; destinazione predefinita, mai un sito esterno |
| Login senza `next`: 0 / 1 / 2+ locali | `/scan` / `/staff/:id` / `/staff` |
| Connesso, aprire `/login` | prosegue come se avesse appena fatto il login |
| URL sconosciuto | pagina "non trovato" |
| Backend fermo, reload | `/session-error`; dopo il riavvio, riprova e recupera |
| Cancellare il cookie `sid` (o `DELETE FROM sessions`) e cliccare qualsiasi cosa | `/login?next=<percorso corrente>` |
| Logout | `/login`; il tasto indietro non mostra nulla di privato; `sessionStorage` della tab svuotato |

### T6-C. Flusso del cliente: FATTO (2026-11-03)

Tutti i 15 controlli sono passati nel browser; nessun bug trovato. Verificato incrociando con `CustomerVisitView.vue` e `CustomerRequestView.vue`. Il passo 10 è il limite noto B15, non un bug. Checklist come eseguita:

| Azione | Atteso |
|---|---|
| Prima visita a `/v/<venueId>`, disconnesso | login, poi di nuovo `/v/...` |
| Prima visita, connesso | "La tua card è pronta", pulsanti "Aggiungi a Google Wallet" e "Richiedi il timbro", codice card; nessuna richiesta di timbro creata |
| Reload lì | stessa schermata, **nessuna** richiesta di timbro creata (`select * from stamp_requests`); `wallet_status` ancora `not_added` |
| Clic su "Aggiungi a Google Wallet" (ripetuto il 2026-11-03) | il link si apre in una nuova tab; `wallet_status` diventa `active`; il tocco successivo sul tag apre la richiesta da solo (dritto su `/r/<id>`) |
| "Richiedi il timbro" | `/r/<id>`, "Richiesta inviata", saldo 0/5 |
| Reload di `/r/<id>` | stessa pagina, nessuna nuova richiesta |
| `/v/...` di nuovo con una richiesta pending | torna alla stessa `/r/<id>`, quota non consumata |
| Lo staff conferma | entro 2 s: "Timbro confermato" con il nuovo saldo |
| Lo staff rifiuta | "Richiesta non confermata", "Richiedi di nuovo" |
| 3 minuti senza azioni | "Richiesta scaduta", poi "Richiedi di nuovo" |
| "Richiedi di nuovo" in una nuova tab | locale non memorizzato: chiede di toccare di nuovo il tag (B15) |
| `/r/<UUID casuale>`, `/r/xyz`, `/r/<id>` di un altro cliente | "Richiesta non trovata" (stesso 404 per tutti) |
| `/v/xyz`, `/v/<UUID casuale>` | "Questo link non è valido.", nessun pulsante di nuovo tentativo |
| 11ª richiesta in un'ora | "Troppe richieste. Riprova tra …" |
| Backend fermato durante il polling, poi riavviato | continua il polling e recupera |
| Pulsante Wallet | apre `saveUrl` in una nuova tab (serve il vero service account; errore legato all'origin: controllare `APP_ORIGIN`, V1) |

### T6-D. Flusso dello staff: AUTOMATIZZATO 2026-11-04 (`stampy-frontend/e2e/t6d.mjs`, 43 ✔ / 0 ✘); giro umano ancora aperto

Tutte le righe qui sotto sono state eseguite in Chromium headless (390 px e 360 px, tema chiaro e scuro). Risultato (corretto il 2026-11-04): il toast del premio (fisso in basso, 10 s) copriva i pulsanti Conferma/Rifiuta dell'ultima card. Ora il toast dura 5 s, le card di esito 8 s, e uno spaziatore mantiene i pulsanti cliccabili (lo verifica `t6d.mjs`); il testo del toast non dice più allo staff cosa fare con il prodotto. Non verificato da una persona: tocco reale, dispositivo reale, finitura visiva.

| Azione | Atteso |
|---|---|
| Coda vuota | "Nessuna richiesta in attesa" |
| Il cliente apre una richiesta | compare entro 3 s: codice, ora, `0 / 5 timbri` |
| Stepper | "−" disabilitato a 1; massimo 50; quantità mantenuta tra i polling |
| Conferma di 1 prodotto | la card diventa una card di esito verde: `✔ Richiesta approvata`, `+1 timbro · saldo 1 / 5` (nessun alert in alto) |
| Conferma di più dei timbri mancanti (es. 3 a 3/5) | la card si riempie, premio applicato: card di esito più un toast "Premio ritirato. CODE: <premio>… Non far pagare il prodotto in premio." |
| Card piena (5/5) in coda | "Premio disponibile" |
| Conferma della stessa richiesta da due tab | la seconda riceve un errore (409), la coda si aggiorna |
| Rifiuto | card di esito gialla `⚠ Richiesta rifiutata`, saldo invariato |
| Digitare una quantità con la tastiera e attendere > 3 s | il valore resta (coperto da `e2e/staff-input.mjs`); uno non valido mostra "Quantità non valida" e disabilita Conferma |
| Doppio clic su conferma | una sola richiesta |
| La richiesta scade mentre lo staff la tiene aperta | errore alla conferma, poi esce dalla coda |
| `/staff/<id di un altro locale>` o un account solo cliente su `/staff/<id>` | "Non sei autorizzato…" |
| 2 locali, `/staff` | selettore, e "Cambia locale" nel menu burger |

Controllare anche a 360 px (nessuno scroll orizzontale), tema chiaro e scuro, favicon, nessun 404 nella tab Network. Non-bug attesi: la prima conferma può loggare `[wallet] …` (pass non ancora salvato, la risposta resta 200); uno staff che apre `/v/...` ottiene anche lui una card; il testo della UI è in italiano per scelta.

---

## 5. Verifiche esterne (solo su richiesta esplicita dell'utente)

Non inventare API, SDK o limiti: queste voci si chiudono leggendo la documentazione
ufficiale o provando sul campo, e la risposta viene scritta qui.

| ID | Cosa verificare |
|---|---|
| V1 | **Google Wallet REST**: il PATCH è implementato; eseguito una volta su un pass reale (vedi V1-ok). Da provare ancora: patch contro replace per `textModulesData` (i 3 moduli vengono sempre inviati), la risposta per un object **non ancora salvato** (404?), latenza, literal di `notifyPreference`, se la class è modificabile, notifiche per `wallet_status`. Vedi `google/wallet-pass-update.md` (tabella NON VERIFICATO). |
| V1-ok | **Provato su un pass reale (2026-11-09, test manuale del proprietario)**: la PATCH dopo una conferma con rollover (card a 4/8, conferma di 5 timbri) ha aggiornato il pass salvato: saldo 5 e «MECCANISMO TIMBRI» da 8 a 10. Quindi la PATCH di `loyaltyPoints` + 3 `textModulesData` funziona su un object salvato e sostituisce il testo. Object non ancora salvato (test manuale 2026-11-09, Bar): la PATCH dopo `confirm` con rollover risponde **404**; il backend lo logga (`[wallet] aggiornamento pass fallito (card …): 404`) e la conferma resta 200, DB corretto. Aggiungendo poi il pass dal `saveUrl`, il pass nasce già corretto (2 timbri, soglia nuova). Confermato: dopo il salvataggio una seconda conferma aggiorna il pass senza 404, quindi il 404 era solo «non ancora salvato». Restano da provare: latenza, `notifyPreference`. |
| V2 | **Accesso alla pubblicazione Google**: tempi di revisione, requisiti del Business Profile per un privato senza partita IVA, limiti di pass in demo/test, screenshot richiesti. |
| V3 | **Gmail**: limiti di invio e consegna per email automatiche, autenticazione (app password contro OAuth). |
| V4 | **Google Sign-In**: client ID, schermata di consenso, requisiti di verifica, **come ottenere un ID token nei test** senza frontend. |
| V5 | **Apple**: `id_token`, se `email_verified` può essere false (Work & School), gestione di "Hide My Email". |
| V6 | **NFC fisico**: lettura in background su iPhone (da XS/XR in poi) e Android; comportamento con custodie e superfici metalliche. |
| V7 | **Cloudflare**: tunnel con nome/URL fisso; numero di hop per `TRUST_PROXY` dietro il proxy di staging (mai `true`). |
| V8 | **Safari ITP**: il cookie `httpOnly` scritto dal server non dovrebbe rientrare nel limite di 7 giorni, ma se l'IP del server è scollegato dal sito può scattare → frontend e `/api` sulla stessa origin. |
| V9 | **Grafica del pass**: dimensione e requisiti del logo (PNG, preferibilmente quadrato). `public/logo.png` non è servito da nessuna route. |

---

## 6. Prodotto e campo

| ID | Stato | Cosa |
|---|---|---|
| P1 | `TODO` | **Parlare con 2-3 gestori di locali veri** (bar, gelaterie, pizzerie): prerequisito per il modello di business e per le decisioni su scadenza/rollover. Non è un compito tecnico che si possa rimandare. |
| P3 | `TO-DECIDE` | **Modello di business** e prezzo. |
| P4 | `TODO` | **Supporto fisico per il locale**, per fasi: prototipo (adesivo NTAG213 su un portamenu acrilico a L + QR stampato), pilota (stampa col marchio), scala (plexiglass su misura con chip incorporato). Mai bloccare i tag in sola lettura prima dell'URL definitivo. |
| P5 | `TODO` | **Dominio** (~10 €/anno) e **hosting di staging** (es. Railway, Fly.io) con URL fisso; il dominio serve anche per SPF/DKIM delle email. |
| P6 | `TO-DECIDE` | Tenere il barcode sul pass? L'identificazione avviene dal tag/QR sul banco; potrebbe bastare `accountId`. Da decidere anche come mostrare il `publicCode` leggibile. |
| P7 | `TO-DECIDE` | Dashboard: quali numeri servono davvero al gestore del locale (oltre a soci, timbri, premi). |
| P8 | `TODO` | **Anteprima dei segmenti** per lo staff prima della conferma (rimandata: prima il flusso di base). |
| P9 | `TODO` | Mostrare i **premi anche al cliente** nel polling (oggi `rewards` compare solo nella risposta di `confirm`, quindi lo vede solo lo staff). |

---

## 7. Regole di sicurezza da seguire nelle API vere

Promemoria operativo (le decisioni sono in `CONTEXT.md` §5).

- Auth prima della validazione: `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- Il `venueId` nel path è un **selettore**, mai una prova di autorizzazione: il ruolo viene
  letto da `venue_members` a ogni richiesta.
- **Ownership** su ogni risorsa: il controllo è in SQL (join su `cards.user_id`); la risorsa
  di un altro dà lo **stesso 404** di una inesistente e non viene mai scritta.
- La conferma è idempotente per costruzione: UPDATE condizionato a `status='pending'` +
  `idempotency_key` univoca. Doppia conferma → 409, mai un doppio conteggio.
- Validazione: nessun campo inatteso, un tetto su ogni valore numerico, nessuna coercizione
  implicita, 400 (non 500) per input mancante.
- Limiti su due livelli (card e IP), mai un contatore globale; `TRUST_PROXY` = numero di hop.
- Segreti: service account, `OTP_HMAC_SECRET`, credenziali email mai in Git, in chat o
  nei documenti; in produzione nei segreti dell'hosting.
- Mai `res.json(row)`; mai dati personali nei log né in `auth_events.metadata`.
- Ogni UPDATE di stato con il filtro di stato nel `WHERE`.

---

## 8. Chiuso di recente

Non si riapre: se serve il dettaglio, è in `archive/` e nei commit.

| Data | Cosa |
|---|---|
| 2026-11-09 | **C1 chiusa**: il logger di Drizzle (query e parametri, quindi email e hash dei codici) è acceso solo con `NODE_ENV=development` (`src/db/index.ts`). Attenzione: `NODE_ENV` ha default `development`, quindi in staging/produzione va impostato `production` (da ricordare in P5). Nessun test: configurazione. |
| 2026-11-09 | **B3 chiusa**: `cors()` ristretto ad `APP_ORIGIN` con `credentials` (mai `*`, nessun header per origin estranee) e nuovo `requireSameOrigin` su `/api`: sui metodi che cambiano stato un `Origin` diverso (anche `null`) → `403 OriginNotAllowed` prima del controller e del 404; senza `Origin` passa. Nessun token CSRF (decisione del 2026-10-26). `cors-origin.test.ts` 13 ✔, suite 234 ✔, `typecheck:all` pulito. Resta da fissare `APP_ORIGIN` di staging (P5). |
| 2026-11-09 | **Sync del pass alla conferma con rollover** (parte di B22): `syncWalletPass` legge la promozione dalla card appena scritta (`getPromotionById`) e non più la «attiva» riletta dopo il commit, così il pass non diverge dal DB; il `saveUrl` di una card su promozione vecchia (`not_added`) porta 0 timbri e la soglia nuova, come polling e coda. Nessuna notifica push. 6 test in `promotion-rollover.test.ts` (ora 33). Suite: **221 test**. |
| 2026-11-09 | **Rollover lazy della promozione + avviso** (B2 e P2 chiuse, lato backend): `confirm` non risponde più 409 se la promozione della card non è quella attiva; azzera la card (anche piena), la porta sulla promozione attiva e applica `splitStamps` con la soglia nuova, tutto nella transazione già bloccata dal `FOR UPDATE`. Senza promozione attiva resta `409`. Nuovo campo `promotionChanged` in `visit` (risposte con richiesta), nel polling `GET /requests/:id` e nella coda dello staff; per una card vecchia polling e coda mostrano già `stampsCount: 0` e la soglia della nuova promozione. Nessuna migrazione e nessun numero di timbri persi nelle risposte. Il test «card su una promozione vecchia → 409» è sostituito da `api/promotion-rollover.test.ts` (27 test); in `visit-polling.test.ts` l'elenco dei campi del polling include `promotionChanged`. Suite: **215 test**. Resta B22. |
| 2026-11-05 | **Metodo TDD + Vitest (pilota)**: deciso che il backend si sviluppa in TDD con test concordati col proprietario prima del codice (`AGENTS.md`). Aggiunto Vitest (`test/unit/`, `test/api/`, `test/helpers/`), che avvia l'app in-process e non richiede `npm run dev`. Migrati `stamps-split.ts` → `test/unit/stamps.test.ts` (24 test) e `otp-verify.ts` → `test/api/otp-verify.test.ts` (16 test); gli script vecchi sono eliminati. `morgan` e il logger di Drizzle sono spenti con `NODE_ENV=test`. Documentazione portata in italiano, `docs/it/` eliminata. Nello stesso giorno gli altri script sono stati portati in Vitest e cancellati: `otp-request`, `session`, `poll-request` (→ `visit-polling`), `staff-requests`, `history`, `wallet-update`, `verify-migration-2/3` (→ `db-constraints`); restano in `scripts/` solo `create-owner`, `create-venue` e `reset-data.sql`. Suite: **189 test** (prima 129 tra Vitest e script). I test creano i propri locali, quindi non serve più un DB preparato. T7 chiusa, C16 risolta. |
| 2026-11-03 | **Feedback sulle richieste e correzione della quantità digitata** (B17 chiusa): card di esito dello staff al posto dell'alert generico (approvazione verde con `+N timbri`, rifiuto giallo), un toast del premio per ogni conferma; "Richiesta approvata!" del cliente con `+N timbri aggiunti` e un modale del premio (`<dialog>` nativo, chiusura ricordata per richiesta in `localStorage`). `GET /requests/:id` (approved) ora restituisce `stampsAdded`, `rewardsRedeemed`, `reward`; `confirm` restituisce `stampsAdded`, `reward`; nessun cambio di schema né della regola dei timbri. Bug: una quantità digitata veniva azzerata al polling successivo (valore confermato solo su `@change`); l'input ora tiene una bozza e i valori non validi bloccano Conferma. Suite backend 114 ✔ su un DB usa-e-getta (check aggiunti dentro `staff-requests.ts`/`poll-request.ts`), `e2e/staff-input.mjs` 7 ✔ (fallisce con il vecchio binding), `e2e/feedback.mjs` 31 ✔. T6-D ancora da eseguire a mano. |
| 2026-11-02 | **Errori OTP separati** (test di login, flusso A): verify risponde `InvalidCode` (+ `attemptsRemaining`) oppure `CodeExpired`; la schermata di login mostra i tentativi rimasti, disabilita il campo quando il codice è morto e evidenzia "nuovo codice"; il cooldown di 45 s è saltato quando l'ultimo codice è scaduto o senza tentativi (tetto orario invariato). `CONTEXT.md` §5.2 aggiornato. `otp-request.ts` da 16 a 21 check. |
| 2026-11-04 | **Storico del cliente + un solo header per tutti**: `GET /api/requests/mine` (richieste proprie in tutti i locali, stessi filtri e stessa riga dello storico staff più `venueName`; entrambi usano `getHistory(scope, filters)` e `historyRow`); la schermata di storico è ora un solo componente (`RequestHistory.vue`) montato dalla pagina staff e dalla nuova pagina cliente `/history` ("Le tue richieste"); `AppLayout` mostra lo stesso header a clienti e staff (menu burger costruito da una lista di voci, wordmark centrato, pulsante indietro nelle pagine di storico). Il link "Storico" sulla coda è stato rimosso (lo ha il menu). `history.ts` 11 ✔, `e2e/history.mjs` 47 ✔ + 1 ✘ (l'etichetta "Filtri · N" non è più sul toggle: decidere se ripristinarla o eliminare il check). |
| 2026-11-04 | **Storico delle richieste, codice card sulla pagina del cliente, correzioni ai toast**: `GET /venues/:venueId/requests/history` (filtri: stato, timbri confermati min/max, date da/a; senza email) + schermata staff `/staff/:venueId/history`; `GET /requests/:id` ora restituisce `publicCode` e la pagina del cliente lo mostra mentre è pending (parte di B15: manca ancora il nome del locale); toast del premio generico e più corto, card di esito 8 s, niente più pulsanti coperti. Decisione: le schermate dello staff continuano a mostrare il codice pubblico, **non l'email del cliente** (minimizzazione dei dati: ogni membro dello staff la vedrebbe; il codice è ciò che il cliente può leggere a voce). `history.ts` 10 ✔ (`verify.sh` 124 ✔ su un DB usa-e-getta), `e2e/history.mjs` 22 ✔, `t6d.mjs` 43 ✔. |
| 2026-11-04 | **Iterazione sui filtri dello storico**: i filtri vivono nella query dell'URL (avanti/indietro li ripristinano), filtraggio dal vivo con debounce (nessun pulsante Filtra), etichette del conteggio timbri ("Timbri": Min / Max; API `minStamps`/`maxStamps`, campo di risposta `stamps`), regole sulle date (max = oggi, "Al" ≥ "Dal"; backend `from > to` → `400`), paginazione backend rimossa (`limit`/`offset` → `400`; seguito B19), pannello mobile compatto e comprimibile. `history.ts` 10 ✔ (`verify.sh` 124 ✔ su un DB usa-e-getta), `e2e/history.mjs` 38 ✔, verificato nel browser a 375×740 con il Playwright MCP. |
| 2026-11-03 | **Schermata Wallet per card `not_added`** (parte di B10/B8): `visit` restituisce `card_not_added` + `saveUrl` e non apre nessuna richiesta senza `?requestStamp=1`; il nuovo `POST /venues/:venueId/card/wallet-added` porta `not_added` → `active` (idempotente). Il frontend mostra "Aggiungi a Google Wallet" / "Richiedi il timbro" finché è `not_added`; la copia in `sessionStorage` del `saveUrl` non c'è più. `poll-request.ts` +5 test. **Le schermate della card di T6-C vanno ritestate** (vedi T6). |
| 2026-11-01 | **Formulazione di B7 ribaltata, B16 chiusa**: il login è ora una pagina dedicata `/login` con guardia del router e redirect `?next=` (validato contro gli open redirect), invece di `AuthGate` che lo mostrava sul posto; dopo il login: `next`, altrimenti 0 locali -> `/scan`, 1 -> `/staff/:id`, 2+ -> `/staff`. Flusso del cliente diviso in `/v/:venueId` (visit, schermata di salvataggio nel Wallet) e `/r/:requestId` (solo polling: il reload non crea richieste). Bootstrap 5.3 (solo Sass) sostituisce `main.css`, con `data-bs-theme` che segue il sistema. 47 controlli nel browser verdi. B15 e B17 restano aperte. |
| 2026-11-01 | **B7 chiusa**: frontend Vue con login email al suo posto (`AuthGate`, `EmailLogin`), pagina del cliente `/v/:venueId` (card, richiesta di timbro, polling, card piena come premio disponibile), staff `/staff` e `/staff/:venueId` (coda, stepper della quantità di prodotti, confirm/reject, avviso "premio applicato"). `create-venue` ora stampa l'URL del tag del frontend. 40 controlli nel browser verdi. Test su dispositivo reale ancora aperto (T5); nuove lacune B15, B16, B17. |
| 2026-10-31 | **B1 chiusa (lato codice)**: dopo il commit di confirm, `staff.controller.ts` chiama `GoogleWalletService.updateCard` (PATCH autenticato di `loyaltyPoints` + 3 moduli di testo; timeout 5 s, 2 retry) in un wrapper best-effort che logga solo id della card + status/codice, così un fallimento di Google non cambia mai il 200. `confirm` ora restituisce `cardId` (interno, tolto dal body). Nuovo `scripts/wallet-update.ts` (11 check, client mockato). Rimossi `getRequestById` senza scope e `CardNotFoundError` inutilizzato. Comportamento con un vero issuer ancora aperto (V1). |
| 2026-10-30 | **C2, C4, C8 chiuse**: 404 JSON sulle route `/api` inesistenti; validazione 400 senza `value`; un unico 429 `TryLaterError` / "Riprova più tardi" / `retryAfterSeconds` (anche dal limiter per IP). `otp-request.ts` da 13 a 16 check, totale 104. |
| 2026-10-30 | **C3, C9, C10, C12 chiuse**: JSON malformato → 400 (handler `bodyParserHandler`); rimossi `users.service.ts`, `UserNotFoundError`, `PromotionExpiredError`, `CardNotFoundError`; commento su `req.auth` corretto; retry sulla collisione di `public_code`. 101 check verdi, `typecheck:all` pulito. |
| 2026-10-30 | **Cartella `docs/` spostata nella radice del repo** (da `stampy-backend/docs/`); riferimenti allineati in `README.md`, `AGENTS.md`, `opencode.json`. `archive/` lasciato invariato. |
| 2026-10-28 | **Suite rieseguita** dopo l'ultimo commit: 101 check verdi (20+24+12+13+16+16) e 25 check SQL (19+6), `typecheck:all` pulito. |
| 2026-10-28 | **Documentazione riorganizzata**: 3 file vivi (`CONTEXT.md`, `CODEBASE.md`, `BACKLOG.md`), i 7 documenti storici in `docs/archive/`. |
| 2026-10-27 | **Fase 4d**: rate limit su `visit` (10 nuove/ora per card), auth dello staff con ruoli, `/venues/mine`, coda, confirm/reject in transazione, migrazione 3, regola dei timbri fissata. 101 check verdi. |
| 2026-10-26 | Percorso email (OTP), `isAuthenticated`, sessione scorrevole con tetto assoluto, logout, `visit`/polling con l'utente di sessione e ownership in SQL. |
| 2026-10-24 | Migrazione 2 (`auth_identities`, `otp_challenges`, `sessions`, `auth_events`; email su `users`, telefono rimosso), decisioni di auth. |
| 2026-10-27/28 | Script `typecheck:all` (script inclusi), rimozione delle dipendenze inutilizzate, enum derivati dai `pgEnum`, `CardsService` separato dal Wallet, `create-venue`. |
