# 03 · Cattura sezione Cliente

Chat 3, 2026-11-25. Script: `design-review/scripts/capture-cliente.mjs` + `capture-lib.mjs` + `seed-cliente.sql` (rilanciabili con `STAGE=name,scan,visit,request,profile,history,delete,member`; sovrascrivono i PNG).
Ambiente: worktree `dr3` (porte 3001/5174, DB `stampy_wt_dr3`, `OTP_PROVIDER=console`), ricreato come in `02-capture-env.md`. **`stampy_dev` e `main` non toccati.**
Output: `design-review/screens/cliente/cliente/<nome>__<tema>.png` (**121 nomi × 2 temi = 242 PNG**, 238 + 4 della variante membro), 390×844 @2x (780 px di larghezza; un solo file di prova a 360×740 → 720 px). Elenco macchina con origine e modalità: `screens/cliente/_manifest.json`. **Nessun PNG è stato aperto.** Nessun fallimento nell'ultima esecuzione di ogni stage.
Origine: **R** = backend reale · **S** = risposta simulata con `page.route` (frontend e backend non toccati). Modalità: tutto **full-page** salvo dove indicato **vp** (solo viewport: menu e dialog).
Cartelle: `cliente/` (ruolo cliente) e `membro/` (4 PNG: profilo e elimina-account visti da un proprietario; la UI dello staff non ha altre schermate in comune con quelle del cliente).

## File catturati (ogni nome in `__light` e `__dark`)

### `/name` («Come ti chiami?», utente `senza.nome`, mai salvato)
| Nome | Stato / componente | O |
|---|---|---|
| `name__vuoto` | form vuoto; **anche** input *default*, «Continua» *disabled* | R |
| `name__input-focus` · `name__compilato` | input focus · compilato, «Continua» abilitato | R |
| `name__bottone-continua-focus` · `-pressed` | bottone primario focus / pressed | R |
| `name__errore-troppo-corto` · `name__errore-troppo-lungo` | `is-invalid` + alert (regola locale 3–50) | R |
| `name__nome-lungo-50-caratteri` | dati lunghi, 50 caratteri senza spazi | R |
| `name__salvataggio-in-corso` | «Salvo…», campo readonly | S (la PATCH non parte mai) |
| `name__errore-429` · `name__errore-generico` | «Troppi tentativi…» · «Connessione non riuscita» | S |

### `/scan`
`scan__default` (R) · `scan__bottone-menu-focus` · `scan__bottone-menu-pressed` · `scan__menu-aperto` (**vp**; voci Profilo + Esci, nessuna attiva) · `scan__menu-voce-focus` (**vp**).

### `/v/:id` (Visita; utente `simone.deluca`, locale Rossi in chiaro, Da Gennaro in scuro)
| Nome | Stato | O |
|---|---|---|
| `visita__caricamento` | «Un momento…» (risposta reale ritardata di 3,5 s; crea la card) | R ritardata |
| `visita__card-pronta` | «La tua card è pronta», due bottoni, codice card | R |
| `visita__bottone-wallet-focus` · `-pressed` · `visita__bottone-richiedi-focus` · `-pressed` | componenti bottone primario / outline | R |
| `visita__dopo-tap-wallet` | bottoni invertiti dopo il tap sul link Wallet (la nuova scheda è bloccata e chiusa) | R |
| `visita__errore-link-non-valido` · `visita__errore-locale-inesistente` | `/v/non-un-uuid` (400) · UUID inesistente: stesso testo, senza Riprova | R |
| `visita__errore-nessuna-promozione` · `visita__errore-429` · `visita__errore-generico` | alert senza Riprova · con Riprova (429 25 min) · con Riprova | S |
| `visita__bottone-riprova-focus` · `-pressed` | su errore generico | S |

### `/r/:id` (Richiesta)
| Nome | Stato | O |
|---|---|---|
| `richiesta__in-attesa-card-nuova` | pending subito dopo «Richiedi il timbro»: **0/10 chiaro, 0/8 scuro** (locali diversi) | R |
| `richiesta__in-attesa-1-di-10` · `-7-di-10` | pending, pallini pochi / molti | R |
| `richiesta__in-attesa-card-piena` | pending 8/8, alert «Premio disponibile» | R |
| `richiesta__in-attesa-promozione-cambiata` | `PromotionNotice` cliente (flag forzato nella risposta) | S |
| `richiesta__approvata-con-timbri` · `richiesta__approvata-card-piena` | «+2 timbri aggiunti» (1→3/10) · approvata che porta a 10/10 | R (conferma vera dallo staff via API) |
| `richiesta__approvata-premio-e-timbri-dialog-premio` (**vp**) · `…-dialog-bottone-chiudi-pressed` (**vp**) · `…-dialog-chiuso` · `…-premio-gia-visto` | premio + 2 timbri: `RewardDialog` aperto · «Chiudi» pressed · chiuso con Esc · dopo reload (nessun dialog) | R |
| `richiesta__approvata-solo-premio-…` (stessi 4 suffissi) | «Nessun nuovo timbro: questo prodotto era il premio» | R |
| `richiesta__rifiutata-senza-locale` · `…-con-richiedi-di-nuovo` | «Richiesta non confermata» con testo «Avvicina di nuovo il telefono…» · con bottone (chiave di tab impostata come farebbe la pagina Visita) | R |
| `richiesta__scaduta-senza-locale` · `…-con-richiedi-di-nuovo` | «Richiesta scaduta» (scadenza forzata a −1 min nel DB, scadenza lazy reale) | R |
| `richiesta__bottone-richiedi-di-nuovo-focus` · `-pressed` | bottone primario | R |
| `richiesta__non-trovata` · `richiesta__non-trovata-id-malformato` | 404 reale · 400 reale (stessa schermata) | R |
| `richiesta__caricamento` | «Un momento…» (GET ritardata) | S |
| `richiesta__errore` · `richiesta__bottone-riprova-focus` · `-pressed` | alert + Riprova (403 simulata) | S |

