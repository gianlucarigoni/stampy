# 31 · Pilota HTML → Figma (chat 12-13)

2026-11-26. Solo design: `src/` e `docs/` non toccati, nessun commit. File nuovi: `context/23-style-from-png.md`, questo file, `mockup/pilota/{build.mjs,render.mjs,pilota.html,checks.json}` e i 6 PNG in `mockup/pilota/png/` (ignorati da git: riga aggiunta a `.gitignore`).

## 1. Stato: HTML fatto, importazione in Figma **eseguita** (chat 13)

**Passo 0 (chat 12) superato in chat 13.** I tool Figma ora ci sono, con prefisso `mcp__f70a7bf7-849c-49e4-b11e-38fab3a2a05d__`. `whoami` (esente): utente `GigiLuca`, un solo piano, **«GigiLuca's team», tier `starter` (gratuito), ruolo admin, posto `View`**, `planKey` = `team::1707576595546155354`. Il posto `View` **non ha impedito** né la creazione del file né l'importazione.

**Risultato (file creato nel team, non committato nulla):**
- File Figma «Stampy Mockup v2»: https://www.figma.com/design/ybKvCdJRM8LbMDbkWRIYRd?node-id=1-2 (`fileKey` `ybKvCdJRM8LbMDbkWRIYRd`).
- `create_session`: `0bfd22a7-708e-4b46-ac3a-1194a47025db`. `promptId` dell'import: `ac892792-be5d-4f94-b773-8969386ea7c6`.
- **Una** `html_to_figma` con `cssSelector` `.frame` su `mockup/pilota/pilota.html` (190 kB, ben sotto i 50 MB, nessun URL esterno trovato con `grep`), inviato con `curl --data-binary` a `Content-Type: text/html` → **HTTP 200, `success: true`**, nuova pagina con 6 frame:
  `nodeIds` = `1:2`, `2:2`, `3:2`, `4:2`, `5:2`, `6:2`.
- Mappa nodo ↔ schermata: **`4:2` = premio scuro** (verificato a vista dallo screenshot); gli altri li assegno **per ordine nel DOM** e non li ho aperti: `1:2` cliente timbri chiaro, `2:2` cliente timbri scuro, `3:2` premio chiaro, `5:2` coda staff chiaro, `6:2` coda staff scuro.
- Nessun errore di limite (`html_to_figma_rate_limited` o altro).

### Chiamate Figma di questa chat (per tool)

| Tool | Chiamate | Nota |
|---|---|---|
| `whoami` | 1 | esente dal limite |
| `get_figma_skill` (skill `figma-generate-design`) | 1 | era il ripiego previsto al Passo 0: **non serve rifarlo** |
| `create_new_file` | 1 | |
| `create_session` | 1 | |
| `html_to_figma` | 1 | + 1 POST `curl` sull'URL monouso (non è una chiamata MCP) |
| `get_screenshot` | 1 | frame `4:2` |
| **Totale** | **6** (5 non esenti) | `use_figma`, `get_design_context`, `get_metadata`: **0** |

Nota: non so quali di questi tool il piano gratuito conti nel limite «di lettura» (6 o 20 al mese): nessun errore è comparso, quindi **non l'ho raggiunto**, ma non ho modo di leggere il contatore.

## 2. Cosa ho costruito

