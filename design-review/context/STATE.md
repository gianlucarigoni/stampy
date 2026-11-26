# STATE · Design review

**RUN INTERROTTA (chat 15): ripartire dall'importazione Figma del flusso `staff`** (34 frame validati, non importati per il limite di chiamate del piano Starter; il proprietario inserisce a mano i PNG da `mockup/tablet/figma-import/`; le 16 importazioni di accesso e cliente risultano non visibili: verificare). Esistono già: `mockup/tablet/staff/import/staff-1.html` (20 frame) e `staff-2.html` (14). Procedura: `html_to_figma` (fileKey `ybKvCdJRM8LbMDbkWRIYRd`, `nodeId` `206:14`, cssSelector `.frame`) → `curl` POST sull'URL monouso → `node mockup/tablet/record.mjs staff <1|2> <file-risposta.json>` → `node mockup/tablet/plan.mjs`.

Ultimo aggiornamento: 2026-11-26 · chat 15 (build tablet) e 15b (build desktop)

**Chat 15b (build desktop, dopo la chat 15)**: **86 frame desktop 1440×900 validati** (accesso 16, cliente 36, staff 34), disegnate anche le schermate che il tablet deduceva; nessuna chiamata Figma (limite). Piano `53-desktop-plan.md`, report `54-desktop-report.md`, note `mockup-desktop-*.md`, PNG per Figma a mano in `mockup/desktop/figma-import/` (11 sezioni). **`.gitignore` non toccato**: servono 4 righe (vedi report). Prossimo passo: inserire a mano i PNG tablet e desktop in Figma (pagine Tablet e Desktop), poi la verifica con il proprietario dei frame e le decisioni autonome dei report 51 e 54.

## Passaggio di consegne (chat 15 -> 16)

**Fatto (solo design; `src/`, `docs/` non toccati; nessun commit)**
1. D34-D43 confermate (`11-decisions.md`; D36 = a + 32 rem, D40 = verifica Q01 1180×820, D42 = nessuna scorciatoia).
2. `52-tablet-plan.md` (56 frame: 50 + N01-N03 aggiunte su richiesta), base estesa (`components.css`, `validate.mjs`), `mockup/tablet/` con tre flussi, note `mockup-tablet-*.md`, `51-tablet-report.md`. **56/56 frame validi.** PNG a scala 1 per l'inserimento manuale in `mockup/tablet/figma-import/` (8 cartelle per sezione).
3. Figma: **16 frame dichiarati importati** (non visibili al proprietario: da verificare; accesso `232:2`-`237:2`, cliente `238:2`-`247:2`) nella pagina Tablet (`206:14`). Chiamate: 1 `create_session`, 3 `html_to_figma` (+1 rifiutata dal limite).

**Non fatto**: import dei 34 frame staff; sezioni in Figma (serve `use_figma`); `get_screenshot` di verifica; verifica su dispositivo.

**Decisioni/dubbi**: vedi `51-tablet-report.md` (sezioni, promptId unico, Q03 senza pillola, Q06/Q07 in versione A).

**Prossimo passo**: completare l'import staff (dopo il reset del limite Figma), poi **build desktop** (1440×900; D37 a, D38 b, D39 a, tavola dei puntatori) riusando `mockup/tablet/lib-t.mjs` e `run.mjs`.

## Passaggio di consegne (chat 14 -> 15, storico)

Ultimo aggiornamento: 2026-11-26 · chat 14 (specifica responsive tablet e desktop)

**Fatto (chat 14; solo design; nessuna chiamata Figma)**
1. `context/50-responsive-spec.md`: breakpoint (768 / 992, riferimenti 820×1180 e 1440×900), griglia, scala a gradini, navigazione, layout per sezione con wireframe, pattern, puntatore/tastiera, zoom, perimetro di build, **decisioni D34-D43**.
2. Anteprime in `mockup/responsive-preview/` (`build.mjs` + `sheet.mjs`): 22 PNG a scala 2 (tablet, desktop, coda a 1180×820, tavola del puntatore), fogli di contatto `foglio-tablet.png` e `foglio-desktop.png`; **22/22 validi** (contrasto min 4,64, target, testo ≥ 13 px, 0 URL esterni).
3. Perimetro proposto: **94 frame** (tablet 50, desktop 44), **6 importazioni** Figma, ~9-11 chiamate; clienti al minimo (8 schermate tablet, 5 desktop), staff completo (16).
4. Nel foglio nasce una regola nuova per la coda in griglia: le azioni stanno sul fondo della cella (Conferma allineati sulla riga) e la cella conserva l'altezza.

**Non fatto / da verificare**: nessun frame in Figma; hover/focus forzati con classi; nessuna prova su dispositivo o con lo staff; barra laterale (D34-B) solo in ASCII, non in anteprima; login diviso e card a 2 colonne sono [I]; `.gitignore`: `png/` è già ignorata ma `foglio-*.png` e `*.html` delle anteprime non lo sono (decidi tu).

**Decisioni da prendere (D34+)**: D34 nav staff (header con voci / barra laterale) · D35 coda staff (coda+dettaglio / card in colonne) · D36 premio su tablet (modale / foglio) + colonna cliente 32 rem · D37 login desktop (centrato / diviso) · D38 card timbri desktop (colonna / due colonne) · D39 storico (righe per giorno / tabella) · D40 tablet orizzontale = layout desktop da 992 · D41 gradini tipografici · D42 nessuna scorciatoia da tastiera · D43 densità col puntatore.

**Prossimo passo (chat 15)**: build del **tablet** dopo le tue scelte: partire da `responsive-preview/build.mjs` (diventa un flusso `tablet/` con `plan-data.mjs`), 3 importazioni nella pagina «Tablet»; poi desktop. Riletto prima: `50-responsive-spec.md` §7-8.

## Passaggio di consegne (chat 13 -> 14, storico)

