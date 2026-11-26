# 41 · Report della run «mockup mobile» (chat 13, esecuzione autonoma)

2026-11-26. Solo design: `src/`, `docs/` non toccati; nessun commit. Unico file fuori da `design-review/`: `.gitignore` (+2 righe: `design-review/mockup/**/import/` e `design-review/mockup/pilota/figma-check/`; la riga dei PNG c'era già).

## Cosa è stato fatto
- **Piano** `40-mockup-plan.md` (generato) e **indice** `../MOCKUP-INDEX.md`: **122 frame** = 61 schermate × chiaro/scuro (limite 140), 4 flussi, solo mobile 390×844. Dati in `mockup/plan-data.mjs`, rigenerazione con `node mockup/gen-plan.mjs`.
- **Base comune** `mockup/`: `lib/components.css` (token e componenti di `21`), `lib/lib.mjs` (helper: header, alert, bottoni, campo, chip, timbri, card coda…), `lib/icons/` (Phosphor MIT, regular e fill, dal pacchetto `@phosphor-icons/core` 2.1.1), `run.mjs` (build + PNG scala 2 + validazione + file d'importazione), `validate.mjs`, `sheet.mjs` (fogli di contatto), `gen-plan.mjs`, `figma-rec.mjs`.
- **4 flussi** (`accesso`, `cliente-a`, `cliente-b`, `staff`), ognuno con HTML autonomo (font in base64, nessun URL esterno), PNG in `<flusso>/png/` e nota `40-mockup-<flusso>.md`.
- **Validazione** (`validate.mjs`): contrasti sulle coppie testo/fondo (≥ 4,5, grande ≥ 3), target ≥ 44 (Conferma/Rifiuta/bottoni compatti 48, «Perfetto» 58), testo ≥ 13 px, nessun URL esterno, nessuno scroll orizzontale, niente tagli (salvo `data-clip` dove la lista continua volutamente fuori schermo), niente testo troncato. **122/122 frame validi al primo giro dopo i fix mostrati sotto; nessun frame bloccato.**
- **Figma**: tutto importato in «Stampy Mockup v2» (`ybKvCdJRM8LbMDbkWRIYRd`), **8 importazioni** (≤ 20 frame ciascuna). Nodi per frame in `MOCKUP-INDEX.md`.

## Frame bloccati
Nessuno. Giri di correzione (max 3 per frame, usati 1-2): bottoni premuti con scala .98 (target 51 px → `data-h` ridotto di 2), campo «codice morto» che appariva anche rosso (ora tratteggiato e neutro, errore solo nel testo), bottone secondario a metà larghezza nei passi, «Riaggiungi a Google Wallet» che andava a capo, bottoni «Filtri» da 44 px dichiarati 52, codice che andava a capo nello storico staff, storico senza «Indietro».

## Chiamate Figma (per tool, questa run)
| Tool | Chiamate |
|---|---|
| `create_new_file` | 0 (si riusa il file della chat 13 precedente) |
| `create_session` | 1 |
| `html_to_figma` | **8** (+ 8 POST `curl` sull'URL monouso: non sono chiamate MCP) |
| `get_screenshot` | **1** (Q05 chiaro, `110:2`) |
| `whoami`, `get_design_context`, `get_metadata`, `use_figma` | 0 |
| **Totale** | **10** |
Nessun errore di limite. `ToolSearch` per caricare gli schemi non è una chiamata Figma. Il contatore del piano gratuito non è leggibile.

## Verifica a vista Figma ↔ PNG locale
Un solo frame (Q05 chiaro, `110:2`, screenshot a 1x come nel pilota). Layout, colori, bordi, ombre, tratteggi, icone uguali. Differenze: il chip del locale in header è ~25 px più stretto in Figma e il tag «richiede backend» va a capo (testo leggermente più largo/sostituzione del font). Non verificato: modificabilità dei livelli, font reali, gli altri 121 frame.

## Scostamenti dallo stile (motivati)
1. **«Prossimo da riempire»** evidenziato (anello tratteggiato arancione, 3,5 px) sulla card timbri: richiesto dall'istruzione della run; contraddice `21` §4.5 («nessun prossimo evidenziato», scelta di dir-i). Da confermare (vedi P4 sotto).
2. **Login in card** (come l'app) invece che piatto (demo dir-i).
3. **Header staff con chip del locale** e titolo di pagina «Richieste in coda»: il pilota aveva wordmark + titolo col nome del locale. Allineato a `21` §4.9.
4. **Tavole degli stati** in mini-card con didascalie da 13 px: elementi di mockup, non dell'app.
5. Tutti gli scostamenti del pilota (`23` §3: stella nera P1, codice col trattino P2, anello «nuovo» fisso P3, Conferma 48, scrim .72, ecc.) **restano**.
6. Bottone Google: stessa faccia dell'app (G a 4 colori, «Continua con Google», Figtree al posto di Roboto): da verificare con le linee guida di Google (D2 provvisoria).

## Decisioni prese in autonomia (da confermare)
- **P4**: card timbri con ultimo timbro «nuovo» (anello fisso) e **prossimo da riempire** evidenziato.
- **P5**: card Wallet «Bar Aurora» **assente** dal Profilo (D17 approvata «toglierla»); non rappresentata come elemento «richiede backend».
- **P6**: header staff = chip locale + burger; pagina «Richieste in coda».
- D15: nella Visita si mostra la variante «passi espliciti numerati» (orientamento precedente), non l'automatica.
- D10: dialog audace statico (stato finale); la sobria non è un frame a parte (stesso blocco senza coriandoli).
- Testi nuovi (da approvare): «Non possiamo sapere se la card è stata aggiunta: controlla in Google Wallet.», «Cancella il tuo account e i tuoi dati.», «Il cliente può rifare la richiesta.», «Un collega l'ha già confermata.», «Annulla entro 4 s», «Finché i filtri non sono validi non mostriamo l'elenco.», «Nessuna offerta attiva».
- Nessuna decisione irreversibile a due vie: **nessuna schermata saltata**.

## Elementi che richiedono backend o codice (non solo UI)
- **Backend**: nome del locale (D3/D9), nome del premio in coda/storico/card piena (D29), filtro per locale e paginazione dello storico (D21), annullamento vero (D27b). Nei mockup: etichetta tratteggiata «richiede backend» dove compare il dato mancante.
- **Codice frontend**: primari sempre attivi con validazione al tocco, errore di rete ≠ campo invalido, codice di Elimina account conservato su errore di rete (TDD), esito con invio ritardato 4 s e card che restano (Scaduta/Già gestita), pillola «↓ N nuove», chip dei filtri, segnaposto dei ruoli nel Profilo, togliere la card finta (possibile bug).

## Cosa manca
- Tablet e desktop (prossimo lavoro). Stati hover/pressed/focus solo in A06 (tavola) e come classi; nessun frame per ogni controllo.
- Non disegnati: dialog del premio sobrio, `RewardDialog` con più premi, paginazione, `PromotionNotice` staff nella coda, quantità alta come card piena, menu del cliente su `/scan`, nome del locale lungo, 360 px.
- Non verificato: modificabilità in Figma (checklist `31` §4.2), font reali nel file, animazioni, resa su telefono, tema scuro «a occhio» su telefono.
- Piano gratuito: nessun limite raggiunto; non so quante chiamate restino.

## Aggiornamento (dopo la verifica del proprietario, stesso giorno)
Modifiche richieste: (1) `/scan` ridisegnata (S01); (2) Profilo con le card del cliente e bottone Google ufficiale (P01, P04, nuovo P07; **annulla P5**); (3) «Aggiungi a Google Wallet» ufficiale nella Visita (V02, V03). Rigenerati e validati (36/36 e 32/32). **Nessuna chiamata Figma in questo giro**: i nodi di `cliente-a` e `cliente-b` in Figma sono obsoleti (`figma.json`: `stale`). Totale frame ora 124. Chiamate Figma della run: invariate (10).

## Riordino in Figma (2026-11-26, dopo l'ok ai PNG)
- Reimportate le versioni nuove di `cliente-a` (nodi `137:2`…`172:2`) e `cliente-b` (`173:2`…`204:2`): 4 `html_to_figma`. Le 66 vecchie versioni (`32:2`…`97:2`) sono state **eliminate** dal file.
- Con `use_figma` (2 chiamate: 1 lettura, 1 scrittura) tutto è ora nella pagina **«Mobile»**, in **12 sezioni** (una per flusso), con frame rinominati `A01 · Login email · vuoto · chiaro`; chiaro e scuro affiancati, 4 schermate per riga:
  Comuni (Accesso: login · codice · errori di sessione e 404) · Cliente (Nome e scansione · Visita · Richiesta, timbro e premio · Profilo · Storico · Elimina account) · Staff (I tuoi locali · Coda richieste · Storico del locale). Sezioni `206:2`…`206:13`, impilate in verticale con distanza maggiore tra Comuni / Cliente / Staff.
- Create le pagine vuote **«Tablet»** e **«Desktop»**.
- Chiamate Figma di questo giro: 4 `html_to_figma`, 2 `use_figma`, 1 `get_screenshot` (sezione Profilo, `206:8`, verificata a vista), 2 `get_figma_skill` (una con argomento sbagliato). Totale della run: `create_session` 1, `html_to_figma` 12, `use_figma` 2, `get_screenshot` 2, `get_figma_skill` 2.
- Gli ID dei nodi in `MOCKUP-INDEX.md` restano validi (i frame sono stati spostati, non ricreati).
