# 40 · Mockup mobile: flusso Cliente · profilo, storico, elimina account (cliente-b)

Sorgente `mockup/cliente-b/cliente-b.mjs` → `cliente-b.html` (30 frame, 15 schermate × chiaro/scuro). Figma: 2 importazioni (20 + 10 frame, nodi `68:2`…`87:2` e `88:2`…`97:2`). Validazione 30/30 ok (contrasto minimo 5,05; target ≥ 44).

## Frame
P01 profilo · P02 modifica nome · P03 tavola nome invalido/errore server/«Nome aggiornato» · P04 menu aperto · P05 profilo di un account che gestisce un locale · P06 scheletro (ruoli non noti) · H01 storico per giorno · H02 filtri aperti con chip attivi · H03 errore sul filtro · H04 tavola vuoto/vuoto con filtri · H05 tavola caricamento/errore · E01 elimina: intro · E02 elimina: codice · E03 tavola errori del codice · E04 elimina bloccato (membro).

## Cosa cambia rispetto all'app
- **Profilo**: header con «Indietro» + wordmark; sezione «Elimina l'account» (al posto di «Zona pericolosa») con bottone danger outline; «Esci» nel menu (D24). **La card Wallet «Bar Aurora» è tolta** (D17): non è un elemento «richiede backend» mostrato, è proprio assente; resta da trattare come possibile bug/B30.
- **Membro (P05)**: niente riga Storico; la sezione dice che l'account gestisce un locale. «Cosa fare» (B4b) **non mostrato**: non so quale azione esista [V].
- **Storico**: raggruppato per giorno («Oggi», «Ieri», «20 ottobre») con ora breve, chip di stato (icona + testo + bordo) e riga premio evidenziata (barra rosa a sinistra); toggle «Filtri · 2», chip rimovibili, «Azzera» link; errore **sotto il campo colpevole**, e con filtri non validi l'elenco è sostituito da «Correggi i filtri». **Filtro per locale** solo nel cliente, con etichetta «richiede backend» (D21).
- **Elimina account**: passo 1 **non rosso** (primario arancione «Continua: invia il codice»), «Torna al profilo» secondario a tutta larghezza a 16 px; passo del codice con **rosso pieno solo sul bottone finale**, «Invia un nuovo codice» sopra il campo, codice morto → solo «Invia un nuovo codice». Primario mai disabilitato (D20): «Qui il codice non si invia da solo.» nel suggerimento.
- **Testo legale** (D18): «Se continui, tutti i dati dell'account vengono eliminati, comprese le card dei tuoi posti preferiti.» è il testo dell'app (con una virgola aggiunta) con l'etichetta «testo da validare (privacy)»; non è stato riscritto. Resta aperto il fatto che il sistema anonimizza.

## Scostamenti / decisioni autonome
- Nelle righe dello storico il nome del locale va a capo accanto al chip (390 px): accettato; alternativa (chip sotto al nome) da valutare.
- «Cancella il tuo account e i tuoi dati.» sotto «Elimina l'account» è un testo mio (da approvare). «Finché i filtri non sono validi non mostriamo l'elenco.» idem. «Non hai ancora richieste. Quando chiedi un timbro, la vedrai qui.» e «Nessun risultato con questi filtri.» sono dal `21` §8.
- Select e date sono disegnati come campi con freccia (aspetto del controllo nativo non verificato).
- «Premio riscattato · Caffè gratis» nello storico: il nome del premio nello storico richiede backend (dato non presente).

## Non verificato
Selezione date/valori nativi aperti, date localizzate, paginazione («Carica altri», richiede backend D21 non disegnata), resa a 360 px.

## Revisione dopo la prima verifica del proprietario (2026-11-26)
- **Profilo con le card del cliente** (P01, P04): sezione «Le tue card» (etichetta «richiede backend»: elenco delle card con branding, nome del premio, B30) con una card per locale in stile Wallet (fascia colorata del locale, timbri, «Ancora N timbri») e, dentro ognuna, il **bottone ufficiale Google «Aggiungi a Google Wallet»** (asset dell'app `add-to-google-wallet-it.svg`, non modificato). **Sostituisce la scelta P5** (card finta tolta, D17): ora la card è reale e per locale, non il modello fisso «Bar Aurora». Nel frame il profilo è più lungo dello schermo (`data-clip`: si scorre); storico ed «Elimina l'account» stanno sotto le card.
- Nuovo **P07**: tavola degli stati della sezione (nessuna card, scheletro, errore con Riprova). Totale cliente-b: 32 frame (16 schermate).
- Colori dei locali (`#7a1f2b`, `#1e3a5f`) e testi «Al decimo, un caffè/un cono in regalo» sono dati di esempio: vengono dal backend.
- **Figma non aggiornato**: i nodi `68:2`…`97:2` sono la versione precedente; P01, P04 da sostituire e P07 da aggiungere (cliente-b passa a 32 frame: 2 lotti da 20+12).

### Seconda revisione (2026-11-26)
- Le card del Profilo hanno ora **la stessa struttura della card timbri dell'app** (numero grande «3 su 10», «ne mancano 7», griglia 5 colonne di timbri con anello e **stella**, ruotati, vuoti tratteggiati, prossimo da riempire evidenziato) ma nei colori del locale: fondo = colore del locale, timbro = disco bianco con stella e anello del colore del locale. Via le spunte.
- **Bottone Google Wallet**: file ufficiale dell'app, non modificato, scalato solo in proporzione a **tutta la larghezza** (326 px → circa 51 px di altezza, contro i 52 degli altri bottoni: non si può avere larghezza e altezza identiche senza deformare il badge). Niente versione condensata, niente ricolorazione, nessun bordo aggiunto. **Da verificare** sulle linee guida di Google Wallet (non le ho lette: ho solo rispettato non-alterazione, proporzioni e spazio libero).
