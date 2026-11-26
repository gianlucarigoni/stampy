# 23 · Stile visto dai PNG (chat 12)

2026-11-26. Solo design: nessun file dell'app toccato, nessun commit.
**Cosa ho guardato davvero** (aperto con Read, ritagliato in fette da 780×1500 per vederlo a grandezza reale):
`design-system/dir-i-light.png` e `dir-i-dark.png` (card timbri, dialog del premio, coda staff, alert, icone) e, tra gli originali in `screens/`,
`cliente/cliente/richiesta__approvata-con-timbri__light.png`, `…__approvata-premio-e-timbri-dialog-premio__light.png`, `staff/staff/coda__default-3-richieste__light.png`.
**Non ho aperto** le versioni scure degli originali (il layout è identico, cambiano i colori).
Dove cito un valore (px, hex) l'ho letto dall'HTML `dir-i.html` dopo averlo riconosciuto nel PNG; le misure «a occhio» sono segnate.

## 1. Cosa si vede in dir-i

**Griglia e ritmo.** Colonna unica 358 px su pagina da 390 (margine 16). Dentro le card padding 16 (coda 12). Il ritmo verticale è fatto di **blocchi separati da 14-16 px** e sezioni da ~36: si legge come una pila di «biglietti». I timbri stanno su 5 colonne con spazio 10: tondi quasi a contatto, **due file ordinate**, nessuna barra.

**Forma.** Tutto è **morbido ma con contorno deciso**: card a raggio 18 con bordo sottile quasi invisibile (1,5 px `#d6dac8`, 1,2:1: la card si riconosce dal tono più chiaro sul fondo, non dal bordo); campi, bottoni e card della coda a raggio 14; alert a raggio 12 con **bordo spesso 3 px nel colore del tipo** (verde, blu inchiostro, rosa vinaccia, giallo) — è il tratto più riconoscibile; chip a pillola con bordo 3 px. **Nessuna ombra sulle card.** Unica ombra: il dialog del premio ha una «lastra» scura sotto (`0 22px 0 -8px`), che nel PNG appare come un gradino sotto il rosa.

**Tipografia.** Tre voci nette. **Unbounded** (larghissima, pesante) per titolo, numero dei timbri, nome del premio, codice e wordmark: è il «volto» e rende la direzione non generica. «su 10» è la stessa Unbounded a metà dimensione, grigio caldo, che si stringe contro il numero. **Instrument Sans** per il corpo, morbida e neutra. **Figtree Bold** per chip, bottoni, etichette. Gerarchia a **due salti secchi**: numero 38 contro corpo 17; titolo del premio 38 contro nome 28. «PREMIO!» in maiuscolo è l'unico testo gridato.

**Timbri.** Disco arancione `#f16417` (r29 su 64), con **anello interno sottile scuro al 55%** (come il bordo di un timbro di gomma) e **stella piena a 5 punte nera**; ogni timbro è **ruotato di pochi gradi** (da −5° a +5°, ordine fisso), quindi la griglia non è rigida. Il posto vuoto è un **cerchio tratteggiato a puntini tondi** (`2 6`, tratto 2,5 px, colore `field`) più piccolo del disco (r27): sembra l'impronta dove cadrà il timbro. Nel PNG i due timbri «nuovi» **non si distinguono** dagli altri (l'anello animato è già sparito nel fermo immagine).

**Premio.** Un solo oggetto rosa `#ff5fa2` con **contorno inchiostro 2,5 px**, angoli molto tondi (28), **coriandoli** (cerchi da 12 px scuri, arancioni, bianchi, gialli) sparsi nella parte alta, chip scuro a pillola col testo rosa, «PREMIO!» in nero molto largo, bottone scuro a tutta larghezza col testo rosa. Lo spazio vuoto in alto dà respiro e fa da «cielo» ai coriandoli. Il rosa è **solo premio** (chip, alert in tinta rosa pallida con bordo vinaccia, dialog): nel resto dell'app non compare, per questo regge come momento speciale.

**Colore e densità.** Chiaro: carta calda `#f1ede0` con card quasi bianche `#fbf9f1` e piano salvia `#dfe5d2` per i chip neutri. Scuro: bruno `#1a1410`, card `#251d17`. Gli alert in scuro hanno fondo scuro tinto e **bordo chiaro** (rosa pallido, verde chiaro). Densità **media**: il telefono mostra poco per volta, tocchi grandi (bottoni 52, stepper 44). La coda staff è più compatta (padding 12, bottoni ~46) ma resta leggibile.

**Cosa la rende non generica:** (1) Unbounded enorme accanto a un corpo tondo; (2) alert e chip con bordo spesso colorato; (3) timbri ruotati con anello e stella, vuoti a puntini; (4) il rosa riservato al premio con coriandoli e gradino; (5) assenza di ombre e di sfumature.

## 2. Cosa si vede negli originali (l'app oggi)

