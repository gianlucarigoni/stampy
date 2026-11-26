# 02 · Cattura sezione Accesso

Chat 2, 2026-11-25. Script: `design-review/scripts/capture-accesso.mjs` (rilanciabile; sovrascrive i PNG). Ambiente e metodo: `02-capture-env.md`.
Output: `design-review/screens/accesso/anonimo/<nome>__<tema>.png`, **ogni nome in `light` e `dark`** → 31 nomi × 2 temi = **62 PNG**, tutti **full-page**, 390×844 @2x. Elenco macchina in `_manifest.json` (stessa cartella). **Nessun PNG è stato aperto.**
Origine: **R** = backend reale · **S** = risposta simulata con `page.route` (il frontend e il backend non sono toccati).

## File catturati

### Schermata Login email (`/login`)

| File (`…__light.png` / `…__dark.png`) | Stato / componente | Origine |
|---|---|---|
| `login__email-vuoto` | stato A; **anche** input email *default* e bottone «Invia il codice» *disabled* (stessa immagine) | R |
| `login__input-email-focus` | input email, focus | R |
| `login__email-compilata` | email compilata | R |
| `login__bottone-invia-default` | bottone primario abilitato | R |
| `login__bottone-invia-focus` | bottone primario, focus da tastiera (Tab) | R |
| `login__bottone-invia-pressed` | bottone primario, pressed (mouse giù, rilascio fuori: nessun invio) | R |
| `login__invio-in-corso` | stato B: «Invio…», bottone disabled (risposta ritardata 6 s) | S |
| `login__errore-email-non-valida` | stato C: `alert-danger`; **anche** input email *invalido* (solo `aria-invalid`, nessuna classe visiva) | S (400) |
| `login__errore-generico` | stato C: errore di rete «Connessione non riuscita, riprova» | S (abort) |
| `login__attesa-429` | stato D: `alert-warning` «Riprova tra 2 min…», bottone disabled | S (429, 125 s) |
| `login__account-eliminato` | stato E: `?deleted=1`, `alert-success` | R |
| `login__bottone-google-default` | stato F: bottone Google | R + script Google |
| `login__bottone-google-focus` | bottone Google dopo 2 Tab (vedi sotto) | R + script Google |

### Schermata Login codice (`/login`, stato `challengeId`)

| File | Stato / componente | Origine |
|---|---|---|
| `codice__vuoto` | campo vuoto; **anche** input codice *focus* (autofocus), «Accedi» *disabled*, link *default* | R (codice vero per `simone.deluca` / `martina.costa`, console) |
| `codice__input-codice-compilato-parziale` | 3 cifre, «Accedi» ancora disabled | R |
| `codice__errore-codice-non-valido` | «Ti restano 4 tentativi»; **anche** input codice *invalido* | R |
| `codice__input-codice-invalido` | stesso istante del precedente, nome per il componente (immagine duplicata) | R |
| `codice__errore-ultimo-tentativo` | «Ti resta 1 tentativo» | R |
| `codice__tentativi-finiti` | codice morto: input **disabled**, «Invia un nuovo codice» diventa **primario** | R |
| `codice__codice-scaduto` | «Codice scaduto…», input disabled | S (410 `CodeExpired`) |
| `codice__verifica-in-corso` | «Verifica…», bottone disabled | S (risposta ritardata) |
| `codice__link-nuovo-codice-focus` | `btn-link` «Invia un nuovo codice», focus | S (richiesta codice) |
| `codice__link-cambia-email-focus` | `btn-link` «Cambia email», focus | S |
| `codice__reinvio-in-corso` | reinvio: link disabled (richiesta ritardata) | S |
| `codice__link-nuovo-codice-disabled` | stesso istante, per il componente `btn-link` disabled | S |
| `codice__codice-reinviato` | notice `alert-success` «Codice inviato a …» | S |
| `codice__attesa-429` | attesa 429 sul reinvio (61 s) | S |

