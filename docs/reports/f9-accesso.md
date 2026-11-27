# Report: f9 — F9 — Accesso: login, nome, elimina account

- **Issue:** #80
- **Branch:** feat/f9-accesso
- **Data:** 2026-11-27

## Obiettivo

Solo frontend (fuori dal TDD): portare nel codice le schermate A01–A12, N01–N03, E01–E04 del design system dir-i: login con codice
(codice morto, 429, rete), «Continua con Google» col bottone ufficiale, riga sulla privacy (D4), nome del locale (B32),
`/name` (D13, N-4), «Elimina account» (D19, D20), più B28 (4): il menu su `/name` non offre voci inutili.

## Decisioni e motivazioni

- **Google = bottone ufficiale visibile.** Tolta la «faccia» nostra con il bottone di Google trasparente sopra e scalato.
  `GoogleSignInButton.vue` ora chiama solo `renderButton` (`text: continue_with`, `size: large`, larghezza fino a 400 px,
  `theme: outline` in chiaro e `filled_black` in scuro, ridisegnato al resize e al cambio tema). La documentazione ufficiale
  (js-reference e guida «display-button», lette il 2026-11-27) conferma opzioni e `continue_with`; **non** dice nulla sul tema
  per il tema scuro (scelta nostra) né sull'altezza in pixel. L'altezza (40 px, `size: large`) è quella che si vede nei
  mockup/screenshot, **non** da documentazione: sotto i 44 px richiesti. Non si può ingrandire senza scalare il bottone di
  Google; lo spazio riservato è 44 px.
- **429:** il primario resta pieno e l'etichetta diventa «Riprova tra N min» (N in minuti, arrotondato per eccesso: cambia al
  più una volta al minuto, quindi niente nome accessibile che muta ogni secondo). L'avviso (`RateLimitAlert.vue`, nuovo) dice
  «Hai fatto troppe richieste» + «Riprova tra N min.»; il conto alla rovescia al secondo è sparito. Il tocco prima della
  scadenza dà «Aspetta ancora N min». In Elimina account, un 429 sulla conferma finale sostituisce il pulsante rosso con un
  secondario «Riprova tra N min» (come E03).
- **Errori di sistema** (`utils/systemError.ts`, nuovo): senza risposta → titolo «Connessione non riuscita» + cosa fare; con
  risposta del server resta il suo messaggio italiano letterale; altro → «Qualcosa non ha funzionato. Riprova tra un attimo.».
  Il campo resta neutro (N-4) ovunque.
- **Il codice non si cancella su errore di rete**: in Elimina account (D20, richiesto) **e anche nel login** (stessa logica,
  stessa schermata di codice). Si cancella solo su «codice non valido» / scaduto / tentativi finiti.
- **Codice morto**: «Accedi» (login) e «Elimina definitivamente…» (elimina) spariscono; resta un solo «Invia un nuovo codice» a
  tutta larghezza + «Cambia email»/«Torna al profilo». Il campo mostra «Codice non più valido» (tratteggiato).
- **Nome del locale**: `?next=/v/<uuid>` → `GET /api/public/venues/:id` (B32, `getPublicVenue`). Mentre carica c'è uno scheletro
  di riga; 404/rete → nessuna riga (ripiego). Salto di layout solo nel caso di fallimento.
- **Elimina account**: layout di §5.3 (avviso con «Non si può annullare.» in titolo; passo 1 neutro, non rosso, D19; «Torna al
  profilo» secondario, ≥ 16 px sotto; «Invia un nuovo codice» sopra il campo; rosso solo sul passo finale, sempre attivo, D20;
  uscita con rotta `profile`, non `router.back()`). I testi dell'avviso e «Per motivi sicurezza…» sono **invariati** (D18/B24),
  refusi compresi. Finché `GET /venues/mine` non risponde c'è uno scheletro: il blocco «membro» non fa più saltare la card.
- **B28 (4)**: su `/name` il menu offre solo «Esci» (`AppLayout.vue`). Aggiunta la freccia «Indietro» anche su
  `delete-account` (come nei mockup E01–E04), verso `profile`.
- **A11/A12**: `SessionErrorView` convertita a pagina di stato (icona + titolo + testo + «Riprova» + «Vai alla pagina
  iniziale»); la 404 ha il primario «Vai alla pagina iniziale» (era secondario). Piccolo allargamento, ma sono nell'elenco dei
  mockup da verificare.
- Scartato: privacy con link fisso o `#`. Un link morto è peggio di niente: il link compare **solo se è definita
  `VITE_PRIVACY_URL`**; senza, resta la frase. Manca quindi un URL dell'informativa (vedi lacune).

## Assunzioni e cose da validare

**Testi nuovi o cambiati (tutti proposte da confermare in dev):**
- Login: «Accedi per avere la tua card di {nome}.» (nuovo, mia proposta; non è nei mockup); suggerimento «Ti mandiamo un codice di
  6 cifre.»; segnaposto «nome@esempio.it»; «Usiamo la tua email solo per farti entrare. Leggi l'informativa sulla privacy»
  (D4, **testo da validare con un legale**); «Non arriva? Controlla anche lo spam.»; «Nuovo codice inviato.» (al posto di
  «Codice inviato a …»); «Ultimo tentativo.» (al posto di «Ti resta 1 tentativo»); «Codice non più valido» (campo morto).
