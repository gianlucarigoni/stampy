# Report: f4 — F4 — Rifiniture grafiche e di usabilità del frontend

- **Issue:** #59
- **Branch:** feat/f4-rifiniture-frontend
- **Data:** 2026-11-11

## Obiettivo

Rifiniture del frontend indicate dal proprietario a voce, una alla volta: ripetizioni nei messaggi, aspetto della zona pericolosa nel Profilo, menu uniforme per cliente e staff, testo dello storico, feedback della coda dello staff. Solo frontend: nessuna modifica al backend, quindi nessun TDD (vedi `AGENTS.md`, il frontend è escluso).

## Decisioni e motivazioni

- **Passo del codice (login ed elimina account):** il messaggio verde "Codice inviato a …" compare solo al reinvio, non al primo invio, perché "Abbiamo scritto a … Il codice vale 5 minuti." lo dice già. Scartato: toglierlo del tutto, perché al reinvio il testo sopra non cambia e non ci sarebbe nessun segno che il codice è partito. La mail resta in chiaro (valutato e scartato l'oscuramento: è già visibile nel Profilo e il vero ostacolo a una frode è il codice, non la mail).
- **Zona pericolosa nel Profilo:** tenuta la struttura che piaceva (card con bordo, titolo "Zona pericolosa", pulsante a tutta larghezza) ma con un rosso per tema (`--stampy-danger`: `#c92a3a` chiaro, `#f0808b` scuro) e bordo/sfondo dello stesso rosso a bassa opacità. Il rosso puro di Bootstrap vibrava sul fondo scuro. Scartate: card neutra con pulsante piccolo (provata, non piaciuta) e riga di lista.
- **Menu:** un solo menu per tutti. "Profilo" sempre; dentro un locale dello staff anche "Storico richieste" (del locale) e, se i locali sono più di uno, "Cambia locale" (mai nella lista dei locali). Così lo storico del locale resta raggiungibile solo dal menu.
- **Storico del cliente vietato a staff e owner (solo frontend):** la riga "Storico richieste" non compare nel Profilo di chi è membro di un locale e `/history` rimanda al Profilo. Il backend (`GET /requests/mine`) non lo impedisce ancora: serve decisione e test concordati (issue #60, punto 5).
- **Storico richieste:** una sola riga di dettaglio per le approvate: timbri aggiunti (senza contare il premio, campo `stampsAdded`) più "N premio riscattato" se c'è. Il frontend non ricalcola la regola dei timbri.
- **Coda dello staff:** tolto il saldo della card del cliente dalla card di esito e tolto il toast "Premio ritirato" (ridondante con la card). La card ora dice "Premio ritirato: <premio>" quando c'è, mantiene "· Premio disponibile" quando la card del cliente è piena. Eliminato il componente `ToastStack.vue` (non più usato altrove).
- **Refuso corretto:** "Eimina account" → "Elimina account".

## Assunzioni e cose da validare

- **Non ho guardato le schermate nel browser** (solo `vue-tsc`, nessun errore): da controllare aspetto in chiaro/scuro della zona pericolosa, menu dello staff e card di esito.
- **Gli e2e (`e2e/history.mjs`, `t6d.mjs`, `feedback.mjs`) non sono stati eseguiti**, solo controllata la sintassi. In `history.mjs` i controlli cercano "3 timbri": se nei dati di prova quel 3 includeva un premio, ora il testo è diverso e vanno adattati.
- Il blocco dello storico del cliente per staff e owner è solo lato frontend (vedi sopra).
- Il maiuscolo/minuscolo di "timbri" e "premio riscattato" è minuscolo (assunto).

## File toccati e test

- File: `stampy-frontend/src/components/AppLayout.vue`, `EmailLogin.vue`, `RequestHistory.vue`, `ToastStack.vue` (eliminato), `src/styles/stampy.scss`, `src/views/CustomerHistoryView.vue`, `DeleteAccountView.vue`, `ProfileView.vue`, `StaffQueueView.vue`, `e2e/feedback.mjs`, `e2e/history.mjs`, `e2e/t6d.mjs`.
- Test: nessuno aggiunto o tolto (backend invariato); totale della suite prima 295 → dopo 295. Typecheck pulito.

## Modifiche proposte ai documenti

### CODEBASE.md
Nelle sezioni sul frontend (menu e schermate):
- Menu burger: "Profilo" per tutti; dentro un locale dello staff anche "Storico richieste" (storico del locale) e, con più di un locale, "Cambia locale". Staff e owner non vedono lo storico del cliente (nascosto nel Profilo, `/history` rimanda al Profilo; solo frontend).
- Coda dello staff: l'esito di una conferma è nella card (timbri aggiunti, "Premio ritirato: <premio>", "Premio disponibile" se la card del cliente è piena), senza saldo e senza toast. `ToastStack.vue` non esiste più.
- `RequestHistory.vue`: dettaglio delle approvate = timbri aggiunti (premio escluso) + "N premio riscattato".
- Stile: variabili `--stampy-danger` / `--stampy-danger-rgb` (per tema) e classi `.danger-zone`, `.btn-danger-soft` in `stampy.scss`.

### BACKLOG.md
- Nuova voce collegata alla issue #60 (F5, `TO-DECIDE`): flusso degli storici per cliente, staff e owner; compreso il blocco di `GET /requests/mine` lato backend per i membri di un locale.
- Da rivedere: gli e2e del frontend toccati (`history.mjs`, `t6d.mjs`, `feedback.mjs`) non sono stati rieseguiti.

## Lacune emerse e task suggerite

- Issue #60 (F5): storici delle richieste, alternative e blocco lato backend.
- Rieseguire gli e2e del frontend e adattare quelli che dipendono dai testi cambiati.
- Il toast non esiste più: se serve un feedback dopo che la card di esito è sparita (8 s), da decidere.

## Problemi di ambiente

- `worktree-start.sh` si è fermato perché la cartella principale era su `feat/frontend-pagina-profilo` e non su `main`. Quel branch aveva un commit non ancora in `main` (`e7d380d`): su richiesta del proprietario ho unito il branch in `main` con `merge --no-ff` (`20c9b03`), fatto il push e rilanciato lo script, che è poi andato a buon fine.
- Per caricare i dati di `dati_test.xlsx` ho scritto uno script temporaneo fuori dal repo (cartella di sessione) e l'ho eseguito sul database del worktree `stampy_wt_f4` (che viene eliminato con il worktree).

## Cosa ho capito e cosa no

- Le istruzioni di `AGENTS.md` e degli script erano chiare. Il TDD non si è applicato (frontend).
- Ho letto "forziamo che non possa vedere le richieste fatte come cliente" come blocco solo frontend, perché il backend richiederebbe test concordati e una decisione di prodotto (riportato in #60).
- Nel file `RequestHistory.vue` ho trovato una versione di `detail` diversa da quella che avevo scritto (dicitura "premio"): non so chi l'abbia modificata, l'ho riportata al testo richiesto.
