# 21 · Design system (direzione dir-i «Ibrido»)

Chat 10, 2026-11-26. Solo design: nessun file dell'app toccato, nessun commit.
Direzione scelta dal proprietario: **dir-i** (`design-system/dir-i.html`, `dir-i-light.png`, `dir-i-dark.png`). Registrata in `11-decisions.md`.
Mappatura sulle variabili Bootstrap: `21b-bootstrap-mapping.md`. Brief per Canva: `22-brief-canva.md`.

**Come leggere i numeri**
- Valori di colore, raggi, bordi, font e misure di dir-i: **estratti dall'HTML** (`dir-i.html` + `palettes.mjs` · `I`), quindi esatti, non campionati dai PNG. Non ho aperto i PNG: la resa a schermo non è stata guardata da me.
- Valori **nuovi** (stati hover/premuto, scrim, ring sul rosa, ecc.): scelti qui e marcati **(nuovo)**. Tutti i rapporti di contrasto sono **calcolati** da `design-system/contrasts-21.mjs` (formula WCAG 2.x, `node contrasts-21.mjs [--md]`); nessun numero è stimato.
- Etichette: **[V]** da validare a mano/su dispositivo · **[backend]** richiede dati che il backend non dà oggi (nei mockup si scrive «richiede backend») · **[codice]** richiede logica nel frontend (Vue), non solo stile.
- Il **nome del prodotto è una variabile** (D5): nei testi `{{PRODUCT_NAME}}`; in codice una costante/variabile Sass (`$product-name`), mai scritto a mano nei template. Wordmark = segnaposto testuale; la stella nel tondo arancione di dir-i è un **segnaposto**, non un logo (nessun logo nuovo).
- Terminologia dei documenti: *locale*, *richiesta di timbro*, *premio*, *riscattato* (stato) / *Consegna* (istruzione allo staff) (D23).

---

## 1. Principi

1. **Il momento del timbro e del premio è il prodotto.** Cliente: «ho guadagnato qualcosa» in meno di un secondo (numero grande, timbro «nuovo», premio nominato, riepilogo che resta). Tutto il resto resta sobrio per fargli spazio. (K-1…K-6, P-5)
2. **Velocità senza errori per lo staff.** Un tocco per il caso normale; azione frequente forte, azione rara presente ma lontana (≥ 16 px) e annullabile; **niente si sposta sotto il dito**. (CQ-15, ES-1, D25)
3. **Mai solo colore.** Ogni stato (errore, successo, premio, in attesa, scaduta) = **icona SVG + testo + forma/bordo**; il colore rinforza. (L-8, D11, D22)
4. **Un solo modo di fare ogni cosa.** Un anello di focus, un pattern di errore, un token di pericolo, un verbo per il premio, un formato per l'attesa 429. (L-6, EL-9, ST-14, D23)
5. **I bottoni primari non sono mai spenti.** Si valida **al tocco**, con messaggio **sotto il campo** che non sposta il bottone; «in lavorazione» = spinner + testo, aspetto pieno. (L-1, N-1, CQ-11, D20)
6. **Caldo e leggibile in ogni luce.** Chiaro caldo (carta/salvia) e scuro caldo (bruno), stessi ruoli di token; testi ≥ 4,5:1 su ogni fondo su cui compaiono; UI ≥ 3:1. Pensato per bancone con luce forte e per il telefono al buio.
7. **Si costruisce con poco.** Bootstrap 5.3 Sass + variabili CSS; solo CSS per il movimento; font e icone in locale; ogni pezzo che non è un token è dichiarato in `21b`. Budget quasi zero, sviluppatore solo.
8. **Onesto sul dato mancante.** Dove il dato non c'è (nome del locale, nome del premio in coda, nome del cliente) il mockup lo dice («richiede backend») e il design ha un ripiego che non mente. (D9, D29, D30)

---

## 2. Token

Prefisso CSS `--app-*` (non contiene il nome del prodotto, D5). Colori: tema chiaro = `[data-bs-theme=light]`, scuro = `[data-bs-theme=dark]` (come `main.ts` oggi, segue `prefers-color-scheme`). **Stessi ruoli nei due temi.**

### 2.1 Colore: ruoli semantici

| Ruolo (`--app-…`) | Chiaro | Scuro | Uso |
|---|---|---|---|
| `bg` | `#f1ede0` | `#1a1410` | sfondo pagina |
| `surface` | `#fbf9f1` | `#251d17` | card, campi, dialog, menu |
| `surface-2` | `#dfe5d2` | `#31261e` | «piano» tonale (chip neutro, stato premuto del secondario, scheletro, barre) |
| `border` | `#d6dac8` | `#4a3b30` | bordo card e separatori (**decorativo**, non conta per il 3:1) |
| `field` | `#7d6a58` | `#9a8878` | bordo di campi, secondari, chip, timbro vuoto (**UI ≥ 3:1**) |
| `text` | `#2a1f18` | `#f4e9dc` | testo |
| `text-2` | `#5f4e40` | `#c0ad9c` | testo secondario, suggerimenti |
| `link` | `#b43a0a` | `#f4813f` | link e testo d'azione sul fondo |
| `brand` | `#f16417` | `#f16417` | marca: timbri, wordmark, fondo del primario |
| `brand-deep` | `#c2410c` | `#c2410c` | riserva (D1-b/c se D1 cambia); oggi solo come stato premuto storico di `.filter-reset` |
| `action` (fondo) | `#f16417` | `#f16417` | bottone primario (D1-a) |
| `action-fg` | `#1f1612` | `#1a1410` | testo sul primario |
| `action-bd` | `#9a3412` | trasparente | bordo 1,5 px del primario (in chiaro il fondo vs pagina è 2,73:1) |
| `action-hover` (nuovo) | `#f7782f` | `#f87a35` | solo puntatore preciso |
| `action-pressed` (nuovo) | `#db5a11` | `#db5a11` | premuto |
| `danger` (testo/bordo/icona) | `#b3261e` | `#ff8d82` | errore, «Rifiuta», campo invalido |
| `danger-fill` / `danger-fg` | `#b3261e` / `#ffffff` | `#ff8d82` / `#2a0a07` | bottone «Elimina definitivamente» |
| `danger-hover` (nuovo) | `#9d2019` | `#ff9f96` | solo puntatore |
| `danger-pressed` (nuovo) | `#8f1d17` | `#f06f63` | premuto |
| `danger-tint` / `danger-tt` | `#fbe5e1` / `#7a1610` | `#3a1714` / `#ffc9c3` | alert errore |
| `ok` / `ok-tint` / `ok-tt` | `#14633b` / `#d3ead9` / `#0b3d24` | `#86dca0` / `#14301c` / `#c8f2d6` | successo |
| `warn-tint` / `warn-tt` | `#f2e1a3` / `#4a3300` | `#3a2f0a` / `#ffe39a` | avviso (bordo = `warn-tt`) |
| `info-tint` / `info-tt` | `#e9eef9` / `#1d2f66` | `#1b2540` / `#c6d4ff` | informativo, promozione (bordo = `info-tt`) |
| `prize` (fondo) / `prize-fg` | `#ff5fa2` / `#2b1408` | `#ff5fa2` / `#2b1408` | premio (D11): chip, dialog, bottone premio |
| `prize-bd` | `#2b1408` | trasparente | bordo 2 px del fondo rosa su card chiara (2,69:1 senza) |
| `prize-tint` / `prize-tt` | `#ffd1e5` / `#6b0c37` | `#4d1634` / `#ffc7e0` | alert «Premio disponibile» |
| `prize-pressed` (nuovo) | `#e34a8f` | `#f0488f` | premuto |
| `stamp` / `stamp-ink` | `#f16417` / `#2b1408` | `#f16417` / `#1a1410` | timbro pieno: disco e stella/anello |
| `ring` | `#1d4ed8` | `#8fb0ff` | **anello di focus unico** |
| `ring-on-prize` (nuovo) | `#2b1408` | `#2b1408` | focus dentro il dialog rosa (il blu su rosa fa 2,36 / 1,33) |
| `scrim` (nuovo) | `rgba(10,6,3,.72)` | `rgba(10,6,3,.72)` | sfondo dei dialog (dir-i aveva .62) |

Regole d'uso del colore
- **Rosa = solo premio**, solo come **fondo** con testo `prize-fg`. Mai testo rosa su fondo chiaro (2,69:1). In scuro il rosa su card regge (5,85:1) ma la regola resta uguale.
- **Arancione = marca e azione**; non è mai il colore di un errore o di un premio. Rosso = errore/azione negativa; verde = esito positivo; rosa = premio. Quattro significati, quattro colori, ognuno con icona.
- **Timbri solo su `surface`** (la card), mai su `surface-2` (in chiaro 2,48:1).
- L'accento del locale (D16) **non esiste ancora**: i timbri sono sempre `stamp`.

### 2.2 Contrasti calcolati

Soglie: testo ≥ 4,5:1; UI/bordi/focus ≥ 3:1; «→» = riga sotto 3:1 **coperta da una regola** scritta nella colonna Esito. «—» = decorativo/non richiesto.

**Tema chiaro**

