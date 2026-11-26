# 01 · Mappa delle schermate

Fonte: `stampy-frontend/src/router/index.ts`, viste in `src/views/`, componenti in `src/components/`.
Stack UI: **Bootstrap 5.3 (solo Sass, niente JS)** + `src/styles/stampy.scss`; tema chiaro/scuro
da `prefers-color-scheme` (`main.ts` imposta `data-bs-theme`). Colonna unica `.narrow` = **max 28rem**
(448px) per ogni pagina: oggi su tablet/PC la pagina è una striscia stretta centrata.
Lingua UI: italiano.

## 0. Ruoli (cosa esiste davvero)

| Ruolo | Come si è | Schermate |
|---|---|---|
| **cliente** | utente loggato senza righe in `venue_members` | visita, richiesta, profilo, storico personale, elimina account, scan |
| **staff** | `venue_members.role='staff'` | coda e storico del locale, elenco locali, profilo |
| **proprietario** | `venue_members.role='owner'` | **identico allo staff nel frontend** (il ruolo non cambia nessuna schermata; lo controlla solo il backend) |

Il frontend **non legge il ruolo**: sa solo se `getMyVenues()` restituisce ≥1 locale (cartella
`staff`+`proprietario` insieme). Il profilo di un membro nasconde "Storico richieste" personale e
"Elimina account" (mostra "Questo account gestisce un locale…").
→ Non sono sicuro che esistano schermate "solo proprietario" nel backend/UI futura: oggi no.

## 1. Sezione **Accesso** (nessun ruolo, pagine fuori da `AppLayout`: header senza menu)

| Schermata | URL | Come ci si arriva | Stati rilevanti |
|---|---|---|---|
| Login email | `/login` (`?next=`, `?deleted=1`) | non loggato su qualunque pagina protetta; dopo logout; dopo eliminazione account | **A** form email vuoto · **B** invio in corso («Invio…», bottone disabled) · **C** errore (`alert-danger`: «Email non valida», generico) · **D** attesa 429 (`alert-warning` «Riprova tra N s/min») · **E** avviso dopo eliminazione account (`alert-success`, `?deleted=1`) · **F** bottone Google (visibile solo se `VITE_GOOGLE_CLIENT_ID` e script Google caricato) |
| Login codice | `/login` (stesso URL, stato `challengeId`) | dopo "Invia il codice" | campo codice a 6 cifre (invio automatico al 6° numero) · «Verifica…» · errore «Codice non valido. Ti restano N tentativi» · «Codice scaduto» (campo disabled, "Invia un nuovo codice" diventa primario) · notice «Codice inviato a …» (reinvio) · attesa 429 |
| Errore sessione | `/session-error` (`?next=`) | `checkSession()` fallisce (backend giù/rete) | unico stato: alert + «Riprova». **Si ottiene fermando il backend** |
| Non trovata | qualsiasi URL sconosciuto, es. `/boh` | URL errato | unico stato (non richiede login: è fuori da `requiresAuth`) |

Il login ricorda email + `challengeId` in storage di tab (`stampy.login`), quindi un reload nello stato «codice» lo mantiene.

## 2. Sezione **Cliente** (dentro `AppLayout`: header con wordmark + menu ☰, tasto Indietro dove previsto)

Dopo il login: se `displayName` è `null` → `/name` (una volta sola). Poi `destinationAfterLogin`:
`?next=` se valido, altrimenti `/scan` per chi non è membro (cliente).

