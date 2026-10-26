# Stampy — Schema database

> Documento vivo. Stato attuale: **Migration 2 chiusa** (`0000_init`, `0001_promotions_no_overlap`, `0002_auth_foundation`; se il nome del file in `drizzle/` differisce, vince il file).
> Prossima migration: **3** (togliere UNIQUE da `stamp_events.request_id`, vedi §5.7 e §8). Una migration per modifica. Aggiornare questo file a ogni migration, non riscriverlo da zero.
> Ultimo aggiornamento: 24 ottobre 2026.
> Fonte di verità del codice: `src/db/schema.ts`. Se questo file lo contraddice, vince il codice.

---

## 0. Come leggere le sezioni delle tabelle

Ogni tabella (§5) ha: una tabella delle colonne e poi i **vincoli**. Per ogni vincolo: il **codice** (Drizzle, come in `schema.ts`), **in parole**, un **esempio** breve, il **perché** e lo **stato** del test.

- Etichette di stato: `VERIFICATO` = provato sul DB reale (data); `NON TESTATO` = scritto ma mai provato esplicitamente.
- I vincoli scritti a mano nelle migration non sono in `schema.ts`: sono segnalati come tali.
- "Violazione" = il database rifiuta l'operazione con un errore; nessun dato viene scritto.

---

## 1. Ambiente di sviluppo

| Voce | Valore |
|---|---|
| Container Docker | `stampy-db` |
| Utente | `stampy` |
| Database | `stampy_dev` |
| Versione | PostgreSQL 16.15 |
| Porta | 5432 (verificare il mapping in `docker ps`) |
| Password | in `.env` (`DATABASE_URL`), **mai in questo file né in Git** |
| ORM / migration | Drizzle (`drizzle-orm` + `drizzle-kit`) |
| Config drizzle | `src/drizzle.config.ts` |
| Schema TypeScript | `src/db/schema.ts` |
| Migration | cartella `drizzle/` |

Comandi utili:

```bash
# shell SQL nel container
docker exec -it stampy-db psql -U stampy -d stampy_dev

# elenco tabelle / dettaglio tabella
docker exec -it stampy-db psql -U stampy -d stampy_dev -c '\dt'
docker exec -it stampy-db psql -U stampy -d stampy_dev -c '\d nome_tabella'

# genera migration da schema.ts
npx drizzle-kit generate --config=src/drizzle.config.ts --name=NOME

# migration vuota per SQL custom
npx drizzle-kit generate --config=src/drizzle.config.ts --custom --name=NOME

# applica le migration
node --env-file=.env ./node_modules/.bin/drizzle-kit migrate --config=src/drizzle.config.ts

# esegue uno script SQL di verifica (tutto in transazione, termina con ROLLBACK)
docker exec -i stampy-db psql -U stampy -d stampy_dev < scripts/verify-migration-2.sql
```

Mai `push` né `introspect`: i vincoli scritti a mano (es. `promotions_no_overlap`) non sono in `schema.ts`. **Prima di applicare una migration generata, leggere sempre il file SQL** (ordine dei DROP, vincoli presenti, nessuna riga che tocchi `promotions_no_overlap` o `btree_gist`).

---

## 2. Convenzioni

