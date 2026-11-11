# Report: b5 — B5 — Login con Google (POST /api/auth/google)

- **Issue:** #5
- **Branch:** feat/b5-google-login
- **Data:** 2026-11-11

## Obiettivo

Implementare il backend del login con Google: `POST /api/auth/google` con body `{idToken}`. Verifica del token con `google-auth-library`, ricerca per `(google, sub)`, collegamento a un utente esistente con la stessa email, creazione dell'utente, sessione e cookie, eventi di audit. Solo backend: il pulsante nel frontend e la prova con un token vero di Google restano da fare (V4).

## Decisioni e motivazioni

- **Regola dell'email decisa dal proprietario il 2026-11-11, diversa da `CONTEXT.md` §5.3 (che dice «email di terzi: rifiutato»).** Non si filtra per dominio: decide Google tramite `email_verified`.
  - `email_verified` falso → 403 `GoogleEmailRejected` + evento `google_untrusted_email_rejected`, per qualunque dominio.
  - `email_verified` vero, nessun utente con quell'email → account nuovo e accesso, **anche con email di terzi** (es. `libero.it`).
  - `email_verified` vero, email di un utente esistente → collegamento automatico solo se `@gmail.com` oppure `hd` presente (come in §5.3); altrimenti 403 con l'invito a usare il codice via email. Motivo: Google stessa scrive che per un indirizzo non Gmail e senza `hd` non è autorevole (la proprietà può essere cambiata dopo la verifica). Alternativa scartata: collegare sempre se `email_verified`, perché darebbe a chi possiede oggi quell'indirizzo l'accesso a un account esistente con i suoi timbri.
- **L'identità è `sub`**, non l'email: se il `sub` è già noto si entra nello stesso utente anche se l'email del token è cambiata.
- **Verifica del token in `GoogleTokenService`** (client iniettato): i test API la simulano con `vi.spyOn(googleTokenSrv, "verify")`, i test unit con un client finto. Mai il DB simulato.
- **`GOOGLE_CLIENT_ID` opzionale** in `env.ts`: se manca, `verify` lancia un `GenericError` 503 e gli altri worktree non si rompono.
- **Errori nuovi:** `InvalidGoogleToken` (401) e `GoogleEmailRejected` (403), con handler registrati prima di `genericErrorHandler`.
- **Eventi:** il rifiuto scrive `google_untrusted_email_rejected` fuori dalla transazione (altrimenti sparirebbe); il collegamento scrive `identity_linked`; l'accesso `login_success`. Nessun dato personale: l'email finisce solo in `subject_hash` (HMAC). I dati incoerenti (utente anonimizzato, altra identità google dello stesso utente) rifiutano con lo stesso 403 **ma senza evento**.
- **Concorrenza:** `INSERT ... ON CONFLICT DO NOTHING` su `users` e `auth_identities`; la richiesta perdente rilegge per `sub` e entra nello stesso utente.
- **Rate limit:** riuso `ipAuthRateLimit` (attivo solo in produzione o con `IP_RATE_LIMIT=on`). Non c'è un test, il limiter è spento nei test.
- **Normalizzazione dell'email** sia nel service sia nel controller (il vincolo `users_email_normalized_ck` darebbe 500).

## Assunzioni e cose da validare

