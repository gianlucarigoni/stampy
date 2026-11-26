# 10 · Critica sezione Accesso

Chat 5, 2026-11-25. Sezione: `screens/accesso/anonimo/` (31 stati × chiaro/scuro, telefono 390×844 @2x).
Nessun codice dell'app modificato. Proposte = **da decidere da te**, con alternative dove ha senso.

## Come ho lavorato e cosa è affidabile

- **Fogli di contatto**: `screens/_sheets/accesso/sheet-01…11.png` (3 stati × chiaro/scuro), generati da `scripts/make-sheets.mjs` (Playwright del frontend, nessuna dipendenza nuova). Visti tutti tranne `sheet-11` (`session-error__default`, uguale ai due stati vicini senza anello). PNG originali aperti: solo `login__input-email-focus__light` (dettaglio del focus).
- **Contrasti**: calcolati da `scripts/contrasts.mjs` (formula WCAG 2.x) con i valori reali di `stampy.scss` + Bootstrap 5.3 (`tint/shade-color` letti da `node_modules/bootstrap/scss/_variables*.scss`). Non sono misurati sui pixel: lo scostamento atteso è ±0,05.
- **Skill**: `design-critique`, `accessibility-review`, `ux-copy` **non sono nell'elenco skill** di questa sessione. Ne ho applicato i criteri a mano (WCAG 2.2 AA, euristiche di Nielsen, regole di copy dei messaggi d'errore). Le skill di generazione UI non sono state usate.
- Etichette: **[F]** fatto osservato (PNG o codice) · **[I]** ipotesi · **[V]** da validare con utenti/dispositivi reali.

### Attenzione: tre limiti delle catture
1. **Widget Vue DevTools** (pillola con «V» e mirino) in basso al centro di **ogni** PNG [F]: `vite.config.ts` carica `vueDevTools()`. Non è UI dell'app; da ignorare e da spegnere nelle prossime catture.
2. **Font**: la pagina usa lo stack di sistema di Bootstrap; nelle catture è DejaVu Sans (container Linux). Su telefono reale sarà SF/Roboto: larghezze di riga e pesi **non sono quelli finali** [F/V].
3. Gli stati 429/errore sono simulati (`02-capture-accesso.md`): i testi sono quelli veri, il timer no.

## Token reali usati (da `stampy.scss`)

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Sfondo pagina = sfondo card | `#fff` | `#171310` (caldo) |
| Testo | `#212529` | `#dee2e6` |
| Arancione brand / `btn-primary` | `#f16417` | `#f16417` |
| Link / `btn-link` | `#f16417` (= primary, nessun override chiaro) | `#f4813f` |
| Bordo input | `#dee2e6` | `#495057` |
| Bordo card | `rgba(0,0,0,.175)` ≈ `#d2d2d2` | `rgba(255,255,255,.15)` ≈ `#3a3634` |
| Input disabilitato | `#e9ecef` (grigio freddo) | `#221c18` |

`$min-contrast-ratio: 3` è stato abbassato apposta (commento in `stampy.scss:3-6`) perché il bianco su arancione fa 3,19: **è una scelta consapevole, non una svista**. La critica sotto la rimette in discussione con i numeri; la decisione è tua.

## Contrasti calcolati (soglie WCAG: testo 4,5 · testo grande ≥18,66 px bold o ≥24 px: 3 · componenti UI/focus 3)

