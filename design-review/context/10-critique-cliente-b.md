# 10 · Critica sezione Cliente, parte B (profilo, storico, elimina account, membro)

Chat 7, 2026-11-25. Schermate: `/profile`, `/history` (componente **condiviso** con lo Staff: `/staff/:venueId/history`), `/account/delete`, profilo e «elimina» visti da un proprietario (`membro/`).
Fonte: `screens/cliente/cliente/` (profilo 20 + storico 20 + elimina 22 nomi × 2 temi) + `screens/cliente/membro/` (4 PNG), telefono 390×844 @2x; codice di `ProfileView`, `RequestHistory`, `DeleteAccountView`, `DisplayNameForm`, `stampy.scss`.
Nessun codice dell'app modificato. Proposte = **da decidere da te**, con alternative. Rispetto `11-decisions.md` (D1-D15 e regole globali) e **non ripeto** ciò che è già scritto in `10-critique-accesso.md` (`L-x`, `C-x`) e `10-critique-cliente-a.md` (`N-x`, `S-x`, `V-x`, `R-x`, `P-x`, `K-x`): rimando e segnalo solo varianti peggiori o nuove.
Etichette: **[F]** fatto osservato (PNG o codice) · **[I]** ipotesi · **[V]** da validare. Sigle nuove: `PR-` Profilo · `ST-` Storico · `EL-` Elimina account · `ME-` Membro. Nello Storico, **[CONDIVISO]** = vale anche per lo Staff, **[CLIENTE]** = solo per il cliente.

## Come ho lavorato e cosa è affidabile

- **Fogli di contatto**: `screens/_sheets/cliente-b/sheet-01…21.png` (3 stati × chiaro/scuro) e `cliente-b-membro/sheet-01.png`, da `scripts/make-sheets-parte.mjs`. **Visti tutti i 22 fogli.** **PNG originali aperti: nessuno.**
- **Contrasti nuovi**: `scripts/contrasts-cliente-b.mjs` (stessa formula WCAG 2.x di `contrasts.mjs`; non misurati sui pixel, ±0,05).
- **Codice letto**: `ProfileView.vue`, `RequestHistory.vue`, `DeleteAccountView.vue`, `CustomerHistoryView.vue`, `StaffHistoryView.vue`, righe `profile-row`/`danger-zone`/`filter-*` di `stampy.scss`, `HistoryItem`/`HistoryFilters` in `api/endpoints.ts`.
- **Limiti**: widget Vue DevTools ignorato; font DejaVu; i campi data mostrano `mm/dd/yyyy` perché il browser di cattura è in lingua inglese (su un telefono italiano sarà `gg/mm/aaaa` [V]); select e picker nativi aperti non catturabili; lista di 16 righe al massimo; stati «in corso», errori e 429 simulati. L'eliminazione **non è mai stata confermata** (azione irreversibile).
- Skill `design-critique`/`accessibility-review`/`ux-copy` non disponibili: criteri applicati a mano. Su Elimina account **non do consigli legali**: segnalo dove il testo va validato (come D4).

## Contrasti nuovi

Già calcolati e **non ripetuti**: bianco su arancione 3,19 (anche «Filtri» aperto e «Azzera»), link arancione 3,19, bordi campo/card, alert, focus (L-2, L-6, tabella Accesso).

| Coppia (parte B) | Chiaro | Scuro | Esito |
|---|---|---|---|
| **`btn-danger` pieno** («Invia il codice», «Elimina il mio account»): bianco su `#dc3545` | 4,53 | 4,53 | ✅ al limite · hover 5,91 · pressed 6,50 |
| `btn-danger` pieno vs fondo card (UI) | 4,53 | 4,08 | ✅ |
| **`btn-danger` DISABILITATO** (opacity .65): testo su fondo | **2,74** | 3,47 | ⚠ stato iniziale del passo «codice» (come L-1) |
| `btn-danger` disabilitato: fondo vs card (UI) | 2,74 | **2,36** | ⚠ |
| Zona pericolosa: titolo e testo del bottone `#c92a3a` / `#f0808b` su tinta 6% | 4,94 | 6,61 | ✅ |
| Zona pericolosa: **bordo della card** (alpha .55) su pagina | **2,54** | 2,99 | ⚠ (UI ≥3) |
| Zona pericolosa: bordo del bottone (alpha .7) su tinta | 3,16 | 3,91 | ✅ al limite |
| Zona pericolosa: testo del bottone premuto (tinta .22) | **3,53** | 4,49 | ⚠ testo piccolo |
| **Errore filtri `text-danger` `#dc3545`** (⚠ …, 16 px semibold) su pagina | 4,53 | **4,08** | ⚠ scuro sotto 4,5 (non è testo «grande») |
| Riga «Storico richieste» hover: testo su tinta 15% | 13,04 | 11,75 | ✅ |
| «Min/Max» (`input-group-text`) e superficie Wallet: testo su `tertiary` | 14,63 | 10,23 | ✅ |
| Pulsante Google nero su superficie `tertiary` (asset di marca) | 17,62 | **1,39** | (asset ufficiale: nel PNG scuro ha un bordo chiaro) [V] |
| **Card Wallet statica** (`#1e3a5f`): titolo bianco su brand / su angolo chiaro del gradiente | 11,50 / 5,96 | = | ✅ |
| «Carta fedeltà» (bianco 75%, 14 px) su brand / angolo chiaro | 7,25 / **4,19** | = | ⚠ sull'angolo chiaro (dipende dal colore del locale, D16) |
| Pillola `3/10`: bianco su brand+16% | 7,07 | = | ✅ |
| **Timbro VUOTO** della card (bianco 14%) vs fondo card (UI) | **1,53** | = | ⚠ le caselle vuote sono quasi invisibili ai contrasti bassi; pieno 11,50 |

Lettura: la parte B è **migliore della A sul testo** (tutto 4,5+) ma ha tre debolezze nuove: il **disabilitato del rosso** (come L-1), l'**errore dei filtri in scuro (4,08)** e i **timbri vuoti della card** (1,53: valgono per D16, dove i vuoti sono il dato «quanti mancano»). Un fatto nuovo sul colore: nel flusso Elimina convivono **tre rossi** (vedi EL-9).

