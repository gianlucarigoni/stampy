# 30 · Pilota Canva (chat 11)

2026-11-26. Solo design: nessun file dell'app toccato, nessun commit. Brief: `22-brief-canva.md`; token: `21-design-system.md`.
**Non ho aperto i PNG** (richiesta esplicita): tutto ciò che segue viene dai **dati** di `read-design` (struttura, testi, font ref, colori dei testi, dimensioni) e dai due pixel di sfondo campionati dai PNG. La resa a schermo (layout, coriandoli, timbri, forme) è **non verificata a vista**: la guarda il proprietario.

## 1. Link

| Cosa | Link |
|---|---|
| **Design da guardare** (390×844, 6 pagine) | edit `https://www.canva.com/d/_45v65QYKshIbz1` · view `https://www.canva.com/d/qXBt2PvzkvxGvMD` (id `DAHb92Uozi4`) |
| Design di partenza (pagine **quadrate 1264×1264**, tenuto per confronto) | `https://canva.link/bi8rcq6fwwvm06c` · view `https://www.canva.com/d/6Df-Lw1vYIBniva` (id `DAHb93kVSKk`) |
| Cartella «Stampy Mockup v2» (contiene entrambi) | https://www.canva.com/folder/FAHb9zj_hnI |
| PNG esportati (2x, 780×1688, ignorati da git) | `design-review/canva-export/pilota/` (6 file `1-…` … `6-…`) |

`.gitignore`: aggiunta la riga `design-review/canva-export/` (diff mostrato in chat).

## 2. Passo 0: cosa possono e non possono fare i tool (dagli schemi letti + prove)

Nota: `generate-design`, `generate-design-structured` e `create-design-from-candidate` sono marcati **LEGACY: non usare se `create-design` esiste**. Esiste, quindi ho usato `create-design` (asincrono, con `get-create-design-async-job`). **Non ci sono «candidati» multipli**: `create-design` restituisce **un solo** design; la scelta del candidato più fedele non è possibile.

| Domanda | Risposta | Fonte |
|---|---|---|
| Dimensioni personalizzate 390×844 in generazione? | **No.** `create-design.format` accetta solo nomi di formato Canva («Instagram Post»…); scrivere 390×844 nel brief **non** è stato rispettato: pagine **1264×1264**. | schema + prova |
| Portarle a 390×844? | **Sì, con `resize-design` (custom)** → crea un **nuovo** design 390×844 (6 pagine, nessun elemento fuori pagina). Ma è un **ridimensionamento proporzionale** del quadrato, non un rilayout: i testi scendono (vedi §4). | prova |
| `edit-design.add_page` | accetta `width`/`height` (40–8000): si potrebbe costruire **da zero** a 390×844, pagina per pagina, a mano. | schema |
| Hex esatti nel brief? | **Solo in parte.** Il generatore interpreta: i **testi** escono con hex vicini ma **diversi** (§3); le forme sono **immagini raster** (`rect` con fill immagine), quindi i loro hex **non sono leggibili né modificabili** con `recolor_element`. Con `edit-design` posso invece **forzare** hex esatti su testi (`format_text.color`), forme nuove (`insert_shape`: colore, raggio fino a 1000, bordo) e sfondo pagina (`add_page.background_color`). | dati + schema |
| Font? | Il formato dei dati dà solo `fontRef` (ID opachi, es. `YAFdJvSyp_k,3`) e **peso** (`bold`, `ultrabold`, `heavy`…): **non il nome**. Non posso dire quale famiglia sia stata usata. **`edit-design` non ha nessuna operazione per cambiare famiglia** (solo dimensione, peso bold/normal, colore, interlinea…). Quindi Unbounded/Instrument Sans/Figtree **non si possono imporre** da qui. | dati + schema |
| Più pagine? | **Sì**: 6 pagine nello stesso design da un solo `create-design` (nessun outline necessario). | prova |
| Immagini caricate / font propri? | `create-upload-url` (POST dei byte, un solo uso) e `upload-asset-from-url` (solo URL pubblici HTTPS) caricano **immagini/video/PDF**, **non font**. Non ho verificato se Canva accetti i `woff2`: non c'è un tool per i font. `get-assets` legge solo metadati. Non provato (nessun asset serviva). | schemi |
| Brand Kit? | Non usato (nessuno è di Stampy). | regola |
| Export | `export-design`: PNG con `width`/`height` (usato 780×1688 = 2x), uno per pagina (URL firmati, scaricati con `curl`). | prova |
| Rotazione dei timbri ±5°, tratteggio, anello «nuovo» | Non controllabili da prompt; sono dentro le immagini raster. **Non verificabile senza guardare i PNG.** | — |