**Fatto (solo design; `src/`, `docs/` non toccati; nessun commit; `.gitignore` +2 righe)**
1. **122 frame mobile 390×844** (61 schermate × chiaro/scuro) in 4 flussi: `accesso`, `cliente-a`, `cliente-b`, `staff` (`mockup/<flusso>/`: sorgente `.mjs`, `.html` autonomo, PNG in `png/`, nota `context/40-mockup-<flusso>.md`). Tutti validati (contrasti, target, testo ≥ 13 px, URL esterni, scroll, tagli); nessun frame bloccato.
2. **Piano e indice** generati: `context/40-mockup-plan.md`, `MOCKUP-INDEX.md` (con nodo Figma per frame); rigenerare con `node mockup/gen-plan.mjs`. Report: `context/41-mockup-report.md`.
3. **Figma** «Stampy Mockup v2» (`ybKvCdJRM8LbMDbkWRIYRd`): 8 importazioni (≤ 20 frame), nodi da `8:2` a `129:2`. Chiamate Figma: 1 `create_session`, 8 `html_to_figma`, 1 `get_screenshot` (10); nessun errore di limite.
4. **Base riusabile**: `mockup/lib/` (css, helper, icone), `run.mjs`, `validate.mjs`, `sheet.mjs`. Per un nuovo flusso: copiare un `<flusso>.mjs`, aggiungere le righe a `plan-data.mjs`, `node mockup/run.mjs <flusso> --import`.
5. Decisioni provvisorie nuove: **P4, P5, P6** in `11-decisions.md`.

**Non fatto / da verificare**: modificabilità dei livelli Figma e font reali (checklist `31` §4.2); un solo frame confrontato Figma↔PNG (piccole differenze di larghezza del testo); animazioni; hover/focus oltre la tavola A06; dialog sobrio; 360 px; testi nuovi da approvare (elenco in `41`).

**Aggiornamento 2026-11-26**: dopo la prima revisione ridisegnati S01, V02/V03 (bottone Google Wallet ufficiale) e Profilo con le card (P01, P04, nuovo P07); 124 frame; **Figma aggiornato e riordinato** (2026-11-26): pagina «Mobile» con 12 sezioni per flusso, pagine «Tablet» e «Desktop» vuote pronte (vedi `41-mockup-report.md`, «Riordino in Figma»).

**Prossimo passo**: (1) revisione del proprietario dei 122 frame (da `MOCKUP-INDEX.md`; conferma/modifica di P1-P6, D1/D6/D10/D11/D15), (2) poi **tablet e desktop** riusando `lib/` (breakpoint e layout in `21` §7, D7/D31).

## Passaggio di consegne precedente (chat 13, import del pilota)

**Repo principale (percorso assoluto, destinazione finale dei file):** `/home/rigoni_g/Personal/stampy` (da `git worktree list`)

## Stato dei lavori

| # | Lavoro | Stato |
|---|---|---|
| 1 | Setup + mappa | **fatto** |
| 2 | Cattura per sezione | **fatto** (telefono 390×844): Accesso, Cliente, Staff (+ Storico staff). Hover/tablet/desktop da fare nei lavori 7-8 |
| 3 | Critica per sezione | Accesso **fatto**; Cliente **A fatta** (`10-critique-cliente-a.md`, con addendum fogli focus/pressed) e **B fatta** (`10-critique-cliente-b.md`); **Staff fatta** (`10-critique-staff.md`, chat 8) |
| 4 | Design system | **fatto** (chat 9: vincoli e direzioni A-I in `design-system/`; chat 10: **dir-i scelta**, `21-design-system.md`, `21b-bootstrap-mapping.md`) |
| 5 | Pilota Canva | **fatto** (chat 11, `30-pilota-canva.md`): esito **NO-GO** sul metodo «generazione Canva»; da guardare i 6 PNG |
| 6 | Canva mobile | da fare |
| 7 | Tablet | da fare |
| 8 | Desktop | da fare |

## Passaggio di consegne (chat 13 → 14, pilota, storico)

Ultimo aggiornamento: 2026-11-26 · chat 13 (import Figma del pilota). Solo design: `src/`, `docs/` non toccati, nessun commit.