---

## Per schermata e stato

Priorità: **A** alta · **M** media · **B** bassa.

### 1. Profilo — `/profile`

**Da mantenere** [F]
- **Anello di focus pieno** sulla riga «Storico richieste» (`profilo__riga-storico-focus`) e sul bottone Wallet (`profilo__bottone-wallet-modello-focus`): contorno arancione 3 px con distanza, **il migliore dell'app**; è il riferimento per il token di focus (L-6).
- **La riga «Storico richieste»** è un bersaglio unico da 56 px su tutta la larghezza, con chevron e hover/focus chiari (`profilo__default`, `profilo__riga-storico-pressed`).
- **Zona pericolosa separata, in fondo, con azione di peso basso**: tinta rossa tenue, titolo in rosso, bottone *outline* e non pieno (`profilo__default`): la mossa distruttiva è la meno evidente della pagina. Ottimo.
- **Il focus si sposta bene**: nel campo del nome quando si apre il form, di nuovo sul bottone alla chiusura (`ProfileView.vue`, `startEditingName`/`stopEditingName`).
- **Minimizzazione**: il profilo mostra solo nome ed email, nient'altro (nessun dato inutile).
- Nome ed email lunghi vanno a capo senza rompere il layout (`profilo__nome-ed-email-lunghi`); il bottone Wallet ha la **variante condensata sotto 380 px** (`profilo__viewport-360-wallet-condensato`).