| Schermata | URL | Come ci si arriva | Stati | Dati particolari |
|---|---|---|---|---|
| Come ti chiami? | `/name` | primo login con `display_name` NULL | form vuoto · errore di campo (`is-invalid` + alert) · «Salvo…» | utente con `display_name` NULL (**non esiste in `stampy_dev`**: tutti gli utenti attivi hanno il nome; va creato dalla chat di cattura o simulato svuotando il campo — vedi `01c`) |
| Scansiona (nessun locale) | `/scan` | cliente dopo login senza `next`; "Indietro" dal profilo senza origine | unico stato (card con testo) | – |
| Visita locale | `/v/:venueId` (UUID del locale) | tap NFC / QR; link dopo login | **loading** «Un momento…» · **card pronta** (`card_created` o `card_not_added`: bottoni «Aggiungi a Google Wallet» + «Richiedi il timbro» + codice card; dopo il tap sul link Wallet i due bottoni invertono primario/outline) · **errore**: link non valido (`VenueNotFound`/400, senza Riprova) · locale senza promozione attiva (senza Riprova) · 429 «Troppe richieste. Riprova tra…» · errore generico (con Riprova) | Se esiste già una card **attiva**, la visita crea subito una richiesta e **redirect** a `/r/:id` (non si vede la schermata card). Per vedere la card pronta serve un cliente **senza card** in quel locale (o card `not_added`). Il link Wallet vero richiede Google Wallet: usare il click senza seguirlo (`target=_blank`) |
| Richiesta timbro | `/r/:requestId` | redirect dalla visita; polling ogni 2 s | **loading** · **pending** (card «Richiesta inviata», `StampProgress`, codice card; con `PromotionNotice` se promozione cambiata) · **approvata** (alert-success «+N timbri», `StampProgress`; se `rewardsRedeemed>0` si apre **`RewardDialog`** modale «Premio sbloccato!») · **approvata con premio già visto** (nessun modale: flag in localStorage) · **approvata senza nuovi timbri** («questo prodotto era il premio») · **scaduta** / **non confermata** (con «Richiedi di nuovo» se la tab conosce il locale; altrimenti testo «Avvicina di nuovo il telefono») · **non trovata** (404/400) · **errore** + Riprova · **card piena** (`count>=required`: alert «Premio disponibile» in `StampProgress`) | Serve una richiesta in `pending` (dura pochi minuti: poi scade) per vedere "pending" e poterla approvare/rifiutare dall'altra parte; il `rewards` richiede una card che raggiunge la soglia; `stampsRequired>20` nasconde i pallini (non presente nei dati: soglie 8 e 10) |
| Profilo | `/profile` | menu ☰ → «Profilo» | card nome+email + «Modifica nome» · **form nome aperto** (+ «Annulla») · riga «Storico richieste» (solo clienti) · **card Wallet STATICA** (modello, locale finto «Bar Aurora», 3/10, colore `#1e3a5f`, bottone ufficiale Google Wallet, con variante condensata sotto 380px) · zona pericolosa con «Elimina account» **oppure** testo "gestisce un locale" (membri) | cliente vs membro cambia 2 blocchi. Nome lungo → `text-break` |
| Storico cliente | `/history` | Profilo → riga «Storico richieste» (i membri vengono rimandati a `/profile`) | stati di `RequestHistory`, vedi §4 | cliente con richieste in vari esiti |
| Elimina account | `/account/delete` | Profilo → «Elimina account» | **intro** (bottone danger «Invia il codice» + «Annulla») · «Invio…» · **codice** (campo + «Elimina il mio account» disabled finché non 6 cifre; **non** invia da solo) · errori codice / scaduto / attesa 429 · **bloccato** (alert-warning, per membri) | ⚠ **azione distruttiva**: non completarla su dati reali. Si arriva fino al campo codice senza distruggere nulla; confermare = anonimizza l'utente (irreversibile). Per il blocco: usare un membro |

## 3. Sezione **Staff** (stesso ruolo UI per `staff` e `proprietario`)

Ingresso: `/` → redirect `/staff` → `StaffVenuesView` decide: 0 locali → `/scan` (cliente); 1 locale → `/staff/:venueId`; ≥2 → elenco.

