# 20 · Due direzioni visive (chat 9)

Anteprime: `dir-a.html`, `dir-b.html` (statiche; `?theme=dark` per lo scuro) e PNG a 390 px, scala 2: `dir-a-light.png`, `dir-a-dark.png`, `dir-b-light.png`, `dir-b-dark.png`.
Vincoli comuni: `20-vincoli.md`. Contrasti: `node contrasts-direzioni.mjs` (palette in `palettes.mjs`: unica fonte per numeri e anteprime).

**Assunzioni** (identità non fornita): tre aggettivi *caldo, rapido, affidabile*; riferimenti non indicati, quindi sono partito dal prodotto: carte a timbri di carta, locali di quartiere, tag NFC, staff sotto pressione, clienti occasionali. Il nome è un segnaposto (D5): wordmark testuale, nessun logo.

---

## Direzione A · «Carta e inchiostro» (la più sicura)

**Idea.** La carta fedeltà di carta che si tiene in tasca: fondo crema, inchiostro bruno, timbri tondi come impronte; morbida, ordinata, riconoscibile senza urlare.

**Palette** (contrasti da `contrasts-direzioni.mjs`; il `✓` indica soglia superata)

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Sfondo / card | `#fbf5ea` / `#fffdf8` | `#1a1410` / `#251d17` |
| Testo / secondario | `#2a1f18` 15,80 / `#6a5748` 6,73 (su card) | `#f4e9dc` 13,84 / `#c0ad9c` 7,66 |
| Link | `#b43a0a` 5,82 | `#f4813f` 6,36 |
| Bordo campo (UI) | `#857260` 4,52 | `#9a8878` 4,87 |
| Anello di focus (blu, unico) | `#1d4ed8` 6,59 | `#8fb0ff` 7,75 |
| Timbro pieno | `#e8590c` 3,52 | `#f16417` 5,19 |
| Danger (testo e bottone) | `#b3261e` 6,43 · bottone bianco 6,54 | `#ff8d82` 7,41 · bottone scuro 8,20 |
| **Premio** (D11) | teal `#0b6b7c`, testo bianco 6,16 | ciano `#5fd0e0`, testo scuro 9,12 |
| Alert (testo su tinta) | 8,70 – 10,94 | 10,30 – 11,12 |

Il premio è **teal**: lontano da arancione, rosso e verde di successo, sempre con icona regalo + testo.

**D1: le tre varianti** (mostrate tutte in `dir-a.html`)

| | Testo/fondo | Fondo vs pagina | Impressione |
|---|---|---|---|
| a · testo scuro su `#f16417` | 5,56 (chiaro) / 5,71 (scuro) | 2,94 chiaro (serve bordo `#9a3412`, 1,5 px) / 5,71 scuro | vivace; il più «brand» ma anche il più diverso da oggi |
| b · due toni | 5,18 | 4,77 / 3,52 | **il compromesso**: bottoni e link sobri, arancione vivo solo nei timbri |
| c · tutto `#c2410c` | 5,18 | 4,77 / 3,52 | il più coerente, meno vivace, timbri più cupi |

Nell’anteprima il primario è la **b** (assunzione), ma il design system funziona con tutte e tre senza cambiare altro.

**Tipografia**: **Figtree** (variabile, 300–900) per titoli e corpo + **IBM Plex Mono 600** solo per il codice del cliente. Titolo schermata 800/34/1,02 (−0,025 em), sezione 700/22, corpo 400/17, etichette 700/14, codice 600/30 con cifre tabulari. Peso: Figtree latin 20 KB + Plex 15 KB = **~35 KB**, 2 richieste. Costo di prestazioni minimo.

**Forma**: raggio card 18, campi e bottoni 14, chip pieni (pill); bordi 1,5 px (2 px sui campi), **nessuna ombra** sulle card (la separazione la fa il bordo caldo e il passaggio di tono), ombra solo sul dialog. Layout allineato a sinistra, padding 16, niente colonne centrate con vuoto.

**Timbri e premio**: timbri **tondi, a impronta** (disco arancione con anello e stella, rotazione ±5° diversa per ogni timbro); vuoti con anello a puntini (4,52:1), **prossimo** = anello pieno con pallino che pulsa, **nuovo** = anello che si espande una volta (1,2 s), ultimo = regalo; barra di avanzamento e «7 su 10 · ne mancano 3» in grande. Premio **sobrio** (D10): dialog con tondo teal, chip «Premio riscattato», titolo 30 px 800, nome del premio, pulsante «Perfetto»; il riepilogo resta sulla card.

**Card della coda**: card piatta, **codice in Plex Mono 30 px** a gruppi, «da 2 min · scade tra 6 min» sopra, chip «Premio» + «Consegna: Caffè gratis», stepper con preset 1·2·5, «Conferma 1 timbro» a tutta larghezza (48+ px) e «Rifiuta» in outline rosso sotto; la prima card ha bordo scuro 2 px e chip «1°»; esito con **barra** che si consuma e «Annulla» (4 s).

**Icone**: **Phosphor Icons, peso regular** (MIT; SVG inline, ~0,3 KB l’una; 1 set coerente con linea 16/256).

**Tono di voce**: diretto e caldo, frasi corte («Hai ancora 3 tentativi», «Ne mancano 3»), mai infantile.

**Perché è adatta**: per i clienti occasionali la metafora della tessera fisica è immediata; per lo staff il fondo caldo e i contrasti alti non stancano; richiede poco lavoro e non invecchia.

---

## Direzione B · «Biglietto da bar» (la più audace)

**Idea.** Un biglietto timbrato al banco: contorni netti da inchiostro, ombre dure, timbri di gomma storti e un **lime elettrico** riservato al premio; dà l’effetto «oggetto da tenere», non «modulo».

