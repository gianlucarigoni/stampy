# 22 · Brief per Canva (pilota)

Chat 10, 2026-11-26. Direzione **dir-i**. Fonte dei valori: `21-design-system.md` (contrasti calcolati con `design-system/contrasts-21.mjs`).
Prima di generare: **non assumere che i font siano in Canva** (vedi «Font e Canva» sotto). Il nome del prodotto è un segnaposto (D5): scrivi sempre «Nome prodotto», niente logo nuovo.

## 1. Brief da incollare in ogni generazione (≤ 250 parole)

<!-- BRIEF-INIZIO -->
Stile: app mobile 390×844 per tessere fedeltà di locali di quartiere. Caldo, morbido, leggibile: carta e inchiostro. Piatto: nessuna ombra sulle card, bordi sottili caldi, niente neon, niente glassmorphism, niente sfumature.

Colori chiaro: sfondo #F1EDE0, card #FBF9F1, piano salvia #DFE5D2, testo #2A1F18, secondario #5F4E40, bordo dei campi #7D6A58, link #B43A0A.
Colori scuro: sfondo #1A1410, card #251D17, testo #F4E9DC, secondario #C0AD9C, bordo dei campi #9A8878, link #F4813F.
Azione: bottone arancione #F16417 con testo scuro #1F1612 (mai bianco); in chiaro bordo #9A3412. Premio: rosa #FF5FA2 con testo #2B1408 e contorno scuro. Errore #B3261E (scuro #FF8D82). Successo #14633B. Avviso: fondo #F2E1A3, testo #4A3300. Focus: anello blu #1D4ED8.

Font: titoli e numeri Unbounded ExtraBold; corpo Instrument Sans; etichette e bottoni Figtree Bold. Se mancano: sans geometrico largo bold per i titoli, sans neutro per il resto.

Forma: raggio 18 card, 14 bottoni e campi, 12 alert, pillole per i chip. Bottoni alti 52, larghi come la colonna, margini 16.

Timbri: cerchi arancioni #F16417 con anello e stella scuri, leggermente ruotati; vuoti = cerchio tratteggiato; 10 posti in 2 righe da 5; numero grande «7 su 10». Nessuna barra di avanzamento.
Premio: blocco rosa con contorno scuro, coriandoli, titolo grande, senza icona regalo.

Icone: linea sottile stile Phosphor, mai emoji.
Evitare: emoji, logo, nome fisso, bianco su arancione, testo rosa su fondo chiaro, bottone principale sbiadito o disabilitato, ombre.
<!-- BRIEF-FINE -->


## 2. Font e Canva

| Font | Ruolo | Licenza (verificata sul campo `license` di npm) | Peso del file | In Canva? |
|---|---|---|---|---|
| Unbounded (variabile, 200–900) | titoli, numeri, codice | OFL-1.1 | 50,9 kB | **non verificato** |
| Instrument Sans (variabile) | corpo | OFL-1.1 | 30,1 kB | **non verificato** |
| Figtree (variabile, 300–900) | etichette, bottoni | OFL-1.1 | 20,2 kB | **non verificato** |

- La ricerca web non ha trovato un elenco Canva che nomini nessuno dei tre. **Verifica pratica (2 minuti):** in un design Canva apri il selettore dei font e cerca i tre nomi. Annota qui l'esito.
- **Se mancano**, due strade (entrambe **da verificare** sul tuo piano Canva): (1) usare un sostituto già presente: per Unbounded un sans geometrico largo in grassetto (es. Montserrat ExtraBold o Poppins ExtraBold, **non verificato che siano in Canva**), per Instrument Sans e Figtree un sans neutro (es. Open Sans / Lato / Nunito Sans, idem). (2) Caricare i font nel Brand Kit: Canva accetta caricamenti di font propri solo su alcuni piani e in alcuni formati **(da verificare)**; i file che ho sono `woff2` **variabili** in `design-system/fonts/` e non so se Canva li accetti così.
- Il pilota serve a giudicare colore, forma e momento del premio; la **larghezza di Unbounded** (molto larga) cambia i ritorni a capo: se si usa un sostituto, i titoli risulteranno più stretti. Dichiaralo nei commenti del pilota.
- Per l'app i font sono **in self-hosting** (nessun CDN): vedi `21-design-system.md` §2.3.

## 3. Cosa va a confronto nel pilota (D1, D6, D10, D11)

