# 54 · Report della run «build desktop» (chat 15b)

2026-11-26. Solo design: `src/`, `docs/` non toccati, nessun commit, **`.gitignore` non toccato** (vedi sotto). Nessuna chiamata Figma (limite del piano gratuito già raggiunto): HTML + PNG + cartelle per l'inserimento manuale.

## Richiesta e scelte
«Deduciamo meno cose da altri layout»: oltre al perimetro della specifica (§7: 22 schermate desktop) sono disegnate anche le schermate che il tablet deduceva. Decisioni applicate (`11-decisions.md`): D34 A, D35 A (lista 360 + dettaglio), D36 a (premio in modale 440, top 190), D37 a (login: card 480 centrata), **D38 b** (card timbri a due colonne), D39 a (storico a righe per giorno, colonna 720 a sinistra, **barra filtri sempre visibile** su una riga), D41 gradini, D42 nessuna scorciatoia, D43 la prima (hover/focus solo con puntatore; target ≥ 44, campi filtro 48).

## Fatto
- **86 frame** (43 schermate × chiaro/scuro, 1440×900): accesso 16, cliente 36, staff 34. **Validati 86/86** (contrasto minimo 4,64; 0 URL esterni; dimensione, header 64, target ≥ 44).
- Riuso del codice tablet: `MODE.desk` in `mockup/tablet/lib-t.mjs` (header con testo, lista 360, premio a 190); runner con `TARGET=desktop` (`node mockup/tablet/run.mjs <flusso>`, `sheet.mjs`, `export1x.mjs`, `plan.mjs`); sorgenti in `mockup/desktop/`.
- **Nuove rispetto al tablet** (disegnate invece che dedotte): accesso A03, A08, A09, A11, A12; cliente V02, V03, V04, R01, R02, R08, P02, H02, E01, E02; staff **tavola degli stati del puntatore** (PT: hover, focus, premuto, cursore). `/name` (N01-N03) c'è già nel tablet e qui è riusata.
- **Diverse dal tablet per layout**: R04 (due colonne), H01/H02 e SH01-SH03 (barra filtri sempre visibile, chip sotto), coda (lista 360), premio (modale più in alto).
- PNG a scala 1 per Figma a mano: `mockup/desktop/figma-import/`, 11 cartelle per sezione (Accesso 16 · Nome e scansione 8 · Visita 6 · Richiesta/timbro/premio 10 · Profilo 4 · Storico 4 · Elimina account 4 · I tuoi locali 4 · Coda 22 · Storico del locale 6 · Stati del puntatore 2).

## Ancora dedotto dal tablet/mobile (non disegnato a 1440)
A02, A05, A06, A10; V01, V05; R03, R06, R07, R09; P03-P07; H03-H05; E03, E04; N non ha varianti nuove. Sono stati/errori delle schermate già disegnate: stesse card 480/512 centrate.

## Decisioni autonome (da confermare)
1. **Header in contenitore centrato**: il wordmark parte a x ≈ 170 (contenuto max 1100 + margine 40), come da spec §1; non a filo schermo.
2. **Colonna 720 dello storico allineata a sinistra** sotto la barra filtri (non centrata): la barra è più larga della lista; la metà destra resta vuota (contro già dichiarato in spec §4.4).
3. **Tavola del puntatore** a 1440×900 (la spec diceva 780): l'altezza resta quella standard; hover e focus sono classi forzate, non `:hover` reale.
4. **Tutti i frame desktop con `data-clip`**: sono viewport, il contenuto può continuare fuori frame (come P01 del mobile).
5. **Pagina Figma «Desktop» non toccata**; sezioni a mano (stesso schema del mobile).

## Da fare a mano: `.gitignore`
Vorrei aggiungere 4 righe a `.gitignore` (fuori da `design-review/`, quindi non l'ho fatto): `design-review/mockup/**/drag/`, `design-review/mockup/**/figma-import/`, `design-review/mockup/tablet/*/foglio.*`, `design-review/mockup/desktop/*/foglio.*`. Senza, i PNG di `drag/` e `figma-import/` compaiono come file non tracciati (≈ 280 immagini ripetute).

## Non verificato
Schermo vero (1440 e 1180), hover reale, zoom 200% / reflow a 720 (regola in spec §6), screen reader, tema scuro a occhio. Figma: nulla importato per il desktop.
