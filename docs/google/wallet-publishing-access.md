# Google Wallet: dalla modalità demo alla produzione (V2)

Letto il **2026-11-23** direttamente sulle pagine ufficiali di Google for Developers (scaricate e lette per intero, non da riassunti). Le pagine di `developers.google.com/wallet/retail/loyalty-cards/...` riportano «Last updated 2026-11-09 UTC».

Legenda dei tag (usata in tutto il file):

- **[VERIFICATO]**: scritto alla lettera nella pagina ufficiale citata.
- **[DOCUMENTATO, NON A FONDO]**: la fonte è ufficiale ma dice poco o è ambigua; il dettaglio manca.
- **[CONTRADDITTORIO]**: due punti della documentazione ufficiale si smentiscono.
- **[NON TROVATO]**: cercato, nessuna fonte ufficiale lo dice. Non va dato per vero né per falso.
- **[DEDUZIONE]**: conseguenza nostra di ciò che è scritto, non scritta da Google.

Base: `https://developers.google.com/wallet/retail/loyalty-cards/` (sotto: `…/`).

## 1. Cosa significa «demo» e come se ne esce

- **[VERIFICATO]** L'account issuer nasce in **modalità demo**: si possono emettere pass solo a utenti Google Wallet che hanno il ruolo **Admin** o **Developer** sull'issuer, o che l'issuer ha aggiunto come **account di test** nella console. ([request-publishing-access](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/request-publishing-access))
- **[VERIFICATO]** Per emettere a qualsiasi utente serve il **publishing access**, concesso dal team Google Wallet dopo una revisione dei prerequisiti. (stessa pagina)
- **[VERIFICATO]** Una volta concesso, l'annotazione **«[TEST ONLY]»** viene rimossa dai pass; la checklist aggiunge: da tutti i pass dell'issuer, e le class e gli object nuovi nascono «live». ([launch-checklist](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/launch-checklist))
- **[DEDUZIONE]** Nel nostro codice `issuerName` è `venue.name` (`wallet.service.ts:37`) e non c'è nessun «[TEST]» scritto da noi: l'etichetta che vedi sui pass la aggiunge Google in demo, e sparisce da sola con il publishing access. Non va rimossa a mano.
- **[VERIFICATO]** La demo ha **le stesse funzioni e lo stesso comportamento** della modalità pubblicazione: cambia solo chi può aggiungere il pass (utenti di test; Admin e Developer lo sono già). In demo si possono concedere i service account, creare class e object, emettere ai tester, completare il Business Profile e richiedere il publishing access. Le class già in stato `APPROVED` restano valide dopo il passaggio. ([blog Google, 3 feb 2023](https://developers.googleblog.com/enable-fast-pass-development-with-google-wallet-demo-mode/); il blog è del 2023, quindi da riconfermare se qualcosa cambia.)
- **[VERIFICATO]** Account di test: console → «Google Wallet API» → tab «Manage» → «Set up test accounts» → un'email Google per riga → «Update testers». Così si aggiungono tester senza dare loro accesso all'issuer (stesso blog). Il numero massimo di tester è **[NON TROVATO]**.
- **[VERIFICATO]** Class e object **non si cancellano** (FAQ): quello che si crea in demo resta nel registro dell'issuer; i pass già salvati appartengono all'issuer che li ha emessi e **non si spostano** su un altro **[DEDUZIONE]**.

### Decisione del proprietario (2026-11-23): quando passare in produzione
**Si richiede il publishing access quando c'è il dominio**, non prima. Fino ad allora l'issuer demo attuale basta, perché la demo funziona come la produzione. Motivi:

1. **Il Business Profile chiede sito, email e URL di supporto** ([pagina ufficiale](https://support.google.com/google-pay-and-wallet-console/answer/10877772?hl=en)); con un dominio proprio sono coerenti (`supporto@dominio`, una pagina semplice).
2. **Il profilo pagamenti si crea una volta sola con l'account definitivo**: il tipo (individuale o organizzazione) non si cambia dopo la creazione e il Business Profile può essere associato a un solo profilo pagamenti (per cambiarlo si passa dal supporto) ([payments center](https://support.google.com/paymentscenter/answer/9028746?hl=en)).
3. **Il nome pubblico** compare agli utenti e **[NON TROVATO]** se si può cambiare dopo l'approvazione: va scelto dopo la rinomina del marchio (P-rinomina), non «Stampy».
4. **Account Google con un indirizzo del dominio** per l'issuer di produzione, più ordinato; senza clienti, rifare issuer, service account e class costa poco.

Ordine: scelta del nome → dominio (P5) → account Google → nuovo issuer + Business Profile → richiesta del publishing access.

Da verificare quando si arriva lì: se l'issuer si può passare a un altro account (aggiungendolo come Admin dalla pagina «Users») invece di ricrearlo **[NON TROVATO]**; se un account Google con email esterna basta senza Google Workspace **[DEDUZIONE]**, da confermare alla registrazione.

## 2. Prerequisiti per richiedere il publishing access

### 2.1 Cosa chiede Google

**[VERIFICATO]** su [request-publishing-access](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/request-publishing-access), [launch-checklist](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/launch-checklist) e [Use the Google Wallet API](https://support.google.com/console/answer/11044296?hl=en). Le revisioni sono **due, in sequenza**:

1. **Business Profile approvato** (console Google Pay & Wallet → «Business Profile»). Stati possibili: *Incomplete*, *In Review*, *Approved*, *Rejected* ([Business Profile](https://support.google.com/google-pay-and-wallet-console/answer/10877772?hl=en)). La guida dice di compilarlo e «wait for it to be approved» prima di chiedere l'accesso al Wallet API. Durata della revisione del Business Profile: **[NON TROVATO]**.
   - Campi obbligatori: nome pubblico (mostrato agli utenti), sito web, URL di supporto (può coincidere col sito), email di supporto, telefono di supporto (può coincidere con quello dell'attività).
   - Per gli issuer è richiesto anche l'**MCC**; Google consiglia «Others (0000)» come segnaposto e dice che in futuro non servirà più.
   - Opzionali: logo (da 640×640 a 1024×1024 px, max 5 MB) e telefono dell'attività.
   - Il Business Profile va associato a **un solo profilo pagamenti**, dello **stesso paese**; il paese del Business Profile è bloccato alla registrazione.
2. **Almeno una Passes Class** e **almeno un Passes Object** che la referenzia, dello stesso issuer.
3. **Test di integrazione** (§5), compreso «Add to Google Wallet» su tutte le superfici usate.
4. **Richiesta del publishing access**. Google «will review and test your integration» e risponde con l'approvazione o con l'elenco dei problemi. Durata ufficiale: **1–2 giorni lavorativi** dopo l'invio ([guida della console](https://support.google.com/console/answer/11044296?hl=en)); il [blog Google (2023)](https://developers.googleblog.com/enable-fast-pass-development-with-google-wallet-demo-mode/) dice «fino a due giorni lavorativi». Guide di terzi parlano di 2–3 giorni o più: non sono fonti ufficiali. **[DEDUZIONE]** Con le due revisioni, aspettarsi almeno 3–5 giorni lavorativi in totale, più la durata non nota del Business Profile.

**[CONTRADDITTORIO] Come si invia la richiesta.** La pagina per sviluppatori parla di un pulsante «Request publishing access» nel riquadro «Get publishing access»; la guida della console parla di «request access» nel tab «Google Wallet API» con un **modulo in cui si descrive l'uso**. Probabilmente è lo stesso passaggio descritto in momenti diversi: **[NON TROVATO]** conferma. Se compare il modulo, descrivere l'uso in modo semplice.

**[CONTRADDITTORIO] Screenshot.** Il riassunto in cima alla pagina per sviluppatori dice «have pass screenshots ready», ma la nota nel corpo dice: «The screenshots are no longer a requirement to raise a request for production access». Il blog del 2023 dice invece che un contatto Google li chiede. Peso al corpo della pagina più recente (non richiesti), ma tenerne uno del pass reale a portata di mano non costa nulla.

**Il rifiuto.** La documentazione dice che Google indica i problemi da correggere. Un elenco pubblico dei motivi di rifiuto del Business Profile o della richiesta: **[NON TROVATO]**.

### 2.2 Chi può essere issuer: una persona fisica senza partita IVA

- **[VERIFICATO]** L'issuer può essere «individual developers, companies and organizations, as well as aggregators who create and issue passes on behalf of others» ([terminologia](https://developers.google.com/wallet/generic/resources/terminology)); il Business Profile verifica «a real business, organization, or individual».
- **[VERIFICATO]** Nessuna pagina letta chiede la partita IVA tra i campi del Business Profile. Il profilo pagamenti memorizza il tax ID «when required legally» ([create & manage](https://support.google.com/paymentscenter/answer/9028746?hl=en)). Cosa chieda la console a un italiano senza partita IVA: **[NON TROVATO]** (si vede solo creando il profilo).
- **[NON TROVATO]** Nessuna fonte dice che il tipo del profilo pagamenti sia un requisito del publishing access.
- L'unica opzione «Sole proprietor» trovata è del prodotto *Google Pay for Offline Business* ([setup](https://support.google.com/pay-offline-merchants/answer/9232117)): un altro prodotto.

### 2.3 I livelli, per non confonderli

| Livello | Cos'è | Quanti |
|---|---|---|
| **Account Google** | L'identità con cui si accede alla console e si è Admin dell'issuer | 1 |
| **Business (console)** | Il contenitore in console; se ne crea uno per paese | 1 |
| **Business Profile** | Dati pubblici (nome, sito, supporto); ha uno stato di approvazione | 1 per business |
| **Profilo pagamenti** | Nome, indirizzo e tax ID «quando richiesto dalla legge» di chi è responsabile; **identifica l'attività** | 1, associato al Business Profile |
| **Issuer** | L'account che emette i pass | uno o più sotto lo stesso business (la [FAQ](https://developers.google.com/wallet/retail/loyalty-cards/resources/faq) parla di «1 parent account to many issuer accounts»); se ogni issuer richieda un proprio Business Profile: **[NON TROVATO]** |
| **Progetto Cloud + schermata di consenso OAuth** | Il login «Accedi con Google» | indipendente dal profilo pagamenti |
| **Partita IVA** | Fatto fiscale italiano, **fuori da Google** | — |

**Il profilo pagamenti non serve a incassare da Google.** Serve per identificare l'attività. Nessuna pagina letta chiede ricavi o importi; per il Business Profile l'MCC è una categoria, non un importo. È richiesto per il publishing access ([pagina della richiesta](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/request-publishing-access)), **non** per usare la demo e **non** per il login con Google. **[DEDUZIONE]** Per Stampy, che incassa dai locali fuori da Google, Google non entra nei pagamenti. Se la console chieda un metodo di pagamento alla creazione del profilo: **[NON TROVATO]**.

Un profilo pagamenti può esistere già: «a payments profile is automatically created for you the first time you enter payment details during checkout» (create & manage).

### 2.4 Profilo pagamenti: individuale contro business

Da [create & manage](https://support.google.com/paymentscenter/answer/9028746?hl=en), [manage business profiles](https://support.google.com/paymentscenter/answer/9001878?hl=en) e [set your account type](https://support.google.com/paymentscenter/answer/11543916). Tutto **[VERIFICATO]** salvo dove indicato.

| | Individuale | Business (in alcuni prodotti «Organization») |
|---|---|---|
| Quando | «own personal payments»; la pagina sul tipo di account precisa che **include i titolari solitari** (freelance, consulenti) non registrati come organizzazione | Chi paga o incassa per conto di un'attività, organizzazione, partnership, ente |
| Documento per la verifica | **Documento d'identità** col nome identico | **Documento che mostra l'organizzazione registrata**, col nome identico |
| Ragione sociale modificabile | No | Sì |
| Tipo modificabile dopo la creazione | **No** | **No** |

**[CONTRADDITTORIO, lieve]** «Individuale = pagamenti personali» (create & manage) e «individuale include i titolari solitari» (set your account type): per il nostro caso conta la seconda, che parla di verifica dell'identità. Gli scenari con una società non sono trattati qui.

### 2.5 Evoluzione per fasi (senza società)

Che cosa cambia **in Google** e che cosa è **fuori da Google** nelle tre fasi. Il tipo del profilo pagamenti resta «individuale» in tutte e tre **[DEDUZIONE]** (nessuna pagina dice il contrario; per una ditta individuale con partita IVA: **[NON TROVATO]**).

| | **Fase 1: nessun ricavo** (sviluppo, clienti di test, gratis) | **Fase 2: prestazioni occasionali** | **Fase 3: partita IVA individuale** |
|---|---|---|---|
| **Issuer** | Demo; tester aggiunti da «Set up test accounts» | Come prima, o produzione se già richiesta | Invariato; i pass emessi restano dell'issuer |
| **Business Profile** | In demo non serve; per la produzione va compilato e approvato (§2.1) | Invariato | Invariato: nome pubblico, sito, supporto non cambiano per la partita IVA **[DEDUZIONE]** |
| **Profilo pagamenti** | Individuale, con documento d'identità tuo | Invariato: Google non vede i ricavi né te li chiede **[DEDUZIONE]** | Invariato nel tipo. Si possono aggiornare indirizzo e **tax ID** **[VERIFICATO]**. Se il profilo è già verificato e «bloccato», un cambio di nome o indirizzo richiede il modulo e una nuova verifica **[VERIFICATO]**; se l'aggiunta del solo tax ID scateni la riverifica: **[NON TROVATO]** |
| **Login con Google** | Indipendente dal profilo pagamenti; per scope di base nessuna verifica obbligatoria né tetto utenti (vedi §7) | Invariato | Invariato |
| **Card e PATCH** | Invariati | Invariati | Invariati |
| **Fuori da Google** | Nessun ricavo | **[VERIFICATO]** ([INPS](https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49893.i-contributi-dei-lavoratori-autonomi-occasionali.html), agg. 7 ott 2025): per gli autonomi occasionali i primi **5.000 € annui** sono franchigia contributiva; oltre, Gestione Separata; redditi «diversi» (art. 67 TUIR). **[DOCUMENTATO, NON A FONDO]** Non c'è una soglia unica per la partita IVA: conta occasionale contro abituale. **[DEDUZIONE]** Un canone mensile ricorrente da un locale è per natura ripetuto; la qualifica va valutata con un commercialista | **[DOCUMENTATO, NON A FONDO]** Regime forfettario fino a 85.000 € di ricavi, aliquota 15% (5% per i primi cinque anni di una nuova attività se ricorrono le condizioni) ([circolare 32/E del 2023](https://www.agenziaentrate.gov.it/portale/documents/20143/5718712/Circolare_n_32_Regime+forfetario_05_12_2023.pdf/23d1370d-6bba-0eb7-70b8-d1d24d5a1c0f), da riverificare sulla scheda attuale) |

**Vincoli di fondo.** Il **tipo** del profilo pagamenti è fisso dalla creazione; i dati dentro (indirizzo, tax ID, metodi di pagamento) si aggiornano ([create & manage](https://support.google.com/paymentscenter/answer/9028746?hl=en)). Il Business Profile ha **un solo** profilo pagamenti associato; per cambiarlo si usa «Contact support». Si possono avere più profili pagamenti sullo stesso account Google, uno per paese; il paese deve coincidere con quello del Business Profile. Il nome pubblico del Business Profile non dipende dalle fasi, ma se si possa cambiare dopo l'approvazione: **[NON TROVATO]** (scegliere il nome dopo la rinomina del marchio).

### 2.6 Cosa resta da chiudere (console o supporto)

1. Cosa chiede la creazione del profilo pagamenti a un italiano senza partita IVA (tax ID? metodo di pagamento?).
2. Durata della revisione del Business Profile.
3. Se l'aggiunta del tax ID a un profilo verificato richiede una nuova verifica.
4. Come Google classifica una ditta individuale con partita IVA.
5. Se il nome pubblico del Business Profile si cambia dopo l'approvazione.

Per ognuna: aprire la console (`pay.google.com/business/console`) → «Business Profile», oppure «Contact Support» → «Google Wallet API Integration».

## 3. Tempi, limiti e costi

Tutti i limiti sono **indipendenti dal tipo di profilo pagamenti**.

### 3.1 Tempi

| Cosa | Durata | Stato |
|---|---|---|
| Approvazione del **Business Profile** | sconosciuta (stati: Incomplete, In Review, Approved, Rejected) | **[NON TROVATO]** |
| **Richiesta del publishing access** | 1–2 giorni lavorativi | **[VERIFICATO]** ([guida della console](https://support.google.com/console/answer/11044296?hl=en)); il [blog Google 2023](https://developers.googleblog.com/enable-fast-pass-development-with-google-wallet-demo-mode/) dice «fino a due giorni lavorativi». Guide di terzi: 2–3 giorni o più (non ufficiali) |
| Approvazione di una **class** | la imposta Google da solo dopo `UNDER_REVIEW`; da lì è subito utilizzabile | **[VERIFICATO]** ([reference](https://developers.google.com/wallet/reference/rest/v1/loyaltyclass)); durata dell'automatismo **[NON TROVATO]** |
| Modifica di una class → visibile sui pass | «the next time they sync» | **[VERIFICATO]** ([classi e object](https://developers.google.com/wallet/retail/loyalty-cards/overview/how-classes-objects-work)) |
| Saldo dopo una PATCH | «entro 24 ore» | **[VERIFICATO]** ma è il *criterio del test* di Google ([prelaunch](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/prelaunch-testing)), non una garanzia di latenza. Nel test del 2026-11-09 (V1-ok) il saldo si è aggiornato; la latenza non è stata misurata |
| Risposta dell'API | p99 ≈ 5 s, timeout consigliato 10 s, nessuno SLA | **[VERIFICATO]** ([FAQ](https://developers.google.com/wallet/retail/loyalty-cards/resources/faq)) |

**[DEDUZIONE]** Con le due revisioni (Business Profile e richiesta) aspettarsi almeno 3–5 giorni lavorativi, più la durata non nota del Business Profile.

### 3.2 Limiti

| Limite | Valore | Stato |
|---|---|---|
| Richieste API | **20 al secondo** | **[VERIFICATO]** (FAQ) |
| Notifiche push | max **3 per pass in 24 ore**; oltre, `QuotaExceededException` | **[VERIFICATO]** ([notifiche](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications)); il codice HTTP dell'eccezione è **[NON TROVATO]** (B22) |
| Link «Salva» | ≈1800 caratteri (un'altra pagina indica ≈2000 «sicuri»: usare 1800) | **[VERIFICATO]**, due numeri diversi |
| Messaggi su un object | max 10 | **[VERIFICATO]** ([reference object](https://developers.google.com/wallet/reference/rest/v1/loyaltyobject)) |
| `merchantLocations` | max 10 per object; le altre sono rifiutate | **[VERIFICATO]** |
| Lunghezze consigliate | `accountName` e `accountId` 20 caratteri; etichetta punti 9; saldo 7 | **[VERIFICATO]** (raccomandazioni, non errori) |
| Oggetti collegati a un object | c'è un limite, oltre «ignored silently»; il numero non è indicato | **[VERIFICATO]** |
| Cancellazione di class e object | impossibile; l'utente può solo scollegarli. Anche i merchant ID non si cancellano né archiviano | **[VERIFICATO]** (FAQ) |
| Quote giornaliere o al minuto per progetto | nessun numero pubblicato; si leggono nella pagina «Quotas» del progetto Cloud | **[NON TROVATO]** |
| Numero di card o object per issuer | nessun tetto indicato | **[NON TROVATO]** |
| Pass e tester in demo | nessun massimo indicato; il limite documentato è solo *chi* può riceverli (§1) | **[NON TROVATO]** |

**Errori dell'API.** La [pagina degli errori](https://developers.google.com/wallet/retail/loyalty-cards/resources/error-codes) elenca solo 400, 403, 404 (object e class) e 409. Non c'è un 429 né un codice di quota: quello di quota compare solo per le notifiche.

**Stima dei 20 richieste al secondo.** Un timbro confermato = una PATCH, un locale = un cliente alla volta: per superare il limite servirebbero 20 locali che confermano nello stesso secondo. **[DEDUZIONE]** Con 100 clienti è improbabile; non è un problema da affrontare ora. Unico caso da ricordare: una coda di richieste che si riversa tutta insieme dopo un guasto.

**[CONTRADDITTORIO] Moduli di testo.** La reference dice che i `textModulesData` mostrati sono fino a **10** dall'object e 10 dalla class; le linee guida del brand (§6) raccomandano al massimo **2** tra class e object. Per Stampy (3 moduli) la reference non pone limiti tecnici; la raccomandazione è di design.

### 3.3 Costi

- **[VERIFICATO]** Nelle pagine di onboarding, richiesta del publishing access, checklist, FAQ e termini **non compare nessun prezzo**, nessuna tariffa per pass e nessun costo per il publishing access.
- **[VERIFICATO]** Servono un account Google Cloud, un progetto con l'API abilitata e un service account ([credenziali REST](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/auth/rest)).
- **Verificato sul campo (proprietario, 2026-11-23):** creando l'account Cloud, il progetto, il service account e l'issuer in demo **non è stata richiesta nessuna carta di pagamento né nessun pagamento**. Vale per la demo; per la modalità pubblicazione resta da vedere.
- **[DEDUZIONE]** Se Google applicasse una tariffa per pass starebbe nei termini o in una pagina dei prezzi: l'assenza è un buon indizio, ma il «gratuito» di `CONTEXT.md` §4.6 non è confermato da una frase ufficiale.
- I piani a pagamento dei servizi di terzi che rivendono pass Wallet (es. WalletWallet, PerkPass) sono i loro prezzi, non una prova su cosa chieda Google.
- **Per chiudere**: dopo il passaggio in produzione controllare se compare un account di fatturazione o una richiesta di pagamento; in alternativa «Contact Support» → «Google Wallet API Integration» e farsi confermare per iscritto l'assenza di tariffe.
- I costi noti fuori da Google: dominio (~10 € l'anno, P5) e hosting.

## 4. Class: `reviewStatus`

### 4.1 Come funziona

- **[VERIFICATO]** Sulla [reference di `loyaltyclass`](https://developers.google.com/wallet/reference/rest/v1/loyaltyclass): il campo è obbligatorio. Lo sviluppatore può impostare solo `draft` o `underReview` (insert/patch/update). Una class `draft` non può creare object e, uscita da `draft`, non ci torna più. Quando la class è pronta si imposta `underReview` e **la piattaforma la porta da sola ad `approved`**, da quel momento utilizzabile subito. Quando si modifica una class già approvata «you should keep setting this field to underReview». Il campo `review` contiene i commenti della piattaforma se la class è approvata o rifiutata.
- **[VERIFICATO]** Valori dell'enum ([ReviewStatus](https://developers.google.com/wallet/reference/rest/v1/ReviewStatus)): `REVIEW_STATUS_UNSPECIFIED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `DRAFT`. Gli alias in minuscolo (`underReview`, `rejected`…) sono deprecati.
- **[VERIFICATO]** Negli esempi ufficiali degli update `reviewStatus` deve essere `UNDER_REVIEW` o `DRAFT`.
- **[VERIFICATO]** Tra i test obbligatori: «The JWT … references a class that is approved» ([prelaunch-testing](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/prelaunch-testing)).
- **[DEDUZIONE]** Il commento in `wallet.service.ts:47` (`reviewStatus: "UNDER_REVIEW", // 'APPROVED' in produzione`) è **fuorviante**: secondo la reference si continua a inviare `UNDER_REVIEW` e `approved` lo mette Google. Da correggere quando si tocca quel file (non bloccante).

### 4.2 Dato sul campo (demo)

- **Verificato sul campo (2026-11-23)** con una GET di sola lettura (`GET /walletobjects/v1/loyaltyClass?issuerId=…`, service account del backend): le **11 class** dell'issuer demo hanno tutte `reviewStatus: "approved"` e **nessun campo `review`**. Le class create dal codice con `UNDER_REVIEW` risultano quindi approvate in automatico.
- L'API restituisce il valore **in minuscolo** (`approved`), mentre la reference documenta l'enum in maiuscolo. Chi confronta lo stato nel codice deve tenerne conto.
- Le class di prova restano nell'issuer: coerente con «le class non si cancellano in demo».
- Come si vede lo stato: via API REST (GET sulla class o list per issuer). **[NON TROVATO]** Che la console (scheda *Class management*) mostri `reviewStatus` o i commenti di rifiuto: le release notes citano solo le analytics per class.

### 4.3 Da rivedere in produzione

**Lo stato delle class va riverificato quando si passa in modalità pubblicazione.** Il dato del §4.2 vale solo per la demo e non prova che in produzione l'approvazione sia istantanea per ogni class. Dopo il passaggio:
1. rifare la GET/list e controllare `reviewStatus` e `review` di ogni class (anche delle class di prova, che potrebbero essere rivalutate);
2. controllare che una class **nuova** (un locale nuovo, con logo e nome reali) arrivi ad `approved` e in quanto tempo;
3. controllare cosa succede dopo la modifica di logo/colore di un locale (la class torna in revisione? la tessera resta usabile?).

### 4.4 Non trovato

- **[NON TROVATO]** Quanto dura la revisione di una class in produzione e quali sono i criteri di rifiuto (oltre alle linee guida del §6).
- **[NON TROVATO]** Il formato dell'oggetto `review` e come si ripresenta una class `REJECTED` (ipotesi non documentata: correggerla e rimandare `UNDER_REVIEW`).
- **[NON TROVATO]** Se la tessera resta usabile mentre una class modificata è in revisione.

### 4.5 Lacune nel codice (non modificato)

- Dopo la creazione della class non si legge `reviewStatus`: una class rifiutata darebbe al cliente un errore generico. Proposta per il backlog: GET dopo l'insert e log di `reviewStatus`/`review` (senza dati personali).

## 5. Test richiesti prima del lancio

Da [prelaunch-testing](https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/prelaunch-testing). **[VERIFICATO]** La pagina elenca i criteri con cui Google decide se le card sono «ready for public release». Prerequisito: almeno un object salvato su un telefono Android (già soddisfatto in demo).

### 5.1 Obbligatori e applicazione a Stampy

| Test della pagina | Caso Stampy |
|---|---|
| Bottone su Chrome, Firefox, Safari, Internet Explorer 9; vari zoom; render ≤ 1 s | Oggi non è il bottone ufficiale ma un `<a>` Bootstrap con testo «Aggiungi a Google Wallet» (`CustomerVisitView.vue:89`). Render immediato, ma l'asset non è quello di Google (vedi §6). |
| Se il bottone sparisce dopo il salvataggio, deve ricomparire rimuovendo il pass; deve apparire un testo che dice che la card è salvata | Il link di Stampy non sparisce mai: il test sembra **non applicabile** **[DEDUZIONE]** («if you have designed your website so that…»). |
| JWT con tutti i domini validi (`https` e `http`, non `www`) | `origins: [env.APP_ORIGIN]` (`wallet.service.ts`): un solo dominio. Da ricontrollare col dominio vero (decisione del §1). |
| Salva la card giusta | Class e object viaggiano nello stesso JWT (`loyaltyClasses` + `loyaltyObjects`). |
| Dopo il salvataggio il bottone non si può ripremere | Il link di Stampy si può ripremere: differenza di flusso da valutare. |
| JWT che referenzia una class `approved` | Coperto dal §4 (in demo tutte le class sono `approved`; da rivedere in produzione). |
| Bottone conforme alle linee guida (placement e design) | Serve l'asset ufficiale: §6. |

### 5.2 Non chiaro

- **[DEDUZIONE]** I test pensati per il bottone JavaScript (browser, zoom, tempo di render, `origins`) si applicano a Stampy solo in parte: il flusso è un link `https://pay.google.com/gp/v/save/<jwt>`, che la documentazione indica come via per web mobile e desktop. Non è scritto se la revisione tratti il link diversamente dal bottone ufficiale.
- **[DEDUZIONE]** La riga su Internet Explorer 9 è obsoleta; probabilmente non viene verificata, ma non c'è scritto.
- **[NON TROVATO]** Cosa succede se `origins` non coincide col sito: gli esempi ufficiali usano `www.example.com` e un codelab lascia l'array vuoto; nessuna pagina spiega la regola.
- **[NON TROVATO]** Chi esegue i test (Google o lo sviluppatore), in che forma si dichiarano e se una revisione umana li controlla uno per uno.
- **[NON TROVATO]** Cosa succede quando un test non passa (procedura di rifiuto, tempi di correzione).

### 5.3 Consigliati (non bloccanti)

- Saldo punti aggiornato **entro 24 ore** nella lista e nella vista espansa (Stampy aggiorna con una PATCH a ogni timbro).
- Messaggio aggiunto alla class visibile in cima ai messaggi.
- Tutti i campi del template compilati; immagini e stringhe conformi alle linee guida.
- Contatti validi; link al sito che apre la pagina giusta.
- Test a una cassa vera, con personale istruito. Il barcode **non** va mostrato se il locale non ha lettori: nel codice c'è sempre un QR, da ricordare.

### 5.4 Da fare quando si passa in produzione

1. Adottare l'asset ufficiale «Add to Google Wallet» (§6).
2. Ricontrollare `origins` col dominio definitivo.
3. Rifare i test sui browser realmente supportati dal flusso.

## 6. Linee guida del brand e dei contenuti

Da [brand-guidelines](https://developers.google.com/wallet/retail/loyalty-cards/resources/brand-guidelines) (ultimo aggiornamento: 2026-11-12) e [terms-of-service](https://developers.google.com/wallet/retail/loyalty-cards/resources/terms-of-service) (ultima modifica dei termini: 8 giugno 2022). Tutto **[VERIFICATO]** salvo dove indicato.

### 6.1 Bottone «Add to Google Wallet»

- Usare **solo gli asset forniti da Google** (XML Android, SVG, PNG), mai versioni disegnate da noi; non cambiare font, colore, raggio, padding; non ridimensionare liberamente (mantenere le proporzioni).
- Esiste solo nero; **primario** su sfondi bianchi e chiari, **condensed** se manca spazio. Stesso stile su tutto il sito.
- Altezza minima **48 dp**, spazio libero minimo **8 dp** su ogni lato; mai più piccolo degli altri bottoni della pagina.
- **Versione italiana disponibile**: va usata quella localizzata, mai testi propri.
- Il bottone deve chiamare uno dei flussi dell'API Wallet (il link `pay.google.com/gp/v/save/<jwt>` lo fa).
- Nei testi: «Google Wallet» con G e W maiuscole, mai abbreviato, nello stesso stile tipografico della UI. L'Italia non è tra i paesi con nome localizzato: resta «Google Wallet».
- Esiste anche il bottone **«View in Google Wallet»** (deep link a una tessera già salvata; SVG e PNG). Non è un obbligo.
- **Lacuna nel codice [DEDUZIONE]:** `CustomerVisitView.vue:89` usa un `<a>` Bootstrap con testo «Aggiungi a Google Wallet». La pagina dice «Don't: Create your own Add to Google Wallet buttons». Non è provato che blocchi l'approvazione, ma il test sul bottone è nell'elenco obbligatorio (§5). Da sostituire con l'asset ufficiale italiano.

### 6.2 Pass: colore, immagini, testi

- **Colore di sfondo:** evitare i colori ad alta saturazione (es. `#00FF00`, `#00FFFF`: affaticano la vista e il testo si confonde). Palette consigliata: `#1a1a1a`, `#677088`, `#e8eaed`, `#f8f9fa`, `#ffffff`, `#d6322d`, `#f78f48`, `#f9bb2d`, `#1e7e3b`, `#216acf`, `#9147df`, `#fce8e6`, `#e6fffa`, `#e8f0fe`. Senza `hexBackgroundColor` Google lo ricava dal logo.
- **Logo:** PNG, **min 660×660 px**, 1:1, mascherato in cerchio da Google (non pre-mascherarlo; **margine 15 %**). Logo largo opzionale: PNG trasparente 1280×400 (16:5), minimo 400 px di altezza.
- **Hero:** PNG, **1032×812 px** consigliati (≈5:4), nessun testo dentro l'immagine (non viene localizzato), 20 dp di margine sopra e sotto; evitare immagini rettangolari sottili. Immagini aggiuntive (`imageModulesData.mainImage`): min 1860 px di larghezza.
- Immagini personali sul pass **vietate** (FAQ): niente foto del cliente. Immagini su **HTTPS** raggiungibili in modo affidabile, senza redirect (FAQ).
- **Lunghezze consigliate (inglese; in italiano variano):** titolo < 47 caratteri, sottotitolo < 88, etichetta campo < 20, dato campo < 15; max 2 campi per riga, 3 righe. **Notifiche:** titolo < 29, corpo ridotto < 40, corpo esteso < 80. Sono raccomandazioni anti-troncamento. Titoli, etichette e nomi in *title case*.
- **Lacune nel codice [DEDUZIONE]:** `branding.schema.ts` controlla solo che `logoUrl` sia un URL e `backgroundColor` un esadecimale a 6 cifre: nessun controllo su formato/dimensioni dell'immagine né sulla saturazione (un locale potrebbe usare un neon).

### 6.3 Moduli

La tabella della pagina: un solo `imageModulesData`; fino a 2 `infoModuleData` (dati dell'utente, in vista estesa, una sola colonna); fino a 4 URI in `linksModuleData` (prefissi `http:` per siti e Maps, `tel:`, `mailto:`); fino a **2 `textModulesData` tra class e object**.

- **[CONTRADDITTORIO]** La frase introduttiva dice «must include», le righe dicono «use up to», e la reference (§3.2) non pone un limite tecnico a 2 (fino a 10 per object e per class). Va letta come *raccomandazione di design*; non è noto se pesi nella revisione.
- **[DEDUZIONE] Lacuna:** `wallet-pass-update.md` e il codice inviano **3** `textModulesData` per object (`reward_info`, `stamps_info`, `user_progress`). **Da rivalutare.**
- **[NON TROVATO]** Se `infoModuleData` sia un'alternativa adatta ai tre testi.
- **Link alla piattaforma:** la pagina chiede di inserire un link al sito/app nel `linksModuleData` di class o object. Stampy oggi non ne invia: lacuna da valutare, e dipende dal dominio (decisione del §1).

### 6.4 Contenuti e termini

- I contenuti dei campi e dei siti linkati devono rispettare le «Payments content policies». **[NON TROVATO]** Il loro testo: la pagina non è stata letta.
- Non usare l'API per attività illecite né contro l'[Acceptable Use Policy](https://payments.developers.google.com/terms/aup) (**[NON TROVATO]** il contenuto dell'AUP).
- Dati personali dell'utente ricevuti tramite l'API (es. «aggiunto/rimosso un pass»): da trattare **secondo la nostra privacy policy e la legge**; per i dati che inviamo noi dichiariamo di avere i diritti necessari. **[DEDUZIONE]** Serve una informativa privacy pubblicata prima del pilota.
- Dobbiamo tenere i pass **aggiornati e accettabili alla presentazione** e rispondere in fretta alle segnalazioni; **Google può sospendere** pass e/o l'accesso all'API finché l'esperienza non è a posto.
- **Aggregatori:** chi emette per conto di altri è **«solely responsible to Google for any content submitted»** e deve essere autorizzato dai terzi a usare logo e marchi. Stampy rientra nella definizione di aggregator della terminologia Google. **[DEDUZIONE]** I locali devono autorizzarci per iscritto a usare nome e logo, e il contratto coi gestori dovrebbe prevederlo (insieme alla nostra possibilità di rimuovere contenuti su richiesta di Google).

## 7. Renderlo accessibile a tutti (non solo agli account collegati)

### 7.1 Da «solo tester» a «tutti»

- **[VERIFICATO]** In demo possono ricevere pass solo Admin, Developer e account di test; per tutti gli altri serve il publishing access (§2). Demo e pubblicazione hanno le stesse funzioni: cambia solo chi può salvare ([blog Google, 2023](https://developers.googleblog.com/enable-fast-pass-development-with-google-wallet-demo-mode/)).
- **[VERIFICATO]** Dopo l'approvazione, chiunque abbia Google Wallet può salvare il pass dal link firmato; l'annotazione di test sparisce. Il codice di emissione (JWT RS256 con la chiave del service account) non cambia.
- **[DEDUZIONE]** Non abbiamo letto nessun altro percorso per l'accesso pubblico.

### 7.2 Chi può davvero salvare la tessera

- **iPhone: [NON TROVATO]** nessuna fonte letta conferma come si comporti il link su iPhone; le linee guida descrivono il flusso come salvataggio «sul telefono Android e sull'account Google». **[DEDUZIONE]** Il cliente iPhone non è coperto finché non c'è Apple Wallet (in `CONTEXT.md` come fase successiva); da trattare come non coperto fino a una prova con un iPhone.
- **Italia: [DOCUMENTATO, NON A FONDO]** la [pagina di Google Wallet Help](https://support.google.com/wallet/answer/12060037) elenca l'Italia tra i paesi dove il Wallet è disponibile, ma avverte che alcune funzioni possono non esserlo. **[NON TROVATO]** una lista per funzione dei pass fedeltà.
- **[NON TROVATO]** Cosa vede chi non ha l'app o l'account Google: da provare con un account che non sia un tester.

### 7.3 Carta e login con Google sono due cose separate

- **La carta** passa dall'API Wallet (issuer e chiave del service account) e non richiede che il cliente faccia login con Google.
- **Il login con Google** (Sign-In/OAuth) è un altro servizio e non dipende dal profilo pagamenti né dal publishing access. Il login attuale dei clienti è con codice via email: nulla di quanto sopra lo riguarda.
- I dettagli su OAuth (verifica non obbligatoria per gli scope di base, tetto di 100 utenti solo per scope sensibili/ristretti, verifica del brand per mostrare nome e logo) stanno in `google/google-sign-in-setup.md`, che non modifico. **Proposta al proprietario:** chiudere V4 («tetto utenti») in quel file con questi dati.

### 7.4 Issuer di sviluppo e di produzione separati

- **[VERIFICATO]** La FAQ cita come setup possibile «1 DEV credential and 1 PROD credential per business/issuer»: è un'opzione, non un obbligo.
- **[DEDUZIONE]** Class e object **non si cancellano**: se i test continuano sull'issuer di produzione, le tessere di prova restano nello stesso registro di quelle vere. Un issuer demo per sviluppo/test automatici e uno nuovo in produzione (decisione del §1) evita il problema.
- **[NON TROVATO]** Se un issuer si può passare a un altro account (§1).

### 7.5 Cosa non cambia dopo il publishing access

Limiti (20 req/s, 3 notifiche per pass in 24 h, lunghezze, §3.2) e comportamento delle API restano gli stessi. Cambiano solo chi può salvare e l'etichetta di test.

### 7.6 Prove da fare in produzione

1. Salvare la tessera con un account Google **non** tester.
2. Provare da un iPhone, se disponibile, e annotare cosa succede.
3. Verificare che l'etichetta «[TEST ONLY]» sia sparita.

## 8. Notifiche, scadenza e callback (collegamenti con altre voci)

Fonti: [trigger-push-notifications](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications), [expired-passes](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/expired-passes), [use-callbacks](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/use-callbacks-for-saves-and-deletions). Collegamenti: B14 e B22 (notifiche), B23 (disattivare il pass), B10 (`wallet_status`).

### 8.1 Notifiche push

- **Due modi [VERIFICATO]:** `addMessage` con `message_type: TEXT_AND_NOTIFY` (messaggio sul retro del pass + notifica; il Wallet mostra «View Message») e `PATCH` di alcuni campi (la pagina cita `rewardsTier` e `loyaltyPoints.balance`) con `notifyPreference = notifyOnUpdate` (il Wallet mostra «Review update»).
- **Regole [VERIFICATO]:** massimo **3 notifiche per pass in 24 h**, per messaggi e per aggiornamenti; oltre → `QuotaExceededException`; Google può ridurre la quota se ritiene che sia spam. L'utente deve avere le notifiche del Wallet abilitate. `notifyPreference` è un campo **transiente**: vale solo per la richiesta e va rimesso a ogni PATCH. Il testo sulla schermata di blocco lo controlla Google.
- **Link nei messaggi [VERIFICATO]:** solo siti o app **legati al pass**; altri link violano l'Acceptable Use Policy.
- **[DEDUZIONE]** La pagina dice che per gli aggiornamenti la notifica scatta solo se l'evento o il volo è tra 3 ore o meno: è una regola pensata per eventi e biglietti; non è chiaro come valga per le tessere fedeltà.
- **[CONTRADDITTORIO]** La [FAQ](https://developers.google.com/wallet/retail/loyalty-cards/resources/faq) dice «Developer authored push notifications are not currently supported by Google Wallet», mentre la pagina specifica le descrive. La pagina specifica è più dettagliata, ma **resta da provare su un issuer** (B14, B22).
- **Da provare su un issuer demo:** il valore esatto di `notifyPreference` nell'API REST (la pagina scrive `notifyOnUpdate`; il backlog elenca altre forme); la forma del body di `addMessage` e se l'`id` del messaggio deve essere univoco; se il tetto di 3 è condiviso tra messaggi e aggiornamenti. **[NON TROVATO]** il codice HTTP di `QuotaExceededException`.
- **Nota per Stampy:** ogni timbro fa già una PATCH del saldo; mandare `notifyOnUpdate` a ogni timbro supererebbe il tetto con più di 3 timbri al giorno per cliente. Per questo B14 prevede la notifica solo al premio, una volta per ciclo. Decisione del proprietario (B22): per ora non servono push.

### 8.2 Scadenza e disattivazione del pass (B23)

- **[VERIFICATO]** Un pass va in «Expired passes» se `object.state` è `EXPIRED`, `INACTIVE` o `COMPLETED`, oppure se passa `validTimeInterval.end` (fino a 24 h dopo). Esempio ufficiale: `PATCH` con `state: "EXPIRED"`. Risolve il punto «nome esatto del valore» di **B23**.
- **Da provare:** cosa vede il cliente e se il pass smette di essere usabile (la pagina dice solo che passa alla sezione dei pass scaduti); messaggio «Account eliminato» con `addMessage`. **[NON TROVATO]** cosa risponde il PATCH per un pass mai salvato dal cliente (il codice deve gestire un possibile `404`).
- Class e object non si cancellano: disattivare è l'unica strada.

### 8.3 Callback di salvataggio e cancellazione (B10)

È l'unica via ufficiale per sapere se il pass è davvero nel Wallet (oggi `wallet_status` diventa `active` al tocco sul bottone, e `removed` non viene mai impostato).

- **[VERIFICATO]** Google fa una `POST` a un tuo endpoint HTTPS **pubblico** a ogni aggiunta o cancellazione di un pass. L'endpoint si imposta **per class** via API (`callbackOptions`).
- **[VERIFICATO]** Il messaggio è firmato: Google consiglia la libreria **Tink** (`PaymentMethodTokenRecipient`, protocollo `ECv2SigningOnly`, `senderId` `GooglePayPasses`, `recipientId` = issuer ID, chiavi su `https://pay.google.com/gp/m/issuer/keys`). Campi: `classId`, `objectId`, `expTimeMillis` (dopo la scadenza il messaggio va considerato invalido), `eventType` (`save` o `del`), `nonce`.
- **[VERIFICATO]** La richiesta arriva con User-Agent `Googlebot` o `Google-Valuables` (controllare che lo contenga, non l'uguaglianza); `robots.txt` non deve bloccare Googlebot.
- **[VERIFICATO]** Consegna *best effort* con retry e backoff, non garantita; possibili **duplicati** (scartarli col `nonce`).
- **[NON TROVATO]** Una libreria Tink per Node (l'esempio ufficiale è in Java: da verificare); se `callbackOptions` funziona quando la class viaggia nel JWT come nel nostro codice o se serve una chiamata separata; se i callback funzionano in demo.
- **Conseguenze:** serve il dominio e l'hosting pubblico (P5, §1). Solo con i callback `removed` diventerebbe un valore affidabile.

### 8.4 Da provare su un issuer demo

1. Valore di `notifyPreference` e body di `addMessage` (B14, B22).
2. Effetto di `state: "EXPIRED"` sul telefono e risposta per un pass mai salvato (B23).
3. `callbackOptions` con class creata nel JWT e callback in demo (B10).

## 9. Passi concreti per Stampy

Tre blocchi, perché alcune cose si fanno adesso e altre dipendono da nome e dominio (decisione del §1).

### 9.A Si può fare adesso

1. Aprire la console → «Business Profile» e annotare i campi richiesti a un privato e, per il profilo pagamenti, i dati chiesti a un individuale italiano senza partita IVA (chiude i [NON TROVATO] del §2).
2. Provare su un issuer demo le voci del §8.4: `notifyPreference` e `addMessage` (B14, B22), `state: "EXPIRED"` (B23), `callbackOptions` e callback (B10).
3. Preparare le proposte di codice, **da concordare in TDD, non da fare ora**: bottone ufficiale italiano (§6.1); lettura di `reviewStatus`/`review` dopo la creazione della class (§4.5); correzione del commento in `wallet.service.ts:47`; controlli su logo e colore nello schema di branding (§6.2); `linksModuleData` verso la piattaforma (§6.3); numero di `textModulesData` (§6.3).
4. Proporre al proprietario la chiusura di V4 in `google/google-sign-in-setup.md` (§7.3), file che non modifico io.

### 9.B Dipende da nome e dominio

5. Scegliere il nome (rinomina del marchio) e registrare il dominio (P5): servono a Business Profile, callback, immagini HTTPS stabili e informativa privacy.
6. Creare un account Google con un indirizzo del dominio, poi un **nuovo issuer di produzione** e il Business Profile col nome pubblico definitivo (§1, §7.4). Tenere l'issuer attuale per sviluppo e test.
7. Pubblicare l'informativa privacy (§6.4) e inserire nel contratto con i locali l'autorizzazione scritta all'uso di nome e logo (clausola degli aggregatori, §6.4).
8. Ricontrollare `origins` del JWT col dominio definitivo (§5.4).

### 9.C Richiesta e dopo l'approvazione

9. Eseguire i test obbligatori del §5 sul pass reale e **tenere pronti degli screenshot** (la richiesta di screenshot è **[CONTRADDITTORIA]**, §2.1).
10. Richiedere il publishing access: **1–2 giorni lavorativi** secondo la console; **[NON TROVATO]** la durata della revisione del Business Profile. Finché non c'è risposta il pilota resta limitato agli account di test.
11. Dopo l'approvazione (§4.3, §7.6): rileggere `reviewStatus` di ogni class; salvare la tessera con un account Google non tester e, se possibile, da un iPhone; controllare che «[TEST ONLY]» sia sparito; annotare se la console ha chiesto una carta o un pagamento.

### 9.D Voci ancora aperte e dove verificarle

| Voce [NON TROVATO] | Dove si verifica |
|---|---|
| Dati chiesti per il profilo pagamenti di un individuale italiano; tax ID | Console (punto 1) |
| Durata della revisione del Business Profile e della class | Richiesta reale; supporto |
| Modifica del nome pubblico dopo l'approvazione; passaggio di un issuer a un altro account | Supporto |
| Costi e richiesta di carta in modalità pubblicazione | Punto 11; supporto |
| Aggiunta del tax ID a un profilo verificato (nuova verifica?) | Supporto |
| Valore di `notifyPreference`, `addMessage`, `EXPIRED`, callback | Prove su issuer demo (punto 2) |
| iPhone e disponibilità per funzione in Italia | Prova con un iPhone (punto 11) |

## Fonti

Su `developers.google.com/wallet/retail/loyalty-cards/`: `getting-started/issuer-onboarding`, `getting-started/onboarding-guide`, `test-and-go-live/request-publishing-access`, `test-and-go-live/launch-checklist`, `test-and-go-live/prelaunch-testing`, `resources/brand-guidelines`, `resources/faq`, `resources/terms-of-service`, `overview/how-classes-objects-work`, `use-cases/trigger-push-notifications`, `use-cases/expired-passes`, `use-cases/use-callbacks-for-saves-and-deletions`; reference `developers.google.com/wallet/reference/rest/v1/loyaltyclass` e `.../ReviewStatus`; release notes `developers.google.com/wallet/docs/release-notes`; blog [Enable fast pass development with Google Wallet demo mode](https://developers.googleblog.com/enable-fast-pass-development-with-google-wallet-demo-mode/) (3 feb 2023); `support.google.com/google-pay-and-wallet-console/answer/10877772` (Business Profile), `support.google.com/paymentscenter/answer/9028746` (profilo pagamenti), `support.google.com/wallet/answer/12060037` (paesi); più `support.google.com/pay-offline-merchants/answer/9232117` (solo per escluderlo). Dato sul campo del §4.2 e del §3.3: proprietario, 2026-11-23.
