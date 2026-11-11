# Login con Google: checklist di configurazione e verifica (V4 / B5)

> **Stato al 2026-11-11.** Il login con Google è implementato (B5, backend e frontend, §8 del `BACKLOG.md`) e provato a mano con account veri. Questo documento resta la guida di configurazione e l'elenco di ciò che non è verificato. **Due differenze rispetto a quanto scritto sotto**: (1) le email di terzi (non Gmail, senza `hd`) non sono più rifiutate se Google le dichiara verificate: creano un account nuovo; il collegamento a un utente già esistente resta solo per Gmail o `hd`; (2) il `nonce` e il rischio di «pre-hijacking» sono la voce B25 del backlog. I punti `UNVERIFIED` del §6 sono tracciati in V4.

Questo documento prepara la voce **B5** del backlog (`POST /api/auth/google`, body `{idToken}`) e risponde alla voce **V4** (client ID, schermata di consenso, requisiti di verifica, come ottenere un ID token nei test). Non contiene codice: è la checklist da seguire prima del TDD e l'elenco di ciò che resta `UNVERIFIED`.

**Avvertenza sulle fonti.** Le pagine sono state lette il 2026-11-11 tramite ricerche web che restituiscono un riassunto, non le pagine intere: le parole sono parafrasate e i punti critici vanno riletti sugli originali prima di basarci una decisione. Ciò che è un'inferenza o non è documentato è marcato `UNVERIFIED`.

## 1. Che cosa serve da Google (azioni del proprietario)

Il flusso è «Sign in with Google» (Google Identity Services): il browser ottiene un **ID token** (un JWT firmato da Google) e lo manda al backend, che lo verifica. Non servono né client secret né redirect URI, perché non si usa il flusso a codice di autorizzazione ([setup GIS](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)).

