# Report Fase 4d — rate limit di `visit`, auth staff, coda, conferma/rifiuto

> Data: 27 ottobre 2026 — **aggiornato dopo la correzione della regola dei timbri** (vedi §7)
> Ambito: backend. Frontend staff non iniziato. Il pass Google **non** viene aggiornato in questa fase.
> Esito: **101 controlli verdi** su 6 script (24 nuovi end-to-end, 20 nuovi sulla funzione dei tratti), typecheck pulito.

---

## 1. Decisioni applicate

| # | Decisione | Come è stata implementata |
|---|---|---|
| D1 | Fase = rate limit + staff + coda + migration 3 + tratti + confirm/reject solo DB | Fatto. La card nel Wallet resta al saldo vecchio fino alla Fase 4e (accettato). |
| D2 | `venueId` nel path, validato contro `venue_members` | `requireRole` legge la membership a ogni richiesta; il ruolo non sta né in sessione né in `req.auth`. |
| D3 | Non-membro → 403 con classe e handler come gli altri errori | `src/errors/forbidden.error.ts` (`ForbiddenError` + `forbiddenHandler`), registrato in `errors/index.ts`. |
| D4 | Rate limit di `visit` derivato da `stamp_requests` | 10 richieste **nuove**/ora per card, `Retry-After` in secondi, **nessun cooldown**. |
| D5 | `express-rate-limit` attivo in produzione (attivabile in sviluppo con `IP_RATE_LIMIT=on`, disattivabile con `off`) | Limiter attivo se `IP_RATE_LIMIT=on`, spento se `off`, altrimenti solo con `NODE_ENV=production`. In sviluppo senza override è un pass-through: richieste illimitate per IP. |
| D6 | Lo staff inserisce **quanti prodotti sono stati consumati, premio compreso**; il sistema timbra fino alla soglia, conta 1 prodotto come premio, timbra il resto | `splitStamps()` + evento `redeem` che **consuma una unità** della quantità; la conferma restituisce `rewards` (premi consumati) allo staff. Il cliente non vede i premi (per ora). |
| D7 | Massimo 50 **prodotti** per conferma | `MAX_STAMPS_PER_CONFIRM = 50` nel DTO (`@Max(50)`); il nome della costante resta `stamps` (campo approvato), il valore è la quantità di prodotti. |
| D8 | Doppia conferma → 409 | UPDATE condizionata su `status='pending'`: chi perde prende 409, nessun doppio conteggio. |
| D9 | Coda con `{requestId, publicCode, stampsCount, stampsRequired, createdAt, expiresAt}`, mai email | `GET /api/venues/:venueId/requests`. |
| D10 | Polling esteso con il saldo | `GET /api/requests/:requestId` → `{status, expiresAt, stampsCount, stampsRequired}`. |
| D11 | Nessun framework di test | Script con ✔/✘ come gli esistenti. |
| D12 | `create-owner.ts` con email + slug, idempotente, `--force` per cambiare ruolo | `scripts/create-owner.ts`. |

---

## 2. Cosa è stato implementato

### 2.1 Migration 3

`drizzle/0003_stamp_events_request_id_not_unique.sql` (SQL letto prima di applicarlo):

```sql
ALTER TABLE "stamp_events" DROP CONSTRAINT "stamp_events_request_id_unique";
CREATE INDEX "stamp_events_request_idx" ON "stamp_events" USING btree ("request_id");
```

Motivo: una richiesta con più tratti (es. 15 prodotti → `stamp 10`, `redeem 1`, `stamp 4`) genera **più eventi con lo stesso `request_id`**. L'unicità resta garantita da `idempotency_key` (`{requestId}:{n}`). La FK composita `(request_id, venue_id)` è rimasta intatta.

Verifica: `scripts/verify-migration-3.sql` → **6/6 OK** (UNIQUE rimosso, indice presente, più eventi con lo stesso `request_id` accettati, `idempotency_key` duplicata rifiutata, FK presente, `request_id` NULL ancora ammesso).

