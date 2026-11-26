# 04 · Cattura sezione Staff

Chat 4, 2026-11-25. Script: `design-review/scripts/capture-staff.mjs` + `seed-staff.sql` (riusa `capture-lib.mjs`, `seed-capture.sql`, `start-app.sh`). Rilanciabile per stage: `STAGE=locali,storico,profilo,coda,esiti,errori,menu` (le variabili `WT`, `DB`, `DEV_LOG`, `E2E_APP_URL`, `OUT` vanno impostate, vedi sotto). **Ogni esecuzione riscrive `_manifest.json`**: per un manifest completo rilanciare tutti gli stage insieme (è quello che ho fatto per i file finali).
Ambiente: worktree `dr4` (`../stampy-wt/dr4`, branch `chore/dr4-cattura-staff`, porte 3001/5174, DB `stampy_wt_dr4`, `OTP_PROVIDER=console`), ricreato come in `02-capture-env.md` (+ `seed-staff.sql`). **`stampy_dev` e `main` non toccati.**
Output: `design-review/screens/staff/staff/<nome>__<tema>.png` (**81 nomi × 2 temi = 162 PNG**), 390×844 @2x. Elenco macchina con origine e modalità: `screens/staff/_manifest.json`; note raccolte durante la cattura: `screens/staff/_notes.json`. **Nessun PNG è stato aperto.** 0 fallimenti nell'esecuzione finale.
Origine: **R** = backend reale · **S** = risposta simulata con `page.route`. Modalità: full-page salvo **vp** (solo viewport: menu aperti e alert sticky dopo lo scroll).

## Cartella `staff/` e non `proprietario/`
Nessuna differenza di UI: sulla coda vuota di Rossi, `marco.rossi` (proprietario) e `luca.ferri` (staff) hanno **testo di pagina identico e voci del menu identiche** («Profilo · Storico richieste · Esci»), verificato per codice nello script (nessun PNG aperto). Le catture sono fatte con `luca.ferri` (staff di Rossi) e `giulia.bianchi` (2 locali). Per profilo/elimina account del proprietario vedi già `cliente/` → `membro/`.

## File catturati (ogni nome in `__light` e `__dark`)

