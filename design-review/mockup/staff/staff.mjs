// Flusso Staff: elenco locali, coda richieste, esiti, menu, storico del locale. Mobile 390x844.
import { META } from '../plan-data.mjs';
import { header, menuPanel, card, alert, btn, cap, emptyPage, ic, chip, sk, be, req, stepper } from '../lib/lib.mjs';

const S = (id, render) => ({ ...META[id], render });
const V = 'Bar Pasticceria Rossi';
const hdr = (o = {}) => header({ venue: V, ...o });
const shell = (inner, { top = 6, open = false, clip = false, back = false, h = hdr } = {}) => `${h({ open, back })}<main class="page tight" ${clip ? 'data-clip' : ''} style="padding-top:${top}px">${inner}</main>`;
const mini = (title, inner) => `<div class="tav-i">${cap(title)}${inner}</div>`;
const head = (n = 3, extra = 'la più vecchia da 2 min') => `<div class="shead"><h1 class="t-section">Richieste in coda</h1><div class="meta2">${chip('neutral', `${n} in coda`, null)}${extra ? `<span>${extra}</span>` : ''}</div></div>`;
const R1 = { first: true, code: '44EE-7A5B', ago: 'da 2 min', exp: 'scade tra 1 min', warn: true, stamps: 1, val: 1 };
const R2 = { code: 'YG4G-2QN2', ago: 'da 1 min', exp: 'scade tra 4 min', prize: true, stamps: 10, val: 2 };
const R3 = { code: '9Q23-TSZG', ago: 'da 30 s', exp: 'scade tra 5 min', stamps: 5, val: 1 };
const menuStaff = menuPanel([{ icon: 'user-circle', label: 'Profilo' }, { icon: 'clock-counter-clockwise', label: 'Storico richieste' }, { icon: 'swap', label: 'Cambia locale' }, '-', { icon: 'sign-out', label: 'Esci' }]);

const outcome = ({ kind = 'ok', title, sub, code = '44EE-7A5B' }) => `<div class="outcome ${kind === 'prize' ? 'prizeo' : kind === 'warn' ? 'warno' : ''}" role="status">
<div class="oh">${ic(kind === 'prize' ? 'gift' : kind === 'warn' ? 'x-circle' : 'check-circle', 22, { fill: true })}<div><b>${title}</b>${sub}</div></div>
${kind !== 'warn' ? '<div class="undo" style="width:62%;background:currentColor"></div>' : ''}${btn('secondary', 'Annulla', { h: 48 })}</div>`;
const quiet = (txt) => `<div class="quiet" role="status">${ic('check-circle', 20)}<span class="grow">${txt}</span><button class="xbtn" aria-label="Chiudi" data-tap>${ic('x', 20)}</button></div>`;
const miniReq = ({ code = '44EE-7A5B', val, invalid = '', high = '', min = false, extra = '' }) => `<article class="req"><div class="code">${code}</div>${stepper(val, [1, 2, 5].includes(val) ? val : 0, { min, invalid })}
<div class="hint nores ${invalid ? 'err' : ''}" style="min-height:20px;font-size:13px">${invalid ? ic('warning-circle', 14, { fill: true }) + `<span>${invalid}</span>` : `<span class="${high ? '' : 'muted'}">${high || 'prodotti consumati (premio compreso)'}</span>`}</div>
${extra}${btn('primary', `Conferma ${val || ''}`.trim() + (val ? (val === 1 ? ' timbro' : ' timbri') : ''), { icon: 'check', h: 48 })}</article>`;
const dead = (code, label, txt) => `<article class="req" style="min-height:196px"><div class="top"><span>da 6 min</span></div><div class="code">${code}</div><div class="row">${chip('neutral', label, 'clock', { fill: false })}<span class="small2">${txt}</span></div><div class="grow"></div>${btn('secondary', 'Chiudi', { h: 48 })}</article>`;

