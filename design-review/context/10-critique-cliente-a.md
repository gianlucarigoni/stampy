# 10 · Critica sezione Cliente, parte A (flusso principale)

Chat 6, 2026-11-25. Schermate: `/name`, `/scan`, Visita `/v/:id`, Richiesta `/r/:id` (in attesa, approvata, **premio**, rifiutata/scaduta, errori).
Fonte: `screens/cliente/cliente/` (57 stati × chiaro/scuro, telefono 390×844 @2x) + codice di `DisplayNameForm`, `CustomerVisitView`, `CustomerRequestView`, `StampProgress`, `RewardDialog`, `PromotionNotice`, `stampy.scss`.
Nessun codice dell'app modificato. Proposte = **da decidere da te**, con alternative. Le decisioni D1-D8 (`11-decisions.md`) sono rispettate e non riaperte.
Etichette: **[F]** fatto osservato (PNG o codice) · **[I]** ipotesi · **[V]** da validare. Sigle: `N-` /name · `S-` /scan · `V-` Visita · `R-` Richiesta · `P-` Premio · `K-` timbri (momento chiave). `L-x`/`C-x` rimandano a `10-critique-accesso.md`.

## Divisione del Cliente in due parti

Volumi (nomi di stato × 2 temi, da `03-capture-cliente.md`): **A = 57** (`name` 11, `scan` 5, `visita` 14, `richiesta` 27) · **B = 66** (`profilo` 20, `storico` 20, `elimina` 22, `membro/` 4).
Sono **equilibrati**: la proposta (A = flusso principale; B = profilo, storico, elimina account, membro) regge, **nessuna correzione**. In questa chat solo A; la parte B (chat 7) dovrà riusare i pattern fissati qui (errore, alert, bottone danger, card).

## Come ho lavorato e cosa è affidabile

- **Fogli di contatto**: `screens/_sheets/cliente-a/sheet-01…19.png` (3 stati × chiaro/scuro), da `scripts/make-sheets-parte.mjs` (copia adattata di `make-sheets.mjs`: filtro per prefisso + cartella di output; Playwright del frontend, nessuna dipendenza installata). **Visti 14 su 19**: 02, 03, 04, 05, 06, 09, 10, 11, 12, 13, 14, 17, 18, 19. **Non visti**: 01, 07, 08, 15, 16 (solo varianti focus/pressed dei bottoni e le ripetizioni `solo-premio`, equivalenti a `premio-e-timbri`). **PNG originali aperti: nessuno** (i fogli bastavano).
- **Contrasti nuovi**: `scripts/contrasts-cliente.mjs` (stessa formula di `contrasts.mjs`, valori dei token reali). Non misurati sui pixel (±0,05).
- **Limiti delle catture** (come in Accesso): widget Vue DevTools in basso ignorato; font DejaVu (non quelli del telefono); gli stati 429/errore/«in corso» sono simulati; il dialog dura **una sola cattura** (nessuna animazione nel codice, quindi nulla da vedere in movimento).
- Skill `design-critique` / `accessibility-review` / `ux-copy`: non disponibili (come in Accesso); criteri applicati a mano.

## Contrasti nuovi rispetto all'Accesso

Già calcolati e **non ripetuti**: testo/sfondo, alert (7–10:1), bianco su arancione 3,19, link, bordi campo, focus, disabilitato (L-2, L-6, tabella dell'Accesso).

| Coppia (parte A) | Chiaro | Scuro | Esito |
|---|---|---|---|
| **Pallino vuoto** (bordo 3 px arancione) su card | 3,19 | 5,78 | ✅ UI ≥3, **al limite in chiaro** |
| Pallino pieno su card | 3,19 | 5,78 | ✅ (lo stato pieno/vuoto si legge dal **riempimento**, non dal colore: regge anche per i daltonici) |
| Dialog: fondo vs pagina oscurata (backdrop 60%) | 5,74 | **1,08** | ⚠ in scuro il dialog si separa solo dal bordo |
| Dialog: bordo arancione vs pagina oscurata | **1,80** | 6,27 | ⚠ in chiaro il bordo conta poco (regge il fondo bianco su `#666`) |
| Pallino pieno sotto il backdrop (decorativo, inerte) | 2,03 | 1,72 | — (non serve) |
| `PromotionNotice`: testo su tinta 10% | 13,84 | 12,63 | ✅ |
| `PromotionNotice`: icona arancione su tinta | **2,87** | 5,15 | ⚠ chiaro (decorativa, accompagnata da testo) |
| `PromotionNotice`: bordo (arancione 45%) su pagina | 1,69 | 2,08 | (decorativo) |
| Campo **invalido** (bordo/icona rossa) su campo | 4,53 | 7,30 | ✅ — **il `is-invalid` di `/name` è l'unico campo dell'app che passa 3:1 nello stato invalido** |
| Burger ☰ (bordo/righe) su sfondo | 3,19 | 5,78 | ✅ al limite in chiaro |
| Burger premuto/aperto: icona bianca su arancione | 3,19 | 3,19 | ✅ UI ≥3 |

Lettura: i contrasti **nuovi** sono quasi tutti a posto; l'unica coppia davvero debole è il **dialog del premio in scuro** (separazione 1,08:1, rimane solo l'anello arancione). Il resto del colore è già coperto da D1.

---

## Per schermata e stato

Priorità: **A** alta · **M** media · **B** bassa.

### 1. Come ti chiami? — `/name`

**Da mantenere** [F]
- Titolo domanda + una riga che spiega **perché** («Ci serve per riconoscerti nei locali») e che è modificabile (`name__vuoto`).
- Etichetta visibile, suggerimento **sempre visibile** sotto il campo («Da 3 a 50 caratteri.»), mai solo nel messaggio d'errore (`DisplayNameForm.vue:55`).
- **Stato invalido fatto bene**: bordo rosso + icona (!) nel campo, `aria-invalid`, focus riportato sul campo, `aria-describedby` a suggerimento+errore (`name__errore-troppo-corto`, `…troppo-lungo`). È il **modello da estendere** a Login/Elimina (risponde a L-8/C-4).
- Nome di 50 caratteri senza spazi scorre dentro il campo senza rompere il layout (`name__nome-lungo-50-caratteri`).
- Messaggi specifici («Scrivi almeno 3 caratteri», «Al massimo 50 caratteri»).

