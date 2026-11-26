# 40 · Mockup mobile: flusso Staff

Sorgente `mockup/staff/staff.mjs` → `staff.html` (32 frame, 16 schermate × chiaro/scuro). Figma: 2 importazioni (20 + 12 frame, nodi `98:2`…`117:2` e `118:2`…`129:2`). Validazione 32/32 ok (contrasto minimo 5,05; Conferma/Rifiuta 48 px, distanza 16; stepper e pillole 44). Verifica a vista in Figma: `get_screenshot` su Q05 chiaro (`110:2`), confrontato con il PNG locale.

## Frame
L01 elenco locali · L02 tavola caricamento/errore · Q01 coda (3 richieste) · Q02 vuota «in ascolto» · Q03 richiesta nuova («↓ 1 nuova», contatore) · Q04 esito con Annulla (barra a tempo) · Q05 tavola esiti (premio «Consegna», riga quieta, rifiutata, «Chiudi tutti») · Q06 tavola quantità (non valida, alta, minimo) · Q07 tavola Scaduta/Già gestita · Q08 banner di connessione + errore con codice · Q09 scheletro · Q10 menu aperto · Q11 non autorizzato · SH01 storico · SH02 filtri aperti · SH03 vuoto con filtri.

## Cosa cambia rispetto all'app
- **Header**: chip del **locale attivo** (tappabile per cambiare locale) + burger; titolo di pagina «Richieste in coda» (nel pilota il titolo era il nome del locale: ora è nell'header) con contatore «3 in coda · la più vecchia da 2 min» (chip neutro).
- **Card della coda stabili**: prima card con bordo 2 px e chip «1°»; codice grande a gruppi (`44EE-7A5B`, P2); «da N min» / «scade tra N min» (chip avviso nell'ultimo minuto); premio = chip rosa «Premio» + «Consegna: Caffè gratis» (nome del premio: richiede backend, D29); stepper − / valore / + e preset 1·2·5; «Conferma N timbri» 48 px; «Rifiuta» outline pericolo a 16 px sotto. **Conferma sempre attivo** con quantità non valida (messaggio al posto dell'etichetta).
- **Esiti in loco con Annulla** (Q04/Q05): la card toccata si comprime in un esito (verde, rosa per il premio, avviso per il rifiuto) con barra a tempo di 4 s e «Annulla»; poi riga quieta «Gestita 14:32 · +2 timbri» con ✕ (non sparisce da sola). **Annulla funziona solo con invio ritardato di 4 s** (D27 a, richiede codice); un annullamento dopo l'invio richiede backend (D27b): non assunto.
- **Scaduta / Già gestita** (Q07): la card resta con la stessa altezza; i controlli sono sostituiti da un chip e da «Chiudi» (D25 default).
- **Richiesta nuova** (Q03): contatore aggiornato e pillola «↓ 1 nuova» (nessun suono/vibrazione, D28 sobria); il chip «Nuova» sulla card esiste come componente ma la card nuova sta fuori schermo.
- **Errori** (Q08): banner sticky avviso con ora dell'ultimo aggiornamento; errore con codice e ✕ dentro la card interessata.
- **Menu** (Q10): ≥ 220 px, voci con icona (Profilo, Storico richieste, Cambia locale), «Esci» separato; la voce attiva ha la barra, non l'arancione pieno.
- **Non autorizzato** (Q11): testo dell'app «Non sei autorizzato a gestire questo locale.» + bottone «Vai ai tuoi locali» (era un link). Il 404 resta identico tra locale inesistente e di un altro (invariante di sicurezza).
- **Storico del locale**: codice al posto del locale, giorni, chip, riga premio evidenziata; titolo con nome del locale; **nessun filtro per locale** (D21).

## Scostamenti / decisioni autonome
- «Nuova promozione: la card riparte da zero» (pillola info) esiste nel componente `req()` ma non è mostrata in nessun frame del piano; da aggiungere se si vuole una variante.
- Q01: la terza card **non** si vede (con due card da ~300 px il frame è pieno): il segnale «ce n'è un'altra» è nel contatore «3 in coda».
- Q03: la pillola «↓ 1 nuova» è sovrapposta a «Rifiuta» della seconda card: da rivedere per non coprire un'azione [V].
- Differenza Figma ↔ PNG locale (solo Q05 chiaro, a 1x): layout e colori uguali; il chip del locale in header è ~25 px più stretto e il tag «richiede backend» va a capo (larghezze del testo leggermente diverse). Modificabilità dei livelli non verificata.
- Testi miei da approvare: «Il cliente può rifare la richiesta.», «Un collega l'ha già confermata.», «Annulla entro 4 s».

## Non verificato
Auto-aggiornamento della coda, comportamento dei salti di layout (statico), soglia «quantità alta» a 5 (provvisoria), resa a telefono vero.
