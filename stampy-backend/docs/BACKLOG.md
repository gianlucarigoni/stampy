# Stampy — Backlog

> **Unica lista di ciò che non è ancora nel codice.** Se una cosa è stata progettata
> in un handoff e non è stata implementata, sta qui: non si cancella e non si perde.
> Quando è fatta, la voce si sposta in §8 con la data (la storia completa resta in
> `archive/` e in Git).
> Le decisioni già prese stanno in `CONTEXT.md` e **non si riaprono**: qui si dice solo
> se sono state implementate.
> Ultimo aggiornamento: 28 ottobre 2026.

**Stati**

| Stato | Significato |
|---|---|
| `DECISO` | decisione presa, implementazione non iniziata |
| `TODO` | da fare, nessun blocco |
| `DA-DECIDERE` | serve una scelta (di solito di prodotto): non si scrive codice prima |
| `DA-VERIFICARE` | serve una verifica esterna (documentazione ufficiale, prova sul campo) |
| `BLOCCATO` | dipende da un'altra voce (indicata) |

---

## 1. Prossimo passo

### B1 — Aggiornamento del pass Google dopo la conferma (`DECISO`)

**Perché è il prossimo**: il DB e il polling web sono corretti, ma dopo la conferma il
pass nel Wallet mostra ancora il saldo vecchio. È il gate del flusso end-to-end.

- Dopo il commit della conferma, aggiornare l'object (`loyaltyPoints.balance` e il
  testo `user_progress`) via REST, **best effort**: se fallisce, il DB resta corretto.
- Da verificare nella documentazione ufficiale **prima** di scrivere codice (V1):
  auth/scope, patch vs sostituzione, campi aggiornabili, latenza, se la class è
  modificabile, comportamento con object non ancora aggiunto al Wallet.
- Non committare mai output con token o `saveUrl`.
- Fatto quando: conferma → pass aggiornato entro pochi secondi; test end-to-end
  registrato; errore REST non corrompe il DB.
- Origine: `archive/progress.md` §5.15, `archive/Stampy_Handoff_Fase_4d.md` §5.2,
  `archive/stampy_contesto_progetto.md` §5.

---

## 2. Implementazioni decise e non fatte

