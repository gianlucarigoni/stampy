// lib-t.mjs · pezzi comuni dei mockup TABLET (820x1180, verifica orizzontale 1180x820). Riusa ../lib/lib.mjs: nessun token nuovo.
import { ic, btn, field, chip, card, be, alert, sk, stepper, req, stampFull, stampEmpty, cap } from '../lib/lib.mjs';
export { ic, btn, field, chip, card, be, alert, sk, stepper, req, cap };
export const MODE = { desk: false };
export const V = 'Bar Pasticceria Rossi';
export const EMAIL = 'marta.conti@esempio.it';
export const word = () => `<div class="word"><i>${ic('star', 16, { fill: true, style: 'color:#000' })}</i>Stampy</div>`;
const navItem = (icon, label, o = {}) => `<a class="${o.cur ? 'cur' : ''}" data-tap data-h="44" ${o.cur ? 'aria-current="page"' : ''}>${ic(icon, 22)}${label}${o.badge ? `<span class="badge" aria-label="${o.badge} richieste in coda">${o.badge}</span>` : ''}</a>`;
const venueChip = (open) => `<button class="venuechip ${open ? 'open' : ''}" data-tap>${ic('storefront', 20)}<span>${V}</span>${ic(open ? 'caret-up' : 'caret-down', 16)}</button>`;
/** header largo. kind: anon | cliente | staff. Staff: Profilo/Esci solo icona (tablet verticale, D34 A) */
export const headerW = ({ kind, cur = '', badge = 3, open = false, labels = MODE.desk }) => {
  const right = kind === 'anon' ? '' : kind === 'cliente'
    ? `<span class="grow"></span><div class="nav">${navItem('user-circle', 'Profilo', { cur: cur === 'profilo' })}${navItem('clock-counter-clockwise', 'Storico richieste', { cur: cur === 'storico' })}</div><span class="sepv"></span><a class="lnk" data-tap data-h="44">${ic('sign-out', 22)}Esci</a>`
    : `<div class="nav">${navItem('bell', 'Coda', { cur: cur === 'coda', badge })}${navItem('clock-counter-clockwise', 'Storico', { cur: cur === 'storico' })}</div><span class="grow"></span><a class="lnk" data-tap data-h="44" aria-label="Profilo">${ic('user-circle', 22)}${labels ? 'Profilo' : ''}</a><a class="lnk" data-tap data-h="44" aria-label="Esci">${ic('sign-out', 22)}${labels ? 'Esci' : ''}</a>`;
  return `<header class="hw"><div class="wrap">${kind === 'staff' ? venueChip(open) : word()}${right}</div></header>`;
};
export const main = (inner, { col = '', cls = '' } = {}) => `<main class="wrap ${col} mainw ${cls}">${inner}</main>`;
/** frame tablet. kind T = 820x1180, D = layout desktop (verifica orizzontale 1180x820) */
export const frameT = (s, theme, inner, clip = false) => `<section class="frame ${s.W >= 992 ? 'D' : 'T'}" id="${s.id}-${theme}" data-theme="${theme}" data-w="${s.W}" data-h="${s.H}" data-name="${s.prefix || 'Tablet'} · ${s.id} · ${s.name} · ${s.state} · ${theme === 'light' ? 'chiaro' : 'scuro'}" data-screen="${s.id}" style="width:${s.W}px;height:${s.H}px">${inner}${clip ? '<i data-clip></i>' : ''}</section>`;
export const mini = (title, inner) => `<div class="tav-i">${cap(title)}${inner}</div>`;

