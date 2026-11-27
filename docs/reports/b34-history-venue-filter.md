# Report: b34 — B34 — Filtro per locale sullo storico del cliente

- **Issue:** #73
- **Branch:** feat/b34-history-venue-filter
- **Data:** 2026-11-27

## Obiettivo

Parametro opzionale `venueId` (UUID) su `GET /requests/mine`, solo cliente (D21, F5 opzione 3). Lo storico dello staff non cambia.

## Decisioni e motivazioni

- **Un locale senza card del cliente dà `404` «Venue not found»**, identico per locale altrui, locale senza card e UUID inesistente (regola di `AGENTS.md`). Il testo dell'issue #73 e di BACKLOG B34 diceva invece «nessuna riga, nessun 404 distinguibile»: seguita l'istruzione del proprietario e `AGENTS.md`. **Proposta: correggere il testo dell'issue e di B34.** L'alternativa (elenco vuoto) sarebbe stata ugualmente sicura.
- La verifica è in SQL (`cards.user_id` + `venue_id`) in `getHistory`; poi `stamp_requests.venue_id = venueId` nel `WHERE`. Lo scope `cards.user_id` non cambia.
- `venueId` vive in `mineQueryDTO` (estende `historyQueryDTO`); la route dello staff usa ancora `historyQueryDTO` e rifiuta `venueId` con `400` (`forbidNonWhitelisted`). Scartato: un solo DTO con controllo del ruolo nel service.
- Riuso di `VenueNotFoundError` (404, handler già registrato): nessuna classe nuova.

## Assunzioni e cose da validare

- Un locale archiviato in cui il cliente ha una card si può filtrare (lo storico non esclude gli archiviati, a differenza di `GET /cards/mine`, B30). Da decidere con F12 se il filtro deve nasconderli.
- Il test «si combina con gli altri filtri» passa anche senza il filtro `venueId` (mutazione provata): nel seed la sola richiesta `approved` è in A. Va rafforzato con una richiesta `approved` anche in B (non fatto: test approvato).

## File toccati e test

- File: `src/api/requests/requests.service.ts`, `requests.router.ts`, `requests.controller.ts`, `src/api/venues/staff/staff.dto.ts` (`mineQueryDTO`), `test/api/history-venue-filter.test.ts` (nuovo).
- Test: +11 (10 casi, uno con `it.each`). Suite: base 444 → 464 (base ferma a B33 in `main` il 2026-11-27; il resto arriva da altre task già unite).
- Rosso verificato prima del codice (5 fallimenti con `400`); mutazione del filtro → il test 2 fallisce.

## Modifiche proposte ai documenti

### CODEBASE.md
`GET /requests/mine` accetta anche `venueId` (UUID, `mineQueryDTO`); un locale in cui il cliente non ha card → `404 Venue not found`, uguale per locale inesistente. La route dello staff non lo accetta (`400`).

### BACKLOG.md
B34 (#73) → §8, 2026-11-27. Correggere il testo di B34 e dell'issue: «404» e non «nessuna riga».

## Lacune emerse e task suggerite

Rafforzare il test sul filtro combinato (vedi sopra).

## Problemi di ambiente

Nessuno.

## Cosa ho capito e cosa no

L'issue e l'istruzione della task erano in contrasto sul 404; deciso con il proprietario.
