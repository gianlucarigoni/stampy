> 🇮🇹 **Traduzione italiana di sola lettura** di `docs/BACKLOG.md`.
> La fonte di verità è la versione inglese: in caso di dubbio o differenza vince l'inglese.
> Gli stati (`DECIDED`, `TODO`, ...), i nomi di codice e le stringhe API restano in inglese/italiano originale perché sono letterali.

# Stampy — Backlog

> **L'unica lista di ciò che non è ancora nel codice.** Se qualcosa è stato progettato in un
> handoff e non implementato, vive qui: non viene cancellato né perso.
> Quando è fatto, la voce passa al §8 con una data (la storia completa resta in
> `archive/` e in Git).
> Le decisioni già prese stanno in `CONTEXT.md` e **non vengono riaperte**: qui si dice solo
> se sono state implementate.
> Ultimo aggiornamento: 28 ottobre 2026.

**Stati**

| Stato | Significato |
|---|---|
| `DECIDED` | decisione presa, implementazione non iniziata |
| `TODO` | da fare, niente lo blocca |
| `TO-DECIDE` | serve una scelta (di solito di prodotto): nessun codice prima |
| `TO-VERIFY` | serve una verifica esterna (documentazione ufficiale, prova sul campo) |
| `BLOCKED` | dipende da un'altra voce (indicata) |

---

## 1. Prossimo passo

### B1 — Aggiornamento del pass Google dopo la conferma (`DECIDED`)

**Perché è il prossimo**: il DB e il polling web sono corretti, ma dopo la conferma il
pass nel Wallet mostra ancora il vecchio saldo. È il cancello del flusso end-to-end.

- Dopo il commit della conferma, aggiornare l'object (`loyaltyPoints.balance` e il testo
  `user_progress`) via REST, **best effort**: se fallisce, il DB resta corretto.
- Da controllare nella documentazione ufficiale **prima** di scrivere codice (V1): auth/scope,
  patch contro replace, campi aggiornabili, latenza, se la class è modificabile, comportamento
  con un object non ancora aggiunto al Wallet.
- Non fare mai commit di output che contengano token o `saveUrl`.
- Fatto quando: conferma → pass aggiornato entro pochi secondi; test end-to-end registrato; un
  errore REST non corrompe il DB.
- Origine: `archive/progress.md` §5.15, `archive/Stampy_Handoff_Fase_4d.md` §5.2,
  `archive/stampy_contesto_progetto.md` §5.

---

## 2. Deciso e non ancora implementato

