# 10 · Critica sezione Staff (elenco locali, coda, esiti, errori, menu ☰, storico del locale, profilo)

Chat 8, 2026-11-25. Fonte: `screens/staff/staff/` (81 stati × chiaro/scuro: `locali` 13, `coda` 53, `storico` 11, `profilo` 4), telefono 390×844 @2x; codice di `StaffQueueView`, `StaffVenuesView`, `AppLayout`/`AppHeader`, `PromotionNotice`, `usePolling`, righe `stampy.scss`; per l'ordine e i limiti della coda, `requests.service.ts` (`getPendingQueue`, solo lettura).
Nessun codice dell'app modificato. Proposte = **da decidere da te**, con alternative. Rispetto `11-decisions.md` (inclusi i conflitti aperti) e **non ripeto** ciò che è già in `10-critique-accesso.md` (`L-x`, `C-x`), `10-critique-cliente-a.md` (`N-x`, `S-x`, `V-x`, `R-x`, `P-x`, `K-x`) e `10-critique-cliente-b.md` (`PR-x`, `ME-x`, `ST-x`, `EL-x`, **[CONDIVISO]**): rimando e segnalo solo varianti peggiori o nuove.
Etichette: **[F]** fatto osservato (PNG o codice) · **[I]** ipotesi · **[V]** da validare. Sigle nuove: `LC-` elenco locali · `CQ-` coda · `ES-` esiti · `ER-` errori · `MN-` menu · `SH-` storico del locale · `PF-` profilo visto da uno staff.
**Utente di riferimento**: staff esperto, in piedi, telefono in mano, sotto pressione, luce scarsa o troppa. Il criterio è: *velocità senza errori*.

## Come ho lavorato e cosa è affidabile

- **Fogli di contatto**: `screens/_sheets/staff/sheet-01…27.png` (3 stati × chiaro/scuro, ordine alfabetico), da `scripts/make-sheets-parte.mjs staff/staff 3 locali,coda,storico,profilo staff`. **Visti tutti i 27 fogli**, **inclusi focus/pressed**. **PNG originali aperti: nessuno.**
- **Contrasti nuovi**: `scripts/contrasts-staff.mjs` (stessa formula WCAG 2.x; non misurati sui pixel, ±0,05). Il colore di `text-success` in scuro lo prendo da Bootstrap **[V]**: nel PNG sembra più chiaro di `#198754`, da verificare sui pixel.
- **Limiti**: widget Vue DevTools ignorato; font DejaVu; nessun hover (telefono); «scade tra N s» mai fotografato (la card sparisce alla scadenza); le catture usano richieste tutte con scadenza +4 min e codici di test; la geometria dei **salti di layout** è **stimata dai fogli** (altezza di una card ≈ 270 px CSS, esito ≈ 230, ma da misurare su un telefono vero **[V]**); nessuna prova con screen reader, né con un dito vero.
- **Fatti letti nel codice** (non nei PNG): la coda è **in ordine di arrivo** (la più vecchia in alto) e limitata a **50** (`getPendingQueue`, `asc(createdAt)`, `limit 50`); la scadenza è **lazy**: la richiesta scompare dalla coda al primo giro di polling dopo la scadenza; il polling è ogni **3 s** e **non** si ferma a tab nascosta; l'unico avviso di una richiesta nuova è il **titolo della scheda** «(N) Stampy»; la coda **non porta il nome del premio** (arriva solo nell'esito); «Rifiuta» e «Conferma» agiscono **subito**, senza conferma né annulla.
- Skill `design-critique` / `accessibility-review` / `ux-copy` non disponibili: criteri applicati a mano.

## Contrasti nuovi (solo coppie nuove)

Già calcolati e **non ripetuti**: bianco su arancione 3,19 (anche «Conferma»), link arancione 3,19, bordi campo 1,30 / 2,26, focus, alert (7–10), testo secondario 6,73 / 8,31, `btn-danger` / `text-danger` 4,53 / 4,08, pillola promozione 13,84 / 12,63 (icona 2,87), disabilitato del primario 2,16 / 2,63.

| Coppia (Staff) | Chiaro | Scuro | Esito |
|---|---|---|---|
| **«Premio disponibile»** (`text-success`, 16 px 600) su card | 4,53 | **4,08** | ⚠ scuro sotto 4,5 (**[V]** il colore reale) |
| **«Ok» dell'esito** (`btn-outline-secondary`, testo e bordo) su card | 4,69 | **3,94** | ⚠ testo scuro < 4,5; bordo ≥ 3 ✅ |
| «Ok» premuto: bianco su `#6c757d` | 4,69 | 4,69 | ✅ |
| **Stepper − / + disabilitato** (arancione, opacity .65) su card | **2,16** | 3,11 | ⚠ è lo stato **iniziale di ogni card** (quantità 1 → «−» spento) |
| **«Rifiuta» disabilitato** durante un invio (rosso, opacity .65) | **2,74** | **2,36** | ⚠ (esente, ma scatta su **tutte** le card per tutta la durata della richiesta) |
| **«Conferma» disabilitato** (quantità non valida): bianco su arancione sbiadito | **2,16** | 2,63 | ⚠ (L-1 sul bottone più importante dell'app) |
| «Rifiuta» (testo + bordo `#dc3545`) su card | 4,53 | **4,08** | ⚠ scuro: il rosso più debole è quello che serve per l'azione negativa |
| «Rifiuta» premuto/focus: bianco su `#dc3545` | 4,53 | 4,53 | ✅ |
| Stepper (bordo e simbolo `−` `+`, 24 px) su card | 3,19 | 5,78 | ✅ UI ≥ 3, al limite in chiaro |
| Campo quantità: bordo su card | **1,30** | **2,26** | ⚠ UI < 3: il campo che si digita non si vede come campo |
| Nomi dei locali (`btn-outline-primary`, 16 px 600) su card | **3,19** | 5,78 | ⚠ in chiaro **il contenuto principale** dell'elenco locali è a 3,19 |
| Link «I tuoi locali» (non autorizzato) | 3,19 | 7,09 | ⚠ chiaro (già L-2) |

Lettura: il rosso e il verde dello Staff sono **al limite in scuro** (4,08), e in chiaro **tutto il testo d'azione di una card** è 3,19–4,5. Per chi lavora con luce forte (bancone, vetrina) il collo di bottiglia è «Conferma» bianco su arancione (3,19): D1 pesa più qui che altrove. Disabilitato **come stato di default** («−» a 1) è un difetto di default, non di stato.

---

## Per schermata e stato

Priorità: **A** alta · **M** media · **B** bassa.

### 1. I tuoi locali — `/staff` (account con più locali)

**Da mantenere** [F]
- Elenco **minimo**: un bottone per locale, a tutta larghezza, 48 px, nome a capo senza rompere (`locali__nome-locale-lungo`) e con 3 locali (`locali__tre-locali`).
- Un solo tocco porta alla coda; il **menu non offre «Cambia locale»** qui (corretto: punterebbe alla stessa pagina).
- Stato premuto **pieno** (`locali__bottone-locale-pressed`): il feedback tattile si vede bene.

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| **Default** (`locali__default`) | **LC-1** L'elenco **non dice dove c'è lavoro**: nessun conteggio di richieste in attesa per locale, nessun indicatore di «cosa è cambiato». Con 2-3 locali (stesso staff che gira) bisogna entrare in ognuno per scoprirlo. [F] [I] | **A)** contatore per locale (`3 in attesa`): **richiede backend** (oggi la coda si legge locale per locale; etichetta «richiede backend»). **B)** nulla. Consiglio A come obiettivo; senza backend non si inventa. | M |
| | **LC-2** **Nessuna memoria**: a ogni login con più locali si passa dall'elenco, anche se si lavora sempre nello stesso (il redirect automatico vale solo con **1** locale: `StaffVenuesView`). [F codice] | Ricordare l'ultimo locale (storage del browser) e offrire «Continua da Bar Rossi» in cima. Solo UI. **[V]** se è voluto (rischio di operare nel locale sbagliato). | M |
| | **LC-3** **Card dentro la pagina, bottoni dentro la card**: titolo `h4` peso 500 + bottoni outline con **testo arancione 3,19:1** (chiaro). I nomi dei locali sono il contenuto, non un'etichetta. [F] | Righe/card piene con nome in colore testo (non arancione), chevron; l'arancione solo per l'azione. Gerarchia: L-3. | M |
| **Caricamento** (`locali__caricamento`) | **LC-4** «Caricamento…» grigio, in alto a sinistra, fuori da ogni card (come V-1). [F] | Scheletro dell'elenco. | B |
| **Errore** (`locali__errore`, `-bottone-riprova-*`) | **LC-5** Pattern buono (alert + «Riprova» a tutta larghezza), ma «Connessione non riuscita, riprova» + «Riprova» dicono la stessa cosa (S-1). Riprova focus/pressed: fondo scuro `#cd5514` + alone, identici (L-7). [F] | Come S-1/L-7. | B |
| **Menu** (`locali__menu-aperto`, `-voce-focus`) | La tendina **copre il titolo** e il primo bottone (`locali__menu-aperto`); la voce in focus ha una **riga arancione tra le due voci** (S-3). | Come S-3, vedi MN-1. | (via S-3) |
| **Focus** | Bottone-locale in focus = pieno arancione + alone (`locali__bottone-locale-focus`), identico al pressed (L-7). | Anello unico. | (via L-6/L-7) |