// storico
const stChip = { ok: chip('ok', 'Approvata', 'check-circle'), exp: chip('neutral', 'Scaduta', 'clock', { fill: false }), no: chip('warn', 'Non confermata', 'x-circle'), prize: chip('prize', 'Premio', 'gift') };
const hrow = (tm, code, dt, chipHtml, prz = false) => `<div class="hrow ${prz ? 'prz' : ''}"><div class="tm">${tm}</div><div class="mid"><div class="code">${code}</div><div class="dt">${dt}</div></div>${chipHtml}</div>`;
const day = (t) => `<div class="dayh">${t}</div>`;
const filtersRow = (n, open, tot) => `<div class="filters">${btn('secondary', `Filtri${n ? ' · ' + n : ''}`, { icon: open ? 'caret-up' : 'caret-down', h: 44 }).replace('btn secondary', `btn secondary ${open ? 'open' : ''}`)}${n ? btn('link', 'Azzera') : ''}<span class="grow"></span><span class="muted" role="status" style="font-size:14px">${tot}</span></div>`;
const sel = (label, val) => `<div class="field"><div class="lbl">${label}</div><div class="inp sel" data-tap data-h="52"><span>${val}</span>${ic('caret-down', 20)}</div></div>`;
const half = (label, val) => `<div class="field"><div class="lbl" style="font-size:14px">${label}</div><div class="inp" data-tap data-h="52"><span class="${val ? '' : 'ph'}">${val || 'Tutti'}</span></div></div>`;
const shead = `<h1 class="t-title" style="font-size:24px">Storico richieste</h1><div class="small2" style="font-size:14px;color:var(--text2);margin-top:-6px">${V}</div>`;