| Coppia | Chiaro | Scuro | Esito |
|---|---|---|---|
| Testo corpo / sfondo | 15,43 | 14,18 | ✅ |
| `text-body-secondary` (sottotitolo) | 6,73 | 8,31 | ✅ |
| **Bianco su `btn-primary` `#f16417`** (16 px, 600) | **3,19** | **3,19** | ❌ AA (serve 4,5) |
| Link/`btn-link` arancione su sfondo | **3,19** | 7,09 | ❌ chiaro · ✅ scuro |
| Wordmark «Stampy» (22 px, 800 = testo grande) | 3,19 | 5,78 | ✅ (soglia 3) |
| **Bottone primario disabilitato** (testo su fondo, opacity .65) | **2,16** | **2,63** | ⚠ (i disabilitati sono esenti, ma è lo stato iniziale) |
| Link disabilitato su sfondo | 2,16 | 3,68 | ⚠ idem |
| Alert danger / warning / success (testo su fondo) | 10,22 / 7,21 / 10,35 | 7,15 / 10,82 / 7,67 | ✅ |
| **Bordo input** su sfondo (soglia UI 3) | **1,30** | **2,26** | ❌ WCAG 1.4.11 |
| Bordo card su sfondo | 1,51 | 1,55 | ⚠ la card si distingue poco |
| Fondo alert su sfondo pagina | 1,11–1,34 | 1,02–1,26 | (decorativo: il testo regge, ma l'alert non si "vede" senza il suo bordo) |
| **Alone di focus** dei campi (bordo `tint 50%` `#f8b28b`) | **1,79** | n/c | ❌ debole |
| Bianco su `btn-primary` hover/focus (`shade 15%` `#cd5514`) | 4,28 | 4,28 | ⚠ |
| Bianco su pressed `#c2410c` (già nel CSS di `.filter-reset`) | 5,18 | 5,18 | ✅ |
| Input disabilitato, testo su fondo | 4,54 | 6,20 | ✅ al limite |

Candidati (calcolati) per decidere: bianco su `#c2410c` **5,18** · su `#d15010` 4,32 · su `#d9540e` 4,02 · **testo scuro `#171310` su `#f16417` = 5,78 in entrambi i temi**. Bordo campo `#868e96` su bianco 3,32; `#7b8087` su `#171310` 4,64.

---

## Per schermata e stato

Priorità: **A** alta · **M** media · **B** bassa. Le sigle (`L-…`, `C-…`, `X-…`) sono riprese nei capitoli trasversali e nella Top 10.

### 1. Login email — `/login`

**Da mantenere** (tutti [F])
- Struttura minima: un titolo, una riga di spiegazione, **un campo, un bottone**, poi l'alternativa. Nessuna distrazione (`login__email-vuoto__*`).
- «Niente password.» nel sottotitolo: dice subito il modello mentale giusto (`login__email-vuoto__light`).
- Etichetta **visibile** sopra il campo (non solo placeholder), bottone `w-100` da 48 px, campo da 48 px con testo 17 px (niente zoom iOS): target e leggibilità corretti.
- Tastiera giusta: `type=email`, `inputmode=email`, `autocapitalize=none`, `autocomplete=email` (`EmailLogin.vue:190-203`).
- Il bottone Google «finto» eredita superficie e bordo del campo e segue il tema: sembra del sistema (`login__bottone-google-default__*`).
- Il tema scuro è caldo (`#171310`) e coerente col brand; alert leggibili in entrambi i temi (7–10:1).
- Il bottone disabilita durante l'invio e cambia testo «Invio…» (`login__invio-in-corso__*`), anche con `waiting`.

| Stato (file) | Difetti osservati | Proposte | Pri |
|---|---|---|---|
| **Vuoto / default** (`login__email-vuoto__light/dark`) | **L-1** Il bottone primario è **disabilitato al primo sguardo** (2,16:1 chiaro, 2,63:1 scuro): l'unica azione della pagina sembra spenta. [F] Chi non sa che serve compilare il campo può pensare che la pagina non risponda. [I] | **A)** bottone sempre abilitato a piena saturazione; se il campo è vuoto o non valido, al tap si mette il focus sul campo e si mostra l'errore (la validazione nativa `required`/`type=email` già lo fa). **B)** tenerlo disabilitato ma con aspetto «neutro» (grigio pieno), non arancione sbiadito. **C)** lasciare com'è. Consiglio A. | A |
| | **L-2** Bianco su arancione 3,19:1 su **tutti** i bottoni primari. [F] | Vedi «Colore» più sotto: 3 alternative (fondo più scuro / testo scuro / solo testo grande). | A |
| | **L-3** Titolo «Accedi» (`h4`, peso 500, ~24 px) **più leggero** dell'etichetta «Email» (600) e del wordmark (800): la gerarchia è rovesciata. [F] (`login__input-email-focus__light`) | Titolo a peso 700 o 650 e/o dimensione maggiore (es. 28 px); etichette a 600 restano. | M |
| | **L-4** Pagina generica: il cliente che arriva dal tag NFC di un locale vede solo «Stampy» senza il nome del locale né il perché del login. [F] | **Idea [I]**: una riga «Per ritirare il tuo timbro da **<locale>**» richiede un endpoint pubblico per il nome del locale (oggi `next=/v/<id>` è solo un UUID): **fuori dal perimetro di sola UI, da decidere**. Senza backend: «Entra per ritirare il tuo timbro». | M |
| | **L-5** Contenuto in alto, ~45% della pagina vuota; il bottone è a ~310 px dal bordo alto, quello Google a ~415 px: zona del pollice media, non bassa. [F] | Non sposterei nulla: con la tastiera aperta (~300 px su 844) il campo e il bottone restano **sopra** la tastiera, che è il caso peggiore. Si può **solo** centrare/ammorbidire verticalmente su schermi grandi (vedi Responsive). | B |
| **Focus campo** (`login__input-email-focus__*`) | **L-6** Il focus del campo è l'alone pesca di Bootstrap, contrasto **1,79:1**; l'anello arancione da 3 px definito in `stampy.scss:138` **non si vede** perché Bootstrap mette `outline:0` su `.form-control:focus`. [F] (PNG a piena risoluzione) | Definire un anello unico e alto contrasto (≥3:1 col fondo, 2–3 px, **con scostamento**) anche su `.form-control`, `.btn`, `.btn-link`. | A |
| **Email compilata / bottone default** (`login__email-compilata`, `login__bottone-invia-default`) | Nessuno bloccante: il bottone prende colore pieno. Nota: tra vuoto e compilato il bottone cambia di saturazione molto: è l'unico feedback di «pronto». | — | — |
| **Bottone focus / pressed** (`login__bottone-invia-focus`, `…-pressed`) | **L-7** Focus e pressed sono **quasi identici** (fondo scuro `#cd5514` + alone pesca): da tastiera non si distingue «a fuoco» da «premuto». [F] Il pressed non ha alcun feedback tattile oltre al colore. | Focus = anello esterno nitido; pressed = fondo più scuro (`#c2410c`, già usato altrove) senza anello. | M |
| **Invio in corso** (`login__invio-in-corso__*`) | «Invio…» sul bottone già sbiadito: nessuna differenza visiva tra «disabilitato perché vuoto» e «sto lavorando». [F] Nessuno spinner (confermato da `01b`). | Piccolo indicatore (spinner/puntini) nel bottone, oppure testo + `aria-busy`. | M |
| **Errore email non valida** (`login__errore-email-non-valida__*`) | **L-8** Il campo **non cambia aspetto** (solo `aria-invalid`, nessuna classe `is-invalid`) e l'alert sta **tra il campo e il bottone**: sposta il bottone di ~55 px verso il basso (da y≈257 a y≈312 nel foglio). [F] `DisplayNameForm` usa invece `is-invalid`: **incoerenza interna**. Rischio di tap sbagliato sul bottone che si sposta [I]. | Messaggio **sotto il campo**, bordo/ombra rossa nel campo (`is-invalid`) + icona; spazio riservato o animazione-zero per non spostare il bottone. Alternativa: tenere l'alert ma **in cima alla card**. | A |
| | Testo «Email non valida»: laconico, non dice come correggere (vedi Copy). | «Controlla l'indirizzo: manca la @ o il dominio.» | M |
| **Errore generico** (`login__errore-generico__*`) | Stesso alert in cima al bottone; il testo «Connessione non riuscita, riprova» è chiaro. Nessun «Riprova» dedicato, ma il bottone sotto lo è già. | Nulla di strutturale. | B |
| **Attesa 429** (`login__attesa-429__*`) | **L-9** Alert giallo «Riprova tra 3 min» + bottone disabilitato (2,16:1): **non dice perché** (troppi invii) e il numero cambia con arrotondamento per eccesso (125 s → «3 min»). [F] | Dire la ragione in una frase; mostrare il tempo **nel bottone** («Riprova tra 2 min»), così la causa e l'azione stanno nello stesso punto. | M |
| **Account eliminato** (`login__account-eliminato__*`) | Pregio: conferma chiara e rassicurante («Puoi sempre rientrare con la tua email.»). Difetto minore: l'alert verde sta **sopra** il campo, il titolo «Accedi» resta; funziona. | Mantenere. | — |
| **Bottone Google** (`login__bottone-google-default/focus`) | **L-10** Nel PNG `bottone-google-focus` **nessun elemento ha un anello visibile** (il bottone «Invia» appare a riposo, il Google senza anello): il focus da tastiera sul Google non è percepibile. [F] Il `:focus-within` del CSS potrebbe non scattare per l'iframe cross-origin [I/V]. | Verificare a mano con Tab su un dispositivo; se confermato, serve un indicatore che non dipenda dall'iframe (non sono sicuro che sia risolvibile senza un `focus` sul contenitore). | M |
| | **L-11** Google è **sotto** l'email, dopo «oppure»: per chi ha già l'account Google è il percorso più corto (nessun passaggio alla posta). [I/V] | Decisione di prodotto: Google come azione primaria o pari grado? (Domanda D2.) Il bottone finto non è quello standard di Google: **da verificare sulle linee guida di branding di Google**, non l'ho fatto. | M |

