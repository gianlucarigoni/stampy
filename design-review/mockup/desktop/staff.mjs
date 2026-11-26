// Desktop · Staff (1440×900). D34 A: header con voci e contatore (Profilo/Esci con testo); D35 A: lista 360 + dettaglio; D39 a: storico a righe per giorno con barra filtri sempre visibile (campi 48); + tavola degli stati del puntatore (D43).
import { MODE, ic, btn, chip, card, be, alert, field, stepper, cap, headerW, main, V, day, hrow, stChip } from '../tablet/lib-t.mjs';
import { screens as T } from '../tablet/staff.mjs';
MODE.desk = true;
const D = (s, o = {}) => ({ ...s, W: 1440, H: 900, prefix: 'Desktop', flow: 'staff', ...o });
const hs = (cur) => headerW({ kind: 'staff', cur });
const half = (label, val, w, ph = 'Tutti') => `<div class="field" style="width:${w}px"><div class="lbl">${label}</div><div class="inp" data-tap data-h="48"><span class="${val ? '' : 'ph'}">${val || ph}</span></div></div>`;
const fbar = ({ esito = 'Tutti', min = '', max = '', dal = '', al = '', azz = false } = {}) => `<div class="fbar"><div class="field" style="width:200px"><div class="lbl">Esito</div><div class="inp sel" data-tap data-h="48"><span>${esito}</span>${ic('caret-down', 20)}</div></div>${half('Timbri · Min', min, 110)}${half('Max', max, 110)}${half('Dal', dal, 150, 'gg/mm/aaaa')}${half('Al', al, 150, 'gg/mm/aaaa')}${azz ? btn('link', 'Azzera') : ''}</div>`;
const chips = (l) => `<div class="row" style="flex-wrap:wrap">${l.map(t => `<span class="chipx">${t}<button class="xbtn" aria-label="Rimuovi filtro" data-tap>${ic('x', 18)}</button></span>`).join('')}</div>`;
const wrL = (inner) => `<div class="wr stack g12" style="max-width:720px;width:100%">${inner}</div>`;
const shead = (n) => `<div><h1 class="t-title w">Storico richieste</h1><div class="hbar"><span>${V}</span><span class="grow"></span><span role="status">${n}</span></div></div>`;
// --- tavola puntatore ---
const navItem = (icon, label, o = {}) => `<a class="${o.cur ? 'cur' : ''} ${o.hov ? 'hov' : ''} ${o.focus ? 'focus' : ''}" data-tap data-h="44" ${o.cur ? 'aria-current="page"' : ''}>${ic(icon, 22)}${label}${o.badge ? `<span class="badge">${o.badge}</span>` : ''}</a>`;
const cell = (c, inner, note = '') => `<div class="cell"><div class="cap">${c}</div>${inner}${note ? `<div class="curs">${note}</div>` : ''}</div>`;
const board = () => `<div class="pb">
${cell('Primario · default', btn('primary', 'Conferma 1 timbro', { icon: 'check', h: 48 }), 'cursore: <b>pointer</b>')}
${cell('Primario · hover', btn('primary', 'Conferma 1 timbro', { icon: 'check', h: 48, state: 'hov' }), 'fondo <b>action-hover</b>, nessun movimento')}
${cell('Primario · focus da tastiera', btn('primary', 'Conferma 1 timbro', { icon: 'check', h: 48, state: 'focus' }), 'anello unico 3 px, offset 2')}
${cell('Primario · premuto', btn('primary', 'Conferma 1 timbro', { icon: 'check', h: 48, state: 'pressed' }), 'fondo <b>action-pressed</b>, scala .98')}
${cell('Rifiuta · default', btn('dout', 'Rifiuta', { h: 48 }), 'cursore: <b>pointer</b>')}
${cell('Rifiuta · hover', btn('dout', 'Rifiuta', { h: 48, state: 'hov' }), 'fondo <b>danger-tint</b>')}
${cell('Secondario · hover', btn('secondary', 'Azzera filtri', { h: 48, state: 'hov' }), 'fondo <b>surface-2</b>')}
${cell('Link · hover', btn('link', 'Leggi l\'informativa', { state: 'hov' }), 'sottolineatura 2,5 px')}
${cell('Voce di navigazione', `<div class="nav" style="margin:0">${navItem('bell', 'Coda', { cur: true, badge: 3 })}${navItem('clock-counter-clockwise', 'Storico', { hov: true })}</div>`, 'attiva = <b>aria-current</b> (fondo + barra 4 px); hover = <b>surface-2</b>')}
${cell('Voce · focus da tastiera', `<div class="nav" style="margin:0">${navItem('bell', 'Coda', { focus: true, badge: 3 })}</div>`, 'l\'anello non sostituisce lo stato attivo')}
${cell('Stepper · hover', `<div class="stp"><button class="sq hov" data-tap aria-label="Meno">${ic('minus', 22)}</button><div class="inp sm" style="width:64px">1</div><button class="sq" data-tap aria-label="Più">${ic('plus', 22)}</button><div class="pre"><button class="pill hov" data-tap aria-label="2"><span>2</span></button></div></div>`, 'ai limiti: nessun hover, cursore <b>default</b>')}
${cell('Riga-link · hover', `<div class="card pad0" style="width:100%"><div class="rowlink hov" data-tap data-h="56">${ic('user-circle', 24)}<b style="font:700 17px Figtree">Profilo</b>${ic('caret-right', 20, { cls: 'r' })}</div></div>`, 'solo righe che portano altrove; le righe dello storico non hanno hover')}
${cell('Campo · default', field({ label: 'Email', placeholder: 'nome@esempio.it', reserve: false }), 'cursore: <b>text</b>; il bordo non cambia al passaggio')}
${cell('Campo · focus', field({ label: 'Email', placeholder: 'nome@esempio.it', focus: true, reserve: false }), 'stesso anello; nessun cambio di bordo')}
${cell('Chip filtro · hover su ✕', `<span class="chipx">Esito: Approvate<button class="xbtn hov" aria-label="Rimuovi filtro" data-tap>${ic('x', 18)}</button></span>`, 'cursore: <b>pointer</b> sul solo ✕')}
${cell('Testo e codice', `<div class="card" style="width:100%"><div class="code">44EE-7A5B</div></div>`, 'cursore: <b>default</b>; il codice si seleziona con un doppio clic')}
</div>`;
const OV = {
  SH01: { changes: 'D39 a: righe per giorno (colonna 720 a sinistra); barra filtri sempre visibile su una riga, campi 48', render: () => ({ inner: `${hs('storico')}${main(`${shead('46 richieste')}${fbar()}${wrL(`${day('Oggi')}${card(`${hrow('14:14', '44EE-7A5B', '2 timbri', stChip.ok)}${hrow('11:02', 'YG4G-2QN2', 'Premio riscattato · Caffè gratis ' + be(), stChip.prize, true)}`, 'pad0')}${day('Ieri')}${card(`${hrow('18:05', '9Q23-TSZG', '1 timbro', stChip.ok)}${hrow('12:30', 'K7M4-9Q2X', 'Nessun timbro', stChip.exp)}${hrow('10:15', 'R3T8-2LNA', 'Nessun timbro', stChip.no)}`, 'pad0')}`)}`)}` }) },
  SH02: { changes: 'filtri attivi: nella barra, chip sotto; nessun toggle', render: () => ({ inner: `${hs('storico')}${main(`${shead('9 richieste')}${fbar({ esito: 'Approvate', min: '1', dal: '01/10/2026', azz: true })}${chips(['Esito: Approvate', 'Dal 1 ott'])}${wrL(`${day('Oggi')}${card(`${hrow('14:14', '44EE-7A5B', '2 timbri', stChip.ok)}${hrow('09:20', 'K7M4-9Q2X', '1 timbro', stChip.ok)}`, 'pad0')}${day('Ieri')}${card(hrow('18:05', '9Q23-TSZG', '1 timbro', stChip.ok), 'pad0')}`)}`)}` }) },
  SH03: { changes: 'vuoto con filtri: barra + stato vuoto in card 480', render: () => ({ inner: `${hs('storico')}${main(`${shead('0 richieste')}${fbar({ esito: 'Rifiutate', dal: '25/11/2026', al: '26/11/2026', azz: true })}${chips(['Esito: Rifiutate', 'Dal 25 nov', 'Al 26 nov'])}${card(`<div class="stack g12" style="align-items:flex-start"><div class="hero-ic">${ic('funnel', 32)}</div><h1 class="t-section">Nessun risultato</h1><p class="lede">Nessun risultato con questi filtri.</p><div style="width:100%">${btn('secondary', 'Azzera filtri')}</div></div>`).replace('class="card ', 'style="max-width:480px;width:100%" class="card ')}`)}` }) },
};
export const screens = [
  ...T.filter(s => s.id !== 'Q01h').map(s => D(s, { ...(OV[s.id] || {}), render: OV[s.id]?.render || ((t) => ({ ...s.render(t), clip: true })) })),
  D({ id: 'PT', W: 1440, H: 780, name: 'Stati del puntatore', state: 'tavola: hover, focus, premuto, cursore', src: 'nuovo (50 §5)', changes: 'tavola di riferimento per hover (solo puntatore), focus da tastiera e cursore; nessun hover su righe e card non cliccabili', backend: 'no', isNew: 'sì', render: () => ({ inner: board(), clip: true }) }),
];
