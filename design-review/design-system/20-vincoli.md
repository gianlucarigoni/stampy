# 20 · Vincoli non negoziabili (design system, chat 9)

Sintesi delle quattro critiche (`10-critique-*.md`) e di `11-decisions.md`. Valgono per **qualunque** direzione visiva.
Dove una decisione è ancora aperta lo dico. Le sigle (L-, CQ-, ES-, P-, K-…) rimandano alle critiche.

## 1. Contrasto (WCAG 2.x AA)

| Regola | Soglia | Da dove viene |
|---|---|---|
| Testo normale (anche 14-16 px semibold) | **≥ 4,5:1** su **tutti** i fondi su cui compare (pagina, card, tinta degli alert, bottone) | L-2 |
| Testo grande (≥ 24 px, o ≥ 18,66 px bold) | ≥ 3:1 | WCAG |
| Componenti UI e bordi di campo, stepper, timbri vuoti | **≥ 3:1** su pagina **e** su card | L-6, CQ, K |
| Alert: testo su tinta | ≥ 4,5:1; l'alert si riconosce anche **senza** colore (icona + testo + bordo) | L-8 |
| Rosso e verde in **scuro** | oggi 4,08 (`text-danger`, «Rifiuta», «Premio disponibile»): devono salire sopra 4,5 | CQ, ES, PR |
| Non basta il colore per nessuno stato | icona **SVG** + testo (chip di stato, premio, errore) | D11, D22 |

**D1 (colore dei bottoni) resta aperta.** Le tre varianti sono calcolate in entrambe le direzioni:

| Variante | Bottone | Testo | Contrasto | Note |
|---|---|---|---|---|
| a | `#f16417` | scuro (`#1f1612` / `#1a1410`) | 5,56 / 5,71 | tiene l’arancione vivo; in chiaro il fondo del bottone contro la pagina è < 3:1 (2,94 / 2,58): serve un bordo scuro o un testo che regga da solo |
| b | `#c2410c` (bottoni, link); `#f16417` solo decorativo (timbri, wordmark) | bianco | 5,18 | due toni da gestire |
| c | `#c2410c` ovunque | bianco | 5,18 | un solo tono, meno vivace |

In Bootstrap: con a si rimette `$min-contrast-ratio: 4.5` e `$color-contrast-dark` al nostro scuro (sparisce l’hack attuale di abbassare la soglia a 3); con b/c basta `$primary: #c2410c` e un `--stampy-brand` separato.

## 2. Focus e bordi (token globali, un solo posto)

- **Un solo anello di focus**: 3 px, `outline-offset` 2 px, colore `--focus-ring` con ≥ 3:1 su pagina **e** card, uguale su campi, bottoni, link, righe-link e dialog. Via l’alone doppio di Bootstrap (`$input-btn-focus-width`, `$input-focus-box-shadow` a `none`), perché oggi annulla l’anello globale su `.form-control` e `.btn` (L-6, L-7).
- **Bordo dei campi ≥ 3:1** (oggi 1,30 chiaro / 2,26 scuro): `$input-border-color` e la sua variante scura.
- Bordo delle card: decorativo (può restare chiaro), ma la **separazione** card/pagina deve reggere anche in scuro (dialog: scrim + bordo).
- Stato **premuto** ≠ hover ≠ focus, visibili tutti e tre (esiti dell’addendum focus/pressed sono ancora **[V]**: da provare a mano).

## 3. Bottoni primari mai disabilitati

- «Conferma», «Chiedi il timbro», «Invia il codice», «Accedi», «Elimina…» restano **sempre attivi** (D20): la validazione avviene **al tocco**, con messaggio **sotto il campo** (pattern di `/name`: bordo + icona + testo al posto del suggerimento, **senza spostare il bottone**).
- Stato «in lavorazione»: spinner + testo diverso («Invio in corso…»), bottone ancora ben leggibile.
- Lo stepper a quantità 1 non mostra «−» spento: il minimo è uno stato, non un disabilitato sbiadito (CQ).
- Il danger ha un solo token per tema (fondo, testo, bordo, pressed), distinto dall’accento premio (D11) e dall’arancione.