| Stato (file) | Difetti osservati | Proposte | Pri |
|---|---|---|---|
| **Vuoto** (`name__vuoto`) | **N-1** «Continua» **disabilitato e sbiadito** (`:disabled="busy \|\| !name.trim()"`): è la regola globale violata, vedi L-1/C-1 e `11-decisions` (primari mai disabilitati). Qui peggiora: è un **passaggio obbligato** (non saltabile, guardia del router) e l'unico bottone della pagina. [F] | Sempre attivo; se vuoto, al tocco: focus sul campo + messaggio «Scrivi il tuo nome». | A |
| | **N-2** Titolo `h4` peso 500, stesso peso del testo sotto (come L-3), e «Il tuo nome» (600) lo supera. [F] | Vedi «Gerarchia» (capitolo stile). | M |
| **Focus campo** (`name__input-focus`) | Alone pesca in chiaro, anello arancione sottile in scuro: due resa diverse. [F] Vedi L-6. | Anello unico (token globale). | (via L-6) |
| **Errore di validazione** (`name__errore-troppo-corto`, `…-lungo`) | **N-3** L'errore è **doppio**: icona+bordo nel campo **e** alert sotto; l'alert sposta «Continua» di ~55 px (come L-8). Il testo dell'alert ripete quello che il campo già dice. [F] | Tenere campo invalido (pregio) e **mettere il messaggio al posto del suggerimento** «Da 3 a 50 caratteri» (stessa riga, rosso, con icona), **senza alert** e senza spostare il bottone. Alternativa: alert in cima alla card. | A |
| **Errore di rete / 429** (`name__errore-generico`, `name__errore-429`) | **N-4** Con un **errore di connessione** il campo diventa **rosso con (!)** come se il nome fosse sbagliato, mentre il nome è corretto (`fail()` imposta `error` per ogni causa → `is-invalid`). [F] Dice all'utente di correggere qualcosa che va bene. Il 429 dice «riprova tra 30 secondi» senza contare. | Distinguere: errori **di campo** → campo rosso; errori **di sistema** → solo messaggio generale (alert o riga sotto il bottone), campo neutro. | A |
| **Salvataggio** (`name__salvataggio-in-corso`) | «Salvo…» sul bottone già sbiadito, campo readonly: nessun cambio di aspetto utile (come «Invio…» in Accesso). [F] | Indicatore (puntini/spinner) come da pattern di avanzamento. | M |
| **Compilato / bottone focus / pressed** | Nessuno nuovo (stessi del Login: L-6, L-7). | — | — |
| **Nome lungo** | Il campo mostra solo la **fine** del testo (inizio tagliato) quando ha il focus. Normale. | — | — |
| **Copy** | «Ci serve per riconoscerti nei locali.» ok. «Salvo…» ok. | — | — |

### 2. Scansiona — `/scan`

**Da mantenere** [F]: testo chiaro e diretto che spiega **entrambi** i modi di entrare (tag NFC e QR); card sobria; menu ☰ con Profilo/Esci (`scan__default`, `scan__menu-aperto`).

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| **Default** (`scan__default`) | **S-1** È la **schermata di casa** del cliente appena loggato (destinazione di default) ed è un **vicolo cieco**: solo testo, nessuna azione, nessuna illustrazione, nessuna card esistente. [F] Chi ha già 3 carte non le trova qui (vede i timbri solo in Wallet, o rifacendo la visita). [I] | **A)** icona/illustrazione di tag NFC e QR (opportunità, vedi sotto) mantenendo il testo. **B)** elenco delle proprie card con progresso (**richiede backend**: nuova D14). **C)** lasciare. | M |
| | **S-2** Titolo su due righe, peso 500: la frase d'azione compete col sottotitolo grigio. [F] | Titolo più breve («Avvicina il telefono al tag») e peso 650+. Copy da approvare. | B |
| **Menu aperto** (`scan__menu-aperto`) | **S-3** La tendina (2 voci, ~120 px di larghezza) **copre il titolo** sotto il bottone, senza ombra marcata; «Esci» **non è distinta** da «Profilo» (nessun colore/icona di uscita). [F] Il bottone aperto è **pieno arancione**, identico a **focus e pressed** (`scan__bottone-menu-focus`/`-pressed`): non si capisce se è «aperto» o «premuto». [F] | Stato «aperto» distinto dal focus (es. riempimento tenue + `aria-expanded` visibile); ombra/bordo del menu più netti; separatore sopra «Esci». Pattern per il design system (menu, vale anche per la parte B e lo Staff). | M |
| **Burger focus** | Come L-7 (focus ≈ pressed). | Anello unico. | (via L-7) |
| **Target** | Burger 44×44, voci ~44 px: ✅ [F]. | — | — |

### 3. Visita — `/v/:id`

**Da mantenere** [F]
- **Un'azione per riga, a tutta larghezza**, 48 px: «Aggiungi a Google Wallet» e «Richiedi il timbro» sono ciascuno un bottone pieno (`visita__card-pronta`).
- **Inversione primario/secondario dopo il tap su Wallet** (`visita__dopo-tap-wallet`): il passo successivo diventa quello evidenziato. Idea giusta (UX-09 del codice).
- Il codice card sempre visibile in fondo; la frase «è qui che vedrai i tuoi timbri» dà la ragione del passaggio in Wallet.
- Errori **distinti per causa** nel testo («link non valido», «nessuna promozione», «troppe richieste. Riprova tra 25 min») e **senza Riprova dove sarebbe inutile** (link non valido, nessuna promozione).

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| **Caricamento** (`visita__caricamento`) | **V-1** Solo «Un momento…» in grigio, **in alto a sinistra, fuori dalla card**, su pagina vuota; poi la card compare di colpo (salto di layout). Nel caso reale è breve; con rete lenta è una pagina bianca con una riga. [F] | Scheletro della card (titolo + 2 bottoni) o spinner + «Un momento…» dentro la card; stessa altezza della card finale. Pattern «caricamento» da definire una volta (vale per Richiesta e Staff). | M |
| **Card pronta** (`visita__card-pronta`) | **V-2** **Non dice dove sei**: nessun nome del locale, nessun premio, nessun numero di timbri. Il cliente che ha appena toccato un tag non vede **conferma di essere nel locale giusto**. [F] (Il dato non c'è nella risposta: richiede backend, **D9**.) | Con backend: «**Da Gennaro** · 10 timbri = Pizza margherita». Senza: nulla da fare lato UI. | A |
| | **V-3** Due bottoni dello stesso peso visivo (pieno + outline, stesso arancione) per due azioni **in sequenza**; il testo non dice l'ordine («prima Wallet, poi richiedi»). [F] [I] Chi tocca «Richiedi il timbro» senza Wallet non ha torto. | **A)** numerare i passi (1 Salva la card · 2 Chiedi il timbro) tenendo i due bottoni. **B)** dopo il tap su Wallet, segnalare «✔ Card aggiunta?» (non vero finché non è verificato: il codice stesso lo vieta: `CONTEXT.md` §4.6; quindi **non** scrivere «aggiunta»). C) lasciare. Non cambia il flusso (decisione di prodotto). | M |
| **Dopo tap Wallet** (`visita__dopo-tap-wallet`) | **V-4** Il cambio di colore dei bottoni avviene **dietro la nuova scheda** di Wallet: al ritorno l'utente vede due bottoni uno pieno e uno outline invertiti **senza spiegazione**. [F] [I] | Una riga che compare al ritorno: «Fatto? Ora chiedi il timbro» (senza dichiarare l'esito). | M |
| **Errore generico / 429** (`visita__errore-generico`, `visita__errore-429`) | **V-5** «Errore interno» e «Troppe richieste. Riprova tra 25 min.» in un alert rosa **dentro una card** con il bottone «Riprova»: nessun titolo, nessuna icona, nessuna spiegazione; «Errore interno» non dice cosa fare. Con 25 min il «Riprova» **non servirà a nulla** ma è il bottone più evidente. [F] | Pattern errore unico (vedi sezione) con titolo + testo + azione; nel 429 con attesa lunga: bottone secondario/disabilitato con il tempo. | M |
| **Errori senza Riprova** (`visita__errore-link-non-valido`, `…-locale-inesistente`, `…-nessuna-promozione`) | **V-6** Vicolo cieco totale: alert e basta, **nessuna uscita** (nessun «Torna alla home») e due casi diversi (link malformato / locale inesistente) mostrano lo **stesso** testo (voluto: nessuna fuga d'informazioni). [F] Come N-1 dell'Accesso. | Un'azione secondaria sempre presente («Vai alla pagina iniziale»); per «nessuna promozione» un testo meno tecnico («Questo locale non ha un'offerta attiva al momento. Riprova più tardi.»). | M |
| **Bottoni focus/pressed** | Come L-6/L-7. | — | — |

