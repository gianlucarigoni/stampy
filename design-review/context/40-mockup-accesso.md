# 40 · Mockup mobile: flusso Accesso

Chat 13 (esecuzione autonoma). Sorgente: `mockup/accesso/accesso.mjs` → `accesso.html` (24 frame, 12 schermate × chiaro/scuro), PNG in `accesso/png/` (ignorati da git).
Figma: file «Stampy Mockup v2» (`ybKvCdJRM8LbMDbkWRIYRd`), 2 importazioni (20 + 4 frame, nodi `8:2`…`27:2` e `28:2`…`31:2`; ordine = ordine del piano `40-mockup-plan.md`). Validazione: 24/24 frame ok (contrasto minimo 4,64; nessun testo < 13 px; target ≥ 44; nessuno scroll orizzontale; nessun URL esterno).

## Frame (A01…A12, ciascuno chiaro + scuro)
A01 login vuoto · A02 invio in corso · A03 email non valida · A04 tavola errori di sistema (429, rete) · A05 account eliminato · A06 tavola focus/premuto · A07 codice vuoto · A08 codice non valido · A09 tavola codice scaduto/tentativi finiti · A10 tavola verifica/reinvio/429 · A11 errore di sessione · A12 404.

## Cosa cambia rispetto all'app
- Titolo «Accedi» a 28/800 Unbounded, sottotitolo invariato; campo 52 px con bordo 2 px `field` (≥ 3:1).
- **Primario mai disabilitato**: vuoto, invio in corso (spinner + «Invio…»), errore: sempre pieno.
- **Stato invalido**: bordo `danger` + barra sinistra + icona nel campo + messaggio con icona al posto del suggerimento (spazio riservato di 2 righe: il bottone non si muove). Errori di sistema (429, rete) in alert in cima e **campo neutro**.
- **Riga privacy** sotto il login (D4) con link «Leggi l'informativa sulla privacy»: testo **da validare** con un legale.
- **Google**: bottone secondario sotto «oppure», G a 4 colori come nell'app (D2 provvisoria: nell'app il bottone reale è un iframe di Google sovrapposto; qui è la sua faccia; da verificare nella documentazione ufficiale, in particolare font e dimensioni).
- Codice: un solo campo (Unbounded 28), «Non arriva? Controlla anche lo spam.»; codice morto: campo tratteggiato «Codice non più valido» e «Invia un nuovo codice» **primario**, «Accedi» sparisce; reinvio: spinner sul solo link («Invio…»), «Verifica…» solo sul primario.
- Errore di sessione: titolo + istruzione + «Riprova» + uscita «Vai alla pagina iniziale». 404: icona + bottone «Vai alla pagina iniziale».
- Testi proposti usati (da `21` §8): «Controlla l'indirizzo: manca la @ o il dominio.», «Hai fatto troppe richieste: riprova tra N min.» (diviso in titolo + riga), «Nuovo codice inviato.», «Connessione non riuscita / Controlla la connessione. Se continua, riprova tra poco.».

## Scostamenti dallo stile
- Il login sta in una card (come nell'app), non «piatto» come nella demo di dir-i: mantiene la struttura dell'app.
- Le tavole degli stati mettono ogni stato in una mini-card con didascalia (13 px): didascalie di mockup, non UI dell'app.
- A08: l'«Ultimo tentativo.» (proposta di copy) non è mostrato; nel mockup c'è «Ti restano 3 tentativi.».

## Problemi / non verificato
- Resa a telefono vero, font di Google, animazioni dello spinner (statico) non verificati. Titolo di A07 («Inserisci il codice») sta su una riga a 390; a 360 px potrebbe andare a capo [V].
- «Nome del locale nel login» (D3) non mostrato: richiede backend, rimandato.
