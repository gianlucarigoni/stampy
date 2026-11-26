# 50 · Specifica responsive: tablet e desktop (chat 14)

2026-11-26. Solo design: `src/`, `docs/` non toccati, nessun commit, **nessuna chiamata Figma**.
Stile e token = dir-i (`21-design-system.md`); il mobile 390×844 è approvato e **non cambia**.
Anteprime: `mockup/responsive-preview/` (HTML autonomi, PNG a scala 2 in `png/`, fogli `foglio-tablet.png` e `foglio-desktop.png`). Dove una misura è scritta «(anteprima)» è stata **misurata sul frame validato**; le altre sono proposte.

**Cosa ho guardato davvero** (Read sul PNG): `dir-i-light.png` e `dir-i-dark.png` (ritagliati a fette), i PNG mobile `A01-chiaro`, `R04-chiaro`, `R05-scuro`, `Q01-chiaro`, `H01-chiaro`, i due fogli di contatto nuovi e, per i dettagli, `desktop-coda-b-chiaro` e `desktop-storico-b-chiaro`. **Non ho visto** su un tablet o monitor veri: la resa a schermo è giudicata dai PNG.

Etichette: **[I]** novità mia (non è nell'app né nei mockup mobile) · **[codice]** serve logica Vue, non solo stile · **[backend]** dato che oggi non c'è («richiede backend») · **[V]** da validare su dispositivo/con lo staff.

---

## 1. Breakpoint, griglia, misure

**Principio: il layout segue la larghezza, l'input segue il puntatore.** Un tablet orizzontale (1180) prende il layout desktop ma resta *touch*: target e spaziature dipendono da `(pointer: coarse | fine)`, non dal breakpoint.

| | Telefono | Tablet (verticale) | Desktop (incl. tablet orizzontale) |
|---|---|---|---|
| Larghezza CSS | < 768 | **768–991** (riferimento **820×1180**) | **≥ 992** (riferimento **1440×900**; verifica 1180×820) |
| Bootstrap | `xs`/`sm` | `md` | `lg`, `xl`, `xxl` |
| Margine laterale pagina | 16 | **32** | **40** minimo, poi contenitore centrato |
| Gutter di griglia | 16 | **24** | **24** |
| Colonna cliente (card, form) | piena, max 28 rem (448) sopra 576 | **32 rem (512)** centrata | **32 rem (512)** centrata (o 2 colonne, D38) |
| Contenuto staff | piena | piena, **756** (820 − 2·32) (anteprima) | max **1100** di contenuto, centrato (anteprima) |
| Colonne coda staff | 1 | **2** card da 366 (anteprima) | **3** card da 350 (anteprima) |
| Altezza header | 56 | **64** | **64** |
| Padding card | 16 (coda 12) | cliente 24 · coda 12→**16** | cliente 24 · coda **12** (la card resta quella del telefono) |
| Spazio tra sezioni | 36 | 36 | 48 |
| Timbri (card cliente) | ≈ 62, 5 colonne, gap 10 | **≈ 83**, 5 colonne, gap 12 (anteprima) | idem |

Perché 32 rem e non 36 (come in `21` §7): con 32 rem i timbri vengono ≈ 83 px (con 36 rem ≈ 94, fuori scala accanto al testo) e la riga di testo resta ≤ 60 caratteri. **Scostamento da `21` §7**, da confermare (D36).

Perché 1100 di *contenuto* (e non di contenitore): con 3 colonne da 350 la card della coda ha **la stessa larghezza del telefono** (358): è la stessa card, non una nuova. Il contenitore Bootstrap `.container` (1140 a `xl`) non coincide: si usa un `max-width` proprio (≈ 6 righe, già previsto in `21b` §6).

**Scala tipografica** (token invariati, solo gradini per viewport; D41)

| Token | Telefono | Tablet | Desktop |
|---|---|---|---|
| `t-title` (Unbounded 800) | 28 | **32** | **32** |
| `t-section` | 19 | 19 | 19 |
| `t-big` (numero timbri) | 38 | **44** | **44** (anteprima) |
| `t-code` (coda) | 22 | 22 | 22 (elenco coda A: 17; dettaglio: **36**) |
| Corpo, campi, bottoni, chip, didascalie | 17 · 17 · 17 · 13 · 13 | invariati | invariati |

Il corpo **non** cresce: 17 px è già grande; si evita di cambiare l'impaginazione dei testi (copy invariato). Interlinea e pesi invariati. Titoli ≤ ~24 caratteri come sul telefono (Unbounded è larga).
**Breakpoint in `em`** (`48em`, `62em`) per le nostre regole custom, così «testo ingrandito» sposta il layout come lo zoom (§6) **[codice]**. Bootstrap emette px: non basta il solo Sass.

Altezza: nessun contenuto dipende dall'altezza; il login si centra in verticale (tablet/desktop), il resto parte dall'alto. Sotto `max-height: 31em` (zoom 400%) header e banner non sono sticky (§6).

---

## 2. Navigazione per viewport

Voci reali oggi (menu ☰): Profilo · Storico richieste · (staff: Cambia locale) · Esci. **Nessuna voce nuova.**

**Telefono**: invariato (header + ☰).

**Cliente, tablet e desktop** (una sola proposta: le voci sono 2 + Esci, non serve di più): niente ☰; header 64 con wordmark a sinistra e a destra `Profilo · Storico richieste` + separatore + `Esci` (neutro, ultima, lontana: D32). Sul tablet le voci restano con testo (c'è spazio) (anteprima `tablet-card-chiaro`). L'anonimo (login) ha solo il wordmark.

**Staff, tablet e desktop: DUE alternative** (D34)

```
A · Header con voci                          B · Barra laterale
┌──────────────────────────────────────┐     ┌────┬────────────────────────────┐
│[Bar Rossi ▾] [Coda ③][Storico]  ◯  ⇥ │     │ ★  │  Richieste in coda          │
├──────────────────────────────────────┤     │ ▣  │                             │
│  Richieste in coda                   │     │Coda│   (contenuto più stretto    │
│  ...contenuto a tutta larghezza...   │     │ ③  │    di 80 px su tablet,      │
│                                      │     │Stor│    di 240 px a pannello     │
└──────────────────────────────────────┘     │ ◯  │    aperto su desktop)       │
                                             │ ⇥  │                             │
                                             └────┴────────────────────────────┘
```

| | A · Header con voci (in anteprima) | B · Barra laterale |
|---|---|---|
| Come | chip del locale (cambio locale) + voci `Coda` (con **contatore**) e `Storico` + `Profilo`/`Esci` a destra; sul tablet `Profilo`/`Esci` solo icona (con `aria-label`) | colonna fissa: marchio, chip locale, `Coda ③`, `Storico`, in basso `Profilo`, `Esci`; **80 px** solo icone su tablet, **240** con testo su desktop |
| Pro | si riusa il pattern del telefono (header + chip); costa poco (è l'header di oggi + 2 link); tutta la larghezza va ai contenuti (3 colonne da 350); il contatore «Coda ③» è sempre visibile | scala se le voci aumentano; l'altezza dello schermo non è mangiata dall'header; più «da gestionale» |
| Contro | se le voci crescono oltre ~5 va ripensato; 64 px di altezza persi (poco: la coda sta su 2 righe a 900) | mangia 80–240 px di larghezza: a 820 restano **740** → 2 colonne da ~358 strette; più CSS e più stati (collassata/espansa); più «peso» per 3 voci |
| Costo | basso | medio (**[codice]**: stato aperto/chiuso, focus trap su tablet) |

La voce attiva ha `aria-current="page"`, fondo `surface-2` e **barra 4 px `action`** sotto l'header (come la barra del menu mobile): attiva ≠ focus ≠ hover (§5). Il contatore («③») è un chip scuro (testo `bg` su `text`), numero + `aria-label="3 richieste in coda"`.

---

## 3. Layout per sezione e schermata

Convenzione dei wireframe: `▮` = card/blocco, `[ ]` = bottone, `•••` = contenuto ripetuto. Il «cosa cambia» è sempre rispetto al mobile.

### 3.1 Accesso (utente anonimo)

**Login email** (A01–A06)
Tablet: header con solo il wordmark; la card (480, padding 32) è **centrata in orizzontale e in verticale** sul fondo `bg` (anteprima `tablet-login-chiaro`).
```
┌─ 820 ───────────────────────┐
│ ★ Stampy                    │
│                             │
│     ┌──────────────────┐    │
│     │ Accedi           │    │
│     │ Email [........] │    │
│     │ [Invia il codice]│    │
│     │ ── oppure ──     │    │
│     │ [G Continua con…]│    │
│     └──────────────────┘    │
└─────────────────────────────┘
```
Desktop, **due alternative** (D37):
```
a · Card centrata (come tablet)         b · Diviso
┌────────────────────────────┐          ┌──────────────────────────────────┐
│ ★ Stampy                   │          │ ★ Stampy                         │
│        ┌─────────┐         │          │ ┌────────────┐  ┌──────────────┐ │
│        │ Accedi  │         │          │ │Niente      │  │ Accedi       │ │
│        │ …       │         │          │ │password.   │  │ Email [....] │ │
│        └─────────┘         │          │ │ ○ ○ ○ ○ ○  │  │ [Invia…]     │ │
└────────────────────────────┘          │ └────────────┘  └──────────────┘ │
                                        └──────────────────────────────────┘
```
| | a · Centrata | b · Diviso |
|---|---|---|
| Pro | una sola struttura per tablet e desktop; zero contenuto nuovo; il campo è subito sotto lo sguardo | dà presenza di marca su 1440 (usa l'arancione e i timbri); il pannello riempie lo spazio vuoto |
| Contro | molto vuoto ai lati (≈ 70%); poca personalità | **[I]** serve contenuto: titolo «Niente password.» (già nel testo del login) e timbri decorativi; D7 diceva «B solo se c'è contenuto»; un secondo layout da mantenere |

I campi non diventano più larghi di 480; le due righe di suggerimento restano riservate (nessun salto). Il bottone Google va **ricalcolato a ogni resize/rotazione** (oggi lo calcola una volta sola, `onMounted`): per il tablet in orizzontale è un difetto reale **[codice, V]**.

**Codice / errori / 404 / errore di sessione** (A07–A12): stessa card 480 centrata (tablet e desktop). Le tavole degli stati restano card impilate con la stessa larghezza (non si affiancano: sono alternative, non un elenco). Il campo codice (Unbounded 28) resta uno solo, 52 px.

### 3.2 Cliente

Regola generale: **colonna 32 rem centrata** su `bg`, con l'header largo (§2). Tutto ciò che sul telefono è una pila di card resta una pila; non si inventano pannelli.

**Nome (`/name`), `/scan`, Visita** (N01–N03, S01, V01–V05): colonna 512 centrata; il pannello arancione di `/scan` (heropanel, 200) e i 3 passi restano in colonna; sul desktop il pannello arriva a 240 di altezza **[V]**. Nessun secondo layout: sono schermate di passaggio (il cliente le vede una volta).

**Richiesta, card timbri** (R01–R09)
Tablet (anteprima `tablet-card-chiaro`):
```
┌─ 820 ──────────────────────────────────┐
│ ★ Stampy            Profilo  Storico  ⇥│
│     ┌───── 512 ──────────────────┐     │
│     │ ✔ Richiesta approvata +2   │     │
│     │ ┌ card ───────────────────┐│     │
│     │ │ Nome del locale         ││     │
│     │ │ 7 su 10 (44)            ││     │
│     │ │ ●  ●  ●  ●  ●   (≈83)   ││     │
│     │ │ ●  ●  ○  ○  ○          ││     │
│     │ └─────────────────────────┘│     │
```
Desktop, **due alternative** (D38):
```
a · Colonna (come tablet)             b · Due colonne
        ┌── 512 ──┐                   ┌── card 512 ──┐  ┌─ 360 ────────┐
        │ ✔ +2    │                   │ 7 su 10      │  │ ✔ +2 timbri  │
        │ ▮ card  │                   │ ● ● ● ● ●    │  │ Codice card  │
        └─────────┘                   │ ● ● ○ ○ ○    │  │ 44EE-7A5B    │
                                      └──────────────┘  └──────────────┘
```
| | a · Colonna | b · Due colonne |
|---|---|---|
| Pro | l'alert di esito sta **sopra** la card: ordine di lettura invariato (R-5); identica al tablet | usa la larghezza; la card è subito in alto a vista |
| Contro | stretta nel vuoto | la colonna destra è **quasi vuota** (alert + codice): poco contenuto (D7); sposta l'esito a lato, dove non si legge prima della card |

Il numero grande sale a 44; il **timbro «nuovo»** (anello) e il **prossimo da riempire** (P4) restano come nel mobile. Stati dell'attesa, rifiutata, scaduta, non trovata: stesse card, colonna 512.

**Dialog del premio** (R05, R06): vedi §4.1 (alternative modale/foglio).

**Profilo** (P01–P07): colonna 512; le **card del cliente** (una per locale, branding [backend]) restano impilate in colonna (non una griglia: sono 1–3 e hanno testo largo). Con 4 o più card da desktop si può passare a 2 colonne **[V, I]** (non ora). Il form del nome è inline: campo + `Salva` sulla stessa riga da 768 (campo 1fr, bottone 140) **[I: solo impaginazione]**.

**Storico del cliente** (H01–H05): è il componente condiviso con lo staff: vedi §4.4 (alternative righe/tabella). Sul cliente la tabella ha in più la colonna **Locale** (e il filtro per locale, [backend], D21).

**Elimina account** (E01–E04): colonna 512 (resta stretta per leggere; il rosso pieno solo sul passo finale, D19). Nessuna novità.

### 3.3 Staff

**I tuoi locali** (L01, L02): lista a colonna **560** centrata (righe 56 → su desktop con puntatore 56 invariato). Non si fa una griglia di card: ogni locale ha solo il nome; una griglia sarebbe vuota. Se un giorno arriverà un contatore per locale (D33, [backend]), allora card.

**Coda richieste** (Q01–Q11) — **DUE alternative** (D35), stesso contenuto (anteprime `*-coda-a-*` e `*-coda-b-*`, a 820, 1440 e 1180×820):

```
A · Coda + dettaglio                          B · Card in colonne
┌ lista 360 ──┐ ┌ dettaglio ────────────┐     ┌──────────┐ ┌──────────┐ ┌──────────┐
│▮ 44EE-7A5B ◀│ │1° da 2 min  scade 1min│     │1° da 2min│ │da 1 min  │ │da 30 s   │
│  YG4G-2QN2 ⓟ│ │ 44EE-7A5B (36)        │     │44EE-7A5B │ │YG4G-2QN2 │ │9Q23-TSZG │
│  9Q23-TSZG  │ │ 1 / 10 timbri         │     │ −[1]+ 125│ │ ⓟ Premio │ │ −[1]+ 125│
│  K7M4-9Q2X ⓝ│ │ −[1]+  1 2 5          │     │[Conferma]│ │ −[2]+ 125│ │[Conferma]│
│             │ │       ┌─[Conferma 1] ┐│     │[Rifiuta ]│ │[Conferma]│ │[Rifiuta ]│
│             │ │       └─[Rifiuta   ] ┘│     └──────────┘ │[Rifiuta ]│ └──────────┘
└─────────────┘ └───────────────────────┘     ┌──────────┐ └──────────┘
                                              │ ⓝ K7M4…  │
                                              └──────────┘
```
A 820 (tablet): A = lista 264 + dettaglio (colonna singola); B = 2 colonne da 366.

| | A · Coda + dettaglio | B · Card in colonne |
|---|---|---|
| Caso normale | **2 tocchi**: seleziona, poi Conferma (la prima è già selezionata: se è la 1ª basta 1) | **1 tocco**: Conferma sulla card (come sul telefono) |
| Pro | bersagli enormi (Conferma 64, stepper 56); un solo cliente alla volta a fuoco: meno errori su quantità; lista compatta mostra molte richieste insieme | zero nuovo da imparare (stessa card del telefono, 350–366 px); le azioni sono **allineate sul fondo di ogni riga** (anteprima), quindi stesso gesto su ogni card; ogni card è già «a portata» |
| Contro | la selezione può **spostarsi** se la card selezionata scade/viene gestita altrove (stesso rischio di CQ-15, da risolvere con «Scaduta» che resta selezionata); il dettaglio ha molto spazio vuoto a destra se la quantità è 1; più codice (stato di selezione, focus tra lista e dettaglio) | con molte richieste (> 6) la pagina scorre; il «segnale di nuova» deve funzionare con la griglia (§4.2); la 4ª card va a capo e il suo spazio dipende dalle altre |

**Tabella** (codice · da N min · timbri · quantità · Conferma · Rifiuta in una riga, come suggeriva `21` §7): **scartata** dalle due alternative. Motivo: Conferma e Rifiuta finirebbero affiancati nella stessa riga a pochi px (l'errore più grave dello staff, CQ-15/ES-1), lo stepper con preset è largo e la quantità non è una colonna di sola lettura. Resta valida solo se il volume in coda superasse ~15 richieste (non c'è dato) **[V]**.

**Esiti, quantità, errori, scaduta/già gestita, banner, caricamento** (Q03–Q09): le regole di `21` §4.11 e §5.6 valgono identiche; in B ogni cella conserva la sua altezza (§4.2). Il banner di connessione e il contatore sono sticky sotto l'header (64) a tutta la larghezza.

**Cambia locale / menu** (Q10): su tablet/desktop il chip del locale apre un **menu ancorato** (popover, larghezza ≥ 280, voci 48 / 44 con puntatore) con i locali; scompare il ☰ (le altre voci sono nell'header, §2). **Non autorizzato** (Q11): card centrata 480, 404 identico.

**Storico del locale** (SH01–SH03): §4.4.

---

## 4. Pattern

### 4.1 Dialog e premio

| Dialog | Telefono | Tablet | Desktop |
|---|---|---|---|
| Premio (`<dialog>` nativo, non si chiude col clic sul fondo) | blocco rosa quasi a tutta larghezza (12 di margine) | **DUE alternative** sotto (D36) | **modale centrata, 440 px**, scrim .72, 190 px dall'alto (anteprima) |
| Standard (conferma) | centrato, margini 16 | centrata, max **480** | centrata, max **480** |
| Menu a tendina | sotto il bottone | ancorato al pulsante (min 220) | idem |

**Premio su tablet — due alternative** (D36)

| | a · Modale centrata (440) | b · Foglio dal basso (560) |
|---|---|---|
| Pro | stessa forma di desktop e telefono; il blocco rosa «galleggia» sopra la card (anteprima `tablet-dialog-a`); nessun caso speciale | «Perfetto» cade **vicino al pollice** se il tablet è in mano; l'ancoraggio in basso evita di coprire la card |
| Contro | «Perfetto» sta a metà schermo (lontano da chi tiene il tablet in basso) | non è un pattern coerente col resto (nessun altro foglio); su iPad serve la **safe area** inferiore; il foglio ha gli angoli superiori tondi e **senza «gradino»** (la lastra scura d'ombra non ha senso a filo schermo) |

In entrambe: i coriandoli occupano la fascia alta (126) e si distribuiscono **in percentuale** (non in px fissi); la durata (1,5 s), la variante sobria per `prefers-reduced-motion` e il focus iniziale su «Perfetto» (anello `ring-on-prize`) non cambiano. **Non** si aggiunge una «maniglia»: non c'è gesto di trascinamento, sarebbe un'affordance falsa.

### 4.2 Coda staff su schermo largo (geometria stabile, Annulla, richiesta nuova)

Regole comuni a A e B (estendono `21` §5.6):

1. **La cella conserva l'altezza.** In B ogni cella della griglia ha l'altezza della **riga** (la più alta); quando una card diventa «esito», «Scaduta» o «Già gestita» **riempie la stessa cella** (altezza congelata misurando la card prima del cambio **[codice]**): nulla sotto o accanto si sposta. La riga si accorcia solo quando **tutte** le sue card sono chiuse con «Chiudi» o «Chiudi tutti».
2. **Le azioni sono ancorate al fondo della cella** (`margin-top: auto` sul Conferma, visibile nell'anteprima): su una riga, tutti i «Conferma» sono alla stessa quota, anche se una card ha in più la riga del premio. Chi tocca sempre nello stesso punto sbaglia meno.
3. **Ordine = arrivo (FIFO)**, sinistra → destra, poi riga sotto; **non si riordina mai** per un aggiornamento. L'ordine del focus da tastiera (Tab) è lo stesso del DOM (non per colonna).
4. **Annulla** (4 s, solo UI, D27a): l'esito in loco sta **dentro la stessa cella**, con la barra a tempo e il bottone `Annulla` a 48; dopo 4 s resta la riga quieta «Gestita 14:32 · +2 timbri» con ✕ (44). In A l'esito sta nel pannello di dettaglio e la riga della lista diventa quieta.
5. **Richiesta nuova** (D28 sobria): chip «Nuova» arancione per 3 s **sulla card**; il contatore del tab/voce («Coda ③» → «④») e «4 in coda» si aggiornano; il titolo scheda «(N)». La pillola «↓ 1 nuova» compare **solo se la card nuova è fuori schermo**. Su 1440×900 le **prime due righe** (6 card) stanno a vista, quindi nel caso comune la pillola non serve; su tablet 1180 stanno 3–4 card. La nuova card **si aggiunge in fondo**: con la griglia compare nella prima cella libera dell'ultima riga, non sposta nulla.
6. Suono, vibrazione, Wake Lock (modalità «banco» fissa) = D28 audace: **non cambia** col viewport; resta una decisione a parte.

### 4.3 Elenco locali, form e campi, stati vuoti

- **Elenco locali**: colonna 560, righe 56, nome + chevron (nessuna griglia).
- **Form**: etichetta sopra, campo 52 (filtri compatti 48 in barra), larghezza massima **480** (login, nome, codice); mai campi a tutta pagina. Il messaggio d'errore sostituisce il suggerimento nella riga riservata a 2 righe (nessun salto), anche su desktop. I filtri inline (§4.4) mettono le etichette sopra ogni campo.
- **Stati vuoti**: icona + titolo + testo + azione, in una card **max 480 centrata** nell'area del contenuto (non a tutta larghezza); la coda vuota («In ascolto · aggiornato alle 14:32») resta una card piccola, non un pannello vuoto da 900 px. Le righe di testo non superano **~60–70 caratteri** (`max-width: 36rem` sui paragrafi).
- **Scheletri**: stessa altezza della card finale; in B le card scheletro sono 3 per riga e per 2 righe (non si anticipa il numero reale).

### 4.4 Storico: righe per giorno o tabella (D39)

Il pannello filtri: telefono = toggle «Filtri · N»; tablet = toggle + panel che si apre su 3 colonne; **desktop (≥ 992) = barra sempre visibile** su una riga (Esito · Timbri min · max · Dal · Al, campi 48) con i chip dei filtri attivi sotto: è solo impaginazione, i campi sono quelli esistenti (anteprima `desktop-storico-*`).

```
a · Righe per giorno (colonna 720)            b · Tabella
┌──────────────────────────────────────┐      ┌─────────────────────────────────────────────────────┐
│ Oggi                                 │      │ Data        Codice      Esito      Timbri  Premio   │
│ 14:14 44EE-7A5B  2 timbri   ✔ Appr.  │      │ Oggi 14:14  44EE-7A5B  ✔ Approvata    2     —       │
│ 11:02 YG4G…   Premio…       ⓟ Premio │      │ Oggi 11:02  YG4G-2QN2  ⓟ Premio       —  Caffè…     │
│ Ieri                                 │      │ Ieri 18:05  9Q23-TSZG  ✔ Approvata    1     —       │
│ …                                    │      └─────────────────────────────────────────────────────┘
```
| | a · Righe per giorno | b · Tabella |
|---|---|---|
| Pro | è già il componente mobile (D22, intestazione sticky per giorno): meno codice, coerente cliente/staff; ottima in colonna 720 | su 1440 **confronta a colpo d'occhio** (codice, esito, timbri in colonne allineate); usa la larghezza; dà ordine alle date |
| Contro | in 1440 usa metà schermo e lascia vuoto a destra; si legge in verticale | **[codice]** `<table>` accessibile (`th scope`, riga premio con barra e tinta), reflow a colonna sotto 768 = due strutture; su tablet 820 le colonne diventano strette (Dettaglio unisce Timbri e Premio) |

In **tabella non c'è hover di riga**: le righe non sono cliccabili (ST-4); un hover sarebbe un'affordance falsa. Il premio resta riconoscibile da chip + tinta + barra 4 px, mai dal solo colore. **Nessuna ordinazione** per colonna (sarebbe una funzione nuova). «Carica altri» (paginazione, [backend] D21) sta sotto la tabella/lista.

---

## 5. Puntatore e tastiera

Tutti gli stati sotto vanno in `@media (hover: hover) and (pointer: fine)` (21b §6); sul tablet touch non esiste «hover appiccicoso». Un iPad con trackpad è `pointer: fine` e riceve hover: va bene. Frame di riferimento: `desktop-puntatore-chiaro` (tavola degli stati, anteprima).

| Elemento | Hover (puntatore) | Focus da tastiera | Premuto | Cursore |
|---|---|---|---|---|
| Primario | fondo `action-hover` (`#f7782f`/`#f87a35`; testo 6,50 / 6,80:1) | anello unico 3 px, offset 2 | `action-pressed`, scala .98 | `pointer` |
| Secondario | fondo `surface-2` (12,45 / 12,29:1) | idem | `surface-2` | `pointer` |
| «Rifiuta» (pericolo outline) | fondo `danger-tint` (5,41 / 7,15:1) | idem | `danger-tint`, testo `danger-tt` | `pointer` |
| Link | sottolineatura 2,5 px | idem | testo `text` | `pointer` |
| Voce di navigazione | fondo `surface-2` (non cambia la barra attiva) | idem; l'anello **non sostituisce** lo stato attivo | — | `pointer` |
| Stepper −/+ e preset | fondo `surface-2`; ai limiti nessun hover | idem | idem | `pointer` (limite: `default`) |
| Riga-link (profilo, locali) | fondo `surface-2` | anello con offset | `surface-2` | `pointer` |
| Chip filtro (✕) | cerchio `surface-2` sul solo ✕ | anello sul ✕ | — | `pointer` |
| Campo | **nessun cambio** (il bordo 2 px è già ≥ 3:1) | anello; il bordo non cambia colore | — | `text` |
| Riga dello storico, card della coda, testo | **nessun hover** (non cliccabili) | — | — | `default` |
| Codice | — | — | — | `default`; **doppio clic** = seleziona tutto il codice **[I, codice]** (`user-select: all`; il testo copiato è senza trattino) |

- **Mai `cursor: not-allowed`**: i primari non sono mai disabilitati; il limite dello stepper è `aria-disabled` con cursore `default`.
- **Niente tooltip** (21 §2.8): nessuna informazione sta solo in un `title`. Le date sono scritte per esteso nella tabella.
- **Tastiera**: solo il comportamento nativo (Tab / Maiusc+Tab, Invio/Spazio sui bottoni, Esc su menu e dialog, frecce nel `select`). **Nessuna scorciatoia custom**: ritiro la proposta di `21` §7 («Invio = conferma la prima», `+`/`−`): un tasto che conferma senza un bersaglio visibile è l'errore che il design della coda vuole evitare (CQ-15). Si riapre solo se lo staff la chiede **[V]** (D42).
- **Ordine del focus**: header (chip locale → voci → Profilo → Esci) → titolo → card/righe in ordine FIFO. Un **link «Vai al contenuto»** (primo Tab, visibile solo al focus) evita 4–5 Tab a ogni pagina **[I, codice]**. Nel dialog il focus resta intrappolato (nativo); il focus iniziale è sul bottone sicuro.
- **Focus non coperto** (WCAG 2.4.11): `scroll-padding-top` ≥ 80 px (header 64 + respiro) perché l'elemento a fuoco non finisca sotto l'header/banner sticky.

**Dimensione dei target**
- **Tablet touch** (e ogni `pointer: coarse`, anche in orizzontale): invariati, **≥ 44**; Conferma/Rifiuta 48, distanza ≥ 16; stepper 44 (nel dettaglio di A: 56).
- **Desktop con puntatore**: si tiene **44** per i controlli d'azione (Conferma, Rifiuta, stepper, preset, ✕, voci di navigazione) e **48** per i bottoni della coda. Si **riduce solo** ciò che non è critico: voci dei menu a tendina 48 → **40**, righe di tabella 56 → **52** (anteprima), campi dei filtri 52 → **48**. Il minimo AA (24 px, WCAG 2.5.8) è sempre rispettato; il 44 non è obbligatorio ma qui serve a non cambiare la mano dello staff tra telefono e PC (D43).

---

## 6. Accessibilità, zoom e testo ingrandito

- **Reflow** (WCAG 1.4.10): a 400% su 1280 (= 320 CSS px) vale il layout telefono; a 200% su 1440 (= 720) vale il **tablet** (2 colonne); a 200% su 1180 (= 590) il telefono. Nessuno scroll a due dimensioni; nessun contenuto a larghezza fissa > 320 (campi e card sono `max-width`, non `width`).
- **Testo ingrandito di sistema** (iOS Dynamic Type, Android, `font-size` del browser): i **breakpoint in `em`** (`48em`, `62em`) fanno passare al layout stretto quando il testo cresce; le dimensioni sono già in `rem` (21: tranne header 44/56 e bottone Google in px).
- **Sticky a 400% o con poca altezza** (`max-height: 31em`): header, banner e pillola non sono più sticky (coprirebbero metà schermo); la barra laterale (se D34-B) diventa una barra in alto con le voci in un menu.
- **Spaziatura del testo** (1.4.12): nessuna altezza fissa su testo; i chip e i bottoni crescono (`min-height`, non `height`) **[codice]**; la tabella permette il ritorno a capo dentro la cella.
- **Tabelle**: `<table>` con `<caption>` (anche visivamente nascosta), `th scope="col"`; sotto 768 si torna alle righe per giorno (nessuno scroll orizzontale nella tabella).
- **Annunci**: il cambio di pagina sposta il focus su `<main>`; `role=status` per il contatore e l'aggiornamento della coda (un solo annuncio per nuova richiesta, non per ogni poll).
- **Contrasti**: i colori sono quelli di `21`; i nuovi stati hover sono calcolati sopra (≥ 5,41:1 il testo). Il bordo del primario in chiaro (`action-bd`) resta: con l'hover il fondo su `bg` fa 2,33:1 e il contorno `#9a3412` assicura il 3:1.
- **Non verificato**: screen reader, zoom reale su browser, tablet fisico, `prefers-reduced-motion` sul foglio del premio.

---

## 7. Perimetro proposto per la build

Convenzioni: frame = una schermata in un tema; **chiaro + scuro** sempre; tavola = più stati nello stesso frame (come nel mobile). Si costruiscono **dopo** le scelte D34–D39: il numero sotto vale per la variante che sceglierai (una sola per schermata).

**Tablet 820×1180**

| Gruppo | Schermate (id del mobile) | n. | Frame |
|---|---|---|---|
| Cliente/accesso (**minimo**) | A01 login, A07 codice, A04 errori di sistema (tavola), S01 scan, R04 approvata, R05 premio, P01 profilo, H01 storico | 8 | 16 |
| Staff (**completo**) | L01, L02 (tavola); Q01 coda, Q02 vuota, Q03 nuova, Q04 esito, Q05 esiti (tavola), Q06 quantità (tavola), Q07 scaduta/gestita (tavola), Q08 errori connessione, Q09 caricamento, Q10 cambio locale, Q11 non autorizzato; SH01, SH02, SH03 | 16 | 32 |
| Verifica orizzontale 1180×820 | Q01 coda (layout desktop con tocco) | 1 | 2 |
| **Totale tablet** | | 25 | **50** |

**Desktop 1440×900**

| Gruppo | Schermate | n. | Frame |
|---|---|---|---|
| Cliente/accesso (**minimo**) | A01 login, A07 codice, R04 approvata, R05 premio, H01 storico | 5 | 10 |
| Staff (**completo**) | stesse 16 schermate del tablet | 16 | 32 |
| Stati del puntatore | tavola hover / focus / cursore (nuova, [I]) | 1 | 2 |
| **Totale desktop** | | 22 | **44** |

**Totale: 94 frame** (mobile ora 124 → 218). **Importazioni Figma** (max 20 frame per `html_to_figma`): tablet 3 (20 + 20 + 10) + desktop 3 (20 + 20 + 4) = **6**. Chiamate Figma stimate: 1 `create_session` + 6 `html_to_figma` + 1–2 `use_figma` (riordino nelle pagine «Tablet» e «Desktop» in sezioni come per il mobile) + 1–2 `get_screenshot` = **9–11**. Con `figma-rec.mjs` e `run.mjs --import` il flusso è lo stesso del mobile.

Cosa **non** si disegna per i clienti (si deduce dal mobile con la regola «colonna 512 centrata»): `/name`, Visita, Richiesta in attesa/rifiutata/scaduta, Profilo in modifica, Elimina account, errori di sessione e 404. Cliente su desktop: solo 5 schermate perché i clienti usano quasi solo il telefono. Se vuoi ridurre ancora: tolgi H01 su desktop e la verifica orizzontale (−4 frame, stesse importazioni).

---

## 8. Decisioni per te (D34 in poi)

Numerazione: continua dopo D33 (`11-decisions.md`). Raccomandazioni **mie**, non vincolanti.

| ID | Tema | Alternative | Raccomandazione |
|---|---|---|---|
| **D34** | Navigazione staff su tablet/desktop | **A** header con voci + contatore · **B** barra laterale (80/240) | **A**: poche voci, costo basso, tutta la larghezza alla coda. B solo se arrivano più voci |
| **D35** | Coda staff su schermo largo | **A** coda + dettaglio · **B** card in colonne (2 su tablet, 3 su desktop) | **B**: un tocco, stessa card del telefono, azioni allineate; A resta valida se vuoi il «banco» con bersagli enormi **[V con lo staff]** |
| **D36** | Premio su tablet · e colonna cliente | **a** modale centrata · **b** foglio dal basso; colonna cliente **32 rem** (scostamento da 36) | **a** (un solo pattern); **32 rem** sì |
| **D37** | Login su desktop | **a** card centrata · **b** diviso con pannello di marca [I] | **a** (nessun contenuto da inventare) |
| **D38** | Card timbri su desktop | **a** colonna 512 · **b** due colonne (card + esito/codice) | **a** (la colonna destra di b è quasi vuota) |
| **D39** | Storico su schermo largo | **a** righe per giorno (colonna 720) · **b** tabella | **a** su tablet (stesso componente); **b** su desktop solo se ti serve il confronto in colonne; altrimenti a ovunque. Se vuoi una scelta sola: **a** |
| **D40** | Tablet orizzontale | layout **desktop da 992** (con tocco) con 2 frame di verifica · oppure frame dedicati 1180×820 per tutto lo staff | **desktop da 992** + verifica (nessun frame extra) |
| **D41** | Scala tipografica a gradini | `t-title` 28 → 32, `t-big` 38 → 44 da tablet · oppure token **identici** ovunque | gradini (solo 2 token cambiano) |
| **D42** | Scorciatoie da tastiera | **nessuna** (solo nativo + «Vai al contenuto») · oppure «Invio conferma la prima», `+`/`−` (la proposta di `21` §7) | **nessuna** (rischio di conferma accidentale) |
| **D43** | Densità con puntatore | tutti i controlli d'azione **≥ 44**, ridurre solo menu (40), righe tabella (52), campi filtri (48) · oppure **tutto ≥ 44 senza eccezioni** | la prima |

Dipendenze: D35 decide D34 in parte (con B-barra laterale la griglia perde 80–240 px: a 820 diventa 740 → 2 colonne ancora da ~358); D39 e D40 non dipendono da altro.

---

## 9. Anteprime, validazione, scostamenti, limiti

**File** (`mockup/responsive-preview/`): `login.html`, `card.html`, `dialog.html`, `coda.html`, `storico.html`, `puntatore.html` (autonomi: font in base64, nessun URL esterno), `png/*.png` (22 PNG a scala 2), `foglio-tablet.png`, `foglio-desktop.png` (confronto a/b), `build.mjs` (generatore), `sheet.mjs` (fogli), `resp.css` (solo layout e hover), `validate.json`, `hover-contrasti.txt`. Riusano `lib/components.css` e `lib/lib.mjs` (nessun token nuovo).

**Validazione** (`validate.mjs` riusato, già indipendente dalla larghezza del frame; `build.mjs` lo lancia su ogni HTML): **22/22 frame validi**: contrasto minimo 4,64:1 (soglia 4,5 / 3 per testo grande), target ≥ 44 (o `data-h` dichiarato), testo ≥ 13 px, nessuno scroll orizzontale, nessun elemento fuori dal frame, **0 URL esterni**. Primo giro: 7 frame non validi per mie scelte (Rifiuta del dettaglio 52 < 56; stepper compresso a 38 px nella card da 350; contenitore troppo stretto; interferenza di una classe `.prz` della coda con la riga premio della tabella): corretti, nessun frame bloccato.

**Scostamenti da `21` §7 (da confermare)**: colonna cliente 32 rem (non 36); contenitore staff 1100 di *contenuto*; tabella della coda scartata; scorciatoie da tastiera ritirate; header con voci anche per il cliente (≥ 768).

**Novità mie [I]**: pannello di marca nel login diviso (D37-b); doppio clic sul codice; «Vai al contenuto»; barra dei filtri sempre visibile da desktop; form del nome inline; tavola degli stati del puntatore.

**Non verificato / limiti**: resa su dispositivi veri; nessun test con lo staff (A vs B, quantità nel dettaglio, 4 s dell'annulla); l'altezza congelata della cella (§4.2) è una regola da provare in Vue; bottone Google al resize; hover e focus sono **forzati con classi** nelle anteprime (non `:hover` reale); iPadOS safe area del foglio; la riga «Premio riscattato · Caffè gratis» e il nome del premio restano **[backend]** (D29); nessun frame mobile modificato.
