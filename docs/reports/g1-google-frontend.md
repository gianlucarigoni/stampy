# Report: g1 — google-frontend

- **Issue:** nessuna (B5, #5, è già chiusa; V4, #44, resta aperta per la prova con token vero)
- **Branch:** feat/g1-google-frontend
- **Data:** 2026-11-11

## Obiettivo

Aggiungere alla pagina di login il pulsante «Continua con Google», che manda l'ID token a `POST /api/auth/google` (B5, già in `main`). Solo frontend; fuori dal TDD (AGENTS.md: il frontend è escluso).

## Decisioni e motivazioni

- **Google Identity Services caricato solo nella pagina di login** (`utils/googleIdentity.ts`): il resto dell'app non parla con Google. Lo script si carica la prima volta che il pulsante compare; se il caricamento fallisce (offline, blocco pubblicità) il pulsante sparisce e resta il login con il codice via email. Alternativa scartata: caricare lo script in `index.html`, cioè su ogni pagina.
- **Modalità popup** (`ux_mode: 'popup'`) con il pulsante disegnato da Google (`renderButton`): niente redirect e quindi niente `login_uri` né cookie `g_csrf_token`, che servono solo per la modalità con POST del browser al backend. Niente One Tap né `auto_select` (non richiesti, e meno sorprendenti sul telefono di un cliente).
- **Client ID da `VITE_GOOGLE_CLIENT_ID`**: se manca, il componente non mostra nulla. Il valore sta in `stampy-frontend/.env.local` (ignorato da git; non è un segreto ma non serve nel repository).
- **Errori:** il 403 mostra il messaggio del backend («…usa il codice via email»), il 401 «Accesso con Google non riuscito, riprova», il 503 «Accesso con Google non disponibile: usa il codice via email». Dopo il login stessa destinazione dell'accesso con codice (`destinationAfterLogin`).
- **Un solo `initialize()` per client ID**: il callback passa da un gestore a livello di modulo, così rientrare nella pagina di login non registra più callback.
- Il pulsante compare solo nel primo passo (email), non nel passo «inserisci il codice».

## Assunzioni e cose da validare

- **Mai provato con un account Google vero**: verificato solo che lo script si carica, l'iframe di Google compare e il backend risponde 401 `InvalidGoogleToken` a un token falso. Da provare a mano (vedi sotto).
- **Origini autorizzate:** il client ID deve avere tra le «Origini JavaScript autorizzate» l'origine da cui si prova (`http://localhost:5174` per questo worktree; 5173 per la porta predefinita). Senza, Google mostra un errore nel popup.
- Larghezza del pulsante calcolata alla comparsa (200–400 px): su un telefono molto stretto o dopo una rotazione dello schermo non si ridisegna. Da vedere su telefono vero.
- Comportamento di Safari/ITP e dei blocchi dei popup sul telefono (V8, V6): non provato.
- La lingua del pulsante è fissa a `it`.

## File toccati e test

- Nuovi: `stampy-frontend/src/components/GoogleSignInButton.vue`, `stampy-frontend/src/utils/googleIdentity.ts`.
- Modificati: `stampy-frontend/src/components/EmailLogin.vue` (pulsante e `signInWithGoogle`), `stampy-frontend/src/api/endpoints.ts` (`googleLogin`), `stampy-frontend/env.d.ts` (tipo di `VITE_GOOGLE_CLIENT_ID`).
- Test: nessuno aggiunto (frontend fuori dal TDD, e la verifica reale richiede un account Google). `vue-tsc` e `vite build` passano. Backend non toccato: totale 335 → 335.
- Verifica a mano fatta: login in un browser headless a `http://localhost:5174/login`, iframe di Google presente, schermata controllata.

## Modifiche proposte ai documenti

### CODEBASE.md
- §2 Frontend: `components/GoogleSignInButton.vue` (pulsante, solo se c'è `VITE_GOOGLE_CLIENT_ID`) e `utils/googleIdentity.ts` (carica lo script GIS, un solo `initialize()`, `renderButton`).
- §1/config frontend: `VITE_GOOGLE_CLIENT_ID` in `stampy-frontend/.env.local` (opzionale; assente = nessun pulsante).
- §5 Flussi, login: dal pulsante Google il frontend chiama `POST /auth/google` con l'ID token e poi segue lo stesso percorso del login con codice.

### BACKLOG.md
- V4 (#44): aggiornare con la parte frontend fatta; restano la prova con account vero e su telefono.
- Nuova voce: il pulsante non si ridisegna al cambio di larghezza; lingua fissa `it`.

## Lacune emerse e task suggerite

- Prova a mano con un account Google (Gmail e, se possibile, non Gmail) e su telefono vero.
- Aggiungere l'origine di produzione (HTTPS) tra le origini autorizzate quando c'è il dominio (P5).
- Test e2e del flusso con il pulsante: servirebbe un modo di simulare il popup di Google (non fatto).
- Nonce e rischio di pre-hijacking (già nel report di B5).

## Problemi di ambiente

Nessuno. Per provare in locale ho aggiunto `GOOGLE_CLIENT_ID` al `.env` del backend del worktree e `VITE_GOOGLE_CLIENT_ID` a `stampy-frontend/.env.local` (entrambi non committati). `docs/google/google-sign-in-setup.md` è ancora non committato nella cartella principale.

## Cosa ho capito e cosa no

- La task non ha una issue propria: B5 è chiusa e V4 non va chiusa, quindi `worktree-finish.sh` non ha una issue da portare in `Done`.
- Non so se in produzione serva una Content-Security-Policy (non ce n'è una oggi): se si aggiunge, deve consentire `accounts.google.com`.
