# TDD: dettagli per il backend

Riferimento da leggere prima di proporre o scrivere test. I 4 passi e la regola "non modificare un test approvato"
stanno in `AGENTS.md`. Il TDD vale per il **backend**; il frontend è escluso.

## La proposta dei test

- Si fa **nel worktree**, con la issue già `In Progress`. Finché il proprietario non approva, non c'è commit di codice di produzione.
- Elenco `describe`/`it`, descrizioni in italiano, con input e risultato atteso.
- Merita **sempre** la proposta, anche per cambi piccoli: invarianti di sicurezza (404 identico tra locali, ruoli,
  idempotenza, filtri di stato nelle `UPDATE`), regola dei timbri, auth.

## Niente mock del DB

I test `api/` usano il DB **del proprio worktree** (`stampy_wt_<id>`), con dati propri, ripuliti in `afterAll`.
I test `unit/` non toccano mai il DB.

## Test su comportamento che esiste già

La task è solo coprirlo, quindi il rosso non c'è. Al suo posto, **verifica per mutazione**:

1. rompi per un momento il codice di produzione (es. cambia lo status);
2. mostra che i test falliscono per il motivo giusto;
3. ripristina e mostra che `git diff` contiene solo i test.

Dichiara la verifica per mutazione nella proposta dei test.

## Un test approvato ha il setup sbagliato

Se un test **approvato** fallisce per un errore del suo setup (non del comportamento), non è un test "da far passare":
dillo all'utente con il motivo, proponi la correzione minima (stesso intento, setup diverso) e **aspetta la conferma**.
Dopo la conferma dichiaralo nel report (sezione "File toccati e test"), con il test e che cosa è cambiato.
Vale anche per i test **già esistenti** da aggiornare perché il requisito è cambiato (es. l'elenco esatto dei campi
di una risposta): segnalali all'utente prima di toccarli.

## Rami raggiungibili solo con una race

Si può simulare la race con `vi.spyOn` su una **funzione di servizio** (mai sul DB). La scelta va dichiarata nella proposta.

## Eccezioni (il TDD non si applica)

Dillo e prosegui, per: configurazione, documentazione, migrazioni senza logica nuova, integrazioni con API esterne
ancora da verificare (`BACKLOG.md` §5).