| ID | Stato | Cosa manca | Origine |
|---|---|---|---|
| B2 | `TO-DECIDE` | **Rollover lazy della promozione.** Il progetto prevedeva: se `cards.promotion_id` non è la promozione attiva, al primo timbro azzerare `stamps_count`, aggiornare `promotion_id` e aggiornare il pass (niente cron). Oggi `confirm` risponde **409** e il codice non ha rollover. "Cosa fare dei timbri accumulati" è una decisione di prodotto (P2), quindi la meccanica è pronta ma non va scritta in anticipo. | `archive/stampy_db_schema.md` §6 |
| B3 | `DECIDED` | **CORS ristretto a una sola origin con `credentials`** + controllo di `Origin` sulle route che cambiano stato. Oggi `app.ts` usa un `cors()` aperto. Decisione del 2026-10-26: **nessun token CSRF per ora** (ci si affida a `SameSite=Lax`). | `archive/Stampy_Handoff_Fase_4c.md` §6.3 |
| B4 | `DECIDED` | **Anonimizzazione GDPR + retention.** Procedura: cancellare `auth_identities`, `users.email = NULL`, svuotare `display_name`, impostare `anonymized_at`, revocare le sessioni; card e log restano. Retention di `otp_challenges` e `auth_events` da definire. Da decidere anche se `auth_events.subject_hash` è ancora un dato personale (azzerarlo o ruotare il segreto). **Prerequisito: primo utente reale.** | `archive/stampy_db_schema.md` §6, `archive/Stampy_Handoff_Fase_4c.md` §6.10 |
| B5 | `DECIDED` | **Login con Google** (`POST /api/auth/google`, body `{idToken}`). Verificare firma/`aud`/`iss`/`exp` con `google-auth-library` (già installata); cercare `(google, sub)`; collegare all'utente con la stessa email **solo** se `@gmail.com` oppure `email_verified` + `hd`; email di terzi → rifiuto + evento `google_untrusted_email_rejected`; poi sessione e `login_success`. Richiede configurazione esterna (V4). Rimandato a "dopo lo staff", che è chiuso. | `archive/Stampy_Handoff_Fase_4c.md` §5D, §6.8 |
| B6 | `DECIDED` | **Invio email reale**: `GmailEmailSender` + `EMAIL_PROVIDER` (`console` \| `gmail`) in `env.ts`. Oggi esiste solo `ConsoleEmailSender` (si rifiuta di partire in produzione). Limiti di Gmail da verificare (V3); valutare un provider transazionale quando ci sarà un dominio (SPF/DKIM). | `archive/Stampy_Handoff_Fase_4c.md` §5E, `archive/progress.md` §5.11 |
| B7 | `DECIDED` | **Frontend Vue: staff e cliente.** Il backend è già pronto (`/venues/mine`, coda, confirm, reject, polling con saldo, `visit`). Da rispettare: `venueId` nell'URL con login sulla stessa pagina (nessun redirect), polling del cliente ogni 1–2 s, **stepper della quantità di prodotti** (non di timbri), avviso "premio applicato" quando `rewards > 0`, card piena mostrata come "premio disponibile". | `archive/Stampy_Handoff_Fase_4d.md` §5.3, `archive/Report_Fase_4d.md` §5.3 |
| B8 | `TODO` | **Route "riaggiungi card"** per chi ha rimosso il pass: rigenerare il `saveUrl` della card esistente. Piccola, ma richiede una scelta di prodotto sull'esposizione (link pubblico? dopo il login?). | `archive/stampy_contesto_progetto.md` §5 |
| B9 | `TO-DECIDE` | **Branding di default** per un locale appena creato (oggi `branding = {}` fa fallire la creazione della card) e personalizzazione self-service (rimandata). | `archive/stampy_contesto_progetto.md` §5 |
| B10 | `TO-VERIFY` | **`wallet_status`**: oggi è `not_added` e non viene né letto né aggiornato. Diventerebbe affidabile solo con un meccanismo di notifica di Google (V1). | `archive/stampy_contesto_progetto.md` §4.6 |
| B11 | `DECIDED` | **Dashboard del gestore del locale** (soci, timbri assegnati, premi riscattati + grafici nel tempo). Non iniziata. | `archive/stampy_contesto_progetto.md` §4.8 |
| B12 | `DECIDED` | **Apple Wallet**, solo dopo aver validato il flusso su Google: 99 $/anno, pass `.pkpass` firmati, estrazione del codice Wallet da `wallet/wallet.service.ts`. Con Apple si valuterà anche il login con Apple. | `archive/stampy_contesto_progetto.md` §4.6, §5 |
| B13 | `TO-DECIDE` | **Accesso con telefono + SMS**: solo con un cliente reale (costo per messaggio, il NIST lo classifica come "restricted"). Schema già predisposto. | `archive/progress.md` §5.27 |

---

## 3. Debito tecnico verificato nel codice

Nessuna di queste voci blocca lo sviluppo; quasi tutte bloccano il deploy.

| ID | Stato | Cosa | Dove |
|---|---|---|---|
| C1 | `TODO` | `logger: true` stampa query e parametri (quindi anche email e hash dei codici). Da togliere prima del deploy. | `src/db/index.ts` |
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
| T2 | `TODO` | Un fallimento isolato e non riprodotto in `otp-request.ts` ("5 richieste simultanee" dopo un riavvio di nodemon). Se si ripresenta, salvare l'output prima di indagare. |
| T3 | `TODO` | Test da aggiungere quando la funzionalità esiste: aggiornamento end-to-end del pass (B1), login Google con token valido/manomesso/`aud` sbagliato/email di terzi (B5), anonimizzazione (B4), `visit` 409 (C7). |
| T4 | `TODO` | **Collezione Bruno** per test manuali strutturati: solo proposta, non è stato creato nulla. Il piano prevedeva cartelle `00–09` e fixture generate da script (Bruno non ha accesso al DB né ai codici OTP). |
| T5 | `TODO` | Test reale su browser/iPhone/HTTPS: cookie `Secure`, `SameSite=Lax` quando si apre da un tag, sliding della sessione. Oggi tutto è testato solo su HTTP locale. |