### 2. Coda richieste — `/staff/:venueId` (schermata principale)

**Da mantenere** [F]
- **Un tocco per il caso normale**: quantità 1 già impostata, «Conferma» a un tap, 48 px, sempre nello stesso punto della card (`coda__default-3-richieste`). È la scelta giusta per l'utente sotto pressione.
- **Peso giusto tra le due azioni**: «Rifiuta» outline sottile a sinistra, «Conferma» pieno a destra, entrambe 48 px, 16 px di distanza, 50/50. L'azione frequente è la più forte; quella rara è presente ma sobria. Il feedback premuto di «Rifiuta» diventa rosso pieno (`coda__bottone-rifiuta-pressed`).
- **Ordine di arrivo** (FIFO, la più vecchia in alto): è l'ordine giusto per essere equi; il backend lo garantisce.
- **Stepper chiaro**: `−`/`+` da 56 px, valore a 24 px grassetto, etichetta «prodotto/prodotti» con singolare e plurale corretti (`coda__default-3-richieste`, `coda__quantita-50-piu-disabled`); ai limiti si spegne (`−` a 1, `+` a 50).
- **Quantità**: il testo digitato non viene mai sovrascritto dal polling (`drafts`), «07» si normalizza a 7 (`coda__quantita-normalizzata-07`), e una quantità non valida **non si invia mai** (messaggio, `aria-invalid`).
- **Titolo scheda «(3) Stampy»**: l'unico segnale di richieste nuove a scheda in background: va tenuto.
- **Messaggio d'errore onesto sull'esito incerto**: «Esito non confermato: controlla la coda prima di riprovare» (`coda__errore-esito-non-confermato`) non dice né sì né no quando non lo sa.
- **`PromotionNotice staff`**: pillola piccola, una riga, non allarmante, dice cosa dire a voce (`coda__richiesta-promozione-cambiata`).
- **Nessun dato personale**: solo il codice card; l'«identico tra locali» del 404 vale anche qui.

