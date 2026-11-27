# Report: b33 — B33 — Nome del premio nello storico

- **Issue:** #72
- **Branch:** feat/b33-history-reward-name
- **Data:** 2026-11-27

## Obiettivo

Aggiungere `reward` (nome del premio) alle righe dei due storici (`GET /venues/:venueId/requests/history`, `GET /requests/mine`) per le richieste `approved` con premio consumato. Nessuna modifica alla coda (D29).

## Decisioni e motivazioni

- Il nome si legge da `promotions.config->>'reward'` con join sulla promozione dell'evento `redeem` della richiesta (`stamp_events.promotion_id`). L'issue indicava «la promozione attiva per una card su promozione cambiata»: la conferma scrive l'evento con la promozione attiva in quel momento, quindi il risultato coincide con la regola dell'issue, ma resta stabile se il locale cambia promozione dopo (la card, invece, avrebbe già il nome nuovo). Scartata: join su `cards.promotion_id` (darebbe il nome sbagliato nello storico dopo un cambio).
- `reward` è sempre presente: stringa se `approved` con `rewardsRedeemed > 0`, altrimenti `null` (stessa scelta di `displayName` in B39).
- Nessun ricalcolo della regola dei timbri: la presenza del premio è la presenza dell'evento `redeem`.
- La coda non cambia; un test lo blocca (verificato per mutazione: aggiunto `reward` alla riga della coda, il test fallisce; ripristinato).

## Assunzioni e cose da validare

- Più eventi `redeem` per richiesta usano la stessa promozione (una sola conferma, una sola promozione attiva): la sottoquery prende il primo per `idempotency_key`.
- Resta da confermare in dev che serva il nome anche nello storico dello staff (l'issue lo lasciava aperto): c'è, a costo zero, e F12 può ignorarlo.

## File toccati e test

- File: `src/api/requests/requests.service.ts`, `src/api/requests/history.mapper.ts`, `test/helpers/fixtures.ts` (`replaceActivePromotion`), `test/api/history-reward.test.ts` (nuovo), `test/api/history.test.ts` e `test/api/staff-customer-name.test.ts` (tre elenchi di campi attesi: aggiunto `reward`, approvato dal proprietario).
- Test: +9 nuovi. Suite: base 401 → 444 (la base è ferma a B30; il resto arriva da B31 e B39 già in `main`).

## Modifiche proposte ai documenti

### CODEBASE.md
Nelle righe di `history` e `mine`: campo `reward` (`string | null`), dal nome del premio della promozione dell'evento `redeem`; mai nella coda.

### BACKLOG.md
B33 (#72) → §8, 2026-11-27: `reward` nei due storici; la coda invariata (D29). Frontend F12.

## Lacune emerse e task suggerite

Nessuna.

## Problemi di ambiente

Nessuno.

## Cosa ho capito e cosa no

Istruzioni chiare. La frase dell'issue sulla «promozione attiva» è stata interpretata come sopra (stesso risultato, più stabile).
