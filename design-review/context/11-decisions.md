# 11 · Decisioni del proprietario (design review)

Ultimo aggiornamento: 2026-11-26 (conferme di F6, sezione «Conferme di F6»; chat 10: «Direzione scelta: dir-i»; prima: chat 8, passo 0, dopo le indicazioni del proprietario). Le critiche successive **le rispettano** e non le riaprono.
Le domande nuove si numerano dentro la critica della sezione in cui nascono (Cliente A: D9-D16; Cliente B: da D17 a D24; **Staff: da D25**).

| ID | Tema | Stato | Decisione |
|---|---|---|---|
| D1 | Colore dei bottoni | **APERTA** | Si decide nel pilota Canva con 2-3 varianti, in chiaro e scuro: (a) testo scuro su `#f16417`; (b) due toni, con `#c2410c` per testo/link/bottoni; (c) fondo `#c2410c`. |
| D2 | Google | **provvisoria** | Secondario rispetto all'email; bottone ufficiale Google (Identity Services) personalizzato. Da verificare nella documentazione ufficiale e sui dati d'uso reali. Deve per forza rispettare le regole di Google. |
| D3 | Nome del locale nel login | **RIMANDATA** | Richiede backend (endpoint pubblico): da mettere nel backlog. **Unita a D9** in un'unica voce di backlog («nome del locale e premio nelle schermate»). |
| D4 | Privacy | **SÌ** | Una riga con link all'informativa sotto il login. Testo da validare con un legale. |
| D5 | Rinomina | **decisa** | «Stampy» è un segnaposto: non toccare logo/wordmark; il nome deve essere una **variabile** nel design system. |
| D6 | Tema chiaro caldo | **da provare** | Si prova nel pilota Canva. |
| D7 | Layout grande | **provvisoria** | A+C per ora; B solo se ci sarà contenuto; si decide nelle chat tablet/desktop. |
| D8 | «Accedi» nel codice | **decisa** | Tenuto, sempre attivo. |
| D9 | Nome del locale e premio nelle schermate (Visita, Richiesta) | **APPROVATA** (2026-11-25) | Va nel **backlog, unita a D3**. Richiede backend. Nel mockup ogni elemento che dipende dal backend porta l'etichetta **«richiede backend»**. |
| D10 | Momento del premio: sobrio o audace | **DECISA** (2026-11-25, chat 8, proprietario) | Nel **pilota** si provano **entrambe** le varianti (sobria e audace). L'effetto audace dura **1,5 s** (vince 1,5 s, non ≤ 1 s), **solo CSS**, rispetta `prefers-reduced-motion` (con la preferenza attiva diventa la variante sobria). La **vibrazione non può essere la parte principale** (supporto iOS da verificare). |
| D11 | Accento «premio» | **APPROVATA** (con annotazioni) | L'accento del premio è **distinto** dall'arancione di marca e dal rosso d'errore, e si porta con **icona + testo** (mai solo colore). Si decide **insieme a D1** nel pilota. |
| D12 | Il premio è già consegnato quando si apre il dialog? | **DECISA** (2026-11-25), **precisata** (chat 8) | Il premio è una **CELEBRAZIONE**; quando il dialog si apre è **riscattato lato backend** (segnato alla conferma dello staff). **La consegna fisica la fa lo staff**: deve essere **avvisato dalla schermata dello Staff** (coda e esito: «Premio da consegnare», nome del premio), non dal cliente. Nel dialog del premio va **tolta la frase «mostra questa schermata al personale»** (chiude P-3). |
| D13 | `/name` obbligatorio | **DECISA** (2026-11-25, chat 8) | `/name` è obbligatorio **solo se, dopo il login, il nome non risulta salvato nel database**; **non** prima di ogni richiesta. Una volta salvato, **non verrà più chiesto**. (È il comportamento attuale: la guardia del router scatta con `display_name` nullo.) |
| D14 | `/scan` come casa del cliente | **DECISA** (2026-11-25, chat 8) | **Gesto + passi**: icona/illustrazione del **telefono accanto a un tag NFC e a un QR**, testo attuale accorciato **«Avvicina il telefono al tag o inquadra il QR»**, sotto i tre passi compatti **«1 Avvicina il telefono al tag · 2 Entra con la tua email · 3 Chiedi il timbro e salvalo in Google Wallet»**. Solo UI, nessun backend. La lista delle card resta fuori (si riapre con D16). Testi: suggerimenti da approvare. |
| D15 | Visita: i due passi (Wallet, richiesta) | **RIMANDATA alla fase di design** (2026-11-25, chat 8) | Si decide **guardando il design** (pilota Canva). Orientamento precedente (non vincolante): restano entrambi espliciti, come oggi. |
| D16 | Card del locale al posto dei pallini | **PROPOSTA** (2026-11-25) | Card con branding del locale, stile del modello Wallet del Profilo, in Visita e Richiesta. Valutata in `10-critique-cliente-a.md`; da decidere (richiede backend per nome/branding/premio, come D9). |
| D17 | Card Wallet «Bar Aurora» nel Profilo (PR-1) | **APPROVATA come raccomandazione** (2026-11-25) | **Toglierla** finché B30 non c'è (resta come elemento «richiede backend» nel mockup). In più va trattata come **possibile bug** (vedi «Da verificare/segnalare» n. 2). |
| D18 | Testo di «Elimina account» (EL-2) | **APPROVATA come raccomandazione** | I testi **restano come sono** finché un legale/chi segue la privacy non ha validato cosa viene eliminato/anonimizzato; io non li invento. Vedi «Da verificare/segnalare» n. 1. |
| D19 | Uscita da «Elimina account» (EL-3) | **DECISA** (2026-11-25, chat 8; scelta delegata, mia proposta) | «Annulla» diventa **bottone secondario a tutta larghezza** («Torna al profilo»). Il **passo 1 («Invia il codice») è neutro/arancione, non rosso**: il rosso pieno resta **solo sul passo finale** («Elimina definitivamente»), così il colore segnala il punto irreversibile. Da provare nel pilota con utenti [V]. |
| D20 | «Primari mai disabilitati» anche per «Elimina il mio account» | **APPROVATA come raccomandazione** | **Sì**: il codice resta il gate; con meno di sei cifre il tocco mostra un messaggio. |
| D21 | Storico: limite/paginazione e filtro per locale | **DECISA** (2026-11-25, chat 8) | **Paginazione: sì** (richiede backend, backlog; componente condiviso, vale per cliente e staff). **Filtro per locale: solo per i clienti** (hanno richieste su più locali); **non** per lo staff, che vede solo le richieste del proprio locale. Anche il filtro per locale richiede backend. |
| D22 | Storico: righe per giorno + chip di stato | **APPROVATA come raccomandazione** | **Raggruppare per giorno** con chip di stato (icona SVG + testo + colore). Su desktop diventa tabella (chat desktop). |
| D23 | Un solo verbo per il premio | **DECISA** (2026-11-25, chat 8; scelta delegata, mia proposta) | **«riscattato»** per lo **stato** (storico, esito, dialog cliente, coda), coerente con il dato `rewardsRedeemed`. Per l'**istruzione** allo staff si usa **«Consegna»** («Consegna: Caffè gratis»). «Ritirato» e «ottenuto» non si usano più. Testi: suggerimenti da approvare. |
| D24 | Profilo: «Esci» e conferma di salvataggio del nome | **APPROVATA come raccomandazione** | **Sì** a entrambi (PR-9, PR-7). |

