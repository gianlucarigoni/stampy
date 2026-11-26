# 01c · Login per ruolo e account di test (`stampy_dev`)

Sola lettura: **non è stato creato né modificato nessun utente**.

## ⚠ Attenzione: il `.env` attuale NON è `console`

`stampy-backend/.env` ha `OTP_PROVIDER=both` (console **e** Gmail) con `GMAIL_USER` e app password
configurati: un login con codice **invia una email vera** (da `stampy.app.dev@gmail.com`) all'indirizzo usato.
Con gli indirizzi `@stampy.test` la consegna fallirà, ma il tentativo parte comunque (e un errore SMTP
potrebbe far rispondere 500: **non verificato**). Per evitare email: avviare il backend con `OTP_PROVIDER=console`.
Non ho modificato il `.env`. Il valore predefinito nel codice è `console` (`env.ts`), ma qui è sovrascritto.

## Avvio senza email vere

`--env-file` di Node **non** sovrascrive variabili già nell'ambiente, quindi basta esportarla prima:

```bash
# dalla radice del repo (backend 3000 + frontend 5173)
OTP_PROVIDER=console npm run dev
```

(Il codice di login appare nel log del backend come `[DEV] codice per <email>: 123456`. È un dato di test, non un segreto, ma **non copiarlo nei file `.md`**.)
Docker e container `stampy-db`: verificato **acceso** (`Up`). Backend e frontend **non** sono in esecuzione (porte 3000/5173 libere).

## Come entrare per ruolo (via UI, con OTP in console)

1. Aprire `http://localhost:5173/login` (o direttamente `/staff`, `/v/<venueId>`: manda a `/login?next=…`).
2. Inserire l'email dell'account → «Invia il codice».
3. Leggere il codice a 6 cifre nel terminale del backend (`[DEV] codice per …`).
4. Digitarlo: si invia da solo al 6° numero.
5. Atterraggio: **cliente** → `/scan` (o `next`); **membro con 1 locale** → `/staff/<id>`; **membro con ≥2 locali** → `/staff`.

Se l'utente non ha `display_name` passa prima da `/name`. Tutti gli account di test sotto **hanno** il nome.

Per catturare con Playwright senza ripetere l'OTP a ogni schermata si può riusare lo stato: dopo il primo login `context.storageState()` salva il cookie `sid`. Gli script e2e esistenti (`stampy-frontend/e2e/lib.mjs`) invece **creano utenti e sessioni nuove** direttamente nel DB e le rimuovono: **non usarli come cattura** (scrivono su `stampy_dev`, creano un locale `E2E …`).

## Account esistenti (tutti `@stampy.test`, utenti con nome)

> Gli account della tabella sono quelli attivi con nome e dominio di test. Nel DB ci sono anche decine di utenti **anonimizzati** (residui di test e2e, senza email) e 3 account con email reali (`gianluca.rigoni@…`, `gigiluca@gmail.com`, `gigilucagglc@gmail.com`: **non usarli per le catture**, con `OTP_PROVIDER=both` riceverebbero email vere).

### Staff e proprietari (`venue_members`)

| Ruolo | Email | Locale/i | Note per la cattura |
|---|---|---|---|
| **proprietario** | `marco.rossi@stampy.test` | Bar Pasticceria Rossi (`bar-rossi`) | atterra direttamente sulla coda |
| **proprietario** | `gennaro.esposito@stampy.test` | Pizzeria Da Gennaro | idem |
| **proprietario** | `chiara.moretti@stampy.test` | Gelateria Fiordilatte | idem |
| **staff** | `giulia.bianchi@stampy.test` | **Rossi + Fiordilatte (2 locali)** | **unico** per `/staff` elenco locali, «Cambia locale» |
| **staff** | `luca.ferri@stampy.test` | Rossi | |
| **staff** | `anna.russo@stampy.test`, `davide.romano@stampy.test` | Da Gennaro | |
| **staff** | `elena.greco@stampy.test` | Fiordilatte | |

I locali hanno branding (colore + logo placeholder `placehold.co`):
Rossi `#7B3F00` (promo 10 timbri → «Caffè gratis», id `fb467a6e-ec61-4f2f-8e2c-251ed7b9727f`);
Da Gennaro `#B22222` (8 timbri → «Pizza margherita gratis», id `fcabed57-e2a6-4ab4-bf2e-b24f689caa30`);
Fiordilatte `#2E8B8B` (10 timbri → «Coppetta media gratis», id `a59ab86c-98e1-4525-8e47-f61de171e55e`).
Gli id servono per `/v/<id>` e `/staff/<id>`.

### Clienti (senza righe in `venue_members`) e le loro carte

| Email | Carte (locale: timbri) |
|---|---|
| `lorenzo.fontana@stampy.test` | Rossi 5/10, Gennaro 7/8, Fiordilatte 7/10 |
| `sofia.conti@stampy.test` | Fiordilatte 3, Rossi 1 |
| `francesca.marino@stampy.test` | Rossi 2, Gennaro 5 |
| `valentina.rizzo@stampy.test` | Rossi 2, Fiordilatte 2 |
| `matteo.ricci@stampy.test` | Rossi 7 |
| `andrea.lombardi@stampy.test` | Gennaro 6 |
| `martina.costa@stampy.test` | Fiordilatte 5 |
| `simone.deluca@stampy.test` | Fiordilatte **0** (card appena creata) |
| altri (`giorgia.barbieri`, `elisa.mancini`, `alessandro.gallo`, `davide.santoro`) | 1 card ciascuno con 2–4 timbri |

(Nessuna card è già **piena**: il massimo è 7 su soglia 8/10. Per catturare «Premio disponibile» o «Premio ritirato» serve portare una card alla soglia: Gennaro/8 con `lorenzo.fontana` (7/8) è il candidato più vicino, ma **farlo scrive nel DB** e va concordato.)

## Cosa manca per la cattura (da decidere nella chat 2)

| Stato | Perché manca | Opzioni |
|---|---|---|
| Coda con richieste in attesa | 0 `pending` (46 richieste in totale: 33 approvate, 4 rifiutate, 9 scadute) | creare richieste dal lato cliente con più account (scritture nel DB; scadono in pochi minuti) |
| Cliente senza card (`card_created`) | tutti i clienti hanno già card nei loro locali | usare un cliente su un locale dove non ha card (es. `simone.deluca` su Rossi o Gennaro) → crea la card (scrittura) |
| `/name` (nome mancante) | tutti hanno un nome | serve un utente nuovo o un utente con `display_name` NULL |
| Card piena / premio | nessuna card a soglia | vedi sopra |
| Storico | **esiste** (dati ok) | – |
| Backend giù (`/session-error`) | – | fermare il backend durante la cattura |
| Google button | dipende da `VITE_GOOGLE_CLIENT_ID` (presente nel `.env` del frontend) e rete | verificare a vista |

Raccomandazione per la chat di cattura: **usare un worktree + DB `stampy_wt_<id>` dedicato** (`worktree-start.sh`) e popolarlo con `scripts/create-venue.ts`/seed, così le scritture non toccano `stampy_dev`. Se invece si cattura su `stampy_dev`, annotare cosa si scrive.