### 2. Login codice — `/login` (stato `challengeId`)

**Da mantenere** [F]
- Passaggio dall'email al codice **immediato**, con focus automatico sul campo (`codice__vuoto__*`).
- Campo **unico** da 6 cifre, `autocomplete=one-time-code`, `inputmode=numeric`: supporta l'autofill iOS/Android; **invio automatico** al 6° numero (`EmailLogin.vue:166-173`). Non spezzare in 6 caselle: romperebbe incolla e autofill.
- Cifre grandi (28 px), spaziate, tabulari (`codice__input-codice-compilato-parziale__*`).
- Stato conservato al reload (`tabStorage`): chi esce a leggere la posta non perde il passaggio.
- Messaggi d'errore **specifici e con il conteggio** («Ti restano 4 tentativi», «Ti resta 1 tentativo»), con il singolare corretto (`codice__errore-ultimo-tentativo__*`).
- Quando il codice è morto: campo disabilitato e **«Invia un nuovo codice» diventa primario** (`codice__tentativi-finiti__*`): l'intenzione è giusta.

| Stato (file) | Difetti osservati | Proposte | Pri |
|---|---|---|---|
| **Vuoto** (`codice__vuoto__*`) | **C-1** «Accedi» disabilitato (stessa questione di L-1) e **ridondante**, perché il codice si invia da solo al 6° carattere: in pratica non verrà mai premuto. [F] | Lasciarlo (è la via d'uscita per chi usa lo screen reader/Invio), ma non disabilitato-sbiadito; oppure nasconderlo con testo «Si invia da solo all'ultima cifra». | M |
| | **C-2** «Abbiamo scritto a **email**. Il codice vale 5 minuti.»: il grassetto dell'email spezza il paragrafo su 3 righe ed email lunghe non hanno punti di a-capo (`strong` senza `text-break`). [F su riga; I su overflow] | `text-break` sull'email; frase su due blocchi (riga 1: «Controlla la tua email»; riga 2: indirizzo). **[V]** con email di 40+ caratteri. | M |
| | **C-3** Mancano gli aiuti di recupero **vicino al campo**: spam, errore di battitura, tempo di arrivo. [I] | Riga piccola «Non arriva? Controlla anche lo spam o riprova tra poco.» | M |
| | Link «Invia un nuovo codice» / «Cambia email»: testo arancione su bianco **3,19:1** nel tema chiaro (14–16 px, sottolineato). [F] | Vedi Colore. Il sottolineato aiuta ma non compensa. | A |
| **Parziale (3 cifre)** (`codice__input-codice-compilato-parziale__*`) | Pregio: cifre ben centrate. Nota: `letter-spacing: .3em` aggiunge spazio **dopo l'ultima cifra**, quindi il gruppo risulta spostato a sinistra di ~0,15 em. [F lieve] | Compensare con `padding-left` pari allo spazio. | B |
| **Errore codice / ultimo tentativo / invalido** (`codice__errore-codice-non-valido__*`, `codice__errore-ultimo-tentativo__*`, `codice__input-codice-invalido__*`) | **C-4** Come L-8: campo **senza stato invalido**, alert in mezzo che sposta «Accedi» e i link. Il codice viene **svuotato** (`code.value=''`) senza evidenziare perché. [F] | Messaggio sotto il campo + bordo rosso; mantenere lo svuotamento ma segnalarlo («Riscrivi il codice»). | A |
| | «Ti resta 1 tentativo» non è più evidenziato dei precedenti: è il momento più rischioso. [F] | Quarto/quinto errore: tono più marcato («Ultimo tentativo»). | B |
| **Tentativi finiti** (`codice__tentativi-finiti__*`) | **C-5** Due bottoni arancioni **impilati**: «Accedi» (disabilitato, in alto) e «Invia un nuovo codice» (attivo, sotto), poi «Cambia email» a capo. L'azione utile è **sotto** quella morta e non è `w-100`. [F] | Quando `codeDead`: nascondere «Accedi»; «Invia un nuovo codice» a tutta larghezza al suo posto; «Cambia email» come link sotto. | A |
| | Il campo disabilitato in scuro (`#221c18` su `#171310`) è quasi indistinguibile dalla card. [F] | Bordo tratteggiato o testo «codice non più valido» dentro il campo. | B |
| **Codice scaduto** (`codice__codice-scaduto__*`) | Identico al caso sopra: stesso problema C-5. Messaggio chiaro. | — | (A, via C-5) |
| **Verifica in corso** (`codice__verifica-in-corso__*`) | Il codice resta visibile, bottone «Verifica…» e link disabilitati: coerente. Nessun indicatore di avanzamento (come L-8). | Come «Invio in corso». | M |
| **Reinvio in corso** (`codice__reinvio-in-corso__*`) | **C-6** Mentre si **invia un nuovo codice** il bottone «Accedi» mostra **«Verifica…»**: dice una cosa falsa (`busy` condiviso tra invio e verifica). [F] | Testo diverso per le due azioni (es. link che diventa «Invio…»). Non è un difetto di stile: è un'incoerenza di feedback. | M |
| **Codice reinviato** (`codice__codice-reinviato__*`) | Conferma utile, ma ripete l'email (già sopra) e sposta di nuovo gli elementi; non scompare. [F] | Accorciare («Nuovo codice inviato.») e metterla dove c'era il sottotitolo. | B |
| **Attesa 429** (`codice__attesa-429__*`) | Come L-9. Il link «Invia un nuovo codice» diventa grigio senza spiegazione (il motivo sta nell'alert). | Tempo nel link/bottone. | M |
| **Link focus / disabled** (`codice__link-nuovo-codice-focus`, `codice__link-cambia-email-focus`, `codice__link-nuovo-codice-disabled`) | Focus = anello pesca di Bootstrap attorno al testo (1,3–1,8:1): debole come L-6. Target alto 44 px ✅ ma **largo solo quanto il testo**: «Cambia email» ~85 px. [F] | Anello unico (L-6). Target ok; non serve altro. | M (via L-6) |

### 3. Errore di sessione — `/session-error`

**Da mantenere** [F]: alert + un solo bottone primario; testo breve; il bottone riprova senza perdere la destinazione (`?next=`); `role=alert`.

| Difetti | Proposte | Pri |
|---|---|---|
| **S-1** Nessun titolo (`h1`) e il testo dell'alert e il bottone dicono la stessa cosa («riprova»/«Riprova»). Non spiega **cosa** non riesce (il server? la rete?) né cosa fare se persiste. [F] | Titolo «Connessione al service non riuscita» + una riga («Controlla la connessione. Se continua, riprova tra poco.») + «Riprova». | M |
| **S-2** Su `/session-error` e `/` non c'è alcuna via d'uscita diversa da «Riprova». [F] | Nessuna per ora (non esiste altro posto dove andare). | B |
| Alert su fondo rosato e bottone arancione pieno: il rosso dell'errore e l'arancione del brand si somigliano e **competono** come attenzione. [I] | Gerarchia: alert più sobrio (tono neutro/avviso) o bottone secondario. **[V]** con utenti. | B |

(`session-error__default`, `…-riprova-focus`, `…-riprova-pressed`)

### 4. Pagina non trovata — qualsiasi URL sconosciuto

**Da mantenere** [F]: titolo chiaro; «avvicina di nuovo il telefono al tag» è la frase giusta per l'NFC (`non-trovata__default__*`).
| Difetti | Proposte | Pri |
|---|---|---|
| **N-1** **Nessuna azione**: né link né bottone (nemmeno «Torna all'inizio»). Se il cliente ha digitato male l'URL resta in un vicolo cieco. [F] | Un bottone «Vai alla pagina iniziale» (la `/` ridirige comunque dove serve). | M |
| **N-2** Il testo parla solo al cliente col tag; per **staff/PC** («Controlla il link») va bene, ma «avvicina il telefono» è senza senso su un computer. [F] | Su larghezza grande togliere la seconda parte, oppure renderla neutra. | B |

---

## Capitoli trasversali

### Stile
- **Gerarchia [F]**: wordmark 800 arancione (22 px) > etichette 600 > **titolo 500 (24 px)** > corpo 400. Il titolo è il livello più basso in peso; vedi L-3.
- **Spaziature [F]**: ritmo Bootstrap (`mb-3`, `py-3`); coerente, ma gli alert e i link dello stato codice non seguono una griglia: il blocco bottone+link cambia di altezza a ogni stato (+55/+70 px), quindi la pagina «balla».
- **Tipografia [F/V]**: stack di sistema, 3 dimensioni sulla pagina (24 / 16 / 17-28 nel codice). Va bene per un MVP; i pesi veri si giudicano sul telefono (vedi limiti).
- **Colore [F]**: arancione unico; in chiaro la palette è **fredda** (grigi Bootstrap `#dee2e6`, `#e9ecef`, `#212529` su bianco puro) mentre in scuro è **calda** (`#171310`, `#221c18`): i due temi non sembrano la stessa marca. [I]
- **Coerenza componenti [F]**: tre «bottoni» diversi per la stessa azione secondaria (`btn-link` sottolineato; `btn btn-primary` quando `codeDead`; bottone Google tipo outline); campo con `is-invalid` in `DisplayNameForm` ma non nel login; alert usati sia per errori che per promemoria.
- **Marca [F]**: solo testo «Stampy». Nessun marchio. Il nome è in rinomina (conflitto marchio UE, vedi MEMORY): **non investire in un logotipo** finché non c'è il nome (Domanda D5).

### UX
- **Passaggi [F]**: email → (app di posta) → codice → dentro. Due schermate, 3-4 tap con autofill. Giusto per «niente password»; non c'è nulla da togliere. Google è l'unica scorciatoia (L-11).
- **Azione primaria [F]**: chiarissima su email (un solo bottone). Nel codice è **ambigua** quando il codice è morto (C-5) e **inattiva** per tutta la schermata (C-1).
- **Feedback [F]**: tutto testuale, nessun indicatore di avanzamento (spinner/skeleton assenti, `01b`), nessun cambio visivo del campo in errore (L-8, C-4), reinvio che dice «Verifica…» (C-6).
- **Errori [F]**: ben distinti (non valido / scaduto / finiti / 429 / rete) **ma** tutti dentro lo stesso alert, nello stesso posto, spingendo il resto.
- **Testi**: v. Copy.
- **Ipotesi da validare con persone vere**: se «oppure» + Google sia sufficiente come scorciatoia; se 5 minuti e 5 tentativi bastino a chi deve cercare l'email sul telefono; se chi legge «Niente password» capisca che il codice arriva per email.

### Mobile / touch
- **Target [F]**: bottoni 48 px, campi 48 px, `btn-link` 44 px: **rispettano** i 44–48 px. Lo spazio fra «Invia un nuovo codice» e «Cambia email» è 1 rem orizzontale: ok.
- **Raggiungibilità [F]**: contenuto concentrato nel terzo superiore: scomodo da una mano sola su telefoni alti, ma è la scelta giusta con la tastiera aperta (campo + bottone restano visibili). Il bottone Google è il più basso (y≈415 px), sotto la tastiera potrebbe finire nascosto [I/V].
- **Tastiera su schermo [F]**: tastiere corrette (`email`, `numeric`), niente zoom iOS (17 px). Nel markup di `EmailLogin.vue` non c'è `enterkeyhint`: il tasto Invio della tastiera mostra l'etichetta di default (non verificato a vista; modifica banale se si vuole «Invia»).
- **Layout shift [F]**: gli alert d'errore spostano il bottone sotto il pollice (L-8, C-4): rischio di tap sbagliato [I].
- **Hover** non catturato (telefono): niente da dire.

### Accessibilità
- **Etichette [F]**: ✅ `label for`, ✅ `aria-invalid`, ✅ `aria-describedby` all'alert, ✅ `role=alert`, ✅ annuncio dell'attesa a granularità di minuto. Buona base.
- **Contrasti**: v. tabella. Fuori soglia: bianco su arancione 3,19 (tutti i temi), link chiaro 3,19, bordo input 1,30/2,26, alone focus 1,79.
- **Focus visibile [F]**: debole su campi e bottoni (anello globale annullato da Bootstrap), assente sul Google nel PNG. Il commento in `stampy.scss` («A11Y-01») dice che l'anello c'è: **in pratica no, su `.form-control`/`.btn`**. Per `focus-visible` generico vale (link `RouterLink`).
- **Stati invalidi [F]**: solo `aria-invalid` + testo; nessuna icona, nessuna variazione di campo → il colore (rosa) è l'unica cue visiva: un daltonico e chi ha contrasti bassi lo perdono. L'alert ha però testo scritto: ok per il testo, non per il campo.
- **Titolo del documento [F]**: resta «Stampy» in tutti gli stati (login, codice, errore); un utente di screen reader/tabs non sente il cambio di passo. `document.title` è cambiato solo nella coda staff.
- **Tema scuro [F]**: i testi hanno 7–14:1, meglio del chiaro; i **bordi** (campi 2,26, card 1,55) sono deboli; il campo disabilitato svanisce nella card.
- **Reduced motion [F]**: rispettato dove c'è movimento (solo bottone Google 0,15 s).
- **Non verificato**: screen reader reale, zoom 200%/400%, testo ingrandito di sistema; il bottone Google reale (iframe).

### Frontend / responsive (cosa ostacola tablet e desktop)
- **`.narrow { max-width: 28rem }` su ogni pagina** (`stampy.scss:144`, `EmailLogin.vue:177`, `SessionErrorView`, `NotFoundView`, `AppLayout`): su tablet/PC la pagina è una **striscia di 448 px** con ~70% di vuoto ai lati; nessuna `@media` in `stampy.scss` [F].
- **Contenitore e header [F]**: `container narrow py-3` + `AppHeader` allineato a sinistra: su schermo largo il «Stampy» sta sul bordo sinistro della striscia, non sopra il form: con `.container` + `margin:auto` la card è centrata ma l'header segue la card; ok, ma col bianco intorno sembra «galleggiare».
- **Altezza [F]**: nessun `min-height`/centraggio verticale; la card resta in alto e sotto c'è il bianco/nero (~55% nel telefono).
- **Unità [F]**: `rem` per la maggior parte (bene, scalano col testo); **px fissi** in header (`44px`) e nel bottone Google (`GOOGLE_BUTTON_HEIGHT = 40`, `width` 200–400 px calcolata **una sola volta** in `onMounted`). Il bottone Google **non si ricalcola** a rotazione/resize: su tablet in orizzontale l'overlay invisibile può non coincidere col bottone visibile [I/V].
- **Componenti [F]**: Bootstrap Sass limitato (niente JS); la griglia `grid` è importata ma l'Accesso non la usa. `.btn { min-height: 3rem }` va bene come base, ma su desktop con mouse 48 px è grande (non un problema).
- **Opzioni (non decido io)**: **A)** tenere la colonna ma centrarla in verticale e darle una card più larga (32–36 rem) su ≥768 px; **B)** layout a due colonne ≥992 px (a sinistra marca + «perché un codice», a destra il form) — più lavoro, serve contenuto; **C)** card su fondo leggermente colorato (tono caldo) per dare presenza su schermo largo. Per il pilota Canva suggerirei A + C.

