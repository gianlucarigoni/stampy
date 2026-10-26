# Stampy — Handoff Fase 4c (percorso email e sessione chiusi: si riparte da `visit` con la sessione)
**Data snapshot:** 26 ottobre 2026 (mattina), aggiornato la sera dello stesso giorno
**Branch:** `main`. Ultimo hash noto prima del commit di chiusura della Fase 3: `fcacbbe` (inserire l'hash reale con `git log --oneline -5`). Il codice dell'auth (§4) e i tre script di test sono scritti e provati in locale: **il commit va fatto dall'utente** (insieme alla migration 2 se non ancora committata).
**Tag consigliati:** `fase-3-chiusa`, e un tag dopo il commit di percorso email + sessione.
**Aggiornamento 26/10 (sera):** `isAuthenticated`, sessione scorrevole con tetto assoluto, `GET /api/auth/me` e `POST /api/auth/logout` sono **implementati e testati** (`scripts/session.ts` 16/16, `scripts/otp-verify.ts` 16/16, `scripts/otp-request.ts` 13/13, typecheck pulito). `req.user` non è utilizzabile (conflitto con `@types/passport`): l'utente sta in **`req.auth`**. Prossimo passo: `visit` e polling con l'utente di sessione (§5C).

> Incollare come primo messaggio della nuova chat. Il codice prevale sempre sui documenti. Collegati: `stampy_contesto_progetto.md` (decisioni di prodotto, §4.11 auth), `stampy_db_schema.md` (schema e vincoli, fonte di verità), `CODEBASE_CONTEXT.md` (mappa del codice), `progress.md` (storico, fonti, punti aperti). Questo file **sostituisce `Stampy_Handoff_Fase_4b.md`**.
> Le sezioni §5A-B (flussi `isAuthenticated`/logout) sono **implementate e testate**; §5C-D-E sono ancora **proposte non approvate** e vanno discusse punto per punto prima di scrivere codice.

## 0. Istruzioni operative per la nuova chat

- Rispondi in italiano. Critica quando serve, raccomanda con motivazioni, **l'utente decide**.
- **Nessuna modifica senza approvazione esplicita, punto per punto.** Per ogni proposta: fatti verificati, alternative con pro/contro, raccomandazione, file toccati, comandi e test attesi. Poi attendere.
- Non produrre codice completo se non richiesto. Schema di lavoro abituale: implementa l'utente, tu correggi; quando l'utente chiede di scrivere un blocco, **prima si chiede il file attuale**: non si scrive a occhio codice che dipende da file mai visti. (Eccezione già concordata il 26/10: scrittura completa dei service e del controller dell'auth su richiesta esplicita.)
- Distingui FATTO VERIFICATO / IPOTESI / RISCHIO / DA VERIFICARE. Non inventare API, SDK o limiti di servizi esterni (Google Sign-In, Gmail, Google Wallet, Apple). Ricerca nella documentazione ufficiale solo quando l'utente lo dice: **per l'auth autorizzata il 24/10** (esito in `progress.md` §9); **per l'aggiornamento del pass Google Wallet non ancora autorizzata**.
- Non chiedere `.env`, chiave JSON del service account, né il `saveUrl` completo. Non chiedere l'intero bundle (un file singolo sì, quando serve).
- L'utente vuole poche domande preliminari, discussioni brevi e passare presto all'implementazione. Stile diretto.
- Non modificare `seed.ts` salvo richiesta esplicita. Non riproporre il test di caduta DB.
- **Vincolo di budget**: l'utente incassa prima di investire. Soluzioni a costo 0 o minimo; niente SMS a pagamento al lancio.
- `userId` nel body di `visit` è **solo sviluppo**: con l'auth verrà dalla sessione. Il `venue_id` dello staff verrà dalla sessione (`venue_members`), mai da body o params.
- Per i test l'utente usa script TypeScript da terminale in `scripts/` (`poll-request.ts`, `otp-request.ts`, `otp-verify.ts`, `session.ts`) e script SQL in transazione con ROLLBACK (`verify-migration-2.sql`). Gli script stampano risposta e singoli controlli (✔/✘): per diagnosticare servono quelle righe, non il solo riepilogo.
- **Ogni `throw new GenericError(...)` va scritto con lo status** (es. `, 400`): senza risponde 500.

## 1. Stato di partenza (fatti al 26/10)

- **Migration 2 chiusa** (`0002_auth_foundation`): 11 tabelle, 9 enum, 19 controlli OK (`verify-migration-2.sql`, ROLLBACK).
- **Percorso email dell'auth implementato e testato da terminale** (RIPORTATO, esiti degli script):
  - `scripts/otp-request.ts`: validazione, 202, normalizzazione, cooldown con `Retry-After`, tetto orario (la sfida viva resta viva), finestra oraria, 5 richieste simultanee, risposta uguale per utente esistente/inesistente → tutti OK (25/10, rieseguito 13/13 il 26/10).
  - `scripts/otp-verify.ts`: **16/16** (26/10, rieseguito dopo le sessioni).
  - `scripts/session.ts`: **16/16** (26/10, verificato in questa sessione) — `isAuthenticated`, scorrimento, tetto assoluto, 401 unico, logout.
- API esistenti: `GET /api/health`, `POST /api/cards/google` (dev), `POST /api/venues/:venueId/visit` (testato), `GET /api/requests/:requestId` (testato), `POST /api/auth/email/request`, `POST /api/auth/email/verify`, **`GET /api/auth/me`**, **`POST /api/auth/logout`**. `userId` ancora nel body di `visit`.
- **Non esistono ancora**: login Google, `GmailEmailSender`, uso della sessione in `visit` e nel polling, endpoint staff/`requireRole`.
- **`npm run typecheck`**: pulito il 26/10 dopo `isAuthenticated`/logout.
- Schema e vincoli rilevanti (dettagli in `stampy_db_schema.md`):
  - `users.email` UNIQUE e valorizzata **solo dopo prova di possesso**.
  - `auth_identities`: UNIQUE `(provider, provider_user_id)` e UNIQUE `(user_id, provider)`.
  - `otp_challenges`: indice UNIQUE parziale `(channel, destination)` dove `consumed_at` e `invalidated_at` sono NULL (una sola sfida viva per destinatario; non guarda `expires_at`).
  - `sessions.token_hash` UNIQUE; `auth_events.user_id` nullable.
  - Le email sono sempre minuscole e senza spazi ai bordi (CHECK nel DB): normalizzare nel codice prima di ogni insert e confronto.

## 2. Decisioni prese per l'auth (non riaprire)

| Tema | Decisione |
|---|---|
| Metodi di accesso | **Email + codice via email** e **Google**. Niente password. Registrazione e accesso sono lo stesso gesto |
| Metodi futuri (non confermati) | Apple e telefono con SMS. Email e telefono non si uniscono |
| Identificatore primario | Email verificata (`users.email`). Chiave delle identità: `(provider, sub)`, mai l'email |
| Prova di possesso | Nessun utente o identità senza codice OTP riuscito o IdP autorevole. Nessuna funzione "cambia email" non verificata. Sessioni create solo dopo la verifica |
| Google | Verifica di firma, `aud`, `iss`, `exp`. Collegamento per email solo se `@gmail.com` oppure `email_verified` vero con `hd` valorizzato. **Google con email di terzi: rifiutato** (evento `google_untrusted_email_rejected`, invito a usare l'email con codice) |
| Codice OTP | 6 cifre, **5 minuti**, monouso, legato alla richiesta (il client invia `id` sfida + codice), salvato come **HMAC** (`otp:{id}:{codice}`) con segreto del server |
| Nuovo invio | Invalida il precedente **nella stessa transazione**, dopo i controlli |
| Tentativi | **5** per codice; il quinto con il codice giusto passa; dopo il quinto errore la sfida si invalida |
| Attesa tra due invii | **45 secondi** per destinatario, lato server |
| Tetto invii | **5 all'ora** per destinatario (finestra scorrevole di 60 minuti), poi sospensione di 1 ora |
| Limite per IP | **Nessuno** per ora |
| Limiti | Per destinatario, mai contatore globale. Non si blocca l'account: si limitano i codici |
| Risposte | `request`: 202 `{challengeId}` identica per email esistente e inesistente. `verify`: errore unico 400 `"Codice non valido o scaduto"` per ogni fallimento |
| Sessioni | Token casuale di 32 byte, in DB solo SHA-256, cookie `httpOnly`, server-side e revocabili. **Non** JWT in `localStorage`. **Deciso il 26/10**: `sid`, `SameSite=Lax`, `Secure` solo in produzione, `maxAge` = 90 giorni; sessione scorrevole 30 giorni dall'ultima attività, rinnovo al massimo ogni 5 minuti, tetto assoluto 90 giorni da `created_at`. Ogni fallimento → stesso 401 |
| Audit | `auth_events` append-only; mai email in chiaro, codici o dati personali nei metadata; `subject_hash` = HMAC dell'email (`subject:{email}`) |
| Apple | Non deciso. L'email "Hide My Email" è un proxy mai uguale a quella registrata: serve collegamento guidato (email + codice) |

**Valori che sono scelte nostre, non standard:** 5 minuti, 5 tentativi, 45 secondi, 5 invii/ora, HMAC per il codice, finestra scorrevole. Gli standard (letti solo tramite fonti di terzi) fissano tetti più larghi: validità massima 10 minuti, 6 cifre minimo, 100 fallimenti consecutivi.

**Decisioni di prodotto già prese sul resto del flusso (non riaprire):** quantità "B" con tratti, scadenza lazy delle richieste (3 minuti, solo da `pending`), `visit` senza card crea solo la card, polling cliente ogni 1–2 s, 409 nella `confirm` se la promozione della card non è quella attiva, interfaccia "wallet provider" astratta rimossa. Dettagli in `stampy_contesto_progetto.md` §4.

## 3. Cosa fanno gli endpoint (implementati)

**`POST /api/auth/email/request`** — body `{email}`: transazione con una query di statistica (secondi dall'ultimo invio, invii nell'ultima ora, età del più vecchio); controlli prima di toccare righe (cooldown → 429, tetto → 429, con `Retry-After`; l'evento `otp_send_blocked` resta committato); poi invalida la sfida viva, inserisce la nuova, scrive `otp_sent`; 23505 → 429. Dopo il commit `emailSender.sendOtp`; se fallisce 503 (la sfida resta).

**`POST /api/auth/email/verify`** — body `{challengeId, code}`: `registerAttempt` atomico fuori transazione; codice errato → `otp_failed`, invalidazione al quinto errore, 400 generico; codice giusto → una transazione: consumo monouso con filtro di stato, `loginWithEmail` (utente `INSERT … ON CONFLICT DO NOTHING` poi `SELECT`; identità `email`), sessione, eventi `otp_verified` / `identity_linked` (solo se l'identità è aggiunta a un utente esistente) / `login_success` con `user_id`; poi cookie `sid` e 200 `{user:{id,email,displayName}}`.

## 4. Struttura dei file (RIPORTATO, esiste nel repo)

```text
src/db/tx.ts                         (Tx, DbOrTx)
src/api/auth/
  otp.service.ts                     (generateCode, hashCode, createChallenge, registerAttempt, checkCode, invalidateChallenge, consumeChallenge; costanti 45/5/5/5)
  auth-events.service.ts             (log(type, {email, userId, provider, metadata}, tx?), hashSubject; metadata validati con zod per tipo)
  identity.service.ts                (loginWithEmail(email, tx) → {user, created, linked} | null)
  session.service.ts                 (hashToken, create(...), authenticate(token), revoke(id, tx?), sessionCookieOptions();
                                      SESSION_IDLE_TTL_DAYS=30, SESSION_ABSOLUTE_TTL_DAYS=90, SESSION_TOUCH_MINUTES=5, SESSION_COOKIE_NAME="sid")
  session.middleware.ts              (isAuthenticated: cookie → service → req.auth, altrimenti 401)
  auth.controller.ts                 (me, logout)
  email/email.controller.ts          (request, verify)
  email/email.dto.ts, email/email.router.ts
src/utils/types/auth.type.ts         (AuthUser, AuthSessionInfo, AuthContext)
src/utils/auth-context.ts            (requireAuth: legge req.auth, 401 se assente)
src/utils/typed-request.ts           (TypedRequest, TypedAuthRequest con auth?: AuthContext)
src/utils/email/email-sender.ts      (EmailSender + ConsoleEmailSender, vietato in production)
src/errors/try-later.error.ts        (429)
src/errors/unauthorized.error.ts     (401 "Non autenticato" + handler, registrato prima del generico)
scripts/otp-request.ts, scripts/otp-verify.ts, scripts/session.ts, scripts/poll-request.ts
scripts/verify-migration-2.sql
```
Il vecchio `email.service.ts` va cancellato se ancora presente. La transazione di `verify` sta nel controller (orchestra tre service): se preferita, spostarla in un `AuthService` è solo uno spostamento.

## 5. Da implementare (A e B fatti il 26/10; C-D-E ancora proposte)

### A. `isAuthenticated` — **FATTO (26/10)**
1. `cookie-parser` senza segreto, montato in `src/app.ts`. ~~installazione da approvare~~ installato.
2. Cookie `sid` → SHA-256 → sessione con `revoked_at` NULL, `expires_at > now()`, `created_at > now() - 90 giorni`, utente non anonimizzato. L'utente e la sessione finiscono in **`req.auth`** (`req.user` non è tipizzabile: `@types/passport` dichiara già `Express.Request.user`).
3. `last_seen_at`/`expires_at` aggiornati **solo se più vecchi di 5 minuti**, con tetto assoluto `LEAST(now()+30d, created_at+90d)`.
4. Senza sessione valida → `UnauthorizedError` + `unauthorizedHandler` (401, "Non autenticato"), stesso corpo per ogni causa. `GET /api/auth/me` è la sonda read-only.

### B. Logout — **FATTO (26/10)**
`POST /api/auth/logout` (con `isAuthenticated`): `revoked_at = now()` solo se NULL, evento `logout` nella stessa transazione (solo se la revoca è avvenuta), cookie rimosso con `sessionCookieOptions()`, 204. "Esci da tutti i dispositivi" resta fuori ambito.

### C. Aggancio alle rotte esistenti
- `visit` e `GET /requests/:requestId`: `userId` dalla sessione, non dal body; la richiesta del polling deve appartenere all'utente (filtro sul `user_id` della card collegata).
- Ordine dei middleware: `rate limit → isAuthenticated → requireRole → validate(params) → validate(body) → controller`.
- Le rotte `/api/auth/*` non richiedono sessione e sono protette dai limiti nel DB.

### D. Google (`POST /api/auth/google`, body `{idToken}`)
Verifica con `google-auth-library` (già nelle dipendenze): firma, `aud`, `iss`, `exp`; `email_verified` vero; email `@gmail.com` oppure `hd` valorizzato, altrimenti rifiuto con `google_untrusted_email_rejected`; ricerca di `(google, sub)`; se assente, collegamento all'utente con la stessa `users.email` (`identity_linked`) o creazione; sessione e `login_success`. **Come ottenere un ID token in test senza frontend: da verificare nella documentazione ufficiale** (non assumere). Dipende da configurazione esterna (client ID, schermata di consenso).

### E. Invio email reale
`GmailEmailSender` e `EMAIL_PROVIDER` (`console` | `gmail`) in `env.ts`. Limiti di invio e autenticazione di Gmail (password per le app o OAuth) **da verificare** nella documentazione ufficiale. Valutare quando passare a un provider transazionale (serve un dominio per SPF/DKIM).

## 6. Decisioni ancora da prendere (ognuna con alternative, pro/contro, raccomandazione)

1. ~~**Conferma di sessione 30 giorni assoluti e `SameSite=Lax`**~~ **risolto il 26/10**: scorrevole 30 giorni + tetto assoluto 90, tocco ogni 5 minuti, cookie `SameSite=Lax` con `maxAge` = 90 giorni. Resta da provare su un iPhone vero dopo il deploy di staging (ITP/IP del server) e da rivedere con CORS.
2. **CORS e CSRF con i cookie**: oggi `cors()` è aperto; con le sessioni va ristretto all'origine della web app con `credentials`; protezione CSRF sulle rotte che modificano stato (per ora si conta su `SameSite=Lax`).
3. ~~**`cookie-parser` o parsing manuale.**~~ **risolto**: `cookie-parser` 1.4.x senza segreto.
4. **Configurazione di Google Sign-In** e modo di ottenere un token in test.
5. **Ruoli staff e login dello staff**: stesso metodo del cliente o più forte (un account staff compromesso può approvare timbri falsi), `requireRole`, creazione del primo `owner` (oggi il seed non crea `venue_members`).
6. **Dove vive l'accesso nel flusso NFC** (come si conserva il `venueId` durante l'accesso): dipende dal frontend, che non esiste.
7. **Rate limit sul `visit`** (per utente e per carta) e dove tenere i contatori.
8. **Retention** di `otp_challenges` (contiene email; proposta 30 giorni) e di `auth_events`; **trattamento GDPR di `subject_hash`** all'anonimizzazione; procedura di anonimizzazione.
9. ~~Cosa si scrive in `auth_events.metadata`~~ **risolto il 26/10**: whitelist zod per tipo di evento dentro `log()`, `.strict()`, `logout` senza metadata.

## 7. Piano di lavoro consigliato (in ordine)

1. **Pre-merge** (§8) e commit del percorso email e della sessione; `npm run typecheck` (pulito il 26/10).
2. ~~`isAuthenticated` + logout + test con script~~ **fatto il 26/10** (`scripts/session.ts` 16/16, incluso il cookie del login vero).
3. `visit` e `GET /requests/:requestId` con l'utente di sessione (e ownership del polling). **Prossimo passo.**
4. **Google** (richiede configurazione esterna e un modo di ottenere un token).
5. `GmailEmailSender` (dopo la verifica dei limiti).
6. Endpoint staff: coda delle pendenti, `requireRole`, `venue_id` da `venue_members`.
7. **Migration 3** (togliere UNIQUE su `stamp_events.request_id`) + funzione pura dei tratti con test automatici.
8. `confirm` / `reject` (transazione, `idempotency_key`, `UPDATE stamps_count` atomico, 409 se promozione non attiva, `resolvedAt`/`resolvedBy`).
9. **Ricerca nella doc Google (aggiornamento del pass via REST)**: gate tecnico per `confirm`; l'utente può anticiparlo in qualsiasi momento.
10. `wallet_status`, branding di default, personalizzazione estetica.

## 8. Pre-merge e debito residuo

**Da fare prima del merge (rapido, esito non ancora comunicato)**
- `git status --short` pulito (decidere su `../.vscode/`); committare migration 2, percorso email e sessione.
- Sicurezza sulla storia Git (mostrare solo nomi di file, atteso vuoto): `git grep -lI -e '-----BEGIN' $(git rev-list --all)` e `git grep -lIE '://[^ ]+:[^ ]+@' $(git rev-list --all)`. Se esce una chiave, ruotarla dalla console Google Cloud.
- Ruotare o rimuovere `DEV_ENDPOINT_SECRET` se ancora nel `.env`.
- Controllare che `OTP_HMAC_SECRET` non sia mai finito in Git, in chat o nei documenti.

**Pulizie non applicate (debito consapevole, facili)**
- `google.controller.ts` usa ancora `googleSrv.getUserById/getVenueById/getActivePromotion` (duplicati): spostarlo su `userSrv`/`venueSrv`, poi rimuovere le tre funzioni da `GoogleService`; togliere il controllo date con `PromotionExpiredError` (codice morto).
- Import inutilizzati: `gt` e `requestStatus` in `requests.service.ts`, `VenueNotFoundError` in `errors/index.ts`. Controlli ridondanti nel `visit`.
- `venues/venues.response.ts`: tipo sbagliato e non importato; correggere o cancellare.
- Test del ramo `card_created` passando da `visit`.
- Verificare `resolved_at` coerente tra `fetchStatus` e `expirePendingRequest`, e che `GET /requests/:requestId` includa `expiresAt`.
- `npm ls express` (le rejection async negli handler sono gestite solo da Express 5).
- **Controllare che il 409 di `visit` (`GenericError("Errore nella richiesta, riprova", 409)`) abbia davvero lo status**: lo stesso errore dimenticato nell'auth rispondeva 500.
- Seed da riallineare alla migration 2 (`users` senza telefono) se serve rilanciarlo.

**Da riprendere prima di qualunque deploy**
- `genericErrorHandler`: espone `err.message`/`err.name` anche per i 5xx, non gestisce errori non-`GenericError`, non controlla `res.headersSent`; il 400 della validazione restituisce anche `value`; `logger: true` (stampa email e hash dei codici); `cors()` aperto; `start` esegue `tsx` con `build`/`dist` scollegati; `visit` non in transazione (step idempotenti).
- Schema zod su `promotions.config` (serve con la `confirm`), `enumValues[0]`, retry su collisione `public_code`, `addOrGetCard` che fa INSERT prima del SELECT (spostare in un `CardsService`), dipendenze inutilizzate (`mongoose`, `bcrypt`, `lodash`, `node`, `passport*`).

## 9. Test da prevedere (per il prossimo passo)

- **`isAuthenticated`/logout** — **FATTO (26/10, `scripts/session.ts` 16/16)**: cookie valido → 200; senza cookie, token alterato/malformato, sessione scaduta (`UPDATE sessions SET expires_at = now() - interval '1 minute'`), revocata, utente anonimizzato, tetto assoluto superato → 401 con corpo identico; scorrimento non a ogni richiesta; tetto rispettato a 89 giorni; logout → 204, cookie rimosso con le stesse opzioni, evento `logout` unico e senza metadata; dopo il logout → 401; logout ripetuto → 401 con `revoked_at` invariato e un solo evento; due logout simultanei → un solo evento.
- **`visit` con la sessione**: `userId` del body ignorato; polling di una richiesta di un altro utente → 404 (o 403, da decidere).
- **Google** (quando sarà): token con firma errata, `aud` sbagliato, scaduto, `email_verified` falso, email di terzi senza `hd` → rifiuto con evento.
- Non provati finora nell'auth email: il primo accesso simultaneo con la stessa email da due sfide diverse (non riproducibile, una sola sfida viva per destinatario; protezione per costruzione) e il ramo "utente anonimizzato" di `loginWithEmail`.

## 10. Punti aperti invariati

- **Aggiornamento del pass via REST** (bloccante per `confirm`): card di test nel DB `412771e6-9576-4c53-a8f8-d29ed9c61651`, `publicCode Q5B447BB`, già nel Wallet. Da verificare nella doc ufficiale: auth/scope, patch vs sostituzione, campi aggiornabili (`loyaltyPoints.balance.int`, modulo `user_progress`), latenza, se la class è modificabile. **Non committare mai** output con token o `saveUrl`.
- Rollover della promozione e destino dei timbri maturati alla scadenza (9/10): decisione di prodotto, da discutere con i gestori.
- Rotta "riaggiungi card" per chi ha rimosso il pass.
- Publishing access Google (tempi, requisiti per un individuo senza P.IVA), test NFC su iPhone e Android, dominio e URL fisso, logo del pass servito da URL HTTPS pubblico, **parlare con 2-3 gestori reali**.
- Apple (futuro): collegamento con email proxy; se `email_verified` sia sempre vero (la documentazione ufficiale dice che può essere falso per Work & School). Telefono con SMS: solo con un cliente reale.

## 11. Primo messaggio operativo nella nuova chat

1. Conferma in una frase che riprendi dalla Fase 4c: percorso email, `isAuthenticated`, sessione scorrevole e logout sono **chiusi e testati**; il prossimo passo è mettere l'utente di sessione in `visit` e nel polling (§5C). Approvazione punto per punto.
2. Chiedi `git status --short`, `git log --oneline -5`, se percorso email + sessione + migration 2 sono stati committati, l'esito di `npm run typecheck` e dei due `git grep` sulla storia.
3. Chiedi, solo se servono: `src/app.ts`, `src/api/routes.ts`, `src/api/venues/venues.controller.ts`, `src/api/venues/venues.service.ts`, `src/api/requests/requests.controller.ts`, `src/api/requests/requests.service.ts`, `src/api/auth/session.middleware.ts`, `src/utils/auth-context.ts`.
4. Proponi §5C (`visit` e `GET /requests/:requestId` con `req.auth`, rimozione di `userId` dal body, ownership del polling) nel formato fatti / alternative / raccomandazione / file / test. Non cercare nella doc Google (aggiornamento del pass) finché l'utente non lo dice.