## Direzione scelta (chat 10, 2026-11-26)

**Direzione scelta: dir-i** («Ibrido», `design-system/dir-i.html`, `dir-i-light.png`, `dir-i-dark.png`; palette in `design-system/palettes.mjs` · `I`). Il design system completo è in `21-design-system.md` (mappatura Bootstrap in `21b-bootstrap-mapping.md`, brief Canva in `22-brief-canva.md`).

Decisioni aperte che dir-i **sembra già implicare**: restano **implicite in dir-i, da confermare nel pilota** (non chiuse):

| ID | Cosa implica dir-i | Stato |
|---|---|---|
| D1 | Variante **a**: testo scuro su `#f16417`, in chiaro con bordo `#9a3412` (fondo vs pagina 2,73:1), in scuro senza bordo | **implicita in dir-i, da confermare nel pilota** |
| D6 | Tema chiaro **caldo**: sfondo `#f1ede0`, card `#fbf9f1`, piano `#dfe5d2` (da H); scuro `#1a1410` (da A) | **implicita in dir-i, da confermare nel pilota** |
| D10 | Dialog **audace** (blocco rosa, coriandoli CSS 1,5 s) con la **sobria** come ripiego per `prefers-reduced-motion` | **implicita in dir-i, da confermare nel pilota** (D10 resta «si provano entrambe») |
| D11 | Accento premio **rosa `#ff5fa2`**, con icona + testo, distinto da arancione, rosso e verde | **implicita in dir-i, da confermare nel pilota** |
| D16 | Card timbri **senza** branding del locale (ripiego Stampy, «Nome del locale» con etichetta «richiede backend»): coerente con l'opzione C | non scelta; resta proposta |
| D25-D33 | dir-i mostra la coda con «Annulla» a tempo, card compatta, codice in evidenza: coerente con le raccomandazioni D25 (card «Scaduta/Già gestita» che restano), D27 a, D28 sobria | **non decise** dal proprietario: il design system usa le raccomandazioni come **default provvisorio** |