### `/staff` · I tuoi locali (`giulia.bianchi`: Rossi + Fiordilatte)
| Nome | Stato / componente | O |
|---|---|---|
| `locali__default` | elenco con 2 bottoni outline | R |
| `locali__bottone-locale-focus` · `-pressed` | link-bottone locale | R |
| `locali__bottone-menu-focus` · `-pressed` | ☰ | R |
| `locali__menu-aperto` (**vp**) · `locali__menu-voce-focus` (**vp**) | solo Profilo + Esci (niente «Cambia locale» sull'elenco; nessuna voce attiva) | R |
| `locali__caricamento` | «Caricamento…» (GET `/venues/mine` ritardata 3,5 s, poi prosegue) | R ritardata |
| `locali__errore` · `locali__bottone-riprova-focus` · `-pressed` | alert + Riprova (rete interrotta) | S |
| `locali__nome-locale-lungo` | Fiordilatte rinominato per un momento con 76 caratteri (ripristinato) | R |
| `locali__tre-locali` | giulia aggiunta per la scena a Da Gennaro (riga tolta subito dopo) | R |

### `/staff/:id` · Coda richieste (`luca.ferri` @ Rossi; richieste con scadenza +4 min, quindi «scade tra 4 min»)
| Nome | Stato / componente | O |
|---|---|---|
| `coda__default-3-richieste` | 3 card (1/10, 5/10, 7/10), stepper al minimo (− disabled), «Conferma» abilitato. Titolo tab «(3) Stampy» | R |
| `coda__una-richiesta` · `coda__vuota` | 1 card · «Nessuna richiesta in attesa.» (titolo tab «Stampy») | R |
| `coda__richiesta-premio-disponibile` | card 10/10: «· Premio disponibile» verde | R |
| `coda__richiesta-promozione-cambiata` | pillola `PromotionNotice staff` (card sulla vecchia promozione: calcolo vero del backend) | R |
| `coda__lista-lunga` | 12 richieste (titolo tab «(12) Stampy») | R |
| `coda__nome-locale-lungo` | titolo con 76 caratteri | R |
| `coda__caricamento` | «Caricamento…» (GET coda ritardata 3,5 s) | R ritardata |
| `coda__titolo-segnaposto-richieste` | titolo «Richieste» finché non arriva il nome del locale (`/venues/mine` ritardata 4 s) | R ritardata |
| `coda__bottone-piu-focus` · `-pressed` · `coda__bottone-meno-focus` · `-pressed` | stepper (− con quantità 3, perché al minimo è disabled) | R |
| `coda__input-quantita-focus` | input numerico | R |
| `coda__bottone-rifiuta-focus` · `-pressed` · `coda__bottone-conferma-focus` · `-pressed` | bottoni azione | R |
| `coda__quantita-50-piu-disabled` | 50: «+» disabled | R |
| `coda__quantita-vuota-invalida` · `-0-invalida` · `-51-invalida` · `-decimale-invalida` | messaggio ⚠, `aria-invalid`, Conferma **disabled** | R |
| `coda__quantita-normalizzata-07` | «07» → 7 all'uscita dal campo | R |
| `coda__invio-in-corso` | «Invio…», tutti i bottoni disabled (conferma tenuta in sospeso 6 s e poi interrotta) | S |

### Esiti in loco (conferma/rifiuto fatti **col click vero** nell'interfaccia; il backend risponde davvero)
`coda__esito-approvata-1-timbro` («+1 timbro») · `coda__esito-bottone-ok-focus` · `-pressed` · `coda__esito-approvata-3-timbri` · `coda__esito-approvata-card-piena` («+1 timbro · **Premio disponibile**») · `coda__esito-premio-ritirato-senza-timbri` («Premio ritirato: Caffè gratis», nessun «+N») · `coda__esito-premio-e-timbri` («+3 timbri · Premio ritirato») · `coda__esito-premi-multipli` (quantità 25 su card 10/10: «+22 timbri · 3 premi ritirati») · `coda__esito-rifiutata` («⚠ Richiesta rifiutata») · `coda__esiti-multipli` (approvata + rifiutata + una ancora da gestire) · `coda__esiti-spariti-dopo-8s` (la coda dopo che gli esiti spariscono da soli) — **R**.

### Errori
| Nome | Stato | O |
|---|---|---|
| `coda__errore-gia-gestita` | «Richiesta non più valida» (sticky): la richiesta è rifiutata dal proprietario (API vera) mentre lo staff ha la coda aperta, poi lo staff preme Conferma | R |
| `coda__errore-sticky-dopo-scroll` (**vp**) | stesso errore con 12 richieste, pagina scorsa di 900 px: l'alert resta in alto sopra le card | R |
| `coda__errore-esito-non-confermato` · `coda__errore-rifiuto-non-confermato` | «Esito non confermato: controlla la coda…» (richiesta interrotta) | S |
| `coda__errore-generico-500` · `coda__errore-429-troppe-richieste` | alert con il messaggio del server | S |
| `coda__errore-connessione-poll` | `alert-warning` sopra la lista (la prima lettura va, le successive falliscono) | S |
| `coda__non-autorizzato-altro-locale` · `…-id-malformato` · `…-link-focus` | «Non sei autorizzato a gestire questo locale.» + link «I tuoi locali»; **stessa schermata** per un locale di altri e per un id inesistente (come da regola del 404 identico) | R |

### Menu ☰
`coda__bottone-menu-focus` · `-pressed` · `coda__menu-aperto` (**vp**: Profilo + Storico richieste + Esci) · `coda__menu-voce-focus` (**vp**) · `coda__menu-aperto-multi-locale` (**vp**, giulia: + «Cambia locale») · `coda__menu-aperto-ruoli-non-ancora-caricati` (**vp**: `/venues/mine` in ritardo: il menu ha solo Profilo + Esci) — **R**.

### Storico del locale (`/staff/:id/history`)
| Nome | Stato | O |
|---|---|---|
| `storico__default` | elenco lungo (richieste approvate, rifiutate, scadute e 3 **«… In attesa»**: stato esclusivo dello staff), nel titolo «Storico richieste», nelle righe il **codice card** al posto del nome locale | R |
| `storico__filtri-aperti` · `storico__filtro-in-attesa` · `storico__filtro-esito-approvate` · `storico__vuoto-con-filtri` | pannello aperto · solo in attesa («Azzera» visibile) · solo approvate · «Nessuna richiesta trovata.» (timbri min 50) | R |
| `storico__bottone-indietro-focus` · `-pressed` · `storico__menu-aperto` (**vp**, voce «Storico richieste» attiva) | | R |
| `storico__non-autorizzato-altro-locale` · `storico__non-autorizzato-403` · `storico__link-i-tuoi-locali-focus` | alert + link: risposta vera per un locale di altri · 403 simulata | R · S · S |

### Profilo visto da uno staff (non proprietario), arrivando dalla coda
`profilo__default` («Questo account gestisce un locale…», niente storico, niente «Elimina account») · `profilo__bottone-indietro-focus` · `profilo__menu-aperto` (**vp**: dalla coda il menu sul profilo ha solo Profilo + Esci) · `profilo__ritorno-alla-coda` (tasto Indietro riporta alla coda) — **R**.

## Schermate già catturate altrove (non rifatte)
| Cosa | Dove |
|---|---|
| Profilo di un membro (proprietario), «Elimina account» bloccato | `screens/cliente/membro/profilo__default__*`, `elimina__bloccato__*` |
| Storico: caricamento, errore 500, errori di validazione dei filtri (min>max, date incoerenti/future, timbri non numerici), focus di select/input/date/Filtri/Azzera, componenti | `screens/cliente/cliente/storico__*` (il componente `RequestHistory` è lo stesso) |
| Form «Modifica nome» del profilo, riga storico, bottone Wallet modello | `screens/cliente/cliente/profilo__*` (lo staff vede gli stessi blocchi in alto) |
| Login, codice, errori di sessione, 404 | `screens/accesso/anonimo/` |
| `/staff` con 0 locali (un cliente) | si ridirige a `/scan`: vedi `cliente/scan__default` |
| Il redirect `/staff` → coda quando il membro ha 1 locale | nessuna schermata (redirect) |

## Cosa NON catturato (e perché)
| Stato | Motivo |
|---|---|
| **hover** (bottoni, stepper, voci del menu) | su telefono non esiste: rimandato a tablet/PC |
| Titolo della scheda «(N) Stampy» | fuori dalla pagina: registrato solo come testo nelle note (`(3) Stampy`, `(12) Stampy`, `Stampy`) |
| Annuncio screen-reader degli esiti (`role=status` nascosto) | non visibile |
| «scade tra N s» / «scade ora» | la richiesta scompare dalla coda alla scadenza (scadenza lazy): non resta uno stato da fotografare; «scade tra N min» è visibile in ogni card (4 min) |
| Spin dei numeri (frecce native di `<input type=number>`) su PC | assenti sul telefono; da verificare nella cattura desktop |
| Select e date nativi aperti (storico) | controlli nativi, non catturabili |
| Locale con **nessun** codice/nome (dati vuoti), `stampsRequired` > 20, più di 12 richieste in coda | nessun dato li copre (al massimo 12) |
| Poll di rete che torna a funzionare (alert che sparisce) | stato transitorio senza schermata propria |
| 360×740 | solo il profilo (chat 3) |
| Resa a schermo, tema scuro, sticky, doppio anello di focus | **non verificati a vista** (nessun PNG aperto) |

## Stati reali vs simulati
- **Reali**: 140 PNG su 162: login via API con OTP in console; richieste inserite nel DB (scadenza +4 min); **conferme e rifiuti fatti col click nell'interfaccia** (backend vero); «già gestita» col rifiuto vero del proprietario via API; 403/“non autorizzato” del backend; `promotionChanged` calcolato dal backend con una promozione vecchia reale.
- **Simulati (S)**: 22 PNG — errori non naturali (rete, 500, 429, esito non confermato, poll), «Invio…» (richiesta tenuta e poi interrotta), 403 dello storico, errore dell'elenco locali. Testi veri del frontend.
- «Ritardate» (R): risposta reale tenuta qualche secondo per mostrare «Caricamento…» (nessuna modifica al codice).

## Modifiche fatte al codice nel worktree
**Nessuna.** `git status` del worktree `dr4`: solo `design-review/` e `docs/reports/` (non tracciati); `src/`, stili, markup, testi, migrazioni, `.env` invariati. Il backend parte con `OTP_PROVIDER=console` e il frontend con `VITE_GOOGLE_CLIENT_ID` come variabili d'ambiente del processo (`start-app.sh`).

## Modifiche ai DATI (solo DB `stampy_wt_dr4`)
| Cosa | Perché |
|---|---|
| Copia dati da `stampy_dev` (senza `sessions`, `otp_challenges`, schema `drizzle`) + `seed-capture.sql` | base comune |
| `seed-staff.sql`: promozione «vecchia» di Rossi (terminata alla data di inizio di quella attuale) + 5 card in più da Rossi (12 in totale) | `promotionChanged` vero; lista lunga di 12 richieste |
| Prima di ogni scena: `pending` del locale cancellate e ricreate (+4 min), timbri e promozione delle card riportati a valori noti | ripetibilità, «scade tra 4 min» realistico |
| Conferme/rifiuti veri → righe `stamp_requests`/`stamp_events` in più: lo storico di Rossi cresce a ogni esecuzione (la finale mostra ~54 righe) | effetto delle azioni vere |
| Nome di Rossi e di Fiordilatte allungati per una scena e **ripristinati** (`try/finally`); `giulia.bianchi` aggiunta a Da Gennaro per `locali__tre-locali` e **rimossa** (verificato) | dati lunghi, 3 locali |
| `delete from otp_challenges` a ogni avvio | limiti OTP |

## Per la critica
- Le richieste in coda mostrano `HH:mm` di creazione, il **codice card** (8 caratteri) e «scade tra N min»: il cliente non ha nome visibile allo staff.
- Il bottone «Rifiuta» agisce subito (nessuna conferma): l'esito in loco è l'unico segnale, e sparisce dopo 8 s.
- `+22 timbri · 3 premi ritirati` mostra il testo massimo possibile dell'esito (quantità 25 su una card da 10): il testo dell'esito può essere lungo.
- Il backend ha **un solo messaggio** per «locale altrui» e «locale inesistente» (corretto per la sicurezza): la schermata è identica.

## Rifare la cattura
```bash
cd /home/rigoni_g/Personal/stampy-wt/<id> && export WT=$PWD DB=stampy_wt_<id> DEV_LOG=/tmp/<id>-dev.log E2E_APP_URL=http://localhost:<porta frontend> OUT=$PWD/design-review/screens/staff
node design-review/scripts/capture-staff.mjs   # tutti gli stage; prima: seed-capture.sql e seed-staff.sql sul DB del worktree
```
