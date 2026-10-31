> 🇮🇹 **Traduzione italiana di sola lettura** di `docs/google/wallet-card-customization.md`.
> La fonte di verità è la versione inglese: in caso di dubbio o differenza vince l'inglese.
> Nomi di campi, valori enum e codice restano in inglese perché sono letterali.

# Dare forma alle card fedeltà di Stampy con i campi di Google Wallet

**Una card fedeltà di Google Wallet si personalizza dividendo le impostazioni tra due risorse: la LoyaltyClass (una per programma di locale: branding, colori, layout, testi condivisi) e il LoyaltyObject (uno per card del cliente: numero di timbri, barcode, testi per persona).** I campi obbligatori sono solo cinque per la class (`id`, `issuerName`, `programName`, `programLogo`, `reviewStatus`) e tre per l'object (`id`, `classId`, `state`) ([LoyaltyClass](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyclass), [LoyaltyObject](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject)). Tutto il resto è rifinitura facoltativa. Il fatto di design più importante per una stamp card: non esiste un widget nativo "griglia di timbri", quindi il progresso va mostrato con `loyaltyPoints` (per esempio `3/10`), con i text module e/o con una `heroImage` per-object da sostituire a ogni timbro confermato (è un'inferenza, non un pattern ufficiale; va testata). I text e image module di class e object si mostrano insieme, non si sovrascrivono. I limiti visivi sono stretti (dati dei campi sotto i 15 caratteri, etichette sotto i 20), e la dimensione ufficiale dell'immagine hero è cambiata in 1032x812 px. Diversi documenti si contraddicono (precedenza di appLinkData, numero di text module, numero di righe della card, valore dell'enum notify); sono segnalati sotto come UNVERIFIED. Tutti i fatti sono stati letti il 2026-10-30 con uno strumento che riassume, quindi ricontrolla sulla pagina originale tutto ciò che è critico. Non sono inclusi segreti.

