# 51 · Report della run «build tablet» (chat 15)

2026-11-26. Solo design: `src/`, `docs/` non toccati, nessun commit. File scritti solo in `design-review/`.

## Passo 0 e decisioni
Tabella D34-D43 in `11-decisions.md`, confermata in chat con tre chiarimenti: **D36 = modale (a) + colonna cliente 32 rem**, **D40 = 2 frame di verifica = Q01 a 1180×820 (chiaro+scuro)**, **D42 = nessuna scorciatoia, «Vai al contenuto» resta**. D37/D38 riguardano solo il desktop (nessun effetto qui).

## Fatto
- **Piano** `52-tablet-plan.md` (generato da `mockup/tablet/plan.mjs`, una riga per frame) e righe tablet in `MOCKUP-INDEX.md`.
- **Base**: `lib/components.css` esteso (sezione tablet, scoped a `.frame.T/.D` e `.hw`: nessun effetto sul mobile); `validate.mjs` esteso (dimensione dichiarata `data-w/data-h`, header = 64, distanza Conferma→Rifiuta ≥ 16). Restano i controlli di contrasto, target, testo minimo, scroll orizzontale, URL esterni.
- **Tre flussi** in `mockup/tablet/` (`accesso`, `cliente`, `staff`): HTML autonomi, PNG scala 2, `validate.json`, note `mockup-tablet-<flusso>.md`. Runner `run.mjs`, fogli di contatto `sheet.mjs`, `record.mjs` (nodi Figma → `status.json`).
- **56 frame** (28 schermate × chiaro/scuro): accesso 6, cliente 16 (incluse N01-N03 aggiunte dopo la consegna, su richiesta: la spec §7 le escludeva), staff 34 (di cui 2 di verifica 1180×820). **Validati 56/56** (contrasto minimo 5,05; 0 URL esterni). Nessun frame bloccato; due correzioni a vista sul primo giro: codici a capo nelle righe «Scaduta/Già gestita» della lista (chip spostato sulla seconda riga) e etichette «Profilo/Esci» nel frame orizzontale.
- **Figma**: dichiarati importati **16 frame** (accesso `232:2`-`237:2`, cliente `238:2`-`247:2`, senza N01-N03); il proprietario dice di **non vederli**: la risposta del server era `success: true` ma non ho potuto verificare (nessuna chiamata di lettura disponibile). Da considerare **non importati**, vedi sotto nella pagina Tablet con `nodeId` `206:14` (accettato, nessuna pagina nuova).

## RUN INTERROTTA: limite Figma
La 4ª `html_to_figma` (staff-1, 20 frame) è stata rifiutata: *«You've reached the Figma MCP tool call limit on the Starter plan»*. Come da regola, importazioni ferme. **Non importati: i 34 frame staff** (L01…SH03 + Q01h), pronti in `mockup/tablet/staff/import/staff-1.html` (20) e `staff-2.html` (14) e in `mockup/tablet/staff/png/`. Il get_screenshot di verifica **non eseguito** (stesso limite): nessuna verifica a vista in Figma, solo sui PNG locali.

## Chiamate Figma (per tool)
| Tool | Chiamate |
|---|---|
| `create_session` | 1 |
| `html_to_figma` | 3 riuscite + 1 rifiutata dal limite (+ 2 POST `curl` sull'URL monouso, non chiamate MCP) |
| `get_screenshot`, `use_figma`, altri | 0 |

## Decisioni autonome (da confermare)
1. **Sezioni in Figma non create**: raggruppare per flusso/ruolo come nel mobile richiede `use_figma`, escluso dalle regole della run. I frame sono in ordine di piano, nome «Tablet · id · schermata · stato · tema».
2. **Una sola `promptId`** per tutta la run (la descrizione del tool la vuole per prompt, non per flusso).
3. **Staff in due importazioni** (20 + 14): 34 frame superano il tetto di 20 per chiamata; la verifica orizzontale va nel secondo lotto.
4. **Q03**: la pillola «↓ 1 nuova» non è disegnata (spec §4.2: compare solo fuori schermo; in A la riga è a vista): chip «Nuova» + contatore «④» + «1 nuova» nella barra.
5. **Tavole Q05-Q07** riadattate alla versione A (D35): in Q07 la riga selezionata diventa «Scaduta/Già gestita» e il pannello resta; Q06 usa dettagli compatti a tutta larghezza.
6. **Q10**: popover ancorato (300, voci 48) al posto del ☰; il titolo sotto è coperto dal popover.
7. **L01/L02/Q11** usano l'header utente (wordmark + voci cliente) perché nessun locale è selezionato.
8. **P01** e le liste staff (Q01, Q03, Q04, Q08, Q10, SH01, Q07 tavole) usano `data-clip` dove il contenuto continua fuori frame.

## Scostamenti / limiti
- Sotto la coda A restano ≈ 600 px vuoti a 820×1180 (4 richieste): nessuna funzione inventata per riempirli.
- **Non verificato**: resa su tablet vero, reflow (WCAG 1.4.10) e zoom (i mockup sono statici: regola in spec §6), hover/focus (non disegnati qui: tavola dei puntatori è della chat desktop), safe area iPad, dark «a occhio» su dispositivo.
- Dettagli del dialog del premio: coriandoli statici (animazione = sviluppo).

## Import manuale (dopo il limite)
PNG a scala 1 (820 px) in `mockup/tablet/figma-import/`, 8 cartelle per sezione (Comuni · Accesso, Cliente · Nome e scansione, Richiesta timbro e premio, Profilo, Storico, Staff · I tuoi locali, Coda richieste, Storico del locale), nomi come nel mobile. Trascinamento + *Add section*: i frame sono immagini, non livelli modificabili. Script: `mockup/tablet/export1x.mjs`.

## Cosa manca
- Verificare cosa c'è davvero nella pagina Tablet (16 frame importati o no).
- Importare in Figma i 34 frame staff (poi, con `use_figma`, creare le sezioni nella pagina Tablet e fare il get_screenshot di verifica).
- Frame non disegnati per scelta della spec §7: Visita, richiesta in attesa/rifiutata, Profilo in modifica, Elimina account, errori di sessione, 404 (si deducono dal mobile con colonna 512).