**Palette**

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Sfondo / card | `#f2e6cf` (kraft) / `#fff9ec` | `#12100e` / `#1e1a16` |
| Testo / secondario | `#17110d` 17,83 / `#5b4a3a` 8,05 | `#f6ecd8` 14,74 / `#bfae98` 8,01 |
| Link | `#a63306` 6,46 | `#ff9a5c` 8,26 |
| Bordo campo e card | inchiostro `#17110d` 17,83 | `#a89a86` 6,28 |
| Anello di focus (= testo, 3 px) | `#17110d` 17,83 | `#f6ecd8` 14,74 |
| Timbro pieno | `#f16417` 3,04 (con contorno inchiostro) | `#f16417` 5,41 |
| Danger | `#a8201a` 6,93 · bottone bianco 7,28 | `#ff8f84` 7,83 · bottone scuro 7,14 |
| **Premio** (D11) | lime `#c9f23a` testo scuro 14,47; **fondo vs card 1,23: regge solo con il bordo inchiostro 2 px** | lime `#d4f53c` testo scuro 15,08; fondo vs card 13,94 |
| Alert (testo su tinta) | 9,90 – 11,30 | 9,29 – 11,48 |

**D1**: in B ha senso soprattutto la **a** (arancione pieno con testo inchiostro, bordo e ombra dura inchiostro: 5,56/5,71); il fondo è tinta unita ed è proprio il contrasto con il contorno a dare identità. Con b/c il bottone diventerebbe bianco su ruggine e perderebbe l’effetto stampa; resta realizzabile, ma non ho prodotto l’anteprima.

**Tipografia**: **Bricolage Grotesque** (variabile, 200–800) per titoli e numeri, **Hanken Grotesk** (variabile) per il corpo, **Space Mono 700** per il codice. Titolo 800/40/0,95 (−0,035 em), sezione 800/24, corpo 500/17, codice 700/40. Peso: Bricolage 41 KB + Hanken 35 KB + Space Mono 17 KB = **~93 KB**, 3 richieste (circa 2,7 volte A). Accettabile ma da misurare su rete lenta; si può togliere Hanken e usare Bricolage anche per il corpo (−35 KB) se la leggibilità lo permette: da provare.

**Forma**: raggi **piccoli** (card 8, campi e bottoni 8, chip 4), bordi **2 px inchiostro**, **ombra dura a offset** (4 px / 4 px, nessuna sfumatura; premuto = il bottone si sposta sull’ombra); card della tessera con **tacche da biglietto** e linea di strappo; in scuro i bordi diventano `#8f8271` e l’ombra nera.

**Timbri e premio**: slot **quadrati numerati** (1-10); timbro = **bollo rotondo ruotato** con contorno inchiostro e stella; **prossimo** = slot rialzato con ombra arancione e stella che pulsa; **nuovo** = il riquadro si espande una volta. Premio **audace** (D10): dialog a tutto lime con riquadro regalo inclinato, titolo 44 px «Premio sbloccato!», coriandoli CSS 1,5 s (spenti con `prefers-reduced-motion`, che lo riduce a una variante sobria), chip «Premio riscattato» e pulsante inchiostro.

**Card della coda**: **codice in riquadro** (Space Mono 40 px) leggibile anche **a distanza**, cioè se il cliente mostra lo schermo; ombra arancione sulla prima card; «Conferma» a 56 px con ombra dura, «Rifiuta» outline sotto; stepper con preset; esito con barra di tempo e «Annulla».

**Icone**: **Phosphor Icons, peso bold** (stesso set di A, linea più spessa per reggere i bordi da 2 px), varianti `fill` per alert, timbri e chip.

**Tono di voce**: più energico e giocoso («Premio sbloccato!»), sempre senza gergo; richiede cura per non sembrare infantile in coda staff (lì resta sobrio).

**Perché è adatta**: è il tipo di oggetto che un cliente mostra a un amico; il codice grande e il contorno nitido sono ottimi per uno staff che guarda di sfuggita in condizioni di luce difficili.

---

## Confronto

| | **A · Carta e inchiostro** | **B · Biglietto da bar** |
|---|---|---|
| Carattere | caldo, morbido, discreto | deciso, tattile, memorabile |
| Leggibilità | alta; bordi sottili e testo secondario più chiaro (6–8:1) | altissima; bordi a 2 px e testo a 8–18:1; i titoli larghi occupano più spazio |
| Rischio | **basso**: pochi punti dove sbagliare; può essere «una bella app qualunque» | **medio**: lime e ombre dure possono stancare o sembrare «brutalismo» fuori contesto; contorno e ombra vanno tenuti con disciplina; in coda staff la voce giocosa va frenata |
| Costo con Bootstrap | **basso–medio**: quasi tutto con variabili Sass (`$primary`, `$body-bg`, `$border-radius`, `$input-border-color`, `$font-family-sans-serif`, `$min-contrast-ratio`); custom: timbro SVG, chip, card coda | **medio–alto**: ombre dure e bordo 2 px sono variabili (`$box-shadow`, `$border-width`, `$btn-box-shadow`) ma stato premuto, tacche del biglietto, bolli ruotati, coriandoli e riquadro del codice sono SCSS nuovo (~150-250 righe) |
| Font (peso) | ~35 KB, 2 file | ~93 KB, 3 file |
| Adatta ai clienti | sì, rassicura e non distrae | sì, soprattutto per il momento del premio |
| Adatta allo staff | sì, sobrio | sì, il codice grande aiuta; richiede di spegnere i giochi in coda |
| Tema scuro | caldo e morbido | molto forte (lime e arancione sul nero) |
| D1 (bottoni) | tre varianti tutte sensate | di fatto solo la a |
| Tablet/desktop (chat 7-8) | colonne e righe tabellari senza attrito | la «tessera» a tacche va ripensata in griglia; la coda in tabella perde la tacca |

**Dove una scelta richiede lavoro più grande di una variabile Bootstrap:** i timbri come SVG con rotazione, lo stato «nuovo/prossimo» con animazione CSS, il chip di stato con icona, la card della coda (stepper con preset, esito compresso con annulla), il banner di connessione sticky, il dialog audace con coriandoli e, solo in B, le tacche, l’ombra dura con stato premuto e il riquadro del codice. Nessuna richiede librerie o JavaScript oltre a ciò che già serve per l’annulla a tempo.

## Raccomandazione (non vincolante)

Per un **MVP con sviluppatore solo e budget quasi zero** consiglio **A come base** — è la strada che costa meno ed è già conforme ai vincoli — **prendendo da B tre idee** che costano poco e aumentano la riconoscibilità: il **codice grande in riquadro** nella coda staff, l’**accento premio separato** con icona e il dialog audace da provare **solo per il premio** (D10). Se invece vuoi che il prodotto sia **riconoscibile al primo colpo** (un locale che mostra la tessera a un cliente, una vetrina), B è la scelta con più carattere, a patto di accettare più SCSS e ~60 KB di font in più. Per **D1** sul lato A suggerisco di partire dalla **b**; per B resta la **a**.