| Stato (file) | Difetti osservati | Proposte | Pri |
|---|---|---|---|
| **Default 3 richieste** (`coda__default-3-richieste`) | **CQ-1** **Il codice** (8 caratteri, es. `44EE7A5B`, `9Q23TSZG`) è **l'unico identificativo** del cliente e sta in un `h5` peso 500, in colore testo, stesso peso del resto. Lo staff deve confrontarlo con quello che dice o mostra il cliente (che sul telefono del cliente è **piccolo, grigio, in fondo**: R-2). [F] Caratteri ambigui (`0/O`, `1/I`, `2/Z`) **[V]**: non so con quale alfabeto sono generati. | Codice in evidenza: 20-22 px 700, **monospazio/cifre tabulari**, a gruppi (`44EE 7A5B`); stessa resa sul telefono del cliente (alza **R-2** da M ad **A**). **[V]** con lo staff se confrontano a occhio o a voce. | A |
| | **CQ-2** **Nessun nome**: `/name` dice al cliente «Ci serve per riconoscerti nei locali» (testo letterale), ma lo staff **non vede il nome**: la promessa fatta al cliente non ha effetto in coda. [F] La decisione sulla minimizzazione (04-capture) è un dato di prodotto: **non l'ho trovata in `CONTEXT.md`** **[V]**. | **Domanda D30** (nome del cliente in coda: sì/no; richiede backend e valutazione privacy). Senza nome, il codice grande (CQ-1) è l'unica strada. | M |
| | **CQ-3** **Orario di creazione vs scadenza**: a destra «14:14» (ora di creazione) e sotto «scade tra 4 min» in 14 px grigio. Allo staff serve **da quanto aspetta** («da 2 min») e **quanto manca**; l'ora assoluta serve poco. L'orologio visibile si aggiorna ogni **10 s** (non ogni secondo) e **non c'è nessun segnale di urgenza** (nessun colore sotto 1 min). [F codice] | «da 2 min» in evidenza; l'ultimo minuto in tono avviso (colore + testo, non solo colore); «scade tra N min» come dato secondario. Solo UI. | M |
| | **CQ-4** **Densità: 1 card = ~270 px**. In 844 px ne stanno 2,5 (con header). Con 12 richieste (`coda__lista-lunga`) sono ~3.200 px: **non si vede mai quante sono in coda**, e **nessun contatore sta nella pagina** (solo nel titolo della scheda). [F] | Contatore fisso in testa («3 in coda · la più vecchia da 2 min»); riga compatta per liste lunghe (codice · da N min · «Conferma ×1»). Tablet/desktop → vedi Opportunità. | A |
| | **CQ-5** **Nessuna priorità visiva**: la prima card (la più vecchia, la prima da servire) è identica alle altre; nessun numero d'ordine. [F] | Prima card con bordo/fondo distinto o «1°». **[V]** se l'ordine di servizio è davvero FIFO. | M |
| | **CQ-6** **Titolo `h4` peso 500** («Bar Pasticceria Rossi»): è l'unica indicazione di **in quale locale sei**; con nome lungo arriva a 3 righe (`coda__nome-locale-lungo`) e spinge tutto di ~40 px. [F] Gerarchia: L-3. | Nome più forte; nome lungo troncato con tooltip/2 righe max; locale e contatore sulla stessa riga. | M |
| **Stepper** (`coda__default-3-richieste`, `coda__bottone-meno-*`) | **CQ-7** **«−» sempre spento al primo sguardo** (quantità 1): ogni card nasce con un bottone sbiadito a 2,16:1 (chiaro). Sembra rotto. [F] | Stato «minimo» neutro (non arancione), o nascondere «−» a 1; o tenerlo attivo senza effetto. Regola globale sul disabilitato (D26). | M |
| | **CQ-8** **Cosa significa il numero**: «prodotti consumati, premio compreso» sta solo nell'`aria-label`; a vista c'è «1 prodotto». Lo staff non vede **cosa farà la conferma** (quanti timbri, quanti premi): lo scopre **dopo** (`coda__esito-premi-multipli`: «+22 timbri · 3 premi ritirati»). La regola vive solo nel backend (AGENTS.md): la UI **non può** calcolarla. [F] | Etichetta visibile («prodotti consumati»). **Anteprima dell'esito prima di confermare: richiede backend** (`splitStamps` non si ricalcola nel frontend). Senza backend: avviso sobrio per quantità alte (es. > 5: «Stai confermando 25 prodotti») — è un controllo sul numero digitato, non la regola. **[V]** con lo staff. | A |
| | **CQ-9** **Quanti tocchi per quantità N**: N tocchi su «+», oppure tocco sul campo → tastiera numerica → digito → chiudo → «Conferma»: ≥ 4 azioni, e la tastiera **copre i bottoni** [I]. Nessuna pressione prolungata (01b §11), nessun preset. Digitare «25» invece di «2» dà **«+22 timbri · 3 premi»** (`coda__esito-premi-multipli`) senza conferma né annulla. [F] | Preset rapidi (1 · 2 · 3 · 5), `+`/`−` con pressione prolungata; **soglia di avviso** per quantità alte (CQ-8); annulla (ES-1). | A |
| **Quantità non valida** (`coda__quantita-vuota-invalida`, `-0-`, `-51-`, `-decimale-`) | **CQ-10** Il messaggio rosso «⚠ Quantità non valida: inserisci un numero intero da 1 a 50.» **compare sotto lo stepper e spinge i bottoni di ~48 px** mentre si digita (cancellare il «1» per scrivere «5» fa sparire e riapparire il messaggio): **«Rifiuta»/«Conferma» si spostano sotto il dito**. Il campo **non diventa invalido** (nessun bordo/icona rossa: il pattern di `/name` manca; si vede solo l'alone di focus). Bordo del campo 1,30:1. [F] | Messaggio **al posto** dell'etichetta «prodotto» (stessa riga, nessuno spostamento), campo invalido col pattern di `/name` (bordo+icona). | A |
| | **CQ-11** **«Conferma» disabilitato e sbiadito** (2,16 / 2,63): viola la regola globale (primari mai disabilitati) sul bottone più importante dell'app. Il gate è già la quantità: se si tocca con valore non valido basta portare il focus sul campo. [F] | **Domanda D26** (consiglio: sempre attivo; al tocco, focus sul campo e messaggio). | A |
| | **CQ-12** Le frecce native del `type=number` compaiono nel campo in alcuni PNG (`coda__errore-generico-500`, `coda__quantita-*`): su schermo largo diventano un secondo controllo sopra il nostro stepper. [F] [V] se solo hover | `-moz-appearance`/`appearance` da nascondere; tema desktop. | B |
| **Premio disponibile** (`coda__richiesta-premio-disponibile`) | **CQ-13** **«· Premio disponibile» è il dato più importante per lo staff** (questa conferma consegna un prodotto gratis) ma sta **sulla stessa riga** di «10 / 10 timbri», stesso corpo, in verde 4,53 / **4,08**: si perde se lo si cerca di fretta. Nell'esito di quel caso comparirà «Premio ritirato: Caffè gratis» (`coda__esito-premio-ritirato-senza-timbri`), ma **prima di confermare il nome del premio non c'è**: `QueueItem` non lo porta (`requestId`, `publicCode`, `stampsCount`, `stampsRequired`, `promotionChanged`, `createdAt`, `expiresAt`). [F] | Chip **«Premio»** con icona + testo + accento D11 (mai solo colore), sopra la riga dei timbri. Nome del premio nella card: **richiede backend** (aggiungere `reward` alla coda; etichetta «richiede backend», voce di backlog da proporre, **domanda D29**). | A |
| **Promozione cambiata** (`coda__richiesta-promozione-cambiata`) | **CQ-14** Pillola «Nuova promozione» (icona, 14 px 600) **ok**; ma non dice cosa dire a voce (il commento del codice lo dichiara: «so the staff can say it aloud») e la card diventa più alta (~28 px): **rompe il passo uniforme** delle card (rilevante per CQ-15). Mostra «0 / 10» perché la card riparte da zero (calcolo vero del backend). [F] | Testo suggerito «Nuova promozione: la card riparte da zero» (da approvare); mantenere la pillola. | B |
| **Nuova richiesta** (nessun file: non esiste) | **CQ-16** **Quando arriva una richiesta nuova non succede niente di visibile**: nessun suono, vibrazione, badge, evidenziazione, scorrimento; la card si **aggiunge in fondo** (FIFO) e con ≥ 3 card sta **fuori schermo**. L'unico segnale è il numero nel titolo della scheda, che a telefono in mano non si vede. [F codice] Il polling continua anche a tab nascosta ✅ (resta il conteggio nel titolo). | Vedi «Il momento chiave» e Opportunità: **sobria** = contatore sticky + «Nuova» sulla card per 3 s (CSS); **audace** = suono + vibrazione + schermo sempre acceso **[V]** (iOS, permessi, autoplay). | A |
| **Coda vuota** (`coda__vuota`) | **CQ-17** «Nessuna richiesta in attesa.» in una card piccola grigia, 80% della pagina vuota. È lo stato in cui lo staff passa **più tempo** e **non dice che sta ascoltando** (nessun «aggiornato ora», nessun segnale di connessione): una coda vuota per rete caduta e una vuota per davvero **si leggono uguali** (a meno del banner giallo). [F] | Stato vuoto vivo: «In ascolto · aggiornato alle 14:32» (o puntino che pulsa, `prefers-reduced-motion`), grande e sobrio. | M |
| **Caricamento** (`coda__caricamento`, `coda__titolo-segnaposto-richieste`) | **CQ-18** «Caricamento…» (V-1) e il titolo parte come **«Richieste»** e cambia in nome del locale a metà caricamento: per un attimo **non si sa in quale locale si opera** (rilevante con più locali). [F] | Titolo noto subito (dal passaggio dall'elenco) o segnaposto con scheletro; non mostrare le card prima di conoscere il locale. **[V]**. | B |
| **Invio in corso** (`coda__invio-in-corso`) | **CQ-19** Mentre **una** richiesta si invia, **tutti** i bottoni di **tutte** le card si spengono (`busyId !== ''`) e «Conferma» diventa «Invio…» a 2,16:1: con rete lenta lo staff è **bloccato su tutta la coda**. Nessun indicatore di avanzamento (L-8). [F codice + PNG] | Bloccare solo la card in corso; spinner nel bottone; timeout visibile. **[V]** perché è stato scelto così (anti doppio invio?). | M |
| **Salti di layout** (nessun file unico; si vede in `coda__esiti-multipli`, `coda__esiti-spariti-dopo-8s`, `coda__errore-gia-gestita`) | **CQ-15** ⚠ **Rischio di tap sul pulsante sbagliato.** Le card hanno **la stessa altezza** (≈ 270 px) e si spostano di colpo in **tre** casi: (a) la **prima card scade** o la gestisce un altro telefono → sparisce al giro di polling (la più vecchia, quindi quella in cima: **proprio quella che lo staff sta per servire**); (b) l'**esito sparisce dopo 8 s** (`coda__esiti-spariti-dopo-8s`); (c) una card diventa esito (−40 px) e un messaggio d'errore compare/sparisce sopra. Se la card N+1 sale di **un passo esatto**, il punto in cui stava «Conferma» della card N+1 **cade su «Conferma» della card N+2**: una conferma **sul cliente sbagliato**, senza annulla. [F] geometria dai fogli; [I] probabilità (serve un tocco entro 3 s dal polling). | **A)** **non rimuovere mai una card sotto il dito**: una richiesta scaduta o già gestita resta come «**Scaduta**» / «**Già gestita**» (stato in loco, disabilitato) finché lo staff non la chiude con «Ok»; **B)** ancora lo scorrimento (`overflow-anchor`) e **riservare lo spazio** per il messaggio d'errore; **C)** (audace) ignorare i tocchi nei 300 ms dopo un salto di layout. **Domanda D25.** | **A** |

