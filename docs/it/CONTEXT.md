> 🇮🇹 **Traduzione italiana di sola lettura** di `docs/CONTEXT.md`.
> La fonte di verità è la versione inglese: in caso di dubbio o differenza vince l'inglese.
> Nomi di codice, tabelle e stringhe API (es. `"Codice non valido o scaduto"`) restano letterali.

# Stampy — Contesto e decisioni

> Documento **statico**: si modifica solo quando cambia una decisione (prodotto, architettura,
> sicurezza), non per riportare avanzamenti. Lo stato del codice vive in `CODEBASE.md`, ciò
> che resta da fare in `BACKLOG.md`, la storia in `archive/`.
> Ultima revisione: 28 ottobre 2026.

---

## 1. Cos'è Stampy

Stampy sostituisce le tessere fedeltà a timbri di carta con una card digitale nel Wallet dello
smartphone (Google Wallet, in futuro Apple Wallet), per locali food & beverage (bar, pizzerie,
ristoranti, gelaterie, panifici…). **Nessuna app da scaricare per il cliente.**

Obiettivi: esperienza veloce per il cliente, poco attrito per lo staff, personalizzazione per
locale, dati utili al gestore del locale su visite, premi e tendenze.

Mercato iniziale: piccole/medie attività locali in Italia, spesso ancora con le tessere di carta.

## 2. Vincoli