Decisione tua. Prossima chat (10): design system completo sulla direzione scelta, file con prefisso `21-`.

## Non verificato

- **PNG non aperti** (come da richiesta) e resa a schermo non guardata: ho verificato solo che i font si carichino, che non ci sia scorrimento orizzontale a 390 px e i contrasti; l’aspetto reale è da giudicare a vista.
- Anello di focus e stato premuto nelle anteprime sono forzati con classi, non provati con tastiera/tocco reali ([V]).
- Peso dei font misurato sui file `woff2` latini di `@fontsource` (OFL), non sul trasferimento reale; l’implicazione di privacy dei font su CDN è da verificare con chi segue la privacy.
- Il blu del focus in A e il lime in B sono scelte di prova; ho controllato solo i contrasti, non la percezione (daltonismo).
- Non ho testato il tema chiaro caldo di A/B con persone (D6 «da provare»).

---

# Seconda tornata: due direzioni più audaci (C e D)

Richiesta del proprietario: «osa» e mostrare **tutte le scelte D1** (a, b, c) come in A. Le anteprime `dir-c.html` e `dir-d.html` mostrano le tre varianti di D1 (la **b** è la usata nel resto di C; la **a** nel resto di D); PNG `dir-c-light.png`, `dir-c-dark.png`, `dir-d-light.png`, `dir-d-dark.png`. Palette in `palettes.mjs` (`C`, `D`), contrasti con `node contrasts-direzioni.mjs`. Stesse assunzioni su identità e stesso limite: PNG non aperti.

## Direzione C · «Menù stampato» (editoriale)

**Idea.** Il menù di una buona trattoria stampato a mano: niente scatole, solo **filetti** e **numeri enormi**; il serif pesante dà il tono, l’oro dà il premio. Scommessa: il «meno interfaccia» che si ricorda.

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Sfondo / card | `#f6efe2` (carta) / `#fcf8ef` | `#14110e` / `#1b1713` |
| Testo / secondario | `#1c1a17` 16,38 / `#564f45` 7,62 | `#f3ece0` 15,18 / `#b9ae9d` 8,15 |
| Link | `#a8340a` 6,27 | `#ff9a5c` 8,51 |
| Bordo campo (UI) | `#6b6357` 5,58 | `#9c917f` 5,74 |
| Anello di focus (blu) | `#0b57d0` 6,03 | `#8ab4ff` 8,53 |
| Timbro pieno | `#e8590c` 3,38 | `#f16417` 5,58 |
| Danger | `#a8201a` 6,86 | `#ff8f84` 8,07 |
| **Premio** (D11) | **oro** `#e8b923`, testo scuro 9,42; fondo vs card 1,74 → regge solo con filetto inchiostro | oro `#f2c94c`, testo scuro 10,94; fondo vs card 11,23 |

**D1** in C

| | Testo/fondo | Fondo vs pagina | Impressione |
|---|---|---|---|
| a · testo scuro su `#f16417` | 5,56 / 5,71 | 2,79 chiaro (filetto inchiostro 1,5 px) / 5,89 scuro | vivace, ma con le maiuscole spaziate pesa |
| b · due toni | 5,18 | 4,53 / 3,63 | **la più adatta**: ruggine sobria sui bottoni, arancione solo nei bolli |
| c · tutto `#c2410c` | 5,18 | 4,53 / 3,63 | molto coerente e «stampato»; i bolli diventano mattone |

**Tipografia**: **Fraunces** (variabile, 100–900) per titoli e numeri, **Instrument Sans** per il corpo, **DM Mono 500** per il codice. Titolo 800/44/0,98, numero «7 su 10» 800/60, etichette in **maiuscolo spaziato** 12 px, corpo 17/1,5, codice 32. Peso: 37 + 30 + 15 = **~82 KB**, 3 file.
**Forma**: **angoli vivi** (raggio 0–2), nessun riquadro: card = filetto doppio sopra e filetto sotto; campi con **sola linea in basso**; alert con barra laterale; nessuna ombra.
**Timbri e premio**: **bolli numerati 1–10** (disco arancione con anello sottile e numero serif in ombra); vuoti = cerchio a filetto col numero; prossimo = doppio anello con numero che pulsa; nuovo = anello che si espande; ultimo = regalo; premio = bollo oro con contorno. Dialog **sobrio** (D10): cornice a doppio filetto, rosetta d’oro, titolo serif 40, nessuna animazione oltre a una dissolvenza.
**Card della coda**: nessuna scatola; filetto rosso-arancio sulla prima; **codice in DM Mono 32**, riga «da 2 min» in maiuscolo piccolo, chip premio, stepper a spigolo vivo, «CONFERMA» in maiuscolo.
**Icone**: Phosphor, peso **light** (stesso set, linea sottile coerente con i filetti); varianti `fill` solo per stati.
**Tono**: da menù: asciutto e un po’ elegante («Un caffè, offerto da noi»); le frasi di esempio non sono stringhe approvate.
**Perché è adatta**: trasforma il limite (un solo schermo semplice) in carattere; legge bene a colpo d’occhio (numeri grandi) e costa poco in peso visivo. Rischio: «da ristorante di lusso» per un bar di quartiere.

## Direzione D · «Adesivo» (pop)

**Idea.** Adesivi fustellati su fondo pesca: forme piene, pillole, un rosa shocking per il premio; il timbro è un oggetto che si attacca, non un pallino.

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Sfondo / card | `#ffe6c9` (pesca) / `#fffaf2` | `#24120a` (bruno bruciato) / `#34190d` |
| Testo / secondario | `#2b1408` 16,75 / `#6a4430` 8,14 | `#ffe9d2` 13,82 / `#d6b79d` 8,61 |
| Link | `#a8340a` 6,39 | `#ff9a5c` 7,77 |
| Bordo campo (UI) | `#8a5a3c` 5,60 | `#b88e6f` 5,53 |
| Anello di focus (= testo, 3 px) | `#2b1408` 16,75 | `#ffe9d2` 13,82 |
| Timbro pieno | `#f16417` 3,07 con bordo bianco da adesivo | `#f16417` 5,09 |
| Danger | `#a8201a` 7,00 | `#ff9a8f` 7,96 |
| **Premio** (D11) | **rosa** `#ff5fa2`, testo scuro 6,14; fondo vs card 2,73 → regge con il contorno scuro 2,5 px | rosa `#ff7bb5`, testo scuro 7,26; fondo vs card 6,78 |