## 3. Token richiesti vs resa osservata (dai dati)

Solo il **testo** è misurabile; fondi, bordi e raggi sono immagini → **non misurabili senza guardare**.

| Token | Richiesto | Osservato | Differenza |
|---|---|---|---|
| Pagina | 390×844 | 1264×1264 alla generazione; **390×844 dopo `resize-design`** | formato corretto solo dopo il resize |
| Testo principale | `#2A1F18` | `#321F16` (la maggioranza), `#321A0A`, `#26130D` | **sbagliato** (leggermente più chiaro/rossiccio) |
| Testo scuro tema scuro | `#F4E9DC` | `#F6E6CD`, `#F2E5CF`, `#F0D9C2` | vicino, non esatto |
| Secondario | `#5F4E40` | `#8B7764` (chiaro), `#947D6C`, `#695547` | **diverso** (più chiaro: contrasto da ricalcolare) |
| Secondario scuro | `#C0AD9C` | `#C6A67C`, `#AD926B`, `#A88F76` | diverso |
| Errore «Rifiuta» | `#B3261E` | `#BD2B24` | vicino |
| Successo (testo) | `#0B3D24` / scuro `#C8F2D6` | `#175630`, `#B8E3BB`, `#8CC78B` | diverso |
| Arancione testi/numeri | `#F16417` | `#F06B1B` | vicino |
| Sfondo pagina chiaro (pixel campionato) | `#F1EDE0` | p1 `#F7F1E2` · p3 `#F4EEDB` · p5 `#F8F4EA`/`#FCF8F2` | **tre sfondi diversi tra le pagine** (sfondo = immagine generata, non tinta unita) |
| Sfondo pagina scuro (pixel) | `#1A1410` | p2 `#17130E` · p4 `#16110C` · p6 `#14100C`/`#1D1810` | vicino ma **non coerente** tra le pagine |
| Font | Unbounded / Instrument Sans / Figtree | **non rilevabile** (solo `fontRef`); 12 `fontRef` diversi in 6 pagine → **più di 3 famiglie** | **non conforme** (l'app ne usa 3) |
| Pesi | 800 / 400-500 / 700 | `bold`, `ultrabold`, `heavy`, `semibold`, `medium`, `normal` misti, anche nello stesso schermo | incoerente tra pagine |
| Corpo minimo | ≥ 13 px | **8,6–10 px** nelle pagine 3-6 dopo il resize (13,6 solo in p1) | **viola la regola «niente testo sotto 13 px»** |
| Raggi 18/14/12/pillola, bordi 1,5/2/3 | — | forme raster | non verificabile |

Dimensioni dopo il resize (campione): wordmark 12–17 (richiesto 18); titolo «Premio!» 33–46 (richiesto 38); numero «7» 53–55 (richiesto 38); codice coda 17–22 (richiesto 22); bottoni coda 10–11 (richiesto 17). Le proporzioni tra gli elementi **non** rispettano la scala del design system.

## 4. Prompt esatto usato (un solo prompt per tutte le pagine)

`create-design`, senza `format`, senza `brand_kit_id`, senza `references`. Brief (letterale):

```
Design "Pilota Mobile": 6 pagine, ognuna una schermata di app mobile in formato verticale 390x844 px (rapporto 390:844), nessuna cornice di telefono, nessuna barra di stato. App di tessere fedeltà (timbri) per locali di quartiere. Stile: caldo, morbido, leggibile, carta e inchiostro. Piatto: nessuna ombra sulle card, bordi sottili caldi, niente neon, niente glassmorphism, niente sfumature, niente emoji, niente logo, nessuna icona regalo.

COLORI TEMA CHIARO: sfondo pagina #F1EDE0, card #FBF9F1 (bordo 1,5px #D6DAC8), piano #DFE5D2, testo #2A1F18, testo secondario #5F4E40, bordo campi/secondari #7D6A58, link #B43A0A.
COLORI TEMA SCURO: sfondo pagina #1A1410, card #251D17 (bordo #4A3B30), piano #31261E, testo #F4E9DC, secondario #C0AD9C, bordo campi #9A8878, link #F4813F.
AZIONE: bottone arancione #F16417 con testo scuro (#1F1612 chiaro, #1A1410 scuro), MAI testo bianco su arancione; in tema chiaro bordo 1,5px #9A3412. Premio: rosa #FF5FA2 con testo #2B1408 e contorno 2px #2B1408; mai testo rosa su fondo chiaro. Errore/Rifiuta: #B3261E (scuro #FF8D82). Successo: fondo #D3EAD9 testo #0B3D24 bordo #14633B (scuro fondo #14301C testo #C8F2D6 bordo #86DCA0). Avviso: fondo #F2E1A3 testo #4A3300.
FONT: titoli, numeri e codici in Unbounded ExtraBold; corpo Instrument Sans; etichette, chip e bottoni Figtree Bold. Se non disponibili: sans geometrico largo bold per titoli, sans neutro per il resto.
FORMA: raggio 18 per le card, 14 per bottoni e campi, 12 per gli alert, pillole (raggio pieno) per i chip. Margini laterali 16 px, colonna unica larga 358 px, spazio tra blocchi 16 px. Bottoni alti 52 (coda: 48), larghi come la colonna, testo Figtree Bold 17.
TIMBRI: dischi arancioni #F16417 con anello interno e stella a cinque punte in #2B1408, leggermente ruotati (±5°); posto vuoto = cerchio tratteggiato #7D6A58 (scuro #9A8878) sulla card; griglia 5 colonne x 2 righe = 10 posti, circa 62 px, spazio 10 px. Nessuna barra di avanzamento.
HEADER (tutte le pagine): altezza 56, a sinistra un cerchio arancione 26 px con stella scura e la scritta "Nome prodotto" in Unbounded ExtraBold 18; a destra pulsante menu 44x44 con tre linee, bordo 1,5px #7D6A58, raggio 12.

PAGINA 1 - Cliente, tema chiaro. Card timbri su sfondo #F1EDE0. Alert successo in cima: "Richiesta approvata" con icona spunta e sotto "+2 timbri" come dato grande. Card: nome del locale "Bar Rossi"; numero enorme "7" (Unbounded ExtraBold 38) con "su 10" accanto e "ne mancano 3" in secondario; griglia 10 timbri: 7 pieni (gli ultimi 2 con un anello esterno arancione a indicare "nuovi") e 3 vuoti tratteggiati.
PAGINA 2 - Identica alla pagina 1 ma tema scuro.
PAGINA 3 - Cliente, card piena, tema chiaro, con dialog del premio sopra la card (scrim nero caldo al 72%). Sullo sfondo la card "10 su 10" con 10 timbri pieni. Dialog: blocco rosa #FF5FA2 largo 366, raggio 28, contorno 2,5px #2B1408; nella parte alta 126 px liberi con coriandoli (cerchietti 12 px scuri, arancioni, bianchi, gialli); chip scuro pillola "Premio riscattato" con testo rosa; titolo "PREMIO!" Unbounded ExtraBold 38; sotto "Caffè gratis" Unbounded ExtraBold 28; riga "Bar Rossi"; testo "Lo staff lo sa già: ti consegna il premio."; bottone scuro #2B1408 "Perfetto" alto 58 con testo rosa.
PAGINA 4 - Identica alla pagina 3 ma tema scuro.
PAGINA 5 - Staff, coda di richieste, tema chiaro. Header con chip "3 in coda" e sotto "la più vecchia da 2 min". Tre card (raggio 14, padding 12, distanza 16). Ogni card: riga meta piccola "da 2 min · scade tra 6 min"; codice in Unbounded Bold 22 a gruppi; stepper con pulsanti − e + 44x44 raggio 12, valore "1" e preset pillola 1 · 2 · 5; bottone arancione "Conferma 1 timbro" con icona spunta alto 48; 16 px sotto bottone "Rifiuta" outline rosso #B3261E alto 48. Card 1: bordo 2px #2A1F18 e chip "1°", codice "K7M4 9Q2X", scade tra 6 min. Card 2: codice "44EE 7A5B", da 1 min, con chip avviso giallo "scade tra 1 min" (in scadenza). Card 3: codice "R2D8 J5WN", da 30 s, stepper a 2 e bottone "Conferma 2 timbri".
PAGINA 6 - Identica alla pagina 5 ma tema scuro.

Usa SOLO questi testi italiani, nessun lorem ipsum e nessun testo inventato in più.
```

Poi: `resize-design` custom 390×844 (giro 2). **Nessun `edit-design`** (giro 3 non fatto: vedi §6).

## 5. Problemi riscontrati (dai dati, non a vista)

1. **Formato sbagliato alla generazione** (1264×1264 quadrato) anche chiedendo 390×844. Il resize lo porta al formato giusto, ma ridimensionando un layout **quadrato** (larghezza piena 1146/1264) → molto probabile che il risultato sia un layout largo schiacciato in verticale, non una colonna da 358 px **[da vedere]**.
2. **Testo troppo piccolo** dopo il resize: 8,6–11 px in 4 pagine su 6 (regola: ≥ 13).
3. **Font non controllabile**; 12 `fontRef` diversi; pesi misti. Non è possibile dire se Unbounded sia disponibile in Canva: il tool non lo espone.
4. **Colori dei testi non esatti** e **sfondi diversi pagina per pagina**; forme in raster, quindi non correggibili con i tool di colore.
5. **Testi: nessun lorem ipsum, ma 4 deviazioni dal brief**: «Premio!» invece di «PREMIO!» (l'ha scritto in minuscolo con maiuscola iniziale); lo stepper usa il carattere «—» al posto di «−» (p5: due occorrenze); in p5 il preset «1 · 2 · 5» ha spazi doppi (« 1 ·  2 ·  5») e in p6 il preset è «1•2•5» con punti elenco al posto di «·»; p6 usa «•» invece di «·» in «da 2 min • scade tra 6 min»; «Bar Rossi» compare 3 volte nella pagina 3 (brief: due contesti: card e dialog). **Il testo «+2 timbri» è su un solo elemento in p2 e su due («+2» e «timbri») in p1**: incoerenza chiaro/scuro nella struttura.
6. **Incoerenza chiaro/scuro:** gli elementi delle coppie non coincidono (p1: 24 elementi, p2: 22; p3: 22, p4: 31; p5: 59, p6: 53); gli ordini di lettura dei testi sono diversi; p4 ha il titolo «10 su 10» come primo testo. **Le coppie non sono la stessa schermata con altri colori.**
7. **Scrim non confermato** (p3): il pixel in alto a sinistra del PNG chiaro è `#F4EEDB`, cioè **non scurito**: con scrim al 72% mi aspetterei un valore molto scuro. Potrebbe essere assente o solo sotto al dialog **[da vedere]**.
8. Il generatore ha messo `Nome prodotto` e il cerchio con stella come **immagine**, non come testo+forma separati: corretto per il segnaposto, non riutilizzabile come componente.
9. Nessuna delle verifiche sul **momento del premio** (coriandoli, rotazione dei timbri, anello «nuovo», tratteggio dei vuoti) è possibile dai dati: **da guardare**.

## 6. Tempo e giri

| Passo | Durata (orologio) | Giri |
|---|---|---|
| Lettura documenti e schemi | ~10 min | — |
| `create-design` + attesa | ~2,5 min (job: ~100 s, 5 polling; l'avviso `wait_seconds` va rispettato) | 1 |
| `resize-design` | ~5 s | 1 (giro di correzione 2) |
| `read-design` (≈105-115 kB di JSON per design: va salvato su file, non entra nel contesto) | ~10 s ciascuno | — |
| `export-design` + download 6 PNG | ~30 s | — |

**Giri usati: 2 su 3 per pagina** (1 generazione, 1 resize). **Non ho fatto il giro `edit-design`**: ogni pagina ha 22-59 elementi, il font non si può cambiare, e le forme sono raster. Correggere 6 pagine a mano con ~250 operazioni avrebbe superato il limite dei 3 giri senza risolvere il font; lo segnalo invece di tentarlo.

## 7. Parere sul metodo per le chat 12-14: **NO-GO così com'è** (go solo come bozza di composizione)

Perché:
- **Fedeltà ai token non garantita**: hex dei testi diversi, sfondi incoerenti, font non imponibile, forme raster non correggibili. Un mockup che non usa i token **non può servire a decidere** D1, D6, D10, D11 (si decide su colore e contrasto).
- **Formato**: richiede un passo di resize che degrada la gerarchia (testi 8-11 px).
- **Chiaro/scuro non confrontabili**: due generazioni indipendenti, non due temi della stessa struttura.
- **Un solo candidato**, nessuna scelta.
- Costo: veloce (≈ 3 min a design) ma il risultato richiederebbe molte correzioni manuali.

**Alternative (in ordine di raccomandazione)**
1. **Mockup in HTML/CSS con i token veri** (come `design-system/dir-i.html`, già costruito) + PNG con Playwright (`export-png.mjs`, già nel repo): font reali (woff2 già in `design-system/fonts/`), hex esatti, raggi esatti, chiaro/scuro dallo stesso HTML cambiando `data-bs-theme`. **Zero costi, fedeltà totale, ripetibile.** Si perde la modifica a mano in Canva.
2. **Canva solo come rifinitura**: importare i PNG/SVG dell'HTML in Canva per presentazioni o per commenti del proprietario, non come fonte dei mockup.
3. **Se si insiste su Canva**: costruire da zero con `edit-design` (`add_page` 390×844, `background_color` esatto, `insert_shape` con colori/raggi esatti, `add_text` + `format_text` con colore e dimensione) **partendo da pagine vuote**, non da `create-design`; resta il limite del **font** (non impostabile): va verificato **a mano** nell'editor (cerca Unbounded / Instrument Sans / Figtree) e, se mancano, usare i sostituti del brief. Stima: molte operazioni per pagina; adatto solo a 2-3 schermate chiave (card timbri, dialog, coda), non a tutto.
4. **Non consigliato**: `generate-image` (immagini raster con testo inventato).

**Cosa guardare tu nei 6 PNG** (io non li ho aperti): se la colonna è stretta (≈ 358 px) o larga; se il rosa del premio è `#FF5FA2` con contorno scuro; se i coriandoli ci sono e occupano i 126 px in alto; se p3/p4 hanno lo scrim; se i bottoni hanno il testo scuro (non bianco) sull'arancione; se «Rifiuta» è sotto «Conferma» a 16 px; se i timbri sono ruotati e i vuoti tratteggiati; il carattere dei titoli (largo e pesante come Unbounded o no).

## 8. Cose di cui non sono sicuro

- Il nome dei font reali (solo `fontRef` opachi).
- Se il resize abbia mantenuto la sensazione di «colonna» o abbia schiacciato il layout.
- Se i `fontRef` ripetuti (12) siano tutti famiglie diverse o varianti di peso della stessa famiglia.
- Se i link `canva.link/…` e `canva.com/d/…` richiedano login per essere aperti.
