// lib.mjs · helper comuni dei mockup (token e componenti in components.css, da 21-design-system.md)
// Ogni flusso (accesso.mjs, ...) esporta una lista di schermate; build.mjs le rende in chiaro e scuro.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const here = path.dirname(fileURLToPath(import.meta.url));
const ds = path.resolve(here, '../../design-system');

const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ds, 'fonts', f)).toString('base64');
export const fontCss = `
@font-face{font-family:"Unbounded";src:url(${font('unbounded-latin-wght-normal.woff2')}) format("woff2");font-weight:200 900}
@font-face{font-family:"Instrument Sans";src:url(${font('instrument-sans-latin-wght-normal.woff2')}) format("woff2");font-weight:400 700}
@font-face{font-family:"Figtree";src:url(${font('figtree-latin-wght-normal.woff2')}) format("woff2");font-weight:300 900}`;
export const css = () => fs.readFileSync(path.join(here, 'components.css'), 'utf8');

// ---- icone Phosphor (MIT) da lib/icons ----
const iconCache = {};
export const ic = (name, px = 22, { fill = false, cls = '', style = '' } = {}) => {
  const key = (fill ? 'fill/' : 'regular/') + name;
  if (!iconCache[key]) {
    const f = path.join(here, 'icons', key + '.svg');
    if (!fs.existsSync(f)) throw new Error('icona mancante ' + key);
    iconCache[key] = fs.readFileSync(f, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  }
  return `<svg class="ic ${cls}" width="${px}" height="${px}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" ${style ? `style="${style}"` : ''}>${iconCache[key]}</svg>`;
};
const F = (n, px = 22, cls = '') => ic(n, px, { fill: true, cls });

// ---- timbri (da dir-i; stella nera = P1 provvisoria) ----
const ROT = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3];
const star = () => fs.readFileSync(path.join(here, 'icons/fill/star.svg'), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
export const stampFull = (i, isNew) => `<svg class="stamp" viewBox="-6 -6 76 76" role="presentation">
${isNew ? '<circle cx="32" cy="32" r="33.5" fill="none" style="stroke:var(--stamp)" stroke-width="3"/>' : ''}
<g transform="rotate(${ROT[i % 10]} 32 32)"><circle cx="32" cy="32" r="29" style="fill:var(--stamp)"/><circle cx="32" cy="32" r="23" fill="none" style="stroke:var(--stamp-ink)" stroke-opacity=".55" stroke-width="2"/>
<svg x="18" y="18" width="28" height="28" viewBox="0 0 256 256" fill="#000">${star()}</svg></g></svg>`;
export const stampEmpty = (next) => `<svg class="stamp" viewBox="-6 -6 76 76" role="presentation"><circle cx="32" cy="32" r="27" fill="none" style="stroke:${next ? 'var(--stamp)' : 'var(--field)'}" stroke-width="${next ? 3.5 : 2.5}" stroke-dasharray="${next ? '1 7' : '2 6'}" stroke-linecap="round"/></svg>`;
// n timbri su total; newCount ultimi "nuovi" (anello fisso, P3); next = evidenzia il prossimo da riempire (miglioramento approvato)
export const grid = (n, total, newCount, label, next = true) =>
  `<div class="dots" role="img" aria-label="${label}">${Array.from({ length: total }, (_, i) => i < n ? stampFull(i, newCount > 0 && i >= n - newCount) : stampEmpty(next && i === n)).join('')}</div>`;

export const confetti = () => {
  const cols = ['#2b1408', '#f16417', '#ffffff', '#ffd84d'];
  const pts = [[14, 18], [58, 40], [112, 14], [168, 52], [214, 20], [262, 58], [318, 24], [346, 70], [36, 78], [88, 96], [140, 84], [196, 104], [240, 92], [296, 112], [330, 120], [122, 36], [284, 30], [70, 58], [180, 8], [238, 52], [350, 36], [310, 76]];
  return `<div class="conf" aria-hidden="true">${pts.map(([x, y], i) => `<i style="left:${x}px;top:${y}px;background:${cols[i % 4]}"></i>`).join('')}</div>`;
};

// ---- pezzi ----
export const be = (t = 'richiede backend') => `<span class="tag-be">${t}</span>`;
export const nw = (t = 'nuovo') => `<span class="tag-new">${t}</span>`;
export const word = () => `<div class="word"><i>${ic('star', 16, { fill: true, style: 'color:#000' })}</i>Stampy</div>`;
/** header: menu = burger, back = freccia indietro, open = burger aperto, venue = chip locale (staff) */
export const header = ({ menu = true, back = false, open = false, venue = null } = {}) =>
  `<header class="hdr">${back ? `<button class="iconbtn" aria-label="Indietro" data-tap>${ic('arrow-left', 24)}</button>` : ''}${venue ? `<button class="venuechip" data-tap>${ic('storefront', 20)}<span>${venue}</span>${ic('caret-down', 16)}</button>` : word()}<span class="grow"></span>${menu ? `<button class="iconbtn ${open ? 'open' : ''}" aria-label="Menu" aria-expanded="${open}" data-tap>${ic('list', 24)}</button>` : ''}</header>`;
export const menuPanel = (items, cur) => `<div class="menu" role="menu">${items.map(it => it === '-' ? '<div class="msep"></div>' : it.sk ? `<div class="it sk"><i></i></div>` : `<div class="it ${it.cur ? 'cur' : ''}" data-tap data-h="48">${ic(it.icon, 22)}${it.label}</div>`).join('')}</div>`;

const ALERT_IC = { ok: 'check-circle', err: 'x-circle', warn: 'warning', info: 'info', prize: 'gift' };
export const alert = (type, title, text = '', { x = false, role } = {}) =>
  `<div class="al ${type}" role="${role || (type === 'err' ? 'alert' : 'status')}">${F(ALERT_IC[type], 22)}<div class="grow">${title ? `<b>${title}</b>` : ''}${text}</div>${x ? `<button class="xbtn" aria-label="Chiudi" data-tap>${ic('x', 20)}</button>` : ''}</div>`;

export const chip = (type, label, icon, { fill = true } = {}) =>
  `<span class="chip ${type}">${icon ? ic(icon, 16, { fill }) : ''}${label}</span>`;

/** kind: primary|secondary|link|danger|dout|google|wallet ; state: pressed|focus ; busy = spinner */
export const btn = (kind, label, { icon = '', state = '', busy = false, h = 0, block = false } = {}) => {
  const hh = h || (kind === 'link' ? 44 : 52);
  const hv = state === 'pressed' ? hh - 2 : hh; // scala .98 del premuto
  const G = `<svg class="ic" width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
  const lead = busy ? '<span class="spin"></span>' : kind === 'google' ? G : icon ? ic(icon, 22) : '';
  return `<button class="btn ${kind} ${state} ${block ? 'block' : ''} ${hh === 48 ? 'h48' : hh === 58 ? 'h58' : hh === 64 ? 'tall' : ''}" ${busy ? 'aria-busy="true"' : ''} data-tap data-h="${hv}">${lead}${label}</button>`;
};

/** campo: value | placeholder | hint | error | focus | busy | dead | code | reserve (riserva 2 righe) */
export const field = ({ label, value = '', placeholder = '', hint = '', error = '', focus = false, busy = false, dead = false, code = false, icon = '', reserve = true }) => {
  const inner = value ? `<span>${value}</span>` : `<span class="ph">${placeholder}</span>`;
  const inv = error && !dead;
  const cls = ['inp', focus ? 'focus' : '', inv ? 'invalid' : '', busy ? 'busy' : '', dead ? 'dead' : '', code ? 'code' : ''].join(' ');
  return `<div class="field">${label ? `<div class="lbl">${label}</div>` : ''}<div class="${cls}" data-tap data-h="52">${icon ? ic(icon, 22) : ''}${inner}${inv ? F('warning-circle', 22, 'inv') : ''}</div>
<div class="hint ${error ? 'err' : ''} ${reserve ? '' : 'nores'}" ${error ? 'role="alert"' : ''}>${error ? F('warning-circle', 16) : ''}<span>${error || hint}</span></div></div>`;
};

export const card = (inner, cls = '') => `<div class="card ${cls}">${inner}</div>`;
export const cap = (t) => `<div class="cap">${t}</div>`;
export const venueRow = (name = 'Nome del locale', backend = true) => `<div class="venue"><b>${name}</b>${backend ? be() : ''}</div>`;
export const stepN = (n, html, cur = false) => `<div class="stage ${cur ? 'cur' : ''}"><div class="n">${n}</div><div class="st">${html}</div></div>`;
export const emptyPage = ({ icon, title, text, actions }) => `<div class="empty"><div class="hero-ic">${ic(icon, 32)}</div><h1 class="t-section">${title}</h1><p class="lede">${text}</p><div class="stack g12" style="width:100%;margin-top:8px">${actions}</div></div>`;
export const sk = (w, h = 18) => `<div class="sk" style="width:${w};height:${h}px;border-radius:${h > 30 ? 12 : 9}px"></div>`;

// ---- coda staff ----
export const stepper = (val, sel, { min = false, max = false, invalid = '' } = {}) => `<div class="stp"><button class="sq ${min ? 'min' : ''}" aria-label="Meno" ${min ? 'aria-disabled="true"' : ''} data-tap>${ic('minus', 22)}</button>
<div class="inp sm ${invalid ? 'invalid' : ''}" style="width:64px" data-tap>${val}</div><button class="sq ${max ? 'min' : ''}" aria-label="Più" data-tap>${ic('plus', 22)}</button>
<div class="pre" role="group" aria-label="Quantità rapida">${[1, 2, 5].map(n => `<button class="pill ${n === sel ? 'sel' : ''}" data-tap aria-label="${n}"><span>${n}</span></button>`).join('')}</div></div>`;
export const req = ({ first, code, ago, exp, warn, prize, stamps, val, newR, promo, invalid, high, busy, settled }) => `
<article class="req ${first ? 'first' : ''}">
 <div class="top">${first ? '<span class="chip neutral one">1°</span>' : ''}${newR ? chip('action', 'Nuova', null) : ''}<span>${ago}</span><span class="grow"></span>
  ${warn ? chip('warn', exp, 'clock', { fill: false }) : `<span>${exp}</span>`}</div>
 <div class="code">${code}</div>
 ${prize ? `<div class="prz">${chip('prize', 'Premio', 'gift')}<b>Consegna: Caffè gratis ${be()}</b></div>` : ''}
 ${promo ? `<div class="promopill">${F('info', 18)}Nuova promozione: la card riparte da zero</div>` : ''}
 <div class="small2">${stamps} / 10 timbri</div>
 ${stepper(val, [1, 2, 5].includes(val) ? val : 0, { invalid })}
 <div class="hint nores ${invalid || high ? (invalid ? 'err' : '') : 'small2'}" style="min-height:20px;font-size:13px">${invalid ? F('warning-circle', 14) + '<span>' + invalid + '</span>' : high ? '<span>' + high + '</span>' : '<span class="muted">prodotti consumati (premio compreso)</span>'}</div>
 ${btn('primary', busy ? 'Invio…' : `Conferma ${val} ${val === 1 ? 'timbro' : 'timbri'}`, { icon: busy ? '' : 'check', busy, h: 48 })}
 <div class="rif-gap">${btn('dout', 'Rifiuta', { h: 48 })}</div>
</article>`;

// ---- definizione di schermata e build ----
// screen = { id, section, name, state, src, improv, backend, isNew, render:(theme)=>html }
export const frameHtml = (s, theme) => `<section class="frame" id="${s.id}-${theme}" data-theme="${theme}" data-name="${s.id} · ${s.name} · ${s.state} · ${theme === 'light' ? 'chiaro' : 'scuro'}" data-screen="${s.id}">
${s.render(theme)}
</section>`;
export const pageHtml = (title, frames) => `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${fontCss}${css()}</style></head>
<body>
${frames}
</body></html>`;

// ---- Google Wallet: bottone UFFICIALE (asset dell'app: stampy-frontend/public/google-wallet, non modificato) ----
const asset = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(here, 'assets', f)).toString('base64');
/** Badge UFFICIALE (319x50, file originale dell'app, non modificato): si scala solo in proporzione, qui a tutta la larghezza
 *  disponibile (come gli altri bottoni). Non si usa la versione condensata, non si ricolora, non si cambia il testo. */
export const gwBadge = () =>
  `<button class="gwbtn" aria-label="Aggiungi a Google Wallet" data-tap data-h="44"><img src="${asset('add-to-google-wallet-it.svg')}" alt=""></button>`;

// timbri nello stile dell'app (disco + anello + stella, ruotati, vuoti tratteggiati) ma nei colori del locale
const stampBrand = (i, brand) => `<svg class="stamp" viewBox="-6 -6 76 76" role="presentation"><g transform="rotate(${ROT[i % 10]} 32 32)"><circle cx="32" cy="32" r="29" fill="#fff"/><circle cx="32" cy="32" r="23" fill="none" stroke="${brand}" stroke-opacity=".55" stroke-width="2"/>
<svg x="18" y="18" width="28" height="28" viewBox="0 0 256 256" fill="${brand}">${star()}</svg></g></svg>`;
const stampBrandEmpty = (next) => `<svg class="stamp" viewBox="-6 -6 76 76" role="presentation"><circle cx="32" cy="32" r="27" fill="none" stroke="#fff" stroke-opacity="${next ? 1 : .6}" stroke-width="${next ? 3.5 : 2.5}" stroke-dasharray="${next ? '1 7' : '2 6'}" stroke-linecap="round"/></svg>`;

// card del cliente nel Profilo: stessa struttura della card timbri dell'app, colore del locale (branding: richiede backend)
export const walletCard = ({ name, ini, brand, n, total = 10, reward }) => {
  const dots = Array.from({ length: total }, (_, i) => i < n ? stampBrand(i, brand) : stampBrandEmpty(i === n)).join('');
  return `<div class="card pad0 wcard" style="--brand:${brand}"><div class="wtop"><div class="wrow"><span class="wlogo">${ini}</span><div class="grow" style="min-width:0"><h3>${name}</h3><p>Carta fedeltà</p></div></div>
<div class="wbig">${n}<span> su ${total}</span></div><div class="wmiss">ne mancano ${total - n}</div>
<div class="wdots" role="img" aria-label="${n} timbri su ${total}">${dots}</div></div>
<div class="wbody"><p>Al decimo, ${reward}.</p>${gwBadge()}</div></div>`;
};

// illustrazione di /scan: telefono che si avvicina al tag NFC (onde), QR come alternativa
export const scanHero = () => {
  const ink = '#2b1408', cream = '#fbf9f1';
  const arcs = [18, 32, 46].map((r, i) => {
    const a = (35 * Math.PI) / 180, cx = 150, cy = 104;
    const x1 = cx + r * Math.cos(-a), y1 = cy + r * Math.sin(-a), x2 = cx + r * Math.cos(a), y2 = cy + r * Math.sin(a);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round" opacity="${1 - i * 0.22}"/>`;
  }).join('');
  return `<div class="heropanel" aria-hidden="true"><svg viewBox="0 0 326 200" width="100%" height="200">
<circle cx="238" cy="104" r="64" fill="${cream}" opacity=".16"/><circle cx="238" cy="104" r="88" fill="${cream}" opacity=".10"/>
<g transform="rotate(-9 96 110)"><rect x="52" y="22" width="90" height="168" rx="18" fill="${cream}" stroke="${ink}" stroke-width="4"/>
<rect x="60" y="46" width="74" height="122" rx="9" fill="${ink}"/><rect x="83" y="31" width="28" height="6" rx="3" fill="${ink}"/>
<circle cx="97" cy="104" r="22" fill="#f16417"/><svg x="83" y="90" width="28" height="28" viewBox="0 0 256 256" fill="${ink}">${star()}</svg>
<rect x="72" y="140" width="50" height="8" rx="4" fill="${cream}" opacity=".55"/></g>
${arcs}
<circle cx="240" cy="104" r="44" fill="${cream}" stroke="${ink}" stroke-width="4"/><circle cx="240" cy="104" r="35" fill="none" stroke="${ink}" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/>
<svg x="222" y="86" width="36" height="36" viewBox="0 0 256 256" fill="${ink}">${star()}</svg></svg>
<span class="herochip">${ic('qr-code', 20)}oppure inquadra il QR</span></div>`;
};
