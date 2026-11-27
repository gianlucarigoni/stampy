# Report: b19 — B19 — Storico: paginazione lato server

- **Issue:** #16
- **Branch:** feat/b19-history-cursor-pagination
- **Data:** 2026-11-27

## Obiettivo

Paginazione a cursore dei due storici (`GET /venues/:venueId/requests/history`, `GET /requests/mine`) con totale e posizione («1–50 su 122») e frecce avanti/indietro. Decisione del proprietario sul totale: mix delle opzioni A (conteggio con gli stessi filtri) e B (cursori nulli agli estremi).

## Decisioni e motivazioni

- Query: `limit` intero 1–100 (default 25; il frontend offrirà 25 / 50 / 100), `cursor` opaco. `offset` resta `400` (parametro sconosciuto). Cursore malformato → `400` (validazione nel DTO).
- Risposta (identica nei due storici): `{ requests, total, pageStart, pageEnd, prevCursor, nextCursor }`. `total` = righe con stesso scope e filtri (anche `venueId`, B34); `pageStart`/`pageEnd` 1-based (`0`/`0` se vuota); `prevCursor` `null` sulla prima pagina, `nextCursor` `null` sull'ultima. Nomi diversi da `from`/`to` per non confonderli coi filtri di data.
- Cursore `n|p.<base64url([createdAt, id])>`: ordine `created_at DESC, id DESC`, confronto di riga `(created_at, id)` in SQL. `createdAt` viaggia come testo UTC del DB con i microsecondi (un `Date` li perderebbe: provato per mutazione). Il cursore non porta lo scope: scope e filtri restano in SQL, quindi un cursore altrui dà solo una posizione.
- 2 query per pagina: righe e conteggio; `total` e `pageStart` escono dalla stessa query (`count(*) filter` sulle righe più recenti del bordo della pagina).
- Le richieste nuove compaiono solo ricaricando (nessun aggiornamento a caldo, deciso dal proprietario): `pageStart` può spostarsi, le pagine non saltano né duplicano righe.
- Scartate: `limit`/`offset` (si sposta con i nuovi arrivi), `limit+1` per sapere se ci sono altre pagine (inutile col conteggio).

## Assunzioni e cose da validare

- Su dataset grandi il conteggio scansiona tutte le righe del filtro per ogni pagina: accettabile per l'MVP; da misurare con migliaia di richieste.
- Cursore con filtri cambiati tra una pagina e l'altra: valido come posizione, `pageStart` si ricalcola con i filtri nuovi.
- Una pagina all'indietro vicino all'inizio può avere meno di `limit` righe (es. la pagina che inizia alla riga 2).

## File toccati e test

- File: `src/api/requests/history/cursor.ts` (nuovo), `requests.service.ts` (`getHistory` → `HistoryPage`), `history.mapper.ts` (`historyPage`), `requests.controller.ts`, `src/api/venues/staff/staff.controller.ts`, `staff.dto.ts` (`limit`, `cursor`, `ValidCursor`, `HISTORY_DEFAULT_LIMIT`/`MAX`), `test/api/history-pagination.test.ts` (nuovo).
- Test vecchi aggiornati con l'approvazione del proprietario (`history.test.ts`): le chiavi della risposta (2 punti), `limit=2` tolto dai parametri non ammessi (staff) e sostituito da `offset=2` (cliente), titolo del `describe`.
- Test: +25 nuovi (19 casi). Suite: base 453 → 488.
- Correzione di un mio test già approvato: l'isolamento tra clienti usava un cursore `n` che per la data escludeva la richiesta di m2; ora usa il cursore `p` dell'ultima pagina (stesso intento).
- Mutazioni: precisione del cursore ridotta ai millisecondi → il test dei microsecondi fallisce; tie-break sull'id tolto → i test di paginazione falliscono.

## Modifiche proposte ai documenti

### CODEBASE.md
Storici (`/venues/:venueId/requests/history`, `/requests/mine`): paginati a cursore, `limit` 1–100 (default 25), risposta `{ requests, total, pageStart, pageEnd, prevCursor, nextCursor }`; cursore in `requests/history/cursor.ts`; `getHistory` restituisce `HistoryPage`.

### BACKLOG.md
B19 (#16) → §8, 2026-11-27 (decisione sul totale: A+B). F12: frecce avanti/indietro al posto di «Carica altri», selettore 25/50/100, intervallo «1–50 su 122», frecce disabilitate con `prevCursor`/`nextCursor` nulli. Aggiornare il testo di B19 («Carica altri»).

## Lacune emerse e task suggerite

- Misurare il costo del conteggio con migliaia di righe (indice su `stamp_requests(venue_id, created_at, id)` se serve; nessuna migrazione in questa task).
- Il test «si combina con gli altri filtri» di B34 è debole (vedi report b34).

## Problemi di ambiente

Nessuno.

## Cosa ho capito e cosa no

Istruzioni chiare; la richiesta del proprietario ha cambiato il contratto dell'issue («Carica altri» → frecce con totale), commentato sulla #16.
