# 40 · Mockup mobile: flusso Cliente · principale (cliente-a)

Sorgente `mockup/cliente-a/cliente-a.mjs` → `cliente-a.html` (36 frame, 18 schermate × chiaro/scuro), PNG in `cliente-a/png/`. Figma: 2 importazioni (20 + 16 frame, nodi `32:2`…`51:2` e `52:2`…`67:2`). Validazione: 36/36 ok (contrasto minimo 5,56; target ≥ 44).

## Frame
N01-N03 nome (vuoto, invalido, tavola salvataggio/rete/429) · S01 `/scan` con gesto e 3 passi (D14) · V01 caricamento · V02 card pronta (passi 1·2) · V03 dopo il tap su Wallet · V04 tavola link non valido/nessuna offerta · V05 tavola 429/generico · R01 in attesa 3 su 10 · R02 in attesa card piena · R03 in attesa promozione cambiata · R04 approvata +2 · R05 dialog del premio (audace) · R06 premio riscattato dopo la chiusura · R07 approvata card piena · R08 tavola rifiutata/scaduta · R09 tavola non trovata/errore/caricamento.

## Cosa cambia rispetto all'app
- **Card timbri** (da dir-i, pilota): numero grande «7 su 10», «ne mancano 3», timbri ruotati, **ultimo timbro «nuovo»** (anello fisso, P3) e **prossimo da riempire** (anello tratteggiato arancione più spesso: miglioramento approvato, vedi scostamenti), codice card in Unbounded.
- **Attesa**: titolo «Aspettiamo la conferma dello staff», chip «In attesa» col puntino vivo (statico qui) e chip **«Scade tra 4 minuti»** (il dato `expiresAt` c'è già).
- **Approvata**: «+2 timbri» come dato principale, dentro l'alert di successo (verde) distinto dall'alert premio (rosa).
- **Premio**: celebrazione (D12); frase «mostra questa schermata al personale» tolta dal dialog e sostituita da «Lo staff lo sa già: ti consegna il premio.»; **riepilogo che resta** dopo la chiusura (R06). Nell'alert «Premio disponibile» la frase «mostra questa schermata al personale» **resta** (decisione del proprietario: lo staff va avvisato).
- **Visita**: passi numerati con il primario sul passo corrente (D15 rimandata: si mostra la variante «espliciti numerati»); «Fatto? Ora chiedi il timbro» che non dichiara l'esito.
- **/scan**: gesto (telefono + NFC / QR) + frase accorciata + tre passi (D14).
- **Errori di pagina**: titolo + testo + bottone di uscita sempre presente; 429 con il tempo nel bottone; «Riprova» solo dove serve.
- **Backend**: «Nome del locale» con etichetta tratteggiata «richiede backend» (D9/D3); nome del premio «Caffè gratis» già nel dato solo quando il premio è stato riscattato; nei frame di card piena senza riscatto il nome del premio richiede backend.

## Scostamenti dallo stile / decisioni autonome
- **«Prossimo da riempire»** evidenziato (anello tratteggiato arancione, 3,5 px): richiesto esplicitamente nelle istruzioni di questa run; `21` §4.5 prevedeva «nessun prossimo evidenziato» (scelta di dir-i). Vince l'istruzione più recente; da confermare.
- **Testo «nome del premio»** in R02/R07 mostrato senza etichetta «richiede backend»: l'app lo riceve solo alla conferma dello staff (`reward` nel risultato). Va verificato: se non c'è, ripiego «Premio disponibile».
- R03: testo «dopo la conferma» aggiunto alla promozione [V].
- Frase di V03 «Non possiamo sapere se la card è stata aggiunta» è mia (CONTEXT §4.6: l'esito non è noto): **testo da approvare**.
- Dialog: «PREMIO!» e coriandoli statici (stato finale); sobria (reduced-motion) non disegnata come frame a parte: coincide con lo stesso blocco senza coriandoli.

## Non verificato
Animazioni (anello, riempimento in sequenza, coriandoli), puntino «in attesa» che pulsa, titolo di S01 a 360 px, resa su telefono vero.

## Revisione dopo la prima verifica del proprietario (2026-11-26)
- **S01 `/scan` ridisegnata**: pannello arancione con telefono che si avvicina al tag NFC (onde), chip «oppure inquadra il QR», titolo a 24 px, passi in linea del tempo (numeri arancioni uniti da una linea puntinata). Prima: tre cerchi con icone e passi senza struttura.
- **V02/V03**: «Aggiungi a Google Wallet» è ora il **bottone ufficiale Google** (asset dell'app `add-to-google-wallet-it-condensed.svg`, copiato in `mockup/lib/assets/`, non ricolorato né ridimensionato; versione condensata come nell'app sotto 380 px). Il primario arancione resta sul passo 2.
- **Figma non aggiornato** (richiesta del proprietario: prima si guardano i PNG): in Figma ci sono ancora le vecchie versioni dei nodi `32:2`…`67:2`; S01, V02, V03 vanno reimportati dopo l'ok.

### Seconda revisione (2026-11-26)
- V02/V03: il badge ufficiale Google Wallet è a **tutta la larghezza** della card (come gli altri bottoni), sotto il testo del passo, non più la versione condensata rientrata.