### Copy
Testi **letterali del codice** (AGENTS.md: non cambiarli senza richiesta del proprietario); le proposte sono suggerimenti per te.

| Oggi | Osservazione | Proposta |
|---|---|---|
| «Accedi» (titolo e bottone del 2° passo) | Stesso verbo per titolo del 1° passo e per il bottone del 2°: ok, ma il 1° bottone è «Invia il codice» | Titolo «Entra con la tua email»? Oppure lasciare |
| «Ti mandiamo un codice via email. Niente password.» | Buono. «Niente password» è il punto forte | Mantenere |
| «Email non valida» | Non spiega | «Controlla l'indirizzo: sembra incompleto (manca la @ o il dominio).» |
| «Abbiamo scritto a X. Il codice vale 5 minuti.» | Corretto; manca «non arriva?» | + «Non arriva? Controlla lo spam.» |
| «Codice non valido. Ti restano 4 tentativi.» | Ottimo | Mantenere; ultimo: «Ultimo tentativo.» |
| «Codice non valido. Hai finito i tentativi: richiedi un nuovo codice.» | Ok | Mantenere |
| «Codice scaduto. Richiedi un nuovo codice.» | Ok | Mantenere |
| «Riprova tra 3 min» | Non dice **perché** | «Hai chiesto troppi codici: riprova tra 3 min.» |
| «Codice inviato a …» | Ripete l'email | «Nuovo codice inviato.» |
| «Connessione non riuscita, riprova» + bottone «Riprova» | Ridondante | Titolo + riga + bottone (S-1) |
| «Pagina non trovata» / «Controlla il link, oppure avvicina di nuovo il telefono al tag.» | Bene per il cliente; vicolo cieco | + bottone (N-1) |
| «Invio…» / «Verifica…» | OK; ma «Verifica…» compare anche durante il reinvio (C-6) | Testi distinti |
| «Continua con Google» | Ok; l'etichetta non segue Google (non verificato): **verificare sulle linee guida di Google** | — |
| *(assente)* | Nessuna nota privacy/consenso sotto il bottone | **Domanda D4** (legale/prodotto, non lo invento) |