### 2.2 Regola dei timbri (`src/utils/stamps.ts`)

Funzione pura `splitStamps(stampsRequired, currentCount, quantity)` → `{segments, finalCount, rewards}`.

La `quantity` è il **totale dei prodotti consumati, premio compreso**. Il sistema timbra fino alla
soglia, poi spende **una unità** della quantità come prodotto in premio (`redeem`) e timbra il resto:

```
soglia 10, card 0, quantità 15
  prodotti 1-10   → stamp 10     (card piena: premio disponibile)
  prodotto 11     → redeem 1     (gratis, consuma 1 della quantità)
  prodotti 12-15  → stamp 4
  → card 4/10, 1 premio consumato
```

Se la quantità finisce esattamente sulla soglia (es. 10 da 0) la card resta piena (10/10) e il
premio è **disponibile**: verrà consumato al primo prodotto successivo, che sarà gratis
(`confirm` con quantità 1 → solo `redeem`, 0 timbri).

Casi limite gestiti: card già piena (il primo prodotto è gratis), soglia 1, quantità 0, quantità
50 (tetto della conferma, 4 premi), input impossibili (lanciano, non ciclano). La regola vale solo
per `type = "stamps"`: quando arriveranno altri modelli promozionali servirà una funzione per tipo.

### 2.3 Auth staff

- `src/api/venues/membership.service.ts`: ruolo da `venue_members` + locale non archiviato; `venueId` non-UUID → trattato come "non membro" (evita il 22P02 di Postgres).
- `src/api/venues/membership.middleware.ts`: `requireRole("owner","staff")`, montato **dopo** `isAuthenticated` e **prima** di `validate(params)`.
- `GET /api/venues/mine`: locali (non archiviati) in cui l'utente è membro, con il ruolo. Serve al frontend staff per sapere quale `venueId` aprire.

### 2.4 Coda e conferma/rifiuto

- `GET /api/venues/:venueId/requests`: scadenza lazy delle pendenti **del locale**, poi pendenti in ordine di arrivo (max 50). La scadenza si fa qui perché una richiesta senza polling resterebbe `pending` per sempre, occupando coda e indice parziale.
- `POST /api/venues/:venueId/requests/:requestId/confirm`, body `{stamps: 1..50}`. In una transazione: UPDATE condizionata (`pending` + non scaduta) come mutex → lock della card `FOR UPDATE` → verifica che la promozione della card sia quella attiva (409) → `splitStamps` → un `stamp_event` per tratto → `cards.stamps_count` → risposta `{status, stampsCount, stampsRequired, rewards}`.
- `POST /api/venues/:venueId/requests/:requestId/reject`: chiude la richiesta senza toccare la card. Risposta `{status:"rejected"}`.
- Distinzione degli errori: richiesta inesistente o di un altro locale → **404** `RequestNotFound`; esistente ma già conclusa/scaduta → **409**.

### 2.5 Rate limit di `visit`

Ordine: `expirePendingRequest → getPendingRequest (200 se viva, non consuma quota) → checkCardRateLimit → newRequest`.

Il conteggio è in SQL su `stamp_requests` della card nell'ultima ora (tutti gli stati). Superate le 10: **429** con `Retry-After` = secondi mancanti all'uscita della più vecchia dalla finestra. Nessun cooldown: dopo rifiuto o scadenza il cliente può ritoccare subito.

### 2.6 Limiter IP su `/api/auth/email/*`

`src/api/auth/ip-rate-limit.middleware.ts`: 30 richieste / 15 minuti per IP, header draft-7 (`RateLimit`, `RateLimit-Policy`), `Retry-After`, corpo JSON `{error:"TooManyRequests"}`. Montato solo su `request`/`verify` (non su `/me` e `/logout`).

Dipende da `TRUST_PROXY` (nuovo env, default `0`): dietro Cloudflare va messo il numero di hop, mai `true`.

### 2.7 Contratti API aggiornati

