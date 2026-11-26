// Costruisce pilota.html (6 schermate 390x844, token di 21-design-system.md).
// Uso: node build.mjs   -> scrive pilota.html (autonomo: font base64, icone inline, nessun URL esterno)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const ds = path.resolve(here, '../../design-system');

// ---- font incorporati (data URI) ----
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ds, 'fonts', f)).toString('base64');
const fontCss = `
@font-face{font-family:"Unbounded";src:url(${font('unbounded-latin-wght-normal.woff2')}) format("woff2");font-weight:200 900}
@font-face{font-family:"Instrument Sans";src:url(${font('instrument-sans-latin-wght-normal.woff2')}) format("woff2");font-weight:400 700}
@font-face{font-family:"Figtree";src:url(${font('figtree-latin-wght-normal.woff2')}) format("woff2");font-weight:300 900}`;

// ---- icone Phosphor (MIT), prese dai simboli di dir-i.html ----
const src = fs.readFileSync(path.join(ds, 'dir-i.html'), 'utf8');
const sym = {};
for (const m of src.matchAll(/<symbol id="([^"]+)" viewBox="0 0 256 256">(.*?)<\/symbol>/g)) sym[m[1]] = m[2];
const ic = (name, px = 22, extra = '') => {
  if (!sym[name]) throw new Error('icona mancante ' + name);
  return `<svg class="ic" width="${px}" height="${px}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" ${extra}>${sym[name]}</svg>`;
};

// ---- timbri ----
const ROT = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3];
const starPath = sym['f-star'];
const stampFull = (i, isNew) => `<svg class="stamp" viewBox="-6 -6 76 76" role="presentation">
${isNew ? '<circle cx="32" cy="32" r="33.5" fill="none" style="stroke:var(--stamp)" stroke-width="3"/>' : ''}
<g transform="rotate(${ROT[i % 10]} 32 32)"><circle cx="32" cy="32" r="29" style="fill:var(--stamp)"/><circle cx="32" cy="32" r="23" fill="none" style="stroke:var(--stamp-ink)" stroke-opacity=".55" stroke-width="2"/>
<svg x="18" y="18" width="28" height="28" viewBox="0 0 256 256" fill="#000">${starPath}</svg></g></svg>`;
const stampEmpty = () => `<svg class="stamp" viewBox="-6 -6 76 76" role="presentation"><circle cx="32" cy="32" r="27" fill="none" style="stroke:var(--field)" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/></svg>`;
const grid = (n, total, newCount, label) =>
  `<div class="dots" role="img" aria-label="${label}">${Array.from({ length: total }, (_, i) => i < n ? stampFull(i, i >= n - newCount && newCount > 0) : stampEmpty()).join('')}</div>`;

// ---- coriandoli (posizioni fisse, stato finale) ----
const confetti = () => {
  const cols = ['#2b1408', '#f16417', '#ffffff', '#ffd84d'];
  const pts = [[14, 18], [58, 40], [112, 14], [168, 52], [214, 20], [262, 58], [318, 24], [346, 70], [36, 78], [88, 96], [140, 84], [196, 104], [240, 92], [296, 112], [330, 120], [122, 36], [284, 30], [70, 58], [180, 8], [238, 52], [350, 36], [310, 76]];
  return `<div class="conf" aria-hidden="true">${pts.map(([x, y], i) => `<i style="left:${x}px;top:${y}px;background:${cols[i % 4]}"></i>`).join('')}</div>`;
};

// ---- pezzi comuni ----
const header = () => `<header class="hdr"><div class="word"><i>${ic('f-star', 16, 'style="color:#000"')}</i>Stampy<span class="sr"> </span></div>
<button class="iconbtn" aria-label="Menu" data-tap>${ic('i-list', 24)}</button></header>`;
const be = (t = 'richiede backend') => `<span class="tag-be">${t}</span>`;
const venueRow = () => `<div class="venue"><b>Nome del locale</b>${be()}</div>`;

// ---- schermate cliente ----
const clienteTimbri = (theme) => `
<section class="frame" id="s-cliente-timbri-${theme}" data-theme="${theme}" data-screen="cliente-timbri">
${header()}
<main class="page">
 <div class="al ok" role="status">${ic('f-check-circle', 24)}<div><b>Richiesta approvata</b><span class="plus"><em>+2</em> timbri aggiunti</span></div></div>
 <div class="card">
  ${venueRow()}
  <div class="big">7<span> su 10</span></div>
  <div class="miss">ne mancano 3</div>
  ${grid(7, 10, 2, '7 timbri su 10')}
  <div class="codecard">Codice card: <b>44EE7A5B</b></div>
 </div>
</main></section>`;