| Stato (file) | Difetti osservati | Proposte | Pri |
|---|---|---|---|
| **Card Wallet statica** (`profilo__default`, `membro/profilo__default`) | **PR-1** Ogni utente, **anche il proprietario di un locale**, vede una card «**Bar Aurora · 3/10**» con 3 timbri, «Ancora 7 timbri», «Al decimo, un caffè in regalo» e il bottone «Aggiungi a Google Wallet»: è un **modello statico** (`ProfileView.vue:79`, «BACKLOG B30») ma sulla pagina **non c'è nulla che lo dica** (nessuna etichetta «Esempio»). Il cliente la legge come **la propria card** (dato falso) e il bottone **non fa nulla** (nessun handler). Nello schermo di un proprietario è ancora più fuori posto. [F] | **A)** finché B30 non c'è, togliere il blocco dalla produzione e tenerlo solo come **mockup** («richiede backend», regola 11-decisions). **B)** tenerlo con etichetta «Anteprima» e senza bottone. **C)** lasciare. Consiglio A; il design della card resta (è la base di D16). | A |
| | **PR-2** Se diventa la **lista delle card dell'utente** (una per locale), il Profilo è la casa naturale della richiesta **D14** («lista delle card») e della card D16: stesso componente. [I] | Collegare alla decisione D14/D16; qui solo segnalato. | M |
| **Intestazione nome/email** (`profilo__default`, `profilo__nome-ed-email-lunghi`) | **PR-3** Nome, email e il link «Modifica nome» stanno sulla stessa riga: l'email si spezza **a metà parola** («lorenzo.fontana@stamp / y.test») e il link si spezza su due righe («Modifica / nome»). Con nome lungo il blocco arriva a 5 righe. [F] | Il link sotto il nome (o un'icona-matita da 44 px con etichetta nascosta); email su una riga con `text-break` solo se serve. Vale anche per `membro/`. | M |
| | **PR-4** Il titolo è un `h5` peso 500 con lo stesso peso del nome in altri punti: nessuna gerarchia tra «nome» e «email» oltre al colore. Vedi gerarchia (N-2, L-3). | Token tipografici. | B |
| **Modifica nome aperta** (`profilo__modifica-nome-aperto`, `-vuoto`, `-invalido`, `-errore-server`, `-salvataggio-in-corso`) | **PR-5** Il form si apre in una **seconda card** sotto la prima: il nome compare **due volte** (nella card in alto e nel campo), l'azione sta lontana dal punto in cui è stata toccata. [F] | Aprire il form **dentro** la card del nome (la card si trasforma). | M |
| | **PR-6** Gli stati ereditano i difetti di `DisplayNameForm`: «Salva» disabilitato e sbiadito quando vuoto **e** durante il salvataggio, identici (`-vuoto` = `-salvataggio-in-corso`) → **N-1**; errore doppio (campo rosso + alert che sposta «Salva» di ~55 px) → **N-3**; errore del server che tinge il campo come invalido anche se il nome è valido (`-errore-server`: «Lorenzo F.» è corretto) → **N-4**. [F] | Come N-1/N-3/N-4: un solo componente corretto vale per `/name` e per il Profilo. | A (via N) |
| | **PR-7** **Nessuna conferma di salvataggio**: dopo «Salva» il form si chiude e il nome cambia, senza messaggio (`@saved` → `stopEditingName`). Chi non guarda la card in alto non sa se ha funzionato. [F codice] | Riga `role=status` «Nome aggiornato» per qualche secondo. | M |
| **Caricamento ruoli** (`profilo__caricamento-ruoli`) | **PR-8** Finché `GET /venues/mine` non risponde, la riga «Storico richieste» **manca** e «Elimina account» è **già visibile**; poi la riga compare e **spinge tutto in giù** (salto di layout), e per un membro il bottone **si trasforma in testo**. Un membro può toccare «Elimina account» prima. Il 403 del backend lo ferma ma si arriva alla pagina «bloccato». [F codice + PNG] | Segnaposto per la riga e per la zona pericolosa finché non è noto (`isMember === null`): non mostrare «Elimina account» prima di sapere. Pattern «caricamento» (V-1). | M |
| **Menu aperto** (`profilo__menu-aperto`) | Voce «Profilo» attiva in arancione pieno: ✅ (è l'unico posto dove la voce attiva si vede). Resto: **S-3**. | — | — |
| **Esci** | **PR-9** Nel profilo **non c'è «Esci»**: sta solo nel menu ☰. Chi cerca «esci» nel profilo non lo trova. [F codice] | Riga «Esci» in fondo al profilo, sopra la zona pericolosa (e nel menu). [V] se serve duplicare. | B |
| **Zona pericolosa** | **PR-10** Titolo «Zona pericolosa» in `h6` piccolo; il **bordo della card ha 2,54:1** (chiaro), il testo del bottone premuto 3,53:1. [F] Il titolo parla con un linguaggio da programmatore, non da cliente. | Bordo ≥3:1 (token). Copy: «Elimina l'account» come titolo della sezione (testo da approvare). | B |
| **Bottoni focus/pressed** | «Modifica nome» e «Annulla» (btn-link) con alone pesca e riquadro: **L-6/L-7**. Il burger e **«Indietro» pieno arancione al focus/pressed** (`profilo__bottone-indietro-*`): come S-3 (aperto = focus = pressed). | Anello unico. | (via L-6) |
| **Target** | ✅ 44-56 px ovunque; «Modifica nome» ha l'area da 44 px ma è un link di 80 px su due righe. | — | — |

### 2. Profilo di un proprietario — `membro/`

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| `membro/profilo__default` | **ME-1** Il proprietario vede la **card di un bar che non è il suo** (PR-1) e una **«Zona pericolosa» che contiene solo una frase** («Questo account gestisce un locale e non può essere eliminato da qui.»): una zona di pericolo senza pericolo, e **senza un'azione alternativa** (chi deve contattare?). [F] | Per i membri: nascondere la zona o rinominarla («Account»); la frase dice **cosa fare** (es. contatto/procedura) **[V]**: dipende da BACKLOG B4b, non lo invento. | M |
| | **ME-2** Coerenza buona: stessa struttura del cliente meno «Storico richieste» e «Elimina» (il proprietario ha lo storico dal menu, nel locale). Ma **non c'è nessuna indicazione del ruolo** (il profilo non dice «Proprietario di X»). [F] | Riga «Ruolo: …» solo se serve allo staff **[V]** con l'utente reale; è un dato in più (minimizzazione): non lo propongo di default. | B |
| `membro/elimina__bloccato` | **ME-3** Pagina «Elimina il tuo account» con **solo** un alert giallo e **nessuna uscita** (nessun «Torna al profilo»): vicolo cieco, come V-6/R-11. Si raggiunge solo da URL digitato o dopo il 403. [F] | Bottone «Torna al profilo». | M |
| Minimizzazione | ✅ Nessun dato extra rispetto al cliente. | — | — |

### 3. Storico — `/history` (cliente) e `/staff/:venueId/history` (Staff)

**Da mantenere** [F] — [CONDIVISO]
- **Toggle «Filtri»** con `aria-expanded`/`aria-controls`, contatore `role=status` e un solo pannello (`storico__filtri-aperti`).
- **Campi con etichetta sempre visibile**, `fieldset`/`legend` per «Timbri» e «Periodo», 44 px, tastiera numerica per i timbri (`storico__filtri-aperti`, `storico__input-min-focus`).
- **Filtri nell'URL** (si può condividere e il tasto Indietro funziona), valori non validi scartati in silenzio: robusto.
- **Elenco semantico** (`ul/li`), una card per richiesta, **testi corretti nel singolare/plurale** («1 timbro», «2 timbri · 1 premio riscattato»).
- Nome del locale **lungo** gestito: va a capo senza rompere (`storico__dati-lunghi-nome-locale`).
- **Validazione** con messaggio specifico per causa (min>max, date incoerenti, date nel futuro, timbri non numerici): il testo è chiaro.

| Stato (file) | Difetti osservati | Proposte | Pri |
|---|---|---|---|
| **Lista** (`storico__default`) | **ST-1** [CONDIVISO] **Densità e gerarchia piatte**: ogni riga è una card di ~100 px con **tre righe dello stesso peso** (nome in grassetto, stato, dettaglio); la data a destra va **a capo** («25/11/2026, / 12:55»), il nome fino a **5 righe** con nomi lunghi (`storico__dati-lunghi-nome-locale`). 16 righe = ~1700 px di scorrimento. Il nome del locale si **ripete** 4 volte di seguito. [F] | **A)** raggruppare **per giorno** («Oggi», «Ieri», «20 ottobre») con una riga compatta (nome · ora · stato). **B)** card più basse, data sotto il nome. **C)** lasciare. Consiglio A. Su schermo largo → tabella (chat desktop). | A |
| | **ST-2** [CONDIVISO] **Lo stato è solo testo con un glifo** (`✔ Approvata`, `⚠ Rifiutata`, `⏱ Scaduta`, `… In attesa`): nessun colore né forma; `⏱` si disegna come **emoji diversa** nei due temi (contorno in chiaro, pieno in scuro: `storico__default`); «**…**» come icona dello stato «In attesa» si legge come «caricamento». Il glifo **non è `aria-hidden`**: lo screen reader legge «segno di spunta Approvata». [F] | Indicatore di stato (pattern «chip di stato»: icona SVG `aria-hidden` + testo + colore, 4 stati) condiviso con la coda dello Staff. | A |
| | **ST-3** [CLIENTE] Il **premio** (il dato più importante per il cliente) è «1 premio riscattato» in grigio, senza nome del premio né evidenza; un cliente che scorre non lo nota. Termini: «riscattato» qui, «**ritirato**» nello Staff, «ottenuto» nel dialog (P-1): tre parole. [F] | Evidenziare le righe con premio con l'**accento premio** (D11) + icona; scegliere **un solo verbo**. Il nome del premio richiede backend (**D9**, etichetta «richiede backend»). | M |
| | **ST-4** [CLIENTE] La riga è **solo informazione**: non apre nulla (niente dettaglio della richiesta). Va bene per l'MVP; non c'è un «Riprova a chiedere». [I] | Nessuna per ora. | B |
| | **ST-5** [CONDIVISO] **Nessun limite né paginazione** nel frontend; nel backend non ho trovato `.limit` per lo storico [V]: un cliente con molte richieste ottiene **tutto** in un'unica lista e in un'unica risposta. [F codice] | Segnalato come domanda (D21). Per la UI: «Carica altri» o scorrimento infinito, filtri sticky. | M |
| **Conteggio** | Il «16 richieste» è `small` grigio sopra la lista: poco evidente ma corretto. | — | B |
| **Filtri chiusi/aperti** (`storico__default`, `storico__filtri-aperti`, `storico__filtro-esito-attivo`) | **ST-6** [CONDIVISO] **Filtri attivi invisibili a pannello chiuso**: compare solo «Azzera»; non dice **quali** (nessun «Filtri · 2», nessuna chip). Aperto, «Filtri» è pieno arancione e «Azzera» pure: **due blocchi arancioni uguali** a fianco, l'azione minore pesa quanto il toggle. [F] | «Filtri · 2» + riepilogo a chip sotto la barra, ognuna rimovibile; «Azzera» come link/secondario. | M |
| | **ST-7** [CLIENTE] Il cliente ha richieste su **più locali** ma **non può filtrare per locale**: i filtri sono esito, timbri, periodo (`HistoryFilters`). [F codice] | Filtro per locale: **richiede backend** (parametro nuovo). Candidato, non urgente. | B |
| | **ST-8** [CONDIVISO] **Periodo**: due `input type=date` nativi senza scorciatoie; nessun «Ultimi 7 giorni / Questo mese». Nelle catture `mm/dd/yyyy` (lingua del browser: su un telefono italiano sarà localizzato [V]). Il filtro «Timbri min/max» è il meno usato ma occupa mezzo pannello. [F] | Preset del periodo; «Timbri» in coda o dietro «Altri filtri». | B |
| **Errori di validazione** (`storico__errore-min-maggiore-max`, `-date-incoerenti`, `-data-nel-futuro`, `-timbri-non-numerici`) | **ST-9** [CONDIVISO] L'errore è **una riga rossa sotto la barra «Filtri»**, **lontana dal campo** (con pannello aperto sta sotto il pannello, tre righe più in giù: `-timbri-non-numerici`); **i campi non cambiano aspetto** (nessun `is-invalid`, nessun `aria-invalid`/`aria-describedby`): è L-8/C-4 ma senza nemmeno l'alert vicino. Con pannello **chiuso** (dopo un deep link o la chiusura) l'errore compare **senza i campi** a cui si riferisce. [F] | Messaggio sotto il campo colpevole + bordo/icona (pattern campo di `/name`, N-3), pannello aperto in automatico. Errore dei filtri in **scuro 4,08:1**: serve un token errore più chiaro nel tema scuro. | A |
| | **ST-10** [CONDIVISO] **La lista resta quella di prima** durante l'errore (codice: «keep the last list on screen») e sotto l'errore compare il conteggio («14 richieste»): **mostra dati che non corrispondono ai filtri in forma**. In `storico__errore-timbri-non-numerici`: errore «I timbri devono essere un numero» sopra «14 richieste» filtrate per Esito. [F] | Con filtri non validi: lista attenuata o nascosta + «Correggi i filtri». | M |
| **Vuoto** (`storico__vuoto`, `storico__vuoto-con-filtri`) | **ST-11** [CONDIVISO] **Stesso testo** per «non hai mai fatto richieste» e «nessun risultato con questi filtri»: «Nessuna richiesta trovata.» in una card piccola, grigia, senza azione. Con filtri, «Azzera» sta in alto, **non accanto al messaggio**. [F] | Due stati: dati assenti («Quando chiedi un timbro lo vedrai qui», con eventuale icona) e filtri vuoti («Nessun risultato» + bottone «Azzera filtri» nella card). | M |
| **Caricamento** (`storico__caricamento`) | **ST-12** [CONDIVISO] «Caricamento…» in `small` grigio sotto «Filtri»; nessuna forma della lista. E i **caricamenti successivi** (cambio filtro) **non hanno alcun indicatore**: la lista vecchia resta e il conteggio non cambia finché non risponde (`loading` mostrato solo al primo caricamento). [F codice] | Scheletro di 3 righe; sui ricaricamenti lista attenuata o barra sottile. | M |
| **Errore** (`storico__errore`) | **ST-13** [CONDIVISO] «Errore interno» in un alert, **nessun «Riprova»** e nessuna spiegazione (V-5). I filtri restano, ma cambiarli è l'unico modo di ritentare. [F] | Pattern errore con «Riprova». | M |
| **Focus** (`storico__bottone-filtri-focus`, `-azzera-focus`, `-select-esito-focus`, `-input-min-focus`, `-input-data-focus`, `-bottone-indietro-focus`) | Come **L-6/L-7**: alone pesca sui campi (1,79:1), anello sottile in scuro; «Indietro» e «Filtri» **pieni arancioni** al focus/pressed (= aperto = pressed, S-3). Il select e le date nativi **non si vedono aperti** (limite di cattura). | Anello unico; stato «aperto» ≠ «focus». | (via L-6) |
| **Titolo** | **ST-14** [CONDIVISO] «Le tue richieste» (titolo) vs «**Storico richieste**» (riga del Profilo e voce del menu): due nomi per la stessa pagina; `h4` peso 500 (come L-3). [F] | Un nome solo. | B |
| **Staff** | **ST-15** [CONDIVISO, da confermare nelle catture Staff] Per lo Staff `venueName` non arriva (`HistoryItem`: «only in the customer's history»): la riga mostra il **codice della card** in grassetto (`venueName ?? publicCode`), senza nome del cliente. Minimizzazione ok; **leggibilità**: il codice è l'unico identificatore ma è poco riconoscibile. [F codice] [V] nei PNG `screens/staff/staff/storico__*`. | Da valutare nella chat 8 (Staff). | — |

### 4. Elimina account — `/account/delete`

**Da mantenere** [F]
- **Due passi con codice via email** (intro → codice): l'azione irreversibile richiede prova di identità, non un semplice tap (`elimina__intro` → `elimina__codice-completo-non-inviato`).
- **Non invia da solo** al sesto numero (a differenza del Login): scelta voluta, motivata nel codice. Il bottone resta inattivo finché le cifre non sono sei. È il **freno giusto** per l'irreversibilità.
- «**Non si può annullare.**» è una riga a sé, in grassetto: dice l'irreversibilità senza gergo.
- L'email a cui è stato inviato il codice è **ripetuta** nel secondo passo («Abbiamo scritto a …»): si capisce *chi* si sta eliminando.
- Messaggi di errore **specifici e con il conteggio** dei tentativi (come C-x); codice scaduto/tentativi finiti → «Invia un nuovo codice» diventa primario; lo stato si conserva al reload; membri → pagina bloccata invece di un bottone che non funziona.
- Alla fine si ritorna al Login con la conferma «account eliminato» (vedi Accesso).

| Stato (file) | Difetti osservati | Proposte | Pri |
|---|---|---|---|
| **Intro** (`elimina__intro`) | **EL-1** **Il testo è un blocco di tre paragrafi dello stesso peso e dimensione** su fondo bianco: titolo `h4` 500, nessuna icona, nessun avviso evidente; l'unica gerarchia è il grassetto di «Non si può annullare.» (14 px). Per l'azione più grave dell'app è la pagina **meno marcata**. [F] | Riquadro di avviso con icona (alert danger/warning) per l'irreversibilità; elenco puntato di **cosa viene eliminato** e (se serve) **cosa resta [V]**. | A |
| | **EL-2** **Il copy ha errori e non dice cosa succede**: «Se continui tutti i dati dell'account vengono eliminati» (manca la virgola dopo «continui»), «Per motivi sicurezza» (manca «di»), «le card dei tuoi posti preferiti» (vago). [F] Cosa viene cancellato davvero? Il sistema **anonimizza** (AGENTS: «gli utenti si anonimizzano, non si cancellano»): il testo dice «eliminati». Cosa succede alla card **già in Google Wallet**? Allo storico? **[V]** con chi decide i testi (e con il legale, come D4). Non do consigli legali. | Riscrivere **solo dopo** aver chiarito i fatti: struttura «Cosa succede · Cosa non si può annullare · Come confermi». Suggerimenti nella tabella Copy. | A |
| | **EL-3** **Il rosso pieno sta sul primo passo**, che è innocuo («Invia il codice» non elimina nulla): rosso pieno 48 px a tutta larghezza + «Annulla» come **link arancione 14 px** (3,19:1) sotto. La via **sicura** è il controllo **più debole** della pagina; quella irreversibile, appena più avanti, è il più forte. [F] | Capovolgere: «Annulla»/«Torna al profilo» come bottone **secondario a tutta larghezza**, ben visibile; il passo 1 rosso **o** neutro con etichetta chiara («Continua: invia il codice»). **[V]** con utenti: il rosso al passo 1 aiuta a fermarsi o spaventa? | A |
| | **EL-4** Alert sopra al bottone, come in L-8: l'errore generico («Connessione non riuscita, riprova») **sposta** il bottone di ~55 px (`elimina__errore-generico`). | Pattern errore (via L-8). | M |
| **Codice vuoto/parziale** (`elimina__codice-vuoto`, `-parziale`) | **EL-5** **«Elimina il mio account» è disabilitato e sbiadito** (2,74:1 chiaro, 3,47 scuro) finché non ci sono sei cifre: è L-1 su un rosso. Ma qui il disabilitato ha una funzione di **sicurezza**: la regola globale («primari mai disabilitati») va applicata? Il codice è già il gate: se il bottone resta attivo e si tocca con meno di sei cifre, basta un messaggio sul campo; nulla si cancella senza il codice giusto. [F] [I] | Vedi **D20**: consiglio di **applicare la regola** (sempre attivo, al tocco messaggio «Scrivi le 6 cifre»). | M |
| | Campo codice: stesse caratteristiche di C-x (cifre 28 px, spaziate): ✅. Il campo **non ha stato invalido** dopo un errore (come C-4). | Pattern campo. | (via C-4) |
| **Codice completo** (`elimina__codice-completo-non-inviato`) | **EL-6** Qui il rosso pieno «Elimina il mio account» è **a ~8 px sopra** i due link «Invia un nuovo codice» e «Annulla» (14 px, 44 px di altezza): **rischio di tap sbagliato** in entrambe le direzioni (con un dito si può cadere su «Annulla» pensando di confermare, o l'inverso) [I]. La posizione del bottone (y≈290) è quasi la stessa di «Invia il codice» al passo 1 (y≈301): chi ha toccato due volte per abitudine arriva al secondo passo con il pollice già sul punto. [F] | Distanza maggiore (≥16 px) e «Annulla» **sopra** o separato; etichetta più forte per l'azione finale («Elimina definitivamente»). Alternativa: bottoni affiancati con pesi diversi. | M |
| **Errore codice** (`elimina__errore-codice-non-valido`, `-ultimo-tentativo`, `-generico-conferma`) | **EL-7** **Il codice viene cancellato sempre**, anche per un **errore di rete** (`confirmDeletion` → `code.value = ''` nel `catch` per qualsiasi errore): con «Connessione non riuscita, riprova» (`elimina__errore-generico-conferma`) il campo si svuota e il cliente deve **riscrivere un codice che era giusto**; con un codice che vale 5 minuti è un costo vero. [F codice] Variante peggiore di C-4. | Svuotare solo per «codice non valido»; sull'errore di rete mantenere il codice e il tasto «Riprova». (È un comportamento: va concordato come test, TDD.) | A |
| **Tentativi finiti / scaduto** (`elimina__tentativi-finiti`, `-codice-scaduto`) | **C-5 qui**: «Elimina il mio account» **disabilitato** sopra a «Invia un nuovo codice» **arancione non a tutta larghezza**, con «Annulla» a lato. In più due «colori primari» (rosso e arancione) a pochi pixel. [F] | Come C-5: nascondere «Elimina…» quando il codice è morto. | A (via C-5) |
| **Reinvio / attesa 429** (`elimina__reinvio-in-corso`, `-attesa-429*`, `-codice-reinviato`) | Il reinvio mostra «**Elimino…**» sul bottone rosso (`elimina__reinvio-in-corso`): dice una cosa **falsa e grave** (sta *inviando un codice*, non eliminando). È C-6 con la parola peggiore possibile. [F] Il 429 usa l'alert giallo («Riprova tra 3 min»: L-9). | Testi distinti. | A |
| **Eliminazione in corso** (`elimina__eliminazione-in-corso`) | «Elimino…» (campo letto-solo, link disabilitati): coerente; nessun indicatore (come L-8). | Indicatore di avanzamento. | M |
| **Intestazione e uscita** | **EL-8** `Annulla` usa `router.back()`: se la pagina è stata aperta da un URL o dopo un reload, «indietro» può **lasciare l'app** [I]. Lo stato del passo «codice» si conserva nella tab: chi torna dopo ore trova «Abbiamo scritto a… Il codice vale 5 minuti» con un codice **già scaduto** (si scopre solo digitandolo). [F codice] | «Annulla» → rotta `profile` esplicita; mostrare la scadenza del codice. | B |
| **Coerenza colori** | **EL-9** **Tre rossi** nello stesso flusso: `btn-danger` pieno `#dc3545` (Bootstrap), zona pericolosa `#c92a3a`/`#f0808b` (token `--stampy-danger`), `text-danger` degli errori; il commento in `stampy.scss` dice che «il `#dc3545` puro vibra sul marrone scuro» ma proprio quel colore è usato dai bottoni pieni in scuro. E «Rifiuta» nello Staff usa un altro danger ancora (01b §4). [F] | **Un solo token danger** per tema (fondo, testo, bordo, pressed) nel design system; distinto dall'accento premio (D11) e dall'arancione di marca (D1). | M |
| **Focus** | `elimina__link-nuovo-codice-focus`, `-bottone-annulla-focus`: come L-6; il rosso pieno ha l'alone pesca/rosato, poco visibile. | Anello unico. | (via L-6) |

---

## Checklist applicata (passo 4)

| Voce | Esito parte B |
|---|---|
| **Gerarchia** | Debole: titoli `h4/h5` peso 500 (N-2, L-3, ST-14); **Elimina account** è un muro di tre paragrafi piatti (EL-1); Storico: tre righe di peso uguale per riga (ST-1); «Filtri» e «Azzera» entrambi pieni (ST-6). |
| **Contrasti calcolati** | Testi ✅ (4,5+) tranne: errore filtri in scuro 4,08 (ST-9), zona pericolosa premuta 3,53, «Carta fedeltà» 4,19 sull'angolo chiaro. UI: disabilitato del rosso 2,74/2,36, bordo zona pericolosa 2,54, timbri vuoti della card 1,53. Il resto → D1/L-6. |
| **Target ≥44 px** | ✅ Bottoni 48, riga profilo 56, burger/Indietro 44, filtri 44. «Annulla»/«Invia un nuovo codice» hanno 44 px di altezza ma 8 px di distanza dal rosso (EL-6). |
| **Focus visibile** | **Riga storico e bottone Wallet: anello pieno** (modello da seguire). Campi/bottoni/link: alone pesca debole (L-6). Il select e le date nativi non verificati aperti. |
| **Errore / vuoto / caricamento** | Errore: **tre pattern** (campo+alert in Profilo, alert in Elimina, riga rossa nei Filtri) → un solo pattern. Vuoto: stesso testo per due cause (ST-11). Caricamento: testo piccolo grigio; **nessun indicatore sui ricaricamenti** (ST-12). |
| **Etichette e ruoli ARIA** | ✅ `aria-expanded/controls` sul toggle, `role=status` sul conteggio e `alert` sugli errori, `fieldset/legend`, `ul/li`, `aria-invalid`+`describedby` sul codice. ⚠ Filtri: errore non collegato ai campi (ST-9); glifi di stato letti dallo screen reader (ST-2); card Wallet statica `role=img` («3 timbri su 10») per un dato falso (PR-1). |
| **Messaggi d'errore** | Specifici per causa (filtri, codice). ⚠ «Errore interno» senza azione nello Storico (ST-13); «Elimino…» durante il reinvio (EL-7). |
| **Coerenza con le altre sezioni** | `DisplayNameForm` del Profilo = quello di `/name` (stessi N-1/N-3/N-4). Menu e burger come S-3. Danger: tre rossi (EL-9). Termini: «riscattato/ritirato/ottenuto» (ST-3). |
| **Tema scuro** | Leggibile; rosso pieno acceso (EL-9); errore filtri 4,08; Google nero su `tertiary` 1,39 (asset). |
| **Copy** | Vedi tabella; errori di grammatica nel testo di Elimina. |

### Dati mostrati e minimizzazione [F]
- **Profilo**: nome ed email (i dati dell'utente su di sé). Nessun altro dato. ✅
- **Storico cliente**: nome locale, data/ora, esito, timbri, premi. Niente codici né dati di altri. ✅
- **Storico Staff**: codice card al posto del nome (ST-15, da confermare). Il cliente non è identificato: ✅ per la minimizzazione.
- **Elimina**: l'email è ripetuta nel passo codice (serve). Il codice a 6 cifre **non** è in alcun log (regola AGENTS).
- **Membro**: stesso profilo del cliente meno due blocchi; il ruolo non è mostrato (ME-2).

## Cosa vale per lo Staff (componente condiviso, `RequestHistory`)

| | Cliente | Staff |
|---|---|---|
| ST-1 densità/gerarchia, ST-2 stato, ST-5 lista lunga, ST-6 filtri attivi, ST-8 periodo, ST-9/ST-10 validazione, ST-11 vuoto, ST-12 caricamento, ST-13 errore, ST-14 titolo | ✅ | ✅ |
| ST-3 premio, ST-7 filtro per locale | ✅ (solo cliente) | — |
| ST-15 identificazione della riga (codice) | — | da verificare (chat 8) |

Il design system deve fare **un** componente «Storico» con slot per l'identificatore della riga (nome del locale o codice).

---

## Opportunità (più breve: lo Storico e il Profilo non sono il momento chiave)

| Dove | Cosa | Sobria | Audace | Costo [I] |
|---|---|---|---|---|
| Storico | **Memoria dei premi**: i premi ritirati sono i momenti belli del cliente | Righe con premio evidenziate (accento D11 + icona), «Hai ritirato 3 premi» in testa | Una piccola «bacheca» dei premi ottenuti | basso–medio (nome del premio: backend, D9) |
| Profilo | **Le tue card** al posto del modello statico | Lista di card per locale (D14/D16) | Card con branding del locale | medio (backend) |
| Storico | Gruppi per giorno, stato come chip | «Oggi / Ieri» | — | basso |
| Elimina | **Alternative alla cancellazione** prima del passo irreversibile | Riga «Vuoi solo uscire? Esci» e «Modifica nome» | — | basso (nessun backend) |
| Elimina | Chiusura di **cortesia** dopo l'eliminazione (già c'è: avviso nel Login) | Tono caldo, senza colpe | — | basso |

## Pattern per il design system (da aggiungere ai 14 della parte A)

15. **Riga di elenco / card di elemento** (titolo, meta, stato, dettaglio; versione compatta; raggruppamento per giorno).
16. **Chip di stato** (icona SVG + testo + colore: in attesa, approvata, rifiutata, scaduta, premio) — **condiviso con lo Staff**.
17. **Pannello filtri**: toggle con conteggio, chip dei filtri attivi, «Azzera», validazione **vicino al campo** con il pattern di `/name`, apertura automatica sull'errore.
18. **Stato vuoto con azione** in due varianti: nessun dato / nessun risultato con i filtri.
19. **Azione distruttiva a due passi**: riquadro di irreversibilità con icona, elenco di cosa succede, passo di conferma con gate (codice), uscita sicura **prominente**, etichetta finale «definitiva».
20. **Token danger** unico per tema (fondo, testo, bordo, pressed, disabilitato) distinto dall'accento premio (D11).
21. **Zona pericolosa** (card) con variante «bloccata» (membri) con un'azione di ritorno.
22. **Riga-link con chevron** (`profile-row`): è un buon pattern, con anello di focus pieno.
23. **Card dei dati utente** con modifica in loco e **conferma di salvataggio**.
24. **Card del locale nel Profilo** = D14/D16, con etichetta «Anteprima / richiede backend» finché il dato non c'è.
25. **Lista lunga**: «Carica altri», filtri sticky, indicatore di ricaricamento.
26. **Formato data/ora** (locale, «Oggi/Ieri», fuso).

## Copy

Testi **letterali del codice** (restano finché non decidi); le proposte sono **suggerimenti**. Nulla di legale: dove serve una verifica è indicato.

| Oggi | Osservazione | Proposta |
|---|---|---|
| «Se continui tutti i dati dell'account vengono eliminati, comprese le card dei tuoi posti preferiti» | Manca la virgola; «eliminati» può non coincidere con l'anonimizzazione; non dice cosa resta **[V]** | Da riscrivere dopo la verifica dei fatti. Struttura: «Se continui, il tuo account verrà eliminato e non potrai più usare questa email per accedere a Stampy. **[da validare: cosa succede a card, timbri e storico]**» |
| «Non si può annullare.» | Ottimo | Mantenere (+ icona, riquadro) |
| «Per motivi sicurezza dovrai confermare l'operazione tramite un codice che ti verrà inviato via email.» | Manca «di»; lungo | «Per sicurezza ti mandiamo un codice via email: lo userai per confermare.» |
| «Invia il codice» (rosso) | Innocuo ma rosso; non dice a cosa serve | «Invia il codice di conferma» |
| «Elimina il mio account» | Chiaro; l'azione è irreversibile | «Elimina definitivamente il mio account» |
| «Annulla» (link) | Debole | «Torna al profilo» (bottone secondario) |
| «Elimino…» durante il reinvio | Falso (EL-7) | «Invio…» sul link, «Elimino…» solo sulla conferma |
| «Connessione non riuscita, riprova» (alla conferma) | Il codice si cancella (EL-7) | Mantenere il codice: «Connessione non riuscita. Riprova: il tuo codice è ancora valido.» |
| «Questo account gestisce un locale e non può essere eliminato da qui.» | Non dice cosa fare **[V]** | + «Per eliminarlo, …» (testo da approvare, dipende da B4b) |
| «Nessuna richiesta trovata.» | Una frase per due cause | «Non hai ancora richieste. Quando chiedi un timbro, la vedrai qui.» / «Nessun risultato con questi filtri.» |
| «… In attesa» · «✔ Approvata» · «⚠ Rifiutata» · «⏱ Scaduta» | Glifi di testo (ST-2) | Chip con icona SVG: «In attesa», «Approvata», «Non confermata» (come in Richiesta, R-10), «Scaduta» |
| «1 premio riscattato» | «riscattato» vs «ritirato» (Staff) vs «ottenuto» (dialog) | **Un solo verbo** per tutta l'app (da decidere) |
| «Le tue richieste» (titolo) · «Storico richieste» (voce) | Due nomi | Un nome |
| «I timbri devono essere un numero intero da 1 a 50.» · «Le date nel futuro non sono ammesse.» | Chiari | Mantenere; spostarli sotto il campo |
| «Modifica nome» · «Salva» · «Annulla» · «Zona pericolosa» | Ok | «Zona pericolosa» → «Elimina l'account» (sezione) |
| «Errore interno» | Non dice cosa fare (V-5) | «Qualcosa non ha funzionato. Riprova tra un attimo.» + bottone |
| «Caricamento…» | Ok | Mantenere + scheletro |

## Incoerenze rispetto ad altre sezioni (da codice e fogli)

- **Un solo form del nome** (`DisplayNameForm`) serve `/name` e Profilo: ogni correzione N-1/N-3/N-4 vale per entrambi; **nel Profilo** manca ancora la conferma di salvataggio (PR-7).
- **Tre pattern d'errore**: campo+alert (Profilo/`/name`), alert (Elimina, Storico), riga rossa (Filtri). Si fissa nel design system.
- **Tre rossi** (EL-9) e due «primari» nella stessa schermata (rosso/arancione, C-5).
- **Rosso pieno di conferma** in Elimina vs **bottone outline** per «Rifiuta» nello Staff: due modi di dire «azione negativa».
- **Termini** del premio (ST-3) e del dato «richiesta» (mai «timbro» nello storico, ma «Richiesta di timbro» nei documenti).

## Cosa MANTENERE (riassunto)

1. Anello di focus pieno sulla riga-link e sul bottone Wallet (è il modello del token).
2. Riga «Storico richieste» a 56 px con chevron; azione distruttiva (Elimina) di peso basso nel Profilo.
3. Elimina: codice via email, **nessun invio automatico**, «Non si può annullare.» in una riga a sé, l'email ripetuta.
4. Filtri nell'URL, etichette visibili, `fieldset/legend`, messaggi di validazione specifici.
5. Conteggi con singolare/plurale corretto; nomi lunghi che vanno a capo.
6. Messaggi d'errore del codice con conteggio dei tentativi; stato conservato al reload.
7. Focus che si sposta bene (apre/chiude il form del nome).
8. Profilo minimale (solo nome ed email) e storico senza dati di terzi.
9. Pagina «bloccata» per i membri invece di un bottone che non funziona (da completare con l'uscita).
10. Modello della card Wallet (struttura, colori, timbri vuoti/pieni): **base di D16**, non da buttare.

## Top 10 della parte B (impatto / sforzo)

| # | Miglioramento | Impatto | Sforzo | Rif. |
|---|---|---|---|---|
| 1 | **Elimina account**: riquadro di irreversibilità con icona, elenco di cosa succede **[V]**, uscita sicura prominente, grammatica corretta | alto | basso–medio (testi da validare) | EL-1, EL-2, EL-3, EL-6 |
| 2 | **Card Wallet modello**: togliere o etichettare «Anteprima» (dato falso + bottone morto, anche ai proprietari) | alto | basso | PR-1, ME-1 |
| 3 | **Storico**: righe per giorno, **chip di stato** con icona (condiviso con lo Staff), premio evidenziato | alto | medio | ST-1, ST-2, ST-3 |
| 4 | **Filtri**: errore **accanto al campo**, lista non «stantia» con filtri non validi, filtri attivi visibili («Filtri · 2» + chip) | alto | medio | ST-6, ST-9, ST-10 |
| 5 | **Non cancellare il codice su errore di rete** (Elimina) e testi distinti per reinvio («Elimino…» falso) | alto | basso (comportamento: test concordati) | EL-7, C-6 |
| 6 | **Stati dello Storico**: vuoto a due cause con azione, caricamento con scheletro e sui ricaricamenti, errore con «Riprova» | medio | basso | ST-11, ST-12, ST-13 |
| 7 | **Profilo**: intestazione nome/email/modifica senza spezzature, **segnaposto dei ruoli** (niente «Elimina» prima di sapere), conferma di salvataggio | medio | basso | PR-3, PR-7, PR-8 |
| 8 | **Un solo token danger** + regola del disabilitato anche per il rosso | medio | basso (token) | EL-5, EL-9, D20 |
| 9 | **Lista lunga**: «Carica altri» / limite lato backend, filtri sticky | medio | medio (**backend**, [V]) | ST-5, D21 |
| 10 | **Membro**: zona «bloccata» con azione, «Esci» nel profilo, nome unico per «Storico» | basso–medio | basso | ME-1, ME-3, PR-9, ST-14 |

Ordine consigliato: **1, 2, 5** sono i più urgenti (rischio, falsità del dato, perdita di dati inseriti); 3, 4, 6 si fanno insieme nel componente condiviso con lo Staff **dopo** la critica Staff; 7, 8, 10 nel design system; 9 richiede backend.

## Domande aperte per me (da D17: D16 è già la card del locale)

- **D17.** **Card Wallet «Bar Aurora»** nel Profilo (PR-1): **toglierla** finché B30 non c'è (consiglio), tenerla con etichetta «Anteprima» e senza bottone, o lasciarla così? Nel mockup resterà come elemento «richiede backend».
- **D18.** **Testo di Elimina account** (EL-2): chi valida con un legale (come D4) **cosa viene eliminato/anonimizzato**, cosa resta e cosa succede alla card in Google Wallet? Finché non c'è, i testi restano com'è e io non li invento.
- **D19.** **Uscita da Elimina** (EL-3): «Annulla» come bottone secondario a tutta larghezza (consiglio) o resta un link? E il rosso pieno al passo 1: tenerlo (**[V]**) o neutro, con il rosso solo sul passo finale?
- **D20.** Regola globale «primari mai disabilitati»: vale anche per «**Elimina il mio account**» (consiglio **sì**: il codice resta il gate e il tocco con meno di sei cifre mostra un messaggio)? Oppure per i bottoni distruttivi il disabilitato è ammesso?
- **D21.** **Storico**: il backend **non limita** la lista [V]; vuoi un limite/paginazione (richiede backend, backlog) o resta fuori finché il volume è basso? E il filtro **per locale** nel cliente (ST-7, backend)?
- **D22.** **Storico**: raggruppare **per giorno** con chip di stato (consiglio, ST-1/ST-2) o tenere card piatte con più peso al nome? Su desktop diventa tabella (decisione per la chat desktop).
- **D23.** **Un solo verbo** per il premio: «riscattato», «ritirato» o «ottenuto»? (Il codice ne usa tre.) Dipende anche dal testo del dialog (D12: il premio è già consegnato).
- **D24.** **Profilo**: «Esci» anche qui (PR-9) e conferma di salvataggio del nome (PR-7): sì/no?

## Non verificato / dubbi

- **Date nei campi**: `mm/dd/yyyy` è la lingua del browser di cattura; sul telefono italiano non verificato.
- **Select Esito e picker date aperti**: non catturabili; lo stato aperto, il comportamento con lo screen reader e il focus nel picker non sono verificati.
- **Backend e storico**: assenza di `.limit` e di paginazione cercata solo nel codice di `api/` (grep): non ho letto le query una a una [V].
- **Cosa fa davvero «elimina account»** oltre alla conferma (anonimizzazione, Wallet, storico): non l'ho verificato; non commento aspetti legali.
- **Cosa mostra lo storico Staff** (`ST-15`): dedotto dal codice, da confermare nei PNG `screens/staff/staff/storico__*` (chat 8).
- **Screen reader**: l'annuncio degli errori dei filtri, dei glifi di stato, del cambio «Elimina → Elimino…».
- **Il focus «pieno» dei due elementi buoni**: visto nei PNG, non provato con la tastiera reale.
- **Font reale** (DejaVu nelle catture), zoom 200%, orientamento orizzontale, tastiera aperta nel form del nome o nel campo codice.
- Il bottone Google Wallet reale e il suo ritorno: non catturabili (come V-4).