| Rotta | Auth | Risposta |
|---|---|---|
| `POST /api/venues/:venueId/visit` | sessione | `201 {state:"card_created", saveUrl, publicCode}` / `201 {state:"request_pending", requestId, expiresAt}` / `200` se pendente viva / `429` + `Retry-After` |
| `GET /api/requests/:requestId` | sessione + ownership | `{status, expiresAt, stampsCount, stampsRequired}` |
| `GET /api/venues/mine` | sessione | `{venues:[{venueId, name, slug, role}]}` |
| `GET /api/venues/:venueId/requests` | owner/staff | `{requests:[{requestId, publicCode, stampsCount, stampsRequired, createdAt, expiresAt}]}` |
| `POST /api/venues/:venueId/requests/:requestId/confirm` | owner/staff | `{status:"approved", stampsCount, stampsRequired, rewards}` |
| `POST /api/venues/:venueId/requests/:requestId/reject` | owner/staff | `{status:"rejected"}` |

Codici di errore: `401` uniforme (`Non autenticato`), `403 Forbidden`, `404 RequestNotFound`, `409 GenericError`, `429 TryLaterFound`, `400 ValidationError`.

---

## 3. Test eseguiti

Comandi (server `npm run dev` acceso, DB di sviluppo):

```bash
npx tsx scripts/stamps-split.ts
npx tsx --env-file=.env scripts/staff-requests.ts
npx tsx --env-file=.env scripts/poll-request.ts
npx tsx --env-file=.env scripts/otp-request.ts
npx tsx --env-file=.env scripts/otp-verify.ts
npx tsx --env-file=.env scripts/session.ts
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-3.sql
```

| Script | Controlli | Esito |
|---|---|---|
| `stamps-split.ts` (nuovo) | 20 | 20/20 ✔ |
| `staff-requests.ts` (nuovo, end-to-end) | 24 | 24/24 ✔ |
| `poll-request.ts` (aggiornato) | 12 | 12/12 ✔ |
| `otp-request.ts` | 13 | 13/13 ✔ |
| `otp-verify.ts` | 16 | 16/16 ✔ |
| `session.ts` | 16 | 16/16 ✔ |
| `verify-migration-3.sql` | 6 | 6/6 OK |
| `npm run typecheck` | — | pulito |

Copertura di `staff-requests.ts`: 401/403 (incluso `venueId` malformato → 403), `/venues/mine` (vuoto, due locali, ruoli, nessuna email), card creata + richiesta pending, contenuto della coda (publicCode, saldo, soglia, nessuna email), isolamento tra locali, conferma quantità 15 (3 eventi `stamp 10 / redeem 1 / stamp 4`, saldo 4, `resolved_by`), polling con saldo, doppia conferma → 409, validazione quantità (0, 51, `"10"`, 1.5, assente), rifiuto, conferma dopo rifiuto, richiesta scaduta, cross-venue → 404, promozione della card non più attiva → 409 con rollback, conferma da un `owner` (quantità 11 → 1 premio), soglia esatta (quantità 10 → card piena 10/10, 0 premi), prodotto successivo su card piena (quantità 1 → solo `redeem`, card 0), card piena + quantità 13 (2 premi, card 1/10), rate limit (11ª → 429 con `Retry-After`, ritocco su pendente viva → 200 senza consumare quota).

Limiter IP verificato a mano con un secondo processo (`PORT=3001 IP_RATE_LIMIT=on`): 30 risposte `202`, poi `429` con `RateLimit-Policy: 30;w=900`, `RateLimit: limit=30, remaining=0` e `Retry-After: 899`. Con il server di sviluppo (`IP_RATE_LIMIT` assente) nessun limite, come richiesto.

`create-owner.ts` provato su un utente temporaneo (poi rimosso): creazione owner, seconda esecuzione idempotente, utente inesistente → errore, locale inesistente → errore, membro `staff` senza `--force` → errore, con `--force` → promozione, utente anonimizzato → errore.

---

## 4. Bug e scelte non discusse

### B1 — L'handler generico mandava in crash il server su errori non previsti (bug reale, corretto)

