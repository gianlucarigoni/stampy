# Stampy — Contesto e decisioni

> Documento **statico**: si modifica solo quando cambia una decisione (prodotto,
> architettura, sicurezza), non per raccontare l'avanzamento. Lo stato del codice
> sta in `CODEBASE.md`, ciò che resta in `BACKLOG.md`, la storia in `archive/`.
> Ultima revisione: 28 ottobre 2026.

---

## 1. Cos'è Stampy

Stampy sostituisce le tessere fedeltà cartacee a timbri con una card digitale nel
Wallet dello smartphone (Google Wallet, Apple Wallet in futuro), per attività locali
food & beverage (bar, pizzerie, ristoranti, gelaterie, panifici…). **Nessuna app da
scaricare per il cliente.**

Obiettivi: esperienza rapida per il cliente, poco invasiva per lo staff,
personalizzazione per locale, dati utili al gestore su visite, premi e andamento.

Mercato iniziale: piccole/medie attività locali in Italia, spesso ancora su cartoncino.

## 2. Vincoli

- Nessun cliente pilota confermato: lo sviluppo è in autonomia.
- **Budget minimo: si incassa prima di investire.** Ogni scelta tecnica deve restare
  a costo ~0 (per questo l'auth non usa SMS a pagamento e il Wallet parte da Google).
- Nessun vincolo di tempo fisso.
- Le scelte di business (prezzo, modello) arrivano **dopo** aver parlato con 2-3
  gestori reali. Non sono un compito tecnico rimandabile, ma non bloccano il backend.

## 3. Attori e flussi

- **Cliente**: account unico sulla piattaforma, una card per ogni locale a cui aderisce.
  Entra da un link (tag NFC o QR del banco) → login (email con codice oppure Google) →
  se non ha la card per quel locale il backend la crea e restituisce il link Wallet.
- **Staff** (owner/staff del locale): stessa web app, stesso metodo di login, ruolo
  per locale. Vede la coda delle richieste pendenti, conferma o rifiuta.
- **Team Stampy**: configura locali e promozioni con gli script (`create-venue`,
  `create-owner`); nessun self-service nell'MVP.

## 4. Decisioni — prodotto

### 4.1 Cliente e card

- **Cliente unico sulla piattaforma**, non duplicato per locale.
- **Una card per locale**: più locali = più card distinte nel Wallet. Ogni locale ha
  la propria identità di brand e la propria formula. Una vista riassuntiva multi-locale
  è un'evoluzione futura fuori dal Wallet (web app), non MVP.
- **Identificatore primario: email verificata.** Nessuna password. Registrazione e
  login sono lo stesso gesto (se l'email non esiste si crea l'utente).
- Metodi **futuri, non confermati** (lo schema è predisposto): Apple, telefono con SMS.
  Email e telefono non si uniscono.
- Nessun matching fuzzy. Per i casi limite (cambio email) merge manuale da supporto/admin.
- **Stesso account con metodi diversi**: chi entra con Google usando la stessa email
  accede allo stesso account, ma solo alle condizioni di §5.3.

### 4.2 Promozioni

- Un solo modello nell'MVP: **timbri** (`type = "stamps"`), config `{v:1, stampsRequired, reward}`.
- Lo schema deve rendere gli altri modelli un'estensione: `type` + configurazione JSONB.
- Le promozioni le configura il team Stampy, non il gestore (self-service rimandato).
- **Una sola promozione attiva per locale**, garantita dal DB (vincolo sugli intervalli).

### 4.3 Interazione in negozio

- **NFC** come metodo principale, **QR** come fallback. Il tag contiene un semplice
  record NDEF con URL: lo legge il sistema operativo del telefono, non JavaScript.
  **Non si usa la Web NFC API** (non esiste su Safari/iOS).
- L'operazione (timbri o premio) è **sempre confermata dallo staff**, mai automatica:
  il tag è copiabile e il cliente potrebbe toccarlo più volte.
- Il flusso completo, i codici di stato e i limiti sono in `CODEBASE.md` §5.

### 4.4 Regola dei timbri (invariante di prodotto)

Lo staff digita **quanti prodotti sono stati consumati, premio compreso**. Il backend
scompone la quantità in tratti consecutivi; il prodotto in premio **consuma una unità**
della quantità e **non è un timbro**.

```
soglia 10, card 0, quantità 15
  prodotti 1-10   → stamp 10      (card piena: premio disponibile)
  prodotto 11     → redeem 1      (gratis, consuma 1 della quantità)
  prodotti 12-15  → stamp 4
  → card 4/10, 1 premio consumato
```

- Quantità **esattamente** sulla soglia (10 da 0): la card resta **10/10** e il premio
  è **disponibile**. Il prodotto successivo è gratis (`confirm` con quantità 1 → solo
  `redeem`, card 0). **Non azzerare la card alla soglia**: si perderebbe il premio.
- `stampsCount ∈ [0, stampsRequired]`; `rewards` = premi **consumati** in quella conferma.
- Tetto per conferma: **50 prodotti** (protegge da errori di digitazione).
- La regola vale **solo** per `type = "stamps"`: altri modelli avranno la loro funzione.
- L'anteprima dei tratti per lo staff è rimandata.

### 4.5 Interfaccia staff

- Prima fase: **web app** su tablet/telefono qualsiasi, nessun hardware dedicato.
- Il terminale dedicato (e il vero "tap POS" Apple VAS / Google Smart Tap) resta un
  obiettivo dichiarato per dopo: richiede hardware certificato, è un secondo prodotto.
- L'hardware si progetta **dopo** aver osservato lo staff reale con la web app.

### 4.6 Wallet

- Si parte **solo con Google Wallet** (gratuito). Apple in una seconda fase, quando i
  99 $/anno dell'Apple Developer Program saranno sostenibili.
- **Nessuna interfaccia "wallet provider" astratta**: c'è un solo provider. Si estrae
  quando arriva Apple. Tutto il codice Google sta in `api/wallet/`; `cards.service`
  conosce solo `buildObjectId`.
- **Modello Google**: una LoyaltyClass per locale (identità e branding: nome, logo,
  colore, banner); tutto ciò che dipende dalla promozione (premio, soglia, contatore)
  sta nell'object della card, così la card sopravvive al cambio di promozione.
- Il link "Add to Google Wallet" si firma in locale (JWT RS256 con la chiave del
  service account).
- `wallet_status` vale `not_added` e **non viene letto né aggiornato**.
- Issuer account in demo mode; il publishing access è da richiedere.

### 4.7 Multi-tenant

Multi-tenant **dal primo schema**: ogni tabella figlia porta `venue_id` e le FK
composite `(id, venue_id)` impediscono incoerenze tra locali. Non si passa da
"isolato" a multi-tenant dopo.

### 4.8 Dashboard gestore

Ibrida: numeri semplici (iscritti, timbri assegnati, premi riscattati) + grafici nel
tempo. Non iniziata.

### 4.9 Stack

- **Backend**: Node.js + Express 5 + TypeScript (`strict`), Drizzle ORM, PostgreSQL 16.
- **Frontend**: Vue.js (non iniziato).
- **DB relazionale, non documentale**: il modello è relazionale (card → utente + locale,
  eventi → card) e servono vincoli (multi-tenant, idempotenza, una promozione attiva).
  La parte variabile delle promozioni usa `type` + `JSONB`.
- **Validazione**: `class-validator` per i DTO HTTP; `zod` per env, branding,
  `promotions.config`, metadata di `auth_events`.
- **Migration**: `generate` + `migrate`, **mai `push`** (cancellerebbe i vincoli scritti
  a mano, es. `promotions_no_overlap` con `btree_gist`). Leggere sempre il SQL generato.
- **Auth**: cookie `httpOnly` + sessione revocabile nel DB, non JWT in `localStorage`.

## 5. Decisioni — auth e sessioni

Obiettivo: costo ~0 al lancio, buona esperienza al banco, tutto tracciabile a DB,
struttura estendibile ad Apple e telefono senza riscrivere.

### 5.1 Principi

- **Niente password.** Il rischio residuo è la casella email compromessa, accettato
  per questo livello di rischio (nessun pagamento, conferma dello staff).
- **Nessun account o identità senza prova di possesso** (codice OTP o IdP autorevole):
  difesa dal *pre-hijacking*. Nessuna funzione "cambia email" non verificata.
- **Chiave dell'identità: `(provider, sub)`**, mai l'email (può cambiare).
- `users.email` è UNIQUE e valorizzata **solo dopo** la prova di possesso: un account
  per email anche con richieste simultanee.
- `users` (chi è) è separata da `auth_identities` (come dimostra di essere sé stesso).
- Risposta **identica** per email esistente e inesistente.

### 5.2 Codici OTP

- 6 cifre, validità **5 minuti**, monouso, legati alla sfida (il client invia
  `challengeId` + codice), salvati solo come **HMAC** con segreto del server.
- Un nuovo invio **invalida il precedente** nella stessa transazione.
- **5 tentativi** per codice; il quinto con il codice giusto passa; al quinto errore
  la sfida si invalida.
- **45 secondi** tra due invii allo stesso destinatario (lato server).
- **5 invii/ora** per destinatario (finestra scorrevole), poi sospensione di 1 ora.
- Limiti **per destinatario**, mai un contatore globale (bloccherebbe tutta l'app).
- Errore unico `400 "Codice non valido o scaduto"` per ogni fallimento della verifica.
- Valori nostri, non standard: gli standard (NIST/OWASP) fissano tetti più larghi.

### 5.3 Google (login non ancora implementato)

- Verifica di firma, `aud`, `iss`, `exp` del token.
- Collegamento automatico a un account esistente **solo** se l'email è `@gmail.com`
  oppure `email_verified` è vero **con `hd` valorizzato**.
- **Google con email di terzi (es. libero.it): rifiutato** nell'MVP, con invito a usare
  l'email con codice ed evento `google_untrusted_email_rejected`. Accettarli in futuro
  richiederà una migration additiva, non una riscrittura.

### 5.4 Sessioni e cookie

- Token casuale 32 byte (43 caratteri base64url); in DB solo lo **SHA-256**.
- Cookie `sid`: `httpOnly`, **`SameSite=Lax`** (Strict romperebbe l'apertura da tag
  NFC/QR), `Secure` solo in produzione, `Path=/`, senza firma (`cookie-parser` senza
  segreto). `maxAge` = tetto assoluto (90 giorni), **non rinnovato**.
- **Scorrevole con tetto assoluto**: 30 giorni dall'ultima attività, rinnovo al massimo
  ogni **5 minuti**, mai oltre **90 giorni** da `created_at` (nessuna colonna nuova).
- **401 unico** per cookie assente, alterato, scaduto, revocato, utente anonimizzato o
  tetto superato. Nessun log sui 401.
- **Logout**: revoca **solo la sessione corrente** (`revoked_at` scritto solo se NULL),
  evento `logout` nella stessa transazione e solo se la revoca è avvenuta, cookie
  rimosso con le stesse opzioni. "Esci da tutti i dispositivi" non esiste.
- Frontend e `/api` devono stare **sulla stessa origine** (rischio ITP di Safari).

### 5.5 Staff e ruoli

- Stesso metodo di login del cliente, **account personale**.
- Ruolo (`owner`/`staff`) in `venue_members`, letto **a ogni richiesta**: mai in
  sessione, mai in `req.auth`, mai dal body. Il `venueId` nel path è solo un selettore.
- Non-membro → **403**.
- Primo `owner` con `scripts/create-owner.ts <email> <slug>` dopo il primo login
  dell'utente (idempotente, `--force` per promuovere uno `staff`).
- Per ora owner e staff hanno gli stessi poteri

### 5.6 Limiti

- **Per card**: 10 richieste di timbro **nuove**/ora, contate su `stamp_requests`
  (qualunque stato), 429 con `Retry-After`. Non è un cooldown: un ritocco con pendente
  viva restituisce quella e non consuma quota; dopo rifiuto o scadenza si rifà subito.
- **Per IP** sulle rotte `/auth/email/*`: 30 richieste/15 minuti (`express-rate-limit`),
  attivo in produzione o con `IP_RATE_LIMIT=on`, spento con `off`. In sviluppo è un
  pass-through. Dipende da `TRUST_PROXY` (numero di hop, **mai `true`**).
- I due limiti hanno scopi diversi: quello per card protegge la card, quello per IP
  protegge l'app da raffiche scriptate.

### 5.7 Audit e privacy

- `auth_events` append-only (solo INSERT): invii, invii bloccati, tentativi falliti,
  verifiche, login, collegamenti, Google rifiutato, logout, revoche.
- Mai email in chiaro: solo `subject_hash` (HMAC). `metadata` con whitelist zod per
  tipo di evento; niente IP, niente dominio dell'email, niente codici.
- **Gli utenti non si cancellano, si anonimizzano** (GDPR): identità eliminate, email e
  dati personali svuotati, `anonymized_at` valorizzato, sessioni revocate; i log di
  timbri ed eventi restano. La procedura non è ancora implementata (vedi `BACKLOG.md`).
- Retention di `otp_challenges`/`auth_events`: **rimandata a prima del primo utente reale**.

## 6. Decisioni — dati (invarianti)

Dettaglio tecnico in `CODEBASE.md` §7; qui le regole che non si possono violare.

- Una card per persona per locale (`UNIQUE user_id, venue_id`); la card è la relazione
  cliente ↔ locale e non scade con la promozione.
- Una sola promozione attiva per locale (EXCLUDE `btree_gist` sulla sovrapposizione).
- Una sola richiesta `pending` per card (indice UNIQUE parziale).
- Una richiesta può generare **più** `stamp_event` (uno per tratto): `request_id` **non**
  è UNIQUE, l'unicità è su `idempotency_key = {requestId}:{n}`.
- Card piena (`stamps_count = stampsRequired`) = **premio disponibile**, non un dato
  da riparare.
- La verità sulla scadenza è `expires_at`: scadenza **lazy** (nessun cron), solo da
  `pending`, applicata da polling, coda e conferma/rifiuto.
- FK sempre `ON DELETE RESTRICT`: i log sono immutabili, per questo si anonimizza.
- Email sempre minuscole e senza spazi (CHECK nel DB); nessun'altra normalizzazione.

## 7. Cosa non fare

- Non sviluppare l'hardware dedicato né il "tap POS" Apple VAS / Google Smart Tap in
  parallelo al software: è hardware certificato, non un'estensione della web app.
- Non implementare Apple Wallet prima di aver validato il flusso su Google Wallet.
- Non modellare il cliente come isolato per locale (serve cliente unico + più card).
- Non costruire un motore di regole promozionali generico finché non serve davvero.
- Non usare la Web NFC API: non esiste su iOS. Il tag si legge in modo nativo (URL).
- Non decidere il modello di business prima di aver parlato con gestori reali.
- Non reintrodurre un'interfaccia "wallet provider" astratta finché non c'è Apple.
- Non reintrodurre password, login per email non verificata, o un UNIQUE su
  `stamp_events.request_id`.
- Non fidarsi mai del client per autorizzazione, quantità o tratti.
- Non mettere ruoli in sessione o in `req.auth`, né dati personali nei log o in
  `auth_events.metadata`.
- Non aggiornare `last_seen_at`/`expires_at` a ogni richiesta, né superare il tetto
  assoluto calcolato da `created_at`.
- Non aggiornare lo stato di una richiesta senza il filtro `status = 'pending'`.
- Non usare `new Date()` per le scadenze: sempre `now()` del DB.
- Non usare `drizzle-kit push`.

## 8. Domande di prodotto ancora aperte

Non sono decisioni: sono scelte da prendere (tracciate in `BACKLOG.md` §6).

- Cosa succede ai timbri maturati alla scadenza o al cambio di promozione (azzerare,
  tenere, avvisare). Oggi la conferma risponde 409 se la promozione della card non è
  quella attiva.
- Modello di business e prezzo.
- Aspetto e contenuti del supporto fisico (tag/QR) e del pass.
- Dashboard: quali numeri servono davvero al gestore.