- [ ] **Progetto Google Cloud.** Si può usare un progetto nuovo o quello già usato per il Wallet. Il service account del Wallet non c'entra con questo flusso. Scelta da fare: progetto separato o condiviso (nessuna decisione in `CONTEXT.md`; separato isola le quote e i permessi, condiviso è più semplice da gestire).
- [ ] **Schermata di consenso** (Google Auth Platform → Branding / Audience). Nome dell'app, email di assistenza, e (per la produzione) logo, pagina iniziale, link a informativa sulla privacy e condizioni. I requisiti esatti dei link e del logo per un'app che chiede solo `openid`, `email` e `profile` sono `UNVERIFIED`: leggere [Manage OAuth App Branding](https://support.google.com/cloud/answer/10311615).
- [ ] **Tipo di utenti: External.** *Internal* vale solo per un'organizzazione Workspace e non va bene per i clienti di un locale ([Manage App Audience](https://support.google.com/cloud/answer/15549945)).
- [ ] **Client ID di tipo «Web application»** (Clients → Create client). Il client ID **non è un segreto**: va nella pagina del frontend e nella configurazione del backend ([setup GIS](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)).
- [ ] **Authorized JavaScript origins.** Solo schema e host (con porta se serve), senza percorso, **senza wildcard**. Per i test locali la guida chiede sia `http://localhost` sia `http://localhost:<porta>`. Una porta per ogni frontend: ogni worktree ha la sua (`5173+N`, vedi `AGENTS.md`), quindi va aggiunta a mano (o si fa il test Google sempre dalla stessa porta). In produzione l'origine HTTPS vera, la stessa di `APP_ORIGIN`.
- [ ] **Redirect URI.** Non servono per il pulsante in modalità popup / One Tap; contano solo per il flusso a codice con `ux_mode: redirect` ([setup GIS](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)).
- [ ] **Scope:** solo `openid`, `email`, `profile` (quelli predefiniti del login). Nessuno scope aggiuntivo, altrimenti cambiano le regole di verifica (§2).
- [ ] **Stato di pubblicazione** (Audience): vedi §2.

## 2. Verifica dell'app e limite di utenti

Dalla pagina [Manage App Audience](https://support.google.com/cloud/answer/15549945):

- In stato **Testing** il limite è **100 utenti di test** elencati nella schermata di consenso, e le autorizzazioni scadono dopo 7 giorni. **Eccezione**: se l'app chiede solo `openid`, `email` e `profile` (o usa Sign in with Google per autenticare), gli utenti **non devono essere nell'elenco, non vedono avvisi e le autorizzazioni non scadono dopo 7 giorni**.
- In stato **In production** l'app è disponibile a qualunque account Google. L'avviso «app non verificata» e il tetto di 100 utenti riguardano le app che chiedono **scope sensibili o riservati**.
- *Inferenza (`UNVERIFIED` come regola esplicita per questo caso):* un'app che chiede solo `openid`, `email`, `profile` non dovrebbe richiedere la verifica né scontrarsi col tetto. Conferma da cercare in [When is verification not needed](https://support.google.com/cloud/answer/13464323) e nelle [FAQ sulla verifica](https://support.google.com/cloud/answer/9110914).
- Cosa implica per Stampy: si può sviluppare in *Testing* senza lista utenti, ma il passaggio a *In production* conviene farlo prima del primo cliente vero. Se per la produzione Google chiedesse una verifica del *branding* (logo, dominio), serve il dominio (P5): da controllare.

## 3. Come il backend deve verificare il token (B5)

Fonti: [Verify the Google ID token on your server side](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

- [ ] Usare `verifyIdToken()` di `google-auth-library` (già installata) passando il **client ID come `audience`**: la libreria controlla firma, `aud`, `iss` ed `exp`. Un `audience` configurato male rende il controllo inutile: il client ID deve stare in configurazione (`env.ts`), mai ricavato dal token.
- [ ] **L'identità è `sub`**, non l'email. Google avverte che un account può avere più indirizzi email nel tempo. In `auth_identities`: `provider = 'google'`, `provider_user_id = sub`, `email_at_provider` = email normalizzata (lo schema ha già i vincoli).
- [ ] **Collegamento a un utente esistente con la stessa email** (regola già decisa in B5): solo se l'email termina in `@gmail.com`, oppure se `email_verified` è vero **e** c'è il claim `hd` (account Workspace). Google lo dice espressamente: con `email_verified` vero e `hd` presente è un account Workspace; con un'email non `@gmail.com` e senza `hd` Google **non è autorevole** per quell'indirizzo, e raccomanda altre verifiche. È ciò che B5 fa con `google_untrusted_email_rejected`.
- [ ] **`email_verified` non basta da solo**: Google precisa che può restare vero anche se la proprietà dell'indirizzo di terzi è cambiata dopo la verifica iniziale.
- [ ] Il claim `hd` va letto dal token verificato; il valore passato dal client (per esempio per l'interfaccia) non conta.
- [ ] `tokeninfo` è un endpoint per il debug: non usarlo in produzione.
- [ ] Dettagli del payload restituito da `verifyIdToken` in Node (forma di `getPayload()`, tipo di `email_verified`): `UNVERIFIED` qui, controllare la documentazione di `google-auth-library` / i tipi installati. (`tokeninfo` restituisce `email_verified` come stringa; il JWT lo dà come booleano.)

### Domanda aperta, da decidere prima dei test: il `nonce`

La documentazione del JS reference descrive il `nonce` come stringa casuale usata dall'ID token per prevenire attacchi di replay, e l'OpenID Connect reference dice che presentarlo una sola volta aiuta a evitarli. **`verifyIdToken` non lo controlla**: toccherebbe al codice emettere un nonce monouso, legarlo al browser e confrontarlo col claim `nonce` del token (inferenza dall'elenco dei controlli documentati; esiste un'implementazione comunitaria di questo schema, non una guida ufficiale). B5 non lo prevede. Il rischio che copre: un ID token rubato (log, estensione, proxy) e riusato per aprire una sessione finché non scade. Va deciso se è necessario per l'MVP; poiché tocca una decisione di sicurezza, è del proprietario e la tengo fuori dal codice finché non si decide. Proposta: nonce **no** al primo giro, ma annotato come residuo.

## 4. Lato frontend (non in TDD)

- [ ] Caricare lo script GIS da `https://accounts.google.com/gsi/client` e inizializzare il pulsante col client ID ([Display the button](https://developers.google.com/identity/gsi/web/guides/display-button)). Il client ID arriva da variabile d'ambiente di Vite, non scritto nel codice.
- [ ] Il token arriva nel campo `credential` della callback JS ([JS reference](https://developers.google.com/identity/gsi/web/reference/js-reference)). Con la modalità popup la callback riceve la risposta direttamente; il cookie `g_csrf_token` con confronto «double submit» riguarda la modalità con `login_uri` (POST del browser al backend), che qui non si usa: `UNVERIFIED`, rileggere la guida.
- [ ] Il frontend manda `{idToken}` a `POST /api/auth/google` con la stessa configurazione dei cookie dell'altro login; la risposta non contiene mai il token di sessione (regola del progetto).
- [ ] Dopo il login restano valide le regole attuali: il cliente arriva dalla pagina del locale, quindi serve che il ritorno alla pagina di partenza funzioni come nel flusso a codice.
- [ ] Verificare la **Content-Security-Policy** (se c'è) per consentire `accounts.google.com`, e che Safari/ITP non blocchino il pulsante: `UNVERIFIED`, da provare su telefono reale (vedi V8).

## 5. Come ottenere un ID token nei test (risposta a V4)

| Livello | Come | Stato |
|---|---|---|
| Test automatici del backend | Non si chiama Google: si simula la funzione di verifica con `vi.spyOn` sul servizio e si restituisce un payload scelto (`sub`, `email`, `email_verified`, `hd`). Vale la regola del repo: niente mock del DB, spy ammesso su una funzione di servizio, da dichiarare nella proposta dei test. | Fattibile subito, senza configurazione Google. |
| Test manuale con un token vero | Dal pulsante GIS nel frontend: la `credential` si legge nella console / nella richiesta di rete e si può riusare per `curl` finché non scade. | Richiede il client ID e il frontend. Durata del token e orari: `UNVERIFIED`. |
| OAuth 2.0 Playground | Funziona solo con un client «Web application» che abbia `https://developers.google.com/oauthplayground` fra i redirect URI e con «Use your own OAuth credentials» ([guida](https://developers.google.com/google-ads/api/docs/oauth/playground)). **Se restituisca un `id_token` con `aud` uguale al nostro client ID è `UNVERIFIED`**: nessuna pagina letta lo dice. | Da provare solo se serve un token senza il frontend. |
| Token falsi | Un JWT firmato in locale non passa `verifyIdToken` (la firma viene verificata coi certificati di Google): serve solo per i test di rifiuto (token malformato, firma errata). | Si può fare senza Google. |

## 6. Elenco `UNVERIFIED` e aperti

| # | Voce | Dove cercarla |
|---|---|---|
| 1 | Un'app con soli `openid`/`email`/`profile` in produzione non richiede verifica né tetto | [When is verification not needed](https://support.google.com/cloud/answer/13464323) |
| 2 | Requisiti di branding (logo, pagina iniziale, informativa) per la produzione | [Manage OAuth App Branding](https://support.google.com/cloud/answer/10311615) |
| 3 | Forma esatta del payload e tipi di `verifyIdToken` in `google-auth-library` v11 | Tipi installati / README della libreria |
| 4 | Ruolo del cookie `g_csrf_token` nella modalità popup/callback | [Verify the Google ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token) |
| 5 | Il Playground restituisce un `id_token` col nostro `aud`? | Prova pratica |
| 6 | Durata di validità dell'ID token e tolleranza sull'orologio (`exp`) | Doc OpenID Connect / libreria |
| 7 | Nonce: serve per l'MVP? | Decisione del proprietario (§3) |
| 8 | Progetto Google Cloud: separato o condiviso col Wallet | Decisione del proprietario |
| 9 | Comportamento di One Tap / FedCM sui browser dei clienti (Safari iOS, Chrome Android) | Prova su telefono reale |

## 7. Ordine proposto

1. Il proprietario fa la configurazione del §1 (client ID, schermata di consenso, origini) e mi passa **solo il client ID** (non è un segreto, ma non va in log o issue pubbliche senza motivo).
2. Chiudere le voci 1, 2, 3 e 4 del §6 sulle pagine originali.
3. Decidere nonce (7) e progetto (8).
4. Parte il TDD di B5: proposta dei test nel worktree (verifica con spy, collegamento per `@gmail.com`, `hd`, email di terzi rifiutata, `sub` già noto, idempotenza, rate limit, eventi di audit senza dati personali), poi rosso, verde, refactoring.
5. Frontend (fuori dal TDD) col pulsante, poi prova su telefono reale.