| ID | Stato | Cosa manca | Origine |
|---|---|---|---|
| B2 | `DA-DECIDERE` | **Rollover lazy della promozione.** Il progetto prevedeva: se `cards.promotion_id` non è la promozione attiva, al primo timbro azzerare `stamps_count`, aggiornare `promotion_id` e aggiornare il pass (nessun cron). Oggi la `confirm` risponde **409** e il codice non ha rollover. Il "cosa fare dei timbri maturati" è una decisione di prodotto (P2), quindi la meccanica è pronta ma non va scritta prima. | `archive/stampy_db_schema.md` §6 |
| B3 | `DECISO` | **CORS ristretto a una sola origine con `credentials`** + controllo dell'`Origin` sulle rotte che modificano stato. Oggi `app.ts` usa `cors()` aperto. Decisione 26/10: **nessun token CSRF per ora** (si appoggia a `SameSite=Lax`). | `archive/Stampy_Handoff_Fase_4c.md` §6.3 |
| B4 | `DECISO` | **Anonimizzazione GDPR + retention.** Procedura: eliminare `auth_identities`, `users.email = NULL`, svuotare `display_name`, `anonymized_at`, revocare le sessioni; card e log restano. Retention di `otp_challenges` e `auth_events` da definire. Da decidere anche se `auth_events.subject_hash` è ancora un dato personale (azzerarlo o ruotare il segreto). **Prerequisito: primo utente reale.** | `archive/stampy_db_schema.md` §6, `archive/Stampy_Handoff_Fase_4c.md` §6.10 |
| B5 | `DECISO` | **Login con Google** (`POST /api/auth/google`, body `{idToken}`). Verifica firma/`aud`/`iss`/`exp` con `google-auth-library` (già installata); ricerca di `(google, sub)`; collegamento all'utente con la stessa email **solo** se `@gmail.com` o `email_verified` + `hd`; email di terzi → rifiuto + evento `google_untrusted_email_rejected`; poi sessione e `login_success`. Richiede configurazione esterna (V4). Rimandato "dopo lo staff", che è chiuso. | `archive/Stampy_Handoff_Fase_4c.md` §5D, §6.8 |
| B6 | `DECISO` | **Invio email reale**: `GmailEmailSender` + `EMAIL_PROVIDER` (`console` \| `gmail`) in `env.ts`. Oggi esiste solo `ConsoleEmailSender` (rifiuta di partire in produzione). Limiti di Gmail da verificare (V3); valutare un provider transazionale quando ci sarà un dominio (SPF/DKIM). | `archive/Stampy_Handoff_Fase_4c.md` §5E, `archive/progress.md` §5.11 |
| B7 | `DECISO` | **Frontend Vue: staff e cliente.** Backend già pronto (`/venues/mine`, coda, confirm, reject, polling con saldo, `visit`). Da rispettare: `venueId` nell'URL con login sulla stessa pagina (no redirect), polling cliente ogni 1–2 s, **stepper della quantità di prodotti** (non dei timbri), avviso "premio applicato" quando `rewards > 0`, card piena mostrata come "premio disponibile". | `archive/Stampy_Handoff_Fase_4d.md` §5.3, `archive/Report_Fase_4d.md` §5.3 |
| B8 | `TODO` | **Rotta "riaggiungi card"** per chi ha rimosso il pass: rigenerare il `saveUrl` della card esistente. Piccola, ma serve una scelta di prodotto sull'esposizione (link pubblico? dopo login?). | `archive/stampy_contesto_progetto.md` §5 |
| B9 | `DA-DECIDERE` | **Branding di default** per un locale appena creato (oggi `branding = {}` fa fallire la creazione card) e personalizzazione self-service (rimandata). | `archive/stampy_contesto_progetto.md` §5 |
| B10 | `DA-VERIFICARE` | **`wallet_status`**: oggi vale `not_added` e non viene letto né aggiornato. Diventerebbe affidabile solo con un meccanismo di notifica di Google (V1). | `archive/stampy_contesto_progetto.md` §4.6 |
| B11 | `DECISO` | **Dashboard gestore** (iscritti, timbri assegnati, premi riscattati + grafici nel tempo). Non iniziata. | `archive/stampy_contesto_progetto.md` §4.8 |
| B12 | `DECISO` | **Apple Wallet**, solo dopo aver validato il flusso su Google: 99 $/anno, pass `.pkpass` firmati, estrazione del codice Wallet da `wallet/wallet.service.ts`. Con Apple si valuterà anche il login con Apple. | `archive/stampy_contesto_progetto.md` §4.6, §5 |
| B13 | `DA-DECIDERE` | **Accesso con telefono + SMS**: solo con un cliente reale (costo per messaggio, NIST lo classifica "restricted"). Schema già predisposto. | `archive/progress.md` §5.27 |

---

## 3. Debito tecnico verificato nel codice

Nessuna di queste voci blocca lo sviluppo; quasi tutte bloccano il deploy.