### Altre schermate

| File | Stato | Origine |
|---|---|---|
| `non-trovata__default` | `/boh`, 404 | R |
| `session-error__default` | `/session-error` | S (`/auth/me` annullata, partendo da `/staff`) |
| `session-error__bottone-riprova-focus` | «Riprova» in focus | S |
| `session-error__bottone-riprova-pressed` | «Riprova» pressed | S |

## Cosa manca e perché

| Stato | Motivo |
|---|---|
| **hover** (bottoni, link) | non catturato di proposito: su telefono non esiste (rimandato a tablet/PC) |
| «Accedi» **abilitato** con 6 cifre | non raggiungibile: al 6° numero il form si invia da solo (si vede solo «Verifica…», catturato) |
| Input email/codice **disabled** con `googleBusy` | richiede un login Google riuscito a metà: non simulabile senza token Google |
| Stato **valid/success** dei campi | non esiste nel codice |
| Errori Google (403 «usa il codice via email», 401, 503) | richiedono un `idToken` vero: non catturati |
| Spinner / skeleton di caricamento | non esistono nel codice (solo testo «Invio…», «Verifica…») |
| Select, date, menu ☰, dialog | non presenti nell'Accesso (header senza menu) |
| Variante «Account eliminato» in stato codice | non esiste (la notice compare solo allo stato email) |
| 360×740 | non catturato (solo 390×844, come richiesto) |

## Bottone Google: com'è e da cosa dipende

- `.google-signin-face` («Continua con Google») è **nostro** (SVG + testo); l'iframe vero di Google è invisibile sopra. È stato **trovato visibile** in entrambi i temi (`_manifest.json`), cioè lo script `https://accounts.google.com/gsi/client` si è caricato e `VITE_GOOGLE_CLIENT_ID` era presente.
- **Dipende da uno script esterno** e dalla rete: senza rete, o con un ad blocker, il bottone e il separatore «oppure» **scompaiono** (`available=false`). Il PNG è quindi non riproducibile offline.
- **Non verificato a vista**: se l'iframe Google (invisibile, `transform: scale`) si sia davvero montato, e se `localhost:5174` sia un'origine autorizzata per quel client ID (non lo è con tutta probabilità: l'iframe può mostrare un errore, ma è invisibile). `login__bottone-google-focus` fa Tab dal campo email: il focus può finire sul bottone «Invia il codice» o dentro l'iframe; non so quale dei due, è da guardare nella critica.

## Problemi incontrati

1. **`git pull --ff-only` e file non tracciati**: `worktree-start.sh` ha funzionato nonostante `.gitignore` modificato e `design-review/` non tracciata in `main`. Il worktree non contiene `design-review/`: script e PNG stanno nella cartella principale.
2. **`pg_dump` completo falliva** (`__drizzle_migrations` già popolata dalle migrazioni): escluso lo schema `drizzle`. Escluse anche `sessions` e `otp_challenges` (niente sessioni valide copiate).
3. **I tentativi del codice sono 5**, non 3 (`01b` diceva 3): i messaggi reali sono «Ti restano 4 / 3 / 2 tentativi», «Ti resta 1 tentativo», poi «Hai finito i tentativi…». Primo giro dello script fallito per questo, corretto.
4. **Stato «Codice scaduto» reale** richiederebbe 5 minuti di attesa: simulato.
5. Un `zsh` ha rifiutato `( … &)` con `${#VAR}` («bad floating point constant»): avvio spostato in `start-app.sh`.
6. Il worktree ha un `docs/reports/dr-design-capture.md` non committato (creato dallo script), da ignorare.

## Dubbi per la critica

- Le catture simulate (429, errori) usano testi reali del frontend, ma il **layout con timer** cambia ogni secondo: il «Riprova tra N» mostra il valore del momento.
- Le pagine dell'Accesso sono tutte **più corte del viewport**: «full-page» e «viewport» coincidono (altezza 1688 px).