### Incoerenze rispetto ad altre sezioni (da `01-screen-map`, `01b`, `01c`, nessuna cattura aperta)
- **`is-invalid`**: `DisplayNameForm` (Cliente, `/name`) lo usa; Login e Elimina account no [F, codice].
- **Header**: l'Accesso ha header senza menu; `AppLayout` ha menu ☰ a 44×44 con `btn-outline-primary`: la logica «bottone arancione in alto» è diversa (qui assente) [F].
- **Alert dopo il campo**: stesso schema in Login, Elimina account, `/name`, Visita: se si cambia il pattern nell'Accesso va cambiato ovunque (conviene farlo nel **design system**, lavoro 4) [F].
- **Attesa 429**: due testi/strutture diverse nello stesso codice: Login/Elimina usano `alert-warning` + `visually-hidden` annuncio; Visita usa «Riprova tra N» dentro l'errore [F, codice].
- **Colore link**: arancione su bianco 3,19:1 è un problema **globale** (profilo, storico, menu), non solo dell'Accesso [F, tokens].

---

## Cosa MANTENERE (riassunto)
1. Flusso senza password, in due schermate, con autofill e invio automatico.
2. Campo unico per le 6 cifre (non a caselle).
3. Etichette sempre visibili; testi d'errore specifici con conteggio tentativi.
4. Tastiere corrette e target 44–48 px; testo 17 px nei campi.
5. Tema scuro caldo e leggibile; alert con testo ben contrastato.
6. Stato salvato al reload; ritorno alla destinazione (`next`).
7. Bottone Google finto uniformato ai campi (a patto di chiarire le regole Google).
8. Frase «avvicina di nuovo il telefono al tag» sulla 404.

