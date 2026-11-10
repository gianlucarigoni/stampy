# Report: c7 — Il 409 di visit non è coperto da test

- **Issue:** #21
- **Branch:** fix/c7-visit-409-test
- **Data:** 2026-11-10

## Obiettivo

Coprire con test il 409 di `visit` (`venues.controller.ts`, ramo "race" dopo `newRequest` → `null`), che nel codice c'è ma non era esercitato da nessun test.

## Decisioni e motivazioni

- La race si simula con `vi.spyOn` su `requestSrv.newRequest` (e `getPendingRequest`), non con vere richieste concorrenti. Motivo: le vere race sono non deterministiche (flaky). Il resto del flusso gira su DB reale. Segue la pratica già in uso nei test (`walletSrv.updateCard`, `venueSrv.getActivePromotion`). Alternativa scartata: modificare il codice di produzione per renderlo iniettabile (non necessario).
- Aggiunto anche il ramo gemello (race persa ma pendente del vincitore presente → 200, non 409), prima non coperto (proposto e approvato).
- Nessuna modifica al codice di produzione, nessuna migrazione.
- Il "rosso" del TDD è stato sostituito da una verifica per mutazione: cambiando temporaneamente 409 → 500 nel controller, 2 dei 3 test falliscono (`expected 500 to be 409`); poi ripristinato (`git diff` mostra solo il test).

## Assunzioni e cose da validare

- Il body del 409 è `{ message }`: confermato dai test.
- Il terzo test non fallisce con la mutazione (copre il ramo 200, non il throw): è corretto, non è un test debole.
- Il test 3 inserisce la pendente con SQL diretto (`INSERT INTO stamp_requests …`): dipende dalle colonne `card_id, venue_id, status, expires_at` e dai default delle altre.

## File toccati e test

- File: `stampy-backend/test/api/visit-polling.test.ts` (import `afterEach`, `vi`, `requestSrv`; nuovo `describe("race su newRequest")`).
- Test: +3. Totale suite prima 234 → dopo 237 (`/verify`: typecheck pulito, ✔ 237 ✘ 0).

## Modifiche proposte ai documenti

### CODEBASE.md
§7: `visit-polling.test.ts` ora include 3 test sulla race di `newRequest` (409 e ramo 200); totale 237.

### BACKLOG.md
Segnare come fatta la voce C7 (§8, 2026-11-10).

## Lacune emerse e task suggerite

Nessuna.

## Problemi di ambiente

Nessuno. `worktree-start.sh` e `/verify` sono andati a buon fine al primo tentativo. Nota minore: il comando `grep --include=*.ts` in zsh dà "no matches found" senza virgolette (errore mio, non dell'ambiente).

## Cosa ho capito e cosa no

- AGENTS.md e il prompt erano chiari. Unica ambiguità: il TDD "rosso" non ha senso per test su codice già esistente; ho assunto che la verifica per mutazione lo sostituisca (e l'ho dichiarato nella proposta).
- Assunzione: non serve un test sul 429, già coperto altrove.
- Nessuna domanda aperta.