### 4. Richiesta — `/r/:id`

**Da mantenere** [F]
- **I pallini grandi, in righe bilanciate** (5+5, 4+4; mai un pallino solo sull'ultima riga), con dimensione uniforme e lettura immediata «7 su 10» a colpo d'occhio (`richiesta__in-attesa-7-di-10`). Funzionano in chiaro e scuro; pieno/vuoto si distingue dal riempimento (non dal colore soltanto).
- **Gerarchia degli stati**: l'esito è un alert verde in cima («Richiesta approvata!» + «+2 timbri aggiunti») prima dei pallini; la risposta alla domanda «è andata?» è la prima cosa che si vede (`richiesta__approvata-con-timbri`).
- Il testo del premio che si accumula è **corretto e rassicurante**: «Il prossimo prodotto è gratis: mostra questa schermata al personale».
- **Scadenza spiegata** in anticipo («La richiesta resta valida solo per pochi minuti: se scade potrai rifarla») e **«Richiedi di nuovo»** nello stato scaduto/non confermata, quando l'app conosce il locale.
- `PromotionNotice` (cliente): **sobria**, una riga con icona, non allarmante, dice che cosa succede senza dire quanti timbri si perdono (decisione di prodotto 2026-11-09) (`richiesta__in-attesa-promozione-cambiata`).
- Il dialog è un `<dialog>` nativo (focus trap, Esc, ritorno del focus) con `aria-labelledby`/`describedby`; non si chiude per sbaglio (nessun clic sul backdrop).

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| **In attesa** (`richiesta__in-attesa-*`) | **R-1** Lo stato è **completamente statico**: nessun segnale che l'app stia **ascoltando** (polling ogni 2 s) né quanto tempo resta (`expiresAt` esiste nella risposta, la UI non lo mostra). Il cliente vede «Stiamo aspettando…» senza movimento: può pensare che sia bloccata e ricaricare. [F] [I] | Segnale di vita nel contenuto: **il prossimo pallino vuoto pulsa piano** (vedi Opportunità), oppure puntini animati accanto al titolo; scadenza come «scade tra N min» (dato già presente, solo UI). `prefers-reduced-motion`: pulsazione statica (bordo più spesso). | A |
| | **R-2** Il **codice card** (quello che lo staff può chiedere a voce) è in grigio secondario 14 px **in fondo**, tra le cose meno visibili. Il testo «mostra questa schermata» non è chiaro: serve il **codice**? [F] [I] | Se il codice è il dato per lo staff: blocco con testo grande/spaziato (come il campo codice dell'Accesso) e etichetta «Il tuo codice». **[V]** con il personale: cosa guarda davvero. | M |
| | **R-3** Titolo «Richiesta inviata» (h4 500) e riga di spiegazione hanno lo **stesso peso**; il blocco «scade in pochi minuti» in grigio ruba lo stesso spazio della frase principale. Su 844 px la card occupa solo ~45% dell'altezza. [F] | Gerarchia del capitolo stile; in alto il **numero** (7/10) come elemento forte. | M |
| | **R-4** `7 / 10 timbri` in 16 px semibold: è **il dato principale** ed è più piccolo dei pallini e quasi uguale al corpo. Letto da screen reader: «7 barra 10 timbri» [I]. | Numero grande («7 su 10») + etichetta nascosta per screen reader «7 timbri su 10». | M |
| **Card piena in attesa** (`richiesta__in-attesa-card-piena`) | **R-5** 8/8 pieni + alert verde «Premio disponibile»: tutti i pallini arancioni uguali, il **traguardo non si distingue** da «un altro timbro»; l'alert verde è lo stesso stile di «Richiesta approvata!» (due scatole verdi uguali in momenti diversi). Il **premio non è nominato** (quale premio?). [F] | Vedi «Il momento chiave». | A |
| **Promozione cambiata** (`richiesta__in-attesa-promozione-cambiata`) | **R-6** Il banner dice «La tua card riparte da zero» sopra **7/10 pallini ancora pieni** (simulato su dati reali, quindi lo stato esatto reale è **[V]**): se nella realtà mostra il vecchio conteggio, il messaggio e il numero **si contraddicono**. | **[V]** con lo staff cosa mostra il backend al momento della richiesta; se mostra il vecchio conto, aggiungere «dopo la conferma» («Dopo la conferma la card riparte da zero.»). Copy da approvare. | M |
| | Icona arancione 2,87:1 (chiaro): decorativa, accompagnata da testo. [F] | Con D1 si risolve. | B |
| **Approvata con timbri** (`richiesta__approvata-con-timbri`, `…-approvata-card-piena`) | **R-7** «Richiesta approvata!» è un `h5` in **peso 400**, **più leggero** di «Premio disponibile» (semibold) nello stesso schermo e della riga «+N timbri». Il momento più positivo ha il testo meno forte. [F] (sheet 04 e 05) | Titolo dell'esito più grande e pesante; i timbri aggiunti **fuori dall'alert**, come dato principale («+2 timbri»). | A |
| | **R-8** Nessuna distinzione tra pallini **vecchi** e **appena aggiunti** (1→3 su 10: i primi 3 sono identici). [F] (K-2) | Vedi «Il momento chiave». | A |
| **Solo premio, nessun timbro** (`richiesta__approvata-solo-premio-*`) | **R-9** «Nessun nuovo timbro: questo prodotto era il premio.» è corretto ma **freddo**: il cliente ha appena ritirato il premio e legge «Nessun nuovo timbro». [F] | Mettere in primo piano il premio ritirato («Premio ritirato: Pizza margherita gratis»); il «nessun timbro» come nota. | M |
| **Dialog premio** (`richiesta__approvata-premio-e-timbri-dialog-premio`, `…-solo-premio-dialog-premio`) | **P-1** Vedi «Il momento chiave»: titolo «Premio sbloccato!» è un `h4` **peso 500** (uguale al testo), nessuna icona, nessuna animazione, nome del premio in 24 px semibold: è l'unico elemento con forza. Il resto è una **scatola bianca di testo**. [F] | Ibid. | A |
| | **P-2** In **scuro** il dialog si separa dalla pagina solo con il bordo arancione (1,08:1 di fondo; 6,27 di bordo). [F] (calcolo) | Fondo del dialog leggermente più chiaro del fondo (`#221c18`, già nel tema) o bagliore tenue intorno. | M |
| | **P-3** Il testo «**Mostra questa schermata al personale**» è **ambiguo** nel momento in cui compare: il dialog si apre **dopo** l'approvazione dello staff (che nella coda registra «Premio ritirato»); il cliente è invitato a mostrare qualcosa a chi ha già finito. [F codice] [I] | **[V]** con il personale se il premio è già stato consegnato in quel momento. Se sì: «Mostralo al personale se non l'hai ancora ricevuto» o togliere la frase. (Domanda D12.) | M |
| | **P-4** «Chiudi» ha il focus automatico → anello pesante all'apertura (vedi L-6/L-7), con il bottone già scurito. [F] (`dialog-bottone-chiudi-pressed`) | Anello unico; bottone sempre alla stessa resa a riposo. | B |
| **Dialog chiuso / già visto** (`…-dialog-chiuso`, `…-premio-gia-visto`) | **P-5** Chiuso il dialog, la schermata mostra «+2 timbri aggiunti» e **2/8**: **nessuna traccia del premio appena ottenuto** («Pizza margherita gratis»). Dopo un reload, il flag in `localStorage` impedisce il dialog e la pagina **non dice mai** che c'è stato un premio. [F] Se il cliente chiude senza leggere, non ha modo di riaprirlo. | Un riepilogo fisso nella card: «Premio ritirato · Pizza margherita gratis». È un **dato già presente** (`reward`, `rewardsRedeemed`), non richiede backend. | A |
| **Rifiutata** (`richiesta__rifiutata-*`) | **R-10** «Richiesta non confermata» + «Nessun timbro aggiunto.»: neutro e corretto, ma identico a «scaduta» nel layout e **senza motivo né prossimo passo** quando non c'è «Richiedi di nuovo» (stessa frase «Avvicina di nuovo il telefono…» che a un PC non dice nulla, come N-2 dell'Accesso). [F] | Mantenere il testo neutro (non si sa perché lo staff ha rifiutato); **sempre** una uscita. | M |
| **Scaduta** (`richiesta__scaduta-*`) | Messaggio chiaro; «Richiedi di nuovo» a tutta larghezza ✅. Nota: il testo «Nessun timbro aggiunto» sotto il titolo e il codice in grigio sono **tre righe di peso quasi uguale**. [F] | Gerarchia (stile). | B |
| **Non trovata** (`richiesta__non-trovata`, `…-id-malformato`) | **R-11** Vicolo cieco senza azione (come N-1 dell'Accesso); stesso testo per 404 e 400 (voluto). [F] | Bottone «Vai alla pagina iniziale». | M |
| **Caricamento / errore** (`richiesta__caricamento`, `richiesta__errore`) | Caricamento come V-1. **R-12** Errore: «Non puoi vedere questa richiesta» (403 simulata) con **Riprova**: ripetere non cambia l'esito; se il messaggio arriva dal backend è letterale (`err.message`) e può non essere ben formulato. [F] [I] | «Riprova» solo per errori di rete/5xx; altrimenti l'uscita. | M |
| **Polling in errore** | Nessuno stato visivo: la pagina riprova in silenzio ([F] `03-capture`). Se il telefono perde la rete al bancone, il cliente non lo sa. | Riga discreta «Connessione assente, riprovo…» dopo N tentativi. | M |

---

## Il momento chiave: i timbri e il premio

Questo è il cuore del prodotto: il cliente deve **sentire** di aver guadagnato qualcosa. Oggi è **corretto ma neutro**: dati giusti, nessuna emozione, ed è quello che più somiglia a un modulo amministrativo.

**Cosa funziona [F]**
- I pallini sono grandi, ordinati e leggibili in 1 secondo. «Quanto mi manca?» ha una risposta visiva (pieni vs vuoti). Stesso stile in chiaro e scuro.
- Il premio ha un nome concreto («Pizza margherita gratis») in 24 px nel dialog: è l'unica cosa che parla il linguaggio del cliente.
- Il testo «Il prossimo prodotto è gratis» rende chiaro **che cosa fare**.

**Cosa si perde oggi**
1. **K-1 · Nessun nome del locale e nessun premio durante il percorso.** Mentre il cliente accumula (pending, approvata), non vede **mai** per cosa sta accumulando né dove; il premio appare solo nel dialog, **alla fine**. [F] Il dato `reward` arriva solo con l'approvazione; il nome del locale **non** è nella risposta (**D9**, richiede backend).
2. **K-2 · Nessun «nuovo»**. Passando da 1 a 3 timbri i pallini sono semplicemente 3 pieni: nulla distingue quelli appena guadagnati; «+2 timbri aggiunti» sta in un alert in cima. [F] Il cambiamento è **testuale**, la grafica non reagisce (nessuna animazione di stato; `01b` §17).
3. **K-3 · Nessuna anticipazione**. Il prossimo pallino non è segnalato; il traguardo (l'ultimo) non è diverso dagli altri; manca «ne mancano 3». [F]
4. **K-4 · Il premio è un testo, non un oggetto.** Card piena = tutti i pallini arancioni + un alert verde che **non è** distinguibile dall'alert verde di «approvata». Il dialog è «scatola bianca con titolo leggero». [F] Il **verde** (successo) sta con l'arancione (marca) senza un accento che dica «premio». [I]
5. **K-5 · Il premio sparisce** dopo il dialog (P-5). Per un cliente è come se non fosse successo: il momento più importante non lascia traccia sulla pagina.
6. **K-6 · Metafora debole**: i pallini sono cerchi generici. Un «timbro» è un oggetto con carattere (impronta, forma del locale). [I]

**Riconoscibilità** [I]: oggi un cliente non distingue Stampy da qualunque contatore a pallini (Wallet stesso, app di altri locali). Il **brand** è solo arancione + wordmark; il design system dovrebbe dare ai timbri una forma propria (e magari il colore/logo del locale), compatibilmente con D5 (il nome è un segnaposto: non investire nel logotipo).

**Proposte (alternative, a scelta tua)**

| | Sobria | Audace |
|---|---|---|
| Timbri | I pallini **nuovi** hanno un anello/bagliore di 1 s al passaggio da «in attesa» ad «approvata»; il prossimo vuoto ha il bordo più marcato; «ne mancano 3» sotto il numero. | I pallini si **riempiono in sequenza** (stagger 80–120 ms), con piccolo «tonfo» (scala 1,0→1,15→1,0) e **vibrazione breve** su Android; l'ultimo pallino ha **icona regalo** al posto del cerchio. |
| Premio | Dialog con **icona** (stella/regalo), titolo `h2` 700 a 28 px, nome del premio in evidenza, riepilogo che **resta** sulla card dopo la chiusura (P-5). | A tutta schermata, fondo caldo, **coriandoli** (CSS, 1,5 s, spenti con `prefers-reduced-motion`), vibrazione `[40,60,40]`, il premio in primo piano. |
| Card piena (in attesa) | Alert con tinta **diversa** dal successo di «approvata» (accento premio) e **il nome del premio**. | Tutti i pallini diventano un unico oggetto «premio» (card che si trasforma) con il testo «Premio pronto». |

Vincoli: **budget quasi zero, sviluppatore solo** (`AGENTS.md`): ogni opzione **sobria** è solo CSS/SVG e dati già presenti; le **audaci** sono ancora solo CSS (niente librerie), ma richiedono più prove. `prefers-reduced-motion` va sempre rispettato (oggi lo è solo da `.dot` e dal bottone Google).

## Opportunità (tutte [I])

| Dove | Cosa | Sobria | Audace | Costo [I] |
|---|---|---|---|---|
| Pending | Segnale di vita | Puntini animati dopo «Richiesta inviata» | Prossimo pallino che **pulsa** | basso |
| Pending → approvata | Transizione | Cross-fade 200 ms tra gli stati (oggi **cambio di colpo**) | Il pallino pulsante «si riempie», gli alert scorrono dentro | basso–medio |
| Timbro aggiunto | Micro-feedback | Anello 1 s sui nuovi | Riempimento in sequenza + «tonfo» + vibrazione | basso |
| Premio | Celebrazione | Icona + titolo forte + riepilogo persistente | Full-screen + coriandoli + vibrazione | medio |
| Visita/Caricamento | Stato di attesa | Scheletro della card | Il «timbro» si imprime (animazione 600 ms) | basso |
| `/scan` | Stato vuoto | Icona NFC/QR | Illustrazione del gesto «avvicina il telefono» in loop breve | basso |
| Scaduta/Rifiutata | Tono | Resta neutro | Micro-copy caloroso («Capita: riprova quando vuoi») | basso |
| Header | Orientamento | — | Nome del locale nell'header quando noto (D9) | medio (backend) |

Nota di misura: **R-1 + K-2 + P-5** sono **solo UI** con dati già presenti, e danno più «sensazione» di qualunque restyle del colore.

---

## Proposta del proprietario (D16): la card del locale al posto dei pallini

Aggiunta dopo la prima stesura, 2026-11-25. **Proposta, non decisione.** Idea: in Visita e Richiesta i pallini diventano una **card con il branding del locale**, nello stile del modello Wallet già presente nel Profilo (`ProfileView.vue:79-99`: fondo col colore del locale, logo/iniziali, nome, «Carta fedeltà», pillola `3/10`, griglia 5 colonne di timbri bianchi con spunta, sotto «Ancora 7 timbri» / «Al decimo, un caffè in regalo»).

**Giudizio: ci sta, ed è la mossa col miglior rapporto impatto/sforzo di tutta la parte A.** [I]

**Perché funziona**
- **Un solo linguaggio**: la card sul web e quella in Wallet raccontano la stessa cosa; il cliente riconosce il locale, non «Stampy». Risolve **K-6** (metafora debole) e dà a Stampy un tratto riconoscibile senza logotipo proprio (D5: il nome resta una variabile).
- **Assorbe da sola molti difetti**: nome del locale (**V-2, K-1**), premio nominato in modo stabile («Al decimo, un caffè in regalo», **R-5, K-4**), «ancora N timbri» (**K-3**, **R-4**), riepilogo del premio che resta (**P-5**, la card può passare a uno stato «Premio ritirato»).
- **Libera l'arancione**: il colore di marca torna a bottoni/link e non deve più fare anche da timbro; la pressione su **D1** cala (i timbri prendono il colore del locale, i bottoni quello di Stampy).
- **Tema chiaro/scuro**: la card ha il proprio colore in entrambi i temi, quindi regge meglio del pallino sul fondo (oggi 3,19:1 in chiaro).
- Il modello **esiste già** nel Profilo (statico, «BACKLOG B30») e il DB ha `venues.branding` (jsonb, con `backgroundColor` e logo): non si parte da zero.

**Rischi e punti aperti**
1. **Dati dal backend [F codice]**: `GET /requests/:id` e la visita non restituiscono nome del locale, branding né premio prima dell'approvazione. Stessa richiesta di **D9**, allargata al branding: **non è solo UI**. Fino ad allora la card può esistere solo con valori di ripiego (iniziali Stampy / colore di marca).
2. **Contrasto non garantito**: il colore lo sceglie il locale. Serve una regola (testo bianco o scuro **calcolato** dalla luminanza, minimo 4,5:1 per il testo, 3:1 per spunte e vuoti) e un ripiego se il colore è troppo chiaro/vivace. Da definire nel design system; ora calcolato solo per `#1e3a5f` del modello. [V]
3. **Non è la card di Google**: Google disegna il suo pass; Apple il proprio. La nostra è una **card nello stile Stampy con il branding del locale**, «uguale o simile», **non provider-specifica**. Coerente con `AGENTS.md` (niente astrazione «wallet provider», niente Apple prima di Google): non nominare né imitare Apple. Le regole di Google sul **bottone** «Aggiungi a Google Wallet» non cambiano (asset ufficiale, già dentro la card nel modello).
4. **Confusione possibile [I]**: due card identiche (Wallet e web) possono far credere «l'ho già aggiunta». Mitigazione: la card web ha il bottone Wallet **solo** nella Visita (card appena creata) e **mai** in Richiesta; il testo `CONTEXT.md` §4.6 resta vietato («aggiunta»).
5. **Soglie alte**: il modello usa 5 colonne (fino a 20 timbri in 4 righe); oltre 20 il codice oggi **nasconde** i pallini: la card avrebbe solo numero + barra. [V]
6. **Riempire la card oltre `3/10`**: spunte bianche su cerchio pieno (modello) sono **statiche**; servono gli stati: vuoto, pieno, **nuovo**, **prossimo (in attesa)**, **premio**. Il «prossimo» che pulsa (R-1) sta bene dentro la card.

**Alternative**

| | Cosa | Pro | Contro |
|---|---|---|---|
| **A · Sostituzione completa** (proposta) | Card del locale in Visita e Richiesta; niente pallini arancioni | coerenza totale, risolve K-1/K-3/K-4/K-6 | serve il backend (D9+branding) e la regola di contrasto |
| **B · Card in Richiesta, Visita invariata** | Solo dove c'è già il conteggio | meno lavoro; Visita non ha timbri da mostrare | la Visita continua a non dire il locale (V-2) |
| **C · Card con ripiego Stampy subito, branding dopo** | Stessa struttura con colore di marca e iniziali; il locale arriva quando il backend lo darà | **solo UI**, subito; prepara la strada; ha già il premio da `reward` solo quando approvata | senza locale resta anonima (V-2 non risolto); da dichiarare nel design |
| **D · Lasciare i pallini** | — | nessun costo | tutti i problemi sopra restano |

**Consiglio**: **A come obiettivo, C come primo passo** (stessa struttura, ripiego Stampy, branding quando c'è il dato). Prototipare la card nel pilota Canva (D1/D6) con **3 colori di locale reali** (uno scuro, uno chiaro, uno saturo) per provare subito il contrasto.

**Effetto sulle voci della critica** (da ricontrollare se si approva): K-1, K-3, K-4, K-5, K-6, V-2, R-4, R-5, R-8, P-5 si risolvono in parte; D11 (accento premio) cambia natura (il premio si segna **sulla card**); il pattern «Timbro» (n. 8 dei pattern) diventa **«Card del locale»** (slot, stati, branding, premio).

---

## Capitoli trasversali

### Checklist applicata (passo 4)

| Voce | Esito parte A |
|---|---|
| **Gerarchia** | Debole: titoli h4/h5 peso 400–500 (N-2, R-3, R-7, S-2); il dato principale (n/m timbri) piccolo (R-4); in «approvata» l'esito è meno forte del resto (R-7). |
| **Contrasti calcolati** | Nuovi: tutto ✅ salvo dialog in scuro (1,08) e icona promo in chiaro (2,87, decorativa). Pallino vuoto in chiaro 3,19 (al limite). Il resto → D1. |
| **Target ≥44 px** | ✅ Bottoni 48, burger 44, voci menu ~44 [F]. Pallini non interattivi. |
| **Focus visibile** | Come L-6/L-7 (campo, bottoni); il dialog dà il focus a «Chiudi» (P-4). Non verificato il comportamento del focus al ritorno dalla nuova scheda Wallet (V-4) [V]. |
| **Errore / vuoto / caricamento** | Errore: due modelli (`/name` campo+alert, Visita/Richiesta alert in card). Vuoto: solo `/scan` (testo). Caricamento: testo grigio senza forma (V-1, R-1). |
| **Etichette e ruoli ARIA** | ✅ Buona base: `role=status`/`alert`/`note`, `aria-live` sulla sezione, `aria-invalid`+`describedby`, dialog etichettato. Da migliorare: «7 / 10 timbri» (R-4); pallini `aria-hidden` (corretto: il numero basta). |
| **Messaggi d'errore** | Specifici nel testo, ma «Errore interno» e «Non puoi vedere questa richiesta» sono troppo secchi (V-5, R-12). |
| **Coerenza con l'Accesso** | `/name` usa `is-invalid` (Accesso no): conviene **estendere quello** (N-3). Alert d'errore in card come in Accesso. Header con menu come nello Staff. |
| **Tema scuro** | Leggibile (testi 7–14:1); alert di successo e rosso ben contrastati; dialog debole (P-2). La palette chiara resta «fredda» rispetto alla scura (D6). |
| **Copy** | Italiano coerente; vedi tabella. |

### Stile e coerenza visiva
- **Gerarchia [F]**: tutti i titoli di stato della parte A sono `h4` peso 500 (24 px) o `h5` peso 400 dentro un alert. In una schermata dove il **titolo è l'esito** («Richiesta approvata!», «Premio sbloccato!»), il peso è quello più basso della pagina. Proposta: due livelli netti (titolo schermata 700/28 px; sezione 600/18 px) come token tipografici (vedi L-3).
- **Card dentro pagina, alert dentro card [F]**: errore = pagina (bianca) → card (bordo grigio 1,5:1) → alert rosa: **tre scatole annidate** per un messaggio da una riga. Il pattern d'errore si fissa nel design system dopo Staff (regola globale); per ora il difetto è **annotato**.
- **Un colore, quattro ruoli [F]**: l'arancione è marchio, azione primaria, link, **timbro** (pallini) e icona promozione. Il verde dice solo «successo» (anche per il premio disponibile). Mancano un accento «premio» e una distinzione tra «azione» e «dato» (pallini). D1 è aperta; qui l'argomento è un secondo accento.
- **Card [F]**: bordo 1,5:1, nessuna ombra: la card si distingue poco dal fondo. Vedi tabella dell'Accesso.

### UX
- **Flusso [F]**: tocco NFC → (login se serve) → `/name` (una tantum) → Visita → Richiesta → esito. È ben fatto per il caso che il cliente abbia già una card attiva: la **Visita crea subito la richiesta e va a `/r/:id`** (nessuna schermata intermedia).
- **Primo accesso [I]**: `/name` è obbligatorio e prima della prima richiesta di timbro: aggiunge un passo davanti al premio. **Domanda D13** (se è già deciso in `CONTEXT.md`, ignorala).
- **Contesto [F]**: in nessuna schermata A c'è il nome del **locale** (V-2, K-1): l'app non conferma al cliente dove si trova.
- **Feedback [F]**: tutto testo; nessuna animazione di stato; l'unico «movimento» è la transizione di 0,2 s del riempimento dei pallini (che **non si vede** quando la pagina cambia da stato «in attesa» ad «approvata»: la pagina rimonta il componente).
- **Hover**: non applicabile su telefono.

### Mobile / touch
- Target 44–48 ✅; il pulsante dell'azione è sempre a tutta larghezza ✅ (`d-grid` nella Visita).
- Raggiungibilità [F]: i bottoni stanno nella **metà superiore** (card in alto, il resto vuoto). Per «Richiedi di nuovo» e «Riprova» è accettabile.
- Layout shift [F]: alert d'errore che sposta il bottone (N-3), card che appare dopo «Un momento…» (V-1).
- Orientamento orizzontale e tastiera aperta in `/name`: **non verificato** [V].

### Accessibilità (solo nuovo rispetto all'Accesso)
- ✅ Struttura: un `h1` per stato, `role=status` sul caricamento, `aria-live=polite` sulle sezioni, dialog con `aria-labelledby`/`describedby`.
- ⚠ **Aggiornamento del contenuto**: al passaggio pending→approvata cambia l'intera sezione; l'annuncio dipende dallo screen reader [V]. Il dialog del premio si apre **senza che l'utente lo chieda** (aperto dal polling): è corretto per un modale che prende il focus, ma **non verificato** con VoiceOver/TalkBack.
- ⚠ **Titolo del documento** sempre «Stampy» (come Accesso): chi legge solo i titoli di scheda non distingue «Richiesta approvata» da «in attesa».
- ⚠ Il significato dei pallini è **solo visivo** ma il numero lo ripete: ok (R-4 propone solo la forma letta).
- **Movimento**: oggi quasi assente; ogni animazione proposta va con `prefers-reduced-motion`.

### Responsive (cosa ostacola tablet e desktop)
- Come in Accesso: `.narrow` 28 rem su ogni pagina. Per la parte A in più: i **pallini** hanno `max 3rem` e righe da 6 al massimo: su schermo largo restano piccoli nella striscia, **non sfruttano lo spazio**; il dialog `min(24rem, …)` va bene; il menu a tendina alla destra va bene. Le chat tablet/desktop decidono (D7).
- Il momento chiave (card piena, premio) è il candidato naturale a **riempire** lo spazio su schermo grande (celebrazione a tutta larghezza) — se si sceglie B/audace.

### Copy
Testi **letterali del codice** (AGENTS.md: restano come sono finché non decidi); le proposte sono **suggerimenti**.

| Oggi | Osservazione | Proposta |
|---|---|---|
| «Come ti chiami?» · «Ci serve per riconoscerti nei locali. Lo puoi cambiare quando vuoi dal tuo profilo.» | Buono. | Mantenere |
| «Scrivi almeno 3 caratteri» / «Al massimo 50 caratteri» | Ok | Mantenere (spostare nel suggerimento, N-3) |
| «Connessione non riuscita, riprova» sul campo del nome | Non riguarda il nome (N-4) | Solo messaggio generale, campo neutro |
| «Scansiona il tag di un locale per avere la tua card» | Lungo e a due righe | «Avvicina il telefono al tag» (+ «oppure inquadra il QR») |
| «La tua card è pronta» · «Salvala in Google Wallet: è qui che vedrai i tuoi timbri.» | Ok. Non dice **l'ordine** (V-3) | + «1» «2» o riga «Poi chiedi il timbro» |
| «Errore interno» | Non dice cosa fare | «Qualcosa non ha funzionato. Riprova tra un attimo.» |
| «Troppe richieste. Riprova tra 25 min.» | Ok; il tempo lungo con «Riprova» attivo è fuorviante | Mettere il tempo nel bottone, secondario |
| «Questo link non è valido.» | Secco, vicolo cieco | + «Avvicina di nuovo il telefono al tag del locale.» e bottone |
| «Questo locale non ha promozioni attive in questo momento.» | Tecnico | «Questo locale non ha un'offerta attiva al momento.» |
| «Richiesta inviata» / «Stiamo aspettando la conferma dello staff.» | Bene. Il titolo potrebbe dire il **soggetto**: chi sta aspettando e perché | «Aspettiamo la conferma dello staff» (titolo) + scadenza |
| «La richiesta resta valida solo per pochi minuti: se scade potrai rifarla.» | Vago | «Scade tra 4 minuti» (dato già presente) |
| «Richiesta approvata!» · «+2 timbri aggiunti» | Ok; in alert debole (R-7) | «+2 timbri» come dato principale |
| «Premio disponibile» · «Il prossimo prodotto è gratis: mostra questa schermata al personale.» | Ottimo; il premio non è nominato | + «Pizza margherita gratis» |
| «Premio sbloccato!» · «Hai ottenuto il premio:» | Buono. «Mostra questa schermata al personale» ambiguo (P-3) | **[V]** con lo staff |
| «Nessun nuovo timbro: questo prodotto era il premio.» | Freddo | «Premio ritirato: Pizza margherita gratis.» |
| «Richiesta non confermata» / «Richiesta scaduta» + «Nessun timbro aggiunto.» | Neutro, giusto | Mantenere |
| «Avvicina di nuovo il telefono al tag del locale per fare una nuova richiesta.» | Vale solo con il telefono (N-2 Accesso) | Dopo il bottone «Vai alla pagina iniziale» |
| «Non puoi vedere questa richiesta» (403) | Secco | Senza «Riprova»; con uscita |
| «Nuova promozione! La tua card riparte da zero.» | Può contraddire il numero (R-6); resta senza dire quanti si perdono (voluto) | **[V]** + «dopo la conferma» |
| «Un momento…» | Ok | Mantenere + scheletro (V-1) |

### Incoerenze rispetto ad altre sezioni (dal codice, nessuna cattura aperta oltre ai fogli)
- **`is-invalid`**: solo qui è fatto bene (N-3). Va portato a Login, Elimina account, quantità dello Staff.
- **Alert di successo**: usato per «approvata» **e** per «premio disponibile»; stesso pattern in Accesso (`?deleted=1`). Il design system deve distinguere «esito» da «stato disponibile».
- **Attesa 429**: `/name` («riprova tra 30 secondi»), Visita («Riprova tra 25 min») e Login/Elimina (alert giallo) usano **tre formati**. [F, codice] → un solo pattern.
- **Burger**: stato aperto = focus = pressed (S-3): idem in tutte le schermate con `AppLayout` (parte B e Staff).

---

## Pattern per il design system (da definire una volta)

1. **Titolo di schermata / titolo di sezione** (scala tipografica con peso 700/600; D5: il nome è una variabile).
2. **Card** (bordo ≥3:1 o ombra, raggio, padding) e **card-esito** (con icona e colore).
3. **Bottone primario / secondario / outline / link** (D1) con stati completi: default, hover, pressed, focus, **mai disabled** (regola), **in lavorazione** (spinner + testo).
4. **Campo** con stato invalido (bordo + icona + messaggio al posto del suggerimento, senza spostare il bottone) — modello: `/name`.
5. **Alert / avviso**: errore, avviso, successo, informativo (promozione) con icona; **distinzione tra «esito» e «stato»** (R-5, R-7).
6. **Pagina di errore / vuoto** (icona, titolo, testo, azione primaria, azione secondaria sempre presente): per `/scan`, 404, link non valido, errore generico, sessione (Accesso).
7. **Caricamento**: scheletro della card + indicatore; riga «connessione assente».
8. **Timbro / pallino** (vuoto, pieno, nuovo, prossimo, premio) e **StampProgress** (n/m grande + «ne mancano N»), con la forma propria del brand (D5). **Se D16 è approvata**: **Card del locale** (branding, slot, stati, premio, regola di contrasto del colore del locale).
9. **Dialog di premio** (e dialog generico per Elimina account in parte B): icona, titolo, corpo, azione, backdrop; separazione in scuro.
10. **Menu a tendina** (aperto distinto da focus/pressed, separatore per «Esci»).
11. **Timer/attesa 429** (formato unico, tempo nel bottone).
12. **Anello di focus** (regola globale) e **token di movimento** (durate, easing, `prefers-reduced-motion`).
13. **Banner promozione** (già un buon candidato di componente).
14. **Codice card** (blocco evidente, selezionabile, monospazio).

---

## Cosa MANTENERE (riassunto)
1. Pallini grandi in righe bilanciate; pieno/vuoto leggibile al volo in chiaro e scuro.
2. Stato invalido di `/name` (bordo + icona + `aria-invalid`): è il modello per tutta l'app.
3. L'esito in cima («Richiesta approvata!», «Premio disponibile»), il testo «Il prossimo prodotto è gratis».
4. Testi d'errore per causa, **senza Riprova dove inutile** (link non valido, nessuna promozione).
5. `<dialog>` nativo, non chiudibile per sbaglio, con focus trap.
6. «Richiedi di nuovo» per scaduta/non confermata.
7. Inversione primario/secondario dopo il tap su Wallet (con più spiegazione).
8. `PromotionNotice` sobria, senza dire quanti timbri si perdono.
9. Visita che crea la richiesta senza schermata intermedia per chi ha già la card.
10. Un'azione per riga, a tutta larghezza, 48 px.

## Top 10 della parte A (impatto / sforzo)

| # | Miglioramento | Impatto | Sforzo | Rif. |
|---|---|---|---|---|
| 1 | **Momento del premio**: dialog con icona e titolo forte, **riepilogo persistente** sulla card dopo la chiusura, premio **nominato** anche quando disponibile | alto | basso–medio (solo UI, dati già presenti) | P-1, P-5, R-5, K-4, K-5 |
| 2 | **Timbro «nuovo»**: segnalare i pallini appena aggiunti e il prossimo vuoto (sobria: anello; audace: riempimento in sequenza + vibrazione) | alto | basso | K-2, K-3, R-8 |
| 3 | **Pending vivo**: segnale di attesa (pallino che pulsa), scadenza «tra N min» dal dato esistente, connessione assente | alto | basso | R-1, polling |
| 4 | **Nome del locale e premio nel percorso** (Visita, Richiesta) | alto | medio (**backend**, D9) | V-2, K-1 |
| 5 | **Gerarchia**: titoli 700/28 px, esito più forte del resto, numero n/m grande («7 su 10») | medio | basso (token) | N-2, R-3, R-4, R-7 |
| 6 | **Errore unico e uscita sempre presente**: titolo + testo + azione, niente card nella card, **Riprova solo dove serve** (403, link non valido, 429 lungo) | medio | basso–medio | V-5, V-6, R-11, R-12, S-1 |
| 7 | `/name`: **bottone sempre attivo**, errore **al posto del suggerimento** (senza spostare il bottone), **errore di rete ≠ campo invalido** | alto | basso | N-1, N-3, N-4 |
| 8 | **Visita**: ordine dei passi (1·2), riga di ritorno dopo Wallet, scheletro di caricamento | medio | basso | V-1, V-3, V-4 |
| 9 | **Dialog**: separazione in scuro, anello unico, ambiguità del testo «mostra al personale» (da validare con lo staff) | medio | basso | P-2, P-3, P-4 |
| 10 | **Menu** (aperto ≠ focus ≠ pressed) e `/scan` (icona/stato vuoto, valutare lista card) | basso–medio | basso | S-1, S-3 |

Ordine consigliato: 1, 2, 3 e 7 sono **solo UI** e danno il maggior effetto; 4 richiede backend (backlog); 5, 6, 8, 9, 10 si fanno dopo il design system. Colore e focus restano nei token globali (D1, L-6).

## Domande aperte per me (da D9)

- **D9.** Mostrare il **nome del locale** (e il premio) nelle schermate Visita/Richiesta richiede di far restituire il locale da `GET /requests/:id` e dalla visita (oggi il frontend lo salva in `sessionStorage` come ripiego, B15): lo metti **nel backlog** (come D3), o resta fuori?
- **D10.** Momento del premio: **sobrio** (icona, titolo forte, riepilogo che resta) o **audace** (schermo intero, coriandoli, vibrazione)? Con `prefers-reduced-motion` attivo diventa comunque sobrio. Vibrazione/suono: sì/no?
- **D11.** Vuoi un **accento «premio»** distinto (es. oro) oltre ad arancione e verde, o l'arancione tiene da solo con più forma (icona regalo)? Dipende anche da D1.
- **D12.** Nel momento in cui si apre il dialog del premio, **il premio è già stato consegnato** (lo staff vede «Premio ritirato»)? Serve per decidere il testo «Mostra questa schermata al personale» (P-3).
- **D13.** `/name` resta **obbligatorio prima della prima richiesta**, o preferisci chiederlo dopo il primo timbro (meno attrito sul primo tocco)? (Se è già deciso in `CONTEXT.md`, vale quello.)
- **D14.** `/scan` come casa del cliente: resta una schermata di istruzioni, o vuoi valutare una **lista delle sue card** (richiede backend)?
- **D16.** **Card del locale al posto dei pallini** (sezione «Proposta del proprietario»): A (completa), C (subito con ripiego Stampy, branding dopo) o B? Richiede backend per nome/branding/premio, insieme a D9.
- **D15.** Visita: i due passi (Wallet, richiesta del timbro) restano **entrambi espliciti** (come oggi) o dopo il tap su Wallet si chiede in automatico il timbro? Tocca il flusso, non lo stile: lo segnalo come domanda, non lo propongo.

## Non verificato / dubbi
- Se il **dialog** annunci il titolo a VoiceOver/TalkBack quando si apre da solo (polling), e se il focus torni dove serve.
- Il **conteggio mostrato** con `promotionChanged` reale (R-6): il PNG è con flag forzato su dati reali.
- Font reale (DejaVu nelle catture), zoom 200%, orientamento orizzontale, tastiera aperta in `/name`.
- Se la vibrazione (`navigator.vibrate`) è utilizzabile su iOS (non lo è su Safari): su iPhone le proposte audaci perdono la parte tattile [I].
- Foglio non visti: 01, 07, 08, 15, 16; PNG originali non aperti (le varianti focus/pressed del bottone sono quelle già analizzate in L-6/L-7).
- Link Wallet vero e il suo ritorno (V-4): non catturabili.

---

## Addendum fogli focus/pressed (chat 7, 2026-11-25)

Visti i 5 fogli che la chat 6 non aveva guardato: `sheet-01`, `07`, `08`, `15`, `16` di `screens/_sheets/cliente-a/` (PNG originali non aperti). Conferme: **nessuna smentita** delle critiche precedenti. Differenze: **2 varianti peggiori, 1 dettaglio nuovo**.

| Foglio / file | Esito |
|---|---|
| `01` · `name__bottone-continua-focus` / `-pressed` / `name__compilato` | Conferma **L-6/L-7**: focus e pressed quasi identici (fondo scuro + alone pesca). `name__compilato`: in chiaro l'alone del campo è pesca su bianco, quasi invisibile; in scuro un anello arancione sottile (già in N, tabella «Focus campo»). Nessuna novità. |
| `07` · `richiesta__approvata-solo-premio-dialog-premio` / `-dialog-chiuso` / `-premio-gia-visto` | Conferma **P-1, P-2, P-4** (dialog in scuro separato solo dal bordo; «Chiudi» già scurito con alone per l'autofocus). **Variante peggiore di P-5/R-9 [F]**: chiuso il dialog, la pagina mostra l'alert «Richiesta approvata! Nessun nuovo timbro: questo prodotto era il premio.» sopra **0 / 8 pallini tutti vuoti**: il cliente che ha appena ricevuto il premio vede una card **azzerata**, senza traccia di ciò che ha avuto. Si legge come una perdita. Con **D12** (il premio è una celebrazione, già consegnato) il riepilogo persistente «Premio ritirato · <nome>» diventa ancora più necessario (vedi D12 e P-3 chiuso in `11-decisions.md`). |
| `08` · `richiesta__bottone-richiedi-di-nuovo-focus` / `-pressed`, `richiesta__bottone-riprova-focus` | Conferma **L-7**. Nulla di nuovo sull'alert 403 («Non puoi vedere questa richiesta» + «Riprova»: R-12). |
| `15` · `scan__menu-voce-focus` | Conferma **S-3**: la tendina copre il titolo («Scansiona il tag d… per avere la tua c…»), il burger resta pieno arancione, la voce «Profilo» con focus ha un fondo tinta con una **riga arancione tra le due voci** che sembra una sottolineatura, non un focus. In scuro la tendina si distingue dalla pagina solo per un bordo sottile. [F] |
| `15` · `visita__bottone-richiedi-focus` / `-pressed` | **Nuovo [F, [V] per la causa]**: il bottone **outline** «Richiedi il timbro», con focus o pressed, diventa **pieno arancione**, identico al primario «Aggiungi a Google Wallet». Con il focus sul secondario scompare la differenza primario/secondario (peggiora **V-3**) e il focus non si distingue da «bottone primario». [V] se è un residuo dell'hover del mouse nella cattura (vale anche per il pressed). |
| `16` · `visita__bottone-riprova-focus` / `-pressed`, `visita__bottone-wallet-focus` | Conferma V-5 («Errore interno» + «Riprova») e L-6/L-7. Wallet focus: fondo scuro `#cd5514` + alone pesca, come gli altri primari. |

Azione sulle voci: aggiungere a **V-3** «con il focus il secondario diventa pieno» e a **P-5** «dopo `solo-premio` la card è 0/8». Nessuna altra modifica alla critica.