### 3. Esiti in loco (conferma/rifiuto)

**Da mantenere** [F]
- **L'esito sostituisce la card nello stesso posto** (`coda__esito-approvata-1-timbro`): lo staff vede subito cosa ha fatto *a quel cliente* (codice + esito), senza cercarlo.
- **Verde per approvata, giallo per rifiutata**, con icona e testo («✔ Richiesta approvata», «⚠ Richiesta rifiutata»): due toni distinti anche con luce forte; contrasti alert 7-10:1.
- **Contenuto fedele al backend**: «+N timbri» (singolare/plurale), «Premio ritirato: <nome>», «3 premi ritirati», «Premio disponibile»; il testo massimo regge (`coda__esito-premi-multipli`). Nessun calcolo nel frontend ✅.
- **Esiti multipli in colonna** (`coda__esiti-multipli`) senza mescolarsi con le card ancora da gestire.
- **Annuncio per lo screen reader** (`role=status`, fuori vista).

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| **Esito approvata** (`coda__esito-approvata-1-timbro`, `-3-timbri`) | **ES-1** **Nessun annulla.** «Conferma» e «Rifiuta» agiscono subito (04-capture: «l'esito in loco è l'unico segnale»); l'esito resta **8 s** con un solo bottone «Ok» (che chiude, non annulla). Un tocco sbagliato (CQ-9, CQ-15, «Rifiuta» a 16 px da «Conferma») non si ripara. Non so se esista un'operazione di annullamento lato backend: **[V]**, non la assumo. [F] | **A)** (solo UI) **invio ritardato di 3-5 s con «Annulla»** per «Rifiuta» (e per «Conferma» con quantità alta): la richiesta parte dopo il ritardo; **B)** annullamento vero nel backend: **richiede backend** e una decisione di prodotto; **C)** nulla, più distanza/conferma a due passi su «Rifiuta». Consiglio A per «Rifiuta», B come domanda di prodotto. **Domanda D27.** | **A** |
| | **ES-2** **Il premio è il momento in cui lo staff deve fare qualcosa** (consegnare il prodotto gratis): «Premio ritirato: Caffè gratis» è una riga di testo normale con «Premio ritirato:» in grassetto, 16 px, nell'alert verde (`coda__esito-premio-ritirato-senza-timbri`), identico a «+1 timbro». [F] | Riga premio a sé, con **icona + testo + accento D11**: «Consegna: Caffè gratis». Verbo (D23 decisa): stato «riscattato», istruzione «Consegna». **Il proprietario ha chiarito che la consegna è un'azione dello staff** (il backend segna il riscatto alla conferma, lo staff poi consegna): per questo ES-2 e CQ-13 salgono ad **A**. | **A** |
| | **ES-3** **«Premio disponibile»** nell'esito (`coda__esito-approvata-card-piena`: «+1 timbro · Premio disponibile») dice che la card del cliente è piena, ma non cosa fare (è per il **prossimo** prodotto). Si confonde con «Premio ritirato». [F] | «Card completa: il prossimo prodotto è gratis» (stessa idea del testo cliente). | M |
| **Esito rifiutata** (`coda__esito-rifiutata`) | **ES-4** Giallo + «⚠»: per un'azione **voluta** e normale il tono è «avviso»; va bene come distinzione dal verde, ma «Nessun timbro aggiunto» ripete l'ovvio. Non dice **perché**/chi (lo staff lo sa). [F] | Mantenere il giallo; testo breve («Rifiutata · nessun timbro»). | B |
| **«Ok»** (`coda__esito-bottone-ok-*`) | **ES-5** «Ok» è un bottone **grigio outline 3,94:1 in scuro**: poco visibile, e **non dice cosa chiude** («Chiudi esito» solo nell'`aria-label`). Con focus = pressed (grigio pieno, L-7). Con più esiti ognuno ha il suo «Ok», senza «Chiudi tutti». [F] | «Ok» più chiaro (testo ≥ 4,5); «Chiudi tutti» se ≥ 2 esiti. | M |
| **Scomparsa** (`coda__esiti-spariti-dopo-8s`) | **ES-6** **L'esito sparisce da solo dopo 8 s senza che se ne veda il conto alla rovescia**, e tutto scorre in su (CQ-15). Chi non ha guardato in quegli 8 s **non ha più conferma**: resta solo lo Storico (2 tocchi: ☰ → Storico). [F] | Barra sottile di scadenza sull'esito (CSS, ≤ 8 s, ridotta con `prefers-reduced-motion`) **e** non spostare il resto: l'esito si **comprime** invece di sparire all'istante (con D25 anche una riga «Gestita 14:32» che resta). | M |
| **Layout** | **ES-7** L'esito è **più basso** della card (−40 px circa): le card sotto salgono (CQ-15 (c)). | D25. | (via CQ-15) |

### 4. Errori

**Da mantenere** [F]
- **Cause distinte nel testo** (già gestita / esito non confermato / 429 / 500) e **«connessione» a parte**, in giallo, come stato della coda e non dell'ultima azione (`coda__errore-connessione-poll`).
- **Alert sticky in cima** (`coda__errore-sticky-dopo-scroll`): con 12 card l'errore resta visibile mentre si scorre.
- **«Locale altrui» = «locale inesistente»**: stessa schermata (`coda__non-autorizzato-altro-locale` / `-id-malformato`): invariante di sicurezza, mantenere.
- «Esito non confermato: controlla la coda prima di riprovare»: testo onesto (UX-03).

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| **Richiesta non più valida** (`coda__errore-gia-gestita`, `coda__errore-sticky-dopo-scroll`) | **ER-1** Il messaggio (testo del server, letterale) **non dice quale richiesta** (nessun codice), né **perché** (scaduta? già gestita da un collega?), né **cosa è successo al cliente**: lo staff ha premuto «Conferma» sul 9Q23TSZG e la card è sparita: il cliente ha il timbro o no? In più **non si chiude** (resta fino all'azione successiva) e, sticky, **copre la parte alta delle card** (`coda__errore-sticky-dopo-scroll`: i bottoni della prima card spuntano sotto l'alert). [F] | Mettere il codice **davanti** al messaggio (solo UI: «9Q23TSZG · Richiesta non più valida»), bottone ✕, e comprimere l'alert (una riga). Testo aggiuntivo («già gestita o scaduta: nessun timbro aggiunto da te») **da approvare** e **[V]** con il backend: non so se distingue i casi. | A |
| **Esito non confermato** (`coda__errore-esito-non-confermato`, `-rifiuto-non-confermato`) | **ER-2** Il testo è giusto ma lo staff **non ha il mezzo di controllare** («controlla la coda»): la card è ancora lì? se non c'è più, vale come gestita? Nessun aiuto. [F] | Una riga: «Se la richiesta non è più in coda, è già stata gestita.» (da approvare **[V]**). | M |
| **500 / 429** (`coda__errore-generico-500`, `coda__errore-429-troppe-richieste`) | **ER-3** «Errore interno» (V-5): non dice cosa fare. «Troppe richieste. Riprova tra 30 s.»: per uno staff **in coda piena** è un blocco: **[V]** i limiti del backend a ritmo di servizio (non è design: lo segnalo). Il testo non dice che **il timbro non è stato dato**. [F] | «Qualcosa non ha funzionato: la richiesta è ancora in coda. Riprova.» solo se il backend lo garantisce **[V]**; tempo nel pulsante (L-9). | M |
| **Connessione** (`coda__errore-connessione-poll`) | **ER-4** Banner giallo «Connessione non riuscita, riprova» **non sticky**: sparisce scorrendo, mentre **la coda sotto è vecchia ma resta azionabile**. «riprova» è fuorviante (il polling riprova da solo ogni 3 s) e non c'è l'**ora dell'ultimo aggiornamento**: lo staff può confermare una richiesta **già scaduta**. [F] | Banner sticky «Connessione assente: la coda potrebbe non essere aggiornata (ultimo aggiornamento 14:32). Riprovo…»; bottoni delle card **ancora attivi** (il server decide) ma segnati. | A |
| **Non autorizzato** (`coda__non-autorizzato-*`, `-link-focus`) | **ER-5** Struttura **a tre scatole** (pagina → card → alert) per due righe; il link «I tuoi locali» è arancione 3,19:1 e il **riquadro di focus è alto ~33 px** (< 44) (`coda__non-autorizzato-altro-locale-link-focus`). Se lo staff è stato **rimosso** da quel locale mentre lavora, il messaggio vale; altrimenti (id sbagliato) è un vicolo con una sola uscita. [F] | Bottone «Vai ai tuoi locali» a tutta larghezza (N-1, V-6). | M |
| **Pressed/focus** | Alert e link: L-6. | — | — |

### 5. Menu ☰ e navigazione

**Da mantenere** [F]: voci a 44 px; chiusura con Esc/clic fuori; `aria-expanded`; il contenuto si adatta al contesto (nessun «Cambia locale» dove non serve); «Storico richieste» **attiva** in arancione quando ci si è (`storico__menu-aperto`); «Indietro» sempre nello stesso punto, **riporta alla coda** e non allo storico (`profilo__ritorno-alla-coda`).

| Stato (file) | Difetti | Proposte | Pri |
|---|---|---|---|
| **Menu aperto** (`coda__menu-aperto`, `-multi-locale`) | **MN-1** Come S-3: tendina **sopra il titolo** (nome del locale troncato «Bar Pasticceria Ros…») e **sopra le card**, senza ombra marcata; con 4 voci copre fino alla riga dello stepper della prima card. Burger aperto = focus = pressed (pieno arancione). [F] | Come S-3; per lo Staff: **titolo del menu con il nome del locale attivo**. | M |
| | **MN-2** **«Esci» è l'ultima voce, identica alle altre, a 44 px da «Storico richieste»**. Per uno staff il costo di un'uscita per sbaglio è **alto**: rientrare significa **email + codice a 6 cifre** (Accesso) in pieno servizio. [F] [I] | Separatore e stile «uscita» sopra «Esci» (testo neutro, non rosso); eventualmente conferma. **[V]** quanto spesso capita. | M |
| **Ruoli non ancora caricati** (`coda__menu-aperto-ruoli-non-ancora-caricati`) | **MN-3** Per qualche secondo il menu ha **solo Profilo + Esci**: poi compaiono «Storico richieste» e «Cambia locale» e **«Esci» scende di 1-2 posti**. [F] | Segnaposto delle voci finché non sono note; non spostare «Esci». | B |
| **Navigazione** | **MN-4** **«Storico» e «Cambia locale» sono a 2 tocchi (☰ → voce)**; per **cambiare locale** servono 3 azioni (☰ → Cambia locale → locale), e non c'è un modo rapido per vedere l'altro locale. [F] | Nome del locale **tappabile** nell'header (chip con il nome) che apre il cambio; su tablet barra laterale. | M |
| **Locale attivo** | **MN-5** **Quale locale è attivo lo dice solo il titolo `h4` della coda.** Nello **Storico** il titolo è «Storico richieste» **senza il nome del locale** (`storico__default`): con più locali non si sa di quale. Nel **Profilo** il locale non c'entra. [F] | Nome del locale sotto il titolo dello Storico e (se serve) in ogni pagina dell'area staff. | A |

### 6. Storico del locale — `/staff/:venueId/history`

Componente **condiviso**: **ST-1…ST-14 valgono per lo Staff** (densità, chip di stato, filtri attivi invisibili, errori lontani dal campo, lista «stantia», vuoto a una sola frase, caricamenti senza indicatore, «Errore interno» senza Riprova, due nomi per la stessa pagina): non li ripeto. **ST-15 è confermata** dal PNG: la riga mostra il **codice card in grassetto** (`storico__default`), senza nome né locale; combacia con il codice che si vede in coda (CQ-1), il che rende la riga **ritrovabile**. Minimizzazione ✅.

| Stato (file) | Difetti nuovi o varianti peggiori | Proposte | Pri |
|---|---|---|---|
| **Lista** (`storico__default`) | **SH-1** Variante peggiore di **ST-1**: per lo staff la lista è **tutto lo stesso giorno** («25/11/2026, 14:14» ripetuto per ~40 righe), con **54 righe ≈ 4.000 px**; la domanda tipica («cos'è successo negli ultimi minuti?») ha risposta in cima, ma **non c'è nessun «Oggi / ultimi 30 min»**. La data lunga va a capo. [F] | Raggruppamento per giorno (D22) con «Oggi»; ora breve (`14:14`) dentro il giorno; filtro rapido «Oggi». | M |
| | **SH-2** **Stato esclusivo dello staff**: tre righe «**… In attesa**» (`storico__default`, `storico__filtro-in-attesa`) in testa, **duplicato della coda**; il glifo «…» si legge come caricamento (ST-2). [F] | Chip «In attesa» (D22) con collegamento alla card in coda; o non mostrarle nello storico. **[V]** se servono (filtro «In attesa» esiste). | B |
| | **SH-3** **Verbi**: lo storico dice «premio **riscattato**» (`storico__default`: «1 premio riscattato»), la coda/esito dice «premio **ritirato**»; il cliente «ottenuto»: D23 (decisa: **«riscattato»** per lo stato, **«Consegna»** per l'istruzione allo staff). [F] | Un verbo solo. | M |
| | **SH-4** **Chi ha gestito la richiesta non si vede**, né quante unità; per una contestazione («ho dato il timbro?») ci sono data/ora e timbri, non l'operatore. [F] | Non lo propongo (dato personale in più, minimizzazione); **[V]** se serve a un locale con più staff. | — |
| **Titolo** | **SH-5** «Storico richieste» **senza locale** (vedi MN-5). | Aggiungere il nome. | A |
| **Filtri** (`storico__filtri-aperti`, `storico__filtro-in-attesa`, `storico__filtro-esito-approvate`, `storico__vuoto-con-filtri`) | Già ST-6/ST-8/ST-11. Variante: con il pannello aperto per lo staff compaiono **Timbri min/max** e **Periodo** come per il cliente: lo staff userebbe quasi solo **Esito** e **Oggi**. | Filtri rapidi per esito (chip) in cima; il resto in «Altri filtri». | B |
| **Non autorizzato** (`storico__non-autorizzato-altro-locale`, `-403`, `-link-i-tuoi-locali-focus`) | **SH-6** Stesso difetto di ER-5 (tre scatole, link a 3,19:1, riquadro di focus ~33 px). In questi PNG compare anche il **«<» di «Indietro»**: dal codice non dovrebbe esserci (`showBack` richiede un locale di cui sei membro). **[V]** se è un residuo della cattura. | Come ER-5. | B |
| **Menu** (`storico__menu-aperto`) | Come S-3/MN-1: la tendina copre «Filtri» e le prime righe. | — | (via S-3) |

### 7. Profilo visto da uno staff (non proprietario)

Vale **tutto** `PR-` e `ME-` (stessa pagina). Varianti per lo Staff:

| Stato (file) | Difetto | Proposta | Pri |
|---|---|---|---|
| `profilo__default` | **PF-1** Variante **peggiore di PR-1 / ME-1**: lo staff vede la card finta **«Bar Aurora · 3/10»**, un locale **diverso dal proprio** (es. «Bar Pasticceria Rossi») e un bottone «Aggiungi a Google Wallet» che **non fa nulla**. Per chi lavora in un locale il dato è non solo falso, ma **sembra** una funzione dello staff. [F] (`profilo__default`) | D17 (toglierla); nel frattempo **possibile bug** (vedi `11-decisions.md`, «Da verificare/segnalare» n. 2). | A (via D17) |
| | **PF-2** «Zona pericolosa» con «Questo account gestisce un locale e non può essere eliminato da qui.» **senza azione** e senza dire chi contattare (ME-1); lo staff non proprietario non sa se è il suo caso. [F] | Come ME-1. | M |
| `profilo__bottone-indietro-focus`, `profilo__menu-aperto` | «Indietro» pieno arancione al focus (L-6/L-7); il menu sul profilo ha **solo Profilo + Esci** (non «Storico richieste»): ✅ coerente, ma **non c'è modo di tornare alla coda dal menu** (solo «<»). [F] | Voce «Coda» (nome del locale) nel menu dell'area staff. | B |
| `profilo__ritorno-alla-coda` | ✅ Il «<» riporta alla coda (origine ricordata). | Mantenere. | — |

---

## Il momento chiave: la decisione rapida in coda

Il flusso reale è: **(1) accorgersi** che c'è una richiesta → **(2) riconoscere** il cliente → **(3) decidere** (conferma, quantità, rifiuto) → **(4) agire** → **(5) capire l'esito** → **(6) consegnare** (timbro / premio). Oggi il 3-4 è bene impostato; il 1, il 2, il 5 e la sicurezza del 4 sono i punti deboli.

| Fase | Oggi | Rischio |
|---|---|---|
| 1 · Accorgersi | solo il numero nel titolo della scheda; la card nuova sta **in fondo** (CQ-16) | richiesta non vista, il cliente aspetta e la richiesta **scade** (la scadenza è muta) |
| 2 · Riconoscere | **codice di 8 caratteri** in `h5`; nessun nome (CQ-1, CQ-2) | scambio di clienti; confronto lento |
| 3 · Decidere | «Conferma» già pronto con 1 prodotto (**1 tocco**); quantità N = N tocchi o ≥ 4 azioni (CQ-9); nessuna anteprima dell'effetto (CQ-8) | errore di quantità («25» invece di «2»: 22 timbri + 3 premi) senza accorgersene |
| 4 · Agire | «Rifiuta»/«Conferma» **16 px** a fianco; nessun annulla (ES-1); card che **si spostano** sotto il dito (CQ-15) | **conferma sul cliente sbagliato**; rifiuto per errore |
| 5 · Capire l'esito | esito in loco, 8 s, poi sparisce e **tutto scorre** (ES-6) | non sapere se è andata; mis-tap per il salto |
| 6 · Consegnare | «Premio ritirato: Caffè gratis» come riga di testo (ES-2); prima della conferma il premio non ha nome (CQ-13) | premio dimenticato o sbagliato |

**Conteggio dei tocchi** [F] sullo schermo attuale: confermare 1 prodotto = **1**; confermare N prodotti = **N + 1** (con «+») o **≥ 4 azioni** (tastiera); rifiutare = **1**; correggere un errore = **non possibile**; dall'esito al successivo = **0** (le card sono già lì) ma con spostamenti; cambiare locale = **3**.

**Cosa si guadagna con poco** [I]: (i) **stabilizzare il layout** (D25), (ii) **annulla per «Rifiuta»** (D27), (iii) **codice grande** e **contatore + «da N min»**, (iv) **preset di quantità**, (v) **«Premio» come chip**. Tutto solo UI.
**Con backend** [I]: nome del premio nella card (D29), anteprima dell'esito, nome del cliente (D30), contatore per locale (LC-1), eventuale annullamento vero (D27 B).

**Alternative per la card di coda** (tutte rispettano D5, D11, regole globali; l'arancione va deciso con D1):

| | Sobria | Audace |
|---|---|---|
| Identità | codice 22 px 700, a gruppi, cifre tabulari | codice enorme in un riquadro che il cliente può **mostrare e leggere a distanza** |
| Urgenza | «da 2 min» + tono avviso nell'ultimo minuto | barra sottile di scadenza sulla card (CSS) |
| Priorità | prima card con bordo distinto, «1°» | **una card alla volta** (la più vecchia a tutta altezza), le altre come righe compatte sotto |
| Azione | «Conferma» a tutta larghezza, «Rifiuta» in secondario sotto; quantità con preset | gesti (scorri per rifiutare con annulla): **solo se** c'è l'annulla; rischio di gesti involontari **[V]** |
| Esito | esito in loco con «Annulla» per 4 s e poi riga «Gestita 14:32» | esito che si comprime con una barra di conteggio |

---

## Checklist applicata (passo 4)

| Voce | Esito Staff |
|---|---|
| **Gerarchia** | Debole nei punti che contano: codice `h5` peso 500 (CQ-1), titolo `h4` 500 (CQ-6), «Premio disponibile» in linea (CQ-13), esito premio come testo (ES-2). Buona nell'azione: «Conferma» pieno vs «Rifiuta» outline. |
| **Contrasti calcolati** | Testi 4,5+ tranne: **«Premio disponibile» in scuro 4,08**, **«Ok» in scuro 3,94**, **«Rifiuta» in scuro 4,08**, nomi dei locali in chiaro 3,19; UI: campo quantità 1,30 / 2,26, stepper disabilitato 2,16, `Conferma` disabilitato 2,16 / 2,63. Il resto → D1. |
| **Target ≥ 44 px** | ✅ «Rifiuta/Conferma» 48, stepper 56 × 48, campo 48, burger 44, voci menu 44. ⚠ link «I tuoi locali» **~33 px** (ER-5, SH-6). Distanza «Rifiuta»-«Conferma» **16 px** (da validare con un dito vero). |
| **Focus visibile** | Come L-6/L-7: focus = pressed su «Conferma» e «Ok»; **«Rifiuta» e stepper al pressed diventano pieni** (ottimo feedback). Campo quantità: alone pesca (1,79:1). |
| **Errore / vuoto / caricamento** | Errore: pattern ok nel testo, debole nel contesto (ER-1, ER-4); **vuoto** vivo no (CQ-17); caricamento solo testo (V-1) e titolo segnaposto (CQ-18); **nessun indicatore** di ricaricamento della coda. |
| **Etichette ARIA** | ✅ **Ottime** sulla coda: `aria-label` che include il codice su stepper, campo, «Rifiuta», «Conferma», «Chiudi esito di …»; `role=status` per l'annuncio dell'esito; `aria-invalid`+`describedby` sulla quantità. ⚠ «prodotto/prodotti» e l'unità «premio compreso» solo nell'`aria-label` (CQ-8); le card non sono una lista (`ul/li`) né hanno un titolo di sezione; il glifo `✔/⚠` dell'esito non è `aria-hidden`. |
| **Messaggi** | Specifici, ma senza codice né ragione (ER-1); «Errore interno» (ER-3). |
| **Coerenza con Cliente/Accesso** | Stesso `AlertError`, stessi bottoni, stesso menu (S-3). **Danger**: la coda usa il rosso Bootstrap `#dc3545` (EL-9: un terzo rosso). **Stato invalido** mancante sulla quantità (modello: `/name`). **Verbi** del premio (D23). **Codice**: il cliente lo vede piccolo e grigio (R-2) mentre lo staff lo legge. |
| **Tema scuro** | Leggibile; rosso e verde al limite (4,08); «Ok» grigio debole; pillola promozione chiara. «Troppa luce» (chiaro): «Conferma» 3,19. |
| **Copy** | Vedi tabella. |

## Opportunità (tutte [I]; con le etichette «richiede backend» dove serve)

| Dove | Cosa | Sobria | Audace | Costo [I] |
|---|---|---|---|---|
| Coda | **Accorgersi di una richiesta nuova** | Contatore sticky «3 in coda» + «Nuova» sulla card per 3 s (CSS, `prefers-reduced-motion`) + titolo scheda | Suono breve + vibrazione + schermo sempre acceso (Wake Lock) **[V]**: iOS, permessi, autoplay | basso (sobria) / medio (audace) |
| Coda | **Layout stabile** | Card scadute/gestite restano come «Scaduta»/«Già gestita» fino a «Ok»; ancoraggio dello scorrimento; spazio riservato agli errori | Ignorare i tocchi 300 ms dopo un salto | basso |
| Coda | **Annulla** | «Annulla» 3-5 s su «Rifiuta» (invio ritardato, solo UI) | Annullamento vero lato backend (**richiede backend**, decisione di prodotto) | basso / medio |
| Coda | **Quantità veloce** | Preset (1·2·3·5), pressione prolungata, avviso per quantità alte | — | basso |
| Coda | **Premio nominato** | Chip «Premio» (D11) prima della conferma; **nome del premio: richiede backend** | Card con regalo che si evidenzia | basso / medio (backend) |
| Coda | **Nome del cliente** | — (domanda D30) | Nome + codice | medio (backend + privacy) |
| Locali | **Dove c'è lavoro** | Ricordare l'ultimo locale | Contatore per locale (**richiede backend**) | basso / medio |
| **Tablet** | Staff al banco con il tablet fisso | **Coda a sinistra, dettaglio a destra** (lista compatta + card grande con «Conferma» enorme) | Modalità «banco»: schermo pieno, tipografia grande, solo coda | medio |
| **Desktop** | Staff alla cassa con il PC | **Tabella** (codice · da N min · timbri · quantità · Conferma/Rifiuta), tastiera (Invio = conferma la prima, `+`/`−` = quantità) | Coda + Storico affiancati | medio |
| Storico | Raggruppo per giorno, tabella su schermo largo | come D22 | — | basso |

Nota di misura: **CQ-15, ES-1 e CQ-16** sono **solo UI** (con D25, D27 A, D28 sobria) e riducono il rischio più di qualunque restyle.

---

## Pattern per il design system (da aggiungere ai 26 delle parti A e B)

27. **Card di richiesta** (codice grande, da N min, timbri, chip premio/promozione, stepper, azioni) con **versione compatta** per liste lunghe e **versione tablet/desktop** (riga di tabella).
28. **Stepper di quantità** con preset, pressione prolungata, errore al posto dell'etichetta, stato «minimo» non-disabilitato e **avviso per quantità alte**.
29. **Esito in loco** (approvata/rifiutata/già gestita/scaduta): comprime, **non sposta**, con **annulla** a tempo.
30. **Coppia azione/azione negativa** (distanza ≥ 16 px, peso diverso, **annulla**, conferma a due passi solo se serve): regola unica per Staff (Rifiuta) ed Elimina account.
31. **Banner di stato della coda** (sticky): connessione assente, ultimo aggiornamento; **stato vuoto vivo** («in ascolto»).
32. **Contatore + segnale di richiesta nuova** (badge, «Nuova», suono/vibrazione opzionali).
33. **Header con locale attivo**: nome del locale tappabile (cambio rapido), presente anche nello Storico.
34. **Chip «Premio»** (D11: accento distinto + icona + testo) usato in coda, esito, storico.
35. **Messaggio d'errore con codice** («<codice> · …») e ✕.
36. **Regola «niente salti di layout sotto il dito»**: spazio riservato, ancoraggio, nessuna rimozione immediata.

## Copy

Testi **letterali del codice** (restano finché non decidi); le proposte sono **suggerimenti**.

| Oggi | Osservazione | Proposta |
|---|---|---|
| «Richieste» (titolo segnaposto) | Non dice il locale (CQ-18) | Nome noto subito, o «…» con scheletro |
| «scade tra 4 min» · «14:14» | L'ora serve poco (CQ-3) | «da 2 min» + «scade tra 4 min» |
| «1 / 10 timbri» · «· Premio disponibile» | Il premio si perde (CQ-13) | Chip «Premio» + «10 / 10 timbri» |
| «Nuova promozione» (pillola) | Ok; non dice cosa dire a voce | «Nuova promozione: la card riparte da zero» |
| «prodotto/prodotti» (quantità) | Non dice che sono i consumati, premio compreso | «prodotti consumati (premio compreso)» |
| «⚠ Quantità non valida: inserisci un numero intero da 1 a 50.» | Lungo, sposta i bottoni | «Da 1 a 50.» al posto dell'etichetta |
| «Conferma» / «Invio…» | Ok; «Invio…» a 2,16:1 | Spinner + «Invio…» |
| «Rifiuta» | Ok | Mantenere |
| «✔ Richiesta approvata» · «+3 timbri · Premio ritirato: Caffè gratis» | Il premio è l'azione dello staff (ES-2) | «Consegna: Caffè gratis» (verbo: D23) |
| «+1 timbro · Premio disponibile» | Si confonde con «ritirato» (ES-3) | «Card completa: il prossimo prodotto è gratis» |
| «⚠ Richiesta rifiutata» · «Nessun timbro aggiunto.» | Ripetitivo | «Rifiutata · nessun timbro» |
| «Ok» (esito) | Non dice cosa chiude | «Chiudi» (o ✕ con etichetta) |
| «Richiesta non più valida» | Senza codice né ragione (ER-1) | «<codice> · Richiesta non più valida» (+ ragione, **[V]** backend) |
| «Esito non confermato: controlla la coda prima di riprovare.» | Giusto; manca il come | + «Se la richiesta non è più in coda, è già stata gestita.» |
| «Connessione non riuscita, riprova» (poll) | Il polling riprova da solo | «Connessione assente: la coda potrebbe non essere aggiornata. Riprovo…» |
| «Errore interno» | Senza azione (V-5) | «Qualcosa non ha funzionato. Riprova.» |
| «Nessuna richiesta in attesa.» | Non dice che ascolta (CQ-17) | «Nessuna richiesta in attesa · in ascolto» |
| «Non sei autorizzato a gestire questo locale.» · «I tuoi locali» | Giusto (404 identico); link piccolo | Bottone «Vai ai tuoi locali» |
| «Storico richieste» (titolo) | Senza locale (MN-5) | «Storico · Bar Rossi» |
| «… In attesa» · «premio riscattato» | Glifo ambiguo; verbo | Chip; verbo unico (D23) |

## Incoerenze rispetto ad altre sezioni

- **Danger**: la coda usa **`btn-outline-danger` standard** (`#dc3545`), «Elimina account» usa `--stampy-danger` (`#c92a3a`/`#f0808b`) e il pieno `btn-danger`: **tre rossi** (EL-9) e «Rifiuta» ha il **peggior contrasto in scuro** (4,08).
- **Quantità**: l'unico campo con messaggio sotto, **senza stato invalido** (`/name` lo ha: modello).
- **Codice card**: protagonista per lo staff, **minore** per il cliente (R-2).
- **Verbi del premio**: oggi «ritirato» (coda), «riscattato» (storico), «ottenuto» (dialog): D23 decisa, tutto «riscattato» + «Consegna».
- **Esito**: verde/giallo (Staff) vs verde/«non confermata» neutro (Cliente): per lo stesso evento due toni diversi; la distinzione va decisa nel design system (esito di successo, avviso, errore, informativo).
- **Disabilitato**: «Conferma» e stepper spenti come default (regola globale violata dove conta di più).

## Cosa MANTENERE (riassunto)

1. **Un tocco** per il caso normale (quantità 1, «Conferma» sempre nello stesso punto, 48 px).
2. **Peso diverso** tra «Conferma» (pieno) e «Rifiuta» (outline), 16 px di distanza, 50/50.
3. **Ordine FIFO** del backend e il **titolo della scheda «(N) Stampy»**.
4. **Esito in loco** al posto della card, con verde/giallo, icona + testo e contenuto fedele al backend (nessun calcolo nel frontend).
5. **Quantità sicura**: testo digitato che non si sovrascrive, normalizzazione, mai inviare un valore non valido.
6. **Errori onesti** sull'esito incerto, **locale altrui = locale inesistente**, alert sticky.
7. **`aria-label` con il codice** su ogni controllo della coda; `role=status` per gli esiti.
8. **`PromotionNotice staff`** (pillola sobria).
9. **Ritorno alla coda** dal profilo e dallo storico; menu che si adatta al contesto.
10. **Stepper** a 56 px con singolare/plurale; riga «Storico» e filtri nell'URL (condiviso).

## Top 10 della parte Staff (impatto / sforzo)

| # | Miglioramento | Impatto | Sforzo | Rif. |
|---|---|---|---|---|
| 1 | **Layout stabile sotto il dito**: richieste scadute/gestite restano come «Scaduta/Già gestita»; ancoraggio; spazio riservato agli errori | alto (conferma sul cliente sbagliato) | basso–medio | CQ-15, ES-6, ES-7, CQ-10 |
| 2 | **Annulla per «Rifiuta»** (invio ritardato, solo UI) e avviso per quantità alte | alto | basso | ES-1, CQ-8, CQ-9 |
| 3 | **Segnale di richiesta nuova** + contatore sticky + «da N min» | alto | basso | CQ-16, CQ-4, CQ-3 |
| 4 | **Codice grande e riconoscibile** (anche sul telefono del cliente) | alto | basso | CQ-1, R-2 |
| 5 | **«Conferma» sempre attivo**; quantità invalida col pattern di `/name` senza spostare i bottoni | alto | basso | CQ-10, CQ-11, D26 |
| 6 | **Premio come chip** (D11), nome del premio nella card (**backend**), esito che dice «Consegna: …» | alto | basso (UI) / medio (backend) | CQ-13, ES-2, ES-3, D29 |
| 7 | **Banner di connessione sticky** con ultimo aggiornamento; coda vuota «in ascolto» | medio | basso | ER-4, CQ-17 |
| 8 | **Errori con codice e ✕**, senza coprire le card | medio | basso | ER-1, ER-2 |
| 9 | **Locale attivo ovunque** (Storico incluso), cambio rapido, ricordo dell'ultimo locale | medio | basso | MN-5, SH-5, MN-4, LC-2 |
| 10 | **Tablet/desktop**: coda affiancata al dettaglio, tabella, tastiera | alto (per chi lo usa) | medio (chat 7-8) | Opportunità |

Ordine consigliato: **1, 2, 3, 5** sono solo UI e riducono errori e ritardi; 4 e 6 toccano anche il Cliente; 7-9 nel design system; 10 nelle chat tablet/desktop.

## Domande aperte per me (da D25)

- **D25.** **Salti di layout in coda** (CQ-15): le richieste scadute o gestite altrove **restano come «Scaduta/Già gestita»** finché lo staff non le chiude (consiglio, solo UI), oppure spariscono subito con ancoraggio dello scorrimento?
- **D26.** **«Conferma» con quantità non valida**: sempre attivo, al tocco focus sul campo e messaggio (**regola globale, consiglio**), o disabilitato (ammesso come per i distruttivi, vedi D20)?
- **D27.** **Annulla** (ES-1): (a) invio ritardato 3-5 s con «Annulla» **solo per «Rifiuta»** (consiglio, solo UI); (b) annullamento vero lato backend (**richiede backend** e una decisione di prodotto, non so se l'operazione esista); (c) nulla, ma «Rifiuta» a due passi?
- **D28.** **Richiesta nuova** (CQ-16): sobria (contatore, «Nuova» 3 s, titolo scheda: consiglio) o audace (suono, vibrazione, schermo sempre acceso: **[V]** iOS e permessi)? Il suono sarebbe opzionale per lo staff?
- **D29.** **Nome del premio nella card di coda** (CQ-13): lo vuoi (**richiede backend**: aggiungere `reward` alla coda; voce di backlog, come D9)?
- **D30.** **Nome del cliente in coda** (CQ-2): sì, no, o solo le iniziali? Il cliente lo inserisce «per riconoscerti nei locali»; oggi lo staff non lo vede (decisione di minimizzazione da **[V]**, non l'ho trovata in `CONTEXT.md`). Richiede backend.
- **D31.** **Tablet/desktop per lo Staff** (Opportunità): vuoi che la chat tablet/desktop parta dalla **coda + dettaglio affiancati** e dalla **tabella**, tenendo la card di oggi solo su telefono?
- **D32.** **«Esci»** (MN-2): separatore e stile neutro, **con o senza** conferma? (Rientrare costa email + codice a 6 cifre in pieno servizio.)
- **D33.** **Ricordare l'ultimo locale** (LC-2): sì (rischio di operare nel locale sbagliato se lo staff gira) o ogni login passa dall'elenco?

## Non verificato / dubbi

- **Salti di layout** (CQ-15): geometria stimata dai fogli (card ≈ 270 px, esito ≈ 230); non provati su un telefono con un dito reale né a distanza di 3 s dal polling.
- **Se `text-success` in scuro** sia `#198754` o più chiaro: contrasto calcolato dal token (4,08), non sui pixel.
- **Alfabeto dei codici** (ambiguità `0/O`, `1/I`): non verificato.
- **«scade tra N s» / «scade ora»**: mai fotografati (la card sparisce al polling); orologio visibile aggiornato ogni 10 s.
- **Annullamento lato backend**: non so se esista; non l'ho assunto. Limiti di frequenza del backend a ritmo di servizio: non verificati.
- **Tastiera numerica sopra i bottoni** (CQ-9) e **orientamento orizzontale**: non verificati.
- **Suono, vibrazione, Wake Lock, notifiche** su iOS/Android: supporto e permessi da verificare (come per la vibrazione del premio).
- **Screen reader** (annuncio degli esiti e degli errori sticky); **frecce native** del campo numerico (solo in alcuni PNG).
- **«<» nello Storico non autorizzato** (SH-6): residuo di cattura o comportamento reale: da verificare.
- **Sezioni non catturate**: hover, tablet, desktop, locali con più di 12 richieste (limite del backend: 50).