const clientePremioUnder = () => `
<div class="underlay" aria-hidden="true">${header()}
<main class="page">
 <div class="card">
  ${venueRow()}
  <div class="rowb"><div><div class="big">10<span> su 10</span></div><div class="miss">card piena</div></div>
   <span class="chip prize">${ic('f-gift', 16)} Al prossimo timbro</span></div>
  ${grid(10, 10, 0, '10 timbri su 10')}
  <div class="al prize" style="margin-top:14px">${ic('f-gift', 22)}<div><b>Caffè gratis</b>Il prossimo timbro dà il premio.</div></div>
  <div class="codecard">Codice card: <b>44EE7A5B</b></div>
 </div>
</main></div>`;

const clientePremio = (theme) => `
<section class="frame" id="s-cliente-premio-${theme}" data-theme="${theme}" data-screen="cliente-premio">
${clientePremioUnder()}
<div class="scrimfull"></div>
<div class="dlgwrap"><div class="dlg prizebox" role="dialog" aria-modal="true" aria-labelledby="dlgt-${theme}">
 ${confetti()}
 <span class="chip pk">${ic('f-seal-check', 18)} Premio riscattato</span>
 <h2 id="dlgt-${theme}" class="pt">PREMIO!</h2>
 <div class="pn">Caffè gratis</div>
 <div class="pv">Nome del locale ${be()}</div>
 <p class="pm">Lo staff lo sa già: ti consegna il premio.</p>
 <button class="btn pbtn" data-tap data-h="58">Perfetto</button>
</div></div>
</section>`;

// ---- coda staff ----
const stepper = (val, sel) => `<div class="stp"><button class="sq" aria-label="Meno" data-tap>${ic('i-minus', 22)}</button>
<output>${val}</output><button class="sq" aria-label="Più" data-tap>${ic('i-plus', 22)}</button>
<div class="pre" role="group" aria-label="Quantità rapida">${[1, 2, 5].map(n => `<button class="pill ${n === sel ? 'sel' : ''}" data-tap aria-label="${n}"><span>${n}</span></button>`).join('')}</div></div>`;
const req = ({ first, code, ago, exp, warn, prize, stamps, val }) => `
<article class="req ${first ? 'first' : ''}">
 <div class="top">${first ? '<span class="chip neutral one">1°</span>' : ''}<span>${ago}</span><span class="grow"></span>
  ${warn ? `<span class="chip warn">${ic('i-clock', 16)} ${exp}</span>` : `<span>${exp}</span>`}</div>
 <div class="code">${code}</div>
 ${prize ? `<div class="prz"><span class="chip prize">${ic('f-gift', 16)} Premio</span><b>Consegna: Caffè gratis ${be()}</b></div>` : ''}
 <div class="small2">${stamps} / 10 timbri</div>
 ${stepper(val, val)}
 <button class="btn conf-btn" data-tap data-h="48">${ic('i-check', 22)} Conferma ${val} ${val === 1 ? 'timbro' : 'timbri'}</button>
 <button class="btn rif-btn" data-tap data-h="48">Rifiuta</button>
</article>`;
const staff = (theme) => `
<section class="frame" id="s-staff-coda-${theme}" data-theme="${theme}" data-screen="staff-coda">
${header()}
<main class="page staffp">
 <div class="shead"><h1>Bar Pasticceria Rossi</h1><div class="meta2"><span class="chip neutral">3 in coda</span><span>la più vecchia da 2 min</span></div></div>
 ${req({ first: true, code: '44EE-7A5B', ago: 'da 2 min', exp: 'scade tra 1 min', warn: true, stamps: 1, val: 1 })}
 ${req({ code: 'YG4G-2QN2', ago: 'da 1 min', exp: 'scade tra 4 min', prize: true, stamps: 10, val: 2 })}
 ${req({ code: '9Q23-TSZG', ago: 'da 30 s', exp: 'scade tra 5 min', stamps: 5, val: 1 })}
</main></section>`;