- **Mai provato con un token vero di Google**: tutta la verifica è simulata. Da fare col pulsante GIS nel frontend (V4, `docs/google/google-sign-in-setup.md`).
- Forma di `getPayload()` e tipo di `email_verified` in `google-auth-library` v11: il codice usa `email_verified === true`; i tipi compilano, il comportamento reale non è verificato.
- Un account Google creato con email di terzi è stato verificato da Google (codice all'indirizzo), ma Google non lo garantisce nel tempo. **Rischio di «pre-hijacking» da valutare:** chi controlla (anche solo per un periodo) una casella non Gmail, e ha un account Google con quell'indirizzo, può registrarsi con Google prima del vero titolare; se poi il titolare entra col codice via email, trova lo stesso utente, che resta raggiungibile anche dall'identità Google dell'altro. Il commento di `users.email` dice «verificata (OTP o IdP autorevole)». Probabilità bassa, ma è una scelta del proprietario: eventuali mitigazioni (es. non fidarsi dell'email di terzi se esiste già un'identità google con un altro `sub`, o riconfermare con il codice) non sono state costruite.
- `nonce` non gestito (decisione aperta, vedi `docs/google/google-sign-in-setup.md` §3): un ID token rubato è riusabile fino alla scadenza.
- Il token di sessione non viene mai restituito nel body (cookie `sid` da `sessionCookieOptions()`).

## File toccati e test

- Nuovi: `stampy-backend/src/api/auth/google/` (`google.router.ts`, `google.controller.ts`, `google.dto.ts`, `google-token.service.ts`, `google-email.ts`), `src/errors/invalid-google-token.error.ts`, `src/errors/google-email-rejected.error.ts`.
- Modificati: `src/api/auth/auth.router.ts` (monta `/google`), `src/api/auth/identity/identity.service.ts` (`loginWithGoogle`), `src/config/env.ts` (`GOOGLE_CLIENT_ID`), `src/errors/index.ts` (handler).
- Test: `test/unit/google-email.test.ts` (8), `test/unit/google-token.test.ts` (5), `test/unit/env-google.test.ts` (2), `test/api/google-login.test.ts` (25) → **40 nuovi** (36 approvati + 4, vedi sotto). Totale suite prima **295** → dopo **335**. Typecheck pulito.
- **Scostamenti dalla proposta approvata, tutti dichiarati:**
  1. +1 test unit: senza `GOOGLE_CLIENT_ID` → 503 (assunzione 3 approvata, mancava il test).
  2. +1 test unit su `env`: valore valorizzato passa invariato (il solo caso «stringa vuota» passava anche prima di scrivere il codice, quindi non era rosso).
  3. «Utente anonimizzato con la stessa email» **non è realizzabile**: l'anonimizzazione svuota l'email e cancella le identità. Sostituito da «identità google di un utente anonimizzato (dato incoerente) → 403 senza sessione e senza evento di rifiuto», più un test aggiunto: dopo l'anonimizzazione lo stesso `sub` e la stessa email creano un utente nuovo.
- Rosso: all'inizio tutti i file fallivano con «Cannot find module» (i moduli non esistevano), più un test su `env` fallito per l'assert sul valore. Verde dopo il codice; un solo test rosso (email maiuscola passata al controller) risolto normalizzando anche nel controller.

## Modifiche proposte ai documenti

### CODEBASE.md
- §3 Endpoint, nuova riga: `POST /api/auth/google` — pubblico, body `{idToken}` (stringa 1–4096), risponde 200 `{user:{id,email,displayName}}` con cookie `sid`; 401 `InvalidGoogleToken`; 403 `GoogleEmailRejected`; 503 se `GOOGLE_CLIENT_ID` non è configurato; limite IP come `/auth/email/*`.
- §2 Struttura: `api/auth/google/` (router, controller, dto, `google-token.service.ts`, `google-email.ts` con `classifyGoogleEmail`); `identity.service.ts` ha anche `loginWithGoogle`; errori `invalid-google-token.error.ts` e `google-email-rejected.error.ts`.
- §5 Flussi, «Login con Google»: verifica del token → `sub` noto: accesso; `sub` nuovo: `email_verified` obbligatorio; email libera → utente nuovo (anche email di terzi); email esistente → collegamento solo per Gmail o `hd`, altrimenti 403 e evento `google_untrusted_email_rejected`.
- §1/config: `GOOGLE_CLIENT_ID` (opzionale, non è un segreto).
- §7 Test: aggiungere i 4 file nuovi (totale 335).

### BACKLOG.md
- **B5:** spostare nel §8 con la data 2026-11-11 (parte backend). Restano aperti: pulsante «Accedi con Google» nel frontend, prova con token vero (V4 / #44), decisione sul `nonce`, valutazione del rischio di pre-hijacking.
- Nuova voce `TO-DECIDE`: mitigazione del pre-hijacking per account creati con Google e email di terzi.
- V4: aggiornare con lo stato (client ID creato 2026-11-11; origini JavaScript per ogni porta del frontend).

### CONTEXT.md (solo il proprietario)
§5.3 va riscritta: l'email di terzi **non** è più rifiutata se verificata da Google; il collegamento automatico a un utente esistente resta solo per Gmail o `hd`. La frase «accettarle richiederà una migrazione additiva» non serve: nessuna migrazione è stata necessaria.

## Lacune emerse e task suggerite

- Pulsante GIS nel frontend (Vue) e prova su telefono reale.
- Aggiungere `GOOGLE_CLIENT_ID` al `.env` principale e a quelli dei worktree (non committato).
- Evento di audit per i rifiuti «incoerenti» (oggi senza evento) e per l'accesso a un `sub` noto con `email_verified` falso (oggi ammesso).
- Salvare `displayName` dal claim `name` (decisione del proprietario: «per ora no»).

## Problemi di ambiente

Nessuno. `worktree-start.sh` ha funzionato al primo tentativo (slot 1: api 3001, web 5174). Nota: `npm run typecheck:all` esiste solo in `stampy-backend/`, non alla radice come scrive `AGENTS.md` (Comandi).

## Cosa ho capito e cosa no

- `AGENTS.md` dice che `typecheck:all` si lancia dalla radice del worktree: nel repo è in `stampy-backend/package.json`.
- Il rifiuto delle email di terzi è stato rivisto dal proprietario a metà task: ho riscritto la proposta dei test e ottenuto l'approvazione prima del rosso.
- Il testo del 403 («usa il codice via email») è scritto dall'agente, da approvare.
- Non so se `CONTEXT.md` §5.3 intendesse davvero una migrazione per accettare le email di terzi: con questo disegno non è servita.