---

## 5. Verifiche esterne (solo su richiesta esplicita dell'utente)

Non inventare API, SDK o limiti: queste voci si chiudono leggendo la documentazione
ufficiale o provando sul campo, e la risposta viene scritta qui.

| ID | Cosa verificare |
|---|---|
| V1 | **Google Wallet REST**: auth/scope, patch contro replace, campi aggiornabili (`loyaltyPoints.balance`, `user_progress`), latenza, se la class è modificabile, notifiche per `wallet_status`. |
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
| P2 | `TO-DECIDE` | Cosa succede ai timbri accumulati alla **scadenza o al cambio di promozione** (azzerare, tenere, avvisare sulla card). Blocca B2. |
| P3 | `TO-DECIDE` | **Modello di business** e prezzo. |
| P4 | `TODO` | **Supporto fisico per il locale**, per fasi: prototipo (adesivo NTAG213 su un portamenu acrilico a L + QR stampato), pilota (stampa col marchio), scala (plexiglass su misura con chip incorporato). Mai bloccare i tag in sola lettura prima dell'URL definitivo. |
| P5 | `TODO` | **Dominio** (~10 €/anno) e **hosting di staging** (es. Railway, Fly.io) con URL fisso; il dominio serve anche per SPF/DKIM delle email. |
| P6 | `TO-DECIDE` | Tenere il barcode sul pass? L'identificazione avviene dal tag/QR sul banco; potrebbe bastare `accountId`. Da decidere anche come mostrare il `publicCode` leggibile. |
| P7 | `TO-DECIDE` | Dashboard: quali numeri servono davvero al gestore del locale (oltre a soci, timbri, premi). |
| P8 | `TODO` | **Anteprima della suddivisione dei timbri** per lo staff prima della conferma (rimandata: prima il flusso di base). |
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
| 2026-10-30 | **C2, C4, C8 chiuse**: 404 JSON sulle route `/api` inesistenti; validazione 400 senza `value`; un unico 429 `TryLaterError` / "Riprova più tardi" / `retryAfterSeconds` (anche dal limiter per IP). `otp-request.ts` da 13 a 16 check, totale 104. |
| 2026-10-30 | **C3, C9, C10, C12 chiuse**: JSON malformato → 400 (handler `bodyParserHandler`); rimossi `users.service.ts`, `UserNotFoundError`, `PromotionExpiredError`, `CardNotFoundError`; commento su `req.auth` corretto; retry sulla collisione di `public_code`. 101 check verdi, `typecheck:all` pulito. |
| 2026-10-30 | **Cartella `docs/` spostata nella radice del repo** (da `stampy-backend/docs/`); riferimenti allineati in `README.md`, `AGENTS.md`, `opencode.json`. `archive/` lasciato invariato. |
| 2026-10-28 | **Suite rieseguita** dopo l'ultimo commit: 101 check verdi (20+24+12+13+16+16) e 25 check SQL (19+6), `typecheck:all` pulito. |
| 2026-10-28 | **Documentazione riorganizzata**: 3 file vivi (`CONTEXT.md`, `CODEBASE.md`, `BACKLOG.md`), i 7 documenti storici in `docs/archive/`. |
| 2026-10-27 | **Fase 4d**: rate limit su `visit` (10 nuove/ora per card), auth dello staff con ruoli, `/venues/mine`, coda, confirm/reject in transazione, migrazione 3, regola dei timbri fissata. 101 check verdi. |
| 2026-10-26 | Percorso email (OTP), `isAuthenticated`, sessione scorrevole con tetto assoluto, logout, `visit`/polling con l'utente di sessione e ownership in SQL. |
| 2026-10-24 | Migrazione 2 (`auth_identities`, `otp_challenges`, `sessions`, `auth_events`; email su `users`, telefono rimosso), decisioni di auth. |
| 2026-10-27/28 | Script `typecheck:all` (script inclusi), rimozione delle dipendenze inutilizzate, enum derivati dai `pgEnum`, `CardsService` separato dal Wallet, `create-venue`. |
