// build.mjs · anteprime responsive (chat 14): tablet 820x1180, desktop 1440x900, tablet orizzontale 1180x820.
// Uso: node build.mjs   -> scrive <schermata>.html (autonomi), png/*.png (scala 2), validate.json, e stampa l'esito.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path'; import fs from 'node:fs';
import { fontCss, css, ic, btn, field, chip, req, stepper, card, be, stampFull, stampEmpty, sk } from '../lib/lib.mjs';
import { inPage, urlEsterni } from '../validate.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const respCss = fs.readFileSync(path.join(here, 'resp.css'), 'utf8');
const F = (n, px = 22, cls = '') => ic(n, px, { fill: true, cls });
const V = 'Bar Pasticceria Rossi';

// ---------- pezzi comuni ----------
const word = () => `<div class="word"><i>${ic('star', 16, { fill: true, style: 'color:#000' })}</i>Stampy</div>`;
const navItem = (icon, label, o = {}) => `<a class="${o.cur ? 'cur' : ''} ${o.hov ? 'hov' : ''} ${o.focus ? 'focus' : ''}" data-tap data-h="44" ${o.cur ? 'aria-current="page"' : ''}>${ic(icon, 22)}${label}${o.badge ? `<span class="badge">${o.badge}</span>` : ''}</a>`;
const venueChip = () => `<button class="venuechip" data-tap>${ic('storefront', 20)}<span>${V}</span>${ic('caret-down', 16)}</button>`;
/** header largo. kind: anon | cliente | staff ; compact = voci solo icona (tablet) */
const headerW = ({ kind, cur = '', compact = false, hov = '', focus = '' }) => {
  const L = (t) => compact ? '' : t;
  const right = kind === 'anon' ? '' : kind === 'cliente'
    ? `<span class="grow"></span><div class="nav">${navItem('user-circle', 'Profilo', { cur: cur === 'profilo', hov: hov === 'profilo' })}${navItem('clock-counter-clockwise', 'Storico richieste', { cur: cur === 'storico', hov: hov === 'storico' })}</div><span class="sepv"></span><a class="lnk" data-tap data-h="44">${ic('sign-out', 22)}Esci</a>`
    : `<div class="nav">${navItem('bell', 'Coda', { cur: cur === 'coda', hov: hov === 'coda', focus: focus === 'coda', badge: 3 })}${navItem('clock-counter-clockwise', 'Storico', { cur: cur === 'storico', hov: hov === 'storico' })}</div><span class="grow"></span><a class="lnk" data-tap data-h="44" aria-label="Profilo">${ic('user-circle', 22)}${L('Profilo')}</a><a class="lnk" data-tap data-h="44" aria-label="Esci">${ic('sign-out', 22)}${L('Esci')}</a>`;
  return `<header class="hw"><div class="wrap">${kind === 'staff' ? venueChip() : word()}${right}</div></header>`;
};
const wrapMain = (inner, { col = '', cls = '' } = {}) => `<main class="wrap ${col} mainw ${cls}">${inner}</main>`;
const frame = (id, theme, W, H, kind, inner, clip = false) => `<section class="frame ${kind}" id="${id}-${theme}" data-theme="${theme}" data-name="${id} · ${theme === 'light' ? 'chiaro' : 'scuro'}" style="width:${W}px;height:${H}px">${inner}${clip ? '<i data-clip></i>' : ''}</section>`;

// ---------- Login ----------
const loginForm = () => `<div class="stack g16">
<h1 class="t-title w">Accedi</h1><p class="lede">Ti mandiamo un codice via email. Niente password.</p>
${field({ label: 'Email', placeholder: 'nome@esempio.it', hint: 'Ti mandiamo un codice di 6 cifre.' })}
${btn('primary', 'Invia il codice')}
<div class="row" style="gap:12px"><span class="sep grow"></span><span class="muted t-small">oppure</span><span class="sep grow"></span></div>
${btn('google', 'Continua con Google')}
<p class="privacy">Usiamo la tua email solo per farti entrare.<br><a>Leggi l'informativa sulla privacy</a></p></div>`;
const loginCentered = (W, H, kind, theme) => frame('login', theme, W, H, kind,
  `${headerW({ kind: 'anon' })}<div class="pagew" style="justify-content:center;padding-bottom:64px"><div class="wrap" style="max-width:calc(480px + 2*var(--m))">${card(loginForm(), 'cardc')}</div></div>`);