- 429: «Hai fatto troppe richieste» / «Riprova tra N min.» / etichetta «Riprova tra N min» / «Aspetta ancora N min»
  (cambiato: prima «Troppi tentativi, riprova tra N secondi» sul nome).
- Rete: «Connessione non riuscita» + «Controlla la connessione. Se continua, riprova tra poco.»; sul codice «Riprova: il tuo codice
  è ancora valido.»; sul nome «Il nome non è stato salvato. Riprova tra poco.»; generico «Qualcosa non ha funzionato. Riprova tra un attimo.»
- Nome: segnaposto «Marta».
- Elimina: «Continua: invia il codice», «Torna al profilo», «Elimina definitivamente il mio account», «Qui il codice non si invia da
  solo.» (suggerimento del campo). Prima: «Invia il codice», «Annulla», «Elimina il mio account».
- Sessione/404: titolo «Connessione non riuscita» + «Controlla la connessione. Se continua, riprova tra poco.» + «Riprova» +
  «Vai alla pagina iniziale».
- Citati negli e2e, **invariati**: «Account eliminato. Puoi sempre rientrare con la tua email.», «Codice non valido. Ti restano N
  tentativi.», «Scrivi le 6 cifre.», «Controlla l'indirizzo: manca la @ o il dominio.», «Aspetta ancora …», messaggi del nome.

**Da validare:** altezza reale del bottone Google e suo anello di focus (iframe: non verificabile da noi); contrasto del bottone
`filled_black` sul fondo scuro; che il 429 sulla conferma finale esista davvero lato backend.

## File toccati e test

- Nuovi: `components/RateLimitAlert.vue`, `utils/systemError.ts`.
- Modificati: `components/EmailLogin.vue`, `GoogleSignInButton.vue`, `DisplayNameForm.vue` (condiviso col Profilo: stessi
  avvisi 429/rete e segnaposto, nessun cambio di API), `AppLayout.vue` (additivo), `views/DeleteAccountView.vue`,
  `SessionErrorView.vue`, `NotFoundView.vue`, `api/endpoints.ts` (+`getPublicVenue`), `utils/format.ts` (+`waitMinutes`),
  `utils/googleIdentity.ts`, `styles/components.scss` (+`.app-btn-tall`).
- e2e aggiornati: `account-delete.mjs` (etichette nuove), `email-request.mjs` (primario «Riprova tra N min» al 429),
  `display-name.mjs` (+1 controllo: menu di `/name` solo «Esci»).
- Test backend: nessuno (task solo frontend, backend non toccato).
- Risultati: `type-check` e `build` puliti; e2e: `account-delete` 16/16, `display-name` 16/16, `email-request` 20/20,
  `staff-input` 8/8, `profile-cards` 14/14. **`feedback.mjs` fallisce** (cerca `.toast-stack`, rimosso da F8, non da me).

## Modifiche proposte ai documenti

### CODEBASE.md
- Frontend: `RateLimitAlert.vue` (avviso 429 unico), `utils/systemError.ts` (`systemMessage`), `waitMinutes` in `utils/format.ts`,
  `getPublicVenue` in `api/endpoints.ts`. `GoogleSignInButton` renderizza il bottone ufficiale (niente overlay).
  `VITE_PRIVACY_URL` (opzionale): se assente non c'è il link dell'informativa.
- e2e: `feedback.mjs` è rotto da F8 (toast rimossi).

### BACKLOG.md
- F9 → fatta (D4 parziale: manca l'URL dell'informativa). B28 (4) chiuso. Aperte: testo D4 da validare; D18/B24.

## Lacune emerse e task suggerite

- URL dell'informativa privacy e relativa pagina: serve una decisione (D4).
- `e2e/feedback.mjs` va riscritto sui nuovi feedback della coda (non mia).
- Il bottone Google non raggiunge 44 px: da decidere se accettare la regola di Google (non scalare) o tornare a una faccia nostra.
- Il Profilo mostra ancora il vecchio stile di avvisi del nome (F10).

## Problemi di ambiente

- Un `pkill -f vite` (per riavviare il dev server) è stato negato dal sistema; non l'ho ripetuto: Vite si riavvia da solo al
  cambio di `.env.local`. `.env.local` ripristinato com'era.
- `e2e/profile-cards.mjs` scrive due PNG nella cartella `stampy-frontend/`: cancellati, non committati.

## Cosa ho capito e cosa no

- Il testo dell'issue dice «BLOCKED · dopo F8»: F8 è in main, ho proceduto.
- «avanzamento» (nella task) l'ho letto come gli stati di lavorazione («Invio…», «Verifica…», «Elimino…»): già presenti, verificati.
- Non verificati: telefono reale, screen reader, focus dell'iframe Google, zoom 200%, tastiera mobile sul campo codice.
  Verificati con Playwright (Chromium) a 360 e 390 px, chiaro e scuro: A01–A12 (A06 focus campo/pulsante), N01–N03, E01–E04 in tutti
  gli stati (vuoto, errore, rete, 429, caricamento, scaduto, tentativi finiti, account eliminato): nessuno scroll orizzontale,
  target ≥ 44 (tranne l'iframe Google), pulsanti e campi fermi all'apparire degli errori. Contrasto AA: non rimisurato, si
  appoggia ai token di F7. Le schermate con il bottone Google sono state viste a 360/390 chiaro e scuro solo con un client ID
  finto (layout), non con un accesso reale.