**D1** in D

| | Testo/fondo | Fondo vs pagina | Impressione |
|---|---|---|---|
| a · testo scuro su `#f16417` | 5,56 / 5,71 | 2,65 chiaro (contorno scuro 2,5 px) / 5,64 scuro | **la più adatta**: pillola arancione piena con contorno, come un adesivo |
| b · due toni | 5,18 | 4,29 / 3,48 | più sobria, perde un po’ di gioco |
| c · tutto `#c2410c` | 5,18 | 4,29 / 3,48 | forma da adesivo ma colore da «mattone»: meno allegra |

**Tipografia**: **Unbounded** (variabile, 200–900, ampia) per titoli, numeri e codice; **Onest** per il corpo. Titolo 800/32/1,02, sezione 700/19, corpo 450/17, codice 700/30 (Unbounded: cifre larghe, molto leggibili da lontano). Peso: 51 + 34 = **~85 KB**, 2 file. Le lettere larghe consumano spazio: i titoli lunghi vanno brevi.
**Forma**: raggio card 28, campi 18, bottoni e chip **pillola**; bordo 2,5 px scuro; nessuna ombra dura; la tessera ha **banda arancione** col nome del locale e i timbri stanno in un **vassoio** colorato; premuto = scala 0,96 e rotazione di 1°.
**Timbri e premio**: **adesivi a margherita** (10 lobi), bordo bianco da fustellatura (crema in scuro), inclinati di ±10° ciascuno; vuoti = profilo tratteggiato; prossimo = profilo tratteggiato che pulsa con «+»; nuovo = anello che si espande; premio = adesivo rosa con regalo. Dialog **audace** (D10): blocco rosa, adesivo «starburst» arancione col regalo, «PREMIO!» a 38 px, coriandoli tondi 1,5 s (solo CSS, spenti con `prefers-reduced-motion`).
**Card della coda**: card a 28 di raggio; **codice in riquadro scuro** con testo chiaro (Unbounded 30) leggibile da lontano; stepper **tondo** con preset a pillola; «Conferma» pillola a 58 px, «Rifiuta» pillola outline; prima card con anello arancione; esito con barra di tempo e «Annulla».
**Icone**: Phosphor, peso **bold**; varianti `fill` per chip e stati.
**Tono**: allegro e diretto («Premio!»); in coda staff va tenuto neutro.
**Perché è adatta**: è la più riconoscibile e «condivisibile»; l’adesivo è una metafora immediata per «timbro». Rischio: può sembrare un prodotto per ragazzi; la pesca/arancio lascia poco margine al colore della marca del locale (D16).

## Confronto C e D (e rispetto ad A e B)

| | **C · Menù stampato** | **D · Adesivo** |
|---|---|---|
| Carattere | colto, ordinato, asciutto | giocoso, vivace, pop |
| Leggibilità | alta; numeri enormi, ma filetti sottili e maiuscolo spaziato in etichette | altissima per i numeri e il codice; i caratteri larghi riempiono presto la riga |
| Rischio | **medio**: senza scatole la gerarchia dipende tutta dalla tipografia; serif e angoli vivi possono sembrare «da ristorante»; maiuscolo spaziato da usare poco | **medio–alto**: tono e forme possono sembrare infantili; pesca come fondo riduce il margine per il colore del locale; rosa e rosso vanno distinti con icona |
| Costo con Bootstrap | **medio–alto**: raggi a 0 e bordi sono variabili, ma card «a filetti», campi a linea sola, alert a barra e bolli numerati sono SCSS nuovo (~150-200 righe); è la più lontana dai componenti Bootstrap | **medio–alto**: pillole e raggi sono variabili (`$btn-border-radius-*`, `$border-radius-xl`); adesivi con profilo a margherita, vassoio, banda, starburst e coriandoli sono SVG/CSS nuovi (~200 righe) |
| Font (peso) | ~82 KB, 3 file | ~85 KB, 2 file |
| D1 | meglio b | meglio a |
| Adatta ai clienti | sì, elegante e chiara | sì, memorabile e allegra |
| Adatta allo staff | sì, il codice mono grande e la riga a filetti sono sobrissimi | sì, il codice nel riquadro è il più leggibile da lontano; i giochi vanno spenti |
| Tema scuro | caldo e sobrio, oro come accento | pesante e saturo; il rosa sul bruno è molto forte |
| Tablet/desktop | la più naturale (colonne, tabelle con filetti) | la «tessera» a banda e i vassoi si adattano ma con più lavoro |

**Dove serve più di una variabile Bootstrap:** C: card a filetti, campi a linea sola, bolli numerati, dialog a doppia cornice; D: forme a margherita, vassoio e banda, starburst, coriandoli, pillole con rotazione da premuto. Nessuna richiede librerie.

**Raccomandazione aggiornata (non vincolante).** Resta **A come scelta di minor rischio e minor costo**. Fra le due nuove, **C** è la più adatta a un prodotto che vuole sembrare «fatto bene» senza essere infantile e costa poco in peso visivo (gerarchia tipografica e filetti); **D** è la più diversa dall’app attuale e la più memorabile, ma anche quella che invecchia peggio e quella con più rischio di tono. Un ibrido sensato: **C per la struttura** (filetti, numeri grandi) **+ gli adesivi di D** per i timbri e il premio, con **D1 b** per la leggibilità dei bottoni. Decisione tua.

---

# Terza tornata: due direzioni «sbizzarrite» (E e F)

Anteprime `dir-e.html`, `dir-f.html` (con `?theme=dark`) e PNG `dir-e-light.png`, `dir-e-dark.png`, `dir-f-light.png`, `dir-f-dark.png`. Tutte e tre le varianti D1 sono mostrate in entrambe (la **a** è usata nel resto di E, la **b** in F). Palette in `palettes.mjs` (`E`, `F`). Stessi limiti: PNG non aperti.