const deco = () => { const ink = '#1a1410', cream = '#fbf9f1'; const star = ic('star', 28, { fill: true }); return `<div class="dots" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => i < 7 ? `<svg class="stamp" viewBox="-6 -6 76 76"><g transform="rotate(${[-4, 3, -2, 5, -3, 2, -5][i]} 32 32)"><circle cx="32" cy="32" r="29" fill="${cream}" stroke="${ink}" stroke-width="2.5"/><circle cx="32" cy="32" r="23" fill="none" stroke="${ink}" stroke-opacity=".5" stroke-width="2"/><svg x="18" y="18" width="28" height="28" viewBox="0 0 256 256" fill="${ink}">${star.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg></g></svg>` : `<svg class="stamp" viewBox="-6 -6 76 76"><circle cx="32" cy="32" r="27" fill="none" stroke="${ink}" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/></svg>`).join('')}</div>`; };
const loginSplit = (theme) => frame('login-b', theme, 1440, 900, 'D',
  `${headerW({ kind: 'anon' })}<div class="pagew" style="justify-content:center;padding:0 var(--m) 40px"><div class="split"><div class="heroL"><div><h2>Niente password.</h2><p>Ti mandiamo un codice via email e sei dentro.</p></div>${deco()}</div>${card(loginForm(), 'cardc')}</div></div>`);

// ---------- Card timbri (cliente) ----------
const stampsCard = (n, total = 10, newCount = 0, status = '') => {
  const dots = Array.from({ length: total }, (_, i) => i < n ? stampFull(i, newCount > 0 && i >= n - newCount) : stampEmpty(i === n)).join('');
  return `<div class="card cardw"><div class="venue"><b>Nome del locale</b>${be()}${status}</div>
<div class="big" style="font-size:44px">${n}<span> su ${total}</span></div><div class="miss">ne mancano ${total - n}</div>
<div class="stampsrow"><div class="dots" role="img" aria-label="${n} timbri su ${total}">${dots}</div></div>
<div class="codecard">Codice card: <b>44EE7A5B</b></div></div>`;
};
const okAlert = (n) => `<div class="al ok" role="status">${F('check-circle')}<div class="grow"><b>Richiesta approvata</b><span class="plus"><em>+${n}</em> timbri</span></div></div>`;
const clienteBody = (alt) => alt === 'b'
  ? `<div class="two"><div>${stampsCard(7, 10, 2)}</div><div class="stack g16">${okAlert(2)}<div class="card"><div class="t-small muted">Codice card</div><div class="code" style="margin-top:6px">44EE-7A5B</div></div></div></div>`
  : `<div class="stack g16">${okAlert(2)}${stampsCard(7, 10, 2)}</div>`;
const cardPage = (alt, W, H, kind, theme, id) => frame(id, theme, W, H, kind,
  `${headerW({ kind: 'cliente', compact: kind === 'T' })}${wrapMain(clienteBody(alt), { col: alt === 'b' ? '' : 'col' })}`);

// ---------- Dialog del premio ----------
const confetti = () => { const cols = ['#2b1408', '#f16417', '#ffffff', '#ffd84d']; const pts = [[4, 12], [16, 28], [30, 8], [44, 36], [58, 14], [72, 40], [88, 18], [95, 48], [10, 56], [24, 70], [38, 58], [52, 76], [66, 62], [80, 80], [92, 70], [34, 24], [78, 26], [20, 44], [50, 6], [64, 36]]; return `<div class="conf2" aria-hidden="true">${pts.map(([x, y], i) => `<i style="left:${x}%;top:${y}px;background:${cols[i % 4]}"></i>`).join('')}</div>`; };
const prizeBox = () => `<div class="prizebox" role="dialog" aria-modal="true">${confetti()}<span class="chip pk">${ic('seal-check', 18, { fill: true })} Premio riscattato</span><h2 class="pt">PREMIO!</h2><div class="pn">Caffè gratis</div><div class="pv">Nome del locale ${be()}</div><p class="pm">Lo staff lo sa già: ti consegna il premio.</p>${btn('primary', 'Perfetto', { h: 58, state: 'focus' }).replace('btn primary', 'btn pbtn').replace('focus', 'focus-ring-p')}</div>`;
const underlay = (kind) => `<div class="underlay" aria-hidden="true">${headerW({ kind: 'cliente', compact: kind === 'T' })}${wrapMain(`<div class="stack g16">${stampsCard(10, 10, 1, chip('prize', 'Al prossimo timbro', 'gift'))}</div>`, { col: 'col' })}</div>`;
const dialogFrame = (alt, W, H, kind, theme, id) => frame(id, theme, W, H, kind,
  `${underlay(kind)}<div class="scrimfull"></div>${alt === 'b' ? `<div class="sheet">${prizeBox()}</div>` : `<div class="mdlg" style="top:${kind === 'T' ? 330 : 190}px">${prizeBox()}</div>`}`);

// ---------- Coda staff ----------
const R1 = { first: true, code: '44EE-7A5B', ago: 'da 2 min', exp: 'scade tra 1 min', warn: true, stamps: 1, val: 1 };
const R2 = { code: 'YG4G-2QN2', ago: 'da 1 min', exp: 'scade tra 4 min', prize: true, stamps: 10, val: 2 };
const R3 = { code: '9Q23-TSZG', ago: 'da 30 s', exp: 'scade tra 5 min', stamps: 5, val: 1 };
const R4 = { code: 'K7M4-9Q2X', ago: 'da 5 s', exp: 'scade tra 5 min', stamps: 3, val: 1, newR: true };
const headC = (n = 4) => `<div><h1 class="t-title w">Richieste in coda</h1><div class="hbar">${chip('neutral', `${n} in coda`, null)}<span>la più vecchia da 2 min</span><span class="grow"></span><span class="row" style="gap:8px"><i class="dotlive"></i>In ascolto · aggiornato alle 14:32</span></div></div>`;
const codaB = (W, H, kind, theme, id, cols) => frame(id, theme, W, H, kind,
  `${headerW({ kind: 'staff', cur: 'coda', compact: kind === 'T' })}${wrapMain(`${headC()}<div class="qgrid" style="--cols:${cols}">${[R1, R2, R3, R4].map(req).join('')}</div>`)}`, true);
const li = (r, sel) => `<div class="li ${sel ? 'sel' : ''}" data-tap data-h="76"><div class="lc"><b class="c16">${r.code}</b>${r.prize ? chip('prize', 'Premio', 'gift') : r.newR ? chip('action', 'Nuova', null) : ''}</div><div class="lm">${r.first ? '1° · ' : ''}${r.ago} · ${r.exp}</div></div>`;
const detail = (r, wide) => `<section class="card det" style="${wide ? 'grid-template-columns:minmax(0,1fr) 280px' : ''}"><div class="stack g16"><div class="row" style="gap:10px"><span class="chip neutral one">1°</span><span class="small2" style="font-size:14px">${r.ago}</span><span class="grow"></span>${chip('warn', r.exp, 'clock', { fill: false })}</div>
<div class="c40 det-code" style="font:700 36px/1 Unbounded;letter-spacing:.04em">${r.code}</div>
<div class="small2" style="font-size:15px">${r.stamps} / 10 timbri</div>
<div class="stack g8"><div class="lbl2">Prodotti consumati (premio compreso)</div>${stepper(r.val, r.val, {})}</div></div>
<div class="acts">${btn('primary', `Conferma ${r.val} timbro`, { icon: 'check', h: 64 })}${btn('dout', 'Rifiuta', { h: 48 })}</div></section>`;
const codaA = (W, H, kind, theme, id, wide) => frame(id, theme, W, H, kind,
  `${headerW({ kind: 'staff', cur: 'coda', compact: kind === 'T' })}${wrapMain(`${headC()}<div class="mdl" style="grid-template-columns:${wide ? '360px minmax(0,1fr)' : '264px minmax(0,1fr)'}"><div class="lst">${[R1, R2, R3, R4].map((r, i) => li(r, i === 0)).join('')}</div>${detail(R1, wide)}</div>`)}`, true);

// ---------- Storico ----------
const stChip = { ok: chip('ok', 'Approvata', 'check-circle'), exp: chip('neutral', 'Scaduta', 'clock', { fill: false }), no: chip('warn', 'Non confermata', 'x-circle'), prize: chip('prize', 'Premio', 'gift') };
const ROWS = [['Oggi', '14:14', '44EE-7A5B', '2 timbri', 'ok'], ['Oggi', '11:02', 'YG4G-2QN2', 'Premio riscattato · Caffè gratis', 'prize'], ['Ieri', '18:05', '9Q23-TSZG', '1 timbro', 'ok'], ['Ieri', '12:30', 'K7M4-9Q2X', 'Nessun timbro', 'exp'], ['Ieri', '10:15', 'R3T8-2LNA', 'Nessun timbro', 'no'], ['20 ott', '08:12', 'W5PD-4HJK', '3 timbri', 'ok']];
const hrow = (r) => `<div class="hrow ${r[4] === 'prize' ? 'prz' : ''}"><div class="tm">${r[1]}</div><div class="mid"><div class="code">${r[2]}</div><div class="dt">${r[3]}${r[4] === 'prize' ? ' ' + be() : ''}</div></div>${stChip[r[4]]}</div>`;
const dayList = () => { const days = [...new Set(ROWS.map(r => r[0]))]; return days.map(d => `<div class="dayh">${d}</div>${card(ROWS.filter(r => r[0] === d).map(hrow).join(''), 'pad0')}`).join(''); };
const half = (label, val, w, ph = 'Tutti') => `<div class="field" style="width:${w}px"><div class="lbl">${label}</div><div class="inp" data-tap data-h="48"><span class="${val ? '' : 'ph'}">${val || ph}</span></div></div>`;
const fbarFull = () => `<div class="fbar"><div class="field" style="width:200px"><div class="lbl">Esito</div><div class="inp sel" data-tap data-h="48"><span>Tutti</span>${ic('caret-down', 20)}</div></div>${half('Timbri · Min', '', 110)}${half('Max', '', 110)}${half('Dal', '', 150, 'gg/mm/aaaa')}${half('Al', '', 150, 'gg/mm/aaaa')}</div>`;
const filtersT = () => `<div class="filters">${btn('secondary', 'Filtri', { icon: 'caret-down', h: 44 })}<span class="grow"></span><span class="muted" role="status" style="font-size:14px">46 richieste</span></div>`;
const sHead = `<div><h1 class="t-title w">Storico richieste</h1><div class="hbar" style="margin-top:6px">${V}<span class="grow"></span><span role="status">46 richieste</span></div></div>`;
const table = (cols4) => `<div class="card pad0"><table class="tbl"><thead><tr><th scope="col">Data</th><th scope="col">Codice</th><th scope="col">Esito</th><th scope="col" ${cols4 ? '' : 'class="num"'}>${cols4 ? 'Dettaglio' : 'Timbri'}</th>${cols4 ? '' : '<th scope="col">Premio</th>'}</tr></thead><tbody>${ROWS.map(r => { const t = r[3].startsWith('Premio') ? ['—', 'Caffè gratis'] : [r[3].replace(' timbri', '').replace(' timbro', '').replace('Nessun', '0'), '']; return `<tr class="${r[4] === 'prize' ? 'pr' : ''}"><td>${r[0]} ${r[1]}</td><td><span class="code">${r[2]}</span></td><td>${stChip[r[4]]}</td>${cols4 ? `<td>${r[4] === 'prize' ? 'Riscattato · Caffè gratis ' + be() : r[3]}</td>` : `<td class="num">${t[0]}</td><td>${t[1] ? t[1] + ' ' + be() : '—'}</td>`}</tr>`; }).join('')}</tbody></table></div>`;
const storico = (alt, W, H, kind, theme, id) => frame(id, theme, W, H, kind,
  `${headerW({ kind: 'staff', cur: 'storico', compact: kind === 'T' })}${wrapMain(`${sHead}${kind === 'D' ? fbarFull() : filtersT()}${alt === 'b' ? table(kind === 'T') : `<div class="wr stack g12" style="max-width:${kind === 'T' ? 'none' : '720px'}">${dayList()}</div>`}`, { col: '' })}`, true);

// ---------- Stati puntatore (desktop) ----------
const cell = (cap, inner, note = '') => `<div class="cell"><div class="cap">${cap}</div>${inner}${note ? `<div class="curs">${note}</div>` : ''}</div>`;
const pointerBoard = (theme) => frame('puntatore', theme, 1440, 780, 'D', `<div class="pb">
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
</div>`);

// ---------- elenco frame ----------
const T = [820, 1180, 'T'], D = [1440, 900, 'D'], H = [1180, 820, 'D'];
const SCREENS = {
  login: [[(t) => loginCentered(...T.slice(0, 2), 'T', t), 'tablet-login', 'T'], [(t) => loginCentered(...D.slice(0, 2), 'D', t), 'desktop-login-a', 'D'], [(t) => loginSplit(t), 'desktop-login-b', 'D']],
  card: [[(t) => cardPage('a', 820, 1180, 'T', t, 'card'), 'tablet-card', 'T'], [(t) => cardPage('a', 1440, 900, 'D', t, 'card-a'), 'desktop-card-a', 'D'], [(t) => cardPage('b', 1440, 900, 'D', t, 'card-b'), 'desktop-card-b', 'D']],
  dialog: [[(t) => dialogFrame('a', 820, 1180, 'T', t, 'dialog-a'), 'tablet-dialog-a', 'T'], [(t) => dialogFrame('b', 820, 1180, 'T', t, 'dialog-b'), 'tablet-dialog-b', 'T'], [(t) => dialogFrame('a', 1440, 900, 'D', t, 'dialog'), 'desktop-dialog', 'D']],
  coda: [[(t) => codaA(820, 1180, 'T', t, 'coda-a', false), 'tablet-coda-a', 'T'], [(t) => codaB(820, 1180, 'T', t, 'coda-b', 2), 'tablet-coda-b', 'T'], [(t) => codaA(1440, 900, 'D', t, 'coda-a', true), 'desktop-coda-a', 'D'], [(t) => codaB(1440, 900, 'D', t, 'coda-b', 3), 'desktop-coda-b', 'D'], [(t) => codaA(1180, 820, 'D', t, 'coda-a', true), 'orizz-coda-a', 'D'], [(t) => codaB(1180, 820, 'D', t, 'coda-b', 3), 'orizz-coda-b', 'D']],
  storico: [[(t) => storico('a', 820, 1180, 'T', t, 'storico-a'), 'tablet-storico-a', 'T'], [(t) => storico('b', 820, 1180, 'T', t, 'storico-b'), 'tablet-storico-b', 'T'], [(t) => storico('a', 1440, 900, 'D', t, 'storico-a'), 'desktop-storico-a', 'D'], [(t) => storico('b', 1440, 900, 'D', t, 'storico-b'), 'desktop-storico-b', 'D']],
  puntatore: [[(t) => pointerBoard(t), 'desktop-puntatore', 'D']],
};
const DARK = new Set(['tablet-coda-a', 'desktop-coda-a']);
const extra = `.btn.focus-ring-p{outline:3px solid var(--prize-fg);outline-offset:3px}`;
const page = (title, frames) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${title}</title><style>${fontCss}${css()}${respCss}${extra}</style></head><body>${frames}</body></html>`;

const require = createRequire(path.resolve(here, '../../../stampy-frontend/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
fs.mkdirSync(path.join(here, 'png'), { recursive: true });
const report = []; let ext = 0;
for (const [name, list] of Object.entries(SCREENS)) {
  const items = list.flatMap(([fn, pid]) => ['light', 'dark'].filter(t => t === 'light' || DARK.has(pid) || name === 'dialog' && false).map(t => ({ html: fn(t), pid, t })));
  const html = page(`Anteprima responsive · ${name}`, items.map(i => i.html).join('\n'));
  fs.writeFileSync(path.join(here, name + '.html'), html); ext += urlEsterni(html);
  const pg = await (await browser.newContext({ viewport: { width: 1600, height: 1300 }, deviceScaleFactor: 2 })).newPage();
  await pg.goto(pathToFileURL(path.join(here, name + '.html')).href);
  await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(250);
  const frames = pg.locator('.frame'); const n = await frames.count();
  for (let i = 0; i < n; i++) { await frames.nth(i).screenshot({ path: path.join(here, 'png', items[i].pid + '-' + (items[i].t === 'light' ? 'chiaro' : 'scuro') + '.png') }); }
  const res = await pg.evaluate(inPage);
  res.forEach((r, i) => report.push({ ...r, file: items[i].pid + '-' + items[i].t }));
}
await browser.close();
fs.writeFileSync(path.join(here, 'validate.json'), JSON.stringify(report, null, 1));
let ko = 0; for (const r of report) if (r.fail.length) { ko++; console.log('✗', r.file, r.fail.slice(0, 5).join(' | ')); }
console.log(`frame ${report.length} · ok ${report.length - ko} · contrasto minimo ${Math.min(...report.map(r => r.minContrast))} · URL esterni ${ext}`);