`mockup/pilota/pilota.html`: **un solo file autonomo** (190 kB), 6 elementi `.frame` 390×844 (ids `s-cliente-timbri-light|dark`, `s-cliente-premio-light|dark`, `s-staff-coda-light|dark`).
- **Token**: variabili CSS da `21` §2.1, scoperte per frame con `data-theme`; raggi 12/14/18/28/pillola, bordi 1,5/2/3 px, nessuna ombra tranne la «lastra» del dialog (dir-i).
- **Font**: Unbounded, Instrument Sans, Figtree come `@font-face` con **data URI base64** dai woff2 in `design-system/fonts/` (nessun URL esterno). **Icone**: tracciati Phosphor (MIT) copiati inline da `dir-i.html`, niente `<use>`. **Timbri**: SVG inline. **Coriandoli**: 22 cerchi in posizione fissa (stato finale dell'animazione).
- **Testi**: copy reale. Dagli originali: «Richiesta approvata», «+2 timbri aggiunti», «Codice card: 44EE7A5B», «Bar Pasticceria Rossi», codici `44EE…`, `9Q23…`, `YG4G…`, «N / 10 timbri», «scade tra N min». Da `21`/dir-i: «Premio riscattato», «PREMIO!», «Caffè gratis», «Lo staff lo sa già: ti consegna il premio.», «Perfetto», «Consegna: Caffè gratis», «Conferma N timbri», «Rifiuta», «3 in coda». Dove manca il dato: «Nome del locale» con riquadro tratteggiato «richiede backend». Il nome prodotto «Stampy» resta segnaposto (wordmark testuale + disco con stella, non un logo).
- Generazione: `node mockup/pilota/build.mjs`; PNG e verifiche: `node mockup/pilota/render.mjs --check` (Playwright del frontend, scala 2, 780×1688).

## 3. Ciclo visivo (Passo 3)

Aperti i PNG a coppie, confrontati con `dir-i-*.png` e con gli originali. **Giri usati: 2 su 3 per ogni schermata.**

| Giro | Schermata | Difetto visto | Correzione |
|---|---|---|---|
| 1 | 3-4 premio | un coriandolo giallo finiva **sotto il chip** «Premio riscattato» (e uno sul bordo del chip) | tolti 2 coriandoli nella fascia del chip |
| 1 | 5-6 coda | con l'ordine «normale / scadenza / premio» la **terza card (premio) era fuori schermo** e la seconda non mostrava il premio; le card erano alte 300 px | ordine FIFO realistico: 1° in scadenza (la più vecchia scade per prima), 2° con premio, 3° normale che spunta in fondo; gap interno delle card 12→8 con Rifiuta a +8 (la distanza Conferma→Rifiuta resta **16 px**) |
| 1-2 | 1-2 | nessun difetto grave: il timbro «nuovo» (anello fisso) si legge; resta **molto spazio vuoto** sotto la card (come nell'originale) | lasciato (non è un difetto del design, è una pagina corta) |
| 2 | 3-4 | in scuro il bordo inchiostro del dialog e la «lastra» sono quasi invisibili; il rosa regge da solo | confermato come da `21` (6,96:1 sullo scrim) |
| 2 | 5 / 6 | la terza card si vede solo per 16 px | accettato: basta per far capire che «ce n'è un'altra» |

Non fatto: terzo giro; confronto con screenshot **scuri** originali (non aperti).

### Verifiche automatiche (Playwright, `checks.json`)

- **Contrasti** calcolati sulle coppie colore testo / fondo effettivo (ho escluso il testo sotto lo scrim): 11 / 11 / 7 / 7 / 38 / 38 coppie per frame, **tutte sopra soglia**; minimo 5,56:1 (chiaro, bottone primario), 5,71 (scuro); nel dialog 6,14.
  Stella nera su `#f16417`: **6,58:1** (con `#2b1408`: 5,45). Altre coppie UI (bordi, timbri) non ricalcolate: valgono i valori di `21` §2.2.
- **Target** (`getBoundingClientRect`, 22 elementi nella coda): tutti ≥ 44×44; Conferma e Rifiuta **48 px** di altezza; «Perfetto» 58; burger 44; stepper 44; pillole 1·2·5: **elemento 44×44** con pillola visiva 36. Distanza Conferma→Rifiuta: **16 px**.
- **Testo minimo**: nessun testo sotto 13 px (le etichette «richiede backend» sono a 13 px).
- **Larghezza**: nessuno scroll orizzontale; dialog largo **366 px**.
- Non verificato: contrasto del testo sotto lo scrim (non è letto), focus, hover, animazioni (i frame sono statici), carattere reale dei titoli su telefono.

## 4. Differenze PNG locale ↔ Figma (osservate), modificabilità, stima chiamate

**Cosa ho confrontato:** un solo frame, il **premio in scuro** (`4:2`), aperto accanto a `png/4-cliente-premio-scuro.png`. Copia Figma salvata in `mockup/pilota/figma-check/4-cliente-premio-scuro-figma.png` (cartella **non** ignorata da git: ricordati di aggiungerla a `.gitignore` o di non committarla).

**Limite del confronto.** Con `maxDimension` 1688 il tool ha restituito comunque **390×844 (1x)**: non scala oltre la dimensione naturale del nodo. Il PNG locale è 780×1688 (2x). Ho confrontato a vista, riportando il locale a grandezza simile; **nessun diff a pixel** (nel sistema non ci sono Pillow, sharp né pixelmatch e non ho installato nulla). Dettagli fini (spigoli dei glifi, spessore del tratteggio, morbidezza dell'ombra) a 1x non sono giudicabili.

| Aspetto | PNG locale | Figma | Esito |
|---|---|---|---|
| Dimensione frame | 390×844 (a 2x) | 390×844 | uguale |
| Layout del dialog (posizione, larghezza ~362, bordi arrotondati, altezza) | dialog da y≈202 a y≈589 | stessa posizione e misure (±1 px a occhio) | **uguale** |
| Coriandoli | 22 cerchi, colori e posizioni | stessi cerchi nelle stesse posizioni | uguale |
| Ritorni a capo | «Nome del locale» + riquadro sulla stessa riga; «Lo staff lo sa già: ti consegna il premio.» su una riga | identici | uguale |
| Font (Unbounded: wordmark «Stampy», «10 su 10», «PREMIO!», «Caffè gratis») | largo e pesante | **larghezza e posizione dei testi uguali a ±1 px** (es. «PREMIO!» 32→229, «Caffè gratis» 32→250, wordmark 50→138) | nessun segno di sostituzione, ma a 1x **non posso confermare** la forma dei glifi → checklist §4.2 |
| Font del corpo (Figtree/Instrument Sans: chip, «Perfetto», righe di testo) | Figtree/Instrument | stessa resa a vista | uguale a vista |
| Icone (stella nel disco, burger, regalo, spunta nel chip) | inline Phosphor | presenti e nello stesso posto | uguale |
| Bordo tratteggiato «richiede backend» (2 volte) | tratteggio nero | tratteggio presente | uguale a vista |
| Colori (fondo scuro, rosa, inchiostro del bottone, chip) | come da token | stessi | uguale a vista (non misurato) |
| Scrim sopra card e header | card dietro attenuata | attenuata allo stesso modo | uguale a vista |
| **«Lastra» sotto il dialog** (`0 22px 0 -8px`, il gradino scuro) | gradino scuro visibile sotto il rosa | sotto il rosa si vede **un'ombra morbida e meno definita**; il gradino netto **non lo distinguo** a 1x | **possibile differenza** (da controllare nel file) |
| Anello del timbro «nuovo», rotazione dei timbri, stella nera, tratteggio del posto vuoto | in altri frame | **non visibili** in questo frame (coperti dal dialog) | **non verificato** (servirebbe `1:2` o `2:2`) |
| Tema chiaro vs scuro | — | confrontato **solo lo scuro** | **non verificato** per il chiaro |
| Coda staff (card, stepper, pillole, chip scadenza) | — | non aperta | **non verificato** |

Differenze **certe**: solo la risoluzione di uscita del tool. Differenze **possibili**: la lastra; tutto il resto che non compare in questo frame.

### 4.1 Modificabilità

**Non verificabile da qui**: non ho usato `use_figma` né aperto l'editor, e lo screenshot è un'immagine. Il tool dichiara «pixel-perfect Figma layers» e la skill chiede livelli di testo/forme modificabili, ma io **non so** se testi, forme e icone arrivino come livelli veri. Va controllato a mano (§4.2).

### 4.2 Checklist da controllare a mano nel file Figma

Apri https://www.figma.com/design/ybKvCdJRM8LbMDbkWRIYRd?node-id=1-2 (pagina nuova creata dall'import):

1. **Testi**: clicca due volte su «PREMIO!», su «Caffè gratis» e su un codice della coda: sono livelli di testo modificabili (non immagini)? Il pannello Tipografia mostra **Unbounded** / **Instrument Sans** / **Figtree**, o un font sostituito (Inter, Arial…)? Se compare l'avviso «font mancanti», annota quali.
2. **Forme**: card, bottoni, chip e dialog sono rettangoli/frame con raggi (12, 14, 18, 28, pillola) e riempimenti modificabili? I colori sono valori fissi (i token CSS non diventano variabili Figma: è atteso).
3. **Icone** (stella, burger, regalo, spunta, orologio): sono vettori (si vedono i punti) o immagini?
4. **Timbri**: sono vettori; la **rotazione** (−5°…+5°) è mantenuta; l'**anello** del timbro «nuovo» è presente e visibile (`1:2`, `2:2`).
5. **Posto vuoto del timbro**: il tratteggio a puntini tondi c'è (non linee continue o quadrati)?
6. **Bordi tratteggiati** dei riquadri «richiede backend»: presenti, con trattini e non puntini?
7. **«Lastra» del dialog** (`3:2`, `4:2`): c'è il gradino scuro sotto il rosa, o solo un'ombra morbida? Il box-shadow è un effetto o è sparito?
8. **Struttura**: i livelli hanno nomi sensati e auto-layout, o tutto è assoluto (testi sparsi senza gerarchia)? Quanti livelli ha il frame?
9. **Chiaro vs scuro**: `1:2`/`3:2`/`5:2` e `2:2`/`4:2`/`6:2` cambiano davvero colori (non solo un riempimento)?
10. **Coda** (`5:2`, `6:2`): codice con trattino, stepper − / + con campo, pillole 1·2·5 (target 44), Conferma/Rifiuta a distanza 16, terza card che spunta in fondo.
11. Il frame ha dimensioni **390×844** e sta in una pagina con i 6 frame affiancati? Il nome dei frame corrisponde alle schermate (`s-cliente-timbri-light`…)?

### 4.3 Stima REALE delle chiamate per tutto il mockup

Dati osservati: **1 `html_to_figma` = 1 chiamata MCP + 1 POST `curl`** per un massimo di **20 frame** (il selettore ne accetta fino a 20 per chiamata; l'URL è monouso, quindi un lotto = una chiamata). Questa chat: 6 frame in 1 chiamata, 6 chiamate totali.

Assunzioni (restano da rivedere): ~20 schermate × 3 viewport (telefono, tablet, desktop) × 2 temi = **120 frame** → **6 lotti da 20** = **6 `html_to_figma`**.

| Voce | Chiamate |
|---|---|
| `whoami` | 1 (esente; già noto, non serve ripeterlo) |
| `create_new_file` | 0 (si riusa questo file) o 1 per un file separato per viewport |
| `create_session` | 0-1 |
| `html_to_figma` | **6** |
| `get_screenshot` | 0 (verifica a mano nell'editor) … 6 (uno per lotto) |
| **Totale** | **~6-8 senza verifica a vista; ~12-14 con uno screenshot per lotto** |

Con il tetto più basso citato (6 al mese per i tool di lettura) conta soprattutto `get_screenshot`: la verifica a vista costa un'altra chiamata per lotto, e **abbiamo visto che a 1x non basta per giudicare i dettagli**. Raccomandazione: **nessun `get_screenshot` nei lotti successivi**; si controlla aprendo il file (checklist §4.2) e, se serve un confronto, si usa lo stesso nodo una volta sola. Se il limite dovesse riguardare anche `html_to_figma` non lo so: nessun errore di limite è comparso in 6 chiamate.

## 5. Parere

**Per il metodo HTML → PNG: GO** (invariato).

**Per Figma: GO CON CORREZIONI**, in via provvisoria. A favore: l'importazione è **riuscita al primo tentativo** su un HTML autonomo con font in base64; layout, coriandoli, ritorni a capo, icone e tratteggi risultano uguali a vista, e le larghezze dei testi in Unbounded coincidono a ±1 px (segno che il font è stato letto). Cosa lo rende «con correzioni» e non «go»: (1) la modificabilità **non è verificata** (checklist §4.2); (2) la «lastra» del dialog potrebbe non essere identica; (3) il tema chiaro, i timbri ruotati e la coda **non sono stati confrontati**; (4) lo screenshot a 1x non permette un controllo fine. Se la checklist mostra testi come livelli veri e font corretti → **go**; se i testi sono immagini → Figma resta una galleria dei PNG e il lavoro continua in HTML.

## 6. Cose da decidere o confermare

1. **Stella nera** sul timbro (come dir-i, effetto probabilmente accidentale): confermare o tornare a `stamp-ink` (vedi `23` #2). **PROVVISORIA** (vedi `11-decisions.md`).
2. **Trattino nel codice** `44EE-7A5B` (dir-i) vs spazio (`21`): confermare (vedi `23` #4). **PROVVISORIA**.
3. **Timbro «nuovo» come anello fisso** nel mockup statico (l'animazione si decide in sviluppo). **PROVVISORIA**.
4. Eseguire la checklist §4.2 e dire il risultato: decide go / no-go di Figma per i lotti successivi.
5. `design-review/mockup/pilota/figma-check/` non è ignorata da git: aggiungere la riga a `.gitignore` (non l'ho modificato in questa chat).