| Gruppo | Coppia | Primo piano | Sfondo | Rapporto | Soglia | Esito |
|---|---|---|---|---|---|---|
| Testo | testo su sfondo pagina | `#2a1f18` | `#f1ede0` | 13.71 | ≥ 4.5 | ✓ |
|  | testo su card | `#2a1f18` | `#fbf9f1` | 15.24 | ≥ 4.5 | ✓ |
|  | testo su piano (surface2) | `#2a1f18` | `#dfe5d2` | 12.45 | ≥ 4.5 | ✓ |
|  | testo secondario su sfondo | `#5f4e40` | `#f1ede0` | 6.77 | ≥ 4.5 | ✓ |
|  | testo secondario su card | `#5f4e40` | `#fbf9f1` | 7.52 | ≥ 4.5 | ✓ |
|  | testo secondario su piano (surface2) | `#5f4e40` | `#dfe5d2` | 6.14 | ≥ 4.5 | ✓ |
|  | link su sfondo | `#b43a0a` | `#f1ede0` | 5.05 | ≥ 4.5 | ✓ |
|  | link su card | `#b43a0a` | `#fbf9f1` | 5.61 | ≥ 4.5 | ✓ |
|  | link su piano (surface2) | `#b43a0a` | `#dfe5d2` | 4.58 | ≥ 4.5 | ✓ |
| Azione | testo del primario (riposo) su fondo | `#1f1612` | `#f16417` | 5.56 | ≥ 4.5 | ✓ |
|  | testo del primario (hover) su fondo | `#1f1612` | `#f7782f` | 6.50 | ≥ 4.5 | ✓ |
|  | testo del primario (premuto) su fondo | `#1f1612` | `#db5a11` | 4.64 | ≥ 4.5 | ✓ |
|  | fondo primario vs sfondo pagina (UI) | `#f16417` | `#f1ede0` | 2.73 | ≥ 3 | ✗ → bordo 1,5 px #9a3412 (riga sotto) |
|  | fondo primario vs card (UI) | `#f16417` | `#fbf9f1` | 3.03 | ≥ 3 | ✓ |
|  | bordo del primario vs sfondo pagina (UI) | `#9a3412` | `#f1ede0` | 6.24 | ≥ 3 | ✓ |
|  | bordo del primario vs card (UI) | `#9a3412` | `#fbf9f1` | 6.93 | ≥ 3 | ✓ |
|  | bordo del primario vs fondo primario | `#9a3412` | `#f16417` | 2.29 | — | — |
|  | secondario: bordo vs card (UI) | `#7d6a58` | `#fbf9f1` | 4.89 | ≥ 3 | ✓ |
|  | secondario: bordo vs sfondo (UI) | `#7d6a58` | `#f1ede0` | 4.40 | ≥ 3 | ✓ |
|  | secondario premuto: testo su surface2 | `#2a1f18` | `#dfe5d2` | 12.45 | ≥ 4.5 | ✓ |
| Focus | anello di focus su sfondo (UI) | `#1d4ed8` | `#f1ede0` | 5.72 | ≥ 3 | ✓ |
|  | anello di focus su card (UI) | `#1d4ed8` | `#fbf9f1` | 6.36 | ≥ 3 | ✓ |
|  | anello di focus su piano surface2 (UI) | `#1d4ed8` | `#dfe5d2` | 5.19 | ≥ 3 | ✓ |
|  | anello di focus su tinta «ok» (barra annulla) (UI) | `#1d4ed8` | `#d3ead9` | 5.28 | ≥ 3 | ✓ |
|  | anello di focus su tinta «avviso» (UI) | `#1d4ed8` | `#f2e1a3` | 5.13 | ≥ 3 | ✓ |
|  | anello di focus su tinta «pericolo» (UI) | `#1d4ed8` | `#fbe5e1` | 5.55 | ≥ 3 | ✓ |
|  | anello di focus (blu) su fondo premio (dialog) (UI) | `#1d4ed8` | `#ff5fa2` | 2.36 | ≥ 3 | ✗ → nel dialog rosa si usa `ringOnPrize` (riga sotto) |
|  | anello `ringOnPrize` su fondo premio (dialog) (UI) | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 3 | ✓ |
| Campi | bordo campo vs card (UI) | `#7d6a58` | `#fbf9f1` | 4.89 | ≥ 3 | ✓ |
|  | bordo campo vs sfondo (UI) | `#7d6a58` | `#f1ede0` | 4.40 | ≥ 3 | ✓ |
|  | bordo campo vs piano surface2 (UI) | `#7d6a58` | `#dfe5d2` | 3.99 | ≥ 3 | ✓ |
|  | segnaposto/suggerimento (text2) su card | `#5f4e40` | `#fbf9f1` | 7.52 | ≥ 4.5 | ✓ |
|  | campo invalido: bordo/icona danger vs card (UI) | `#b3261e` | `#fbf9f1` | 6.20 | ≥ 3 | ✓ |
|  | messaggio d’errore (danger) su card | `#b3261e` | `#fbf9f1` | 6.20 | ≥ 4.5 | ✓ |
|  | messaggio d’errore (danger) su sfondo | `#b3261e` | `#f1ede0` | 5.58 | ≥ 4.5 | ✓ |
| Pericolo | testo del bottone pericolo su fondo | `#ffffff` | `#b3261e` | 6.54 | ≥ 4.5 | ✓ |
|  | testo del bottone pericolo (hover) | `#ffffff` | `#9d2019` | 7.91 | ≥ 4.5 | ✓ |
|  | testo del bottone pericolo (premuto) | `#ffffff` | `#8f1d17` | 8.91 | ≥ 4.5 | ✓ |
|  | fondo bottone pericolo vs card (UI) | `#b3261e` | `#fbf9f1` | 6.20 | ≥ 3 | ✓ |
|  | «Rifiuta» outline: testo/bordo danger su card | `#b3261e` | `#fbf9f1` | 6.20 | ≥ 4.5 | ✓ |
|  | «Rifiuta» outline premuto: testo su tinta pericolo | `#7a1610` | `#fbe5e1` | 8.92 | ≥ 4.5 | ✓ |
| Alert | alert pericolo: testo su tinta | `#7a1610` | `#fbe5e1` | 8.92 | ≥ 4.5 | ✓ |
|  | alert pericolo: bordo vs sfondo (UI) | `#b3261e` | `#f1ede0` | 5.58 | ≥ 3 | ✓ |
|  | alert successo: testo su tinta | `#0b3d24` | `#d3ead9` | 9.69 | ≥ 4.5 | ✓ |
|  | alert successo: bordo vs sfondo (UI) | `#14633b` | `#f1ede0` | 6.23 | ≥ 3 | ✓ |
|  | alert avviso: testo su tinta | `#4a3300` | `#f2e1a3` | 9.11 | ≥ 4.5 | ✓ |
|  | alert avviso: bordo vs sfondo (UI) | `#4a3300` | `#f1ede0` | 10.16 | ≥ 3 | ✓ |
|  | alert info: testo su tinta | `#1d2f66` | `#e9eef9` | 10.94 | ≥ 4.5 | ✓ |
|  | alert info: bordo vs sfondo (UI) | `#1d2f66` | `#f1ede0` | 10.86 | ≥ 3 | ✓ |
|  | testo «successo» su card | `#14633b` | `#fbf9f1` | 6.92 | ≥ 4.5 | ✓ |
|  | barra a tempo «annulla» (ok) su tinta ok (UI) | `#14633b` | `#d3ead9` | 5.75 | ≥ 3 | ✓ |
| Premio | testo scuro su fondo premio | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 4.5 | ✓ |
|  | testo scuro su fondo premio (premuto) | `#2b1408` | `#e34a8f` | 4.68 | ≥ 4.5 | ✓ |
|  | fondo premio vs card (UI, senza bordo) | `#ff5fa2` | `#fbf9f1` | 2.69 | ≥ 3 | ✗ → bordo inchiostro 2 px (riga sotto) |
|  | bordo premio (inchiostro) vs card (UI) | `#2b1408` | `#fbf9f1` | 16.52 | ≥ 3 | ✓ |
|  | bordo/testo inchiostro su fondo premio | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 4.5 | ✓ |
|  | testo premio su tinta premio (alert) | `#6b0c37` | `#ffd1e5` | 8.95 | ≥ 4.5 | ✓ |
|  | dialog rosa: chip/alert (rosa su inchiostro) | `#ff5fa2` | `#2b1408` | 6.14 | ≥ 4.5 | ✓ |
|  | premio vs arancione brand (distinzione, non è un minimo) | `#ff5fa2` | `#f16417` | 1.13 | — | — |
| Timbri | timbro pieno vs card (UI) | `#f16417` | `#fbf9f1` | 3.03 | ≥ 3 | ✓ |
|  | stella (inchiostro) su timbro pieno (UI) | `#2b1408` | `#f16417` | 5.45 | ≥ 3 | ✓ |
|  | timbro vuoto (profilo tratteggiato) vs card (UI) | `#7d6a58` | `#fbf9f1` | 4.89 | ≥ 3 | ✓ |
|  | timbro pieno vs piano surface2 (UI) | `#f16417` | `#dfe5d2` | 2.48 | ≥ 3 | ✗ → regola: i timbri stanno sempre sulla card (surface), mai sul piano |
| Dialog | dialog (card) vs pagina oscurata (scrim → #4b4741) (UI) | `#fbf9f1` | `#4b4741` | 8.75 | ≥ 3 | ✓ |
|  | bordo dialog (chiaro: `border`; scuro: `field`) vs scrim (UI) | `#d6dac8` | `#4b4741` | 6.47 | ≥ 3 | ✓ |
|  | dialog del premio (rosa) vs scrim (UI) | `#ff5fa2` | `#4b4741` | 3.25 | ≥ 3 | ✓ |
|  | bordo inchiostro del dialog del premio vs scrim (UI) | `#2b1408` | `#4b4741` | 1.89 | ≥ 3 | ✗ → non serve: il rosa regge da solo (riga sopra) |
| Chip | chip neutro: testo su surface2 | `#2a1f18` | `#dfe5d2` | 12.45 | ≥ 4.5 | ✓ |
|  | chip neutro: bordo `field` vs card (UI) | `#7d6a58` | `#fbf9f1` | 4.89 | ≥ 3 | ✓ |
|  | chip avviso («scade tra 4 min»): testo su tinta | `#4a3300` | `#f2e1a3` | 9.11 | ≥ 4.5 | ✓ |
|  | chip premio: testo inchiostro su rosa | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 4.5 | ✓ |
| Decorativo | bordo card `border` vs sfondo (decorativo, non richiesto) | `#d6dac8` | `#f1ede0` | 1.22 | — | — |
|  | scheletro (surface2) vs card (decorativo) | `#dfe5d2` | `#fbf9f1` | 1.22 | — | — |

**Tema scuro**

| Gruppo | Coppia | Primo piano | Sfondo | Rapporto | Soglia | Esito |
|---|---|---|---|---|---|---|
| Testo | testo su sfondo pagina | `#f4e9dc` | `#1a1410` | 15.23 | ≥ 4.5 | ✓ |
|  | testo su card | `#f4e9dc` | `#251d17` | 13.84 | ≥ 4.5 | ✓ |
|  | testo su piano (surface2) | `#f4e9dc` | `#31261e` | 12.29 | ≥ 4.5 | ✓ |
|  | testo secondario su sfondo | `#c0ad9c` | `#1a1410` | 8.42 | ≥ 4.5 | ✓ |
|  | testo secondario su card | `#c0ad9c` | `#251d17` | 7.66 | ≥ 4.5 | ✓ |
|  | testo secondario su piano (surface2) | `#c0ad9c` | `#31261e` | 6.80 | ≥ 4.5 | ✓ |
|  | link su sfondo | `#f4813f` | `#1a1410` | 7.00 | ≥ 4.5 | ✓ |
|  | link su card | `#f4813f` | `#251d17` | 6.36 | ≥ 4.5 | ✓ |
|  | link su piano (surface2) | `#f4813f` | `#31261e` | 5.65 | ≥ 4.5 | ✓ |
| Azione | testo del primario (riposo) su fondo | `#1a1410` | `#f16417` | 5.71 | ≥ 4.5 | ✓ |
|  | testo del primario (hover) su fondo | `#1a1410` | `#f87a35` | 6.80 | ≥ 4.5 | ✓ |
|  | testo del primario (premuto) su fondo | `#1a1410` | `#db5a11` | 4.76 | ≥ 4.5 | ✓ |
|  | fondo primario vs sfondo pagina (UI) | `#f16417` | `#1a1410` | 5.71 | ≥ 3 | ✓ |
|  | fondo primario vs card (UI) | `#f16417` | `#251d17` | 5.19 | ≥ 3 | ✓ |
|  | secondario: bordo vs card (UI) | `#9a8878` | `#251d17` | 4.87 | ≥ 3 | ✓ |
|  | secondario: bordo vs sfondo (UI) | `#9a8878` | `#1a1410` | 5.36 | ≥ 3 | ✓ |
|  | secondario premuto: testo su surface2 | `#f4e9dc` | `#31261e` | 12.29 | ≥ 4.5 | ✓ |
| Focus | anello di focus su sfondo (UI) | `#8fb0ff` | `#1a1410` | 8.53 | ≥ 3 | ✓ |
|  | anello di focus su card (UI) | `#8fb0ff` | `#251d17` | 7.75 | ≥ 3 | ✓ |
|  | anello di focus su piano surface2 (UI) | `#8fb0ff` | `#31261e` | 6.89 | ≥ 3 | ✓ |
|  | anello di focus su tinta «ok» (barra annulla) (UI) | `#8fb0ff` | `#14301c` | 6.68 | ≥ 3 | ✓ |
|  | anello di focus su tinta «avviso» (UI) | `#8fb0ff` | `#3a2f0a` | 6.17 | ≥ 3 | ✓ |
|  | anello di focus su tinta «pericolo» (UI) | `#8fb0ff` | `#3a1714` | 7.48 | ≥ 3 | ✓ |
|  | anello di focus (blu) su fondo premio (dialog) (UI) | `#8fb0ff` | `#ff5fa2` | 1.33 | ≥ 3 | ✗ → nel dialog rosa si usa `ringOnPrize` (riga sotto) |
|  | anello `ringOnPrize` su fondo premio (dialog) (UI) | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 3 | ✓ |
| Campi | bordo campo vs card (UI) | `#9a8878` | `#251d17` | 4.87 | ≥ 3 | ✓ |
|  | bordo campo vs sfondo (UI) | `#9a8878` | `#1a1410` | 5.36 | ≥ 3 | ✓ |
|  | bordo campo vs piano surface2 (UI) | `#9a8878` | `#31261e` | 4.32 | ≥ 3 | ✓ |
|  | segnaposto/suggerimento (text2) su card | `#c0ad9c` | `#251d17` | 7.66 | ≥ 4.5 | ✓ |
|  | campo invalido: bordo/icona danger vs card (UI) | `#ff8d82` | `#251d17` | 7.41 | ≥ 3 | ✓ |
|  | messaggio d’errore (danger) su card | `#ff8d82` | `#251d17` | 7.41 | ≥ 4.5 | ✓ |
|  | messaggio d’errore (danger) su sfondo | `#ff8d82` | `#1a1410` | 8.15 | ≥ 4.5 | ✓ |
| Pericolo | testo del bottone pericolo su fondo | `#2a0a07` | `#ff8d82` | 8.20 | ≥ 4.5 | ✓ |
|  | testo del bottone pericolo (hover) | `#2a0a07` | `#ff9f96` | 9.30 | ≥ 4.5 | ✓ |
|  | testo del bottone pericolo (premuto) | `#2a0a07` | `#f06f63` | 6.25 | ≥ 4.5 | ✓ |
|  | fondo bottone pericolo vs card (UI) | `#ff8d82` | `#251d17` | 7.41 | ≥ 3 | ✓ |
|  | «Rifiuta» outline: testo/bordo danger su card | `#ff8d82` | `#251d17` | 7.41 | ≥ 4.5 | ✓ |
|  | «Rifiuta» outline premuto: testo su tinta pericolo | `#ffc9c3` | `#3a1714` | 10.97 | ≥ 4.5 | ✓ |
| Alert | alert pericolo: testo su tinta | `#ffc9c3` | `#3a1714` | 10.97 | ≥ 4.5 | ✓ |
|  | alert pericolo: bordo vs sfondo (UI) | `#ff8d82` | `#1a1410` | 8.15 | ≥ 3 | ✓ |
|  | alert successo: testo su tinta | `#c8f2d6` | `#14301c` | 11.66 | ≥ 4.5 | ✓ |
|  | alert successo: bordo vs sfondo (UI) | `#86dca0` | `#1a1410` | 11.08 | ≥ 3 | ✓ |
|  | alert avviso: testo su tinta | `#ffe39a` | `#3a2f0a` | 10.50 | ≥ 4.5 | ✓ |
|  | alert avviso: bordo vs sfondo (UI) | `#ffe39a` | `#1a1410` | 14.51 | ≥ 3 | ✓ |
|  | alert info: testo su tinta | `#c6d4ff` | `#1b2540` | 10.30 | ≥ 4.5 | ✓ |
|  | alert info: bordo vs sfondo (UI) | `#c6d4ff` | `#1a1410` | 12.39 | ≥ 3 | ✓ |
|  | testo «successo» su card | `#86dca0` | `#251d17` | 10.07 | ≥ 4.5 | ✓ |
|  | barra a tempo «annulla» (ok) su tinta ok (UI) | `#86dca0` | `#14301c` | 8.68 | ≥ 3 | ✓ |
| Premio | testo scuro su fondo premio | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 4.5 | ✓ |
|  | testo scuro su fondo premio (premuto) | `#2b1408` | `#f0488f` | 5.00 | ≥ 4.5 | ✓ |
|  | fondo premio vs card (UI, senza bordo) | `#ff5fa2` | `#251d17` | 5.85 | ≥ 3 | ✓ |
|  | bordo/testo inchiostro su fondo premio | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 4.5 | ✓ |
|  | testo premio su tinta premio (alert) | `#ffc7e0` | `#4d1634` | 9.80 | ≥ 4.5 | ✓ |
|  | dialog rosa: chip/alert (rosa su inchiostro) | `#ff5fa2` | `#2b1408` | 6.14 | ≥ 4.5 | ✓ |
|  | premio vs arancione brand (distinzione, non è un minimo) | `#ff5fa2` | `#f16417` | 1.13 | — | — |
| Timbri | timbro pieno vs card (UI) | `#f16417` | `#251d17` | 5.19 | ≥ 3 | ✓ |
|  | stella (inchiostro) su timbro pieno (UI) | `#1a1410` | `#f16417` | 5.71 | ≥ 3 | ✓ |
|  | timbro vuoto (profilo tratteggiato) vs card (UI) | `#9a8878` | `#251d17` | 4.87 | ≥ 3 | ✓ |
|  | timbro pieno vs piano surface2 (UI) | `#f16417` | `#31261e` | 4.61 | ≥ 3 | ✓ |
| Dialog | dialog (card) vs pagina oscurata (scrim → #0e0a07) (UI) | `#251d17` | `#0e0a07` | 1.19 | ≥ 3 | ✗ → in scuro regge il bordo `field` (riga sotto) |
|  | bordo dialog (chiaro: `border`; scuro: `field`) vs scrim (UI) | `#9a8878` | `#0e0a07` | 5.79 | ≥ 3 | ✓ |
|  | dialog del premio (rosa) vs scrim (UI) | `#ff5fa2` | `#0e0a07` | 6.96 | ≥ 3 | ✓ |
|  | bordo inchiostro del dialog del premio vs scrim (UI) | `#2b1408` | `#0e0a07` | 1.13 | ≥ 3 | ✗ → non serve: il rosa regge da solo (riga sopra) |
| Chip | chip neutro: testo su surface2 | `#f4e9dc` | `#31261e` | 12.29 | ≥ 4.5 | ✓ |
|  | chip neutro: bordo `field` vs card (UI) | `#9a8878` | `#251d17` | 4.87 | ≥ 3 | ✓ |
|  | chip avviso («scade tra 4 min»): testo su tinta | `#ffe39a` | `#3a2f0a` | 10.50 | ≥ 4.5 | ✓ |
|  | chip premio: testo inchiostro su rosa | `#2b1408` | `#ff5fa2` | 6.14 | ≥ 4.5 | ✓ |
| Decorativo | bordo card `border` vs sfondo (decorativo, non richiesto) | `#4a3b30` | `#1a1410` | 1.70 | — | — |
|  | scheletro (surface2) vs card (decorativo) | `#31261e` | `#251d17` | 1.13 | — | — |


Letture che contano
- Tutti i testi, in entrambi i temi, ≥ 4,5:1 sui fondi dichiarati (il più basso: link su `surface-2` in chiaro, 4,58). **Il link non va usato su `surface-2` in chiaro con testo piccolo**: regge solo di poco.
- Il primario in chiaro (`#f16417` su `#f1ede0`) fa **2,73:1**: la forma è tenuta dal **bordo `#9a3412`** (6,24:1). Senza bordo il primario in chiaro non passa 3:1: il bordo non è facoltativo.
- Il **premio rosa** non passa 3:1 su card chiara (2,69:1): è sempre dentro un contorno inchiostro (chip, alert, dialog); in scuro regge da solo.
- Bordi decorativi (`border`) restano a 1,22:1 (chiaro) / 1,70:1 (scuro): una card si riconosce dalla sua **struttura** (titolo, contenuto), non dal bordo; nessuna informazione dipende dal bordo della card.
- Il rosa del dialog è visibile sullo scrim a 3,25:1 (chiaro) / 6,96:1 (scuro); il dialog standard (surface) a 8,75:1 (chiaro); in scuro si separa con il bordo `field` (5,79:1) perché card su scrim fa solo 1,19:1.

### 2.3 Tipografia

Tre famiglie, **solo `woff2` in self-hosting**, sottoinsieme latino (comprende le lettere accentate dell'italiano), `font-display: swap`, **font variabili**: un file per famiglia.

| Famiglia | Ruolo | Pesi usati | File (misurato) | Licenza | Fonte |
|---|---|---|---|---|---|
| **Unbounded** | titoli, numeri grandi, codice, wordmark | 700, 800 | `unbounded-latin-wght-normal.woff2` · **50,9 kB** | OFL-1.1 | `@fontsource-variable/unbounded` 5.3.0 |
| **Instrument Sans** | corpo | 400, 500, 600 (dir-i usa anche 500 nei campi) | `instrument-sans-latin-wght-normal.woff2` · **30,1 kB** | OFL-1.1 | `@fontsource-variable/instrument-sans` 5.3.0 |
| **Figtree** | etichette, chip, bottoni, label dei campi | 600, 700 | `figtree-latin-wght-normal.woff2` · **20,2 kB** | OFL-1.1 | `@fontsource-variable/figtree` 5.3.0 |

- **Totale ≈ 101 kB** (99 KiB), 3 richieste. Più dei ~35 kB di A: costo accettato dal proprietario con la scelta; [V] su rete lenta (3G) e telefono economico.
- **Licenza verificata** dal campo `license` del pacchetto npm (`OFL-1.1`, controllato il 2026-11-26). Il testo OFL non l'ho letto dal file: va incluso `OFL.txt` di ogni famiglia accanto ai `woff2` nel repo (obbligo OFL: licenza insieme alla copia).
- **Self-hosting, niente CDN** (privacy: D4): file in `public/fonts/`; precarica solo Instrument Sans e Unbounded (le due che compaiono nel primo schermo).
- **Disponibilità in Canva: NON verificata.** La ricerca web non ha trovato un elenco Canva che nomini Unbounded, Instrument Sans o Figtree. Si controlla nell'editor (cerca i tre nomi) all'inizio del pilota; se mancano → vedi `22-brief-canva.md` (sostituti e caricamento dei font propri, **da verificare** sul piano Canva dell'utente).
- Caveat: Unbounded è molto larga. Titolo di schermata ≤ ~24 caratteri; sotto 360 px scende a 24 px **[V]**. Non so se Unbounded ha cifre tabulari vere (`font-variant-numeric: tabular-nums` può non avere effetto): [V] sul codice a gruppi e su «7 su 10». **Ambiguità 0/O, 1/I nei codici: [V]** (non so con quale alfabeto sono generati, CQ-1).

Scala (dir-i; `px/interlinea`, `ls` = letter-spacing)

| Token | Famiglia · peso | Dimensione / interlinea | Uso |
|---|---|---|---|
| `t-title` | Unbounded 800 | 28 / 1,05 · ls −0,03em | titolo di schermata (uno per pagina) |
| `t-section` | Unbounded 700 | 19 / 1,15 | titolo di sezione |
| `t-big` | Unbounded 800 | 38 / 1 · ls −0,04em | numero dei timbri («7»); «su 10» a 0,5em, 700, `text-2` |
| `t-prize` | Unbounded 800 | 38 / 1 (titolo dialog) · 28 / 1,1 (nome del premio) | dialog del premio |
| `t-code` | Unbounded 700 | 24 (cliente) · 22 (coda) · ls 0,04–0,06em | codice card |
| `t-wordmark` | Unbounded 800 | 18 · ls −0,03em | wordmark segnaposto |
| `t-body` | Instrument Sans 400 | 17 / 1,5 | corpo |
| `t-field` | Instrument Sans 500 | 17 | testo nei campi (≥ 17: niente zoom iOS) |
| `t-small` | Instrument Sans 400 | 15 / 1,35 (alert) · 14 (suggerimenti) | testo di supporto |
| `t-label` | Figtree 700 | 16 (label campo) · 14 (etichetta piccola) | label dei campi, etichette |
| `t-button` | Figtree 700 | 17 (16 compatto) / 1 | bottoni |
| `t-chip` | Figtree 700 | 13 / 1 | chip |
| `t-caption` | Instrument Sans 400 | **13** minimo | didascalie |

Regole: **nessun testo informativo sotto 13 px**. dir-i usa 12 px e 11 px nelle **etichette del mockup** («richiede backend», didascalie): non entrano nell'app. Due livelli netti di titolo (28/800 e 19/700): risolve L-3, N-2, R-3, R-7. Allineamento a sinistra; niente maiuscolo spaziato (eccezione: il titolo del dialog premio «PREMIO!», testo da approvare).

### 2.4 Spaziature

Base 4 px. Scala: **4 · 8 · 12 · 16 · 20 · 24 · 36 · 48 · 56**.

| Uso | Valore (dir-i) |
|---|---|
| Padding pagina | 20 sopra · **16 ai lati** · 56 sotto |
| Padding card | 16 (card della coda: 12) |
| Spazio tra sezioni | 36 |
| Spazio tra card / elementi impilati | 12–16 (**coda: 16**) |
| Spazio tra timbri | 10 |
| Label → campo | 6; campo → suggerimento 6 |
| Spazio tra azione primaria e secondaria | 12; **tra «Conferma» e «Rifiuta», e tra azione finale e «Annulla»: ≥ 16** |

Bootstrap: i `$spacers` di default non contengono 12/36: vedi `21b`.

### 2.5 Raggi

`r-sm` **12** (alert, bottoni stepper, esito) · `r-btn` **14** (bottoni, campi, card della coda) · `r-card` **18** (card, dialog standard) · `r-dialog` **28** (dialog del premio) · `r-pill` **99** (chip, preset) · tondi (timbri, avatar).

### 2.6 Bordi

Card 1,5 px `border` · campi **2 px** `field` · bottoni 1,5 px · **alert 3 px** (colore del tipo) · dialog del premio 2,5 px `prize-fg` · prima card della coda 2 px `text` · focus 3 px (non è un bordo).

### 2.7 Ombre ed elevazioni

Principio di dir-i: **nessuna ombra sulle card**; la separazione la fanno il bordo e il passaggio di tono.

| Livello | Cosa | Stile |
|---|---|---|
| 0 | pagina, card, alert, card della coda | nessuna ombra |
| 1 | menu a tendina (nuovo) | bordo 1,5 px `field` + `0 8px 24px rgba(10,6,3,.25)` (l'ombra è decorativa: il bordo separa) |
| 2 | dialog | scrim `rgba(10,6,3,.72)` + bordo; l'ombra «a gradino» di dir-i (`0 22px 0 -8px rgba(0,0,0,.25)`) è decorativa e facoltativa |

### 2.8 Z-index

Valori Bootstrap, nessuno nuovo: menu `1000` · banner/contatore sticky `1020` · fisso `1030` · dialog = **top layer del `<dialog>` nativo** (nessun z-index) · tooltip non usati.

---

## 3. Focus ring unico e bordi dei campi

**Focus ring (un token, un posto)**
- `:focus-visible { outline: 3px solid var(--app-ring); outline-offset: 2px; box-shadow: none }` su **tutto**: bottoni, link, campi, righe-link, voci di menu, chip-bottone, dialog.
- Blu (`#1d4ed8` / `#8fb0ff`), **diverso da arancione, rosso, rosa**: non si confonde con nessuno stato. Rapporti: 5,13–6,36 (chiaro), 6,17–8,53 (scuro) su pagina, card, piano e tinte; **dentro il dialog rosa** si usa `ring-on-prize` `#2b1408` (6,14:1).
- **Focus ≠ premuto ≠ hover ≠ aperto**: focus = anello esterno; premuto = fondo scuro + scala 0,98; hover = fondo più chiaro (solo puntatore); aperto = `aria-expanded` + fondo `surface-2` e bordo `text`.
- `:focus` senza `-visible` non disegna nulla (niente anello al tocco). Cambia route → il focus va su `<main>` senza anello (già oggi).
- Via l'alone doppio di Bootstrap (annulla l'anello oggi su `.form-control` e `.btn`, L-6): **richiede CSS custom**, non basta una variabile (`21b`).
- Esiti dell'addendum focus/pressed restano **[V]**.

**Bordi dei campi ≥ 3:1**
- `field` su card 4,89 / 4,87; su pagina 4,40 / 5,36; su `surface-2` 3,99 / 4,32 (tutti ≥ 3). Bordo **2 px** (oggi 1,30 / 2,26).
- Vale per: campi, campo quantità, stepper, secondario, chip neutro, timbro vuoto (tratteggiato), toggle.

---

## 4. Componenti

Convenzioni degli stati: **default · hover** (solo `@media (hover:hover) and (pointer:fine)`) **· focus · premuto · in lavorazione · errore · successo**. «n/a» = lo stato non esiste per quel componente (e perché). **Disabilitato non esiste** per i primari; per gli altri vedi la riga «minimo/non azionabile».

### 4.1 Bottone

Base: altezza **52** (compatto/coda **48**, dialog premio **58**), padding 0 20, raggio 14, bordo 1,5, Figtree 700 17, icona 1,25em, `gap 8`, larghezza piena su telefono. Tocco ≥ 44 sempre.

| Stato | Primario (`action`) | Secondario | Link | Pericolo pieno | Pericolo outline («Rifiuta») |
|---|---|---|---|---|---|
| Default | fondo `action`, testo `action-fg`, bordo `action-bd` | trasparente, testo `text`, bordo `field` | testo `link`, sottolineato, altezza 44 | fondo `danger-fill`, testo `danger-fg` | trasparente, testo e bordo `danger` |
| Hover (puntatore) | fondo `action-hover` | fondo `surface-2` | sottolineatura 2 px | fondo `danger-hover` | fondo `danger-tint` |
| Focus | anello `ring` 3 px, offset 2 | idem | idem | idem | idem |
| Premuto | fondo `action-pressed`, scala 0,98, 80 ms | fondo `surface-2`, scala 0,98 | testo `text` | fondo `danger-pressed`, scala 0,98 | fondo `danger-tint`, testo `danger-tt` |
| In lavorazione | **stesso aspetto pieno**; spinner a sinistra + testo di azione («Invio in corso…», «Elimino…» **solo** sulla conferma finale); `aria-busy="true"`; i tocchi extra sono ignorati dal codice (**[codice]**), **non** `disabled` | idem | spinner a sinistra del testo | idem | idem |
| Errore | n/a: l'errore sta nel campo o nell'alert, **mai** sul bottone | n/a | n/a | n/a | n/a |
| Successo | n/a: l'esito è nella riga di stato (`role=status`) o nell'esito in loco | n/a | n/a | n/a | n/a |
| Disabilitato | **MAI.** Con dati non validi il bottone resta pieno; al tocco: focus sul campo + messaggio | non usato | non usato | **MAI** (D20): il codice da 6 cifre è il gate | non usato |

Altre varianti
- **Icona sola** (burger, indietro, ✕): 44×44, raggio 12, bordo `field`, `aria-label` obbligatorio.
- **Stepper − / +**: 44×44 (dir-i). Al **minimo/massimo** non si sbiadisce: icona `text-2`, bordo `border`, `aria-disabled="true"`, tocco = nessun effetto + `role=status` «Minimo 1» **[codice]**. (CQ-7)
- **Preset di quantità** (1·2·5): pillole 36+ px di altezza con bordo `field`, area di tocco portata a 44 con padding **[V]**.
- **Il primario è uno solo per schermata.** Dove ci sono due azioni in sequenza (Visita: Wallet, poi richiesta) i **passi sono numerati** (1 · 2) e il primario passa al passo corrente (V-3); non due arancioni identici.
- **Filtri/toggle aperti**: fondo `surface-2` + bordo `text`, non arancione pieno (ST-6, S-3).
- **Menu e «Indietro»**: secondari, mai arancione pieno al focus/premuto (S-3).

### 4.2 Campo

Altezza **52**, raggio 14, bordo **2 px `field`**, padding 0 14, fondo `surface`, testo Instrument Sans 500 17. Label sopra (Figtree 700 16, sempre visibile). Suggerimento sotto (14, `text-2`).

| Stato | Aspetto |
|---|---|
| Default | come sopra; suggerimento visibile («Da 3 a 50 caratteri.») |
| Focus | anello `ring` 3 px offset 2; il bordo non cambia colore |
| Compilato | invariato |
| **Invalido** (unico pattern) | bordo `danger` 2 px + barra interna sinistra 4 px `danger` + **icona** warning-circle (fill, 22 px, `danger`) a destra nel campo + il **messaggio sostituisce il suggerimento** (stessa riga, `danger` 600, icona a sinistra); `aria-invalid="true"`, `aria-describedby` al messaggio; focus sul campo |
| In lavorazione | sola lettura; fondo `surface-2`, testo `text` (non sbiadito); spinner nel bottone |
| Successo | nessun verde sul campo; l'esito è la riga di stato sotto |
| Non azionabile (codice morto) | bordo **tratteggiato** `field`, fondo `surface-2`, testo «Codice non più valido»; non è opacità (C-5) |

- **Spazio del messaggio riservato**: sotto ogni campo con bottone sotto, riserva **2 righe** (40 px) per suggerimento/errore, così l'errore **non sposta il bottone** (L-8, C-4, CQ-10).
- Errori di **sistema** (rete, 5xx, 429) **non** rendono invalido il campo (N-4): campo neutro, messaggio nell'alert.
- Campo codice: Unbounded 700 28, cifre centrate, `letter-spacing` compensato con padding-left (nessun spostamento a sinistra), `autocomplete=one-time-code`, `inputmode=numeric`; **un solo campo, non 6 caselle**.
- Quantità (coda): stesso campo in versione compatta 44; frecce native nascoste.

### 4.3 Alert / avviso

Padding 12 14, raggio 12, **bordo 3 px**, testo 15/1,35, icona fill 22 px in alto a sinistra, titolo `<b>` a capo + testo.

| Tipo | Fondo / testo / bordo | Icona (Phosphor fill) | Ruolo ARIA |
|---|---|---|---|
| Errore | `danger-tint` / `danger-tt` / `danger` | x-circle | `role="alert"` |
| Avviso | `warn-tint` / `warn-tt` / `warn-tt` | warning | `role="status"` |
| Successo | `ok-tint` / `ok-tt` / `ok` | check-circle | `role="status"` |
| Info (promozione) | `info-tint` / `info-tt` / `info-tt` | info | `role="note"` |
| Premio | `prize-tint` / `prize-tt` / `prize-tt` | gift | `role="status"` |

Regole
- **Un alert non sta mai tra un campo e il suo bottone** (sposta il bottone, L-8): sta in cima alla card o sotto il bottone (errore di sistema).
- Distinzione «esito» e «stato»: «Richiesta approvata» (successo) ≠ «Premio disponibile» (premio, rosa): mai due scatole verdi (R-5).
- **Banner sticky** (connessione): avviso, `position: sticky; top: 0`, z-index 1020, con ora dell'ultimo aggiornamento.
- **Errore con codice** (coda): prefisso `<codice> · …`, ✕ da 44, una riga (ER-1).
- Stati: default, **hover/focus/premuto**: solo l'eventuale ✕ o il link interno (secondario compatto); in lavorazione/errore/successo: n/a (è il messaggio).

### 4.4 Card

`surface`, bordo 1,5 `border`, raggio 18, padding 16, nessuna ombra. Stati: **default**; **riga-link** (intera card tappabile, `min-height 56`, chevron): hover `surface-2` (puntatore), focus anello con offset, premuto `surface-2`; **in caricamento** = scheletro della stessa altezza (§4.12); errore/successo: n/a (alert dentro la card). Annidamento: **massimo due livelli** (pagina → card → alert); non card dentro card dentro alert (EL-1, ER-5): un messaggio d'errore di pagina è un alert, non una card con un alert.

### 4.5 Card timbri

Contenuto: nome del locale (**«richiede backend»**: ripiego = nessuna riga, D9) · **numero grande** `t-big` («7») + «su 10» + «ne mancano 3» (Figtree 700 `text-2`) · chip di stato a destra · griglia di timbri.

Griglia: **5 colonne**, spazio 10, timbri quadrati a tutta cella (≈ 62 px a 390), **10 posti** (o `stampsRequired`), righe bilanciate (5+5, 4+4). Oltre **20** posti il codice di oggi nasconde i timbri: resta numero + «ne mancano N» **[V]**. `role="img"` con `aria-label="7 timbri su 10"` (non «Timbri»).

Timbro (SVG 64×64, dir-i): **pieno** = disco `stamp` r29 + anello interno `stamp-ink` 55% 2 px + stella `stamp-ink` 28 px, rotazione deterministica ±5° per indice · **vuoto** = anello tratteggiato `field` (r27, 2,5 px, `2 6`, tondo) · **nuovo** = pieno + anello `stamp` 3 px che si espande una volta · **«ne mancano»** testuale, **nessun «prossimo» evidenziato** (scelta del proprietario in dir-i).

| Stato della card | Aspetto |
|---|---|
| **Pochi** (3 su 10, 2 nuovi) | 3 pieni (gli ultimi 2 «nuovi»), 7 vuoti; chip neutro «in attesa» se la richiesta è in attesa |
| **A metà** (5 su 10) | 5 pieni, 5 vuoti, «ne mancano 5» |
| **Piena** (10 su 10) | 10 pieni; chip premio «Al prossimo timbro» (gift fill); sotto alert premio «Premio disponibile: <nome>» **[nome già nel dato quando c'è]**; testo «Il prossimo timbro dà il premio» (**non** scrivere «11°» a mano: l'ordinale non va ricalcolato nel frontend, regola dei timbri solo in `splitStamps`; se serve, derivarlo da `stampsRequired`) |
| **Ultimo timbro appena aggiunto** | l'ultimo (o gli ultimi N) in stato «nuovo»: anello che si espande **una volta, 0,9 s** (nuovo: dir-i ha 1,2 s, sopra il limite di 1 s di D10); **audace**: riempimento in sequenza a 80–120 ms l'uno + «tonfo» (scala 1→1,15→1) ; **sobria**: solo l'anello; testo «+2 timbri» fuori dall'alert, come dato principale (R-7) |
| **Premio appena riscattato** | card a 0 su 10 (vuoti) **con riepilogo fisso in cima**: alert premio «Premio riscattato · <nome>» che **resta** dopo la chiusura del dialog (P-5, K-5) |
| In attesa | chip neutro «in attesa» con puntino che pulsa (opacità .35↔1, 1,4 s, infinito, fermo con reduced-motion) + «scade tra N min» (dato `expiresAt` già presente) |
| Caricamento | scheletro: stessa altezza (numero + 2 righe di 5 cerchi in `surface-2`), nessuno shimmer |
| Errore | alert errore sopra la griglia (pattern §5.1); la griglia non sparisce |

Rapporti: timbro pieno vs card 3,03 (chiaro) / 5,19 (scuro) · stella su timbro 5,45 / 5,71 · vuoto 4,89 / 4,87.

### 4.6 Dialog del premio

`<dialog>` nativo (focus trap, Esc, ritorno del focus: già oggi). **Non si chiude** con clic sul fondo. Sfondo scrim `rgba(10,6,3,.72)`.

Struttura (dir-i, **audace**): blocco **rosa** `prize` con contorno `prize-fg` 2,5 px, raggio 28, padding 22 18 18 e **126 px in alto riservati ai coriandoli** → chip «Premio riscattato» (fondo `prize-fg`, testo rosa, icona seal-check fill, 32 px) → titolo `t-prize` 38 → **nome del premio** 28 → riga «Nome del locale» (**richiede backend**) → riga «Lo staff lo sa già: ti consegna il premio.» (suggerimento, da approvare; sostituisce «mostra questa schermata», D12) → bottone «Perfetto» (fondo `prize-fg`, testo rosa, 58 px). **Senza icona regalo e senza disco arancione** (scelta del proprietario).

| Stato | Aspetto |
|---|---|
| Apertura (audace) | dissolvenza 0,3 s + coriandoli CSS: **durata 1,2 s con ritardi 0–300 ms ⇒ fine a 1,5 s** (dir-i: 1,5 s di durata + ritardi fino a 300 ms = 1,8 s: **ridotto** per rispettare D10); easing `cubic-bezier(.2,1.4,.4,1)` |
| **Sobria** (variante D10, e ripiego di `prefers-reduced-motion`) | stesso blocco rosa, **nessun coriandolo, nessun movimento**, apparizione istantanea |
| Focus | il focus iniziale va su «Perfetto»; anello `ring-on-prize` |
| Premuto | bottone: scala 0,98, fondo `prize-pressed` solo se non è il bottone inchiostro (il bottone «Perfetto» scurisce con `brightness(.9)`) **[V]** |
| In lavorazione / errore / successo | n/a (nessuna richiesta di rete nel dialog) |
| Dopo la chiusura | **il riepilogo resta sulla card** (§4.5); il dialog non si riapre (flag come oggi) |

Vibrazione `[40,60,40]`: solo extra (non su iOS, [V]); nessun suono. Colori dentro il dialog: chip e alert usano `prize-fg` come fondo e rosa come testo (6,14:1), **non** i colori del tema (in scuro darebbero poco contrasto).
**Dialog standard** (conferma): `surface`, raggio 18, bordo 2 px (`border` in chiaro, `field` in scuro: serve in scuro, 5,79 vs 1,19), titolo `t-section`, bottoni a tutta larghezza, azione sicura prominente.

### 4.7 Chip e chip di stato

Altezza 32, padding 6 9, raggio 99, Figtree 700 13, icona SVG 16 + testo, bordo 3 px (come gli alert: chip di stato `warn`/`ok`) o 1,5 px.

| Chip | Fondo / testo / bordo | Icona |
|---|---|---|
| neutro / «in attesa», «scaduta», «1°» | `surface-2` / `text` / `field` | clock |
| avviso («scade tra 4 min», ultimo minuto, «Nuova promozione») | `warn-tint` / `warn-tt` / `warn-tt` | clock / warning |
| approvata | `ok-tint` / `ok-tt` / `ok` | check-circle fill |
| rifiutata («Non confermata») | `warn-tint` / `warn-tt` / `warn-tt` | x-circle |
| **premio** | `prize` / `prize-fg` / `prize-bd` | gift fill |
| conteggio («3 in coda») | neutro | — |

Il glifo non è mai testo Unicode (✔ ⚠ ⏱ …): sempre SVG `aria-hidden`; il testo dice lo stato. Condiviso da coda, esito e storico (ST-2, SH-2).

### 4.8 Riga / elemento di lista e Storico

**Riga**: `min-height 56`, padding 12 16, separatore 1,5 `border`. Cliente: **locale** · ora · chip di stato · «2 timbri · 1 premio riscattato». Staff: **codice** (`t-code` 16–18) al posto del locale (ST-15). Riga con premio: chip «Premio» + nome (**[backend]**) e fondo `prize-tint` a sinistra (barra 4 px `prize`) (ST-3).
**Raggruppamento per giorno**: intestazione sticky Figtree 700 14 `text-2` («Oggi», «Ieri», «20 ottobre»), poi righe compatte con ora breve («14:14»); data lunga solo in tooltip/aria. Su schermo largo → tabella (§7).
Stati riga: default · hover (`surface-2`, puntatore) · focus (anello) · premuto (`surface-2`) · n/a in lavorazione/errore/successo (non azionabile oggi: ST-4).

**Pannello filtri** (`RequestHistory`, condiviso): toggle secondario «Filtri · 2» (conteggio) con `aria-expanded`; **chip rimovibili** dei filtri attivi sotto la barra (✕ 44); «Azzera» è un link; panel `surface`, etichette visibili, `fieldset/legend`; **errore sotto il campo colpevole** (pattern §5.1, pannello che si apre da solo sull'errore); con filtri non validi la lista è sostituita da «Correggi i filtri» (ST-10). Preset del periodo («Oggi», «Ultimi 7 giorni») **[codice]**.
**Lista lunga**: «Carica altri» = **[backend]** (D21 paginazione); finché non c'è, nessun limite lato UI (ST-5).

### 4.9 Header e menu

**Header**: altezza 56; sinistra wordmark segnaposto (`t-wordmark`) o, nell'area staff, **nome del locale attivo** come chip tappabile (cambio locale, MN-4/D33); destra burger 44. Titolo dello **Storico staff include il nome del locale** (MN-5, SH-5). «Indietro»: icona arrow-left 44, secondario.
**Burger**: default (bordo `field`) · hover (`surface-2`) · focus (anello) · **aperto** (`aria-expanded`: `surface-2` + bordo 2 px `text`) · premuto (scala 0,98) — aperto ≠ focus ≠ premuto.
**Menu a tendina**: `surface`, bordo 1,5 `field`, raggio 14, ombra livello 1, **larghezza minima 220 px** (oggi ~120 e copre il titolo), voci `min-height 48`, icona + testo, voce attiva = `aria-current` con fondo `surface-2` e barra 4 px `action` (non arancione pieno), separatore sopra **«Esci»** (testo neutro, ultima voce, lontana dalle altre; D32 aperta); segnaposto delle voci finché i ruoli non sono noti (MN-3, PR-8); chiusura con Esc e tocco fuori.

### 4.10 Header di pagina e passi (/scan, Visita)

`/scan` (D14): icona del gesto (telefono + tag NFC + QR; Phosphor `hand-tap`/`qr-code`, 48) + frase «Avvicina il telefono al tag o inquadra il QR» + **tre passi compatti** (cerchio numerato 28 in Unbounded + testo): «1 Avvicina il telefono al tag · 2 Entra con la tua email · 3 Chiedi il timbro e salvalo in Google Wallet». Solo UI. Visita (D15 rimandata): due passi numerati con il primario sul passo corrente; al ritorno da Wallet una riga «Fatto? Ora chiedi il timbro» che **non** dichiara l'esito (CONTEXT §4.6).

### 4.11 Card della coda staff

Tutta la gerarchia è in `10-critique-staff.md`; qui la specifica dir-i compatta. Card: `surface`, bordo 1,5 `border`, raggio 14, padding 12, gap interno 12; **prima card**: bordo 2 px `text` + chip «1°». Distanza tra card **16**.

Struttura (dall'alto): riga meta [chip «1°» · «da 2 min» (13) … «scade tra 6 min» (13; chip avviso nell'ultimo minuto)] → **codice** `t-code` 22 a gruppi («44EE 7A5B»; il testo selezionabile/copiabile è senza spazio) → [se premio] chip «Premio» + «**Consegna: Caffè gratis**» (700; nome: **[backend]** D29, ripiego «Consegna: premio») → [se promozione] pillola «Nuova promozione: la card riparte da zero» → riga **stepper**: − · valore (Unbounded 700 22) · + · preset 1·2·5 · etichetta «prodotti consumati (premio compreso)» → **Conferma {N} timbro/i** (primario, icona check, **48**) → **Rifiuta** (pericolo outline, **48**, **16 px sotto** Conferma; dir-i aveva 10).

| Stato | Aspetto |
|---|---|
| Default | come sopra |
| **Nuova** | chip «Nuova» (`action`) per 3 s sulla card; il **contatore sticky** si aggiorna; se la card è fuori schermo compare «↓ 1 nuova» (tocco = scorrimento) |
| Hover (puntatore) | solo sui bottoni |
| Focus | anello sul controllo; `aria-label` con il codice (già oggi, mantenere) |
| Quantità invalida | messaggio **al posto** dell'etichetta («Da 1 a 50.»), campo invalido (§4.2); niente spostamento; **Conferma resta attivo**: al tocco focus sul campo (CQ-10, CQ-11) |
| Quantità alta | oltre la soglia (**5, da validare con lo staff [V]**) riga di avviso «Stai confermando 25 prodotti»; non calcola timbri né premi (la regola è in `splitStamps`) |
| In lavorazione (**solo questa card**) | «Conferma» con spinner + «Invio…», pieno; le altre card restano attive (CQ-19; [V] perché oggi si bloccano tutte) |
| **Esito** (§ sotto) | la card diventa esito in loco |
| **Scaduta / Già gestita** | la card **resta al suo posto** con la stessa altezza; i controlli sono sostituiti da «Scaduta» / «Già gestita da un collega» (chip neutro + icona) e da «Chiudi»; nessun tocco la rimuove tranne «Chiudi» (D25 default) |
| Errore su questa card | riga di errore **dentro** la card, con spazio riservato (§5.1) |

**Esito in loco** (stessa posizione, comprime solo la card toccata, mai le altre): alert successo 3 px `ok` «Confermata · +2 timbri» (o premio rosa: chip + «Consegna: Caffè gratis») con **barra a tempo** 4 px `ok` che si consuma in **4 s** (lineare; reduced-motion: niente barra, solo testo «Annulla (4 s)») + bottone secondario **«Annulla»** 48. Dopo 4 s resta una **riga quieta** «Gestita 14:32 · +2 timbri» con ✕ «Chiudi» 44 (non sparisce da sola; con ≥ 2 esiti «Chiudi tutti»). Rifiutata: stesso schema, tono avviso: «Rifiutata · nessun timbro».
Onestà sull'annulla: «Annulla» funziona solo se **l'invio è ritardato di 4 s** (D27 a, **[codice]**; consigliato per «Rifiuta» e per Conferma con quantità alta). Un annulla **dopo** un invio immediato = annullamento vero lato backend (D27 b, **[backend]**, decisione di prodotto): **non lo assumo**.

**Contatore e banner (sticky, in cima)**: «3 in coda · la più vecchia da 2 min» (chip neutro nel header) · banner avviso «Connessione assente: la coda potrebbe non essere aggiornata (ultimo aggiornamento 14:32). Riprovo…» sticky (ER-4) · coda vuota: puntino che pulsa + «In ascolto · aggiornato alle 14:32» (CQ-17).

### 4.12 Stati vuoti, caricamento, scheletri, toast

**Stato vuoto / pagina di errore**: icona 48 `text-2` + titolo (`t-section`) + testo + **azione primaria** (+ secondaria sempre presente: «Vai alla pagina iniziale»). Varianti: `/scan` (§4.10), 404 / link non valido / sessione, storico **«non hai richieste»** vs **«nessun risultato con questi filtri»** (+ «Azzera filtri» nella card, ST-11), coda vuota (§4.11).
**Caricamento**: *pagine/card* = scheletro con la **stessa altezza** della card finale (blocchi `surface-2`, raggio 12, nessuno shimmer) e titolo già noto (CQ-18); *bottoni* = spinner (1,1em, bordo 2,5 `currentColor`, 0,8 s lineare, fermo con reduced-motion → testo «…»); *ricaricamenti* (filtri, polling) = barra sottile 3 px `action` in cima alla lista, la lista non si attenua (opacità = contrasto perso). `aria-busy` sul contenitore.
**Toast: non servono.** Un messaggio che sparisce da solo viola il tempo di lettura (WCAG 2.2.1), copre i controlli sotto il pollice e non è annunciato in modo affidabile. Si usano: riga di stato in loco (`role=status`, resta finché non si interagisce), esito in loco della coda, alert. Unica eccezione di «cosa a tempo»: la barra dell'annulla.

---

## 5. Pattern

### 5.1 Errore e stato invalido: una regola per tutta l'app

| Tipo | Dove | Forma | Esempio |
|---|---|---|---|
| **Del campo** (dato sbagliato) | sotto il campo, al posto del suggerimento | bordo `danger` + barra + icona nel campo + messaggio con icona, `aria-invalid`, focus sul campo | «Controlla l'indirizzo: manca la @ o il dominio.» |
| **Di sistema** (rete, 5xx, 429) | alert errore **in cima alla card**, mai tra campo e bottone | `role=alert`: **che cosa** non è andato + **che cosa fare** + azione («Riprova» solo dove serve); il campo **resta neutro** | «Connessione non riuscita. Riprova: il tuo codice è ancora valido.» |
| **Di pagina** (404, link non valido, sessione) | pagina stato-vuoto | titolo + testo + **sempre un'uscita** | «Pagina non trovata» + «Vai alla pagina iniziale» |
| **Della coda** | dentro la card interessata / banner sticky | prefisso con il codice, ✕, una riga | «9Q23TSZG · Richiesta non più valida» |
| **Del filtro** | sotto il campo colpevole | come «Del campo»; pannello aperto da solo | «Il minimo non può superare il massimo.» |

- **429**: un solo formato: alert avviso «Hai fatto troppe richieste: riprova tra N min.» e, nel bottone primario (che **resta pieno**), l'etichetta «Riprova tra N min»; il tocco prima della scadenza dà una riga di stato «Aspetta ancora N min», non un bottone spento.
- Nessuna card dentro una card per un messaggio; nessun «Errore interno» nudo.
- L'errore sparisce quando l'utente modifica il campo e il valore diventa valido (non a ogni tasto, non al blur).

### 5.2 Validazione al tocco

1. Mentre si scrive: nessun errore (salvo il limite fisico del campo).
2. Al tocco del primario con valore non valido: **non si invia**, il focus va al campo, compare il messaggio sotto (§4.2), annunciato con `role=alert`.
3. Il campo codice a 6 cifre: invio automatico al sesto nel Login; in **Elimina account non si invia da solo** (freno voluto).
4. Con meno di sei cifre «Elimina definitivamente» è premibile: il messaggio è «Scrivi le 6 cifre.» (D20).

### 5.3 Conferma di azioni distruttive (Elimina account)

1. **Pagina di avviso**: alert di avviso con icona (irreversibilità, «Non si può annullare.» in riga a sé), poi **elenco** di cosa succede (**testo da validare con chi segue la privacy: non lo invento**, D18; segnaposto «[da validare]»). Primario **neutro/arancione**: «Continua: invia il codice» (**non rosso**, D19). Sotto, a 16 px, **«Torna al profilo» secondario a tutta larghezza**.
2. **Passo del codice**: «Abbiamo scritto a <email>…» (`text-break`), campo codice, link «Invia un nuovo codice» **sopra** il campo (lontano dal pericolo), **«Elimina definitivamente il mio account»** (pericolo pieno, sempre attivo), ≥ 16 px sotto «Torna al profilo». **Il rosso pieno compare solo qui.**
3. Codice morto (scaduto/tentativi finiti): sparisce «Elimina…» e al suo posto «Invia un nuovo codice» a tutta larghezza (C-5).
4. Durante il reinvio il testo è «Invio…» sul **link**; «Elimino…» solo sul bottone finale (EL-7/C-6).
5. **[codice]** il codice digitato **non si cancella** su errore di rete (solo su «codice non valido») — comportamento, va concordato come test (TDD), **non risolvibile con la UI**.
6. Uscita: rotta `profile` esplicita, non `router.back()`.
Regola generale (pattern 30): per ogni coppia azione/azione negativa: peso diverso, ≥ 16 px, annulla o secondario prominente.

### 5.4 Feedback dopo un'azione

| Azione | Feedback |
|---|---|
| Salva nome | riga `role=status` sotto la card «Nome aggiornato» (check-circle) che resta finché non si interagisce; focus torna al bottone «Modifica nome» |
| Invio codice / reinvio | stato nel link/bottone («Invio…») poi riga «Nuovo codice inviato.» al posto del sottotitolo |
| Richiesta di timbro | pagina `/r/:id`: chip «in attesa» vivo + «scade tra N min» |
| Timbro approvato | alert successo + «+N timbri» come dato principale + timbri «nuovi» |
| Premio | dialog (§4.6) poi riepilogo fisso sulla card |
| Conferma/rifiuto (staff) | esito in loco con annulla a 4 s poi riga «Gestita» |
| Ritorno da Wallet | riga «Fatto? Ora chiedi il timbro» (non dichiara l'esito) |
| Eliminazione completata | alla pagina di login: alert successo «Account eliminato. Puoi sempre rientrare con la tua email.» (già oggi, mantenere) |

### 5.5 Caricamento e ruoli non noti

Segnaposto (scheletro) per ciò che dipende da `GET /venues/mine`: la riga «Storico richieste» e la zona «Elimina account» **non appaiono prima di sapere** (isMember), niente salti (PR-8, MN-3). **[codice]**.

### 5.6 Ordinamento e aggiornamento della coda

- **Ordine**: arrivo (FIFO, la più vecchia in alto, limite 50): non cambia mai per effetto di un aggiornamento.
- **Nuova richiesta**: si aggiunge in fondo; segnali **sobri** (D28 default): contatore sticky aggiornato, chip «Nuova» 3 s, «↓ N nuove» se fuori schermo, titolo scheda «(N)» (già oggi). Suono/vibrazione/Wake Lock = audace, **[V]** iOS e permessi, non nel default.
- **Niente salti sotto il dito** (pattern 36, D25): (a) richieste scadute o già gestite altrove **non spariscono**: restano «Scaduta»/«Già gestita» con la stessa altezza fino a «Chiudi»; (b) l'esito **non** sparisce dopo 8 s; si comprime in una riga quieta; (c) lo spazio degli errori è riservato; (d) `overflow-anchor: auto` e, **[V]**, i tocchi nei 300 ms dopo un cambio di layout sono ignorati (audace). (a)–(c) richiedono **[codice]** (misurare e congelare l'altezza), non bastano token.
- Titolo del locale noto subito; nessuna card prima di conoscere il locale (CQ-18).

---

## 6. Movimento

**Principi**: il movimento dice «è successo qualcosa» o «sto lavorando», non decora. Solo **CSS** (`transition`/`@keyframes`), nessuna libreria. Un solo elemento in movimento alla volta, tranne i coriandoli.

| Token | Durata | Easing | Uso |
|---|---|---|---|
| `motion-press` | 80 ms | `ease-out` | scala 0,98 del bottone premuto |
| `motion-state` | 150–200 ms | `cubic-bezier(.2,0,0,1)` | hover, menu, cambio di stato |
| `motion-dialog` | 300 ms | `cubic-bezier(.2,0,0,1)` | dissolvenza del dialog |
| `motion-new` | **900 ms**, 1 volta | `ease-out` | anello del timbro «nuovo» (dir-i: 1,2 s → ridotto a 0,9 s) |
| `motion-confetti` | 1,2 s + ritardi ≤ 300 ms = **≤ 1,5 s** | `cubic-bezier(.2,1.4,.4,1)` | coriandoli (D10: **solo il premio audace**) |
| `motion-pulse` | 1,4 s, infinito | `ease-in-out` | puntino «in attesa» / «in ascolto» (opacità .35↔1) |
| `motion-spin` | 0,8 s, infinito | lineare | spinner |
| `motion-undo` | 4 s, lineare | — | barra dell'annulla |

Regole
- Ogni effetto ordinario **< 1 s**; il solo premio audace arriva a **1,5 s** (D10). Nessun movimento su elementi di testo.
- **`prefers-reduced-motion: reduce`**: niente coriandoli, niente dissolvenza, niente anello espandente (il timbro «nuovo» ha un anello fisso più spesso), niente pulsazione (puntino fisso pieno), niente spinner rotante (testo «…»), barra dell'annulla sostituita dal testo «Annulla (4 s)», scala del premuto 1. Il dialog diventa la **variante sobria**. Snippet in `21b`.
- La **vibrazione** (`navigator.vibrate`) è un extra: mai la sola conferma; non su iOS.
- **Niente suono** di default.

---

## 7. Responsive

Provvisorio: i layout grandi si decidono nelle chat 7 (tablet) e 8 (desktop); qui solo token e regole. D7: A + C; D31 aperta.

| Breakpoint (Bootstrap) | Dispositivo | Contenitore |
|---|---|---|
| < 576 | telefono | colonna unica a tutta larghezza, gutter 16, **390 px di riferimento**, nessuno scroll orizzontale a 360 |
| 576–767 | telefono grande / tablet verticale | colonna centrata, max **28 rem** (come oggi, `.narrow`) |
| 768–991 | tablet | cliente: colonna max **36 rem**, centrata (login centrato in verticale); staff: **coda + dettaglio** affiancati (D31 proposta) |
| ≥ 992 | desktop | cliente: colonna 36 rem su fondo `bg`; staff: **tabella** (codice · da N min · timbri · quantità · Conferma/Rifiuta) e Storico affiancabile; contenitore max 1100 |
| ≥ 1200 | desktop largo | stesso, max 1100 |

Griglia: 12 colonne Bootstrap, gutter 16 (24 da `md`). **Navigazione**: telefono = header + burger; tablet = header + burger (barra laterale per lo staff, opzione); desktop = voci orizzontali nell'header (≥ 992) con «Esci» separato.
**Hover e stati del puntatore** solo da `@media (hover:hover) and (pointer:fine)`: sul telefono non esiste «hover appiccicoso»; da tablet in su con mouse compaiono hover, cursor, scorciatoie da tastiera (Invio = conferma la prima; `+`/`−` = quantità) **[codice]**. Target ≥ 44 anche su desktop (non si riducono a 32).
**Coda su schermi larghi**: lista compatta a sinistra (codice · da N min · chip), **dettaglio a destra** con «Conferma» grande; oppure tabella; la card del telefono resta solo < 768. Il timbro cresce fino a 72 px; la griglia resta a 5 colonne (max 20 posti in 4 righe).
**Niente salti**: le regole di §5.6 valgono anche in tabella (la riga «Scaduta» resta).

---

## 8. Copy

**Tono**: diretto, caldo, frasi corte, mai infantile, mai colpevolizzante («Capita: riprova quando vuoi»). Il premio può essere più festoso del resto; la **coda staff resta neutra e tecnica** (nessuna esclamazione).
**Struttura di un messaggio d'errore**: *[che cosa è successo] + [che cosa fare]*, con il **perché** quando serve («Hai fatto troppe richieste: riprova tra 3 min.»). Mai «Errore interno» da solo; mai gergo; il Riprova solo dove ripetere serve.
**Un verbo** per il premio (D23): stato **«riscattato»**, istruzione allo staff **«Consegna»**; «ritirato» e «ottenuto» non si usano.

Le stringhe del codice **restano come sono** finché il proprietario non decide (AGENTS.md). Le proposte sotto (da `10-critique-*` e da dir-i) sono **suggerimenti da approvare**:

| Dove | Oggi (letterale) | Proposta |
|---|---|---|
| Login, errore email | «Email non valida» | «Controlla l'indirizzo: manca la @ o il dominio.» |
| Login, 429 | «Riprova tra 3 min» | «Hai fatto troppe richieste: riprova tra 3 min.» |
| Codice | «Abbiamo scritto a X. Il codice vale 5 minuti.» | + «Non arriva? Controlla anche lo spam.» |
| Codice, ultimo tentativo | «Ti resta 1 tentativo» | «Ultimo tentativo.» |
| Codice reinviato | «Codice inviato a …» | «Nuovo codice inviato.» |
| Sessione | «Connessione non riuscita, riprova» | titolo «Connessione non riuscita» + «Controlla la connessione. Se continua, riprova tra poco.» + «Riprova» |
| 404 | «Pagina non trovata» / «Controlla il link, oppure avvicina di nuovo il telefono al tag.» | + bottone «Vai alla pagina iniziale» |
| `/scan` (D14) | «Scansiona il tag di un locale per avere la tua card» | «Avvicina il telefono al tag o inquadra il QR» + 3 passi |
| Visita | «La tua card è pronta» · «Salvala in Google Wallet…» | passi «1 Salva la card · 2 Chiedi il timbro» |
| Visita, ritorno | — | «Fatto? Ora chiedi il timbro» (non dichiara «aggiunta») |
| Errore generico | «Errore interno» | «Qualcosa non ha funzionato. Riprova tra un attimo.» |
| Visita, 429 | «Troppe richieste. Riprova tra 25 min.» | tempo nel bottone secondario |
| Link non valido | «Questo link non è valido.» | + «Avvicina di nuovo il telefono al tag del locale.» + bottone |
| Nessuna promozione | «Questo locale non ha promozioni attive in questo momento.» | «Questo locale non ha un'offerta attiva al momento.» |
| Richiesta in attesa | «Richiesta inviata» · «La richiesta resta valida solo per pochi minuti…» | «Aspettiamo la conferma dello staff» · «Scade tra 4 minuti» |
| Approvata | «Richiesta approvata!» · «+2 timbri aggiunti» | «+2 timbri» come dato principale |
| Premio disponibile | «Premio disponibile» · «Il prossimo prodotto è gratis: mostra questa schermata al personale.» | + nome del premio (dato presente); la frase resta (lo staff deve essere avvisato) |
| Solo premio | «Nessun nuovo timbro: questo prodotto era il premio.» | «Premio riscattato: <nome>.» |
| Dialog premio | «Premio sbloccato!» · «Hai ottenuto il premio:» · «mostra questa schermata al personale» | chip «Premio riscattato» · titolo da decidere («PREMIO!» in dir-i) · «Lo staff lo sa già: ti consegna il premio.» (la frase «mostra…» si toglie, D12) |
| Promozione (cliente) | «Nuova promozione! La card riparte da zero.» | + «dopo la conferma» **[V]** |
| Profilo | «Zona pericolosa» | «Elimina l'account» (sezione) |
| Elimina | «Annulla» · «Elimina il mio account» · «Invia il codice» | «Torna al profilo» · «Elimina definitivamente il mio account» · «Continua: invia il codice» |
| Elimina, motivo | «Per motivi sicurezza dovrai…» | «Per sicurezza ti mandiamo un codice via email: lo userai per confermare.» (testo di cosa viene eliminato: **da validare**, D18) |
| Elimina, errore rete | «Connessione non riuscita, riprova» | «…Riprova: il tuo codice è ancora valido.» (solo se il codice si conserva) |
| Membro | «Questo account gestisce un locale e non può essere eliminato da qui.» | + cosa fare **[V]** (B4b) |
| Storico, vuoto | «Nessuna richiesta trovata.» | «Non hai ancora richieste. Quando chiedi un timbro, la vedrai qui.» / «Nessun risultato con questi filtri.» |
| Storico, titolo | «Le tue richieste» · «Storico richieste» | un nome solo |
| Coda, vuota | «Nessuna richiesta in attesa.» | «Nessuna richiesta in attesa · in ascolto» |
| Coda, quantità | «prodotto/prodotti» · «⚠ Quantità non valida: inserisci un numero intero da 1 a 50.» | «prodotti consumati (premio compreso)» · «Da 1 a 50.» |
| Coda, premio | «+3 timbri · Premio ritirato: Caffè gratis» | «Consegna: Caffè gratis» |
| Coda, card piena | «+1 timbro · Premio disponibile» | «Card completa: il prossimo prodotto è gratis» |
| Coda, rifiuto | «⚠ Richiesta rifiutata» · «Nessun timbro aggiunto.» | «Rifiutata · nessun timbro» |
| Coda, chiusura | «Ok» | «Chiudi» |
| Coda, errore | «Richiesta non più valida» | «<codice> · Richiesta non più valida» |
| Coda, esito incerto | «Esito non confermato: controlla la coda prima di riprovare.» | + «Se la richiesta non è più in coda, è già stata gestita.» |
| Coda, connessione | «Connessione non riuscita, riprova» | «Connessione assente: la coda potrebbe non essere aggiornata (ultimo aggiornamento 14:32). Riprovo…» |
| Coda, promozione | «Nuova promozione» | «Nuova promozione: la card riparte da zero» |
| Non autorizzato | link «I tuoi locali» | bottone «Vai ai tuoi locali» |
| Card piena (dir-i) | — | «Il prossimo timbro dà il premio» (non «11°»: l'ordinale non si ricalcola nel frontend) |

---

## 9. Accessibilità: regole minime

1. **Contrasto**: testo ≥ 4,5:1 su ogni fondo; testo grande ≥ 3:1; UI, bordi dei campi, focus, timbri ≥ 3:1 (tabelle §2.2). Se un colore non basta, si aggiunge un contorno, non si «dichiara decorativo».
2. **Target ≥ 44×44 px** (coda: Conferma/Rifiuta 48); ≥ 8 px tra target adiacenti, **≥ 16** tra azione e azione negativa.
3. **Focus** sempre visibile, uno solo (§3); ordine di tab = ordine visivo; il dialog porta il focus dentro e lo restituisce.
4. **Etichette**: ogni campo ha `<label>` visibile; i controlli senza testo hanno `aria-label` (quelli della coda includono il codice, mantenere); il numero dei timbri è letto («7 timbri su 10»), le decorazioni sono `aria-hidden`.
5. **Stato non solo colore**: icona SVG + testo (+ forma/bordo). Vale per errori, esiti, chip, premio, timbri (pieno/vuoto/nuovo si distinguono per forma).
6. **Annunci**: errori `role=alert`; esiti, caricamenti, successi `role=status`; il dialog del premio si apre senza azione dell'utente (polling): **[V]** con VoiceOver/TalkBack.
7. **Titolo del documento** diverso per ogni stato principale (login / codice / in attesa / approvata).
8. **Movimento** (§6): `prefers-reduced-motion`, nessun lampeggio > 3/s, nessun contenuto a tempo che si perde (niente toast; l'annulla è l'unica eccezione e ha alternativa testuale).
9. **Testo**: ≥ 16–17 px, ≥ 13 px per le didascalie; regge zoom al 200% senza scroll orizzontale **[V]**.
10. **Tastiera**: tutto raggiungibile; `Esc` chiude menu; `type=email/numeric`, `autocomplete`, `enterkeyhint` giusti.

---

## 10. Tracciabilità: critiche → design system

Colonna «Limite»: **UI** = si risolve con token/CSS; **codice** = serve logica nel frontend (Vue); **backend** = serve un dato/endpoint nuovo; **fuori** = non è design.

### Accesso (`10-critique-accesso.md`)

| # | Problema (Top 10) | Come lo risolve il DS | Limite |
|---|---|---|---|
| 1 | Bianco su arancione 3,19; link 3,19 | D1-a: testo scuro su `#f16417` (5,56/5,71) + `link` `#b43a0a`/`#f4813f` (§2.1–2.2) | UI (token) |
| 2 | Anello di focus debole | Anello blu unico 3 px (§3) | UI + CSS custom (Bootstrap annulla l'anello) |
| 3 | Stato invalido assente | Pattern §5.1, componente §4.2; messaggio al posto del suggerimento, spazio riservato | UI |
| 4 | Primario disabilitato | §4.1, §5.2 (mai disabilitato) | UI + **codice** (gestire il tocco) |
| 5 | «Accedi» + «Invia un nuovo codice» impilati | §5.3 punto 3 (codice morto: sostituisce) | **codice** (condizione di rendering) |
| 6 | Bordo campi 1,30/2,26 | `field` 2 px ≥ 3:1 (§3) | UI (token) |
| 7 | Titolo leggero | `t-title` 800/28, `t-section` 700/19 (§2.3) | UI |
| 8 | Copy | §8 | testo, da approvare |
| 9 | Nessun avanzamento; «Verifica…» in reinvio | spinner + testo distinto (§4.1, §5.3) | UI + **codice** (stato `busy` separato) |
| 10 | Layout tablet/desktop | §7 (provvisorio, chat 7-8) | UI (decisione aperta D7) |

### Cliente A (`10-critique-cliente-a.md`)

| # | Problema | Come lo risolve | Limite |
|---|---|---|---|
| 1 | Momento del premio | dialog rosa audace/sobria (§4.6), nome premio già presente, **riepilogo fisso** (§4.5), «Premio disponibile» in rosa (§4.3) | UI; **nome del locale: backend (D9)** |
| 2 | Timbro «nuovo» | stato «nuovo» (§4.5, §6) | UI |
| 3 | Pending vivo, «scade tra N min» | chip con puntino che pulsa, `expiresAt` (§4.5, §4.7) | UI (dato presente) |
| 4 | Nome del locale e premio nel percorso | segnaposto «richiede backend», ripiego senza riga (§4.5) | **backend** |
| 5 | Gerarchia | scala §2.3, numero grande | UI |
| 6 | Errore unico + uscita sempre presente | §5.1, §4.12 | UI + **codice** (distinguere Riprova) |
| 7 | `/name`: sempre attivo, errore al posto del suggerimento, errore di rete ≠ campo invalido | §4.2, §5.1, §5.2 | UI + **codice** (separare errore di campo/di sistema) |
| 8 | Visita: passi 1·2, ritorno da Wallet, scheletro | §4.10, §4.12 | UI |
| 9 | Dialog: separazione in scuro, anello, testo «mostra…» | bordo `field` in scuro, `ring-on-prize`, frase tolta (§4.6, §8) | UI; testo da approvare; il «va mostrato o no» è una domanda a **[V]** staff |
| 10 | Menu aperto ≠ focus; `/scan` | §4.9, §4.10 | UI |
| – | D16 card del locale con branding | non adottato (ripiego Stampy) | **backend** |

### Cliente B (`10-critique-cliente-b.md`)

| # | Problema | Come lo risolve | Limite |
|---|---|---|---|
| 1 | Elimina account (muro, rosso sul passo innocuo, uscita debole, grammatica) | §5.3 | UI; **testo legale: fuori (D18)**; «anonimizza ≠ elimina»: **fuori** |
| 2 | Card Wallet «Bar Aurora» falsa + bottone morto | nel DS resta come mockup etichettato «richiede backend» (§4.5) | **codice** (togliere il blocco): **non risolvibile con la sola UI**; possibile bug |
| 3 | Storico: righe per giorno, chip, premio evidenziato | §4.7, §4.8 | UI; nome premio **backend** |
| 4 | Filtri: errore accanto al campo, filtri attivi visibili, lista non stantia | §4.8, §5.1 | UI + **codice** |
| 5 | Codice cancellato su errore di rete; «Elimino…» falso | §5.3 punti 4-5 | **codice** (comportamento, TDD): non UI |
| 6 | Stati dello Storico (vuoto a due cause, scheletro, errore con Riprova) | §4.12 | UI + codice |
| 7 | Profilo: intestazione, segnaposto ruoli, conferma salvataggio | §5.4, §5.5 | UI + **codice** |
| 8 | Un solo danger; regola del disabilitato | `danger*` (§2.1), §4.1 | UI (token) |
| 9 | Lista lunga / paginazione | «Carica altri» (§4.8) | **backend (D21)** |
| 10 | Membro: zona bloccata con azione, «Esci» nel profilo, nome unico | §4.9, §8 | UI + testo; azione per i membri **[V]** (B4b) |

### Staff (`10-critique-staff.md`)

| # | Problema | Come lo risolve | Limite |
|---|---|---|---|
| 1 | Card che si spostano sotto il dito | §5.6, §4.11 (resta «Scaduta/Già gestita», spazio riservato, esito che si comprime) | **codice** (misurare/congelare altezza, `overflow-anchor`); non bastano token |
| 2 | Annulla per «Rifiuta», avviso quantità alte | §4.11 (invio ritardato 4 s) | **codice**; annullamento vero: **backend (D27b)** |
| 3 | Richiesta nuova, contatore, «da N min» | §4.11, §5.6 (sobrio) | UI + **codice**; suono/vibrazione: **[V]** |
| 4 | Codice grande (anche lato cliente, R-2) | `t-code` 22/24, gruppi (§2.3, §4.11) | UI + **codice** (formattazione) |
| 5 | «Conferma» sempre attivo, quantità invalida | §4.1, §4.2 | UI + **codice** |
| 6 | Premio come chip, esito «Consegna: …» | §4.7, §4.11 | UI; **nome del premio in coda: backend (D29)** |
| 7 | Banner connessione sticky, coda vuota viva | §4.3, §4.11 | UI + **codice** (ora ultimo aggiornamento) |
| 8 | Errori con codice e ✕ | §4.3, §5.1 | UI + codice |
| 9 | Locale attivo ovunque, cambio rapido, ricordare l'ultimo | §4.9 | UI; «ricordare» **[V]** (D33, rischio locale sbagliato) |
| 10 | Tablet/desktop | §7 | UI (decisione D31) |
| – | Nome del cliente in coda (CQ-2) | non adottato | **backend** (D30) |

**Problemi gravi per sezione, in una riga**: Accesso → colore, focus, stato invalido (token + §5.1) · Cliente A → premio senza traccia, timbri senza «nuovo» (§4.5–4.6) · Cliente B → Elimina, dato falso nel Profilo, Storico (§5.3, §4.8; il dato falso è **codice**) · Staff → salti di layout, nessun segnale/annulla, codice poco leggibile (§5.6, §4.11).

**Non risolvibile con la sola UI** (riassunto): nome del locale e del premio nelle schermate e nella coda, branding del locale (D9/D16/D29) · nome del cliente (D30) · annullamento vero (D27b) · paginazione e filtro per locale (D21) · conteggio per locale (LC-1) · togliere la card finta del Profilo (codice) · conservare il codice su errore di rete (codice, TDD) · testi legali di Elimina account (D18) · il fatto che l'eliminazione «anonimizza» (backend/privacy) · comportamento di Google (bottone ufficiale, D2: verificare la documentazione).

---

## 11. Decisioni ancora aperte

| ID | Stato | Alternative | Default usato in questo DS |
|---|---|---|---|
| D1 colore dei bottoni | implicita in dir-i, da confermare nel pilota | a testo scuro su `#f16417` (con bordo in chiaro) · b due toni `#c2410c` · c tutto `#c2410c` | **a**. Cambiare = sostituire `action*` e `link`; con b/c il bordo `action-bd` non serve |
| D6 chiaro caldo | implicita, da confermare | caldo (dir-i) · neutro Bootstrap | caldo |
| D10 premio sobrio/audace | implicita (audace), si provano entrambe | audace 1,5 s · sobrio (nessun movimento) | audace con sobria per reduced-motion |
| D11 accento premio | implicita (rosa) | rosa · teal/lime/oro (altre direzioni) | rosa `#ff5fa2` |
| D13 | **decisa** | — | `/name` solo se il nome non è salvato |
| D14 | **decisa** | — | gesto + 3 passi (§4.10) |
| D15 due passi della Visita | rimandata al design | espliciti numerati (oggi) · richiesta automatica dopo Wallet | espliciti numerati |
| D16 card del locale | proposta | A completa (backend) · B solo Richiesta · C ripiego Stampy (subito) · D pallini | C-compatibile: card senza branding |
| D25 salti di layout | non decisa | restano «Scaduta/Già gestita» fino a «Chiudi» · spariscono con ancoraggio | restano |
| D26 «Conferma» con quantità non valida | non decisa (regola globale: mai disabilitati) | sempre attivo · disabilitato | sempre attivo |
| D27 annulla | non decisa | a invio ritardato 4 s (solo Rifiuta/qtà alta) · b backend · c due passi su Rifiuta | a |
| D28 richiesta nuova | non decisa | sobria (contatore, «Nuova», titolo) · audace (suono, vibrazione, Wake Lock) | sobria |
| D29 nome del premio in coda | non decisa | backend (`reward` nella coda) · ripiego «Consegna: premio» | ripiego |
| D30 nome del cliente in coda | non decisa | sì · no · iniziali | no |
| D31 tablet/desktop staff | non decisa | coda+dettaglio e tabella · card di oggi ovunque | coda+dettaglio e tabella da `md` |
| D32 «Esci» | non decisa | separatore + stile neutro, con/senza conferma | separatore, senza conferma |
| D33 ricordare l'ultimo locale | non decisa | sì (rischio locale sbagliato) · ogni login dall'elenco | non ricordare |

Aperte non elencate nel brief ma che il DS incontra: D2 (Google: bottone ufficiale, rispetta le regole di Google, **da verificare** nella documentazione) · D3/D9 (nome del locale: backend) · D7 (layout grande) · D4 (testo privacy) · D18 (testi di Elimina).

### Cosa ho cambiato rispetto a dir-i (e perché)

| Elemento | dir-i | Qui | Perché |
|---|---|---|---|
| Anello «nuovo» | 1,2 s | **0,9 s** | effetti ordinari < 1 s (D10) |
| Coriandoli | 1,5 s + ritardi 300 ms = 1,8 s | **1,2 s + ≤ 300 ms = 1,5 s** | D10: audace ≤ 1,5 s |
| Scrim | `.62` | `.72` | dialog chiaro su scrim: rosa da 2,27 a 3,25 |
| Conferma in coda | 46 px | **48** | target staff |
| Distanza Conferma/Rifiuta | 10 | **16** | critica staff (CQ-15/ES-1) |
| Testo minimo | 11–12 px | **13** | leggibilità (le 11–12 erano etichette di mockup) |
| `aria-label` dei timbri | «Timbri» | «7 timbri su 10» | R-4 |
| Stato premuto del primario | `brightness(.88)` | `#db5a11` | `brightness` portava il testo a < 4,5 (il fondo `#d5560f` dava 4,37) |
| Menu | ~120 px | ≥ 220 | S-3, MN-1 |

### Non verificato

- PNG di dir-i **non aperti** da me: nessun giudizio sulla resa a schermo; Unbounded + Instrument Sans + Figtree insieme (101 kB) non provati su rete/dispositivi lenti.
- Canva: **disponibilità dei font non verificata** (vedi `22-brief-canva.md`).
- Cifre tabulari e ambiguità 0/O/1/I di Unbounded nel codice; titoli lunghi a 360 px.
- Focus/pressed/hover reali (forzati nelle anteprime); screen reader; vibrazione su iOS.
- Soglia «quantità alta» (5) e ritardo dell'annulla (4 s): scelte mie, da provare con lo staff.
- Licenza OFL: verificato solo il campo `license` di npm, non i file `OFL.txt`; Phosphor Icons **MIT** (pacchetto `@phosphor-icons/core` 2.1.1, verificato via npm).
