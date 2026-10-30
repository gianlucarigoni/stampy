---
name: new-endpoint
description: Procedura per aggiungere o modificare un endpoint HTTP in stampy-backend (router, controller, service, DTO class-validator, middleware, classe di errore, documentazione). Usala ogni volta che l'utente chiede una nuova rotta/API, un nuovo handler, di esporre un'operazione, aggiungere un parametro o body a una rotta esistente, o un nuovo errore HTTP — anche se dice solo "fai che lo staff possa..." o "serve una chiamata per...".
---

# Nuovo endpoint in stampy-backend

Le regole stanno in `AGENTS.md`; qui c'è l'ordine in cui applicarle. Modello di riferimento
da copiare: `src/api/venues/venues.router.ts` + `staff/` (con ruoli) e `src/api/requests/` (semplice).

## 1. Dove va

- Un dominio = una cartella `src/api/<dominio>/`. File ausiliari in sottocartella
  (`venues/staff/staff.controller.ts`). Nuovo dominio → montalo in `src/api/routes.ts`.
- Nessun import tra router di domini diversi. Un service può importare un service di un
  altro dominio solo come dipendenza esplicita.

## 2. DTO (`<nome>.dto.ts`)

I DTO sono **classi class-validator** (non zod: zod è per `config/env.ts` e `utils/schemas/`).
`validate` usa `whitelist` + `forbidNonWhitelisted`, quindi ogni campo accettato deve avere
un decoratore.

```ts
import { IsUUID } from "class-validator";
export class requestIdDTO {
  @IsUUID()
  requestId: string;
}
```

Mai campi che il server deve decidere (quantità di timbri, ruolo, prezzi): li calcola il service.

## 3. Router — ordine middleware fisso

`rate limit -> isAuthenticated -> requireRole(...) -> validate(params) -> validate(body) -> controller`

```ts
router.post(
  "/:venueId/requests/:requestId/confirm",
  isAuthenticated,
  requireRole("owner", "staff"),
  validate(staffRequestParamsDTO, "params"),
  validate(confirmDTO, "body"),
  confirm,
);
```

Rate limit (`ipAuthRateLimit`) solo dove serve (auth/OTP). `requireRole` legge `venue_members`
a ogni richiesta: il `venueId` del path seleziona, non autorizza.

## 4. Controller

- `req: TypedAuthRequest<Body, Query, Params>`; utente con `requireAuth(req).user.id`.
- Tutto in `try { ... } catch (err) { next(err); }`.
- Risposta **mappata** campo per campo: mai `res.json(riga)`.
- Niente logica di dominio: chiama il service. Niente dati personali nei log.

## 5. Service

- Query Drizzle; per scritture multiple `db.transaction`, passando `Tx`/`DbOrTx` da `db/tx.ts`.
- Tempo: `now()`/`sql\`now()\`` del DB, mai `new Date()` per scadenze.
- Ogni UPDATE di stato filtra lo stato nel WHERE (es. `status = 'pending'`) e controlla
  quante righe ha toccato: è così che si evitano doppie conferme.
- Tipi solo da `db/types.ts`. Timbri: solo tramite `utils/stamps.ts`.
- Codice Google Wallet solo in `api/wallet/`.
- Se tocchi lo schema → usa la skill `db-migration`.

## 6. Errori

Errore ricorrente → nuovo file `src/errors/<nome>.error.ts` con classe + handler (copia
`request-not-found.error.ts`), poi aggiungi l'handler in `src/errors/index.ts` **prima** di
`genericErrorHandler`. Caso isolato → `new GenericError(msg, status)` con status sempre esplicito.

## 7. Chiudere

1. Test: aggiungi controlli allo script in `scripts/` del dominio (stesso formato `✔`/`✘`)
   o crea `scripts/<nome>.ts` copiando la struttura di uno esistente, con pulizia dei dati.
2. Lancia la skill `verify`. Se il conteggio cambia, aggiorna il totale atteso.
3. Aggiorna `docs/CODEBASE.md` (tabella endpoint). Se chiude un punto di `docs/BACKLOG.md`,
   spostalo in "Chiuso di recente". Nessun nuovo file in `docs/`.