- **Chiavi primarie**: UUID (`gen_random_uuid()`, v4). Possibile passaggio a UUID v7 in futuro.
- **Timestamp**: sempre `timestamptz`, con `created_at` default `now()`.
- **FK**: sempre `ON DELETE RESTRICT`, mai `CASCADE` (i log sono immutabili). Esempio: non si può cancellare un utente che ha una card; per questo gli utenti si anonimizzano.
- **Nomi dei vincoli**: `_uq` (unique), `_ck` (check), `_idx` (indice).
- **Multi-tenant**: ogni tabella figlia porta `venue_id`; le FK composite `(id, venue_id)` impediscono incoerenze tra locali.
- **Email** (`users.email`, identità, destinatari OTP): sempre **minuscola e senza spazi ai bordi**, imposto dal DB con un CHECK. Nessuna altra normalizzazione (niente rimozione di punti o `+alias` di Gmail: cambierebbe l'indirizzo reale).
- **Telefono**: **fuori dal database** dalla migration 2. Tornerà come identità (`provider = phone`, canale OTP `sms`) se e quando verrà implementato; normalizzare con `libphonenumber-js` prima dell'insert.
- **Segreti mai in chiaro**: il codice OTP si salva come HMAC (con segreto del server), il token di sessione come SHA-256 (ha già alta entropia). Il database da solo non permette di ricostruirli.
- **JSONB** (`config`, `branding`, `auth_events.metadata`): validare con zod in ingresso e salvare una versione (`"v": 1`) dove ha senso.
- **Anonimizzazione** al posto della cancellazione degli utenti (GDPR): vedi §6.
- **Scadenza lazy**: la verità sulle richieste è `expires_at`, non `status`. Chi legge riporta a `expired` le pendenti scadute (`WHERE status = 'pending' AND expires_at <= now()`); mai toccare richieste già `approved` o `rejected`.

---

## 3. Enum

| Enum | Valori |
|---|---|
| `member_role` | `owner`, `staff` |
| `promotion_type` | `stamps` |
| `wallet_provider` | `google`, `apple` |
| `wallet_status` | `not_added`, `active`, `removed` |
| `request_status` | `pending`, `approved`, `rejected`, `expired` |
| `event_type` | `stamp`, `redeem` |
| `identity_provider` | `email`, `google` (in futuro `apple`, `phone`) |
| `otp_channel` | `email` (in futuro `sms`) |
| `auth_event_type` | `otp_sent`, `otp_send_blocked`, `otp_failed`, `otp_verified`, `login_success`, `identity_linked`, `google_untrusted_email_rejected`, `logout`, `session_revoked` |

Aggiungere un valore a un enum è una migration semplice (`ALTER TYPE ... ADD VALUE`); toglierlo no. Per questo si mettono solo i valori usati.

---

## 4. Diagramma relazioni

```text
users ──< auth_identities
  │ ──< sessions
  │ ──< auth_events            (user_id nullable: NULL = utente sconosciuto)
  │
  ├──< venue_members >── venues
  │                        │
  │                        ├──< promotions
  │                        │
  └──< cards >─────────────┘
          │   (card → promotion, stesso venue)
          ├──< stamp_requests
          └──< stamp_events (→ promotion, → stamp_request opzionale, → operator=users)

otp_challenges   (nessuna FK: il destinatario può non essere ancora un utente)
```

---

## 5. Tabelle

### 5.1 `users`

La persona. Non contiene più il telefono: l'identificazione passa dalle identità (§5.8).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | nullable, UNIQUE; valorizzata **solo dopo prova di possesso** (codice OTP o IdP autorevole) |
| `display_name` | text | |
| `is_platform_admin` | boolean | NOT NULL, default `false` |
| `anonymized_at` | timestamptz | valorizzato = utente anonimizzato |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Vincoli**

**`users_email_uq`** — `VERIFICATO 24/10 (test 01, 02)`
```ts
unique("users_email_uq").on(t.email)
```
- *In parole:* la stessa email non può comparire due volte. Il valore vuoto (NULL) non conta: più utenti possono non avere email.
- *Esempio:* se `mario@x.it` appartiene già a un utente, un secondo utente con la stessa email viene rifiutato. Due utenti con email NULL convivono.
- *Perché:* è la garanzia, a livello database, di un account per email verificata. Se Google e il codice via email arrivano nello stesso istante con la stessa email, il database lascia passare solo il primo; il secondo deve passare dal collegamento invece di creare un duplicato. Un controllo solo applicativo non reggerebbe a due richieste simultanee.

**`users_email_normalized_ck`** — `VERIFICATO 24/10 (test 03, 04)`
```ts
check("users_email_normalized_ck", sql`${t.email} = lower(btrim(${t.email}))`)
```
- *In parole:* l'email deve essere già in minuscolo e senza spazi all'inizio o alla fine. Il NULL passa (il confronto con NULL non è mai "falso").
- *Esempio:* `Mario@X.it` e ` mario@x.it` vengono rifiutate; `mario@x.it` passa.
- *Perché:* senza questo, `Mario@x.it` e `mario@x.it` sarebbero due email diverse per il vincolo UNIQUE, cioè due account per la stessa persona. Il codice normalizza prima dell'insert; il CHECK è la rete di sicurezza se qualcuno dimentica.

**Non garantito dal DB:** ogni utente non anonimizzato deve avere almeno una riga in `auth_identities`. Lo controlla l'applicazione.

---

### 5.2 `venues`

I locali (i "tenant").

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | NOT NULL |
| `slug` | text | NOT NULL, UNIQUE |
| `branding` | jsonb | NOT NULL, default `{}` (il codice richiede `{v:1, logoUrl, backgroundColor, bannerUrl?}`: `{}` oggi fa fallire la creazione card, punto 14) |
| `archived_at` | timestamptz | soft delete (nessun dato personale) |
| `created_at` | timestamptz | NOT NULL |

**Vincoli**

**`slug` UNIQUE** — `NON TESTATO`
```ts
slug: text("slug").notNull().unique()
```
- *In parole:* due locali non possono avere lo stesso slug.
- *Esempio:* se esiste `pizzeria-da-mario`, creare un secondo locale con lo stesso slug fallisce.
- *Perché:* lo slug è il nome leggibile che identifica un locale; un duplicato renderebbe ambiguo il riferimento.

**`branding` default `{}`** — non è un vincolo, ma ha una conseguenza: il database accetta `{}`, il codice no (zod strict). Il controllo vero è applicativo.

**Archiviazione:** un locale si archivia (`archived_at`), non si cancella: le card e i log restano coerenti.

---

### 5.3 `venue_members`

Lega staff e gestori ai locali (ruolo per locale). Il seed non crea righe: serve un modo per creare il primo `owner` (decisione Fase 4).

| Colonna | Tipo | Note |
|---|---|---|
| `user_id` | uuid | FK → `users.id` RESTRICT |
| `venue_id` | uuid | FK → `venues.id` RESTRICT |
| `role` | member_role | NOT NULL |
| `created_at` | timestamptz | NOT NULL |

**Vincoli**

**Chiave primaria composta `(user_id, venue_id)`** — `NON TESTATO`
```ts
primaryKey({ columns: [t.userId, t.venueId] })
```
- *In parole:* una persona può avere una sola riga per locale (con un solo ruolo), ma può lavorare in più locali.
- *Esempio:* Anna è `owner` del locale A e `staff` del locale B: due righe valide. Anna `owner` e poi `staff` nello stesso locale A: la seconda riga è rifiutata.
- *Perché:* evita ruoli contraddittori per la stessa persona nello stesso locale.

**FK `user_id` e `venue_id` con RESTRICT** — `NON TESTATO`
```ts
.references(() => users.id, { onDelete: "restrict" })
.references(() => venues.id, { onDelete: "restrict" })
```
- *In parole:* l'utente e il locale devono esistere; e non si possono cancellare finché hanno membri collegati.
- *Esempio:* inserire un membro con un `venue_id` inventato fallisce; cancellare un locale che ha uno staff fallisce.
- *Perché:* nessun dato orfano e nessuna cancellazione silenziosa a cascata.

**`venue_members_venue_idx`** — indice su `venue_id`, non un vincolo: rende veloce "chi lavora in questo locale?".

---

### 5.4 `promotions`

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `venue_id` | uuid | FK → `venues.id` RESTRICT |
| `type` | promotion_type | NOT NULL |
| `name` | text | NOT NULL |
| `config` | jsonb | NOT NULL, es. `{"v":1,"stampsRequired":10,"reward":"Caffè gratis"}` |
| `starts_at` | timestamptz | NOT NULL |
| `ends_at` | timestamptz | NULL = senza scadenza |
| `created_at` | timestamptz | NOT NULL |

**Vincoli**

**`promotions_id_venue_uq`** — `VERIFICATO 29/09 (indirettamente, tramite le FK composite)`
```ts
unique("promotions_id_venue_uq").on(t.id, t.venueId)
```
- *In parole:* la coppia (id promozione, id locale) è unica. L'`id` da solo lo è già: la coppia serve come "bersaglio" per le FK composite.
- *Esempio:* `cards` può dire "questa card punta alla promozione X **del locale Y**" solo se esiste la coppia (X, Y) da referenziare.
- *Perché:* è il pezzo che permette di impedire incoerenze tra locali (vedi `cards` §5.5).

**`promotions_dates_ck`** — `NON TESTATO`
```ts
check("promotions_dates_ck", sql`${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`)
```
- *In parole:* la fine, se c'è, deve essere dopo l'inizio.
- *Esempio:* inizio 1 gennaio, fine 31 dicembre: ok. Fine prima dell'inizio, o uguale: rifiutata. Fine NULL: ok (senza scadenza).
- *Perché:* un intervallo di date al contrario o vuoto non ha senso e confonderebbe la ricerca della promozione attiva.

**`promotions_no_overlap`** — **scritto a mano nella migration 0001, non in `schema.ts`** — `VERIFICATO 29/09 e 24/10 (test 18: ancora presente)`
```sql
-- forma indicativa: il testo esatto è in drizzle/0001_promotions_no_overlap.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE promotions ADD CONSTRAINT promotions_no_overlap
  EXCLUDE USING gist (venue_id WITH =, tstzrange(starts_at, ends_at) WITH &&);
```
- *In parole:* per lo stesso locale, due promozioni non possono avere periodi che si sovrappongono. L'intervallo include l'inizio ed esclude la fine.
- *Esempio:* A dal 1 gennaio al 1 luglio. B che parte il 1 luglio: ok (la fine di A non conta). C che parte il 15 giugno: rifiutata. Una promozione senza fine (`ends_at` NULL) occupa il locale per sempre: nessuna promozione successiva è possibile finché non le si imposta una fine.
- *Perché:* una sola promozione attiva per locale, garantita dal database. Drizzle non sa esprimere questo vincolo: per questo si usano sempre `generate` + `migrate`, mai `push`, che lo cancellerebbe.

**FK `venue_id` → `venues` RESTRICT** — non si può creare una promozione per un locale inesistente né cancellare un locale con promozioni.

---

### 5.5 `cards`

Una riga = una card nel Wallet. La card è la relazione cliente ↔ locale e non scade con la promozione.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` RESTRICT |
| `venue_id` | uuid | FK → `venues.id` RESTRICT |
| `promotion_id` | uuid | promozione corrente della card |
| `stamps_count` | integer | NOT NULL, default 0, denormalizzato |
| `public_code` | text | NOT NULL, UNIQUE, codice leggibile |
| `wallet_provider` | wallet_provider | NOT NULL |
| `wallet_object_id` | text | NOT NULL, UNIQUE (ID object Google) |
| `wallet_status` | wallet_status | NOT NULL, default `not_added` (oggi mai letto né aggiornato) |
| `created_at` | timestamptz | NOT NULL |

**Vincoli**

**`cards_user_venue_uq`** — `VERIFICATO 29/09`
```ts
unique("cards_user_venue_uq").on(t.userId, t.venueId)
```
- *In parole:* una persona può avere una sola card per locale.
- *Esempio:* Mario ha una card alla "Pizzeria A": una seconda per lo stesso locale è rifiutata; una card alla "Pizzeria B" è ok.
- *Perché:* è la regola di prodotto "una card per persona per locale", garantita anche se il tocco del tag arriva due volte in parallelo (`addOrGetCard` usa `ON CONFLICT` su questo vincolo).

**`cards_id_venue_uq`** — `VERIFICATO (indirettamente, tramite le FK composite di `stamp_requests`)`
```ts
unique("cards_id_venue_uq").on(t.id, t.venueId)
```
- *In parole:* la coppia (id card, id locale) è unica, come bersaglio per le FK composite.
- *Perché:* stesso motivo di `promotions_id_venue_uq`: permette a `stamp_requests` e `stamp_events` di dire "questa card **di questo locale**".

**FK composita `(promotion_id, venue_id)` → `promotions(id, venue_id)`** — `VERIFICATO 29/09`
```ts
foreignKey({ columns: [t.promotionId, t.venueId], foreignColumns: [promotions.id, promotions.venueId] })
  .onDelete("restrict")
```
- *In parole:* la promozione della card deve esistere **ed essere dello stesso locale della card**.
- *Esempio:* una card del locale A che punta a una promozione del locale B viene rifiutata, anche se la promozione B esiste.
- *Perché:* isolamento multi-tenant a livello di database: nessun errore del codice può mescolare dati di locali diversi.

**FK `venue_id` → `venues` e `user_id` → `users`, RESTRICT** — locale e utente devono esistere e non si cancellano finché hanno card.
```ts
foreignKey({ columns: [t.venueId], foreignColumns: [venues.id] }).onDelete("restrict")
```

**`cards_stamps_ck`** — `VERIFICATO 29/09`
```ts
check("cards_stamps_ck", sql`${t.stampsCount} >= 0`)
```
- *In parole:* i timbri non possono essere negativi.
- *Esempio:* un `UPDATE` che porta `stamps_count` da 1 a -2 fallisce.
- *Perché:* se un bug sottrae troppo, il database si rifiuta di salvare un valore impossibile.

**`public_code` UNIQUE e `wallet_object_id` UNIQUE** — `NON TESTATO esplicitamente`
```ts
publicCode: text("public_code").notNull().unique(),
walletObjectId: text("wallet_object_id").notNull().unique(),
```
- *In parole:* nessuna card può avere lo stesso codice leggibile o lo stesso ID object del Wallet di un'altra.
- *Perché:* il codice è quello nel QR del pass e l'ID object è l'identità della card dentro Google: due card uguali sarebbero ambigue. Il codice non ha retry su collisione (23505): debito noto.

---

### 5.6 `stamp_requests`

Coda effimera e mutabile delle richieste in attesa di conferma staff.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `card_id` | uuid | |
| `venue_id` | uuid | |
| `status` | request_status | NOT NULL, default `pending` |
| `created_at` | timestamptz | NOT NULL |
| `expires_at` | timestamptz | NOT NULL (timeout 3 min, calcolato dal DB con `now() + interval '3 minutes'`) |
| `resolved_at` | timestamptz | per `expired` oggi è il momento della lettura che ha rilevato la scadenza, non `expires_at` |
| `resolved_by` | uuid | FK → `users.id` RESTRICT |

**Vincoli**

**`stamp_requests_id_venue_uq`** — `NON TESTATO esplicitamente`
```ts
unique("stamp_requests_id_venue_uq").on(t.id, t.venueId)
```
- *In parole / perché:* coppia (id richiesta, id locale) unica, bersaglio della FK composita di `stamp_events`.

**FK composita `(card_id, venue_id)` → `cards(id, venue_id)`** — `NON TESTATO esplicitamente`
```ts
foreignKey({ columns: [t.cardId, t.venueId], foreignColumns: [cards.id, cards.venueId] }).onDelete("restrict")
```
- *In parole:* la richiesta deve riferirsi a una card esistente **e al locale di quella card**.
- *Esempio:* una richiesta con `card_id` della card di A e `venue_id` di B viene rifiutata.
- *Perché:* una richiesta non può finire nella coda del locale sbagliato.

**`stamp_requests_one_pending_uq`** — indice UNIQUE **parziale** — `VERIFICATO 29/09 e 23-24/10 (race con due visit paralleli)`
```ts
uniqueIndex("stamp_requests_one_pending_uq")
  .on(t.cardId)
  .where(sql`${t.status} = 'pending'`)
```
- *In parole:* per ogni card può esistere **una sola richiesta in stato `pending`**. Le richieste già concluse (`approved`, `rejected`, `expired`) non contano e possono essere quante si vuole.
- *Esempio:* Mario tocca il tag due volte di fila: il secondo `INSERT` non crea niente (`ON CONFLICT ("card_id") WHERE status = 'pending' DO NOTHING`) e il codice restituisce la richiesta già pendente. Dopo un rifiuto o una scadenza può rifare il tocco.
- *Perché:* evita doppioni in coda allo staff anche con due richieste simultanee: la verità sta nel database, non in un controllo del codice.

**`stamp_requests_queue_idx`** — indice parziale `(venue_id, created_at)` WHERE `status = 'pending'`. Non è un vincolo: serve a mostrare velocemente allo staff le pendenti di un locale in ordine di arrivo.

**FK `resolved_by` → `users` RESTRICT** — chi risolve la richiesta deve essere un utente esistente (NULL finché è pendente).

---

### 5.7 `stamp_events`

Log immutabile delle operazioni confermate. Fonte di verità; `cards.stamps_count` è denormalizzato.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `card_id` | uuid | |
| `venue_id` | uuid | |
| `promotion_id` | uuid | promozione al momento dell'evento |
| `operator_id` | uuid | FK → `users.id` RESTRICT (chi ha confermato) |
| `request_id` | uuid | nullable; **oggi UNIQUE, da togliere (migration 3)**: una richiesta genera più eventi (uno per tratto) |
| `type` | event_type | NOT NULL (`stamp` / `redeem`) |
| `quantity` | integer | NOT NULL, default 1 |
| `idempotency_key` | text | NOT NULL, UNIQUE; con la quantità "B" avrà forma `{requestId}:{n}` |
| `created_at` | timestamptz | NOT NULL |

**Vincoli**

**`idempotency_key` UNIQUE** — `VERIFICATO 29/09`
```ts
idempotencyKey: text("idempotency_key").notNull().unique()
```
- *In parole:* la stessa chiave non può essere usata due volte.
- *Esempio:* lo staff preme "conferma" due volte, o la rete ripete la richiesta: il secondo evento con chiave `{requestId}:1` è rifiutato, quindi non si assegnano timbri doppi.
- *Perché:* idempotenza garantita dal database, non dalla speranza che il client non ripeta.

**`request_id` UNIQUE** — `NON TESTATO` — **da rimuovere con la migration 3**
```ts
requestId: uuid("request_id").unique()
```
- *In parole:* oggi una richiesta può generare un solo evento.
- *Perché va tolto:* con la quantità "B" una richiesta genera più eventi (es. 15 prodotti → `stamp` ×10, `redeem` ×1, `stamp` ×4). Dopo la migration resta un indice normale (non unique).

**FK composita `(card_id, venue_id)` → `cards`; `(promotion_id, venue_id)` → `promotions`; `(request_id, venue_id)` → `stamp_requests`** — `NON TESTATO esplicitamente`
```ts
foreignKey({ columns: [t.cardId, t.venueId], foreignColumns: [cards.id, cards.venueId] }).onDelete("restrict"),
foreignKey({ columns: [t.promotionId, t.venueId], foreignColumns: [promotions.id, promotions.venueId] }).onDelete("restrict"),
foreignKey({ columns: [t.requestId, t.venueId], foreignColumns: [stampRequests.id, stampRequests.venueId] }).onDelete("restrict"),
```
- *In parole:* card, promozione e richiesta di un evento devono esistere e appartenere **tutte allo stesso locale**.
- *Esempio:* un evento del locale A che cita una richiesta del locale B è rifiutato.
- *Nota:* in PostgreSQL una FK composita con una colonna NULL non viene controllata. È il motivo per cui `request_id` può essere NULL (evento senza richiesta) senza violare la FK.
- *Perché:* un evento non può mescolare dati di locali diversi.

**`stamp_events_qty_ck`** — `NON TESTATO`
```ts
check("stamp_events_qty_ck", sql`${t.quantity} > 0`)
```
- *In parole:* la quantità di un evento è almeno 1.
- *Perché:* un evento da 0 o negativo non ha senso e falserebbe il saldo.

**FK `operator_id` → `users` RESTRICT** — l'operatore che conferma è un utente esistente e non si cancella: resta la tracciabilità di chi ha fatto cosa.

**`stamp_events_card_idx`** — indice `(card_id, created_at)`, non un vincolo: rende veloce lo storico di una card.

---

### 5.8 `auth_identities`

Come una persona dimostra di essere se stessa. Un utente può avere più identità (email, Google; in futuro Apple, telefono). Le identità non si cancellano a mano: si eliminano solo con l'anonimizzazione.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` RESTRICT |
| `provider` | identity_provider | NOT NULL (`email`, `google`) |
| `provider_user_id` | text | NOT NULL; per `email` l'email normalizzata, per `google` il claim `sub` (identificativo permanente dell'account Google) |
| `email_at_provider` | text | nullable; l'email dichiarata dal provider al login, normalizzata; solo informativa |
| `created_at` | timestamptz | NOT NULL |
| `last_used_at` | timestamptz | nullable |

**Vincoli**

**`auth_identities_provider_uq`** — `VERIFICATO 24/10 (test 05)`
```ts
unique("auth_identities_provider_uq").on(t.provider, t.providerUserId)
```
- *In parole:* la stessa identità presso lo stesso provider non può appartenere a due utenti.
- *Esempio:* se l'account Google con `sub` 1101… è già collegato all'utente A, collegarlo all'utente B è rifiutato.
- *Perché:* un account Google o un'email corrisponde a una sola persona. La chiave è `(provider, sub)`, non l'email: Google avverte che l'email può cambiare, il `sub` no.

**`auth_identities_user_provider_uq`** — `VERIFICATO 24/10 (test 06)`
```ts
unique("auth_identities_user_provider_uq").on(t.userId, t.provider)
```
- *In parole:* un utente ha al massimo un'identità per tipo di provider: una email e un Google.
- *Esempio:* l'utente A ha già un'identità `email`: aggiungerne una seconda `email` è rifiutato.
- *Perché:* semplicità per l'MVP e meno ambiguità nel collegamento. **Si può togliere in futuro** se serviranno più email o più account Google per lo stesso utente.

**`auth_identities_email_normalized_ck`** — `VERIFICATO 24/10 (test 07, 08)`
```ts
check("auth_identities_email_normalized_ck",
  sql`${t.provider} <> 'email' OR ${t.providerUserId} = lower(btrim(${t.providerUserId}))`)
```
- *In parole:* se il provider è `email`, l'identificativo deve essere minuscolo e senza spazi. Per Google non si controlla niente.
- *Esempio:* identità `email` con `B@test.it` rifiutata. Identità `google` con `sub` `AbC123` accettata.
- *Perché:* il `sub` di Google va conservato esattamente com'è (il maiuscolo conta), l'email no. Senza il minuscolo forzato, `Mario@x.it` e `mario@x.it` sarebbero due identità diverse.

**`auth_identities_email_at_provider_ck`** — `VERIFICATO 24/10 (test 09)`
```ts
check("auth_identities_email_at_provider_ck",
  sql`${t.emailAtProvider} IS NULL OR ${t.emailAtProvider} = lower(btrim(${t.emailAtProvider}))`)
```
- *In parole:* se c'è un'email del provider, è già normalizzata.
- *Perché:* evita confronti sbagliati quando l'email viene usata per cercare un utente da collegare.

**FK `user_id` → `users` RESTRICT** — `VERIFICATO 24/10 (test 15)`
- *In parole:* l'identità appartiene a un utente esistente, e non si può cancellare un utente che ha identità.
- *Esempio:* `DELETE FROM users` per un utente con identità fallisce.

---

### 5.9 `otp_challenges`

Le "sfide" a codice monouso inviate per email. Nessuna FK: il destinatario può non essere ancora un utente (è la sua prima registrazione).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK; opaco, restituito al client per legare il codice alla richiesta originale |
| `channel` | otp_channel | NOT NULL (`email`) |
| `destination` | text | NOT NULL; email normalizzata |
| `code_hash` | text | NOT NULL; HMAC del codice con segreto del server, mai il codice in chiaro |
| `attempts` | integer | NOT NULL, default 0; tentativi errati |
| `expires_at` | timestamptz | NOT NULL; validità 5 minuti (regola applicativa) |
| `consumed_at` | timestamptz | usata con successo |
| `invalidated_at` | timestamptz | sostituita da un nuovo invio, o esaurita per troppi errori |
| `created_at` | timestamptz | NOT NULL |

**Vincoli**

**`otp_challenges_one_active_uq`** — indice UNIQUE **parziale** — `VERIFICATO 24/10 (test 10, 11)`
```ts
uniqueIndex("otp_challenges_one_active_uq")
  .on(t.channel, t.destination)
  .where(sql`${t.consumedAt} IS NULL AND ${t.invalidatedAt} IS NULL`)
```
- *In parole:* per ogni destinatario può esistere **una sola sfida "viva"**, cioè non ancora usata e non ancora invalidata.
- *Esempio:* invio un codice a `x@test.it`. Per inviarne un secondo, l'applicazione deve prima chiudere il primo (`invalidated_at = now()`) e poi inserire il nuovo, **nella stessa transazione**. Se prova a inserire senza chiudere, il database rifiuta.
- *Perché:* implementa "se ne viene generato un altro, il precedente è invalidato": non possono esistere due codici validi insieme per lo stesso destinatario.
- *Limite:* il vincolo non guarda `expires_at`. Una sfida scaduta ma non chiusa occupa ancora il posto: l'applicazione deve chiuderla prima di inviarne una nuova.

**`otp_challenges_attempts_ck`** — `VERIFICATO 24/10 (test 12)`
```ts
check("otp_challenges_attempts_ck", sql`${t.attempts} >= 0`)
```
- *In parole:* i tentativi non possono essere negativi.
- *Perché:* rete di sicurezza contro errori nel contatore.

**`otp_challenges_destination_ck`** — `VERIFICATO 24/10 (test 13)`
```ts
check("otp_challenges_destination_ck",
  sql`${t.channel} <> 'email' OR ${t.destination} = lower(btrim(${t.destination}))`)
```
- *In parole:* se il canale è email, il destinatario è minuscolo e senza spazi.
- *Esempio:* `Y@test.it` rifiutato.
- *Perché:* limiti di invio e cooldown si calcolano per destinatario: con `Y@test.it` e `y@test.it` come destinatari diversi, il tetto orario si aggirerebbe cambiando le maiuscole.

**`otp_challenges_destination_idx`** — indice `(channel, destination, created_at)`, non un vincolo. Serve a contare gli invii recenti per destinatario:
```sql
-- cooldown 45 s: esiste un invio negli ultimi 45 secondi?
-- tetto orario: quanti invii nell'ultima ora? (finestra scorrevole di 60 minuti)
```

---

### 5.10 `sessions`

Sessioni server-side revocabili (cookie `httpOnly`). Si creano **solo dopo** una verifica riuscita.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users.id` RESTRICT |
| `token_hash` | text | NOT NULL, UNIQUE; SHA-256 del token casuale, mai il token |
| `auth_provider` | identity_provider | NOT NULL; con quale metodo è entrato (audit) |
| `expires_at` | timestamptz | NOT NULL; **scorrevole**: `now() + 30 giorni` al momento del tocco, mai oltre `created_at + 90 giorni` (regola applicativa, nessuna colonna per il tetto) |
| `last_seen_at` | timestamptz | NOT NULL, default `now()`; riscritto al massimo ogni 5 minuti (regola applicativa) |
| `revoked_at` | timestamptz | revocata (logout, anonimizzazione) |
| `user_agent` | text | per riconoscere il dispositivo |
| `created_at` | timestamptz | NOT NULL; è la base del **tetto assoluto** della sessione |

**Regole applicative (decise il 26/10/2026)**
- **Scorrimento con tetto**: a ogni richiesta autenticata si valuta `last_seen_at < now() - interval '5 minutes'` (calcolato dal DB); solo se vero si aggiornano `last_seen_at = now()` e `expires_at = LEAST(now() + interval '30 days', created_at + interval '90 days')`. Mai a ogni richiesta.
- **Tetto assoluto**: nessuna sessione vive oltre 90 giorni dalla creazione, anche con attività continua. Si calcola da `created_at`: nessuna colonna nuova.
- **Validità di una sessione**: `revoked_at IS NULL` **e** `expires_at > now()` **e** `created_at > now() - interval '90 days'` **e** l'utente non è anonimizzato. Ogni fallimento dà lo stesso 401.
- **Revoca**: `UPDATE … SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`; 0 righe = già revocata (nessun secondo evento di audit).
- **Cookie**: `sid`, `httpOnly`, `SameSite=Lax`, `Secure` solo in produzione, `Path=/`, `maxAge` = 90 giorni (tetto assoluto, non rinnovato). In DB solo lo SHA-256 del token.

**Vincoli**

**`sessions_token_hash_uq`** — `VERIFICATO 24/10 (test 14)`
```ts
unique("sessions_token_hash_uq").on(t.tokenHash)
```
- *In parole:* due sessioni non possono avere lo stesso hash del token.
- *Perché:* ogni richiesta viene associata a un utente cercando per hash: deve esserci una sola risposta. Il lookup per hash usa anche questo indice.

**FK `user_id` → `users` RESTRICT** — la sessione appartiene a un utente esistente. Stessa logica di `auth_identities` (testata lì, non su questa tabella).

**`sessions_user_idx`** — indice su `user_id`, non un vincolo: serve a elencare o revocare tutte le sessioni di un utente.

---

### 5.11 `auth_events`

Log di sicurezza **append-only** (l'applicazione fa solo `INSERT`, mai `UPDATE` o `DELETE`). Non contiene dati personali in chiaro.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | nullable, FK → `users.id` RESTRICT; NULL = utente sconosciuto (es. email mai registrata) |
| `type` | auth_event_type | NOT NULL |
| `provider` | identity_provider | nullable |
| `subject_hash` | text | nullable; HMAC dell'email, per correlare tentativi senza salvarla |
| `metadata` | jsonb | NOT NULL, default `{}`; **mai dati personali né codici** |
| `created_at` | timestamptz | NOT NULL |

**Vincoli**

**FK `user_id` → `users` RESTRICT, nullable** — `VERIFICATO 24/10 (test 16, 17)`
```ts
userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" })
```
- *In parole:* se un evento ha un utente, quell'utente deve esistere; l'utente può mancare.
- *Esempio:* un tentativo di codice su un'email sconosciuta si registra con `user_id` NULL (accettato); con un `user_id` inventato, rifiutato.
- *Perché:* gli attacchi (invii ripetuti, codici sbagliati) colpiscono spesso email che non hanno un account: vanno tracciati lo stesso.

**Indici `auth_events_user_idx` `(user_id, created_at)` e `auth_events_type_idx` `(type, created_at)`** — non vincoli: servono a "cosa è successo a questo utente" e "quanti `otp_failed` nell'ultima ora".

**Append-only:** oggi è una regola applicativa, non imposta dal DB (non è stato tolto il permesso di UPDATE/DELETE né c'è un trigger). Da valutare quando ci sarà un cliente reale.

---

## 6. Regole applicative (non garantite dal DB)

**Timbri e richieste**
- **`stamps_count`**: aggiornarlo nella **stessa transazione** che inserisce lo `stamp_event`, con `UPDATE ... SET stamps_count = stamps_count + $1` (atomico), mai leggi-poi-scrivi.
- **Quantità "B"**: lo staff inserisce i prodotti consumati; il backend li scompone in tratti (`stamp` / `redeem`) con una funzione pura e scrive un evento per tratto, nella stessa transazione.
- **Rollover promozione (lazy)**: se `cards.promotion_id` non è la promozione attiva, al primo timbro il backend azzera `stamps_count`, aggiorna `promotion_id` e aggiorna il pass. Nessun cron per l'MVP. Per ora la `confirm` risponde 409. Lo storico resta in `stamp_events.promotion_id`.
- **Cosa succede ai timbri già maturati alla scadenza** (es. 9/10): decisione di prodotto ancora aperta. Opzione consigliata per l'MVP: il gestore imposta la fine con preavviso e il cliente vede la scadenza sulla card.
- **Nel codice passare sempre `venue_id` insieme agli ID** delle risorse, per rispettare le FK composite e l'ownership.
- **Il `venue_id` dello staff** si ricava da `venue_members` tramite la sessione, mai da body o params.
- **Scadenza richieste**: vedi §2 (scadenza lazy, solo da `pending`).

**Identità e collegamento tra metodi (decise 24/10/2026)**
- **Nessun utente senza prova di possesso** dell'identificativo (codice OTP o IdP autorevole): niente account "non verificati" in attesa. È la difesa dal *pre-hijacking* (un attaccante crea l'account con l'email della vittima prima che si registri).
- **Chiave dell'identità: `(provider, sub)`**, mai l'email. L'email serve solo come indizio per collegare.
- **Google**: verificare firma, `aud`, `iss` ed `exp` del token. Si fidano l'email e il collegamento automatico **solo** se l'email è `@gmail.com` oppure `email_verified` è vero e `hd` è valorizzato. Altrimenti (Google con email di terzi, es. libero.it): **rifiutare** e invitare a usare l'email con codice, registrando `google_untrusted_email_rejected`. Rifiutare è solo logica applicativa: accettarli in futuro richiederà una migration additiva (colonna `purpose` e riferimento all'identità in sospeso su `otp_challenges`).
- **Collegamento**: se il token Google è autorevole e l'email coincide con `users.email` di un utente esistente, si crea l'identità `google` per quell'utente (stesso account). Se l'utente entra con codice email e `users.email` esiste già, entra nello stesso account. Se nessun utente ha quell'email, se ne crea uno nuovo: l'email si scrive in `users.email` solo dopo la prova.
- **Apple** (non ancora deciso, solo note): l'indirizzo "Hide My Email" è un indirizzo proxy casuale, mai uguale all'email registrata dall'utente; il collegamento automatico non è possibile. Strada prevista: collegamento guidato (inserisce la sua email → codice OTP → collega). Da confermare quando si implementa, rileggendo la documentazione Apple.
- **Telefono e email non si uniscono.**
- **Nessuna funzione "cambia email" non verificata** e nessuna password.
- **Sessioni create solo dopo la verifica**; nuova sessione a ogni login. Durata scorrevole e tetto assoluto: vedi §5.10.

**Codici OTP (parametri decisi 24/10/2026)**
- 6 cifre; validità **5 minuti**; **monouso** e valido solo per la richiesta originale (il client invia `id` della sfida + codice); un nuovo invio invalida il precedente nella stessa transazione; salvataggio solo come **HMAC** con segreto del server.
- **5 tentativi** per codice, al quinto errore la sfida si invalida. Il limite è per sfida/destinatario, non globale (un limite globale permette di bloccare tutta l'app).
- **Attesa di 45 secondi** tra due invii allo stesso destinatario, imposta **lato server** (un timer solo nel client si aggira ripetendo la richiesta).
- **Tetto di 5 invii all'ora** per destinatario, poi sospensione di 1 ora, calcolato come **finestra scorrevole di 60 minuti** sulle righe di `otp_challenges` (nessuna colonna `blocked_until`).
- **Nessun limite per IP** per ora.
- Risposta **identica** per email esistente e inesistente (evita di rivelare quali email sono registrate). Non bloccare l'account della persona: si limitano i codici, non gli accessi.
- Standard di riferimento (letti tramite fonti di terzi, non i testi originali): OWASP ASVS 4.0 §2.7 (scadenza 10 minuti, monouso, solo hash); NIST SP 800-63B (6 cifre, tetto di 100 fallimenti consecutivi). Per NIST l'email non è un canale "out-of-band" valido per autenticazione forte: accettato consapevolmente per un livello di rischio basso (il Wallet non contiene pagamenti, lo staff conferma i timbri).

**Eventi di audit**
- Registrare in `auth_events`: invio codice, invio bloccato, tentativo fallito, verifica riuscita, login, collegamento di identità, Google rifiutato, logout, sessione revocata. Mai email in chiaro né codici: usare `subject_hash` (HMAC dell'email).
- **`metadata` con whitelist zod per tipo di evento** (dal 26/10/2026): `otp_send_blocked` → `{reason: "cooldown" | "hourly_limit"}`, `otp_failed` → `{attempts: int ≥ 0}`, tutti gli altri → `{}` obbligatorio (`logout` compreso). Niente IP, niente dominio dell'email, mai email o codici. Un metadata fuori schema è un errore di programmazione e fa fallire l'insert.

**Anonimizzazione (GDPR)** — da implementare: eliminare le righe `auth_identities` dell'utente, impostare `users.email` a NULL, svuotare `display_name`, impostare `anonymized_at`, revocare le sessioni. Gli utenti non si cancellano; card e log restano. **Da valutare**: `auth_events.subject_hash` è un valore derivato dall'email (pseudonimo): se può essere considerato ancora riconducibile alla persona va deciso se azzerarlo o ruotare il segreto.

**Retention (proposta, non decisa)**: ripulire le righe di `otp_challenges` dopo un periodo (es. 30 giorni), perché contengono l'email; `auth_events` secondo una durata da stabilire.

---

## 7. Verifiche eseguite sul DB reale

**29/09/2026**

| Vincolo | Esito |
|---|---|
| `promotions_no_overlap`: seconda promozione sovrapposta rifiutata | OK |
| `promotions_no_overlap`: promozione che parte alla fine della precedente accettata | OK |
| FK composita `cards` → `promotions`: promozione di altro locale rifiutata | OK |
| `cards_user_venue_uq` | OK |
| `stamp_requests_one_pending_uq` | OK |
| `stamp_events.idempotency_key` UNIQUE | OK |
| `cards_stamps_ck` | OK |
| `users_phone_uq`, `users_phone_required` (rimossi con la migration 2) | OK allora |

**23-24/10/2026 (dal codice, dal vivo)**

| Cosa | Esito |
|---|---|
| `stamp_requests_one_pending_uq` con `ON CONFLICT ("card_id") WHERE status='pending' DO NOTHING` (generato da Drizzle) | OK |
| Race: due `visit` paralleli con nessuna pendente → una sola riga, un 201 e un 200 | OK |
| Scadenza lazy da `pending` → `expired` (UPDATE condizionato) | OK |
| Richiesta `approved` con `expires_at` nel passato resta `approved` | OK |

**24/10/2026 — migration 2 (script `verify-migration-2.sql`, tutto in transazione con ROLLBACK)**

| # | Cosa | Esito |
|---|---|---|
| 01 | `users.email` duplicata rifiutata | OK |
| 02 | più utenti con email NULL accettati | OK |
| 03 | email con maiuscole rifiutata | OK |
| 04 | email con spazi rifiutata | OK |
| 05 | identità `(provider, provider_user_id)` duplicata rifiutata | OK |
| 06 | seconda identità `email` per lo stesso utente rifiutata | OK |
| 07 | identità `email` con maiuscole rifiutata | OK |
| 08 | `sub` Google con maiuscole accettato | OK |
| 09 | `email_at_provider` con maiuscole rifiutata | OK |
| 10 | seconda sfida OTP attiva rifiutata | OK |
| 11 | nuova sfida accettata dopo invalidazione | OK |
| 12 | `attempts` negativo rifiutato | OK |
| 13 | destinatario OTP con maiuscole rifiutato | OK |
| 14 | `token_hash` duplicato rifiutato | OK |
| 15 | cancellazione di un utente con identità rifiutata (RESTRICT) | OK |
| 16 | evento con `user_id` NULL accettato | OK |
| 17 | evento con `user_id` inesistente rifiutato | OK |
| 18 | `promotions_no_overlap` ancora presente | OK |
| 19 | colonne `phone_*` rimosse da `users` | OK |

Non ancora verificati: `promotions_dates_ck`, `stamp_events_qty_ck`, UNIQUE su `stamp_events.request_id` (verrà rimosso), FK composite di `stamp_requests` e `stamp_events`, `venues.slug` UNIQUE, PK di `venue_members`, RESTRICT sulle FK di `sessions` e `auth_events` (testato solo su `auth_identities`).

---

## 8. Roadmap dello schema

**Migration 3 (prima della `confirm`):** togliere UNIQUE su `stamp_events.request_id` (resta indice normale), con aggiornamento di `schema.ts` e di §5.7.

**Con nuovi metodi di accesso (quando serviranno, migration additive):**
- Apple: valore `apple` in `identity_provider`.
- Telefono con SMS: valore `phone` in `identity_provider`, valore `sms` in `otp_channel`, eventuale riduzione di `auth_identities_user_provider_uq` se servono più identità per tipo.
- Google con email di terzi: colonna `purpose` e riferimento all'identità in sospeso su `otp_challenges`.

**Più avanti (con un cliente reale):** `audit_log` generico append-only per le operazioni di business (timbri, conferme), tabella per il merge manuale dei profili, dati di fatturazione, blocco di UPDATE/DELETE su `auth_events`.

**Da valutare:** eventuale `promotion_id` su `stamp_requests`, tabella `wallet_events` per tracciare gli aggiornamenti dei pass, passaggio a UUID v7, `venue_members` creati da seed o da una procedura di onboarding, job di pulizia per `otp_challenges` e `auth_events`.