| Schermata | URL | Come ci si arriva | Stati | Dati particolari |
|---|---|---|---|---|
| I tuoi locali | `/staff` | login di un membro con ≥2 locali; menu «Cambia locale» (visibile solo con >1 locale e fuori dall'elenco) | caricamento «Caricamento…» · elenco (bottoni outline per locale) · errore + Riprova | **`giulia.bianchi` ha 2 locali** (Rossi, Fiordilatte): è l'unico per questa schermata |
| Coda richieste | `/staff/:venueId` | redirect da `/staff` (1 locale) o dall'elenco; polling 3 s | «Caricamento…» · **vuota** («Nessuna richiesta in attesa.») · **card richiesta** (codice, ora, «scade tra N min», timbri `x / y`, stepper − [n] +, Rifiuta/Conferma) · con `PromotionNotice staff` · con «· Premio disponibile» · **quantità non valida** (input vuoto/0/>50: messaggio ⚠, Conferma disabled, `aria-invalid`) · **stepper ai limiti** (− disabled a 1, + disabled a 50) · **busy** («Invio…», tutti i bottoni disabled) · **esito in loco** (card verde «✔ Richiesta approvata +N timbri · Premio ritirato…», o gialla «⚠ Richiesta rifiutata», con «Ok»; sparisce da sola dopo 8 s) · **errore azione** (`alert-danger` **sticky** in alto, es. richiesta già gestita) · **poll error** (`alert-warning` connessione) · **non autorizzato** (alert + link «I tuoi locali») · titolo tab `(N) Stampy` | **La coda è vuota in `stampy_dev`** (0 `pending`): le richieste vanno create dal lato cliente (più clienti → più card). Premio disponibile e premio ritirato richiedono una card a soglia. Più richieste insieme per testare lista lunga e sticky |
| Storico locale | `/staff/:venueId/history` | menu ☰ → «Storico richieste» (solo dentro un locale); tasto Indietro → coda | stati di `RequestHistory`, vedi §4 | il DB ha 46 richieste (33 approvate, 4 rifiutate, 9 scadute) |

Menu ☰ (`#app-menu`, tendina): voci dipendono da contesto: sempre «Profilo»; in locale anche «Storico richieste»; «Cambia locale» solo con >1 locale; «Esci» sempre. Voce attiva arancione. Si chiude con click fuori, Esc (riporta il focus sul bottone) e cambio route.
Tasto «Indietro» (44×44): solo su `/profile`, `/history`, `/staff/:id/history`.

## 4. Componente pagina **Storico** (`RequestHistory.vue`: usato in `/history` e `/staff/:venueId/history`)

Titolo («Le tue richieste» / «Storico richieste») · bottone «Filtri» (toggle ▾/▴, aria-expanded) · «Azzera» (compare con filtri attivi) · pannello filtri: select Esito, Timbri min/max (testo), date Dal/Al (`input type=date`) · contatore «N richieste» · elenco card (nome locale o codice, data/ora, stato con icona testuale `✔ ⚠ ⏱ …`, dettaglio «N timbri · N premio riscattato»).
Stati: caricamento «Caricamento…» · lista · **vuota** «Nessuna richiesta trovata.» · **errore** alert · **errore di validazione filtri** (rosso ⚠: min>max, date future, Dal>Al) · pannello aperto/chiuso · filtri da URL (`?status=approved&…`: si può aprire direttamente) · lista **lunga** (non c'è paginazione nel codice letto: **non sicuro** che il backend ne imponga una; il DB ha ≤46 richieste in totale).

## 5. Altri stati trasversali

- **Menu aperto** (§3), **modale `RewardDialog`** (`<dialog>` nativo, bordo arancione, sfondo scuro 60%), **form nome aperto** (profilo).
- **Toast**: non esistono toast. Il feedback è in-page (`alert-*`, esiti in loco, `role="status"`).
- **Bottom sheet**: non esistono. Gli unici overlay sono il menu a tendina e il `<dialog>`.
- **Tema scuro**: tutte le schermate, via emulazione `prefers-color-scheme: dark` (cambia al volo).
- **Titolo tab** dinamico solo sulla coda.

## 6. Cose di cui NON sono sicuro

- Layout reale del bottone Google (iframe Google invisibile sopra un bottone nostro): dipende dallo script esterno e da `VITE_GOOGLE_CLIENT_ID` (è nel `.env.local`/`.env` del frontend, quindi il bottone probabilmente compare; da verificare in cattura. Può non caricarsi offline).
- Se `/scan` abbia mai un contenuto diverso (non ha stati).
- Se esistano URL/ruoli per il proprietario oltre a quelli letti (ho letto router e viste: non ne ho trovati).
- Come si comporta il layout con nomi di locale molto lunghi o `stampsRequired` > 20 (nessun dato di test lo copre).
- Altezze in landscape/tastiera aperta (non verificabili da codice).