## Top 10 miglioramenti (impatto / sforzo)

| # | Miglioramento | Impatto | Sforzo | Rif. |
|---|---|---|---|---|
| 1 | **Colore dei bottoni primari**: fondo `#c2410c` (5,18) **oppure** testo scuro su `#f16417` (5,78) **oppure** testo ≥18,66 px bold; link chiari `#c2410c` | alto | basso (token) | L-2 |
| 2 | **Anello di focus unico e visibile** su campi, bottoni, link | alto | basso | L-6, L-7, L-10 |
| 3 | **Stato invalido sul campo** (bordo, icona, testo sotto il campo, senza spostare il bottone) | alto | medio | L-8, C-4 |
| 4 | **Primario sempre attivo** (non sbiadito) nel Login | alto | basso | L-1, C-1 |
| 5 | **Stato «codice morto»**: sostituire «Accedi» con «Invia un nuovo codice» a tutta larghezza | alto | basso | C-5 |
| 6 | **Bordo dei campi ≥3:1** (`#868e96` chiaro / `#7b8087` scuro) e card più distinta | medio | basso | tabella |
| 7 | **Titolo più pesante** (gerarchia) e peso delle etichette coerente | medio | basso | L-3 |
| 8 | **Copy** (429 con il perché, `Email non valida`, aiuti «non arriva?») | medio | basso | Copy |
| 9 | **Feedback di avanzamento** (spinner/puntini) e **testo diverso** nel reinvio | medio | basso | L-7, C-6 |
| 10 | **Layout per tablet/desktop** (opzione A+C): colonna più larga e centrata, fondo caldo | medio | medio | Responsive |