## 4. Il momento del premio (D10, D11, D12)

- Il premio è una **celebrazione** già **riscattato lato backend**; la consegna fisica è dello staff. Nel dialog **niente** frase «mostra questa schermata al personale» (P-3).
- Si prova sobrio e audace; l’audace dura **1,5 s**, **solo CSS**, **`prefers-reduced-motion` lo riduce alla variante sobria**; la vibrazione è solo un extra.
- Accento del premio **distinto** da arancione di marca, rosso d’errore **e** verde di successo; si porta **con icona + testo** («Premio riscattato», «Consegna: Caffè gratis»). Verbo unico **«riscattato»**; istruzione allo staff **«Consegna»** (D23).
- Il nome del premio compare (dato già presente); il **nome del locale richiede backend** (D3/D9): etichetta **«richiede backend»** nei mockup.
- Il riepilogo **resta** sulla card dopo la chiusura del dialog (K-5): non scompare senza traccia.
- Timbri: stati vuoto / pieno / **nuovo** / **prossimo** / premio, con «ne mancano N» e numero grande («7 su 10»).

## 5. Coda staff (velocità e rischio di tap)

- **Niente salti di layout sotto il dito** (CQ-15, pattern 36): una richiesta scaduta o gestita resta al suo posto come «Scaduta» / «Gestita»; l’esito si **comprime**, non rimuove; lo spazio degli errori è riservato.
- **Codice del cliente grande** (≥ 28 px, monospazio, cifre tabulari, a gruppi), «da N min» e scadenza leggibile.
- **Annulla** a tempo (~4 s) per conferma e rifiuto; «Rifiuta» è visivamente diverso da «Conferma» e a ≥ 16 px di distanza.
- Segnale di **richiesta nuova** + contatore sticky; coda vuota «in ascolto»; banner di connessione persistente.
- Quantità: stepper con **preset**, errore al posto dell’etichetta, avviso per quantità alte; target ≥ 48 px.
- Premio come **chip** in coda e nell’esito, con il nome (nome del premio in coda: **richiede backend**, D29).
- Si prova prima la card **sobria** (tutte le card visibili); «una card alla volta» e gesti restano fuori finché non c’è l’annulla e una prova a mano.

## 6. Tema scuro caldo e tema chiaro caldo

- Scuro: fondo caldo (famiglia `#171310`), niente grigio freddo: card, input disabilitato, bordi e alert tutti nella stessa temperatura.
- Chiaro: **D6 «da provare»**: i due candidati sono caldi (crema/carta), non il bianco-grigio Bootstrap. Il tema segue `prefers-color-scheme` (nessun interruttore manuale per ora).
- Le due temperature devono avere gli stessi **ruoli** di token (non due palette indipendenti).

## 7. Responsive di base

- Mobile first, 390 px di riferimento; nessuno scorrimento orizzontale a 360 px.
- Colonna unica `.narrow` (max 28 rem) oggi: sotto i 576 px si resta così; **tablet/desktop si decidono nelle chat 7-8** (D7 provvisoria: A+C). Il design system definisce i token e le densità («compatta» per liste e coda), non i layout grandi.
- Target tocco ≥ 48 px; input a 17 px (niente zoom iOS); testo corpo ≥ 16 px.
- Movimento: solo CSS, ≤ 1 s (premio audace ≤ 1,5 s), sempre spento con `prefers-reduced-motion`.

## 8. Altri vincoli

- Il nome **«Stampy» è una variabile** (D5): nessun logo nuovo, il wordmark è un segnaposto testuale.
- Icone **SVG**, mai emoji; nessun font di icone.
- Font **in self-hosting** (niente CDN esterni): caricare Google Fonts trasmette l’IP del visitatore a Google, da verificare con chi segue la privacy (D4). Solo `woff2`, sottoinsieme latino, `font-display: swap`.
- Etichetta **«richiede backend»** su ogni elemento che dipende da un dato che non c’è (nome del locale, nome del premio in coda, nome del cliente).
- Testi: sono suggerimenti, le stringhe del codice restano come sono finché il proprietario non decide.