Fonti usate: class [LoyaltyClass](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyclass), object [LoyaltyObject](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject), [Guida ai template](https://developers.google.com/wallet/retail/loyalty-cards/resources/template), [ClassTemplateInfo](https://developers.google.com/wallet/reference/rest/v1/ClassTemplateInfo), [Linee guida del brand](https://developers.google.com/wallet/retail/loyalty-cards/resources/brand-guidelines), [Guida agli aggiornamenti](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/updates), [Push notification](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications), più i tipi di riferimento sotto `https://developers.google.com/wallet/reference/rest/v1/` (Barcode, BarcodeType, State, TextModuleData, Message, GroupingInfo, RotatingBarcode, PassConstraints, AppLinkData, CallbackOptions). Una fonte non ufficiale: [PassKit](https://help.passkit.com/en/articles/16195826-updating-your-pass-for-the-new-google-wallet-design) (indicata dove usata).

## Class contro object: chi possiede cosa

La **class è il template condiviso** e l'**object è l'istanza di un singolo cliente**, che punta alla class tramite `classId`. Aggiornare una class riguarda tutti i possessori; aggiornare un object riguarda solo quel possessore ([Guida agli aggiornamenti](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/updates)). Gli override non sono generali. I text module, i link module e i messaggi di class e object vengono mostrati insieme (si sommano). Gli image module ne mostrano al massimo uno per livello. L'eccezione è `heroImage`: se l'object non ne ha, si usa quella della class ([LoyaltyObject](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject)). Il layout (`classTemplateInfo`) esiste solo sulla class, quindi un locale ha un solo layout per tutte le sue card. Una class deve essere approvata prima di poter creare object; il `reviewStatus` della class può essere impostato a `draft` o `underReview`, mai di nuovo a `draft`, ed è la piattaforma a impostare `approved`. Quando si modifica una class già approvata, continuare a inviare `underReview` ([LoyaltyClass](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyclass)). UNVERIFIED: se modificare una class approvata scateni una nuova revisione che blocca gli object, e quali campi della class si propaghino agli object esistenti (la copia `classReference` restituita dalla GET suggerisce un'ereditarietà).

Due avvertenze sulla documentazione stessa. Primo, i limiti di default dei moduli sono in conflitto: le pagine di class e object dicono fino a 10 text module per livello, la guida ai template dice 20 + 20, e le linee guida del brand ne suggeriscono solo due in totale ([Guida ai template](https://developers.google.com/wallet/retail/loyalty-cards/resources/template), [Linee guida del brand](https://developers.google.com/wallet/retail/loyalty-cards/resources/brand-guidelines)). Pianificare 2-3 e considerare UNVERIFIED tutto ciò che sta sopra. Secondo, `appLinkData` è contraddittorio (vedi la tabella dei link).

## Riferimento dei campi per gruppo

### Identità e ciclo di vita

| Campo | Livello | Cos'è / come si usa | Cosa cambia sulla card | Esempio | Limiti |
|---|---|---|---|---|---|
| `id` | Class, Object | Id univoco `issuerID.identifier`. | Invisibile; usato da API e JWT. | `3388.cafe-roma-class` | Solo alfanumerici, `.`, `_`, `-`. Immutabilità non documentata (UNVERIFIED). |
| `classId` | Object (obbligatorio) | Collega l'object alla sua class. | Decide quale branding/layout la card eredita. | `3388.cafe-roma-class` | La class deve esistere, essere approvata e corrispondere al tipo. |
| `reviewStatus` | Class (obbligatorio) | Ciclo di revisione: `draft`, `underReview`, la piattaforma imposta `approved`. `review` contiene i commenti della piattaforma. | Le class draft non possono creare object. | `underReview` | Non può tornare a `draft`. Le maiuscole/minuscole differiscono tra il riferimento (`underReview`) e il codice di Stampy (`UNDER_REVIEW`); controllare quale accetta l'API (UNVERIFIED). |
| `state` | Object (obbligatorio) | `ACTIVE`, `COMPLETED`, `EXPIRED`, `INACTIVE`, `STATE_UNSPECIFIED`. | Gli object inattivi passano a "Pass scaduti". | `ACTIVE` | `EXPIRED` scatta automaticamente dopo `validTimeInterval`. |
| `validTimeInterval` | Object | Inizio/fine validità. | Lo stato diventa scaduto dopo la fine. | fine = 2027-12-31 | Si adatta alla *lazy expiry* di Stampy solo se tenuto sincronizzato (scelta di design, non un fatto della documentazione). |
| `issuerName` | Class (obbligatorio) | Nome del commerciante. `localizedIssuerName` per le traduzioni. | Testo di intestazione vicino al logo. | `Caffe Roma` | Consigliati 20 caratteri. |
| `programName` | Class (obbligatorio) | Nome del programma fedeltà. `localizedProgramName`. | Titolo della card, fisso (i template non possono spostarlo). | `Coffee Card` | Può essere troncato dopo 20 caratteri. Cambiarlo può far scattare un push (allowlist). |
| `countryCode` | Class | Paese per visualizzazione e localizzazione di ripiego. | Solo localizzazione. | `IT` | Nessuno indicato. |
| `accountId` / `accountName` | Object | Id e nome del socio. | Mostrati nei dettagli; etichettati dalle label della class qui sotto. | `A1B2` / `Mario R.` | Consigliati 20 caratteri ciascuno. Non mettere dati personali nei log. |
| `accountIdLabel` / `accountNameLabel` | Class | Didascalie dei due campi sopra. Varianti `localized...`. | Cambia il testo dell'etichetta. | `Member ID` | Consigliati 15 caratteri. |
| `groupingInfo` | Object | `groupingId` raggruppa visivamente i pass; `sortIndex` li ordina (più basso prima, non impostato = INT_MAX). | Più card di un cliente si impilano insieme. | `groupingId: "stampy"` | Parità di sortIndex non definita. |
| `multipleDevicesAndHoldersAllowedStatus` | Class | `MULTIPLE_HOLDERS`, `ONE_USER_ALL_DEVICES`, `ONE_USER_ONE_DEVICE` (ristretto, contattare il supporto), `STATUS_UNSPECIFIED`. | Se la stessa card può essere salvata da più persone/dispositivi. | `ONE_USER_ALL_DEVICES` | `allowMultipleUsersPerObject` è deprecato. |
| `hasUsers`, `hasLinkedDevice` | Object | Flag impostati dalla piattaforma. | Niente; segnali in sola lettura. | | Non da scrivere. |
| `classReference` | Object | La copia della class restituita dalla GET. | Niente. | | Solo GET. |
| `kind`, `version`, `wordMark`, `infoModuleData`, `locations[]` | Class | Deprecati. | Non usare. | | Usare `textModulesData` e `merchantLocations[]`. |

### Branding e immagini

| Campo | Livello | Cos'è / cosa cambia | Esempio | Limiti e specifiche |
|---|---|---|---|---|
| `programLogo` (obbligatorio) | Class | Logo quadrato; mostrato nelle viste dettagli e lista, mascherato a cerchio dal Wallet. | PNG del logo del locale | PNG, 1:1, minimo 660x660, non pre-mascherare, sfondo quadrato a pieno bordo, contenuto dentro l'area sicura 840x840 (margine del 15%) su una tela di 1000 px ([Linee guida del brand](https://developers.google.com/wallet/retail/loyalty-cards/resources/brand-guidelines)). |
| `wideProgramLogo` | Class | Se impostato, sostituisce `programLogo` (e su Android l'intestazione con il nome dell'issuer) in alto a sinistra nella vista card. | Wordmark | PNG trasparente, consigliato 1280x400 (16:5), altezza minima 400; chiaro su sfondi scuri, scuro su sfondi chiari. |
| `heroImage` | Class, Object | Banner sul fronte della card, mostrato al 100% della larghezza. L'object ricade sulla class. Se non c'è, il Wallet mostra un'immagine di categoria di ripiego. | Immagine con la griglia dei timbri | Guida ufficiale: PNG, 1032x812 px (circa 5:4), 20dp di margine sopra/sotto, nessun testo incorporato (non localizzato), niente rettangoli sottili. La specifica precedente era 1032x336 ([PassKit, non ufficiale](https://help.passkit.com/en/articles/16195826-updating-your-pass-for-the-new-google-wallet-design)); come i client vecchi ritaglino la nuova dimensione è UNVERIFIED. |
| `imageModulesData[]` | Class, Object | Immagini extra sotto la hero (`mainImage`); usabili anche negli slot del template. | Banner promozionale | Al massimo 1 mostrato per livello. PNG, largo, larghezza minima 1860 px, no quadrati. Immagini sopra il barcode: alte 80 px (una sola 1600x80, due affiancate larghe 80-780); sotto il barcode alte 80 px, larghe 80-1600. |
| `Image.sourceUri.uri` | tutte le immagini | L'URL dell'immagine. | `https://cdn.example.com/hero-3.png` | "Deve avere uno schema". Obbligo di HTTPS pubblico, dimensione massima del file, formati oltre PNG, cache e velocità di aggiornamento non sono indicati: UNVERIFIED. |

### Colori

| Campo | Livello | Cos'è / cosa cambia | Esempio | Limiti |
|---|---|---|---|---|
| `hexBackgroundColor` | Class | Sfondo della card, `#rrggbb` o `#rgb`. Se non impostato, il Wallet usa il colore dominante della hero, poi del logo. | `#1a1a1a` | Evitare neon molto saturi. Esempi di palette delle linee guida: #1a1a1a, #e8eaed, #d6322d, #216acf, #1e7e3b. Non documentato sull'object (solo a livello class). Nessuna regola numerica di contrasto né regola automatica del colore del testo trovata: UNVERIFIED. Comportamento in dark mode non trovato: UNVERIFIED. |

### Punti e livello (dove vive il progresso dei timbri)

| Campo | Livello | Cos'è / cosa cambia | Esempio | Limiti |
|---|---|---|---|---|
| `loyaltyPoints` | Object | Blocco punti principale: `label`, `balance` (esattamente uno tra `string`, `int`, `double`, `money`), `localizedLabel`. Mostrato in evidenza sulla card. | label `Stamps`, balance string `3/10` | Etichetta consigliata 9 caratteri, saldo 7. Usare `string` per "3/10" oppure `int` per 3. Cambiare `balance` è un aggiornamento in allowlist per i push. |
| `secondaryLoyaltyPoints` | Object | Un secondo blocco accanto al primo. | label `Rewards`, balance `1` | Stessi limiti. Anch'esso in allowlist per i push. |
| `rewardsTierLabel` / `rewardsTier` | Class | Didascalia e valore del livello. | `Level` / `Gold` | Consigliati 9 / 7 caratteri. Cambiare `rewardsTier` è in allowlist per i push. |
| `secondaryRewardsTierLabel` / `secondaryRewardsTier` | Class | Seconda coppia di livello. | | Nessun limite indicato. |

### Text module

| Campo | Livello | Cos'è / cosa cambia | Esempio | Limiti |
|---|---|---|---|---|
| `textModulesData[]` | Class, Object | Blocchi intestazione + corpo nei dettagli del pass; class e object si mostrano entrambi. | `{id:"rule", header:"How it works", body:"10 stamps = 1 free coffee"}` | Intestazione consigliata 35 caratteri, corpo 500 (più corpi vengono concatenati). `id`: alfanumerici, `_`, `-`; niente punti. Quantità: 10+10 (riferimento), 20+20 (guida template), 2 (linee guida brand): conflitto, UNVERIFIED. Esistono `localizedHeader/Body`. |
| `infoModuleData` | Class | Deprecato. | | Usare i text module. |

### Link, app e posizioni

| Campo | Livello | Cos'è / cosa cambia | Esempio | Limiti |
|---|---|---|---|---|
| `linksModuleData` | Class, Object | Link raggruppati (mappe, telefono, email, web); entrambi i livelli si mostrano. | Sito web, telefono | Guida ai template: illimitati. Schema (Uri) non letto: UNVERIFIED. |
| `homepageUri` | Class | Come un link alla homepage nel links module. | `https://cafe.example` | |
| `appLinkData` | Class, Object | Pulsante sul fronte della card verso un'app o un sito: `androidAppLinkInfo`, `webAppLinkInfo`, `displayText`. | "Ordina online" | Testo 30 caratteri. `iosAppLinkInfo` deprecato. CONFLITTO: la pagina della class dice che vince il livello object; la pagina dell'object dice che il valore dell'object non viene mostrato se la class lo definisce. UNVERIFIED quale sia giusto; definirlo su un solo livello. |
| `merchantLocations[]` | Class, Object | Luoghi che fanno scattare una notifica sulla schermata di blocco entro un raggio deciso da Google. | Coordinate del locale | Max 10 su class e su object. Sostituisce `locations[]` deprecato. |
| `discoverableProgram` | Class | Scoperta di iscrizione/accesso dentro l'app Google Pay (`merchantSignupInfo`, `merchantSigninInfo`, `state`: `TRUSTED_TESTERS`, `LIVE`, `DISABLED`). | | Non serve per l'MVP. |
| `valueAddedModuleData[]` | Class, Object | Moduli extra a valore aggiunto. | | Max 10 per ciascuno; schema non letto: UNVERIFIED. |
| `linkedOfferIds[]`, `linkedObjectIds[]` | Object | Collegamento ad altri object dello stesso issuer. | | Non si possono scollegare; l'eccesso viene ignorato in silenzio. |

### Barcode e sicurezza

| Campo | Livello | Cos'è / cosa cambia | Esempio | Limiti |
|---|---|---|---|---|
| `barcode` | Object | Codice mostrato sulla card: `type`, `value`, `alternateText`, `renderEncoding`, `showCodeText`. | `QR_CODE`, value = public code | Tipi: `AZTEC`, `CODE_39`, `CODE_128`, `CODABAR`, `DATA_MATRIX`, `EAN_8`, `EAN_13`, `ITF_14`, `PDF_417`, `QR_CODE`, `UPC_A`, `TEXT_ONLY`. `renderEncoding` `UTF_8` funziona solo con `QR_CODE`. `alternateText` non ammesso con `TEXT_ONLY`. Nessuna indicazione ufficiale su "quale tipo quando": UNVERIFIED oltre questi fatti. |
| `rotatingBarcode` | Object | Barcode che cambia nel tempo tramite TOTP. | | Solo `QR_CODE` e `PDF_417`. Probabilmente eccessivo per l'MVP (opinione). |
| `viewUnlockRequirement` | Class | `UNLOCK_NOT_REQUIRED` (default) o `UNLOCK_REQUIRED_TO_VIEW`. | | Richiede un blocco del dispositivo. |
| `securityAnimation` | Class | Animazione `FOIL_SHIMMER` nei dettagli per mostrare che il pass è attivo. | | |
| `passConstraints` | Object | `screenshotEligibility` (`ELIGIBLE` default, `INELIGIBLE` blocca su Android), `nfcConstraint[]`. | | Versioni vecchie del Wallet possono ancora permettere gli screenshot. |
| `saveRestrictions` | Object | Condizioni controllate solo al momento del salvataggio. | | Schema non letto: UNVERIFIED. |
| `multipleDevicesAndHoldersAllowedStatus` | Class | Vedi la tabella identità. | | |
| `enableSmartTap`, `redemptionIssuers[]`, `smartTapRedemptionValue` | Class / Object | Riscatto NFC da terminali partner. | | Servono chiavi Smart Tap; solo ASCII. Stampy non ne ha bisogno (la conferma la fa lo staff in una web app). |
| `callbackOptions` | Class | URL HTTPS che Google chiama a ogni salvataggio o cancellazione dell'utente. | `https://api.example/wallet/cb` | Il robots.txt deve consentire Googlebot; consegna best-effort con possibili duplicati (pagine sulle callback lette tramite riassunto di ricerca: UNVERIFIED). |

### Template di layout (classTemplateInfo, solo a livello class)

| Parte | Cosa controlla | Come si usa | Limiti |
|---|---|---|---|
| `cardTemplateOverride.cardRowTemplateInfos[]` | Righe sul fronte della card sotto il titolo fisso. | Ogni riga è `oneItem`, `twoItems` o `threeItems`; ogni elemento sceglie un campo con `firstValue.fields[].fieldPath` (un `secondValue` facoltativo mostra "A / B"). | Righe: il riferimento dice al massimo 3, la guida ai template dice almeno 1 e consigliate al massimo 2 (conflitto). Le linee guida del brand dicono max due campi per riga, fino a tre righe. La hero va dopo la prima riga se ci sono più righe, sopra se ce n'è una sola. |
| `cardBarcodeSectionDetails` | Elementi attorno al barcode. | `firstTopDetail`, `secondTopDetail` (affiancati sopra), `firstBottomDetail`; testo o immagine. | |
| `detailsTemplateOverride.detailsItemInfos[]` | Elementi ordinati nella sezione dettagli. | Le immagini sono a tutta larghezza, senza etichetta. | |
| `listTemplateOverride` | Lista dei pass (home del Wallet). | `firstRowOption`, `secondRowOption` (nascoste quando il pass è in un gruppo); la terza riga è deprecata. Senza etichette. | |
| sintassi `fieldPath` | Quali dati riempiono uno slot. | Prefisso `object.` o `class.`; richiamare i moduli per `id`, ad es. `class.textModulesData['rule']` (preferito) o per indice. Vince il primo campo non vuoto; non mescolare i tipi; usare un segnaposto come `-` per mostrare sempre. | `object.loyaltyPoints.balance.int` come percorso è UNVERIFIED (non nelle pagine lette); confermare nell'elenco dei campi del template. Limiti di caratteri per elemento non documentati. |
| Comportamento | | Elemento vuoto nascosto; riga tutta vuota nascosta; riga parzialmente vuota riorganizzata. Le etichette sono fornite da Google, alcune sovrascrivibili con `class.custom<Name>Label` più le traduzioni. | |

Esempio dalla guida ai template (composto per analogia, percorso UNVERIFIED):
`{"classTemplateInfo":{"cardTemplateOverride":{"cardRowTemplateInfos":[{"twoItems":{"startItem":{"firstValue":{"fields":[{"fieldPath":"object.loyaltyPoints.balance.int"}]}},"endItem":{"firstValue":{"fields":[{"fieldPath":"class.textModulesData['rule']"}]}}}}]}}}`

### Messaggi, notifiche e aggiornamenti

| Campo / chiamata | Livello | Cosa fa | Limiti |
|---|---|---|---|
| `messages[]` | Class, Object | Messaggi conservati sul retro del pass. `header`, `body`, `displayInterval`, `id`, `messageType` (`TEXT` default, `TEXT_AND_NOTIFY`, `EXPIRATION_NOTIFICATION` non supportato). | Max 10 (riferimento); la guida ai template dice 20+20. Nessun limite di caratteri indicato; titolo della notifica sotto 29, corpo ridotto sotto 40, esteso sotto 80 secondo le linee guida del brand. |
| `addMessage` | Chiamata sull'object | POST `.../loyaltyObject/{id}/addMessage`; con `TEXT_AND_NOTIFY` invia anche un push. | Al massimo 3 messaggi o aggiornamenti che fanno scattare un push ogni 24 ore (per pass secondo il riassunto); superarlo dà `QuotaExceededException`; l'utente deve avere le notifiche attive ([Guida push](https://developers.google.com/wallet/retail/loyalty-cards/use-cases/trigger-push-notifications)). |
| `notifyPreference` | Class, Object | Effimero: va inviato a ogni PATCH/UPDATE; notifica solo se è cambiato un campo in allowlist. | Allowlist: `loyaltyPoints.balance`, `secondaryLoyaltyPoints.balance` (object); `rewardsTier`, `secondaryRewardsTier`, `programName` (class). Conflitto sul valore: la guida dice `notifyOnUpdate`, il riferimento dice `NOTIFY` (enum `NotificationSettingsForUpdates`); testare quale accetta l'API (UNVERIFIED). |
| PATCH / PUT object | Object | `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{id}`, scope `https://www.googleapis.com/auth/wallet_object.issuer`, service account con accesso "Developer" ([patch](https://developers.google.com/wallet/retail/loyalty-cards/rest/v1/loyaltyobject/patch), [auth](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/auth/rest)). | Semantica di merge su array e campi annidati non documentata: inviare ogni volta l'intero array `textModulesData`, tenendo coerenti testo di progresso e `loyaltyPoints.balance`. Se PUT richieda l'oggetto completo: UNVERIFIED. Latenza di propagazione dell'aggiornamento: non trovata. |
| `disableExpirationNotification` | Object | Al momento impostabile solo per le offerte. | Non applicabile alla fedeltà. |

## Indicazioni di design visivo e il problema di mostrare i timbri

Le linee guida del brand preferiscono una hero circa quadrata, quindi una griglia di timbri progettata come **PNG 1032x812 px** con **20dp di margine sopra e sotto** si adatta al layout attuale. Le linee guida vietano il testo incorporato nella hero perché non è localizzato, il che è in conflitto con il disegnare numeri in un'immagine di timbri; i numeri vanno tenuti in `loyaltyPoints` e nei text module. Il logo dovrebbe essere un quadrato a pieno bordo di almeno 660x660 con il contenuto dentro l'area centrale 840/1000 (inferenza: circa 560 px per un'immagine da 660 px), in linea con la voce sul logo quadrato già nel backlog di Stampy. Mantenere il colore di sfondo come un colore di brand scelto di proposito invece di affidarsi all'estrazione automatica, evitare i neon, e scegliere uno sfondo della hero che si fonda con `hexBackgroundColor` per evitare giunture visibili (opinione). Gli asset del pulsante "Aggiungi a Google Wallet" devono essere quelli ufficiali di Google, alti almeno 48dp con 8dp di spazio libero.

Per il progresso, l'API supporta questo schema: pre-renderizzare N+1 PNG hero (da 0 a N timbri) a URL HTTPS stabili, e fare PATCH di `heroImage.sourceUri` dell'object a ogni timbro confermato insieme a `loyaltyPoints` e al testo di progresso. È un'inferenza; non è stato trovato nessun esempio ufficiale di stamp card. Da testare su un object demo: con che velocità i client aggiornano un'immagine cambiata, se l'URL debba cambiare per aggirare la cache, e come i client ritagliano la hero. I limiti della modalità demo (solo utenti di test) e i criteri di revisione del branding non si sono potuti recuperare perché le pagine hanno dato 404 ([onboarding issuer](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/issuer-onboarding) letto tramite riassunto): UNVERIFIED.

## Configurazione suggerita per le stamp card di Stampy

Il backend attuale invia class e object in un JWT di salvataggio nel Wallet e usa già `QR_CODE` con il public code, `loyaltyPoints` con label `Timbri` e balance `int`, e i text module `reward_info`, `stamps_info`, `user_progress` (nota: lì la class usa `UNDER_REVIEW`; verificare le maiuscole). Il suggerimento qui sotto parte da questo e resta entro i limiti documentati.

| Gruppo | Valore suggerito | Motivo |
|---|---|---|
| Identità della class | `issuerName` = nome del locale (max 20), `programName` = nome breve del programma (max 20), `countryCode` = `IT` | Evitare troncamenti. |
| Branding della class | `programLogo` PNG quadrato 660x660+; `wideProgramLogo` 1280x400 facoltativo solo se il locale ha un buon wordmark; `heroImage` 1032x812 predefinita "0 timbri" | Conforme alle linee guida del brand. |
| Colore della class | `hexBackgroundColor` esplicito, non neon, abbinato alla hero | Non affidarsi al colore dominante. |
| Punti dell'object | `loyaltyPoints` = label `Stamps` (o l'italiano `Timbri`, 6 caratteri), balance string `3/10` (4 caratteri) | Entro 9/7 caratteri; progresso a colpo d'occhio. Passare da `int` a `string` è una modifica al codice da decidere. |
| Secondario dell'object | `secondaryLoyaltyPoints` = `Rewards` con il numero di premi disponibili | Card piena = premio disponibile. |
| Hero dell'object | `heroImage` per-object facoltativa per il conteggio N, aggiornata con PATCH dopo ogni timbro confermato | Progresso visivo; da testare (UNVERIFIED). |
| Text module | Class: `rule` ("10 stamps = 1 free coffee", intestazione sotto 35 caratteri). Object: `user_progress`. Al massimo 3 in totale | Le linee guida del brand dicono 2; i limiti sono in conflitto. |
| Link | Sito/telefono/mappe del locale in `linksModuleData`; saltare `appLinkData` (Stampy non ha un'app e la precedenza è contraddittoria) | Evita il conflitto. |
| Barcode | `QR_CODE`, `value` = public code, niente `rotatingBarcode`, niente Smart Tap | Semplice; lo staff scansiona o conferma nella web app. |
| Layout | `cardTemplateOverride` facoltativo con una riga `twoItems`: saldo timbri e regola; tenere le righe a 2 o meno | Entro la raccomandazione più severa del template; percorso del campo UNVERIFIED. |
| Notifiche | `notifyPreference` solo al raggiungimento del premio; aggiornamenti normali per gli altri timbri; messaggi `TEXT` di default | Il limite è 3 eventi che fanno scattare un push ogni 24 ore. |
| Stato | `ACTIVE`; impostare `INACTIVE` o scaduto quando la card finisce | Sposta il pass in "Pass scaduti". |
| Sicurezza | `UNLOCK_NOT_REQUIRED`; facoltativamente `screenshotEligibility: INELIGIBLE` | Una stamp card è a basso rischio; gli screenshot di un QR sono bloccabili solo su Android. |
| Callback | Impostare `callbackOptions.url` per sapere di salvataggi/cancellazioni (HTTPS, handler idempotente, verifica della firma) | L'unico segnale documentato che un utente ha aggiunto o rimosso il pass. |

## Conclusione

Il vincolo reale non è il numero di campi ma la mancanza di una primitiva specifica per i timbri: Google offre uno slot visivo (la hero) e slot di testo brevi (9 e 7 caratteri per i punti), quindi una buona card di Stampy è una composizione disciplinata di un'immagine hero sostituita, un saldo compatto `3/10` e un testo con la regola, con il branding a livello class impostato una sola volta per locale. La documentazione si contraddice anche su diversi limiti, il che rende un giro di test su un object demo (numero di moduli, numero di righe, valore di `notifyPreference`, comportamento della PATCH sugli array, aggiornamento e ritaglio della hero, precedenza di `appLinkData`) un prerequisito economico prima di costruire l'interfaccia attorno a uno qualsiasi di essi.

Non verificato e da controllare prima dell'implementazione: schemi di Image, LinksModuleData/Uri, ImageModuleData, MerchantLocation, SaveRestrictions, ValueAddedModuleData e Review; regole della modalità demo e di revisione del branding; comportamento in dark mode e nel troncamento; requisiti di hosting delle immagini; quote delle richieste e codici di errore. Data di lettura di tutti i risultati: 2026-10-30.