Ogni schermata in **chiaro e scuro**. Il pilota deve mostrare, oltre al design di dir-i, queste **varianti** (non chiudere le decisioni):

| Decisione | Variante A (dir-i) | Variante B |
|---|---|---|
| D1 bottoni | a: testo scuro su `#F16417` (bordo `#9A3412` in chiaro) | b: `#C2410C` con testo bianco (5,18:1), arancione vivo solo nei timbri |
| D6 chiaro caldo | `#F1EDE0` / card `#FBF9F1` | neutro Bootstrap: `#FFFFFF` / `#F8F9FA`, testo `#212529` |
| D10 premio | audace: blocco rosa + coriandoli (1,5 s) | sobrio: stesso blocco rosa, nessun coriandolo |
| D11 accento premio | rosa `#FF5FA2` | un secondo candidato a scelta (es. teal `#0B6B7C` chiaro / `#5FD0E0` scuro, calcolato in A) |

## 4. Valori per schermata (390×844, margini laterali 16, scala 1x)

Colonna unica a tutta larghezza (390 − 32 = **358 px** di contenuto). Barra di stato del telefono: ignorala (0 px). Spaziatura verticale tra blocchi: **16** (sezioni: **36**). Etichette «richiede backend» = piccolo riquadro tratteggiato `#7D6A58`, 11–12 px (solo nel mockup, non nell'app).

| Schermata | Contenuto e misure |
|---|---|
| **Header** (tutte tranne login/errore) | altezza 56; sinistra: segnaposto «Nome prodotto» Unbounded ExtraBold 18 con cerchio arancione 26 px e stella scura (segnaposto, non logo); destra: pulsante ☰ 44×44, bordo 1,5 px `#7D6A58`, raggio 12 |
| **Login email** | titolo Unbounded ExtraBold 28 «Accedi»; sottotitolo Instrument Sans 17 «Ti mandiamo un codice via email. Niente password.»; etichetta Figtree Bold 16 «Email»; campo 358×52, bordo 2 px, raggio 14; bottone «Invia il codice» 358×52 (arancione); sotto «oppure» e bottone Google (secondario, 358×52, bordo 1,5 px); riga privacy 13 px (D4, testo da validare) |
| **Login: email non valida** | stesso campo con bordo `#B3261E` 2 px, barra interna sinistra 4 px, icona (!) a destra; **sotto il campo**, al posto del suggerimento, icona + «Controlla l'indirizzo: manca la @ o il dominio.» 14 px rosso; il bottone **non si sposta** |
| **Login: codice** | campo codice 358×56, cifre Unbounded Bold 28 centrate; riga «Abbiamo scritto a …» 17; link «Invia un nuovo codice» 44 px d'altezza; errore sotto il campo (conteggio tentativi) |
| **`/name`** | titolo «Come ti chiami?» 28; suggerimento «Da 3 a 50 caratteri.» sotto il campo; bottone «Continua» sempre pieno |
| **`/scan`** | icona gesto 48 (telefono + tag + QR); frase «Avvicina il telefono al tag o inquadra il QR»; tre passi numerati (cerchio 28 con numero Unbounded, testo 15): 1 Avvicina il telefono al tag · 2 Entra con la tua email · 3 Chiedi il timbro e salvalo in Google Wallet |
| **Visita** | due passi numerati: «1 Salva la card» (primario o secondario a seconda del passo) e «2 Chiedi il timbro»; codice card in fondo |
| **Richiesta in attesa** | card 358, raggio 18, bordo 1,5 `#D6DAC8`, padding 16: nome del locale (con etichetta «richiede backend») · numero grande Unbounded ExtraBold 38 «3» + «su 10» 19 · «ne mancano 7» 16 semibold secondario · chip «in attesa» (pillola 32 px, fondo `#DFE5D2`, bordo `#7D6A58`, orologio) con puntino · «scade tra 4 min» · griglia di 10 timbri (5×2, 62 px, spazio 10) |
| **Richiesta approvata** | alert successo in cima (fondo `#D3EAD9`, testo `#0B3D24`, bordo 3 px `#14633B`, icona): «Richiesta approvata» · «+2 timbri» come dato grande; 5 timbri pieni di cui gli ultimi 2 «nuovi» (anello esterno attorno) |
| **Card piena** | 10 timbri pieni; chip rosa «Al prossimo timbro» (fondo `#FF5FA2`, testo `#2B1408`, contorno `#2B1408`); alert premio (fondo `#FFD1E5`, testo `#6B0C37`): «Premio disponibile: Caffè gratis» |
| **Dialog del premio (audace)** | scrim nero caldo al 72%; blocco rosa `#FF5FA2` largo 366, raggio 28, bordo 2,5 px `#2B1408`, **126 px vuoti in alto** per i coriandoli (cerchi 12 px: scuro, arancione, bianco, giallo); chip scuro «Premio riscattato» con testo rosa; titolo Unbounded ExtraBold 38 «PREMIO!»; nome del premio 28; riga «Nome del locale» («richiede backend»); «Lo staff lo sa già: ti consegna il premio.»; bottone scuro «Perfetto» 58 px con testo rosa. **Nessuna icona regalo** |
| **Dialog del premio (sobrio)** | identico senza coriandoli |
| **Card dopo il premio** | 0 su 10 (10 timbri vuoti tratteggiati) con alert premio fisso in cima: «Premio riscattato · Caffè gratis» |
| **Profilo** | card nome + email (nome 19 Unbounded, email 15 secondario); riga «Storico richieste» alta 56 con chevron; sezione «Elimina l'account» con alert avviso e bottone secondario; senza la card «Bar Aurora» (è un dato finto: se la mostri, etichetta «richiede backend») |
| **Storico** | pulsante «Filtri · 2» (secondario 44 px) e chip dei filtri attivi; intestazioni di giorno «Oggi» / «Ieri» (Figtree Bold 14, secondario); righe alte ≥ 56: locale · ora · chip di stato (pillola con icona: In attesa, Approvata, Non confermata, Scaduta); riga con premio: chip rosa «Premio» |
| **Elimina account, passo 1** | alert avviso (fondo `#F2E1A3`, testo `#4A3300`, bordo 3 px `#4A3300`): «Non si può annullare.»; elenco di cosa succede (**testo da validare**: scrivi «[da validare]»); bottone arancione «Continua: invia il codice» **non rosso**; sotto, a 16 px, bottone secondario «Torna al profilo» a tutta larghezza |
| **Elimina account, passo 2** | campo codice; link «Invia un nuovo codice» **sopra** il campo; bottone **rosso pieno** (`#B3261E`, testo bianco; scuro `#FF8D82` con testo `#2A0A07`) «Elimina definitivamente il mio account»; sotto, a 16 px, «Torna al profilo» |
| **Coda staff** (3 card) | header: segnaposto + chip «3 in coda» (+ «la più vecchia da 2 min»); card: raggio 14, padding 12, bordo 1,5 (la prima 2 px `#2A1F18` con chip «1°»); riga meta 13 «da 2 min · scade tra 6 min»; **codice** Unbounded Bold 22 «K7M4 9Q2X»; stepper − 1 + (44×44) + preset 1·2·5; bottone **«Conferma 1 timbro»** 358×48 con spunta; **16 px sotto** «Rifiuta» outline rosso 48; distanza tra card 16 |
| **Coda: card con premio** | sopra lo stepper: chip rosa «Premio» + «Consegna: Caffè gratis» (nome: «richiede backend») |
| **Coda: esito con annulla** | alert successo «Confermata · 2 timbri» + barra a tempo 4 px + bottone secondario «Annulla» 48; la card sotto non si sposta |
| **Coda: connessione assente** | banner avviso sticky: «Connessione assente: la coda potrebbe non essere aggiornata (ultimo aggiornamento 14:32). Riprovo…» |
| **Coda vuota** | puntino che pulsa + «In ascolto · aggiornato alle 14:32» |
| **404 / link non valido** | icona 48, titolo, testo, bottone «Vai alla pagina iniziale» |

## 5. Ordine consigliato per il pilota

1. Login email (normale + invalido), chiaro e scuro, con D1 a/b.
2. Richiesta approvata (5 timbri, 2 nuovi) e card piena.
3. Dialog del premio audace e sobrio, chiaro e scuro, con D11.
4. Coda staff (3 card + esito con annulla), chiaro e scuro, con D1 a/b.
5. D6: stesse schermate (1 e 2) con il chiaro neutro.

Dopo il pilota: aggiornare `11-decisions.md` (D1, D6, D10, D11) e passare alla chat 6 (Canva mobile).

---
Conteggio parole del brief (blocco tra i marcatori): 224 (limite 250)
