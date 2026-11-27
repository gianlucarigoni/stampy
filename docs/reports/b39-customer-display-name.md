# Report: b39 — B39 — Nome del cliente nella coda e negli storici dello staff (backend)

- **Issue:** #86
- **Branch:** feat/b39-customer-display-name
- **Data:** 2026-11-27

## Obiettivo

Aggiungere `displayName` (nome completo / username del cliente, D30) alle righe di `GET /venues/:venueId/requests` e dei due storici (`GET /venues/:venueId/requests/history`, `GET /requests/mine`). Mai l'email, nessuna migrazione.

## Decisioni e motivazioni

- `displayName` è **sempre presente**; vale `null` per utente anonimizzato o senza nome (forma della risposta stabile; l'issue ammetteva anche «assente»). Il frontend (F11, F12) mostra il ripiego.
- Il nome si legge con un `innerJoin` su `users` (via `cards.user_id`) in `getHistory` e `getPendingQueue`; un solo punto di mappatura (`historyRow`) per i due storici, quindi anche `GET /requests/mine` porta il nome del cliente stesso (servizio e mapper sono condivisi, F5). Scartato: mapper separato per il cliente, perché sarebbe codice in più senza beneficio.
- Isolamento invariato: lo scope in SQL (`venueId` / `cards.user_id`) non cambia.

## Assunzioni e cose da validare

- Per un utente anonimizzato `account.service.ts` azzera `display_name`: il test lo simula con la stessa UPDATE (l'email resta nella fixture solo per la pulizia).
- Da guardare a vista in F11/F12 la resa del ripiego.

## File toccati e test

- File: `src/api/requests/requests.service.ts`, `src/api/requests/history.mapper.ts`, `test/helpers/fixtures.ts` (`displayName` anche `null`), `test/api/history.test.ts` (due elenchi di campi attesi: aggiunto `displayName`, approvato dal proprietario), `test/api/staff-customer-name.test.ts` (nuovo).
- Test: +10 nuovi (coda 5, storico staff 4, storico cliente 1). Suite: base 401 → 425 (la base è ferma a B30; il resto della differenza arriva dai test di B31 già in `main`).

## Modifiche proposte ai documenti

### CODEBASE.md
Nelle risposte di coda, `history` e `mine`: campo `displayName` (`string | null`), da `users.display_name` con join su `cards.user_id`; mai l'email.

### BACKLOG.md
B39 (#86) → §8, 2026-11-27: `displayName` nella coda e nei due storici; frontend F11/F12 sbloccabile per questa parte.

## Lacune emerse e task suggerite

- Nessun controllo automatico che `displayName` non finisca in log: la regola «mai dati personali nei log» resta a vista.

## Problemi di ambiente

Nessuno.

## Cosa ho capito e cosa no

Istruzioni chiare. Il comando `gh issue view` senza `--json` fallisce (Projects classic deprecato): usato `--json`.