| ID | Stato | Cosa | Dove |
|---|---|---|---|
| C1 | `TODO` | `logger: true` stampa query e parametri (quindi anche email e hash dei codici). Da togliere prima del deploy. | `src/db/index.ts` |
| C2 | `TODO` | Rotta inesistente → pagina **HTML** di Express invece del JSON. Serve un 404 JSON. | `src/app.ts` |
| C3 | `TODO` | JSON malformato nel body → **500** (atteso 400): l'errore di body-parser ha `status` ma non è un `GenericError`. | `src/errors/generic.ts` |
| C4 | `TODO` | Il 400 della validazione restituisce anche `value` (eco dell'input). | `src/errors/validation-error.ts` |
| C5 | `TODO` | `start` usa `tsx` e `build`/`dist` sono scollegati; `dist/` è vecchio e ignorato da Git. Decidere il deploy (tsx o build) e allineare gli script. | `package.json`, `dist/` |
| C6 | `TODO` | `visit` non è in transazione (gli step sono idempotenti, ma una card può restare senza richiesta se fallisce a metà). | `src/api/venues/venues.controller.ts` |
| C7 | `TODO` | Il **409** di `visit` ha lo status nel codice ma non è esercitabile senza forzare una race: nessun test lo copre. | `venues.controller.ts` |
| C8 | `TODO` | `TryLaterError` ha `name = "TryLaterFound"` (refuso) e messaggio inglese `"Try again later"`; il corpo del 429 non è concordato con il frontend. | `src/errors/try-later.error.ts` |
| C9 | `TODO` | **Codice morto**: `src/api/users/users.service.ts` non è importato da nessuna rotta; `UserNotFoundError` e `PromotionExpiredError` (+ handler registrati) non vengono mai lanciati; `CardNotFoundError` copre un ramo impossibile. | `src/api/users/`, `src/errors/` |
| C10 | `TODO` | Commento sbagliato: dice che l'utente autenticato sta in `req.user`, ma sta in `req.auth`. | `src/utils/types/auth.type.ts` |
| C11 | `TODO` | `npm run script:all` si ferma: `create-owner` e `create-venue` richiedono argomenti ed escono con 1; inoltre la catena non passa `--env-file=.env`. O si tolgono dalla catena o si accettano argomenti. | `package.json` |
| C12 | `TODO` | `public_code` generato con nanoid senza retry: una collisione (23505) darebbe 500. Probabilità bassissima, ma il fix è di due righe. | `src/api/cards/cards.service.ts` |
| C13 | `TODO` | `addOrGetCard` fa `INSERT` prima del `SELECT` (scelta accettata: evita la race). Se il codice cresce, valutare un `CardsService` più esplicito. | `cards.service.ts` |
| C14 | `TODO` | `.vscode/settings.json` è tracciato: decidere se tenerlo. | `.vscode/` |
| C15 | `TODO` | Tag `fase-4d-chiusa` mai creato (in repo esiste solo `refactor-struttura-chiuso`). I tag non sono indispensabili, ma la chiusura delle fasi è tracciata solo dai commit. | Git |

---

## 4. Test

| ID | Stato | Cosa |
|---|---|---|
| T2 | `TODO` | Un fallimento isolato e non riprodotto in `otp-request.ts` ("5 richieste simultanee" dopo un riavvio di nodemon). Se ricapita, salvare l'output prima di indagare. | 
| T3 | `TODO` | Test da aggiungere quando la feature esiste: aggiornamento del pass end-to-end (B1), login Google con token valido/alterato/`aud` errato/email di terzi (B5), anonimizzazione (B4), 409 di `visit` (C7). |
| T4 | `TODO` | **Collection Bruno** per test manuali strutturati: solo proposta, nulla creato. Il piano prevedeva cartelle `00–09` e fixture generate da script (Bruno non ha accesso al DB né ai codici OTP). |
| T5 | `TODO` | Prova reale su browser/iPhone/HTTPS: cookie `Secure`, `SameSite=Lax` dall'apertura da tag, scorrimento della sessione. Oggi tutto testato solo via HTTP in locale. |

---

## 5. Verifiche esterne (solo su richiesta esplicita dell'utente)

Non inventare API, SDK o limiti: queste voci si chiudono leggendo la documentazione
ufficiale o provando sul campo, e la risposta va scritta qui.

| ID | Cosa verificare |
|---|---|
| V1 | **Google Wallet REST**: auth/scope, patch vs sostituzione, campi aggiornabili (`loyaltyPoints.balance`, `user_progress`), latenza, se la class è modificabile, notifiche per `wallet_status`. |
| V2 | **Google publishing access**: tempi di review, requisiti del Business Profile per un individuo senza P.IVA, limiti dei pass in demo/test, screenshot richiesti. |
| V3 | **Gmail**: limiti di invio e consegna per email automatiche, autenticazione (app password vs OAuth). |
| V4 | **Google Sign-In**: client ID, schermata di consenso, requisiti di verifica, **come ottenere un ID token in test** senza frontend. |
| V5 | **Apple**: `id_token`, se `email_verified` può essere falso (Work & School), gestione "Hide My Email". |
| V6 | **NFC fisico**: lettura in background su iPhone (XS/XR in poi) e Android; comportamento con cover e superfici metalliche. |
| V7 | **Cloudflare**: tunnel con nome/URL fisso; numero di hop per `TRUST_PROXY` dietro il proxy di staging (mai `true`). |
| V8 | **Safari ITP**: il cookie `httpOnly` scritto dal server non dovrebbe rientrare nei 7 giorni, ma se l'IP del server è scollegato dal sito può scattare → frontend e `/api` sulla stessa origine. |
| V9 | **Grafica del pass**: dimensioni e requisiti del logo (PNG, meglio quadrato). `public/logo.png` non è servito da nessuna rotta. |

---

## 6. Prodotto e campo

| ID | Stato | Cosa |
|---|---|---|
| P1 | `TODO` | **Parlare con 2-3 gestori reali** (bar, gelaterie, pizzerie): prerequisito per modello di business e decisioni su scadenza/rollover. Non è un compito tecnico rimandabile. |
| P2 | `DA-DECIDERE` | Cosa succede ai timbri maturati alla **scadenza o al cambio di promozione** (azzerare, tenere, avvisare sulla card). Blocca B2. |
| P3 | `DA-DECIDERE` | **Modello di business** e prezzo. |
| P4 | `TODO` | **Supporto fisico per il locale**, a fasi: prototipo (adesivo NTAG213 su porta-menù in acrilico a L + QR stampato), pilota (stampa col brand), scala (plexiglass su misura con chip incassato). Non bloccare mai i tag in sola lettura prima dell'URL definitivo. |
| P5 | `TODO` | **Dominio** (~10 €/anno) e **hosting di staging** (es. Railway, Fly.io) con URL fisso; il dominio serve anche per SPF/DKIM dell'email. |
| P6 | `DA-DECIDERE` | Tenere il barcode sul pass? L'identificazione avviene dal tag/QR del banco; potrebbe bastare `accountId`. Decidere anche come mostrare il `publicCode` leggibile. |
| P7 | `DA-DECIDERE` | Dashboard: quali numeri servono davvero al gestore (oltre a iscritti, timbri, premi). |
| P8 | `TODO` | **Anteprima dei tratti** per lo staff prima della conferma (rimandata: prima il flusso base). |
| P9 | `TODO` | Mostrare i **premi anche al cliente** nel polling (oggi `rewards` compare solo nella risposta di `confirm`, quindi lo vede solo lo staff). |

---

## 7. Regole di sicurezza da rispettare nelle API vere

Promemoria operativo (le decisioni stanno in `CONTEXT.md` §5).

- Auth prima della validazione: `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- Il `venueId` del path è un **selettore**, mai una prova di autorizzazione: il ruolo si
  legge da `venue_members` a ogni richiesta.
- **Ownership** su ogni risorsa: la verifica è in SQL (join su `cards.user_id`); una
  risorsa altrui dà lo **stesso 404** di una inesistente e non viene mai scritta.
- La conferma è idempotente per costruzione: UPDATE condizionato a `status='pending'` +
  `idempotency_key` univoca. Doppia conferma → 409, mai doppio conteggio.
- Validazione: niente campi non previsti, tetto su ogni valore numerico, niente
  coercizione implicita, 400 (non 500) per input mancanti.
- Limiti a due livelli (card e IP), mai un contatore globale; `TRUST_PROXY` = numero di hop.
- Segreti: service account, `OTP_HMAC_SECRET`, credenziali email mai in Git, in chat o
  nei documenti; in produzione nei secret dell'hosting.
- Mai `res.json(riga)`; mai dati personali nei log o in `auth_events.metadata`.
- Ogni UPDATE di stato con il filtro di stato nel `WHERE`.

---

## 8. Chiuso di recente

Non si riapre: se serve il dettaglio, è in `archive/` e nei commit.

| Data | Cosa |
|---|---|
| 28/10/2026 | **Suite rieseguita** dopo l'ultimo commit: 101 controlli verdi (20+24+12+13+16+16) e 25 controlli SQL (19+6), `typecheck:all` pulito. |
| 28/10/2026 | **Documentazione riorganizzata**: 3 file vivi (`CONTEXT.md`, `CODEBASE.md`, `BACKLOG.md`), i 7 doc storici in `docs/archive/`. |
| 27/10/2026 | **Fase 4d**: rate limit di `visit` (10 nuove/ora per card), auth staff con ruoli, `/venues/mine`, coda, conferma/rifiuto in transazione, migration 3, regola dei timbri corretta. 101 controlli verdi. |
| 26/10/2026 | Percorso email (OTP), `isAuthenticated`, sessione scorrevole con tetto assoluto, logout, `visit`/polling con l'utente di sessione e ownership in SQL. |
| 24/10/2026 | Migration 2 (`auth_identities`, `otp_challenges`, `sessions`, `auth_events`; email su `users`, telefono rimosso), decisioni di auth. |
| 27-28/10/2026 | Script `typecheck:all` (scripts inclusi), rimozione dipendenze inutilizzate, enum derivati dai `pgEnum`, `CardsService` separato dal Wallet, `create-venue`. |