// ---- CSS (token = 21-design-system.md §2) ----
const css = `
*{box-sizing:border-box}
html,body{margin:0;background:#8a8378}
body{display:flex;flex-direction:column;align-items:center;gap:32px;padding:32px 0;font-family:"Instrument Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.frame[data-theme=light]{--bg:#f1ede0;--surface:#fbf9f1;--surface2:#dfe5d2;--border:#d6dac8;--field:#7d6a58;--text:#2a1f18;--text2:#5f4e40;--link:#b43a0a;
 --action:#f16417;--action-fg:#1f1612;--action-bd:#9a3412;--danger:#b3261e;--danger-tint:#fbe5e1;--danger-tt:#7a1610;
 --ok:#14633b;--ok-tint:#d3ead9;--ok-tt:#0b3d24;--warn-tint:#f2e1a3;--warn-tt:#4a3300;
 --prize:#ff5fa2;--prize-fg:#2b1408;--prize-bd:#2b1408;--prize-tint:#ffd1e5;--prize-tt:#6b0c37;--stamp:#f16417;--stamp-ink:#2b1408}
.frame[data-theme=dark]{--bg:#1a1410;--surface:#251d17;--surface2:#31261e;--border:#4a3b30;--field:#9a8878;--text:#f4e9dc;--text2:#c0ad9c;--link:#f4813f;
 --action:#f16417;--action-fg:#1a1410;--action-bd:transparent;--danger:#ff8d82;--danger-tint:#3a1714;--danger-tt:#ffc9c3;
 --ok:#86dca0;--ok-tint:#14301c;--ok-tt:#c8f2d6;--warn-tint:#3a2f0a;--warn-tt:#ffe39a;
 --prize:#ff5fa2;--prize-fg:#2b1408;--prize-bd:transparent;--prize-tint:#4d1634;--prize-tt:#ffc7e0;--stamp:#f16417;--stamp-ink:#1a1410}
.frame{position:relative;width:390px;height:844px;overflow:hidden;background:var(--bg);color:var(--text);font-size:17px;line-height:1.5;flex:none}
.frame h1,.frame h2,.frame p{margin:0}
.ic{flex:none;display:block}
.hdr{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-top:6px}
.word{display:flex;align-items:center;gap:8px;font:800 18px/1 "Unbounded",sans-serif;letter-spacing:-.03em;color:var(--text)}
.word i{width:26px;height:26px;border-radius:50%;background:var(--stamp);display:grid;place-items:center}
.sr{display:none}
.iconbtn{width:44px;height:44px;border:1.5px solid var(--field);border-radius:12px;background:transparent;color:var(--text);display:grid;place-items:center;padding:0}
.page{padding:14px 16px 0;display:flex;flex-direction:column;gap:16px}
.card{background:var(--surface);border:1.5px solid var(--border);border-radius:18px;padding:16px}
.venue{display:flex;justify-content:space-between;align-items:center;gap:8px}
.venue b{font:700 15px/1.2 "Figtree",sans-serif}
.tag-be{font:600 13px/1 "Figtree",sans-serif;color:var(--text2);border:1.5px dashed var(--field);border-radius:6px;padding:4px 6px;white-space:nowrap}
.big{font:800 38px/1 "Unbounded",sans-serif;letter-spacing:-.04em;margin-top:14px}
.big span{font-size:.5em;font-weight:700;color:var(--text2)}
.miss{font:700 17px/1.2 "Figtree",sans-serif;color:var(--text2);margin-top:8px}
.rowb{display:flex;justify-content:space-between;align-items:flex-end}
.dots{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:16px}
.stamp{width:100%;height:auto;aspect-ratio:1;display:block;overflow:visible}
.codecard{margin-top:16px;font-size:15px;color:var(--text2)}.codecard b{font:700 15px "Unbounded",sans-serif;letter-spacing:.04em;color:var(--text)}
.al{display:flex;gap:10px;padding:12px 14px;border-radius:12px;border:3px solid;font-size:15px;line-height:1.35;align-items:flex-start}
.al .ic{margin-top:1px}.al b{display:block;font-weight:700}
.al.ok{background:var(--ok-tint);color:var(--ok-tt);border-color:var(--ok)}
.al.prize{background:var(--prize-tint);color:var(--prize-tt);border-color:var(--prize-tt)}
.plus{display:block;font-size:15px}.plus em{font:800 28px/1.1 "Unbounded",sans-serif;font-style:normal;letter-spacing:-.03em;vertical-align:-2px;margin-right:2px}
.chip{display:inline-flex;align-items:center;gap:5px;font:700 13px/1 "Figtree",sans-serif;padding:6px 9px;border-radius:99px;border:3px solid;height:32px;white-space:nowrap}
.chip.prize{background:var(--prize);color:var(--prize-fg);border-color:var(--prize-bd)}
.chip.neutral{background:var(--surface2);color:var(--text);border-color:var(--field)}
.chip.warn{background:var(--warn-tint);color:var(--warn-tt);border-color:var(--warn-tt)}
.chip.one{padding:6px 11px}
.btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font:700 17px/1 "Figtree",sans-serif;border-radius:14px;border:1.5px solid;padding:0 20px}
/* dialog del premio */
.scrimfull{position:absolute;inset:0;background:rgba(10,6,3,.72)}
.dlgwrap{position:absolute;left:12px;right:12px;top:200px}
.prizebox{position:relative;background:var(--prize);color:var(--prize-fg);border:2.5px solid var(--prize-fg);border-radius:28px;padding:126px 18px 18px;box-shadow:0 22px 0 -8px rgba(0,0,0,.25);overflow:hidden}
.frame[data-theme=dark] .prizebox{border-color:var(--prize-fg)}
.conf{position:absolute;left:0;top:0;width:100%;height:150px}.conf i{position:absolute;width:12px;height:12px;border-radius:50%}
.chip.pk{background:var(--prize-fg);color:var(--prize);border-color:var(--prize-fg);height:32px;padding:6px 12px;position:relative}
.pt{font:800 38px/1 "Unbounded",sans-serif;letter-spacing:-.04em;margin-top:12px}
.pn{font:800 28px/1.1 "Unbounded",sans-serif;margin-top:10px}
.pv{font:700 15px/1.3 "Figtree",sans-serif;margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pv .tag-be{color:var(--prize-fg);border-color:var(--prize-fg)}
.pm{font:700 16px/1.35 "Figtree",sans-serif;margin-top:10px}
.pbtn{background:var(--prize-fg);color:var(--prize);border-color:var(--prize-fg);height:58px;margin-top:18px}
/* coda */
.staffp{gap:16px;padding-top:6px}
.shead h1{font:700 19px/1.15 "Unbounded",sans-serif}
.meta2{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:14px;color:var(--text2)}
.req{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px}
.req.first{border:2px solid var(--text)}
.top{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);min-height:32px}.grow{flex:1}
.code{font:700 22px/1 "Unbounded",sans-serif;letter-spacing:.04em;color:var(--text)}
.prz{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.prz b{font:700 15px "Figtree",sans-serif;display:flex;gap:8px;align-items:center}
.small2{font-size:13px;color:var(--text2);margin-top:0}
.stp{display:flex;align-items:center;gap:10px}
.sq{width:44px;height:44px;border:1.5px solid var(--field);border-radius:12px;background:var(--surface);color:var(--text);display:grid;place-items:center;padding:0}
.stp output{min-width:44px;text-align:center;font:800 22px/1 "Unbounded",sans-serif;color:var(--text)}
.pre{display:flex;gap:2px;margin-left:auto}
.pill{width:44px;height:44px;background:transparent;border:0;padding:0;display:grid;place-items:center;color:var(--text)}
.pill span{display:grid;place-items:center;min-width:36px;height:36px;border:1.5px solid var(--field);border-radius:99px;font:700 14px/1 "Figtree",sans-serif;background:var(--surface)}
.pill.sel span{background:var(--surface2);border:2px solid var(--text)}
.conf-btn{height:48px;background:var(--action);color:var(--action-fg);border-color:var(--action-bd);font-size:16px}
.rif-btn{height:48px;background:transparent;color:var(--danger);border-color:var(--danger);font-size:16px;margin-top:8px}

.underlay{position:absolute;inset:0}
`;
// Nota: .req ha gap 12; tra Conferma e Rifiuta servono 16: 12 + 4 di margin-top = 16.

const frames = [
  clienteTimbri('light'), clienteTimbri('dark'),
  clientePremio('light'), clientePremio('dark'),
  staff('light'), staff('dark'),
].join('\n');

const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pilota mobile · dir-i · 6 schermate</title>
<style>${fontCss}${css}</style></head>
<body>
${frames}
</body></html>`;
fs.writeFileSync(path.join(here, 'pilota.html'), html);
console.log('pilota.html', (html.length / 1024).toFixed(0), 'kB');