## Direzione E · «Insegna» (neon e lettere alte)

**Idea.** L’insegna del locale accesa di notte: lettere **alte e strette** tutte maiuscole, tubi al neon arancioni, un **azzurro elettrico** che si accende solo per il premio. Di sera è un’insegna, di giorno un manifesto serigrafato con inchiostro nero.

| Ruolo | Chiaro («manifesto») | Scuro («notte») |
|---|---|---|
| Sfondo / card | `#f3ece3` / `#fffdf9` | `#0d0907` / `#170f0b` |
| Testo / secondario | `#120d0a` 19,00 / `#55463b` 8,89 | `#fff1e0` 17,04 / `#c9ad95` 8,92 |
| Link | `#a8340a` 6,54 | `#ff9a5c` 9,04 |
| Bordo campo (UI) | `#6a5849` 6,66 | `#b08a6e` 6,04 |
| Anello di focus (= testo) | `#120d0a` | `#fff1e0` |
| Timbro pieno | `#e8590c` 3,52 | `#f16417` 5,93 (con alone) |
| Danger | `#a8201a` 7,16 | `#ff8a7a` 8,26 |
| **Premio** (D11) | azzurro `#27d6da`, testo scuro 10,16; fondo vs card 1,76 → solo con contorno inchiostro | `#2de2e6`, testo scuro 11,39; fondo vs card 11,84 |

**D1**: a · 5,56/5,71, fondo vs pagina 2,73 chiaro (contorno inchiostro) / 6,21 scuro, **la più adatta** (bottone «acceso» con alone arancione); b · 5,18, 4,42 / 3,83, più sobria e senza alone che funzioni; c · 5,18, uguale a b, bottoni mattone che spengono l’effetto neon.

**Tipografia**: **Big Shoulders Display** (variabile, 100–900) per titoli, numeri e codice, **Archivo** per il corpo. Titolo 900/64/0,88 maiuscolo, «7 su 10» 900/84, codice 800/52, corpo 17. Peso: 35 + 35 = **~70 KB**, 2 file.
**Forma**: raggi piccoli (4), bordi 2 px; in scuro **alone arancione** (box-shadow e `drop-shadow`, solo CSS) su bottoni primari, card e timbri; in chiaro l’alone sparisce e resta l’ombra dura inchiostro (3 px). Colonna fitta: i caratteri stretti permettono titoli molto grandi senza riempire la riga.
**Timbri e premio**: **anelli al neon numerati** (anello grosso arancione con disco pieno e numero nero); vuoti = anello sottile col numero; prossimo = anello tratteggiato che pulsa; nuovo = anello che si espande; ultimo = regalo; premio = anello azzurro pieno con regalo. Dialog **audace** (D10): bordo arancione con alone, «PREMIO ACCESO!» in azzurro a 72 px che **lampeggia tre volte in 1,5 s** (solo CSS, `steps`); con `prefers-reduced-motion` resta acceso e fermo.
**Card della coda**: barra arancione a sinistra e alone; **codice a 52 px in riquadro tratteggiato** (Big Shoulders, leggibilissimo da lontano), chip premio in maiuscolo, stepper e preset in caratteri stretti, «CONFERMA» a 56 px.
**Icone**: Phosphor, peso **bold**; varianti `fill` per chip e stati.
**Tono**: breve, a insegna («Premio acceso!»); in coda staff solo etichette tecniche.
**Perché è adatta**: massima riconoscibilità e leggibilità da lontano (utile al bancone); la sera sembra l’insegna del locale. Rischi: gli **alone costano in batteria e leggibilità** su schermi molto luminosi, il maiuscolo ovunque stanca nei testi lunghi, il tema chiaro è meno distintivo.

## Direzione F · «Scontrino» (stampante termica)

**Idea.** Lo scontrino del bar: caratteri a macchina, righe tratteggiate, bordo a zig-zag, **codice a barre** al posto del codice; il numero grande è composto di **punti** come una stampante termica. Il premio è **blu inchiostro**, come i timbri su carta.

| Ruolo | Chiaro («carta») | Scuro («schermo ambra») |
|---|---|---|
| Sfondo / card | `#e4dfd2` (scrivania) / `#fbfaf5` (scontrino) | `#0e0b07` / `#17120b` |
| Testo / secondario | `#1d1b18` 16,44 / `#57534b` 7,32 | `#ffcf85` 12,87 / `#c9a265` 7,84 |
| Link | `#a8340a` 6,36 | `#ff9a5c` 8,89 |
| Bordo campo (UI) | `#6a665d` 5,47 | `#a8803f` 5,16 |
| Anello di focus (= testo) | `#1d1b18` | `#ffcf85` |
| Timbro pieno | `#e8590c` 3,43 | `#f16417` 5,83 |
| Danger | `#a8201a` 6,96 | `#ff8f84` 8,44 |
| **Premio** (D11) | blu `#2b3fd1`, testo bianco 7,68; fondo vs card 7,35 | `#9aa8ff`, testo scuro 8,33; fondo vs card 8,35 |

**D1**: a · 5,56/5,71, fondo vs pagina 2,40 chiaro (contorno inchiostro 2 px) / 6,15 scuro; b · 5,18, 3,89 / 3,79, **la più adatta**, pulsante «macchina da scrivere» sobrio; c · come b.