Ordine consigliato: 1+2+6 sono **solo token CSS** e valgono per tutta l'app; 3-5 toccano solo l'Accesso; 10 dopo il design system.

## Domande aperte per me
- **D1.** Colore dei bottoni: vuoi **tenere l'arancione `#f16417`** e mettere **testo scuro** (5,78:1, cambia la «voce» del brand) oppure **scurire il fondo** (`#c2410c`, 5,18:1, meno vivace)? Oppure accetti i 3,19:1 sapendo che non passa AA?
- **D2.** Google deve essere **pari grado** all'email (o sopra) o resta secondario? Se resta, il bottone finto va bene o vuoi quello ufficiale di Google (più rigido)?
- **D3.** Mostrare il **nome del locale** sulla pagina di login richiede un endpoint pubblico (non è solo UI): lo vuoi valutare o resta fuori?
- **D4.** Serve una riga su **privacy/consenso** nel login (GDPR, raccolta email)? Non la invento.
- **D5.** Il **nome Stampy** è in rinomina: aspetto a toccare wordmark/logo/«Stampy» nei titoli?
- **D6.** Per il tema chiaro: lo vuoi **caldo** come lo scuro (sfondo/grigi con una punta di calore) o resta neutro Bootstrap?
- **D7.** Layout grande: A (colonna centrata più larga), B (due colonne) o C (A + sfondo colorato)?
- **D8.** «Accedi» nel codice, quando l'invio è automatico: lo teniamo (accessibilità, tastiera) o lo togliamo e basta?

## Non verificato / dubbi
- Il comportamento reale del focus sul bottone Google; se `:focus-within` scatta con l'iframe.
- Resa di font e pesi su telefono vero; zoom 200%; screen reader.
- Email lunghe (overflow); orientamento orizzontale; tastiera che copre il bottone Google.
- Se il bottone Google finto rispetti le linee guida di Google (non ho letto la documentazione).
- Le skill `design-critique`/`accessibility-review`/`ux-copy` non sono disponibili: nessun controllo automatico oltre ai miei calcoli.