**Problema trovato.** Un `ZodError` (branding di un locale) non è un `GenericError` e non ha `statusCode`: `genericErrorHandler` faceva `res.status(undefined)`, Express lanciava a sua volta e il client riceveva una **pagina HTML 500** invece del JSON del contratto. Qualsiasi errore imprevisto (Zod, driver, `TypeError`) aveva lo stesso comportamento.

**Scelta.** In `src/errors/generic.ts`: se l'errore non è un `GenericError` (o non ha uno status intero) rispondo `500 {error:"InternalServerError", message:"Errore interno"}`, con lo stack solo nei log.

**Alternative.** (a) Lasciare com'è: zero lavoro, ma ogni errore imprevisto rompe il contratto JSON e nasconde la causa dietro un errore di Express. (b) Rispondere 500 usando `err.message`: comodo in debug, ma espone dettagli interni al client. (c) Aggiungere un handler dedicato agli errori Zod (400): utile, ma non copre driver/`TypeError` e va deciso cosa mostrare all'utente. Scelta (b) scartata per non far uscire dettagli; (c) rimandata.

**Pro/contro della scelta:** contratto JSON sempre rispettato e nessun leak, ma si perde il dettaglio dello status per errori che *hanno* uno status "di libreria" (es. `SyntaxError` di body-parser con `status: 400`), che oggi diventa 500.

### B2 — Dato di sviluppo non conforme allo schema del branding (corretto sui dati, non sul codice)

**Problema.** Il locale `chessa-s.r.l.` aveva `branding.banner` invece di `bannerUrl`: lo schema (`.strict()`) lo rifiuta, quindi `visit` su quel locale dava 500. È un dato vecchio, non un errore di codice: `seed.ts` scrive già `bannerUrl`.

**Scelta.** Correzione del dato in sviluppo (`banner` → `bannerUrl`), nessuna modifica allo schema.

**Alternative.** (a) Ammettere `banner` nello schema: nasconde per sempre un errore di battitura e allarga il contratto per un dato sbagliato. (b) Migrazione dati: ha senso solo se il dato esiste in staging/produzione, che non esistono ancora. (c) Lasciare il dato rotto e scegliere nei test solo locali validi: il 500 resterebbe in agguato al primo locale reale.

### B3 — Contratto del polling cambiato: aggiornato il test esistente

`scripts/poll-request.ts` asseriva `body = {status, expiresAt}`. Con D10 il body ha 4 campi: l'asserzione ora verifica esattamente `{status, expiresAt, stampsCount, stampsRequired}` più i valori. Non è un bug, è la conseguenza voluta della decisione.

### B4 — Un fallimento isolato del test di concorrenza degli OTP (osservazione, nessuna modifica)

Nella prima esecuzione completa della suite, `otp-request.ts` ha fallito il solo caso "5 richieste simultanee → una 202, le altre 429, zero 500". Non ho il dettaglio (non avevo salvato il log) e **non è più riprodotto**: 4 esecuzioni successive, tutte 13/13. L'esecuzione incriminata è partita subito dopo un riavvio di nodemon (avevo appena modificato `src/errors/generic.ts`), quindi l'ipotesi più probabile è una connessione interrotta dal riavvio, non una corsa nel codice: il caso "due inserimenti simultanei" è già coperto dall'indice unico parziale e l'errore `23505` viene mappato su 429 in `otp.service.ts`. Da riprovare se ricapita; non ho cambiato nulla.

### B5 — `stamps` non viene convertito da stringa

`{stamps:"10"}` → **400**. La conversione implicita (`Number("")` vale 0) è una fonte classica di quantità sbagliate in un'operazione che scrive sul DB. Il frontend deve mandare un numero.

### B6 — Endpoint in più: `GET /api/venues/mine`

Non era nel piano approvato. Serve perché il `venueId` sta nell'URL ma l'utente può essere membro di più locali: senza questa rotta il frontend staff non sa quale locale aprire dopo il login. Alternativa: ricavare i locali da `/api/auth/me` (che però non deve crescere di ruoli, decisione chiusa) oppure passare il locale dalla query string (fragile). Scelto l'endpoint dedicato, in sola lettura, che restituisce anche il ruolo.