**Tipografia**: **Geist Mono** (variabile, 100–900) per tutto il testo e **Doto** (punti, 100–900) solo per titoli e numeri grandi. Titolo 46 in Doto, corpo 15 mono, etichette 12 maiuscolo, codice 700/32. Peso: 23 + 5 = **~28 KB**, 2 file: **la più leggera di tutte**. Il mono occupa più larghezza: testi più brevi.
**Forma**: angoli vivi, nessun raggio, nessuna scatola: «scontrini» (card) con **bordo a zig-zag** in fondo, righe tratteggiate come separatori, titoli di sezione come `## Sezione`, bottoni a spigolo con `>`.
**Timbri e premio**: caselle **«[ ]»** a parentesi angolari con numero; timbro = bollo arancione inclinato con stella dentro la casella; prossimo = casella grossa con **cursore** lampeggiante; nuovo = riquadro che si espande; ultimo = regalo; premio = **etichetta blu** inclinata. Dialog **sobrio** (D10): uno scontrino «stampato» in 0,5 s (`steps`) con righe **Premio / Locale / Consegna** e codice a barre; `prefers-reduced-motion` lo mostra fermo.
**Card della coda**: scontrino con zig-zag; **codice mono 32 + codice a barre** (decorativo), «da 2 min» in maiuscolo, chip premio blu, stepper a spigolo; «> CONFERMA» e «> RIFIUTA».
**Icone**: Phosphor, peso **regular** (il disegno delle icone resta più rotondo del resto: è il punto debole della direzione).
**Tono**: da terminale/scontrino («RICHIESTA N. 0042 · IN ATTESA»); chiaro e tecnico.
**Perché è adatta**: sposa il contesto (casse, scontrini, staff), è la più sobria nel peso e la più immediata da capire per lo staff. Rischi: **il mono è meno leggibile in blocchi di testo** (login, errori lunghi), l’effetto «retrò» può risultare freddo per i clienti, il punteggiato di Doto va usato solo per i numeri.

## Confronto E e F

| | **E · Insegna** | **F · Scontrino** |
|---|---|---|
| Carattere | teatrale, notturno, energico | ironico, tecnico, concreto |
| Leggibilità | ottima per titoli e numeri; testi lunghi in Archivo regolare | ottima per numeri e codice; testi lunghi in mono più faticosi |
| Rischio | **alto**: alone e neon fuori dallo stile di tanti locali, maiuscolo ovunque, tema chiaro meno forte | **medio–alto**: «retrò» può essere freddo e le icone tonde stridono col mono |
| Costo con Bootstrap | **medio–alto**: alone, tubi, lampeggio e caratteri stretti sono SCSS/SVG nuovi (~150 righe); colori e raggi via variabili | **medio**: raggi a 0, mono come font base, bordo a zig-zag (gradienti CSS), `##` e `>` come pseudo-elementi: ~100 righe; il peso dei font è minimo |
| Font (peso) | ~70 KB, 2 file | ~28 KB, 2 file |
| D1 | meglio a | meglio b |
| Adatta ai clienti | sì, molto riconoscibile | sì, curiosa; meno calda |
| Adatta allo staff | sì, codice enorme e contrasto da insegna | **sì, la più naturale**: sembra uno strumento di cassa |
| Tema scuro | il più spettacolare | molto sobrio (ambra su nero) |
| Tablet/desktop | colonne a caratteri stretti, ottime in griglia | scontrini affiancati come tabella di cassa |

## Quadro complessivo (A–F) e raccomandazione

| | Carattere | Rischio | Costo | Font |
|---|---|---|---|---|
| A · Carta e inchiostro | caldo, sicuro | basso | basso–medio | ~35 KB |
| B · Biglietto da bar | netto, tattile | medio | medio–alto | ~93 KB |
| C · Menù stampato | colto, asciutto | medio | medio–alto | ~82 KB |
| D · Adesivo | pop, giocoso | medio–alto | medio–alto | ~85 KB |
| E · Insegna | notturno, teatrale | alto | medio–alto | ~70 KB |
| F · Scontrino | tecnico, ironico | medio–alto | medio | **~28 KB** |

**Raccomandazione (non vincolante).** Le prime sei sono tutte realizzabili con Bootstrap Sass più componenti nuovi, nessuna richiede librerie. Per rischio e costo resta **A** la scelta più prudente. Se vuoi un carattere forte senza i rischi di tono di D ed E, **F** è la più coerente con il prodotto (staff, scontrini, codice) ed è la più leggera, a patto di usarla **in modo selettivo**: il mono per codici, numeri e coda staff, un sans per i testi lunghi del cliente (login, errori). Un ibrido sensato è **A per il cliente + F per lo staff** (due temi su una base comune di token), oppure **A con gli adesivi di D per il premio**. Decisione tua.

## Non verificato (E, F)

- PNG non aperti; alone e lampeggio (E), zig-zag e stampa (F) sono verificati solo come CSS che si carica e non fa scorrere la pagina a 390 px.
- Alone e lampeggi non sono provati sul costo di batteria/rendering di un telefono vero né sulla leggibilità al sole.
- Il punteggiato di Doto e i numeri larghi non sono provati su schermi piccoli (360 px).

---

# Quarta tornata: due direzioni pacate (G e H)

Anteprime `dir-g.html`, `dir-h.html` (con `?theme=dark`) e PNG `dir-g-light.png`, `dir-g-dark.png`, `dir-h-light.png`, `dir-h-dark.png`. Entrambe mostrano le tre varianti D1 (la **b** è usata nel resto delle pagine). Per entrambe il premio ha il dialog **sobrio** (D10): solo una dissolvenza di 0,3 s, nessun coriandolo; nessun alone, nessuna ombra, nessuna animazione continua oltre al pallino «prossimo» che pulsa piano (spento con `prefers-reduced-motion`). Stessi limiti: PNG non aperti.

## Direzione G · «Pietra» (minimale, svizzera)

**Idea.** Una pagina di pietra calda: tanto spazio, un solo grigio, poche parole, il colore compare solo dove serve (timbro, bottone, premio). L’interfaccia si fa dimenticare e lascia parlare i numeri.

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Sfondo / card | `#eeebe5` / `#faf8f4` | `#171614` / `#1f1d1a` |
| Testo / secondario | `#23211e` 15,14 / `#5e5a53` 6,46 | `#ece8e1` 13,77 / `#aaa398` 6,73 |
| Link | `#a8340a` 6,26 | `#ff9a5c` 8,03 |
| Bordo campo (UI) | `#7a756c` 4,31 | `#8f887c` 4,79 |
| Anello di focus (= testo, 3 px) | `#23211e` | `#ece8e1` |
| Timbro pieno | `#e8590c` 3,38 | `#f16417` 5,26 |
| Danger | `#a8201a` 6,86 | `#ff8f84` 7,62 |
| **Premio** (D11) | violetto `#5b4a99`, testo bianco 7,28; fondo vs card 6,86 | `#b7a8f0`, testo scuro 8,38; fondo vs card 7,91 |

**D1**: a · 5,56/5,71, fondo vs pagina 2,68 chiaro (bordo `#7c2d12` 1,5 px) / 5,66 scuro; b · 5,18, 4,35 / 3,49, **la più adatta** (bottone pieno e quieto); c · come b, i timbri diventano mattone, meno vivi.