### `/profile`
| Nome | Stato | O |
|---|---|---|
| `profilo__default` | card nome+email, riga «Storico richieste», **modello Wallet statico**, zona pericolosa (utente `lorenzo.fontana`) | R |
| `profilo__menu-aperto` (**vp**) | voce «Profilo» attiva | R |
| `profilo__bottone-modifica-nome-focus` · `-pressed` · `profilo__riga-storico-focus` · `-pressed` · `profilo__bottone-wallet-modello-focus` · `profilo__bottone-elimina-focus` · `-pressed` · `profilo__bottone-indietro-focus` · `-pressed` | componenti | R |
| `profilo__modifica-nome-aperto` · `profilo__bottone-annulla-focus` · `profilo__modifica-nome-vuoto` · `profilo__modifica-nome-invalido` | form nome aperto (campo con focus) · «Annulla» focus · «Salva» disabled · errore + `is-invalid` | R |
| `profilo__modifica-nome-salvataggio-in-corso` · `profilo__modifica-nome-errore-server` | «Salvo…» · 400 | S |
| `profilo__caricamento-ruoli` | `/venues/mine` in attesa: niente riga storico, «Elimina account» già visibile | S |
| `profilo__nome-ed-email-lunghi` | utente con nome di 50 caratteri e email lunga (`text-break`) | R |
| `profilo__viewport-360-wallet-condensato` | **360×740**: bottone Wallet in versione condensata | R |
| `membro/profilo__default` | proprietario `marco.rossi`: senza storico, «Questo account gestisce un locale…» | R |

### `/history` (Storico cliente, `lorenzo.fontana`, 12 richieste)
`storico__default` · `storico__filtri-aperti` · `storico__filtro-esito-attivo` («Azzera» visibile) · `storico__vuoto` (utente `vuoto.storico`) · `storico__vuoto-con-filtri` · `storico__errore-min-maggiore-max` · `storico__errore-date-incoerenti` · `storico__errore-data-nel-futuro` · `storico__errore-timbri-non-numerici` · `storico__dati-lunghi-nome-locale` (locale rinominato per un momento, poi ripristinato) — **R**.
Componenti (R): `storico__bottone-indietro-focus` · `storico__bottone-filtri-focus` · `-pressed` · `storico__bottone-azzera-focus` · `-pressed` · `storico__select-esito-focus` · `storico__input-min-focus` · `storico__input-data-focus`.
**S**: `storico__caricamento` («Caricamento…») · `storico__errore` (500).