## Scelte del pilota mockup (chat 12-13, 2026-11-26): PROVVISORIE, da confermare

Fatte nel pilota HTML (`mockup/pilota/pilota.html`, vedi `23-style-from-png.md` e `31-pilota-figma.md`). **Non sono chiuse**: il proprietario le conferma o le cambia guardando i frame.

| ID | Scelta | Stato | Note |
|---|---|---|---|
| P1 | **Stella nera** sul timbro, come in dir-i (l'anello resta `stamp-ink`) | **PROVVISORIA, da confermare** | È probabilmente un effetto accidentale del codice di dir-i (il simbolo non eredita `currentColor`); il contrasto nero su `#f16417` è 6,58:1. L'alternativa è `stamp-ink` (`#2b1408`, 5,45:1). |
| P2 | **Codice con trattino** (`44EE-7A5B`), come in dir-i | **PROVVISORIA, da confermare** | `21` prevede lo spazio. Il testo copiabile resta senza separatore (nota per l'implementazione). |
| P3 | Timbro **«nuovo»** come **anello fisso** nel mockup statico | **PROVVISORIA, da confermare** | Serve solo a mostrarlo nello statico; **l'animazione si decide in sviluppo** (D10 invariata). |

## Scelte della run mockup mobile (chat 13, 2026-11-26): PROVVISORIE, da confermare

| ID | Scelta | Stato |
|---|---|---|
| P4 | Card timbri con ultimo timbro «nuovo» e **prossimo da riempire evidenziato** (anello tratteggiato arancione); `21` §4.5 diceva il contrario | PROVVISORIA, da confermare |
| P5 | ~~Card Wallet «Bar Aurora» assente dal Profilo~~ → **sostituita** (richiesta del proprietario): il Profilo mostra le card del cliente (una per locale, branding: richiede backend) con il bottone ufficiale Google «Aggiungi a Google Wallet» | **decisa dal proprietario** (2026-11-26) |
| P6 | Header staff = chip del locale + burger; titolo di pagina «Richieste in coda» | PROVVISORIA |

## Conferme di F6 (2026-11-26, proprietario, issue #77)

**Queste decisioni vincono sui mockup e sulle tabelle «provvisorie» sopra.** Ciò che non è confermato qui si conferma in dev. **Tutti i testi proposti restano non approvati**: si confermano in dev.

| ID | Esito |
|---|---|
| D1, D6, D11 | **Confermate** come in dir-i. |
| D10 | **Dialog audace** con animazione di 1,5 s (solo CSS); la sobria resta per `prefers-reduced-motion`. |
| D16 | Card mostrata **durante la richiesta**: senza branding, uguale per tutti. Card del **Profilo**: con branding del locale. Servono backend (nome e branding) e frontend. Per ora il Profilo mostra una card statica a tutti, anche a chi non ha card. |
| P1, P2 | Si tiene così (stella nera, codice col trattino); si può cambiare in dev. |
| P3 | L'animazione del timbro «nuovo» si decide in dev. |
| P4 | **Confermata.** |
| P5 | Il Profilo mostra **tutte** le card associate all'utente, col branding del locale come nel Wallet, con la possibilità di aggiungerle al Wallet. L'eliminazione della card si valuta in dev. |
| P6 | **Confermata.** L'header staff è cliccabile: menu a tendina con i locali di cui è staff o owner; un clic cambia locale. La pagina con tutti i locali resta. |
| D25 | Le card «Scaduta/Già gestita» restano, con un pulsante per toglierle dalla coda (solo UI). |
| D26 | «Conferma» sempre attivo; al tocco con quantità non valida, focus sul campo. |
| D27 | Solo UI: un timer di durata sensata ritarda la chiamata; «Annulla» la cancella. |
| D28 | Nessuna vibrazione né animazioni. In dev si può provare un lampeggio luminoso sul bordo della richiesta appena arrivata. **Ordine invertito rispetto al mockup**: la più nuova in alto, la più vecchia in basso. |
| D29 | **No**: il nome del premio non va nella coda. |
| D30 | **Sì**: nome completo / username, non le sole iniziali (richiede backend, B27). |
| D31 | Sì: due colonne su tablet e desktop, una colonna con le card su mobile (come da mockup). |
| D32 | «Esci» **con conferma**. |
| D33 | **No**: l'ultimo locale non si ricorda. |

## Regole globali

- I bottoni primari **non appaiono mai disabilitati**; la validazione avviene al tocco.
- **Anello di focus unico** e **bordi dei campi ≥ 3:1** come token globali.
- I pattern di errore / stato invalido si fissano nel design system **dopo** le critiche di Cliente e Staff (Staff: `10-critique-staff.md`).
- I testi proposti sono **suggerimenti** da approvare (AGENTS.md: le stringhe del codice restano come sono finché il proprietario non decide).
- Ogni elemento di mockup che richiede backend si etichetta **«richiede backend»**.
- Ogni animazione: solo CSS, `prefers-reduced-motion` rispettato, effetti ordinari sotto 1 s, **l'effetto audace del premio fino a 1,5 s** (D10); la vibrazione è solo un extra.
- Gli esiti dell'**addendum focus/pressed** di `10-critique-cliente-a.md` sono **[V]** (da validare a mano), **non fatti**: in particolare «il secondario outline diventa pieno al focus/pressed» può essere un residuo dell'hover del mouse nella cattura.

## Da verificare / segnalare (non è design)

Voci da passare al proprietario come possibili problemi di prodotto/codice, **non** da risolvere nel design system:

1. **Testo di «Elimina account».** Dice che i dati vengono «eliminati», ma il sistema **anonimizza** (AGENTS.md: gli utenti non si cancellano). Serve (a) verificare cosa fa davvero il backend (anonimizzazione, card in Google Wallet, storico, email riutilizzabile) e (b) **validare il testo con chi segue la privacy**. Non scrivo testi legali.
2. **Card finta «Bar Aurora 3/10» nel Profilo e bottone «Aggiungi a Google Wallet» inattivo**: da trattare come **possibili bug** (dato falso mostrato anche ai proprietari; bottone senza azione). Collegato a D17 e a BACKLOG B30.
3. **Errore di rete su `/name` (e nel form del nome del Profilo) che rende invalido il campo**: possibile **bug di feedback** (il nome è corretto, il campo diventa rosso con «!»). Vedi N-4.

## Conflitti da risolvere

Nessuno aperto (chat 8, 2026-11-25, dopo le risposte del proprietario). Risolti: D10 (1,5 s), D13 (solo se il nome non è salvato), D14 (gesto + passi), D19 e D23 (scelte delegate), D21 (paginazione sì; filtro per locale solo cliente). D15 resta rimandata al design.

**Frase «mostra questa schermata al personale» nell'alert «Premio disponibile»** (card piena, richiesta in attesa): **non toccata**, e il proprietario ha chiarito il motivo: lo staff deve essere avvisato che c'è un premio da consegnare. Conseguenza per lo Staff (vedi `10-critique-staff.md`): il premio deve essere **inconfondibile in coda e nell'esito** (CQ-13, ES-2, ES-3: chip «Premio», «Consegna: …»), con il nome del premio (D29, richiede backend).
**Nota da verificare:** la dicitura precedente di D12 («già consegnato») è stata precisata sopra («riscattato lato backend, consegna fisica a cura dello staff»): se in `10-critique-cliente-a.md` restano frasi che dicono «già consegnato», vanno lette così.

## Decisioni responsive D34-D43 (chat 15, 2026-11-26): risposte del proprietario, CONFERMATE (2026-11-26)

Risposte date: D34 A · D35 A · D36 A · D37 A · D38 B · D39 A ovunque · D40 «Desktop da 992 + verifica» · D41 «gradini» · D42 «nessuna» · D43 «la prima». Testo delle alternative in `50-responsive-spec.md` §8. **Stato: CONFERMATE dal proprietario in chat (2026-11-26).** Conferme esplicite: D36 = a + 32 rem; D40 = lettura (i), 2 frame di verifica = Q01 a 1180×820 chiaro+scuro; D42 = nessuna scorciatoia, «Vai al contenuto» resta. Le altre righe non hanno avuto obiezioni.

| ID | Opzione scelta (testo) | Come l'ho interpretata | Dubbi / interpretazioni possibili | Effetto sulla build tablet |
|---|---|---|---|---|
| D34 | **A** · Header con voci: chip del locale + `Coda` (con contatore) e `Storico` + `Profilo`/`Esci` a destra; sul tablet `Profilo`/`Esci` solo icona con `aria-label`. Niente barra laterale. | Esattamente A. | Nessuno. | Header 64 su tutte le schermate staff, voce attiva con barra 4 px `action`, contatore «③» come chip scuro. |
| D35 | **A** · Coda + dettaglio: lista a sinistra, dettaglio del cliente selezionato a destra, 2 tocchi (seleziona → Conferma). Non B (card in colonne). | A: a 820 lista **264** + dettaglio in colonna singola; a 1180 verifica con lo stesso schema. La prima richiesta è già selezionata. | Nessuna ambiguità sul testo. Nota: A **non** è la mia raccomandazione (era B); rischio dichiarato in spec: la selezione può spostarsi se la richiesta scade → la card «Scaduta» **resta selezionata**. Le regole di geometria stabile (§4.2 punti 1-2) valgono solo per B: in A l'esito vive nel pannello di dettaglio e la riga della lista diventa quieta. Dettaglio ha codice 36, stepper 56, Conferma 64. | Q01-Q09 si ridisegnano nella forma A (la spec dà il wireframe per A e B; per le tavole stati uso la stessa logica). |
| D36 | **a** · Premio su tablet = modale centrata (440), come desktop e telefono. | «A» = alternativa **a**. | D36 contiene **due cose**: (1) modale a/foglio b; (2) colonna cliente **32 rem** invece di 36. Tu hai risposto solo «A»: l'ho letto come **a** per il premio **e** conferma di 32 rem (la raccomandazione). Alternativa: «A» vale solo per il premio e i 32 rem restano aperti → in tal caso userei 36 rem (21 §7). **Uso: a + 32 rem.** | R05 su tablet: blocco rosa 440 centrato, scrim .72, coriandoli in %. Colonna cliente 512. |
| D37 | **a** · Login desktop con card centrata (come tablet). | Alternativa **a**. | Nessuno. Riguarda solo il desktop: sul tablet il login è già card 480 centrata. | Nessun effetto sul tablet (vale per la chat desktop). |
| D38 | **b** · Card timbri su desktop in due colonne (card 512 + colonna con esito/codice 360). | Alternativa **b**, **solo desktop**. | Contraddice la mia raccomandazione (a): la colonna destra è quasi vuota e l'esito finisce a lato, dove non si legge prima della card (R-5). Lo applico solo dove la spec lo dice: **da 992**. Sul tablet verticale (768-991) resta colonna 512 (spec §3.2). Il tablet orizzontale 1180 prende il layout desktop (D40), quindi avrebbe le due colonne: ma R04 non è nel frame di verifica orizzontale, quindi non lo disegno. | Nessun frame tablet cambia; R04 tablet = colonna. Da ricordare per la chat desktop e per la nota nel report. |
| D39 | **a** · Storico a righe per giorno, **ovunque** (tablet e desktop), niente tabella. | Alternativa **a** su ogni viewport. | «ovunque» = anche cliente e staff, anche desktop. Nessuna tabella, quindi niente `<table>`. Colonna 720 centrata sul tablet (756 disponibili). | H01 e SH01-SH03 a righe per giorno con intestazione sticky; filtri: toggle + pannello a 3 colonne su tablet. |
| D40 | **Desktop da 992 + verifica**: il tablet orizzontale usa il layout desktop (con tocco), più 2 frame di verifica (1180×820); nessun frame dedicato per tutto lo staff. | Prima opzione di D40. | Possibili letture: (i) 2 frame di verifica = **Q01 coda chiaro+scuro a 1180×820** (spec §7: «Q01 coda, 1 schermata, 2 frame»); (ii) verifica = anche altre schermate (es. login). **Uso (i)**. Con D35-A la verifica mostra lista + dettaglio con ampiezza ≥ 992 (lista 360, non 264). | 2 frame in più in «Verifica orizzontale», target touch ≥ 44 anche a 1180 (D43/«input segue il puntatore»). |
| D41 | **Gradini**: `t-title` 28 → 32 e `t-big` 38 → 44 da tablet; gli altri token invariati. | Prima opzione di D41. | «gradini» poteva voler dire anche «scala a più gradini» (più token che crescono): **uso la lettura della spec** (solo 2 token cambiano; corpo 17 invariato). | Titoli 32, numero timbri 44 su tutti i frame tablet. |
| D42 | **Nessuna** scorciatoia da tastiera (solo comportamento nativo + link «Vai al contenuto»). | Prima opzione di D42. | «nessuna» poteva significare anche «nemmeno “Vai al contenuto”» (che è una novità [I]). **Uso la spec: nessuna scorciatoia, ma «Vai al contenuto» sì** (non è una scorciatoia, è un link). Se vuoi toglierlo dimmelo. | Nessun frame cambia (il link è visibile solo al focus); lo documento nella tavola focus se ne faccio una. |
| D43 | **La prima**: controlli d'azione ≥ 44, ridurre solo menu (40), righe tabella (52), campi filtri (48) — **solo con puntatore fine**. | Prima opzione di D43. | «la prima» = prima riga della tabella delle opzioni. Con D39-a le «righe tabella 52» non servono più. **Sul tablet touch non cambia nulla**: ≥ 44 ovunque, Conferma/Rifiuta 48 (nel dettaglio di A: 64/56), distanza ≥ 16; la riduzione vale solo con `(pointer: fine)`. | Tutti i frame tablet a target touch pieni. |

Dipendenze incrociate: D35-A + D34-A = header con voci sopra la coda a due pannelli (nessuna barra laterale); D39-a elimina il secondo layout dello storico; D38-b e D37-a riguardano solo il desktop.