**Tipografia**: **Schibsted Grotesk** (variabile, 400–900) per tutto + **Geist Mono 600** per il codice. Titolo 600/40/1,05 (−0,035 em), numero grande 600/52, sezione 600/24, corpo 400/17/1,5, etichette 500/13 **non** maiuscole. Peso: 47 + 23 = **~70 KB**, 2 file (Schibsted è il più grosso: si può sostituire con un altro sans più leggero, es. Figtree, 20 KB).
**Forma**: raggi 8–12, bordi **1 px** in tono con la pagina (decorativi), nessuna ombra, tantissimo spazio (gap 12 tra i timbri, sezioni distanti 44 px); titoli di sezione piccoli e sommessi.
**Timbri e premio**: anelli di 52 px: **timbro = disco arancione con segno di spunta** nero; vuoto = anello sottile; prossimo = anello scuro con puntino che pulsa; nuovo = anello arancione che si espande una volta; ultimo = regalo; premio = disco violetto con regalo. Dialog: tondo violetto chiaro, chip «Premio riscattato», titolo 28, nome del premio 24; dissolvenza 0,3 s.
**Card della coda**: card piatta con bordo 1 px; **codice Geist Mono 28**, «da 2 min» a destra, stepper quadrato con preset a pillola, «Conferma» a tutta larghezza; prima card con bordo scuro.
**Icone**: Phosphor, peso **light**; varianti `fill` solo per stati.
**Tono**: laconico («Ne mancano 3»), mai esclamativo.
**Perché è adatta**: massimo spazio per il contenuto e minimo costo di manutenzione; funziona bene da tablet in su. Rischio: **troppo neutra**: senza il colore del locale (D16) o un tratto distintivo può sembrare «un template»; il premio ha meno festa degli altri.

## Direzione H · «Forno» (organica, salvia e sabbia)

**Idea.** Il forno di quartiere al mattino: toni **salvia e sabbia**, forme morbide a **ciottolo** e a **finestra ad arco**, un serif caldo per i titoli; il colore sta nei piani tonali, non nei bordi né nelle ombre.

| Ruolo | Chiaro | Scuro |
|---|---|---|
| Sfondo / card | `#f1ede0` (sabbia) / `#fbf9f1`; riquadri tonali `#e6ebd9` | `#171a13` / `#1f2318`; tonale `#2b3122` |
| Testo / secondario | `#262d20` 13,47 / `#576050` 6,24 (5,40 sul tonale) | `#ebe9dc` 13,13 / `#b3b8a2` 7,85 (6,58 sul tonale) |
| Link | `#a8340a` 6,30 | `#ff9a5c` 7,64 |
| Bordo campo (UI) | `#6f7a62` 4,30 (3,72 sul tonale) | `#8e987c` 5,28 (4,43 sul tonale) |
| Anello di focus (verde bosco) | `#1f5a35` | `#b9e3a0` |
| Timbro pieno | `#dc520b` (3,28 sul tonale: scurito per questo) | `#f16417` 5,01 (4,20 sul tonale) |
| Danger | `#a8201a` 6,90 | `#ff9086` 7,31 |
| **Premio** (D11) | **bacca** `#9b2c5e`, testo bianco 7,20; fondo vs card 6,83 | `#f08ab6`, testo scuro 7,74; fondo vs card 6,87 |

**D1**: a · 5,56/5,71, fondo vs pagina 2,73 chiaro (bordo 1,5 px) / 5,51 scuro; b · 5,18, 4,42 / 3,40, **la più adatta** (pillola ruggine su sabbia); c · come b.

**Tipografia**: **Young Serif** (400, solo titoli e numeri grandi) + **Nunito Sans** (variabile, 200–1000) per il corpo e il codice. Titolo 400/42, numero «7 su 10» 400/52, corpo 17/1,5, codice 900/32 spaziato. Peso: 27 + 31 = **~58 KB**, 2 file.
**Forma**: **nessun bordo**: le card sono piani tonali (salvia) senza contorno né ombra; raggi grandi (card 28, campi 18, bottoni a pillola); bottoni secondario e rifiuta con bordo 2 px.
**Timbri e premio**: **ciottoli** (quadrati a raggio 22): timbro = ciottolo arancione con stella; vuoto = ciottolo con bordo `#6f7a62`; prossimo = ciottolo tratteggiato con «+» che pulsa; nuovo = anello che si espande; ultimo = regalo; premio = ciottolo bacca col regalo. Dialog **sobrio**: **finestra ad arco** (angoli alti di 150 px), tondo bacca col regalo, titolo serif 32 «Per te, dal forno», dissolvenza di 0,35 s.
**Card della coda**: piano tonale a raggio 28; **codice in riquadro chiaro** (Nunito 900/32 spaziato); stepper tondo; «Conferma» a pillola 54 px e «Rifiuta» a pillola con bordo; prima card con anello arancione di 3 px.
**Icone**: Phosphor, peso **regular**; varianti `fill` per stati.
**Tono**: caldo e familiare («Per te», «Ne mancano 3»).
**Perché è adatta**: rassicura chi non ama «le app», si abbina bene al rito del timbro di quartiere e lascia spazio al colore del locale. Rischio: senza bordi il **bordo dei campi (UI 3:1) e la separazione fra piani tonali** vanno controllati a ogni nuovo colore; l’arco del dialog si adatta male a testi lunghi.

## Confronto G e H (e quadro finale A–H)

| | **G · Pietra** | **H · Forno** |
|---|---|---|
| Carattere | quieto, neutro, svizzero | caldo, familiare, organico |
| Leggibilità | alta; gerarchia solo tipografica | alta; il serif solo nei titoli, il resto sans |
| Rischio | **basso–medio**: troppo neutra | **medio**: tonale senza bordi più delicato sui contrasti; il serif «Young» è molto caratterizzato |
| Costo con Bootstrap | **basso**: quasi solo variabili (raggi, bordi 1 px, font, colori) + timbro SVG, chip, card coda | **medio**: bordi a 0 e raggi sono variabili, ma piani tonali, ciottoli SVG, arco del dialog e pillole sono SCSS nuovo (~100 righe) |
| Font (peso) | ~70 KB (~43 KB con Figtree al posto di Schibsted) | ~58 KB |
| D1 | meglio b | meglio b |
| Adatta ai clienti | sì, rassicurante | sì, molto accogliente |
| Adatta allo staff | sì, sobria e veloce | sì, il codice nel riquadro è chiaro; piani tonali meno netti al sole |
| Tema scuro | grafite calda, molto sobria | olivastro caldo, morbido |
| Tablet/desktop | **la più naturale** (griglie, tabelle, tanto spazio) | si adatta bene, con più lavoro sugli archi e i ciottoli |