- Nessun cliente pilota confermato: lo sviluppo è in solitaria.
- **Budget minimo: il ricavo viene prima dell'investimento.** Ogni scelta tecnica deve restare
  a costo ~0 (per questo l'auth non usa SMS a pagamento e il Wallet parte da Google).
- Nessuna scadenza fissa.
- Le scelte di business (prezzo, modello) vengono **dopo** aver parlato con 2-3 gestori di
  locali veri. Non sono un compito tecnico rimandabile, ma non bloccano il backend.

## 3. Attori e flussi

- **Cliente**: un solo account sulla piattaforma, una card per ogni locale a cui aderisce.
  Entra da un link (tag NFC o QR sul banco) → login (email con codice, oppure Google) →
  se non ha una card per quel locale, il backend la crea e restituisce il link al Wallet.
- **Staff** (titolare/personale del locale): stessa web app, stesso metodo di login, ruolo per
  locale. Vede la coda delle richieste in attesa, le conferma o le rifiuta.
- **Team Stampy**: configura locali e promozioni con degli script (`create-venue`,
  `create-owner`); nessun self-service nell'MVP.

## 4. Decisioni — prodotto

### 4.1 Cliente e card

- **Un cliente per piattaforma**, non duplicato per locale.
- **Una card per locale**: più locali = più card distinte nel Wallet. Ogni locale ha la propria
  identità di brand e la propria formula. Una vista riepilogativa multi-locale è un'evoluzione
  futura fuori dal Wallet (web app), non MVP.
- **Identificativo primario: email verificata.** Niente password. Registrazione e login sono lo
  stesso gesto (se l'email non esiste, l'utente viene creato).
- Metodi **futuri, non confermati** (lo schema è pronto): Apple, telefono con SMS. Email e
  telefono non vengono uniti.
- Nessun fuzzy matching. Per i casi limite (cambio email), unione manuale da supporto/admin.
- **Stesso account con metodi diversi**: chi accede con Google usando la stessa email arriva
  allo stesso account, ma solo alle condizioni del §5.3.

### 4.2 Promozioni

- Un solo modello nell'MVP: **timbri** (`type = "stamps"`), config `{v:1, stampsRequired, reward}`.
- Lo schema deve rendere gli altri modelli un'estensione: `type` + configurazione JSONB.
- Le promozioni le configura il team Stampy, non il gestore del locale (self-service rimandato).
- **Una sola promozione attiva per locale**, imposta dal DB (vincolo sugli intervalli).

### 4.3 Interazione nel locale

- **NFC** come metodo principale, **QR** come ripiego. Il tag contiene un semplice record NDEF
  con un URL: viene letto dal sistema operativo del telefono, non da JavaScript.
  **La Web NFC API non si usa** (non esiste su Safari/iOS).
- L'operazione (timbri o premio) è **sempre confermata dallo staff**, mai automatica:
  il tag si può copiare e il cliente potrebbe toccarlo più volte.
- Il flusso completo, gli status code e i limiti sono in `CODEBASE.md` §5.

### 4.4 Regola dei timbri (invariante di prodotto)

Lo staff digita **quanti prodotti sono stati consumati, premio incluso**. Il backend divide la
quantità in segmenti consecutivi; il prodotto premio **consuma un'unità** della quantità e
**non è un timbro**.

```
soglia 10, card 0, quantità 15
  prodotti 1-10   → timbro 10     (card piena: premio disponibile)
  prodotto 11     → redeem 1      (gratis, consuma 1 della quantità)
  prodotti 12-15  → timbro 4
  → card 4/10, 1 premio consumato
```

- Quantità **esattamente** alla soglia (10 da 0): la card resta a **10/10** e il premio è
  **disponibile**. Il prodotto successivo è gratis (`confirm` con quantità 1 → solo
  `redeem`, card 0). **Non azzerare la card alla soglia**: il premio andrebbe perso.
- `stampsCount ∈ [0, stampsRequired]`; `rewards` = premi **consumati** in quella conferma.
- Tetto per conferma: **50 prodotti** (protegge dagli errori di digitazione).
- La regola vale **solo** per `type = "stamps"`: gli altri modelli avranno una funzione propria.
- L'anteprima dei segmenti per lo staff è rimandata.

### 4.5 Interfaccia dello staff

- Prima fase: **web app** su qualsiasi tablet/telefono, nessun hardware dedicato.
- Il terminale dedicato (e il vero "POS a tocco", Apple VAS / Google Smart Tap) resta un
  obiettivo dichiarato per più avanti: richiede hardware certificato ed è un secondo prodotto.
- L'hardware si progetta **dopo** aver osservato lo staff vero con la web app.

### 4.6 Wallet

- Partire **solo con Google Wallet** (gratuito). Apple in una seconda fase, quando l'Apple
  Developer Program da 99 $/anno diventerà sostenibile.
- **Nessuna interfaccia astratta "wallet provider"**: c'è un solo provider. Si estrae quando
  arriva Apple. Tutto il codice Google vive in `api/wallet/`; `cards.service` conosce solo
  `buildObjectId`.
- **Modello Google**: una LoyaltyClass per locale (identità e branding: nome, logo, colore,
  banner); tutto ciò che dipende dalla promozione (premio, soglia, contatore) vive
  nell'object della card, così la card sopravvive a un cambio di promozione.
- Il link "Aggiungi a Google Wallet" è firmato in locale (JWT RS256 con la chiave del service account).
- `wallet_status` è `not_added` e **non viene né letto né aggiornato**.
- Account issuer in modalità demo; l'accesso alla pubblicazione è ancora da richiedere.

### 4.7 Multi-tenant

Multi-tenant **fin dal primo schema**: ogni tabella figlia porta `venue_id` e le FK composte
`(id, venue_id)` impediscono incoerenze tra locali. Non si passa da "isolato" a multi-tenant dopo.

### 4.8 Dashboard del gestore del locale

Ibrida: numeri semplici (soci, timbri assegnati, premi riscattati) + grafici nel tempo.
Non iniziata.

### 4.9 Stack

- **Backend**: Node.js + Express 5 + TypeScript (`strict`), Drizzle ORM, PostgreSQL 16.
- **Frontend**: Vue.js (non iniziato).
- **DB relazionale, non documentale**: il modello è relazionale (card → utente + locale, eventi →
  card) e servono vincoli (multi-tenant, idempotenza, una promozione attiva). La parte variabile
  delle promozioni usa `type` + `JSONB`.
- **Validazione**: `class-validator` per i DTO HTTP; `zod` per env, branding,
  `promotions.config`, metadata di `auth_events`.
- **Migrazioni**: `generate` + `migrate`, **mai `push`** (cancellerebbe i vincoli scritti a mano,
  es. `promotions_no_overlap` con `btree_gist`). Leggere sempre l'SQL generato.
- **Auth**: cookie `httpOnly` + sessione revocabile nel DB, non un JWT in `localStorage`.

## 5. Decisioni — auth e sessioni

Obiettivo: costo ~0 al lancio, buona esperienza al banco, tutto tracciabile nel DB,
una struttura estendibile ad Apple e telefono senza riscritture.

### 5.1 Principi

- **Niente password.** Il rischio residuo è una casella email compromessa, accettato per questo
  livello di rischio (nessun pagamento, conferma dello staff).
- **Nessun account o identità senza prova di possesso** (codice OTP o IdP autorevole):
  difesa contro il *pre-hijacking*. Nessuna funzione "cambia email" non verificata.
- **Chiave dell'identità: `(provider, sub)`**, mai l'email (può cambiare).
- `users.email` è UNIQUE e impostata **solo dopo** la prova di possesso: un account per
  email anche con richieste simultanee.
- `users` (chi sono) è separato da `auth_identities` (come lo dimostrano).
- Risposta **identica** per email esistente e inesistente.

### 5.2 Codici OTP

- 6 cifre, validi **5 minuti**, monouso, legati alla challenge (il client invia
  `challengeId` + codice), salvati solo come **HMAC** con un segreto del server.
- Un nuovo invio **invalida il precedente** nella stessa transazione.
- **5 tentativi** per codice; il quinto con il codice giusto riesce; al quinto tentativo
  sbagliato la challenge viene invalidata.
- **45 secondi** tra due invii allo stesso destinatario (lato server).
- **5 invii/ora** per destinatario (finestra scorrevole), poi sospensione di 1 ora.
- I limiti sono **per destinatario**, mai un contatore globale (bloccherebbe tutta l'app).
- Un solo errore `400 "Codice non valido o scaduto"` (letterale italiano nel codice) per ogni
  fallimento di verifica.
- Valori nostri, non standard: gli standard (NIST/OWASP) fissano tetti più larghi.

### 5.3 Google (login non ancora implementato)

- Verifica di firma, `aud`, `iss`, `exp` del token.
- Collegamento automatico a un account esistente **solo** se l'email è `@gmail.com` oppure
  `email_verified` è true **con `hd` impostato**.
- **Google con email di terzi (es. libero.it): rifiutato** nell'MVP, con un invito a usare
  l'email con codice e un evento `google_untrusted_email_rejected`. Accettarle in futuro
  richiederà una migrazione additiva, non una riscrittura.

### 5.4 Sessioni e cookie

- Token casuale di 32 byte (43 caratteri base64url); nel DB si salva solo il suo **SHA-256**.
- Cookie `sid`: `httpOnly`, **`SameSite=Lax`** (Strict romperebbe l'apertura da un tag
  NFC/QR), `Secure` solo in produzione, `Path=/`, non firmato (`cookie-parser` senza
  segreto). `maxAge` = tetto assoluto (90 giorni), **non rinnovato**.
- **Scorrevole con tetto assoluto**: 30 giorni dall'ultima attività, rinnovato al massimo ogni
  **5 minuti**, mai oltre **90 giorni** da `created_at` (nessuna colonna nuova).
- **Un solo 401** per cookie mancante, manomesso, scaduto, revocato, utente anonimizzato o
  tetto superato. Nessun log sui 401.
- **Logout**: revoca **solo la sessione corrente** (`revoked_at` scritto solo se NULL),
  evento `logout` nella stessa transazione e solo se la revoca è avvenuta, cookie
  rimosso con le stesse opzioni. L'"esci da tutti i dispositivi" non esiste.
- Frontend e `/api` devono stare **sulla stessa origin** (rischio Safari ITP).

### 5.5 Staff e ruoli

- Stesso metodo di login del cliente, **account personale**.
- Ruolo (`owner`/`staff`) in `venue_members`, letto **a ogni richiesta**: mai nella
  sessione, mai in `req.auth`, mai dal body. Il `venueId` nel path è solo un selettore.
- Non membro → **403**.
- Primo `owner` con `scripts/create-owner.ts <email> <slug>` dopo il primo login
  dell'utente (idempotente, `--force` per promuovere uno `staff`).
- Per ora owner e staff hanno gli stessi poteri.

### 5.6 Limiti

- **Per card**: 10 richieste di timbro **nuove**/ora, contate su `stamp_requests` (qualsiasi
  stato), 429 con `Retry-After`. Non è un cooldown: un nuovo tocco con una richiesta pending
  ancora viva restituisce quella e non consuma quota; dopo un rifiuto o una scadenza se ne può
  fare subito una nuova.
- **Per IP** sulle route `/auth/email/*`: 30 richieste/15 minuti (`express-rate-limit`),
  attivo in produzione o con `IP_RATE_LIMIT=on`, spento con `off`. In sviluppo è un
  pass-through. Dipende da `TRUST_PROXY` (numero di hop, **mai `true`**).
- I due limiti hanno scopi diversi: quello per card protegge la card, quello per IP
  protegge l'app da raffiche automatizzate.

### 5.7 Audit e privacy

- `auth_events` append-only (solo INSERT): invii, invii bloccati, tentativi falliti,
  verifiche, login, collegamenti, Google rifiutato, logout, revoche.
- Mai l'email in chiaro: solo `subject_hash` (HMAC). `metadata` con una whitelist zod per
  tipo di evento; niente IP, niente dominio dell'email, niente codici.
- **Gli utenti non si cancellano, si anonimizzano** (GDPR): identità rimosse, email e
  dati personali svuotati, `anonymized_at` impostato, sessioni revocate; i log di timbri ed
  eventi restano. La procedura non è ancora implementata (vedi `BACKLOG.md`).
- Retention di `otp_challenges`/`auth_events`: **rimandata a prima del primo utente reale**.

## 6. Decisioni — dati (invarianti)

Il dettaglio tecnico è in `CODEBASE.md` §6; qui ci sono le regole che non si possono violare.

- Una card per persona per locale (`UNIQUE user_id, venue_id`); la card è la relazione
  cliente ↔ locale e non scade con la promozione.
- Una sola promozione attiva per locale (`btree_gist` EXCLUDE sulla sovrapposizione degli intervalli).
- Una sola richiesta `pending` per card (indice UNIQUE parziale).
- Una richiesta può generare **più** `stamp_event` (uno per segmento): `request_id` **non** è
  UNIQUE, l'unicità sta su `idempotency_key = {requestId}:{n}`.
- Card piena (`stamps_count = stampsRequired`) = **premio disponibile**, non un dato da correggere.
- La fonte di verità per la scadenza è `expires_at`: scadenza **lazy** (niente cron), solo da
  `pending`, applicata da polling, coda e confirm/reject.
- Le FK sono sempre `ON DELETE RESTRICT`: i log sono immutabili, per questo si anonimizza.
- Email sempre minuscole e senza spazi (CHECK nel DB); nessun'altra normalizzazione.

## 7. Cosa non fare

- Non sviluppare hardware dedicato né il "POS a tocco" (Apple VAS / Google Smart Tap) in
  parallelo al software: è hardware certificato, non un'estensione della web app.
- Non implementare Apple Wallet prima di aver validato il flusso su Google Wallet.
- Non modellare il cliente come isolato per locale (serve un cliente + più card).
- Non costruire un motore generico di regole per le promozioni finché non serve davvero.
- Non usare la Web NFC API: non esiste su iOS. Il tag si legge in modo nativo (URL).
- Non decidere il modello di business prima di aver parlato con gestori di locali veri.
- Non reintrodurre un'interfaccia astratta "wallet provider" finché non esiste Apple.
- Non reintrodurre password, login con email non verificata, né un UNIQUE su
  `stamp_events.request_id`.
- Mai fidarsi del client per autorizzazione, quantità o segmenti.
- Non mettere i ruoli nella sessione o in `req.auth`, né dati personali nei log o in
  `auth_events.metadata`.
- Non aggiornare `last_seen_at`/`expires_at` a ogni richiesta, né superare il tetto assoluto
  calcolato da `created_at`.
- Non aggiornare lo stato di una richiesta senza il filtro `status = 'pending'`.
- Non usare `new Date()` per le scadenze: sempre il `now()` del DB.
- Non usare `drizzle-kit push`.

## 8. Domande di prodotto aperte

Non sono decisioni: sono scelte ancora da fare (tracciate in `BACKLOG.md` §6).

- Cosa succede ai timbri accumulati alla scadenza o al cambio di promozione (azzerare, tenere,
  avvisare). Oggi confirm risponde 409 se la promozione della card non è quella attiva.
- Modello di business e prezzo.
- Aspetto e contenuto del supporto fisico (tag/QR) e del pass.
- Dashboard: quali numeri servono davvero al gestore del locale.