// ---- stati/pezzi della coda (versione A: lista + dettaglio) ----
export const R1 = { first: true, code: '44EE-7A5B', ago: 'da 2 min', exp: 'scade tra 1 min', warn: true, stamps: 1, val: 1 };
export const R2 = { code: 'YG4G-2QN2', ago: 'da 1 min', exp: 'scade tra 4 min', prize: true, stamps: 10, val: 2 };
export const R3 = { code: '9Q23-TSZG', ago: 'da 30 s', exp: 'scade tra 5 min', stamps: 5, val: 1 };
export const R4 = { code: 'K7M4-9Q2X', ago: 'da 5 s', exp: 'scade tra 5 min', stamps: 3, val: 1, newR: true };
export const headC = ({ n = 4, extra = 'la più vecchia da 2 min', live = true } = {}) => `<div><h1 class="t-title w">Richieste in coda</h1><div class="hbar">${n === null ? '' : chip('neutral', `${n} in coda`, null)}${extra ? `<span>${extra}</span>` : ''}<span class="grow"></span>${live ? `<span class="row" style="gap:8px"><i class="dotlive"></i><span role="status">In ascolto · aggiornato alle 14:32</span></span>` : ''}</div></div>`;
export const li = (r, o = {}) => `<div class="li ${o.sel ? 'sel' : ''} ${o.q ? 'q' : ''} ${o.dead ? 'dead' : ''}" data-tap data-h="76"><div class="lc"><b class="c16">${r.code}</b>${o.q ? chip('ok', 'Gestita', 'check-circle') : o.deadLabel ? '' : r.prize ? chip('prize', 'Premio', 'gift') : r.newR ? chip('action', 'Nuova', null) : ''}</div><div class="lm" ${o.deadLabel ? 'style="display:flex;align-items:center;gap:8px"' : ''}>${o.deadLabel ? chip('neutral', o.deadLabel, 'clock', { fill: false }) + 'da 6 min' : o.q ? o.q : `${r.first ? '1° · ' : ''}${r.ago} · ${r.exp}`}</div></div>`;
export const detail = (r, { wide = MODE.desk } = {}) => `<section class="card det" style="${wide ? 'grid-template-columns:minmax(0,1fr) 280px' : ''}"><div class="stack g16"><div class="row" style="gap:10px">${r.first ? '<span class="chip neutral one">1°</span>' : ''}<span class="small2" style="font-size:14px">${r.ago}</span><span class="grow"></span>${chip('warn', r.exp, 'clock', { fill: false })}</div>
<div class="det-code" style="font:700 36px/1 Unbounded;letter-spacing:.04em">${r.code}</div>
${r.prize ? `<div class="prz">${chip('prize', 'Premio', 'gift')}<b>Consegna: Caffè gratis ${be()}</b></div>` : ''}
<div class="small2" style="font-size:15px">${r.stamps} / 10 timbri</div>
<div class="stack g8"><div class="lbl2">Prodotti consumati (premio compreso)</div>${stepper(r.val, [1, 2, 5].includes(r.val) ? r.val : 0, {})}</div></div>
<div class="acts">${btn('primary', `Conferma ${r.val} ${r.val === 1 ? 'timbro' : 'timbri'}`, { icon: 'check', h: 64 })}${btn('dout', 'Rifiuta', { h: 48 })}</div></section>`;
export const outcome = ({ kind = 'ok', title, sub }) => `<div class="outcome ${kind === 'prize' ? 'prizeo' : kind === 'warn' ? 'warno' : ''}" role="status"><div class="oh">${ic(kind === 'prize' ? 'gift' : kind === 'warn' ? 'x-circle' : 'check-circle', 22, { fill: true })}<div><b>${title}</b>${sub}</div></div>${kind !== 'warn' ? '<div class="undo" style="width:62%;background:currentColor"></div>' : ''}${btn('secondary', 'Annulla', { h: 48 })}</div>`;
export const quiet = (txt, icon = 'check-circle') => `<div class="quiet" role="status">${ic(icon, 20)}<span class="grow">${txt}</span><button class="xbtn" aria-label="Chiudi" data-tap>${ic('x', 20)}</button></div>`;
export const split = (listHtml, detailHtml, wide = MODE.desk) => `<div class="mdl" style="grid-template-columns:${wide ? '360px' : '264px'} minmax(0,1fr)"><div class="lst">${listHtml}</div>${detailHtml}</div>`;
export const coda = ({ wide = MODE.desk, sel = 0, rows = [R1, R2, R3, R4], det = R1, badge, head = headC(), over = '' } = {}) => split(rows.map((r, i) => li(r, { sel: i === sel })).join(''), over || detail(det, { wide }), wide);

// ---- storico (righe per giorno, D39 a) ----
export const stChip = { ok: chip('ok', 'Approvata', 'check-circle'), exp: chip('neutral', 'Scaduta', 'clock', { fill: false }), no: chip('warn', 'Non confermata', 'x-circle'), prize: chip('prize', 'Premio', 'gift') };
export const hrow = (tm, title, dt, chipHtml, prz = false, code = true) => `<div class="hrow ${prz ? 'prz' : ''}"><div class="tm">${tm}</div><div class="mid">${code ? `<div class="code">${title}</div>` : `<div class="nm">${title}</div>`}<div class="dt">${dt}</div></div>${chipHtml}</div>`;
export const day = (t) => `<div class="dayh">${t}</div>`;
export const filtersBar = ({ n = 0, open = false, total }) => `<div class="filters">${btn('secondary', `Filtri${n ? ' · ' + n : ''}`, { icon: open ? 'caret-up' : 'caret-down', h: 44 }).replace('btn secondary', `btn secondary ${open ? 'open' : ''}`)}${n ? btn('link', 'Azzera') : ''}<span class="grow"></span><span class="muted" role="status" style="font-size:14px">${total}</span></div>`;
export const chipsAct = (list) => `<div class="row" style="flex-wrap:wrap">${list.map(t => `<span class="chipx">${t}<button class="xbtn" aria-label="Rimuovi filtro" data-tap>${ic('x', 18)}</button></span>`).join('')}</div>`;
export const sel = (label, val, backend = false) => `<div class="field"><div class="lbl">${label} ${backend ? be() : ''}</div><div class="inp sel" data-tap data-h="52"><span>${val}</span>${ic('caret-down', 20)}</div></div>`;
export const half = (label, val, ph = 'Tutti') => `<div class="field"><div class="lbl">${label}</div><div class="inp" data-tap data-h="52"><span class="${val ? '' : 'ph'}">${val || ph}</span></div></div>`;
export const wr = (inner) => `<div class="wrap col720 wr stack g12" style="padding:0;max-width:720px;margin:0 auto;width:100%">${inner}</div>`;