| | Carattere | Rischio | Costo | Font |
|---|---|---|---|---|
| A · Carta e inchiostro | caldo, sicuro | basso | basso–medio | ~35 KB |
| B · Biglietto da bar | netto, tattile | medio | medio–alto | ~93 KB |
| C · Menù stampato | colto, asciutto | medio | medio–alto | ~82 KB |
| D · Adesivo | pop, giocoso | medio–alto | medio–alto | ~85 KB |
| E · Insegna | notturno, teatrale | alto | medio–alto | ~70 KB |
| F · Scontrino | tecnico, ironico | medio–alto | medio | ~28 KB |
| **G · Pietra** | quieto, neutro | **basso–medio** | **basso** | ~70 KB (~43 con Figtree) |
| **H · Forno** | caldo, organico | medio | medio | ~58 KB |

**Raccomandazione (non vincolante).** Se cerchi la strada più **tranquilla**, **A** e **G** sono le uniche a rischio basso; A ha più calore e un carattere già leggibile, G è la più economica e la più adatta a tablet/desktop ma ha meno personalità. **H** è la migliore se vuoi calore e un'identità riconoscibile senza essere rumorosa: un buon compromesso tra A (cura) e D (carattere). Combinazioni sensate: **G come base (spazio, tipografia sobria) + i ciottoli e l'accento premio di H**, oppure **A con la finestra ad arco di H per il premio**. Decisione tua.

## Non verificato (G, H)

- PNG non aperti; resa dei piani tonali di H (separazione fra card e pagina) da guardare a vista e al sole.
- «Ciottoli» e arco del dialog verificati solo come CSS/SVG che si carica; arco non provato con premi dal nome lungo.
- H light: timbro `#dc520b` scurito rispetto all’arancione di marca per tenere 3:1 sul piano tonale.

---

## Quinta tornata — Direzione I «Ibrido» (scelte del proprietario)

Anteprima: `dir-i.html` (+ `dir-i-light.png`, `dir-i-dark.png`). Palette in `palettes.mjs` (`I`), contrasti con `node contrasts-direzioni.mjs`.

| Elemento | Preso da | Valore |
|---|---|---|
| Titolo, sezione, codice | D | Unbounded (800/700/700), titolo 28 px, codice 24 px |
| Corpo | C | Instrument Sans 400, 17/1,5 |
| Etichetta (anche chip, bottoni, label dei campi) | A | Figtree 700 |
| Sfondo chiaro | H | `#f1ede0`, card `#fbf9f1`, piano `#dfe5d2` |
| Sfondo scuro | A | `#1a1410`, card `#251d17` |
| Premio chiaro / scuro | D / scelta | `#ff5fa2` (testo `#2b1408`), uguale in scuro |
| Successo, avviso | H | `#14633b`, tinta `#f2e1a3` (scuro come H) |
| Pericolo, info | A | `#b3261e` (scuro `#ff8d82`) |
| Arancio / arancio scuro | Stampy | `#f16417` / `#c2410c` (**D1-a scelta** per chiaro e scuro: testo scuro su `#f16417`; in chiaro serve il bordo `#9a3412`, 2,73:1 contro lo sfondo) |
| Bottoni, campi, alert | A | raggio 14 / 14 / 12, bordo alert 3 px |
| Card timbri | A | raggio 18, bordo 1,5 px, nessuna ombra (corretto: all'inizio avevo messo la forma B) |
| Timbri | A | cerchio con anello e stella, leggermente ruotati |
| Dialog premio | D | raggio 28, fondo rosa, coriandoli 1,5 s; **senza icona del regalo e senza disco arancione** |
| Coda staff | A | compatta: card 14 px, codice 22 px, bottoni 44–46 px, niente riquadro del codice |

Scelte mie dove il brief non decideva (da confermare):
- Testo `#2a1f18` e testo secondario `#5f4e40` (di A, secondario scurito per reggere sul piano salvia); bordo campo `#7d6a58`; link `#b43a0a`; anello di focus blu `#1d4ed8` (scuro `#8fb0ff`).
- Icone Phosphor peso «regular»; la cornice del locale non ha fascia colorata.

Card timbri, come richiesto:
- Niente barra di avanzamento e niente icona del regalo: **il premio arriva all'11° timbro**. La card ha 10 posti; i vuoti sono tutti uguali, tratteggiati, compreso quello subito dopo l'ultimo timbro (nessun «prossimo» evidenziato).
- Card piena: 10 timbri pieni, chip «Al prossimo timbro» e alert «L'11° timbro ti dà il premio». I testi sono suggerimenti. Se in D1/D11 serve un segnale per il «prossimo» posto, va deciso a parte.

Contrasti (tutti i testi ≥ 4,5:1, chiaro e scuro):
- Premio `#ff5fa2` contro la card chiara: 2,69:1, sotto 3:1. Il dialog e il chip hanno bordo `#2b1408`, quindi il limite UI è coperto dal bordo. In scuro 5,85:1.
- D1-a contro lo sfondo chiaro: 2,73:1 (serve bordo). D1-b: 4,42:1 chiaro, 3,52:1 scuro.
- Timbro `#f16417` contro la card chiara: 3,03:1 (margine minimo). Bordo campo 4,89:1, focus 6,36:1.
- Nel dialog rosa, chip, alert e bottone usano `#2b1408` come fondo e rosa come testo (6,14:1), non il colore del testo del tema (in scuro darebbe un contrasto basso).

Non verificato: PNG non aperti (resa a schermo da guardare); Unbounded e Instrument Sans insieme (~101 KB di font) non provati su dispositivi lenti; il tondo «tratteggiato» a 10 posti su schermi da 320 px.
