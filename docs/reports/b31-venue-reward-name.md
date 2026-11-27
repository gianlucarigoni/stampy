# Report: b31 — B31 — Nome del locale e del premio nelle risposte del cliente

- **Issue:** #70
- **Branch:** feat/b31-venue-reward-name
- **Data:** 2026-11-27

## Obiettivo

`visit` e `GET /requests/:id` restituiscono `venueName` e `rewardName` già prima dell'approvazione (TDD, nessuna migrazione).
Le pagine cliente Visita (`/v/:venueId`) e Richiesta (`/r/:requestId`) mostrano il nome del locale e del premio, sulla UI attuale. Il design nuovo è F10 (#81).

## Decisioni e motivazioni

- **Nomi dei campi: `venueName` e `rewardName`.** `reward` (solo nel polling `approved`) resta com'è, con lo stesso valore di `rewardName`: toglierlo avrebbe rotto un contratto già in uso (`RewardDialog`). `rewardName` non si confonde con `rewardsRedeemed` (un conteggio). Scartato: rendere `reward` presente in ogni stato (cambia un campo esistente).
- **Premio = quello della promozione mostrata**: la promozione attiva se `promotionChanged`, altrimenti quella della card. È la regola già usata per `stampsRequired` nel polling. In `visit` la promozione attiva coincide sempre con quella mostrata.
- **Presenti in tutti gli stati e in tutte le risposte di `visit`** (`card_created`, `card_not_added`, `request_pending` nuova, già pending e race persa).
- **Nessun branding** (D16): solo i due nomi.
- **Polling**: `venueName` viene da un join con `venues` sulla FK composita della card, quindi l'ownership resta in SQL (stesso 404 per richiesta altrui o inesistente).
- **Frontend**: componente piccolo `components/VenueReward.vue` (riga col nome del locale e riga «N timbri = premio»), usato in Visita (schermata card) e in Richiesta (pending e chiusa). Se il dato manca la riga non compare (campi opzionali nei tipi). La Richiesta mostra «N timbri = premio»; la Visita no, perché la risposta di `visit` non porta la soglia (non l'ho aggiunta: fuori perimetro).

## Assunzioni e cose da validare

- Il test già approvato di `visit-polling.test.ts` sul polling pending (elenco esatto delle chiavi) è stato aggiornato con `venueName` e `rewardName`, come concordato nella proposta; è l'unica modifica a un test esistente.
- Nel test nuovo «nessuna email né branding…» avevo ordinato male le chiavi (`status` prima di `stampsCount`): ho corretto l'ordine alfabetico, senza cambiare l'asserzione.
- **Non verificato a vista**: resa a 360 px e tema scuro. Le righe usano solo classi Bootstrap già in uso (`fw-semibold`, `text-body-secondary`), quindi seguono i temi, ma non ho guardato lo schermo.

## File toccati e test

- Backend: `src/api/requests/requests.service.ts` (join con `venues`, `venueName`/`rewardName` in `CardStateOfRequest`), `src/api/requests/requests.controller.ts`, `src/api/venues/venues.controller.ts` (oggetto `names` aggiunto a tutte le risposte di `visit`).
- Frontend: `src/api/endpoints.ts` (tipi), `src/components/VenueReward.vue` (nuovo), `src/views/CustomerVisitView.vue`, `src/views/CustomerRequestView.vue`.
- Test: `test/api/customer-names.test.ts` (nuovo, 13 test), `test/api/visit-polling.test.ts` (1 test aggiornato). Totale della suite prima 376 → dopo 390 (✔ 390, ✘ 0).
- Rosso mostrato prima del codice: 13 test nuovi + quello aggiornato fallivano perché i campi mancavano.
- Typecheck backend (`typecheck:all`) e frontend (`type-check`) puliti.
- E2E (porta 5175, DB del worktree): `staff-input` 7 ✔, `account-delete` 16 ✔, `display-name` 15 ✔ (identici alla baseline di T8); `feedback` ✘ come già noto in T8 (aspetta `.toast-stack .alert`, tolto da F4). `history` e `t6d` non rieseguiti, come in T8.

## Modifiche proposte ai documenti

### CODEBASE.md
- Tabella API, `visit`: le risposte portano anche `venueName` e `rewardName` (premio della promozione attiva): `201 card_created {…link di salvataggio, publicCode, venueName, rewardName}`, `200 card_not_added` idem, `request_pending {requestId, expiresAt, promotionChanged, venueName, rewardName}`.
- Tabella API, `GET /api/requests/:requestId`: `200 {status, publicCode, expiresAt, stampsCount, stampsRequired, venueName, rewardName, promotionChanged}`; `rewardName` è il premio della promozione mostrata (la attiva se `promotionChanged`) in ogni stato; con `approved` restano `stampsAdded`, `rewardsRedeemed` e `reward` (uguale a `rewardName`).
- Componenti frontend: `components/VenueReward.vue` (nome del locale e «N timbri = premio» nelle pagine cliente; non compare se il dato manca).
- Test: `customer-names.test.ts` (13); totale 390.

### BACKLOG.md
- B31 (#70) → §8 con la data 2026-11-27 (backend e frontend minimo; il design nuovo resta F10).

## Lacune emerse e task suggerite

- La risposta di `visit` (`card_created`/`card_not_added`) non porta `stampsRequired`, quindi la Visita non può mostrare «N timbri = premio» come la Richiesta. Se F10 lo vuole, serve aggiungerlo.
- La Richiesta dipende ancora dal `venueId` salvato nella tab (`stampy.request.<id>`) per «Richiedi di nuovo»: il polling non restituisce `venueId`. Fuori da B31.

## Problemi di ambiente

- Nessuno. Nota: `gh issue view 70` senza `--json` fallisce per la deprecazione dei Projects classic; con `--json` funziona.

## Cosa ho capito e cosa no

- Istruzioni chiare. Ho scelto io i nomi `venueName`/`rewardName` (la task chiedeva di dichiararli) e li ho dichiarati nella proposta dei test, approvata.