### `/account/delete` (valentina.rizzo chiaro, andrea.lombardi scuro: **mai** confermato con il codice giusto)
| Nome | Stato | O |
|---|---|---|
| `elimina__intro` | spiegazione, «Invia il codice» (danger), «Annulla» | R |
| `elimina__bottone-invia-focus` · `-pressed` · `elimina__bottone-annulla-focus` | componenti | R |
| `elimina__invio-in-corso` · `elimina__errore-generico` · `elimina__attesa-429` | «Invio…» · errore di rete · «Riprova tra 2 min» | S |
| `elimina__codice-vuoto` | **anche** input codice con focus, bottone danger disabled | R (codice in console) |
| `elimina__codice-parziale` · `elimina__codice-completo-non-inviato` | 3 cifre · 6 cifre sbagliate, bottone abilitato (non si invia da solo) | R |
| `elimina__bottone-elimina-focus` · `-pressed` · `elimina__link-nuovo-codice-focus` | componenti | R |
| `elimina__errore-codice-non-valido` · `elimina__errore-ultimo-tentativo` · `elimina__tentativi-finiti` | 4 tentativi · 1 tentativo · input disabled e «Invia un nuovo codice» primario | R (codice sbagliato apposta: l'ultima cifra è cambiata) |
| `elimina__codice-scaduto` · `elimina__eliminazione-in-corso` («Elimino…») · `elimina__errore-generico-conferma` · `elimina__codice-reinviato` · `elimina__reinvio-in-corso` · `elimina__attesa-429-reinvio` | | S (la conferma non arriva mai al backend: abort o risposta finta) |
| `membro/elimina__bloccato` | alert-warning per i membri | R |

## Cosa NON catturato (e perché)

| Stato | Motivo |
|---|---|
| **hover** di bottoni, `.profile-row`, voci del menu, ecc. | su telefono non esiste: rimandato a tablet/PC (come nella chat 2) |
| Link Wallet vero / aggiunta alla Wallet | il link di salvataggio non utilizzabile (Google Wallet non raggiungibile): si cattura il tap, la nuova scheda viene bloccata e chiusa. «Aggiungi a Google Wallet» e il suo contenuto reale **non visti** |
| **Select Esito aperto** e **picker data** | controlli nativi del browser, non catturabili con Playwright (solo i campi chiusi, default e focus) |
| Lista storico **molto lunga** | il DB ne ha al massimo 12 per cliente (46 in totale); non esiste paginazione nel frontend |
| `stampsRequired` > 20 (pallini nascosti) | nessun dato lo copre: tutte le soglie sono 8 o 10 |
| Conferma reale dell'eliminazione / «Account eliminato» dopo il successo | azione irreversibile: non eseguita (la schermata `?deleted=1` è in Accesso) |
| Errore di polling su `/r/:id` (5xx / rete) | la pagina riprova in silenzio: **nessuno stato visivo** |
| Spinner/skeleton | non esistono: il «caricamento» è sempre testo |
| Stato valid/success dei campi, switch, tab, chip, toast, bottom sheet | non esistono nel codice |
| 360×740 su tutte le schermate | solo il profilo (bottone Wallet condensato); il resto solo 390×844 |
| «Cambia locale» / `/staff` | sezione Staff, chat 4 |

## Stati reali vs simulati

- **Reali (R)**: 188 su 242 PNG: login via API con OTP in console, visite, richieste, conferme/rifiuti dello staff via API (`/venues/:id/requests/:id/confirm|reject`), scadenza (per forzarla si porta `expires_at` nel passato nel DB), errori 400/404, codici sbagliati a ogni tentativo.
- **Simulati (S)**: 54 PNG, solo errori non naturali (429, 500, rete, 403, codice scaduto), stati «in corso» (risposta ritardata che poi fallisce: nessuna scrittura nel backend) e il flag `promotionChanged`. I testi sono quelli veri del frontend; i **timer 429** («Riprova tra N») mostrano il valore del momento.
- Pallini: il **valore** della richiesta in attesa «card nuova» differisce tra i temi (0/10 in chiaro, 0/8 in scuro) perché usa due locali diversi; non è un bug.

## Modifiche fatte al codice nel worktree

**Nessuna.** `git status` del worktree: solo `design-review/` e `docs/reports/` (non tracciati); `src/`, stili, markup, testi, migrazioni invariati; nessun file di configurazione né `.env` toccato (il backend è partito con `OTP_PROVIDER=console` passato come variabile d'ambiente, `VITE_GOOGLE_CLIENT_ID` come per `start-app.sh`).

## Modifiche ai DATI (solo DB `stampy_wt_dr3`)

| Cosa | Perché |
|---|---|
| Copia dati da `stampy_dev` (senza `sessions`, `otp_challenges`, schema `drizzle`) + `seed-capture.sql` (utente senza nome, card piena Lorenzo/Gennaro 8/8, 3 richieste pending) | stati mancanti |
| `seed-cliente.sql`: utenti `vuoto.storico` («Paola Vuoto», nessuna richiesta) e `nome.molto.lungo…` (nome di 50 caratteri senza spazi, email lunga) | storico vuoto e dati lunghi |
| `delete from otp_challenges` a ogni avvio dello script | il backend limita gli invii di codice per email e per utente |
| `stamps_count` e `wallet_status` riportati a valori noti prima di ogni scena (sofia Rossi = 1, matteo Rossi = 7, lorenzo Da Gennaro = 8); nuove richieste `pending` inserite a mano con scadenza +7 giorni; richieste portate a `expired` / `rejected` per le schermate omonime | ripetibilità; «scade tra N min» non è rappresentativo |
| Nome del locale Fiordilatte allungato per una cattura e **ripristinato subito** (`try/finally`) | storico: dati lunghi |
| Card `simone.deluca` @ Rossi e @ Da Gennaro create dalla visita vera | schermata «card pronta» |

## Cose da sapere per la critica

- Il backend impone **~60 s** tra due invii di codice per lo stesso utente (visibile anche nello script: `waitCooldown`).
- Dopo l'approvazione con premio il dialog si apre **da solo** (il cliente non fa nulla): lo screenshot è subito dopo l'apertura.
- `richiesta__*-senza-locale` e `…-con-richiedi-di-nuovo` sono la stessa richiesta con due ingressi diversi (chiave `stampy.request.<id>` in sessionStorage presente o no).
- Stati non verificati a vista: tutto (nessun PNG aperto). In particolare: doppio anello di focus, resa del dialog, posizione del menu sopra i contenuti, hit-area del bottone Wallet.
