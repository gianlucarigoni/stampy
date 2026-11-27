# Report: b32 — B32 — Endpoint pubblico per il nome del locale nel login

- **Issue:** #71
- **Branch:** feat/b32-venue-public-name
- **Data:** 2026-11-27

## Obiettivo

Endpoint non autenticato che restituisce solo il nome del locale per la pagina di login (D3, L-4). Solo backend,
nessuna migrazione; il frontend (F9) resta fuori. Route, secchio separato e test confermati dal proprietario prima di scrivere codice.

## Decisioni e motivazioni

- **Route `GET /api/public/venues/:venueId` → `200 {name}`**, nuovo dominio `src/api/public/` (router, controller, service).
  Il prefisso `/public` rende visibile nel path il confine «non autenticato» (grep, regole WAF/rate limit a parte).
  Alternativa scartata: una route pubblica dentro `/api/venues/:venueId/...`, dove tutte le altre sono protette.
- **UUID malformato → stesso 404 dell'inesistente** (`VenueNotFoundError`, body `{error:"VenueNotFound", message:"Venue not found"}`).
  Il formato si controlla nel controller con `isUUID` e non con `validate(venueIdDTO)`, che darebbe 400 e farebbe
  distinguere i due casi; Postgres non vede mai un UUID invalido.
- **Rate limit per IP con secchio proprio**: `ipPublicRateLimit`, 60 richieste / 15 minuti. Il limiter è stato estratto in
  `buildIpRateLimit(window, max)`; `ipAuthRateLimit` ha gli stessi valori e lo stesso comportamento di prima (30 / 15 minuti).
  Stessa attivazione (produzione o `IP_RATE_LIMIT=on`), stesso 429 `TryLaterError`. Alternativa scartata: riusare
  `ipAuthRateLimit`, che avrebbe fatto consumare la quota dei codici a ogni caricamento della pagina di login.
- La risposta è mappata a mano: solo `{ name }`, mai `res.json(row)`; il cookie di sessione, se presente, è ignorato.
- Rischi di enumerazione (discussi con il proprietario): UUID v4 non indovinabili; il `venueId` sta già nell'URL pubblico del
  tag/QR; nessun endpoint di elenco; 404 indistinguibili; il rate limit frena la raffica da un IP ma non è la difesa principale.

## Assunzioni e cose da validare

- **Limite di 60 richieste / 15 minuti da validare in staging** (carico reale della pagina di login, NAT condivisi).
- Dietro proxy il limiter dipende da `TRUST_PROXY` (come per `/auth/email/*`): da verificare al primo deploy.
- Nessuna cache HTTP (`Cache-Control`) sulla risposta: scelta non fatta, eventuale decisione per F9.

## File toccati e test

- File: `src/api/public/public.{router,controller,service}.ts` (nuovi), `src/api/routes.ts`,
  `src/utils/middlewares/ip-rate-limit.middleware.ts` (estratta `buildIpRateLimit`, nuovi `ipPublicRateLimit` e
  `IP_PUBLIC_RATE_LIMIT_MAX`), `test/api/public-venue.test.ts`, `test/api/public-venue-rate-limit.test.ts` (nuovi).
- Test: 9 aggiunti (8 in `public-venue.test.ts`, 1 in `public-venue-rate-limit.test.ts`), tutti rossi prima del codice
  (nel test del 404 malformato ho aggiunto, ancora in rosso, l'asserzione `error === "VenueNotFound"` perché il confronto
  tra body passava per caso con il 404 di route non trovata). Totale: base di `verify.sh` 401; suite dopo B38 425 → dopo B32 434.
- Il test di unità n. 8 della proposta («il nome si legge dalla colonna name») non è stato scritto: non esiste una funzione pura
  da testare (la query è nel service, coperta dai test API); l'ho dichiarato condizionale nella proposta.

## Modifiche proposte ai documenti

### CODEBASE.md
Tabella degli endpoint: «`GET /api/public/venues/:venueId` — **pubblico, non autenticato** — `200 {name}`; UUID inesistente
o malformato → 404 `VenueNotFound`; limiter per IP `ipPublicRateLimit` (60 richieste / 15 minuti, secchio separato da quello
di `/auth/email/*`). Dominio `src/api/public/`». Nella sezione dei rate limit (CONTEXT §5.6 / CODEBASE): aggiungere il
secondo limiter per IP e `buildIpRateLimit`.

### BACKLOG.md
B32 (#71): fatta il 2026-11-27 (backend); resta F9 (frontend). Nuova voce da valutare: validare in staging il limite di 60 /
15 minuti dell'endpoint pubblico.

## Lacune emerse e task suggerite

Nessuna.

## Problemi di ambiente

Nessuno.

## Cosa ho capito e cosa no

Istruzioni chiare. La skill `new-endpoint` cita ancora `scripts/` per i test (obsoleto: i test sono in `test/api/`); ho seguito `AGENTS.md`.