1. **Fatto**: file Figma «Stampy Mockup v2» creato (https://www.figma.com/design/ybKvCdJRM8LbMDbkWRIYRd?node-id=1-2), **una** `html_to_figma` con `.frame` su `pilota.html`: 6 frame importati (`1:2`…`6:2`; `4:2` = premio scuro verificato, gli altri per ordine nel DOM).
2. **Piano**: `whoami` → team «GigiLuca's team», tier `starter`, ruolo admin, **posto `View`**, `planKey` `team::1707576595546155354`. Il posto View non ha bloccato creazione e import.
3. **Chiamate Figma: 6** (`whoami` 1 esente, `get_figma_skill` 1, `create_new_file` 1, `create_session` 1, `html_to_figma` 1, `get_screenshot` 1). Nessun errore di limite; il contatore non è leggibile.
4. **Confronto** (solo frame `4:2`, a vista): layout, coriandoli, ritorni a capo, icone, tratteggi uguali; testi in Unbounded larghi uguali a ±1 px; **possibile differenza** nella «lastra» sotto il dialog. Il `get_screenshot` esce a **1x (390×844)** anche con `maxDimension` 1688: dettagli fini non giudicabili. Nessun diff a pixel (mancano librerie).
5. **Non verificato**: modificabilità (testi/forme/icone come livelli?), tema chiaro, timbri ruotati e anello, coda staff, font reali nel file. Checklist di 11 punti in `31` §4.2, **da fare a mano**.
6. **Parere provvisorio**: HTML→PNG **GO**; Figma **GO CON CORREZIONI** (diventa go o no-go dopo la checklist). Stima per tutto il mockup: 6 `html_to_figma` (120 frame, 20 per lotto), **~6-8 chiamate** senza verifica a vista, ~12-14 con uno `get_screenshot` per lotto; raccomandato nessuno screenshot nei lotti successivi.
7. **Registrate PROVVISORIE** in `11-decisions.md` (P1-P3): stella nera, codice col trattino, anello fisso del timbro «nuovo». D1/D6/D10/D11 restano non chiuse.
8. **Da fare per primo (chat 14)**: il proprietario esegue la checklist e dice go / no-go; poi, se go, si importano i lotti successivi (tablet, desktop, altre schermate) in questo stesso file.
9. **Da sistemare**: `mockup/pilota/figma-check/` non è ignorata da git (aggiungere la riga a `.gitignore`, non fatto); `31-pilota-figma.md` è riscritto nelle sezioni 1, 4, 5, 6.
10. Non costruite altre schermate (come richiesto).

## Passaggio di consegne (chat 12 → 13, storico)

1. **Fatto (HTML)**: `mockup/pilota/pilota.html` (un file autonomo, 6 `.frame` 390×844: cliente timbri / premio e coda staff, chiaro e scuro), font in base64, icone e timbri inline, token di `21`; generato da `build.mjs`, PNG a 2x da `render.mjs --check` in `mockup/pilota/png/` (ignorati da git).
2. **Studio visivo**: `23-style-from-png.md` (dir-i chiaro/scuro e 3 originali aperti davvero) con 17 discrepanze dir-i ↔ `21`; casi decisi contro il .md: stella nera, trattino nel codice, gradino del dialog.
3. **Verifiche automatiche tutte verdi**: contrasti sulle coppie usate (min 5,56:1), target ≥ 44 (Conferma/Rifiuta 48, distanza 16), nessun testo < 13 px, nessuno scroll orizzontale. 2 giri visivi per schermata (`31-pilota-figma.md`).
4. **Figma NON eseguito**: i tool (`whoami`, `create_new_file`, `create_session`, `html_to_figma`) non sono nella sessione; il connettore Figma risulta `connected: false`. **Chiamate Figma: 0**, nessun file creato, nessun limite toccato.
5. **Da fare per primo (chat 13 o ripresa)**: collegare il connettore Figma, caricare gli schemi, `whoami` (piano e posto), `create_new_file` «Stampy Mockup v2», `create_session`, **una** `html_to_figma` con `.frame` su `pilota.html`, un solo `get_screenshot` di un frame, poi completare §4-5 di `31`.
6. **Da confermare (proprietario)**: stella nera del timbro (effetto accidentale di dir-i), codice col trattino, anello fisso per il timbro «nuovo»; D1/D6/D10/D11 restano **non chiuse** (il pilota le mostra, non le decide).
7. `.gitignore`: aggiunta la riga `design-review/mockup/**/png/` (diff mostrato in chat).
8. Limiti: PNG scuri degli originali non aperti; focus/hover/animazioni non verificati; resa su telefono vero non vista.
9. Nessuna modifica a `src/`, `docs/`; nessun commit.
10. Non costruite altre schermate (come richiesto).

## Passaggio di consegne (chat 11 → 12, storico)

**Fatto**
- Cartella Canva «Stampy Mockup v2» (`FAHb9zj_hnI`) con 2 design: `DAHb93kVSKk` (generato, pagine **quadrate 1264×1264**) e `DAHb92Uozi4` (**ridimensionato 390×844**, 6 pagine: cliente chiaro/scuro, premio chiaro/scuro, coda staff chiaro/scuro).
- 6 PNG a 2x (780×1688) in `design-review/canva-export/pilota/` (ignorata da git: riga aggiunta a `.gitignore`). **Non aperti da me.**
- `30-pilota-canva.md`: capacità dei tool, prompt esatto, tabella token vs resa, problemi, tempi, parere.

**Esito (dai dati, non a vista)**
- `create-design` **non** rispetta 390×844 (esce quadrato); `resize-design` lo porta a 390×844 ma i testi scendono a 8,6-11 px (regola ≥ 13).
- Font **non imponibile** (solo `fontRef` opachi, nessuna operazione per cambiare famiglia); hex dei testi vicini ma non esatti; forme **raster** non ricolorabili; sfondi diversi tra pagine; coppie chiaro/scuro non strutturalmente identiche. Un solo candidato (nessuna scelta). Giri usati: 2 (generazione + resize), nessun `edit-design`.
- **Parere: NO-GO** come fonte dei mockup per le chat 12-14. Consigliato: mockup **HTML/CSS con i token veri** + PNG via Playwright (come `dir-i.html`); Canva solo per rifinitura o 2-3 schermate costruite da zero con `edit-design`.

**Non fatto / da decidere (proprietario)**
- Guardare i 6 PNG (colonna stretta?, rosa e contorno, coriandoli, scrim in p3/p4, testo scuro sui bottoni arancioni, timbri). Decidere D1, D6, D10, D11: **il pilota non basta per chiuderle** finché non si vede la resa.
- Decidere il metodo per le chat 12-14 (HTML/CSS consigliato).
- Nessuna decisione chiusa in `11-decisions.md`; nessun commit.

**Prossimo passo (chat 12)**
Dopo la tua scelta del metodo: se HTML/CSS, partire da `design-system/dir-i.html` e produrre le schermate mobile in chiaro/scuro con `export-png.mjs`; se Canva, costruire da pagine vuote con `edit-design` e verificare il font a mano nell'editor.

## Passaggio di consegne (chat 10 → 11, storico)

Ultimo aggiornamento: 2026-11-26 · chat 10 (design system sulla direzione **dir-i «Ibrido»**)

**Fatto**
- `11-decisions.md`: registrata «**Direzione scelta: dir-i**»; D1 (variante a), D6 (chiaro caldo), D10 (audace con sobria per reduced-motion), D11 (rosa) marcate «implicite in dir-i, da confermare nel pilota» (**non chiuse**); D16 resta proposta; D25-D33 **non decise**, usate come default provvisorio.
- `21-design-system.md`: principi, token (colore chiaro/scuro con **tabelle dei contrasti calcolate**), tipografia, spazi, raggi, bordi, ombre, z-index; focus ring unico; componenti con tutti gli stati; pattern (errore, validazione al tocco, azione distruttiva, feedback, coda); movimento; responsive (provvisorio); copy (suggerimenti da approvare); accessibilità; **tracciabilità** Top 10 → soluzioni con il limite «UI / codice / backend»; decisioni aperte; scostamenti da dir-i.
- `21b-bootstrap-mapping.md`: token → variabili Sass/CSS di Bootstrap 5.3.8 (nomi controllati nei sorgenti installati), e l'elenco di ciò che richiede più di una variabile. **Nulla applicato al codice.**
- `22-brief-canva.md`: brief da 224 parole, font e verifica Canva, varianti per D1/D6/D10/D11, valori per schermata 390×844, ordine del pilota.
- Script nuovo: `design-system/contrasts-21.mjs` (`node contrasts-21.mjs [--md]`): unica fonte dei rapporti scritti in `21`. Nessuna modifica a `src/`, `docs/`; nessun commit.

**Non fatto / limiti**
- **PNG di dir-i non aperti**: valori estratti dall'HTML; resa a schermo non vista da me.
- **Disponibilità dei font in Canva NON verificata** (ricerca web senza esito): da controllare nell'editor all'inizio del pilota; sostituti nel brief sono ipotesi da verificare. Licenze: OFL-1.1 (font) e MIT (Phosphor) lette dal campo `license` di npm, non dai file di licenza.
- Non verificati: cifre tabulari e ambiguità 0/O/1/I di Unbounded nel codice; titoli lunghi a 360 px; 101 kB di font su rete lenta; focus/pressed/hover reali; screen reader; soglia «quantità alta» (5) e annulla a 4 s (scelte mie).
- Layout tablet/desktop solo come regole provvisorie (chat 7-8).

**Decisioni/fatti emersi**
- Scostamenti da dir-i (con motivo, in `21` §11): anello «nuovo» 0,9 s, coriandoli ≤ 1,5 s totali, scrim .72, Conferma 48 px, distanza Conferma/Rifiuta 16, testo minimo 13 px, stato premuto `#db5a11` (il vecchio dava 4,37:1), `aria-label` dei timbri.
- Colori con contrasto sotto 3:1 senza regola correttiva: **nessuno**; le 8 righe sotto soglia sono coperte da bordo/regola (primario in chiaro 2,73 → bordo `#9a3412`; rosa 2,69 → contorno; timbro su `surface-2` 2,48 → i timbri stanno solo su `surface`).
- Copy «11° timbro» di dir-i: **non usare** (l'ordinale non si ricalcola nel frontend; regola in `splitStamps`).
- Non risolvibile con la sola UI: nome del locale/premio (D9/D29/D16), nome del cliente (D30), annullamento vero (D27b), paginazione e filtro per locale (D21), card finta del Profilo e conservare il codice su errore di rete (codice), testi legali di Elimina account (D18).

**Prossimo passo (chat 11: pilota Canva)**
Leggere `00-README`, `STATE`, `11-decisions`, `22-brief-canva.md`, e `21` §2 e §4 per i valori. Verificare i font in Canva, poi generare le schermate dell'ordine consigliato nel brief (login, richiesta approvata, dialog del premio audace/sobrio, coda staff), in chiaro e scuro, con le varianti D1/D6/D11. Poi aggiornare `11-decisions.md`.

## Passaggio di consegne (chat 9 → 10, storico)

Ultimo aggiornamento: 2026-11-25 · chat 9 (direzioni visive, cartella `design-system/`)

**Fatto**
- `design-system/20-vincoli.md`: vincoli non negoziabili (contrasto, D1 con le 3 varianti, focus e bordi, primari mai disabilitati, premio D10-D12, coda staff, caldo chiaro/scuro, responsive, font in self-hosting).
- `design-system/20-direzioni.md`: direzione **A «Carta e inchiostro»** (sicura) e **B «Biglietto da bar»** (audace), con palette chiaro/scuro e contrasti, tipografia, forma, timbri/premio, coda, icone, confronto e raccomandazione (A come base, idee di B; **non scelta**).
- Anteprime `dir-a.html`, `dir-b.html` (+ `?theme=dark`) e PNG 390 px @2x: `dir-{a,b}-{light,dark}.png`. Fonti: `palettes.mjs`, `contrasts-direzioni.mjs`, `build-previews.mjs`, `export-png.mjs`, font woff2 in `fonts/` (OFL), icone Phosphor (MIT) inline.
- Nessuna modifica a `src/`, `docs/`; nessun commit.

- **Seconda tornata (stessa chat, su richiesta)**: direzioni **C «Menù stampato»** (editoriale, filetti, Fraunces, premio oro) e **D «Adesivo»** (pop, adesivi a margherita, Unbounded, premio rosa) in `dir-c.html`, `dir-d.html` e PNG relativi, con **tutte e tre le varianti D1** (come A); confronto in `20-direzioni.md` (sezione «Seconda tornata»). Nuovi font in `fonts/`: Fraunces, Instrument Sans, DM Mono, Unbounded, Onest (OFL).

- **Terza tornata (stessa chat, su richiesta)**: direzioni **E «Insegna»** (neon, Big Shoulders + Archivo, premio azzurro) e **F «Scontrino»** (stampante termica, Geist Mono + Doto, premio blu inchiostro), in `dir-e.html`, `dir-f.html` e PNG; tutte e tre le varianti D1; quadro A–F e raccomandazione in `20-direzioni.md` (sezione «Terza tornata»). Nuovi font: Big Shoulders Display, Archivo, Geist Mono, Doto (OFL).

- **Quarta tornata (stessa chat, su richiesta, «più pacati»)**: direzioni **G «Pietra»** (minimale svizzera, Schibsted Grotesk, premio violetto) e **H «Forno»** (salvia e sabbia, Young Serif + Nunito Sans, ciottoli e dialog ad arco, premio bacca), in `dir-g.html`, `dir-h.html` e PNG; D1 a/b/c; quadro A–H in `20-direzioni.md` («Quarta tornata»). Nuovi font: Schibsted Grotesk, Young Serif, Nunito Sans (OFL).
- **Quinta tornata (stessa chat, su richiesta)**: direzione **I «Ibrido»** costruita con le scelte del proprietario (font D/C/A, sfondi H chiaro e A scuro, premio rosa `#ff5fa2`, card A, timbri A, **D1-a scelta (chiaro e scuro)**, dialog D senza icona regalo, coda A compatta; il premio arriva all'11° timbro, niente barra), in `dir-i.html` e PNG; dettagli in `20-direzioni.md` («Quinta tornata»).

**Non fatto / limiti**
- **PNG non aperti**: resa a schermo non vista (verificati solo caricamento font, assenza di scroll orizzontale, contrasti).
- Identità (3 aggettivi, riferimenti) non fornita: assunzioni dichiarate in `20-direzioni.md`. B mostra solo D1-a. Focus/pressed forzati da classi [V]. Nessun tablet/desktop.

**Decisioni/fatti emersi**
- Con D1-a (testo scuro su `#f16417`) in chiaro il fondo del bottone contro la pagina è sotto 3:1 (2,94 in A, 2,58 in B): serve bordo scuro. Con D1-a si può rimettere `$min-contrast-ratio: 4.5` in Bootstrap.
- Premio: teal (A) / lime (B), distinti da arancione, rosso e verde; il lime in chiaro regge solo con il bordo inchiostro.
- Nessuna direzione scelta; **D1, D6, D10, D15 restano da decidere guardando le anteprime**.

**Prossimo passo (chat 10, prefisso `21-`)**
Il proprietario guarda i PNG e sceglie A, B o un ibrido (e D1 / D6). Poi design system completo sulla direzione scelta: token (colore, tipografia, spazi, raggi, movimento), 36 pattern con stati completi, mappatura sulle variabili Sass di Bootstrap, nome come variabile (D5), etichette «richiede backend».

## Passaggio di consegne (chat 8 → 9, storico)

Ultimo aggiornamento: 2026-11-25 · chat 8 (critica Staff)

**Fatto**
- `11-decisions.md` aggiornato (passo 0): D10 **decisa a 1,5 s**, D12 precisata (riscatto lato backend, **consegna a cura dello staff**, frase tolta dal dialog), **D13 (solo se il nome non è salvato) e D14 (gesto + passi) decise, D15 rimandata al design**, D17-D24 approvate e **D19, D21, D23 decise** (verbo «riscattato» + istruzione «Consegna»), nuova sezione **«Da verificare/segnalare»** (testo di Elimina account vs anonimizzazione; card «Bar Aurora» e bottone Wallet inattivo come possibili bug; errore di rete su `/name` come possibile bug di feedback), esiti dell'addendum focus/pressed marcati **[V]**, nessun conflitto aperto dopo le risposte del proprietario.
- `10-critique-staff.md` (nuovo): locali (LC-), coda (CQ-), esiti (ES-), errori (ER-), menu (MN-), storico del locale (SH-), profilo visto da uno staff (PF-); «Il momento chiave», contrasti, checklist, opportunità tablet/desktop [I], pattern 27-36, copy, Top 10, domande **D25-D33**.
- Script nuovo: `scripts/contrasts-staff.mjs`. Fogli: `screens/_sheets/staff/` (27, **tutti visti**, focus/pressed inclusi). PNG originali non aperti. Nessuna modifica a `src/`, `docs/`; nessun commit.

**Non fatto / limiti**
- Salti di layout (CQ-15) stimati dai fogli, non provati su un telefono vero. Colore reale di `text-success` in scuro non misurato sui pixel. Nessun hover/tablet/desktop. Nessun intervento sulle critiche Cliente A/B (restano con «1,5 s» e D13-D15 «decise»: vedi conflitti).
- Letto, in sola lettura, anche `requests.service.ts` (`getPendingQueue`: FIFO, limite 50, scadenza lazy).

**Decisioni/fatti emersi**
- Problemi più gravi dello Staff: (1) **card che si spostano sotto il dito** (scadenza della prima card, sparizione dell'esito dopo 8 s): con card di uguale altezza una conferma può cadere sul cliente sbagliato, **senza annulla**; (2) **nessun segnale di richiesta nuova** (la card si aggiunge in fondo, fuori schermo) e **nessun annulla** per conferma/rifiuto; (3) **codice del cliente poco leggibile e senza nome**, premio non nominato e «Premio disponibile» che si perde nella riga dei timbri.
- Conflitti: **tutti chiusi** dal proprietario (D10 1,5 s; D13, D14 decise; D15 al design; D19, D21, D23 chiuse). La frase nell'alert «Premio disponibile» resta, perché lo staff deve essere avvisato del premio: il premio va reso inconfondibile in coda (CQ-13, ES-2).
- Fatti di prodotto da segnalare: `/name` promette «ti riconosciamo nei locali» ma lo staff non vede il nome (D30); la coda non porta il premio (D29); limite 50 nella coda.

**Prossimo passo (chat 9: design system, prefisso file `20-`)**
Leggere `00-README`, `STATE`, `11-decisions` (con i conflitti), le quattro critiche (`10-…`), `01b`. Raccogliere i pattern (1-14 parte A, 15-26 parte B, 27-36 Staff) in un unico design system: token (colore con D1/D6/D11 aperte, danger unico, focus, bordi ≥ 3:1, tipografia, spazi, movimento ≤ 1 s), componenti con stati completi (mai disabilitato sui primari), regola «niente salti di layout», nome come variabile (D5), etichette «richiede backend». Nessun conflitto aperto.

## Passaggio di consegne (chat 7 → 8, storico)

Ultimo aggiornamento: 2026-11-25 · chat 7 (critica Cliente, parte B)

**Fatto**
- `11-decisions.md`: D9-D12 registrate come approvate (con le annotazioni: D9 unita a D3 nel backlog e etichetta «richiede backend» nei mockup; D10 pilota con sobrio e audace, audace < 1 s, solo CSS, `prefers-reduced-motion`, vibrazione non principale; D11 accento premio distinto da arancione e rosso, icona + testo, insieme a D1; D12 il premio è una **celebrazione**, già consegnato). Nuova sezione **«Conflitti da risolvere»** (3 voci).
- `10-critique-cliente-a.md`: aggiunta la sezione «Addendum fogli focus/pressed» (5 fogli visti: 2 varianti peggiori, nessuna smentita).
- `10-critique-cliente-b.md` (nuovo): Profilo (PR-), Membro (ME-), Storico (ST-, con marcatura CONDIVISO/CLIENTE), Elimina account (EL-), contrasti nuovi, checklist, dati mostrati, «Cosa vale per lo Staff», opportunità, pattern 15-26, copy, Top 10, domande **D17-D24**.
- Script nuovo: `scripts/contrasts-cliente-b.mjs`. Fogli: `screens/_sheets/cliente-b/` (21) e `cliente-b-membro/` (1). **Tutti visti; PNG originali non aperti.** Nessuna modifica a `src/`, `docs/`; nessun commit.

**Non fatto / limiti**
- Non verificati: date localizzate sul telefono (le catture sono `mm/dd/yyyy`), select/picker aperti, screen reader, cosa fa davvero l'eliminazione (anonimizzazione, Wallet, storico), assenza di limite/paginazione nel backend (cercata solo con grep).
- Il numero **D16** era già la card del locale (PROPOSTA): le domande nuove della parte B partono da **D17**.

**Decisioni/fatti emersi**
- D9-D12 approvate, D13 e D15 decise, D14 decisa (C); **D10 risolta: audace 1,5 s; D13, D15, D12 decise; D14 decisa: C.
- Problemi gravi parte B: (1) **Elimina account**: muro di testo, rosso pieno sul passo innocuo e «Annulla» come link debole, **codice cancellato anche su errore di rete**, «Elimino…» durante il reinvio, testo non fedele all'anonimizzazione **[V]**; (2) **card Wallet «Bar Aurora 3/10»** statica mostrata a ogni utente, anche ai proprietari, con bottone morto; (3) **Storico**: stato solo come glifo, errori lontani dal campo, lista «stantia» con filtri non validi, nessun indicatore sui ricaricamenti.
- Lo **Storico** è un componente condiviso: la chat 8 deve verificare ST-15 (la riga dello Staff mostra il codice card) nei PNG `screens/staff/staff/storico__*` e **non ripetere** ST-1…ST-14.

**Prossimo passo (chat 8: critica Staff, file `10-critique-staff.md`)**
Leggere `00-README`, `STATE`, `11-decisions` (incluso «Conflitti da risolvere»), le tre critiche precedenti (pattern: errore, alert, chip di stato, menu, danger, storico condiviso), `04-capture-staff.md`. Fogli: `node design-review/scripts/make-sheets-parte.mjs staff/staff 3 <prefissi> staff` (prefissi dalla tabella di `04-capture-staff.md`; gli stati condivisi dello storico sono in `cliente/cliente/storico__*`). Contrasti nuovi solo per coda, card richiesta, stepper, esiti in loco, `PromotionNotice` staff, «Rifiuta».

## Passaggio di consegne (chat 6 → 7, storico)

Ultimo aggiornamento: 2026-11-25 · chat 6 (critica Cliente, parte A)

**Fatto**
- `11-decisions.md` (nuovo): decisioni D1-D8 del proprietario e regole globali (primari mai disabilitati, anello di focus e bordi ≥3:1 come token, pattern errore dopo Cliente e Staff, testi = suggerimenti). Le critiche successive le rispettano.
- Cliente diviso in **A** (`/name`, `/scan`, visita, richiesta, premio: 57 stati) e **B** (profilo, storico, elimina account, membro/: 66 stati): volumi equilibrati, nessuna correzione.
- `10-critique-cliente-a.md`: critica per schermata/stato (N-, S-, V-, R-, P-, K-), «Il momento chiave», «Opportunità», checklist, contrasti nuovi, copy, 14 pattern per il design system, Top 10, domande **D9-D15**.
- Script nuovi: `scripts/make-sheets-parte.mjs` (fogli per prefisso: `node design-review/scripts/make-sheets-parte.mjs cliente/cliente 3 <prefissi,csv> <cartella>`) e `scripts/contrasts-cliente.mjs` (solo coppie nuove). Fogli in `screens/_sheets/cliente-a/` (19).
- Nessuna modifica a `src/`, `docs/`, commit; PNG originali **non aperti**.

**Non fatto / limiti**
- Visti 14 fogli su 19 (non 01, 07, 08, 15, 16: varianti focus/pressed e ripetizioni). Parte B non toccata.
- Non verificati: focus reale, annunci di screen reader (dialog aperto dal polling), `promotionChanged` reale (R-6), font reale, vibrazione su iOS.

**Decisioni/fatti emersi**
- Pattern buono da estendere: lo **stato invalido di `/name`** (bordo+icona+`aria-invalid`); ma con errore di rete il campo diventa rosso a torto (N-4).
- Problema grosso della parte A: il **momento del premio** (dialog debole, nessuna traccia dopo la chiusura, premio non nominato, nome locale assente: richiede backend, D9) e i timbri **senza «nuovo»/«prossimo»** (nessun feedback visivo).
- **D16** (card del locale al posto dei pallini, proposta del proprietario) inserita in `10-critique-cliente-a.md` e `11-decisions.md` come PROPOSTA; consiglio A come obiettivo, C come primo passo.
- Le D9-D15 **non sono decise**; D9 (nome locale/premio nelle schermate) è un candidato al backlog come D3.

**Prossimo passo (chat 7: critica Cliente parte B, file `10-critique-cliente-b.md`)**
Leggere `00-README`, `STATE`, `11-decisions`, `10-critique-accesso`, `10-critique-cliente-a` (pattern errore/alert/card/menu), `03-capture-cliente.md`. Fogli: `node design-review/scripts/make-sheets-parte.mjs cliente/cliente 3 profilo,storico,elimina cliente-b` (+ `cliente/membro` per i 4 PNG). Aggiungere solo contrasti nuovi (card Wallet statica, bottoni danger, righe storico, stati dello storico). Poi Staff.

## Passaggio di consegne (chat 5 → 6, storico)

Ultimo aggiornamento: 2026-11-25 · chat 5 (critica Accesso)

**Fatto**
- `10-critique-accesso.md`: critica per schermata/stato (login email, codice, session-error, 404) + capitoli trasversali (stile, UX, mobile, a11y, responsive, copy, incoerenze), tabella contrasti calcolati, Top 10, domande D1-D8.
- Script nuovi: `scripts/make-sheets.mjs` (fogli di contatto, parametri `<sezione/ruolo> [per-foglio]`, riusabile per Cliente e Staff) e `scripts/contrasts.mjs` (contrasti WCAG dai token). Fogli in `screens/_sheets/accesso/` (11).
- Nessuna modifica a `src/`, stili, `docs/`; nessun commit.

**Non fatto / limiti**
- Skill `design-critique`, `accessibility-review`, `ux-copy` **non presenti** nell'elenco: criteri applicati a mano.
- Non verificati: focus reale del bottone Google, font su telefono (le catture usano DejaVu), screen reader, email lunghe. I PNG hanno il widget **Vue DevTools** in basso (da spegnere nelle prossime catture).
- `sheet-11` (session-error default) non guardato; PNG originali aperti: 1.

**Decisioni/fatti emersi (da portare nel design system, lavoro 4)**
- Problemi **globali**, non solo Accesso: bianco su `#f16417` = 3,19:1; link chiaro 3,19:1; bordo campi 1,30 (chiaro) / 2,26 (scuro); alone di focus Bootstrap annulla l'anello globale su `.form-control`/`.btn`; palette chiara fredda vs scura calda.
- Le decisioni D1-D8 (colore bottoni, Google, nome locale, privacy, rinomina, tema chiaro caldo, layout grande, «Accedi») **spettano al proprietario**; non sono state prese.

**Prossimo passo (chat 6: critica Cliente, prefisso `10-`, file `10-critique-cliente.md`)**
Leggere `00-README`, `STATE`, `01-screen-map` §2, `01b`, `03-capture-cliente.md`; generare i fogli con `node design-review/scripts/make-sheets.mjs cliente/cliente 3` (e `cliente/membro`); riusare `contrasts.mjs`; confrontare con `10-critique-accesso.md` (stato invalido, alert, 429, bottoni). Una sezione sola; poi Staff.

## Passaggio di consegne (chat 4 → chat 5, storico)

**Fatto**
- Ambiente ricreato in un nuovo worktree `dr4` (`../stampy-wt/dr4`, branch `chore/dr4-cattura-staff`, DB `stampy_wt_dr4`), poi eliminato a fine consegna insieme al suo DB (il branch resta). `stampy_dev` e `main` non toccati; nessun commit/merge/push; nessuna modifica a `src/`, stili, markup, testi, `docs/`, migrazioni.
- **Sezione Staff catturata**: 162 PNG (81 stati × chiaro/scuro) in `screens/staff/staff/`. Elenco, stati reali/simulati, cosa manca, schermate rimandate a `cliente/`: `04-capture-staff.md`. Nessun PNG aperto.
- Script nuovi: `capture-staff.mjs`, `seed-staff.sql`.

**Non fatto**
- Hover e controlli nativi aperti (come prima); titolo scheda del browser e annuncio screen-reader (solo testo nelle note); 360×740 fuori dal profilo; locali/liste oltre 12 richieste.
- Proprietario: nessuna cartella `proprietario/`, perché testo e menu risultano identici a quelli dello staff (verificato per codice).

**Decisioni**
- Cartella `screens/staff/staff/` per tutta la sezione. Storico staff incluso nella stessa cartella con prefisso `storico__`; i suoi stati condivisi (caricamento, errore, validazione filtri) sono in `cliente/cliente/storico__*`.
- Richieste con scadenza +4 min nel DB (non 7 giorni come in 02/03): «scade tra 4 min» è realistico.

**Prossimo passo (chat 5: critica, prefisso file `10-`)**
Una sezione per chat, aprendo i PNG di quella sezione. Ordine suggerito: Accesso → Cliente → Staff. Per lo Staff leggere `04-capture-staff.md` (tabella file, «Per la critica»). Le chat di critica possono aprire i PNG; la mappa dei nomi è nel manifest della sezione.

### Cose di cui non sono sicuro (chat 4)
- Se lo sticky dell'alert d'errore sia visibile sopra le card nel PNG `coda__errore-sticky-dopo-scroll` (viewport dopo lo scroll).
- Se `focus-visible` risulti attivo in ogni PNG «focus» (Tab + `locator.focus()`).
- Se l'ora di creazione mostrata nelle card (`formatTime`) sia coerente col fuso del browser di cattura (it-IT, UTC del container).

## Passaggio di consegne (chat 3 → chat 4, storico)

**Fatto**
- Ambiente ricreato in un nuovo worktree `dr3` (`../stampy-wt/dr3`, branch `chore/dr3-cattura-cliente`, DB `stampy_wt_dr3`), poi **eliminato a fine consegna** insieme al suo DB (il branch resta, come sempre). Il worktree `dr` della chat 2 non esisteva più.
- **Sezione Cliente catturata**: 242 PNG (121 stati × chiaro/scuro) in `screens/cliente/cliente/` + 4 in `screens/cliente/membro/`. Elenco, stati reali/simulati, cosa manca: `03-capture-cliente.md`. Nessun PNG aperto.
- `01b-component-states.md` corretto: i tentativi del codice sono 5.
- Nessuna modifica a `src/`, stili, markup, `docs/`, migrazioni; nessun commit/merge/push.

**Non fatto**
- Staff e Storico staff (chat 4). Hover (tablet/PC). Select/date nativi aperti. Link Wallet reale (non raggiungibile). 360×740 salvo il profilo.

**Decisioni**
- Cartelle: `screens/cliente/cliente/` per il ruolo cliente; `screens/cliente/membro/` per profilo e elimina-account visti da un proprietario (stesse schermate, contenuto diverso). Per la sezione Staff usare `screens/staff/<staff|proprietario>/`; la UI è identica: basta `staff/` (+ `proprietario/` solo se si trova una differenza).
- Per cambiare lo stato di una scena si usano dati nel DB del worktree (script `capture-lib.mjs`: `setStamps`, `newPending`, …) e le API vere dello staff; vedi `03-capture-cliente.md`.

**Prossimo passo (chat 4)**
Ricreare l'ambiente (`02-capture-env.md`, `worktree-start.sh <id> <slug> chore`; poi copia dati + `seed-capture.sql` + `seed-cliente.sql`; avvio con `start-app.sh`), e catturare **Staff** (`/staff`, coda con 3 pendenti e scadenza breve se serve «scade tra N min», esiti in loco, errori, stepper ai limiti, premio disponibile, `PromotionNotice staff`, Storico locale). Riusare `capture-lib.mjs` (login via API, `newPending`, conferme via API). Attenzione: il backend limita gli invii di codice a 1/60 s per utente.

### Cose di cui non sono sicuro (chat 3)
- Se `focus-visible` risulti attivo in ogni PNG «focus» (si usa Tab + `locator.focus()`).
- Se il dialog del premio venga catturato nel suo stato finale (nessuna animazione nel codice).

## Passaggio di consegne (chat 2 → chat 3, storico)

**Fatto**
- Ambiente isolato: worktree `dr` (`../stampy-wt/dr`, branch `chore/dr-design-capture`), DB `stampy_wt_dr` = copia di `stampy_dev` + stati mancanti (utente senza nome, card piena, 3 richieste in attesa). `stampy_dev` intatto. Dettagli e ricetta da zero: `02-capture-env.md`.
- Script: `design-review/scripts/` → `capture-accesso.mjs`, `seed-capture.sql`, `start-app.sh`. Playwright è già nel frontend del worktree: nessuna installazione, `package.json` intatti.
- **Sezione Accesso catturata**: 62 PNG (31 stati × chiaro/scuro) in `screens/accesso/anonimo/`. Elenco, cosa manca e perché: `02-capture-accesso.md`. Nessun PNG aperto.
- App spenta alla fine (porte 3001/5174 libere). Nessun commit, nessuna modifica a `src/`, `docs/`, migrazioni.

**Non fatto**
- Cliente, Staff, Storico: non catturati (richiesta esplicita).
- Hover (rimandato a tablet/PC); resa a schermo e iframe Google **non verificati a vista**.

**Decisioni**
- Viewport telefono **390×844 @2x**, nella cartella base; tablet/desktop in sottocartelle `tablet/` e `desktop/`. Cartella ruolo dell'Accesso = **`anonimo`**. `proprietario/` ancora da confermare nelle sezioni Cliente/Staff (stessa UI dello staff: probabilmente non serve).
- Stati d'errore non naturali simulati con `page.route` (marcati **S** nella tabella); stati del backend (codice errato, tentativi finiti, 404) reali.
- I tentativi del codice sono **5** (correzione a `01b`, che diceva 3).

**Prossimo passo (chat 3)**
Rifare l'avvio (`start-app.sh`, vedi `02-capture-env.md`) e catturare **Cliente**: `/name` (utente `senza.nome@stampy.test`), `/scan`, `/v/:id`, `/r/:id` (pending, approvata, premio, card piena `lorenzo.fontana`/Gennaro), `/profile`, `/history`, `/account/delete` (senza confermare), menu ☰ e `RewardDialog` in **viewport-only**. Poi Staff (coda: 3 richieste in attesa, scadenza +7 giorni nel DB), Storico. Per il login senza OTP ripetuto: `storageState` dopo un login reale (codice nel log del backend); non usare gli script e2e.

### Cose di cui non sono sicuro (chat 2)
- Se l'iframe Google si monta davvero e dove va il focus nel PNG `bottone-google-focus`.
- Se i testi dei timer 429 siano da ricatturare con un valore fisso.

## Passaggio di consegne (chat 1 → chat 2, storico)

**Fatto**
- Cartelle `design-review/context/` e `design-review/screens/`; `.gitignore` ignora `design-review/screens/`.
- `00-README.md` (regole), `01-screen-map.md`, `01b-component-states.md`, `01c-login-and-accounts.md`.
- Nessun codice dell'app, `docs/`, DB o utente toccato. Nessun commit. Nessuno screenshot.

**Non fatto**
- Nessuna cattura, nessun avvio di backend/frontend (porte 3000/5173 libere; Docker e `stampy-db` accesi).
- Non verificato a vista: aspetto reale, bottone Google, doppio anello di focus, sticky dell'alert in coda.

**Decisioni / fatti emersi**
- Sezioni: **Accesso**, **Cliente**, **Staff** (+ componente trasversale **Storico**). `owner` e `staff` hanno la **stessa UI**: probabilmente niente cartella `proprietario/` (decidere in chat 2).
- Stack: Bootstrap 5.3 Sass + `stampy.scss`, colonna unica `.narrow` max 28rem, tema da `prefers-color-scheme`. Non esistono toast, bottom sheet, tab, switch, chip.
- ⚠ `.env` del backend ha `OTP_PROVIDER=both` (invia email vere via Gmail). Per le catture avviare con `OTP_PROVIDER=console` (vedi `01c`).
- ⚠ `stampy_dev` ha **0 richieste in attesa**, nessuna card piena, nessun utente senza nome: per quegli stati servono dati (scritture). Raccomandato un worktree col suo DB.
- Convenzione file e formato viewport (cartella `mobile/` o suffisso) **da fissare in chat 2**.

**Prossimo passo**
Chat 2 «cattura»: scegliere il DB (worktree consigliato), preparare i dati per gli stati mancanti, definire i viewport (telefono 390×844 + eventuale 360×740), poi catturare per sezione **senza aprire i PNG**:
1. Accesso (login, codice, errori, session-error, 404) · 2. Cliente · 3. Staff · 4. Storico (filtri).
Ogni schermata in chiaro e scuro; stati dei componenti da `01b`.

## Cose di cui non sono sicuro (chat 1)

- Se un errore SMTP di Gmail fa fallire `POST /auth/email/request` con 500 (con `both`).
- Se `/scan` o altre pagine hanno varianti nascoste; se il backend impone un limite alle righe dello storico.
- Come appare il bottone Google e se lo script carica nell'ambiente di cattura.