export const screens = [
  S('L01', () => `${header()}<main class="page" style="padding-top:14px"><h1 class="t-title">I tuoi locali</h1>${card(['Bar Pasticceria Rossi', 'Gelateria Fiordilatte', 'Pizzeria Da Gigi'].map((n, i) => `<div class="rowlink" data-tap data-h="56" style="${i ? 'border-top:1.5px solid var(--border)' : ''}">${ic('storefront', 24)}<b style="font:700 17px Figtree">${n}</b>${ic('caret-right', 20, { cls: 'r' })}</div>`).join(''), 'pad0')}</main>`),
  S('L02', () => `${header()}<main class="page" style="padding-top:14px"><h1 class="t-title">I tuoi locali</h1><div class="tavola">
${mini('Caricamento', card(`<p class="muted" role="status" style="font-size:14px;margin-bottom:10px">Caricamento…</p>${[1, 2, 3].map(() => `<div style="margin-bottom:12px">${sk('100%', 56)}</div>`).join('')}`))}
${mini('Errore', card(`<div class="stack g12">${alert('err', 'Non siamo riusciti a caricare i tuoi locali', 'Controlla la connessione e riprova.')}${btn('primary', 'Riprova', { icon: 'arrow-clockwise' })}</div>`))}
</div></main>`),
  S('Q01', () => shell(`${head()}${req(R1)}${req(R2)}${req(R3)}`, { clip: true })),
  S('Q02', () => shell(`${head(0, '')}${card(`<div class="row" style="gap:12px"><i class="dotlive"></i><div><b style="font:700 17px Figtree">Nessuna richiesta in attesa</b><div class="muted" style="font-size:14px">In ascolto · aggiornato alle 14:32</div></div></div>`)}`)),
  S('Q03', () => `${shell(`${head(4, '<b style="color:var(--text)">1 nuova</b> · la più vecchia da 2 min')}${req(R1)}${req(R2)}`, { clip: true })}<div class="newpill" data-tap data-h="48">${ic('arrow-down', 18)}1 nuova</div>`),
  S('Q04', () => shell(`${head(2, 'la più vecchia da 1 min')}${outcome({ title: 'Confermata · +3 timbri', sub: '<span style="font-size:14px">44EE-7A5B · Annulla entro 4 s</span>' })}${req(R2)}${req(R3)}`, { clip: true })),
  S('Q05', () => shell(`<div class="tavola" style="gap:10px">
${mini('Premio: «Consegna» in evidenza', outcome({ kind: 'prize', title: 'Confermata · Consegna: Caffè gratis', sub: `<span style="font-size:14px">YG4G-2QN2 · Annulla entro 4 s ${be()}</span>` }))}
${mini('Dopo 4 s: riga quieta (non sparisce da sola)', quiet('<b>Gestita 14:32</b> · +2 timbri · 44EE-7A5B'))}
${mini('Rifiutata', `<div class="quiet" role="status">${ic('x-circle', 20)}<span class="grow"><b>Rifiutata 14:33</b> · nessun timbro · 9Q23-TSZG</span><button class="xbtn" aria-label="Chiudi" data-tap>${ic('x', 20)}</button></div>`)}
<div style="display:flex;justify-content:flex-end">${btn('link', 'Chiudi tutti')}</div></div>`, { top: 8 })),
  S('Q06', () => shell(`<div class="tavola" style="gap:8px">
${mini('Quantità non valida: Conferma resta attivo', miniReq({ val: 0, invalid: 'Da 1 a 50.' }))}
${mini('Quantità alta: avviso, nessun calcolo', miniReq({ val: 25, high: 'Stai confermando 25 prodotti.' }))}
${mini('Minimo: − non sbiadisce, resta leggibile', miniReq({ val: 1, min: true }))}
</div>`, { top: 4 })),
  S('Q07', () => shell(`<div class="tavola" style="gap:10px">
${mini('Scaduta: la card resta, stessa altezza', dead('YG4G-2QN2', 'Scaduta', 'Il cliente può rifare la richiesta.'))}
${mini('Già gestita da un collega', dead('9Q23-TSZG', 'Già gestita', 'Un collega l\'ha già confermata.'))}
</div>`, { top: 8, clip: true })),
  S('Q08', () => `${hdr()}<div class="banner" role="status">${ic('wifi-slash', 20, { fill: true })}<span><b>Connessione assente</b>: la coda potrebbe non essere aggiornata (ultimo aggiornamento 14:32). Riprovo…</span></div>
<main class="page tight" data-clip style="padding-top:12px">${head()}
<article class="req first"><div class="top"><span class="chip neutral one">1°</span><span>da 2 min</span><span class="grow"></span><span>scade tra 1 min</span></div><div class="code">44EE-7A5B</div>
${alert('err', '', '<b style="display:inline">9Q23-TSZG</b> · Richiesta non più valida', { x: true })}
${stepper(1, 1)}${btn('primary', 'Conferma 1 timbro', { icon: 'check', h: 48 })}</article>${req(R2)}</main>`),
  S('Q09', () => shell(`<div class="shead"><h1 class="t-section">Richieste in coda</h1></div>${[1, 2].map(() => card(`<div class="row" style="gap:8px">${sk('48px', 24)}${sk('30%', 14)}</div><div style="height:12px"></div>${sk('55%', 26)}<div style="height:16px"></div>${sk('100%', 44)}<div style="height:12px"></div>${sk('100%', 48)}<div style="height:8px"></div>${sk('100%', 48)}`)).join('')}`, { clip: true })),
  S('Q10', () => `${shell(`${head()}${req(R1)}${req(R2)}`, { open: true, clip: true })}${menuStaff}`),
  S('Q11', () => `${header()}<main class="page" style="padding-top:36px">${emptyPage({ icon: 'lock-simple', title: 'Non sei autorizzato', text: 'Non sei autorizzato a gestire questo locale.', actions: btn('primary', 'Vai ai tuoi locali') })}</main>`),
  S('SH01', () => shell(`${shead}${filtersRow(0, false, '46 richieste')}
${day('Oggi')}${card(`${hrow('14:14', '44EE-7A5B', '2 timbri', stChip.ok)}${hrow('11:02', 'YG4G-2QN2', 'Premio riscattato · Caffè gratis', stChip.prize, true)}`, 'pad0')}
${day('Ieri')}${card(`${hrow('18:05', '9Q23-TSZG', '1 timbro', stChip.ok)}${hrow('12:30', 'K7M4-9Q2X', 'Nessun timbro', stChip.exp)}${hrow('10:15', 'R3T8-2LNA', 'Nessun timbro', stChip.no)}`, 'pad0')}`, { clip: true, back: true })),
  S('SH02', () => shell(`${shead}${filtersRow(2, true, '9 richieste')}
<div class="row" style="flex-wrap:wrap"><span class="chipx">Esito: Approvate<button class="xbtn" aria-label="Rimuovi filtro" data-tap>${ic('x', 18)}</button></span><span class="chipx">Dal 1 ott<button class="xbtn" aria-label="Rimuovi filtro" data-tap>${ic('x', 18)}</button></span></div>
${card(`<div class="stack g12">${sel('Esito', 'Approvate')}<div class="fgrid">${half('Timbri · Min', '1')}${half('Max', '')}</div><div class="fgrid">${half('Dal', '01/10/2026')}${half('Al', '')}</div></div>`)}`, { back: true })),
  S('SH03', () => shell(`${shead}${filtersRow(1, true, '0 richieste')}
${card(`<div class="stack g12">${sel('Esito', 'Rifiutate')}<div class="fgrid">${half('Dal', '25/11/2026')}${half('Al', '26/11/2026')}</div></div>`)}
${card(emptyPage({ icon: 'funnel', title: 'Nessun risultato', text: 'Nessun risultato con questi filtri.', actions: btn('secondary', 'Azzera filtri') }))}`, { back: true })),
];