### B7 — Due tetti scelti da me

- `MAX_STAMPS_PER_CONFIRM = 50`: copre un tavolo grande ed evita che un errore di digitazione (500 invece di 50) sblocchi premi a raffica.
- `promotions.config.stampsRequired` massimo **100** nello schema zod: oltre non ha senso per un locale e protegge il ciclo di `splitStamps` da valori assurdi. Entrambi modificabili in un punto solo.

### B8 — Card piena (10/10) è uno stato normale: "premio disponibile"

Con la regola corretta (quantità = prodotti totali) la card **può** restare a `stampsRequired`: significa
che il cliente ha maturato il premio e non l'ha ancora consumato. Il prodotto successivo è gratis
(`confirm` con quantità 1 → solo `redeem`, card 0). Il vecchio dato `stamps_count = stampsRequired`
non è più un caso da riparare: è lo stato che il sistema produce. Alternativa scartata: azzerare la
card alla soglia (perdeva il premio se la quantità finiva esattamente lì) o rifiutare la conferma su
card piena (avrebbe bloccato il cliente).

### B9 — Il premio lo vede solo lo staff

`rewards` (numero di premi **consumati** in quella conferma) compare solo nella risposta di `confirm`;
il polling del cliente espone solo il saldo (D6: "si può pensare di farlo vedere anche al cliente ma
troppo per adesso"). Il frontend staff deve mostrare "premio applicato" quando `rewards > 0`,
altrimenti l'operatore non sa che uno dei prodotti consumati era gratis.

### B10 — Il conteggio del rate limit include tutti gli stati

Il limite di 10/ora conta anche richieste `approved`/`rejected`/`expired`: sono arrivi reali in negozio e contarli è coerente con "quante volte questa card ha chiesto un timbro nell'ora". Non c'è un limite separato per IP su `visit` (non deciso).

---

## 5. Punti aperti

1. ~~**Documentazione da allineare**~~ **fatta il 27/10**: `stampy_db_schema.md` (migration 3, eventi multipli, `stamps_count` che può valere la soglia), `progress.md` (§2.10), `CODEBASE_CONTEXT.md`, `stampy_contesto_progetto.md` (§3, §4.4, §4.11, §5, §6) e nuovo `Stampy_Handoff_Fase_4d.md` (il 4c è marcato superato).
2. **Aggiornamento del pass Google** dopo la conferma (Fase 4e): oggi il Wallet mostra il saldo vecchio; la pagina web del cliente è corretta perché il polling legge il DB.
3. **Frontend staff**: coda con polling, **stepper della quantità di prodotti** (non dei timbri), avviso "premio applicato" quando `rewards > 0`.
4. **Rate limit di `visit` per IP**: non deciso; oggi solo per card.
5. **`TryLaterError`** ha `name = "TryLaterFound"` e messaggio inglese (`Try again later`): cosmetico, non toccato, ma il client vede quel testo.
6. **`TRUST_PROXY`** va impostato al primo deploy di staging (dietro Cloudflare), altrimenti il limiter IP mette tutti gli utenti nello stesso secchio.
7. **`logger: true`** in `src/db/index.ts` stampa query e parametri: da togliere prima del deploy.
8. **Retention/anonimizzazione** di `otp_challenges` e `auth_events`: rimandate a prima del primo utente reale.

---

## 6. File toccati

**Nuovi**

| File | Ruolo |
|---|---|
| `src/utils/stamps.ts` | `splitStamps`, regola dei timbri |
| `src/utils/schemas/promotion-config.schema.ts` | validazione di `promotions.config` |
| `src/api/venues/membership.service.ts` | ruolo da `venue_members`, locali dell'utente |
| `src/api/venues/membership.middleware.ts` | `requireRole` |
| `src/api/venues/staff.controller.ts` / `staff.dto.ts` | coda, confirm, reject |
| `src/api/requests/resolve.service.ts` | transazione di conferma/rifiuto |
| `src/api/auth/ip-rate-limit.middleware.ts` | limiter IP su `/auth/email/*` |
| `src/errors/forbidden.error.ts` | `ForbiddenError` + handler (403) |
| `drizzle/0003_stamp_events_request_id_not_unique.sql` | migration 3 |
| `scripts/stamps-split.ts` | 20 controlli sulla funzione pura |
| `scripts/staff-requests.ts` | 24 controlli end-to-end |
| `scripts/verify-migration-3.sql` | 6 controlli sulla migration |
| `scripts/create-owner.ts` | primo `owner` di un locale |

**Modificati**: `src/db/schema.ts` (indice su `request_id`), `src/api/requests/requests.service.ts` (rate limit, coda, polling con saldo, `refreshStatus` → boolean), `src/api/requests/requests.controller.ts` (4 campi), `src/api/venues/venues.controller.ts` (`visit` con rate limit, `mine`), `src/api/venues/venues.router.ts` (rotte staff, ordine middleware), `src/api/auth/email/email.router.ts` (limiter), `src/config/env.ts` (`TRUST_PROXY`, `IP_RATE_LIMIT`), `src/app.ts` (`trust proxy`), `src/errors/generic.ts` (B1), `src/errors/index.ts`, `src/utils/types/enum.ts` (`MemberRole`), `scripts/poll-request.ts` (contratto a 4 campi), `package.json` (`express-rate-limit` 8.7.1).

---

## 7. Correzione della regola dei timbri (27/10/2026, dopo la prima consegna)

**Cosa era sbagliato.** La prima implementazione trattava la quantità come "numero di timbri da
registrare" e contava il prodotto in premio **fuori** dalla quantità: 15 prodotti da 0 davano
`stamp 10 → redeem 1 → stamp 5` → card **5/10**. Due conseguenze sbagliate:

1. il prodotto gratis non veniva scalato dalla quantità (15 prodotti diventavano 15 timbri + 1 premio);
2. se la quantità finiva esattamente sulla soglia (10 da 0) la card veniva azzerata con un `redeem`
   che **consumava un premio mai erogato**, perdendo il premio.

**La regola corretta** (già descritta in `stampy_contesto_progetto.md` §4.4 passo 7: "15 prodotti →
10 timbri, 1 premio (redeem), 4 timbri → card 4/10"): la quantità è il **totale dei prodotti consumati,
premio compreso**. Il prodotto in premio consuma una unità della quantità e non è un timbro.

**Cosa è cambiato.**

- `src/utils/stamps.ts`: `splitStamps` spende una unità di quantità per ogni `redeem`; il parametro si
  chiama `quantity` (non più `stampsToAdd`); `finalCount` può valere `stampsRequired` (card piena =
  premio disponibile).
- `scripts/stamps-split.ts`: 20 controlli, invariante `timbri + premi = quantità` e
  "card piena solo se il premio non è stato consumato".
- `scripts/staff-requests.ts`: 24 controlli, con i tre nuovi flussi end-to-end: soglia esatta
  (quantità 10 → card 10/10, 0 premi), prodotto successivo su card piena (quantità 1 → solo `redeem`,
  card 0), card piena + quantità 13 (2 premi, card 1/10).
- Commenti di `staff.dto.ts`, `staff.controller.ts`, `resolve.service.ts`.

**Conseguenze sul contratto (da tenere presenti nel frontend).**

- `confirm` risponde `stampsCount` in `[0, stampsRequired]`: se vale `stampsRequired` la card è piena e
  il premio è disponibile, non ancora consumato.
- `rewards` è il numero di premi **consumati** in quella conferma (0 = nessun prodotto gratis in quel
  conto), non "premi sbloccati".
- Il campo body `stamps` resta quello approvato in fase 4d, ma il valore è la **quantità totale di
  prodotti**, premio compreso: è documentato nel DTO.
- Vale solo per `type = "stamps"`; altri modelli promozionali avranno la loro funzione.