- **Cliente, richiesta approvata**: titolo centrato «Stampy» arancione, burger con bordo arancione; card bianca con alert verde pallido «Richiesta approvata!» / «+2 timbri aggiunti»; timbri come cerchi pieni/vuoti **uguali** a contorno arancione sottile; riga «3 / 10 timbri»; «Codice card: 44EE7A5B» in grigio. Tutto il resto della pagina è vuoto (la card occupa il quarto superiore).
- **Dialog premio**: bianco con bordo arancione, «Premio sbloccato!» leggero, «Hai ottenuto il premio:» + nome in grassetto, «Mostra questa schermata al personale.», bottone «Chiudi» arancione scuro con testo bianco e alone di focus.
- **Coda staff**: titolo del locale «Bar Pasticceria Rossi» (nel locale il nome c'è davvero), card bianche con **codice a 8 caratteri senza gruppi** (`44EE7A5B`) in carattere normale, ora «14:14» + «scade tra 4 min» a destra, «1 / 10 timbri» del cliente, stepper − / campo / + con «prodotto» sotto, **«Rifiuta» e «Conferma» affiancati** (nessuna distanza tra i due, tutto a larghezza metà).

## 3. Discrepanze tra dir-i (HTML/PNG) e `21-design-system.md`

Regola: dove dir-i è stato scelto e il .md lo contraddice vale dir-i, **tranne** contrasti, target e focus. Per ognuna dico cosa ho fatto nel pilota.

| # | dir-i mostra | `21` dice | Esito nel pilota | Perché |
|---|---|---|---|---|
| 1 | Chip nel dialog premio a **11,5 px** (`.dlg.big-prize .chip`) e nel PNG il testo risulta **tagliato** («Premio riscatta…») | testo minimo 13 px | **13 px** (vince il .md) | regola di accessibilità (testo minimo); il taglio è un difetto del PNG |
| 2 | **Stella nera pura** sul timbro (il simbolo non eredita `currentColor`: il tracciato è senza fill → nero) | stella = `stamp-ink` `#2b1408` / `#1a1410` | **nero** come in dir-i (anello resta `stamp-ink`) | il PNG è ciò che il proprietario ha scelto; il contrasto è migliore (nero su `#f16417` ≈ 7:1, vedi 31) e non viola nessuna regola. **Da confermare: è un effetto accidentale del codice di dir-i** |
| 3 | Timbro **«nuovo» invisibile** nel PNG (l'anello è un'animazione che finisce a opacità 0) | anello che si espande 0,9 s | **anello fisso** attorno ai 2 timbri nuovi (come lo stato `reduced-motion`: «anello fisso più spesso») | un mockup statico deve mostrarlo; non è una decisione sul movimento |
| 4 | Numeri del codice con **trattino**: `K7M4-9Q2X`, Unbounded 700 | `K7M4 9Q2X` (spazio), 22-24 px | **trattino** (dir-i), 22 px nella coda | scelta visiva; il testo copiabile resta senza separatore (nota per l'implementazione) |
| 5 | Pillole preset 1·2·5 alte **32-36 px** | target ≥ 44 | **elemento da 44×44**, pillola disegnata dentro (visiva ~36) | accessibilità (target) |
| 6 | Bottoni della card coda `min-height: 46` | Conferma/Rifiuta **48** | **48** | accessibilità (target, regola «Conferma 48») |
| 7 | Distanza Conferma/Rifiuta **10 px** | ≥ 16 | **16** | già scostamento dichiarato in `21` §11 |
| 8 | Scrim `.62` (il box grigio del PNG chiaro) | `.72` | **.72** | già scostamento in `21`; con .62 il rosa chiaro su pagina chiara perde distacco |
| 9 | Chip «scade tra 4 min» col **vuoto** dove dovrebbe stare l'icona (simbolo mancante) e chip «1°» senza icona | chip con icona clock | **icona clock** su «scade tra N min»; «1°» senza icona (è un'etichetta d'ordine, non uno stato) | il vuoto è un difetto; la regola «mai solo colore» riguarda gli stati |
| 10 | Card piena: «**L'11° timbro** ti dà il premio» | «Il prossimo timbro dà il premio» (l'ordinale non si ricalcola nel frontend) | **testo del .md** | testo, non aspetto: già deciso in STATE (non usare «11°») |
| 11 | Stato del premio ancora «Al prossimo timbro» (chip rosa) con alert «Il prossimo timbro sblocca un premio.» | testo analogo | tengo i testi del .md (+ nome del premio) | coerenza col verbo del premio |
| 12 | Header della coda: solo wordmark (nessun burger) | burger 44 a destra | **burger 44** | dir-i è una demo di componenti; il burger esiste nell'app |
| 13 | Etichette «richiede backend» a **12 px**, bordo tratteggiato | solo mockup, fuori dall'app | **13 px**, tratteggiato | così passano anche la verifica automatica senza eccezioni |
| 14 | Rotazione dei timbri: solo sui pieni «non nuovi», valori fissi (−4, 3, −2, 5, −3, 2, −5, 4, −1, 3) | ±5° per indice | stessi valori di dir-i, anche sui «nuovi» | |
| 15 | Il dialog mostra la lastra scura sotto (`0 22px 0 -8px`) | ombra «a gradino» facoltativa | **tenuta** (dir-i) | decorativa; non tocca nessuna regola |
| 16 | «ne mancano 7» in **Instrument Sans 600 17 px** | Figtree 700, `text-2` | Figtree 700 17 px (.md) | differenza minima, dir-i usa il font del corpo; segnalata |
| 17 | Card coda: codice 22, stepper valore 22, tag «1°» tondo | stesso | stesso | nessuna discrepanza |

Nessuna decisione presa in silenzio: gli unici casi dove ho scelto contro il .md sono il 2 (stella nera, da confermare), il 4 (trattino) e il 15 (gradino).
