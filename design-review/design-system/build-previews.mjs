// Genera dir-a.html e dir-b.html (anteprime STATICHE, non codice di produzione). Uso: node build-previews.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { A, B, C, D, E, F, G, H, I, D1 } from './palettes.mjs';
import { cr } from './contrasts-direzioni.mjs';

const PH = process.env.PHOSPHOR || '/tmp/claude-1000/-home-rigoni_g-Personal-stampy/3922ac85-94d9-4e95-885f-e4505916ae6c/scratchpad/fonts/ph/package/assets';
const NAME = 'Stampy'; // D5: segnaposto, variabile
const PV = { a: 'vb', b: 'va', c: 'vb', d: 'va', e: 'va', f: 'vb', g: 'vb', h: 'vb', i: 'va' }; // variante D1 usata nel resto della pagina

// ---------- icone (Phosphor, MIT) ----------
function sprite(weight) {
  const names = ['check-circle', 'x-circle', 'warning', 'info', 'gift', 'star', 'clock', 'list', 'arrow-left', 'qr-code',
    'wifi-slash', 'arrow-counter-clockwise', 'plus', 'minus', 'x', 'check', 'seal-check', 'hand-tap', 'user-circle', 'warning-circle'];
  const sfx = weight === 'regular' ? '' : `-${weight}`;
  const out = [];
  for (const n of names) {
    const svg = readFileSync(`${PH}/${weight}/${n}${sfx}.svg`, 'utf8');
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    out.push(`<symbol id="i-${n}" viewBox="0 0 256 256">${inner}</symbol>`);
  }
  // varianti piene per stati (alert, timbri)
  for (const n of ['check-circle', 'x-circle', 'warning', 'info', 'gift', 'star', 'seal-check', 'warning-circle']) {
    const svg = readFileSync(`${PH}/fill/${n}-fill.svg`, 'utf8');
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    out.push(`<symbol id="f-${n}" viewBox="0 0 256 256">${inner}</symbol>`);
  }
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${out.join('')}</defs></svg>`;
}
const ic = (n, c = '', fill = false) => `<svg class="ic ${c}" aria-hidden="true" fill="currentColor"><use href="#${fill ? 'f' : 'i'}-${n}"/></svg>`;

// ---------- variabili di tema ----------
function vars(dir, theme) {
  const t = dir[theme];
  const d = (k) => D1[k][theme];
  return `
  --bg:${t.bg};--surface:${t.surface};--surface2:${t.surface2};--text:${t.text};--text2:${t.text2};--border:${t.border};--field:${t.field};
  --link:${t.link};--ring:${t.ring};
  --danger:${t.danger.text};--danger-fill:${t.danger.fill};--danger-fg:${t.danger.fg};--danger-tint:${t.danger.tint};--danger-tt:${t.danger.tintText};
  --ok:${t.success.text};--ok-tint:${t.success.tint};--ok-tt:${t.success.tintText};
  --warn-tint:${t.warning.tint};--warn-tt:${t.warning.tintText};--info-tint:${t.info.tint};--info-tt:${t.info.tintText};
  --prize:${t.premio.fill};--prize-fg:${t.premio.fg};--prize-tint:${t.premio.tint};--prize-tt:${t.premio.tintText};
  --stamp:${t.stampFilled};--stamp-ink:${t.stampInk};
  --d1a-fill:${d('a').fill};--d1a-fg:${d('a').fg};--d1b-fill:${d('b').fill};--d1b-fg:${d('b').fg};--d1c-fill:${d('c').fill};--d1c-fg:${d('c').fg};
  --deco-a:${D1.a.deco};--deco-c:${D1.c.deco};`;
}

const DIRS = { a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I };
// ---------- CSS comune ----------
const BASE = `
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:16px;line-height:1.45;-webkit-font-smoothing:antialiased}
.wrap{max-width:430px;margin:0 auto;padding:20px 16px 56px}
h1,h2,h3,h4,p{margin:0}
.ic{width:1.25em;height:1.25em;flex:none;vertical-align:-.25em}
.sec{margin-top:36px}
.sec>h2.label{font:700 12px/1 var(--font-body);letter-spacing:.08em;text-transform:uppercase;color:var(--text2);margin-bottom:14px;display:flex;gap:8px;align-items:center}
.sec>h2.label::after{content:"";flex:1;border-top:1.5px dashed var(--border)}
.venue{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.note{font-size:13px;color:var(--text2);margin-top:8px}
.tag-be{display:inline-flex;align-items:center;gap:4px;font:600 11px/1 var(--font-body);padding:3px 6px;border:1.5px dashed var(--field);color:var(--text2);border-radius:4px;white-space:nowrap}
.sw{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.sw div{border:1.5px solid var(--border);border-radius:var(--r-sm);padding:8px 10px;font-size:12px;line-height:1.3;display:flex;flex-direction:column;gap:2px;min-height:62px;justify-content:flex-end}
.sw b{font-weight:700;font-size:13px}
.sw code{font-family:var(--font-mono);font-size:11px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.stack{display:flex;flex-direction:column;gap:12px}
/* bottoni */
.btn{--pf:var(--d1-fill);--pfg:var(--d1-fg);display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:var(--btn-h);padding:0 20px;border-radius:var(--r-btn);
  border:var(--bw) solid var(--btn-bd,transparent);background:var(--pf);color:var(--pfg);font:700 17px/1 var(--font-body);cursor:pointer;width:100%;text-decoration:none;transition:transform .08s,box-shadow .08s}
.btn-p{--btn-bd:var(--bd-p,transparent)}
.btn.va{--pf:var(--d1a-fill);--pfg:var(--d1a-fg);--btn-bd:var(--bd-a,transparent)}.btn.vb{--pf:var(--d1b-fill);--pfg:var(--d1b-fg)}.btn.vc{--pf:var(--d1c-fill);--pfg:var(--d1c-fg)}
.btn-s{background:transparent;color:var(--text);--btn-bd:var(--field)}
.btn-d{background:var(--danger-fill);color:var(--danger-fg)}
.btn-q{background:transparent;color:var(--danger);--btn-bd:var(--danger)}
.btn.pressed{transform:var(--press-t);box-shadow:var(--press-sh,none);filter:brightness(.88)}
.btn.focus,.btn:focus-visible,.field input:focus-visible,.stp button:focus-visible{outline:3px solid var(--ring);outline-offset:2px}
.btn.sm{min-height:48px;font-size:16px;width:auto}
.spin{width:1.1em;height:1.1em;border:2.5px solid currentColor;border-right-color:transparent;border-radius:50%;animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.cap{font-size:12px;color:var(--text2);margin:6px 0 0}
.lbl{font-size:12px;font-weight:700;color:var(--text2);margin-bottom:4px;display:block}
/* campi */
.field label{display:block;font-weight:700;margin-bottom:6px}
.field input{width:100%;min-height:52px;padding:0 14px;font:500 17px var(--font-body);color:var(--text);background:var(--surface);border:var(--bw-f) solid var(--field);border-radius:var(--r-btn)}
.field .hint{font-size:14px;color:var(--text2);margin-top:6px;min-height:20px}
.field.bad input{border-color:var(--danger);padding-right:44px;box-shadow:inset 4px 0 0 var(--danger)}
.field.bad .wrapi{position:relative}.field.bad .wrapi .ic{position:absolute;right:12px;top:15px;color:var(--danger);width:22px;height:22px}
.field.bad .hint{color:var(--danger);font-weight:600;display:flex;gap:6px;align-items:flex-start}
/* alert */
.al{display:flex;gap:10px;padding:12px 14px;border-radius:var(--r-sm);border:var(--bw-a) solid;font-size:15px;line-height:1.35;align-items:flex-start}
.al .ic{margin-top:1px;width:22px;height:22px}.al b{display:block}
.al.err{background:var(--danger-tint);color:var(--danger-tt);border-color:var(--danger)}
.al.ok{background:var(--ok-tint);color:var(--ok-tt);border-color:var(--ok)}
.al.warn{background:var(--warn-tint);color:var(--warn-tt);border-color:var(--warn-tt)}
.al.info{background:var(--info-tint);color:var(--info-tt);border-color:var(--info-tt)}
.al.prize{background:var(--prize-tint);color:var(--prize-tt);border-color:var(--prize-tt)}
/* chip */
.chip{display:inline-flex;align-items:center;gap:5px;font:700 13px/1 var(--font-body);padding:6px 9px;border-radius:var(--r-chip);border:var(--bw-a) solid}
.chip.prize{background:var(--prize);color:var(--prize-fg);border-color:var(--prize-bd)}
.chip.neutral{background:var(--surface2);color:var(--text);border-color:var(--field)}
.chip.warn{background:var(--warn-tint);color:var(--warn-tt);border-color:var(--warn-tt)}
/* card */
.card{background:var(--surface);border:var(--bw-c) solid var(--border-c);border-radius:var(--r-card);padding:16px;box-shadow:var(--sh)}
.big{font:var(--fw-d) 44px/1 var(--font-display);font-variant-numeric:tabular-nums;letter-spacing:var(--ls-d)}
.dots{display:grid;grid-template-columns:repeat(5,1fr);gap:var(--gap-s);margin-top:14px}
.dots svg,.dots .slot{width:100%;height:auto;aspect-ratio:1;display:block;overflow:visible}
.pulse{animation:pl 1.4s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
@keyframes pl{50%{opacity:.35}}
.newring{animation:nr 1.2s ease-out 1 both;transform-origin:center;transform-box:fill-box}
@keyframes nr{from{transform:scale(.7);opacity:1}to{transform:scale(1.25);opacity:.0}}
.bar{height:10px;border-radius:99px;background:var(--surface2);border:1.5px solid var(--field);overflow:hidden;margin-top:12px}.bar i{display:block;height:100%;background:var(--stamp)}
/* dialog */
.scrim{background:rgba(10,6,3,.62);border-radius:var(--r-card);padding:22px 14px}
.dlg{background:var(--surface);color:var(--text);border:var(--bw-c) solid var(--border-c);border-radius:var(--r-card);padding:22px 18px 18px;box-shadow:var(--sh-dlg);position:relative;overflow:hidden}
.dlg h2{font:var(--fw-d) 30px/1.05 var(--font-display);letter-spacing:var(--ls-d)}
.prize-name{font:var(--fw-d) 30px/1.1 var(--font-display);margin:10px 0 4px}
/* coda staff */
.req{background:var(--surface);border:var(--bw-c) solid var(--border-c);border-radius:var(--r-card);padding:14px;box-shadow:var(--sh);display:flex;flex-direction:column;gap:12px}
.req .top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px;color:var(--text2)}
.code{font:var(--fw-code) var(--code-size)/1 var(--font-mono);letter-spacing:.06em;font-variant-numeric:tabular-nums}
.stp{display:flex;align-items:center;gap:10px}
.stp button{width:48px;height:48px;border:var(--bw) solid var(--field);background:var(--surface);color:var(--text);border-radius:var(--r-btn);display:grid;place-items:center;font-size:22px;cursor:pointer}
.stp output{min-width:44px;text-align:center;font:var(--fw-d) 26px/1 var(--font-display);font-variant-numeric:tabular-nums}
.stp .pre{display:flex;gap:6px;margin-left:auto}.stp .pre span{border:1.5px solid var(--field);border-radius:99px;padding:8px 11px;font-weight:700;font-size:14px;min-height:36px}
.undo{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:var(--r-sm);border:var(--bw-a) solid var(--ok);background:var(--ok-tint);color:var(--ok-tt);font-weight:600}
.undo .btn{width:auto;min-height:44px;padding:0 14px;font-size:15px}
.undo .tm{height:4px;background:var(--ok);border-radius:4px;margin-top:6px;width:60%}
.menu{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.icons{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center;font-size:11px;color:var(--text2)}
.icons div{border:1.5px solid var(--border);border-radius:var(--r-sm);padding:10px 2px;display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--surface)}
.icons .ic{width:28px;height:28px;color:var(--text)}
.tscale>div{display:flex;justify-content:space-between;align-items:baseline;gap:10px;border-bottom:1.5px dashed var(--border);padding:8px 0}
.tscale small{font:600 11px var(--font-mono);color:var(--text2);text-align:right}
.sw2{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.sw2 span{font:600 11px var(--font-mono);padding:3px 6px;border-radius:4px;border:1.5px solid var(--border)}
.themebtn{position:fixed;top:8px;right:8px;z-index:9;font:700 12px var(--font-body);padding:6px 10px;border-radius:99px;border:1.5px solid var(--field);background:var(--surface);color:var(--text)}
body.shot .themebtn{display:none}
@media (prefers-reduced-motion:reduce){.pulse,.newring,.spin,.conf i{animation:none!important}}
`;

const A_CSS = `
@font-face{font-family:"Figtree";src:url(fonts/figtree-latin-wght-normal.woff2) format("woff2");font-weight:300 900;font-display:swap}
@font-face{font-family:"IBM Plex Mono";src:url(fonts/ibm-plex-mono-latin-600-normal.woff2) format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"IBM Plex Mono";src:url(fonts/ibm-plex-mono-latin-500-normal.woff2) format("woff2");font-weight:500;font-display:swap}
:root{--font-body:"Figtree",ui-sans-serif,sans-serif;--font-display:"Figtree",sans-serif;--font-mono:"IBM Plex Mono",ui-monospace,monospace;
 --fw-d:800;--ls-d:-.02em;--fw-code:600;--code-size:30px;--r-card:18px;--r-sm:12px;--r-btn:14px;--r-chip:99px;--btn-h:52px;--bw:1.5px;--bw-f:2px;--bw-a:1.5px;--bw-c:1.5px;
 --border-c:var(--border);--sh:none;--sh-dlg:0 18px 40px rgba(0,0,0,.28);--gap-s:10px;--press-t:scale(.98);--prize-bd:transparent}
html[data-theme=light]{--bd-a:#9a3412}
.btn-p{--d1-fill:var(--d1b-fill);--d1-fg:var(--d1b-fg)}
.top-title{font:800 34px/1.02 var(--font-display);letter-spacing:-.025em}
.word{display:flex;align-items:center;gap:8px;font:800 20px var(--font-display);letter-spacing:-.02em;color:var(--text)}
.word i{width:26px;height:26px;border-radius:50%;background:var(--deco-a);display:grid;place-items:center;color:var(--stamp-ink)}
.dlg .burst{width:68px;height:68px;border-radius:50%;background:var(--prize);color:var(--prize-fg);display:grid;place-items:center;margin-bottom:12px}
.dlg .burst .ic{width:38px;height:38px}
.venue{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.venue b{font-size:15px}
.req.first{border-color:var(--text);border-width:2px}
`;

const B_CSS = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/bricolage-grotesque-latin-wght-normal.woff2) format("woff2");font-weight:200 800;font-display:swap}
@font-face{font-family:"Hanken Grotesk";src:url(fonts/hanken-grotesk-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Space Mono";src:url(fonts/space-mono-latin-700-normal.woff2) format("woff2");font-weight:700;font-display:swap}
:root{--font-body:"Hanken Grotesk",ui-sans-serif,sans-serif;--font-display:"Bricolage Grotesque",sans-serif;--font-mono:"Space Mono",ui-monospace,monospace;
 --fw-d:800;--ls-d:-.03em;--fw-code:700;--code-size:40px;--r-card:8px;--r-sm:6px;--r-btn:8px;--r-chip:4px;--btn-h:56px;--bw:2px;--bw-f:2px;--bw-a:2px;--bw-c:2px;
 --border-c:var(--text);--gap-s:8px;--press-t:translate(3px,3px);--d1-fill:var(--d1a-fill);--d1-fg:var(--d1a-fg)}
html[data-theme=light]{--sh:4px 4px 0 var(--text);--sh-dlg:6px 6px 0 var(--text);--press-sh:0 0 0 var(--text);--prize-bd:#17110d;--border-c:#17110d}
html[data-theme=dark]{--sh:4px 4px 0 #000;--sh-dlg:6px 6px 0 #000;--press-sh:0 0 0 #000;--prize-bd:transparent;--border-c:var(--field)}
.btn{box-shadow:var(--sh)}.btn-s,.btn-q{box-shadow:none}
html[data-theme=light] .btn-p,html[data-theme=light] .btn-d{--btn-bd:#17110d}
html[data-theme=dark] .btn-p{--btn-bd:transparent}
.btn{text-transform:none;letter-spacing:-.005em}
.top-title{font:800 40px/.95 var(--font-display);letter-spacing:-.035em}
.word{font:800 22px var(--font-display);letter-spacing:-.04em;display:flex;align-items:center;gap:8px}
.word i{width:28px;height:28px;background:var(--stamp);border:2px solid var(--text);border-radius:4px;transform:rotate(-6deg);display:grid;place-items:center;color:var(--stamp-ink)}
.card.ticket{position:relative;border-radius:8px}
.card.ticket::before,.card.ticket::after{content:"";position:absolute;top:96px;width:18px;height:18px;background:var(--bg);border:2px solid var(--border-c);border-radius:50%}
.card.ticket::before{left:-11px;clip-path:inset(0 0 0 50%)}.card.ticket::after{right:-11px;clip-path:inset(0 50% 0 0)}
.perf{border-top:2px dashed var(--field);margin:14px -16px 0}
.dots .slot{border:2px solid var(--field);border-radius:6px;position:relative;display:grid;place-items:center;background:var(--bg)}
.dots .slot small{position:absolute;top:3px;left:5px;font:700 10px var(--font-mono);color:var(--text2)}
.dots .slot.on{border-color:var(--text);background:var(--surface)}
html[data-theme=dark] .dots .slot.on{border-color:var(--field)}
.dots .slot.next{border:2.5px solid var(--text);background:var(--surface2);box-shadow:3px 3px 0 var(--stamp)}
.dots .slot.last{border-style:dashed}.dots .slot.prize{background:var(--prize);color:var(--prize-fg);border-color:var(--text)}
.dlg .burst{background:var(--prize);color:var(--prize-fg);border:2px solid #17110d;border-radius:8px;width:72px;height:72px;display:grid;place-items:center;transform:rotate(-5deg);margin-bottom:14px;box-shadow:3px 3px 0 #17110d}
.dlg .burst .ic{width:42px;height:42px}
.dlg.big-prize{background:var(--prize);color:var(--prize-fg);border-color:#17110d}
.dlg.big-prize .al{background:#17110d;color:var(--prize);border-color:#17110d}
.conf{position:absolute;inset:0;pointer-events:none}.conf i{position:absolute;width:9px;height:14px;border-radius:2px;opacity:0;animation:cf 1.5s ease-out forwards}
@keyframes cf{from{transform:translateY(-30px) rotate(0);opacity:0}30%{opacity:1}to{transform:translateY(0) rotate(var(--rot));opacity:1}}
.req .codebox{border:2px solid var(--text);border-radius:6px;padding:12px 8px;text-align:center;background:var(--bg)}
html[data-theme=dark] .req .codebox{border-color:var(--field)}
.req.first{box-shadow:5px 5px 0 var(--stamp)}
`;

const C_CSS = `
@font-face{font-family:"Fraunces";src:url(fonts/fraunces-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/instrument-sans-latin-wght-normal.woff2) format("woff2");font-weight:400 700;font-display:swap}
@font-face{font-family:"DM Mono";src:url(fonts/dm-mono-latin-500-normal.woff2) format("woff2");font-weight:500;font-display:swap}
:root{--font-body:"Instrument Sans",ui-sans-serif,sans-serif;--font-display:"Fraunces",serif;--font-mono:"DM Mono",ui-monospace,monospace;
 --fw-d:800;--ls-d:-.02em;--fw-code:500;--code-size:32px;--r-card:0;--r-sm:2px;--r-btn:2px;--r-chip:2px;--btn-h:54px;--bw:1.5px;--bw-f:1.5px;--bw-a:1.5px;--bw-c:0px;
 --border-c:transparent;--sh:none;--sh-dlg:none;--gap-s:6px;--press-t:translateY(1px);--prize-bd:transparent}
html[data-theme=light]{--bd-a:#1c1a17;--prize-bd:#1c1a17}
.btn-p{--d1-fill:var(--d1b-fill);--d1-fg:var(--d1b-fg)}
.btn{text-transform:uppercase;letter-spacing:.07em;font-size:14px;font-weight:700}
.btn.sm{font-size:13px}
.top-title{font:800 44px/.98 var(--font-display);letter-spacing:-.025em}
.word{display:flex;align-items:center;gap:8px;font:800 22px var(--font-display);letter-spacing:-.02em}
.word i{width:26px;height:26px;border-radius:50%;background:var(--stamp);display:grid;place-items:center;color:var(--stamp-ink);border:1.5px solid var(--text)}
.sec>h2.label{font-weight:700;letter-spacing:.14em}
.sec>h2.label::after{border-top:1px solid var(--text)}
.card,.req{background:transparent;border:0;border-top:3px double var(--text);border-bottom:1px solid var(--text);border-radius:0;padding:14px 0}
.req{gap:14px}.req.first{border-top:4px solid var(--stamp)}
.big{font-family:var(--font-display);font-weight:800;font-size:60px;letter-spacing:-.03em}
.venue b{font:700 12px var(--font-body);letter-spacing:.12em;text-transform:uppercase}
.venue{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.dots{grid-template-columns:repeat(5,1fr);row-gap:10px}
.field label{font:700 12px var(--font-body);letter-spacing:.1em;text-transform:uppercase}
.field input{background:transparent;border-width:0 0 2px 0;border-radius:0;padding:0 2px;font-size:19px;border-color:var(--text)}
.field.bad input{box-shadow:none;border-color:var(--danger);padding-right:34px}
.al{border-width:0 0 0 5px;border-radius:0}
.chip.prize{border-color:var(--prize-bd)}
html[data-theme=dark] .card,html[data-theme=dark] .req{border-top-color:var(--text);border-bottom-color:var(--field)}
.scrim{border-radius:0;padding:20px 12px}
.dlg{border:2px solid var(--text);border-radius:0;box-shadow:inset 0 0 0 5px var(--surface),inset 0 0 0 6px var(--text);padding:28px 24px 22px}
.dlg .rule{border-top:3px double var(--text);margin-bottom:16px}
.dlg .kicker{font:700 12px var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:var(--text2)}
.dlg h2{font:800 40px/1 var(--font-display);margin:8px 0}
.dlg .burst{width:60px;height:60px;border-radius:50%;background:var(--prize);color:var(--prize-fg);border:2px solid var(--text);display:grid;place-items:center;margin-bottom:14px}
.dlg .burst .ic{width:32px;height:32px}
.req .top{text-transform:uppercase;letter-spacing:.06em;font-size:12px;font-weight:700}
.stp button,.stp .pre span{border-radius:2px}
.undo{border-width:0 0 0 5px;border-radius:0}
.icons div{border-radius:0}
.tag-be{border-radius:0}
`;

const D_CSS = `
@font-face{font-family:"Unbounded";src:url(fonts/unbounded-latin-wght-normal.woff2) format("woff2");font-weight:200 900;font-display:swap}
@font-face{font-family:"Onest";src:url(fonts/onest-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
:root{--font-body:"Onest",ui-sans-serif,sans-serif;--font-display:"Unbounded",sans-serif;--font-mono:"Unbounded",sans-serif;
 --fw-d:800;--ls-d:-.02em;--fw-code:700;--code-size:30px;--r-card:28px;--r-sm:18px;--r-btn:999px;--r-chip:999px;--btn-h:58px;--bw:2.5px;--bw-f:2.5px;--bw-a:2px;--bw-c:2.5px;
 --border-c:var(--text);--sh:none;--sh-dlg:0 22px 0 -8px rgba(0,0,0,.25);--gap-s:8px;--press-t:scale(.96) rotate(-1deg);--d1-fill:var(--d1a-fill);--d1-fg:var(--d1a-fg)}
html[data-theme=light]{--sticker-edge:#ffffff;--bd-a:#2b1408;--prize-bd:#2b1408}
html[data-theme=dark]{--sticker-edge:#ffe9d2;--bd-a:transparent;--prize-bd:transparent}
html[data-theme=light] .btn-p,html[data-theme=light] .btn-d{--btn-bd:#2b1408}
.btn{font:700 15px/1 var(--font-display);letter-spacing:-.01em}
.btn.sm{font-size:13px}
.top-title{font:800 32px/1.02 var(--font-display);letter-spacing:-.03em}
.word{display:flex;align-items:center;gap:8px;font:800 20px var(--font-display);letter-spacing:-.04em}
.word i{width:30px;height:30px;background:var(--stamp);display:grid;place-items:center;color:var(--stamp-ink);clip-path:path("M15 0 L18 3 L22.5 2 L24 6.5 L28.5 8 L27.5 12.5 L30 15 L27.5 17.5 L28.5 22 L24 23.5 L22.5 28 L18 27 L15 30 L12 27 L7.5 28 L6 23.5 L1.5 22 L2.5 17.5 L0 15 L2.5 12.5 L1.5 8 L6 6.5 L7.5 2 L12 3Z")}
.top-title+p{font-weight:500}
.big{font-family:var(--font-display);font-size:40px;letter-spacing:-.04em}
.card{padding:18px 16px}
.dots{background:var(--surface2);border-radius:22px;padding:14px 12px;border:2px solid var(--text)}
html[data-theme=dark] .dots{border-color:var(--field)}
.venue{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:-18px -16px 14px;padding:12px 16px;background:var(--stamp);color:var(--stamp-ink);border-radius:25px 25px 0 0;border-bottom:2.5px solid var(--text)}
.venue b{font:800 14px var(--font-display);letter-spacing:-.01em}
.venue .tag-be{color:var(--stamp-ink);border-color:var(--stamp-ink)}
.field input{border-radius:18px}
.al{border-radius:18px;font-weight:500}
.chip{padding:7px 12px;font-family:var(--font-display);font-size:11.5px;letter-spacing:-.01em}
.chip.prize{background:var(--prize);color:var(--prize-fg);border-color:var(--prize-bd)}
.scrim{border-radius:28px;padding:22px 12px}
.dlg{border-radius:28px;border-width:2.5px}
.dlg.big-prize{background:var(--prize);color:var(--prize-fg);border-color:var(--text);padding-top:30px}
.dlg h2{font-family:var(--font-display);letter-spacing:-.04em}
.dlg .burst{width:92px;height:92px;background:var(--stamp);color:var(--stamp-ink);display:grid;place-items:center;margin:-8px 0 12px;clip-path:path("M46 0 L55 9 L68 6 L72 19 L85 23 L82 36 L92 46 L82 56 L85 69 L72 73 L68 86 L55 83 L46 92 L37 83 L24 86 L20 73 L7 69 L10 56 L0 46 L10 36 L7 23 L20 19 L24 6 L37 9Z");transform:rotate(-8deg)}
.dlg .burst .ic{width:44px;height:44px}
.dlg.big-prize .al{background:var(--text);color:var(--prize);border-color:var(--text)}
.conf{position:absolute;inset:0;pointer-events:none}.conf i{position:absolute;width:12px;height:12px;border-radius:50%;opacity:0;animation:cf 1.5s cubic-bezier(.2,1.4,.4,1) forwards}
@keyframes cf{from{transform:translateY(-40px) scale(.4);opacity:0}30%{opacity:1}to{transform:translateY(0) scale(1);opacity:1}}
.req{border-radius:28px;padding:16px}
.req.first{background:var(--surface);outline:3px solid var(--stamp);outline-offset:3px}
.req .codebox{background:var(--text);color:var(--bg);border-radius:18px;padding:14px 8px;text-align:center}
.req .codebox .code{color:var(--bg)}
.undo{border-radius:22px}
.stp output{font-family:var(--font-display)}
.stp button{border-radius:50%}.stp .pre span{font-family:var(--font-display);font-size:13px}
.icons div{border-radius:18px}
`;


const I_CSS = `
@font-face{font-family:"Unbounded";src:url(fonts/unbounded-latin-wght-normal.woff2) format("woff2");font-weight:200 900;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/instrument-sans-latin-wght-normal.woff2) format("woff2");font-weight:400 700;font-display:swap}
@font-face{font-family:"Figtree";src:url(fonts/figtree-latin-wght-normal.woff2) format("woff2");font-weight:300 900;font-display:swap}
:root{--font-body:"Instrument Sans",ui-sans-serif,sans-serif;--font-display:"Unbounded",sans-serif;--font-label:"Figtree",ui-sans-serif,sans-serif;--font-mono:"Unbounded",sans-serif;
 --fw-d:800;--ls-d:-.03em;--fw-code:700;--code-size:24px;--r-card:18px;--r-sm:12px;--r-btn:14px;--r-chip:99px;--btn-h:52px;--bw:1.5px;--bw-f:2px;--bw-a:3px;--bw-c:1.5px;
 --border-c:var(--border);--sh:none;--sh-dlg:0 22px 0 -8px rgba(0,0,0,.25);--gap-s:10px;--press-t:scale(.98);--d1-fill:var(--d1a-fill);--d1-fg:var(--d1a-fg)}
html[data-theme=light]{--prize-bd:#2b1408;--bd-a:#9a3412}
html[data-theme=dark]{--prize-bd:transparent;--bd-a:transparent}
.btn-p{--d1-fill:var(--d1a-fill);--d1-fg:var(--d1a-fg);--btn-bd:var(--bd-a)}
.btn,.chip,.tag-be,.field label,.lbl,.sec>h2.label,.stp .pre span,.themebtn{font-family:var(--font-label)}
.btn{box-shadow:none}
h1,h2,.top-title,.big,.dlg h2,.prize-name,.stp output{font-family:var(--font-display)}
.top-title{font:800 28px/1.05 var(--font-display);letter-spacing:-.03em}
.word{display:flex;align-items:center;gap:8px;font:800 18px var(--font-display);letter-spacing:-.03em;color:var(--text)}
.word i{width:26px;height:26px;border-radius:50%;background:var(--deco-a);display:grid;place-items:center;color:var(--stamp-ink)}
.big{font-size:38px;letter-spacing:-.04em}
.venue b{font:700 15px var(--font-label)}
.al{border-radius:12px}
.field input{border-radius:14px}
/* card timbri: forma A (card morbida, bordo 1,5 px, nessuna ombra), timbri A */
.dots{margin-top:16px}
/* dialog premio: forma D, senza icona del regalo */
.dlg.big-prize{background:var(--prize);color:var(--prize-fg);border-color:var(--prize-fg);border-radius:28px;border-width:2.5px;padding-top:126px}
.dlg.big-prize h2{letter-spacing:-.04em}
.dlg.big-prize .chip{padding:7px 12px;font-size:11.5px;height:32px}
.dlg.big-prize .btn{min-height:58px}
.scrim{border-radius:28px;padding:22px 12px}
.dlg.big-prize .al{background:var(--prize-fg);color:var(--prize);border-color:var(--prize-fg)}
.conf{position:absolute;inset:0;pointer-events:none}.conf i{position:absolute;width:12px;height:12px;border-radius:50%;opacity:0;animation:cf 1.5s cubic-bezier(.2,1.4,.4,1) forwards}
@keyframes cf{from{transform:translateY(-40px) scale(.4);opacity:0}30%{opacity:1}to{transform:translateY(0) scale(1);opacity:1}}
/* coda staff: stile A, compatta */
.req{border:1.5px solid var(--border);border-radius:14px;box-shadow:none;padding:12px;gap:10px}
.req.first{border-color:var(--text);border-width:2px}
.req .top{font-size:13px}
.req .code{font-size:22px;letter-spacing:.04em}
.req .btn{min-height:46px;font-size:16px}
.req .btn.btn-q{min-height:44px}
.stp button{width:44px;height:44px;border-radius:12px}
.stp output{font-size:22px}
.stp .pre span{padding:6px 10px;min-height:32px}
.undo{border-radius:12px;padding:10px 12px}
`;

const E_CSS = `
@font-face{font-family:"Big Shoulders Display";src:url(fonts/big-shoulders-display-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Archivo";src:url(fonts/archivo-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
:root{--font-body:"Archivo",ui-sans-serif,sans-serif;--font-display:"Big Shoulders Display","Archivo",sans-serif;--font-mono:"Big Shoulders Display",sans-serif;
 --fw-d:900;--ls-d:.01em;--fw-code:800;--code-size:52px;--r-card:4px;--r-sm:4px;--r-btn:4px;--r-chip:3px;--btn-h:56px;--bw:2px;--bw-f:2px;--bw-a:2px;--bw-c:2px;
 --border-c:var(--border);--sh:none;--sh-dlg:none;--gap-s:8px;--press-t:scale(.97);--d1-fill:var(--d1a-fill);--d1-fg:var(--d1a-fg);--prize-bd:transparent;--gf:none;--glow:none;--prize-text:var(--prize-tt)}
html[data-theme=light]{--bd-a:#120d0a;--prize-bd:#120d0a;--sh:3px 3px 0 #120d0a}
html[data-theme=dark]{--gf:drop-shadow(0 0 5px rgba(241,100,23,.85));--glow:0 0 14px rgba(241,100,23,.55),inset 0 0 8px rgba(241,100,23,.25);--prize-text:var(--prize)}
html[data-theme=light] .btn-p,html[data-theme=light] .btn-d{--btn-bd:#120d0a}
.btn{font:900 23px/1 var(--font-display);text-transform:uppercase;letter-spacing:.05em}
.btn.sm{font-size:19px}
.btn-p{box-shadow:var(--glow)}
.btn-d{box-shadow:none}
.top-title{font:900 64px/.88 var(--font-display);text-transform:uppercase;letter-spacing:.005em}
.word{display:flex;align-items:center;gap:8px;font:900 26px var(--font-display);text-transform:uppercase;letter-spacing:.06em}
.word i{width:26px;height:26px;border-radius:50%;border:2.5px solid var(--stamp);display:grid;place-items:center;color:var(--stamp);filter:var(--gf)}
.sec>h2.label{font:800 15px var(--font-display);letter-spacing:.18em}
.card{border-color:var(--border-c);box-shadow:var(--glow)}
html[data-theme=dark] .card,html[data-theme=dark] .req{border-color:var(--stamp)}
.big{font-size:84px;line-height:.85;font-weight:900;letter-spacing:.005em}
.venue b{font:800 15px var(--font-display);letter-spacing:.12em;text-transform:uppercase}
.venue{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}
.dots svg{filter:var(--gf)}
.field label{font:800 14px var(--font-display);letter-spacing:.14em;text-transform:uppercase}
.field input{border-radius:4px;background:transparent}
.al{border-radius:4px}
.chip{font-family:var(--font-display);font-weight:800;font-size:15px;letter-spacing:.1em;text-transform:uppercase;padding:5px 9px}
.chip.prize{border-color:var(--prize-bd);box-shadow:0 0 12px color-mix(in srgb,var(--prize) 55%,transparent)}
html[data-theme=light] .chip.prize{box-shadow:none}
.scrim{border-radius:4px;padding:22px 12px}
.dlg{border:2px solid var(--stamp);border-radius:4px;box-shadow:var(--glow);background:var(--surface);padding:24px 18px 18px}
.dlg h2{font:900 72px/.84 var(--font-display);text-transform:uppercase;color:var(--prize-text);text-shadow:0 0 18px color-mix(in srgb,var(--prize) 70%,transparent);animation:fl 1.5s steps(1) 1 both}
html[data-theme=light] .dlg h2{text-shadow:none}
@keyframes fl{0%{opacity:.15}8%{opacity:1}14%{opacity:.2}22%{opacity:1}30%{opacity:.4}38%,100%{opacity:1}}
.dlg .burst{width:64px;height:64px;border:2.5px solid var(--prize-text);border-radius:50%;color:var(--prize-text);display:grid;place-items:center;margin-bottom:12px}
.dlg .burst .ic{width:34px;height:34px}
.dlg .kick{font:800 16px var(--font-display);letter-spacing:.18em;text-transform:uppercase;color:var(--text2)}
.dlg .prize-name{font:900 40px/1 var(--font-display);text-transform:uppercase;color:var(--text)}
.req{border-left:6px solid var(--stamp);border-radius:4px;box-shadow:var(--glow)}
.req .codebox{border:2px dashed var(--field);border-radius:4px;text-align:center;padding:10px 6px}
.req .codebox .code{color:var(--text);text-shadow:var(--tglow,none)}
html[data-theme=dark]{--tglow:0 0 14px rgba(255,241,224,.45)}
.stp output{font-family:var(--font-display);font-weight:900;font-size:34px}
.stp .pre span{font-family:var(--font-display);font-weight:800;font-size:18px;border-radius:3px}
.req .top{font:700 14px var(--font-body)}
`;

const F_CSS = `
@font-face{font-family:"Geist Mono";src:url(fonts/geist-mono-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Doto";src:url(fonts/doto-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
:root{--font-body:"Geist Mono",ui-monospace,monospace;--font-display:"Doto","Geist Mono",monospace;--font-mono:"Geist Mono",ui-monospace,monospace;
 --fw-d:900;--ls-d:0;--fw-code:700;--code-size:32px;--r-card:0;--r-sm:0;--r-btn:0;--r-chip:0;--btn-h:54px;--bw:2px;--bw-f:2px;--bw-a:1.5px;--bw-c:0;
 --border-c:transparent;--sh:none;--sh-dlg:none;--gap-s:6px;--press-t:translateY(2px);--d1-fill:var(--d1b-fill);--d1-fg:var(--d1b-fg);--prize-bd:transparent}
html[data-theme=light]{--bd-a:#1d1b18;--prize-bd:transparent}
body{font-size:15px;letter-spacing:-.01em}
.wrap{position:relative}
.btn{font:700 14px/1 var(--font-body);text-transform:uppercase;letter-spacing:.04em}
.btn.sm{font-size:12px}
.btn::before{content:"> ";opacity:.7}
.btn.btn-s::before,.btn.btn-q::before{content:"> "}
.spin+*{}
.top-title{font:900 46px/1 var(--font-display);letter-spacing:0}
.word{display:flex;align-items:center;gap:8px;font:900 22px var(--font-display)}
.word i{width:24px;height:24px;border:2px solid var(--text);display:grid;place-items:center;color:var(--stamp)}
.sec>h2.label{font:700 12px var(--font-body);letter-spacing:.06em}
.sec>h2.label::before{content:"## "}
.sec>h2.label::after{border-top:1.5px dashed var(--text2)}
.card,.req{background:var(--surface);border:0;border-radius:0;padding:16px 14px 22px;box-shadow:0 1px 0 rgba(0,0,0,.18);position:relative;margin-bottom:10px}
.card::after,.req::after{content:"";position:absolute;left:0;right:0;bottom:-9px;height:10px;background:linear-gradient(-45deg,transparent 7px,var(--surface) 0) 0 0/14px 10px repeat-x,linear-gradient(45deg,transparent 7px,var(--surface) 0) 0 0/14px 10px repeat-x}
.req.first{outline:2px solid var(--stamp);outline-offset:2px}
.big{font:900 56px/1 var(--font-display)}
.big span{font-family:var(--font-body)!important;font-weight:600!important}
.venue b{font:700 13px var(--font-body);letter-spacing:.08em;text-transform:uppercase}
.venue{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:10px;border-bottom:1.5px dashed var(--text2)}
.perfd{border-top:1.5px dashed var(--text2);margin:12px 0}
.dots{grid-template-columns:repeat(5,1fr);row-gap:10px}
.field label{font:700 12px var(--font-body);letter-spacing:.06em;text-transform:uppercase}
.field label::before{content:"> "}
.field input{background:var(--surface2);font-family:var(--font-body);border-radius:0}
.al{border-radius:0;font-size:14px}
.al::before{content:none}
.chip{font:700 11px var(--font-body);letter-spacing:.06em;text-transform:uppercase;padding:5px 7px}
.chip.prize{background:var(--prize);color:var(--prize-fg);border-color:var(--prize-bd)}
.scrim{border-radius:0;padding:20px 14px}
.dlg{border:0;border-radius:0;padding:22px 18px 28px;position:relative;overflow:visible;animation:prt .5s steps(6) 1 both}
@keyframes prt{from{transform:translateY(-24px);opacity:0}to{transform:none;opacity:1}}
.dlg::after{content:"";position:absolute;left:0;right:0;bottom:-9px;height:10px;background:linear-gradient(-45deg,transparent 7px,var(--surface) 0) 0 0/14px 10px repeat-x,linear-gradient(45deg,transparent 7px,var(--surface) 0) 0 0/14px 10px repeat-x}
.dlg h2{font:900 40px/1 var(--font-display)}
.dlg .burst{display:inline-grid;place-items:center;width:58px;height:58px;border:3px solid var(--prize);color:var(--prize);transform:rotate(-8deg);margin-bottom:12px;border-radius:50%}
html[data-theme=light] .dlg .burst{color:var(--prize);border-color:var(--prize)}
.dlg .burst .ic{width:30px;height:30px}
.dlg .kick{font:700 12px var(--font-body);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
.dlg .line{display:flex;justify-content:space-between;gap:8px;border-bottom:1.5px dashed var(--text2);padding:7px 0;font-size:14px}
.dlg .prize-name{font:900 30px/1.1 var(--font-display);margin:8px 0}
.barcode{height:34px;margin-top:10px;background:repeating-linear-gradient(90deg,var(--text) 0 2px,transparent 2px 4px,var(--text) 4px 5px,transparent 5px 9px,var(--text) 9px 12px,transparent 12px 14px)}
.req .code{color:var(--text)}
.stp button,.stp .pre span{border-radius:0}
.stp output{font-family:var(--font-display);font-weight:900;font-size:30px}
.undo,.icons div,.tag-be{border-radius:0}
.req .top{font-size:12px;text-transform:uppercase;letter-spacing:.04em}
`;

const G_CSS = `
@font-face{font-family:"Schibsted Grotesk";src:url(fonts/schibsted-grotesk-latin-wght-normal.woff2) format("woff2");font-weight:400 900;font-display:swap}
@font-face{font-family:"Geist Mono";src:url(fonts/geist-mono-latin-wght-normal.woff2) format("woff2");font-weight:100 900;font-display:swap}
:root{--font-body:"Schibsted Grotesk",ui-sans-serif,sans-serif;--font-display:"Schibsted Grotesk",sans-serif;--font-mono:"Geist Mono",ui-monospace,monospace;
 --fw-d:600;--ls-d:-.02em;--fw-code:600;--code-size:28px;--r-card:12px;--r-sm:8px;--r-btn:10px;--r-chip:6px;--btn-h:52px;--bw:1.5px;--bw-f:1.5px;--bw-a:1px;--bw-c:1px;
 --border-c:var(--border);--sh:none;--sh-dlg:none;--gap-s:12px;--press-t:scale(.985);--d1-fill:var(--d1b-fill);--d1-fg:var(--d1b-fg);--prize-bd:transparent}
html[data-theme=light]{--bd-a:#7c2d12}
body{letter-spacing:-.005em}
.wrap{padding-top:28px}
.sec{margin-top:44px}
.btn{font:600 16px/1 var(--font-body)}
.top-title{font:600 40px/1.05 var(--font-display);letter-spacing:-.035em}
.top-title+p{color:var(--text2);font-size:17px}
.word{display:flex;align-items:center;gap:8px;font:600 18px var(--font-display);letter-spacing:-.02em}
.word i{width:20px;height:20px;border-radius:50%;border:2px solid var(--stamp);display:grid;place-items:center;color:var(--stamp)}
.word i .ic{width:11px;height:11px}
.sec>h2.label{font:500 13px var(--font-body);letter-spacing:0;text-transform:none;color:var(--text2)}
.sec>h2.label::after{border-top:1px solid var(--border)}
.card{padding:20px}
.big{font:600 52px/1 var(--font-display);letter-spacing:-.05em}
.big span{font-weight:500!important}
.venue b{font-weight:600}
.dots{margin-top:20px}
.dots svg{width:100%}
.field input{border-radius:10px}
.al{border-radius:10px;font-size:15px}
.chip{font:600 12.5px var(--font-body);padding:5px 8px}
.chip.prize{border-color:var(--prize-bd)}
.scrim{background:rgba(20,18,16,.5);border-radius:12px;padding:24px 14px}
.dlg{border-radius:14px;padding:26px 22px 22px;box-shadow:none;animation:fi .3s ease-out both}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.dlg h2{font:600 28px/1.1 var(--font-display);letter-spacing:-.03em}
.dlg .burst{width:44px;height:44px;border-radius:50%;background:var(--prize-tint);color:var(--prize-tt);display:grid;place-items:center;margin-bottom:14px}
.dlg .burst .ic{width:24px;height:24px}
.dlg .prize-name{font:600 24px/1.2 var(--font-display);margin:12px 0 4px}
.req{border-radius:12px;padding:16px;gap:14px}
.req.first{border-color:var(--text);box-shadow:none}
.req .code{font-size:28px}
.stp output{font:600 24px var(--font-display)}
.stp button{border-radius:10px}
.undo{border-radius:10px}
.req .top{font-size:13px}
`;

const H_CSS = `
@font-face{font-family:"Young Serif";src:url(fonts/young-serif-latin-400-normal.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Nunito Sans";src:url(fonts/nunito-sans-latin-wght-normal.woff2) format("woff2");font-weight:200 1000;font-display:swap}
:root{--font-body:"Nunito Sans",ui-sans-serif,sans-serif;--font-display:"Young Serif",Georgia,serif;--font-mono:"Nunito Sans",sans-serif;
 --fw-d:400;--ls-d:-.01em;--fw-code:900;--code-size:32px;--r-card:28px;--r-sm:16px;--r-btn:999px;--r-chip:999px;--btn-h:54px;--bw:0px;--bw-f:2px;--bw-a:1.5px;--bw-c:0px;
 --border-c:transparent;--sh:none;--sh-dlg:none;--gap-s:8px;--press-t:scale(.97);--d1-fill:var(--d1b-fill);--d1-fg:var(--d1b-fg);--prize-bd:transparent}
html[data-theme=light]{--bd-a:#7c2d12}
html[data-theme=light] .btn-p.va{--btn-bd:#7c2d12;border-width:1.5px}
.btn{font:800 16px/1 var(--font-body)}
.btn-s{border:2px solid var(--field)}
.btn-q{border:2px solid var(--danger)}
.btn-p.va{border-width:0}
html[data-theme=light] .btn-p.va{border:1.5px solid #7c2d12}
.top-title{font:400 42px/1.05 var(--font-display);letter-spacing:-.015em}
.top-title+p{color:var(--text2)}
.word{display:flex;align-items:center;gap:8px;font:400 22px var(--font-display)}
.word i{width:26px;height:26px;border-radius:9px 9px 9px 3px;background:var(--stamp);display:grid;place-items:center;color:var(--stamp-ink)}
.sec>h2.label{font:800 12px var(--font-body);letter-spacing:.1em;color:var(--text2)}
.sec>h2.label::after{border-top:2px dotted var(--field)}
.card,.req{background:var(--surface2);border:0}
html[data-theme=light] .card,html[data-theme=light] .req{background:#e6ebd9}
.card{padding:20px}
.big{font:400 52px/1 var(--font-display);letter-spacing:-.02em}
.big span{font-family:var(--font-body)!important;font-weight:700!important}
.venue b{font:400 18px var(--font-display)}
.dots{margin-top:16px}
.field input{border-radius:18px;background:var(--surface)}
.field.bad input{box-shadow:none}
.al{border-radius:20px;border-width:0;font-weight:600}
.al.err{box-shadow:inset 0 0 0 2px var(--danger)}
.al.ok{box-shadow:inset 0 0 0 2px var(--ok)}
.al.warn{box-shadow:inset 0 0 0 2px var(--warn-tt)}.al.info{box-shadow:inset 0 0 0 2px var(--info-tt)}.al.prize{box-shadow:inset 0 0 0 2px var(--prize-tt)}
.chip{font:800 12.5px var(--font-body);padding:6px 11px;border-width:0}
.chip.prize{background:var(--prize);color:var(--prize-fg)}
.chip.neutral{box-shadow:inset 0 0 0 1.5px var(--field)}
.scrim{background:rgba(23,26,19,.55);border-radius:28px;padding:26px 14px}
.dlg{border:0;border-radius:150px 150px 28px 28px;padding:44px 24px 24px;text-align:center;animation:fi .35s ease-out both;box-shadow:none}
.dlg .row{justify-content:center}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.dlg h2{font:400 32px/1.1 var(--font-display)}
.dlg .burst{width:68px;height:68px;border-radius:50%;background:var(--prize);color:var(--prize-fg);display:grid;place-items:center;margin:0 auto 14px}
.dlg .burst .ic{width:36px;height:36px}
.dlg .prize-name{font:400 28px/1.15 var(--font-display);margin:12px 0 6px}
.req{border-radius:28px;padding:16px;gap:14px}
.req.first{outline:3px solid var(--stamp);outline-offset:2px}
.req .codebox{background:var(--surface);border-radius:18px;padding:12px 8px;text-align:center}
.req .code{letter-spacing:.08em}
.stp button{border-radius:50%;border-width:2px}.stp .pre span{border-width:2px}
.stp output{font:400 28px var(--font-display)}
.undo{border-radius:22px}
.icons div{border-radius:18px;border-width:0;background:var(--surface2)}
.tag-be{border-radius:99px}
.sw div{border-radius:18px;border-width:0}
`;

// ---------- timbri ----------
function stampA(kind, i) {
  const rot = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3][i % 10];
  if (kind === 'on') return `<svg viewBox="0 0 64 64"><g transform="rotate(${rot} 32 32)"><circle cx="32" cy="32" r="29" fill="var(--stamp)"/><circle cx="32" cy="32" r="23" fill="none" stroke="var(--stamp-ink)" stroke-opacity=".55" stroke-width="2"/><use href="#f-star" x="18" y="18" width="28" height="28" style="color:var(--stamp-ink)"/></g></svg>`;
  if (kind === 'new') return `<svg viewBox="0 0 64 64"><circle class="newring" cx="32" cy="32" r="29" fill="none" stroke="var(--stamp)" stroke-width="3"/><circle cx="32" cy="32" r="29" fill="var(--stamp)"/><circle cx="32" cy="32" r="23" fill="none" stroke="var(--stamp-ink)" stroke-opacity=".55" stroke-width="2"/><use href="#f-star" x="18" y="18" width="28" height="28" style="color:var(--stamp-ink)"/></svg>`;
  if (kind === 'next') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="var(--text)" stroke-width="3"/><circle class="pulse" cx="32" cy="32" r="8" fill="var(--stamp)"/></svg>`;
  if (kind === 'gift') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="var(--field)" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/><use href="#i-gift" x="18" y="18" width="28" height="28" style="color:var(--text2)"/></svg>`;
  if (kind === 'prize') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="var(--prize)"/><circle cx="32" cy="32" r="23" fill="none" stroke="var(--prize-fg)" stroke-opacity=".5" stroke-width="2"/><use href="#f-gift" x="18" y="18" width="28" height="28" style="color:var(--prize-fg)"/></svg>`;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--field)" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/></svg>`;
}
function stampB(kind, i) {
  const n = `<small>${i + 1}</small>`;
  const rot = [-8, 6, -4, 9, -6, 5, -9, 7, -3, 4][i % 10];
  const st = (fill, ink, icon) => `<svg viewBox="0 0 64 64" style="width:78%;transform:rotate(${rot}deg)"><circle cx="32" cy="32" r="28" fill="${fill}" stroke="${ink}" stroke-width="3.5"/><circle cx="32" cy="32" r="21" fill="none" stroke="${ink}" stroke-width="1.8" stroke-dasharray="3 2.5"/><use href="#f-${icon}" x="19" y="19" width="26" height="26" style="color:${ink}"/></svg>`;
  if (kind === 'on') return `<div class="slot on">${n}${st('var(--stamp)', 'var(--stamp-ink)', 'star')}</div>`;
  if (kind === 'new') return `<div class="slot on">${n}${st('var(--stamp)', 'var(--stamp-ink)', 'star')}<svg class="newring" viewBox="0 0 64 64" style="position:absolute;inset:0;width:100%"><rect x="2" y="2" width="60" height="60" rx="8" fill="none" stroke="var(--stamp)" stroke-width="3"/></svg></div>`;
  if (kind === 'next') return `<div class="slot next">${n}<svg class="pulse" viewBox="0 0 64 64" style="width:46%"><path d="M32 8 L38 26 L56 32 L38 38 L32 56 L26 38 L8 32 L26 26Z" fill="var(--stamp)"/></svg></div>`;
  if (kind === 'gift') return `<div class="slot last">${n}${ic('gift', '', false).replace('class="ic "', 'class="ic" style="width:56%;height:56%;color:var(--text2)"')}</div>`;
  if (kind === 'prize') return `<div class="slot prize">${n}${ic('gift', '', true).replace('class="ic "', 'class="ic" style="width:62%;height:62%"')}</div>`;
  return `<div class="slot">${n}</div>`;
}
// C: bolli tipografici con numero (serif). Svuotati = filetto sottile col numero.
function stampC(kind, i) {
  const num = (c) => `<text x="32" y="43" text-anchor="middle" font-family="Fraunces,serif" font-weight="800" font-size="30" fill="${c}">${i + 1}</text>`;
  if (kind === 'on' || kind === 'new') return `<svg viewBox="0 0 64 64">${kind === 'new' ? '<circle class="newring" cx="32" cy="32" r="29" fill="none" stroke="var(--stamp)" stroke-width="3"/>' : ''}<circle cx="32" cy="32" r="29" fill="var(--stamp)"/><circle cx="32" cy="32" r="25" fill="none" stroke="var(--stamp-ink)" stroke-width="1.2"/>${num('var(--stamp-ink)')}</svg>`;
  if (kind === 'next') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="var(--text)" stroke-width="3"/><circle cx="32" cy="32" r="23" fill="none" stroke="var(--text)" stroke-width="1" /><g class="pulse">${num('var(--text)')}</g></svg>`;
  if (kind === 'gift') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="var(--field)" stroke-width="1.8"/><use href="#i-gift" x="18" y="18" width="28" height="28" style="color:var(--text2)"/></svg>`;
  if (kind === 'prize') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="var(--prize)" stroke="var(--text)" stroke-width="2"/><circle cx="32" cy="32" r="24" fill="none" stroke="var(--prize-fg)" stroke-width="1.2"/><use href="#f-gift" x="18" y="18" width="28" height="28" style="color:var(--prize-fg)"/></svg>`;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="var(--field)" stroke-width="1.8"/>${num('var(--field)')}</svg>`;
}
// D: adesivi fustellati (profilo a margherita, bordo bianco, inclinati).
const scallop = (r, n, amp) => Array.from({ length: 121 }, (_, j) => { const t = (j / 120) * Math.PI * 2; const rr = r + amp * Math.cos(n * t); return `${j ? 'L' : 'M'}${(32 + rr * Math.cos(t)).toFixed(2)} ${(32 + rr * Math.sin(t)).toFixed(2)}`; }).join('') + 'Z';
function stampD(kind, i) {
  const rot = [-9, 7, -5, 10, -7, 6, -10, 8, -4, 5][i % 10];
  const sk = (fill, ink, icon, extra = '') => `<svg viewBox="0 0 64 64"><g transform="rotate(${rot} 32 32)">${extra}<path d="${scallop(27, 10, 2.2)}" fill="${fill}" stroke="var(--sticker-edge)" stroke-width="3.5" paint-order="stroke" style="filter:drop-shadow(0 2px 0 rgba(0,0,0,.25))"/><use href="#f-${icon}" x="19" y="19" width="26" height="26" style="color:${ink}"/></g></svg>`;
  if (kind === 'on') return sk('var(--stamp)', 'var(--stamp-ink)', 'star');
  if (kind === 'new') return sk('var(--stamp)', 'var(--stamp-ink)', 'star', '<circle class="newring" cx="32" cy="32" r="29" fill="none" stroke="var(--stamp)" stroke-width="3"/>');
  if (kind === 'next') return `<svg viewBox="0 0 64 64"><path class="pulse" d="${scallop(27, 10, 2.2)}" fill="none" stroke="var(--text)" stroke-width="3" stroke-dasharray="5 4"/><use href="#i-plus" x="22" y="22" width="20" height="20" style="color:var(--text)"/></svg>`;
  if (kind === 'gift') return `<svg viewBox="0 0 64 64"><path d="${scallop(27, 10, 2.2)}" fill="none" stroke="var(--field)" stroke-width="2.5" stroke-dasharray="3 5" stroke-linecap="round"/><use href="#i-gift" x="19" y="19" width="26" height="26" style="color:var(--text2)"/></svg>`;
  if (kind === 'prize') return sk('var(--prize)', 'var(--prize-fg)', 'gift');
  return `<svg viewBox="0 0 64 64"><path d="${scallop(27, 10, 2.2)}" fill="none" stroke="var(--field)" stroke-width="2.5" stroke-dasharray="3 5" stroke-linecap="round"/></svg>`;
}
// E: tubi al neon (alone solo in scuro). Anelli e numeri come insegne.
function stampE(kind, i) {
  const num = (c, o = 1) => `<text x="32" y="43" text-anchor="middle" font-family="Big Shoulders Display,sans-serif" font-weight="900" font-size="32" fill="${c}" opacity="${o}">${i + 1}</text>`;
  if (kind === 'on') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--stamp)" stroke-width="5"/><circle cx="32" cy="32" r="20" fill="var(--stamp)"/>${num('var(--stamp-ink)')}</svg>`;
  if (kind === 'new') return `<svg viewBox="0 0 64 64"><circle class="newring" cx="32" cy="32" r="29" fill="none" stroke="var(--stamp)" stroke-width="3"/><circle cx="32" cy="32" r="27" fill="none" stroke="var(--stamp)" stroke-width="5"/><circle cx="32" cy="32" r="20" fill="var(--stamp)"/>${num('var(--stamp-ink)')}</svg>`;
  if (kind === 'next') return `<svg viewBox="0 0 64 64"><circle class="pulse" cx="32" cy="32" r="27" fill="none" stroke="var(--stamp)" stroke-width="5" stroke-dasharray="14 5"/>${num('var(--text)')}</svg>`;
  if (kind === 'gift') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--field)" stroke-width="3"/><use href="#i-gift" x="18" y="18" width="28" height="28" style="color:var(--text2)"/></svg>`;
  if (kind === 'prize') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--prize)" stroke-width="5"/><circle cx="32" cy="32" r="20" fill="var(--prize)"/><use href="#f-gift" x="19" y="19" width="26" height="26" style="color:var(--prize-fg)"/></svg>`;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--field)" stroke-width="3"/>${num('var(--field)')}</svg>`;
}
// F: caselle da scontrino «[ ]» con timbro a inchiostro.
function stampF(kind, i) {
  const rot = [-6, 4, -3, 7, -5, 3, -7, 5, -2, 4][i % 10];
  const box = (c, w = 3) => `<path d="M16 8 H8 V56 H16 M48 8 H56 V56 H48" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="square"/>`;
  const n = (c) => `<text x="32" y="38" text-anchor="middle" font-family="Geist Mono,monospace" font-weight="700" font-size="16" fill="${c}">${String(i + 1).padStart(2, '0')}</text>`;
  if (kind === 'on' || kind === 'new') return `<svg viewBox="0 0 64 64">${box('var(--text)')}${kind === 'new' ? '<rect class="newring" x="4" y="4" width="56" height="56" fill="none" stroke="var(--stamp)" stroke-width="3"/>' : ''}<g transform="rotate(${rot} 32 32)"><circle cx="32" cy="32" r="19" fill="none" stroke="var(--stamp)" stroke-width="4"/><circle cx="32" cy="32" r="13" fill="var(--stamp)"/><use href="#f-star" x="23" y="23" width="18" height="18" style="color:var(--stamp-ink)"/></g></svg>`;
  if (kind === 'next') return `<svg viewBox="0 0 64 64">${box('var(--text)', 4)}<rect class="pulse" x="26" y="36" width="12" height="4" fill="var(--text)"/>${n('var(--text)')}</svg>`;
  if (kind === 'gift') return `<svg viewBox="0 0 64 64">${box('var(--field)')}<use href="#i-gift" x="20" y="20" width="24" height="24" style="color:var(--text2)"/></svg>`;
  if (kind === 'prize') return `<svg viewBox="0 0 64 64">${box('var(--text)')}<g transform="rotate(${rot} 32 32)"><rect x="10" y="18" width="44" height="28" fill="var(--prize)"/><use href="#f-gift" x="20" y="22" width="24" height="24" style="color:var(--prize-fg)"/></g></svg>`;
  return `<svg viewBox="0 0 64 64">${box('var(--field)')}${n('var(--field)')}</svg>`;
}
// G: segni minimi. Anello sottile; il timbro è un anello pieno con un segno di spunta.
function stampG(kind, i) {
  if (kind === 'on' || kind === 'new') return `<svg viewBox="0 0 64 64">${kind === 'new' ? '<circle class="newring" cx="32" cy="32" r="27" fill="none" stroke="var(--stamp)" stroke-width="2"/>' : ''}<circle cx="32" cy="32" r="27" fill="var(--stamp)"/><path d="M21 33 L29 41 L44 24" fill="none" stroke="var(--stamp-ink)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (kind === 'next') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--text)" stroke-width="2.5"/><circle class="pulse" cx="32" cy="32" r="5" fill="var(--text)"/></svg>`;
  if (kind === 'gift') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--field)" stroke-width="1.8"/><use href="#i-gift" x="19" y="19" width="26" height="26" style="color:var(--text2)"/></svg>`;
  if (kind === 'prize') return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="var(--prize)"/><use href="#f-gift" x="19" y="19" width="26" height="26" style="color:var(--prize-fg)"/></svg>`;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--field)" stroke-width="1.8"/></svg>`;
}
// H: «ciottoli» morbidi (quadrati arrotondati), tonali; il timbro è un ciottolo arancione con stella.
function stampH(kind, i) {
  const sq = (fill, stroke, sw, extra = '') => `<rect x="5" y="5" width="54" height="54" rx="22" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
  if (kind === 'on' || kind === 'new') return `<svg viewBox="0 0 64 64">${kind === 'new' ? '<rect class="newring" x="3" y="3" width="58" height="58" rx="24" fill="none" stroke="var(--stamp)" stroke-width="3"/>' : ''}${sq('var(--stamp)', 'none', 0)}<use href="#f-star" x="19" y="19" width="26" height="26" style="color:var(--stamp-ink)"/></svg>`;
  if (kind === 'next') return `<svg viewBox="0 0 64 64">${sq('none', 'var(--text)', 3, 'stroke-dasharray="7 5" class="pulse"')}<use href="#i-plus" x="23" y="23" width="18" height="18" style="color:var(--text)"/></svg>`;
  if (kind === 'gift') return `<svg viewBox="0 0 64 64">${sq('none', 'var(--field)', 2.5)}<use href="#i-gift" x="19" y="19" width="26" height="26" style="color:var(--text2)"/></svg>`;
  if (kind === 'prize') return `<svg viewBox="0 0 64 64">${sq('var(--prize)', 'none', 0)}<use href="#f-gift" x="19" y="19" width="26" height="26" style="color:var(--prize-fg)"/></svg>`;
  return `<svg viewBox="0 0 64 64">${sq('var(--surface)', 'var(--field)', 2.5)}</svg>`;
}

// I: timbri di A (cerchio con anello e stella). Vuoti: tutti uguali, tratteggiati (anche il «prossimo»). Niente regalo sulla card: il premio arriva all'11° timbro.
function stampI(kind, i) {
  if (kind === 'on' || kind === 'new') return stampA(kind, i);
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--field)" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/></svg>`;
}
const STAMP = { i: stampI, a: stampA, b: stampB, c: stampC, d: stampD, e: stampE, f: stampF, g: stampG, h: stampH };
let CUR = '';
const stampsGrid = (dir, kinds) => `<div class="dots" role="img" aria-label="Timbri">${kinds.map((k, i) => STAMP[dir](k, i)).join('')}</div>`;
const k = (on, nu, total = 10, full = false) => Array.from({ length: total }, (_, i) =>
  CUR === 'i' ? (i < on - nu || full ? 'on' : i < on ? 'new' : 'off') :
  full ? (i === total - 1 ? 'prize' : 'on') : i < on - nu ? 'on' : i < on ? 'new' : i === on ? 'next' : i === total - 1 ? 'gift' : 'off');

// ---------- sezioni ----------
function swatches(dir, theme) {
  const t = dir[theme];
  const sw = (name, bg, fg, extra = '') => `<div style="background:${bg};color:${fg}"><b>${name}</b><code>${bg}</code>${extra}</div>`;
  const rt = (a, b) => `<code>${cr(a, b).toFixed(2)}:1</code>`;
  return `<div class="sw">
  ${sw('sfondo', t.bg, t.text, rt(t.text, t.bg))}${sw('card', t.surface, t.text, rt(t.text, t.surface))}
  ${sw('testo secondario', t.surface, t.text2, rt(t.text2, t.surface))}${sw('link', t.surface, t.link, rt(t.link, t.surface))}
  ${sw('bordo campo', t.surface, t.text, '<code style="color:' + t.field + '">▇▇▇ ' + cr(t.field, t.surface).toFixed(2) + ':1</code>')}${sw('focus ring', t.surface, t.text, '<code style="color:' + t.ring + '">▇▇▇ ' + cr(t.ring, t.surface).toFixed(2) + ':1</code>')}
  ${sw('arancione (D1-a)', D1.a[theme].fill, D1.a[theme].fg, rt(D1.a[theme].fg, D1.a[theme].fill))}${sw('arancione scuro (D1-b/c)', D1.b[theme].fill, D1.b[theme].fg, rt(D1.b[theme].fg, D1.b[theme].fill))}
  ${sw('premio', t.premio.fill, t.premio.fg, rt(t.premio.fg, t.premio.fill))}${sw('pericolo', t.danger.fill, t.danger.fg, rt(t.danger.fg, t.danger.fill))}
  ${sw('successo', t.success.tint, t.success.tintText, rt(t.success.tintText, t.success.tint))}${sw('avviso', t.warning.tint, t.warning.tintText, rt(t.warning.tintText, t.warning.tint))}
  </div>`;
}

function typeScale(dir) {
  const d = ['a', 'c', 'd', 'e', 'f', 'g', 'h'].includes(dir)
    ? [['Titolo schermata', '800 34/1.02 Figtree', 'font:800 34px/1.02 var(--font-display);letter-spacing:-.025em'], ['Sezione', '700 22/1.15', 'font:700 22px/1.15 var(--font-display)'], ['Corpo', '400 17/1.45', 'font:400 17px/1.45 var(--font-body)'], ['Etichetta / piccolo', '700 14/1.3', 'font:700 14px/1.3 var(--font-body)'], ['K7M4-9Q2X', '600 30 Plex Mono', 'font:600 30px var(--font-mono);letter-spacing:.06em']]
    : [['Titolo schermata', '800 40/.95 Bricolage', 'font:800 40px/.95 var(--font-display);letter-spacing:-.035em'], ['Sezione', '800 24/1.05', 'font:800 24px/1.05 var(--font-display);letter-spacing:-.025em'], ['Corpo', '500 17/1.45 Hanken', 'font:500 17px/1.45 var(--font-body)'], ['Etichetta / piccolo', '800 14/1.3', 'font:800 14px/1.3 var(--font-body)'], ['K7M4-9Q2X', '700 40 Space Mono', 'font:700 40px var(--font-mono);letter-spacing:.04em']];
  if (dir === 'c') d.splice(0, d.length, ['Titolo schermata', '800 38/1 Fraunces', 'font:800 38px/1 var(--font-display);letter-spacing:-.02em'], ['Sezione', '700 22/1.1', 'font:700 22px/1.1 var(--font-display)'], ['Corpo', '400 17/1.5 Instrument Sans', 'font:400 17px/1.5 var(--font-body)'], ['ETICHETTA', '700 12/1.3 +.08em', 'font:700 12px/1.3 var(--font-body);letter-spacing:.08em;text-transform:uppercase'], ['K7M4-9Q2X', '500 32 DM Mono', 'font:500 32px var(--font-mono);letter-spacing:.04em']);
  if (dir === 'g') d.splice(0, d.length, ['Titolo schermata', '600 40/1.05 Schibsted', 'font:600 40px/1.05 var(--font-display);letter-spacing:-.035em'], ['Sezione', '600 24/1.15', 'font:600 24px/1.15 var(--font-display);letter-spacing:-.025em'], ['Corpo', '400 17/1.5', 'font:400 17px/1.5 var(--font-body)'], ['Etichetta / piccolo', '500 13/1.3', 'font:500 13px/1.3 var(--font-body)'], ['K7M4-9Q2X', '600 28 Geist Mono', 'font:600 28px var(--font-mono)']);
  if (dir === 'h') d.splice(0, d.length, ['Titolo schermata', '400 42/1.05 Young Serif', 'font:400 42px/1.05 var(--font-display)'], ['Sezione', '400 24/1.15', 'font:400 24px/1.15 var(--font-display)'], ['Corpo', '400 17/1.5 Nunito Sans', 'font:400 17px/1.5 var(--font-body)'], ['Etichetta / piccolo', '700 14/1.3', 'font:700 14px/1.3 var(--font-body)'], ['K7M4-9Q2X', '900 32 Nunito Sans', 'font:900 32px var(--font-mono);letter-spacing:.08em']);
  if (dir === 'e') d.splice(0, d.length, ['TITOLO SCHERMATA', '900 64/.88 Big Shoulders', 'font:900 64px/.88 var(--font-display);text-transform:uppercase'], ['SEZIONE', '900 32/.95', 'font:900 32px/.95 var(--font-display);text-transform:uppercase'], ['Corpo', '400 17/1.45 Archivo', 'font:400 17px/1.45 var(--font-body)'], ['Etichetta / piccolo', '700 14/1.3', 'font:700 14px/1.3 var(--font-body)'], ['K7M4-9Q2X', '800 52 Big Shoulders', 'font:800 52px var(--font-mono);letter-spacing:.04em']);
  if (dir === 'f') d.splice(0, d.length, ['Titolo 07/10', '900 46 Doto (punti)', 'font:900 46px/1 var(--font-display)'], ['## Sezione', '700 12 Geist Mono', 'font:700 12px var(--font-body);letter-spacing:.06em'], ['Corpo scontrino', '400 15/1.45 Geist Mono', 'font:400 15px/1.45 var(--font-body)'], ['> ETICHETTA', '700 12/1.3', 'font:700 12px/1.3 var(--font-body);letter-spacing:.06em;text-transform:uppercase'], ['K7M4-9Q2X', '700 32 Geist Mono', 'font:700 32px var(--font-mono)']);
  if (dir === 'd') d.splice(0, d.length, ['Titolo schermata', '800 28/1.05 Unbounded', 'font:800 28px/1.05 var(--font-display);letter-spacing:-.02em'], ['Sezione', '700 19/1.15', 'font:700 19px/1.15 var(--font-display)'], ['Corpo', '450 17/1.45 Onest', 'font:450 17px/1.45 var(--font-body)'], ['Etichetta / piccolo', '700 14/1.3', 'font:700 14px/1.3 var(--font-body)'], ['K7M4-9Q2X', '700 26 Unbounded', 'font:700 26px var(--font-mono);letter-spacing:.02em']);
  if (dir === 'i') d.splice(0, d.length, ['Titolo schermata', '800 28/1.05 Unbounded', 'font:800 28px/1.05 var(--font-display);letter-spacing:-.03em'], ['Sezione', '700 19/1.15 Unbounded', 'font:700 19px/1.15 var(--font-display)'], ['Corpo', '400 17/1.5 Instrument Sans', 'font:400 17px/1.5 var(--font-body)'], ['Etichetta / piccolo', '700 14/1.3 Figtree', 'font:700 14px/1.3 var(--font-label)'], ['K7M4-9Q2X', '700 24 Unbounded', 'font:700 24px var(--font-mono);letter-spacing:.04em']);
  return `<div class="tscale">${d.map(([s, m, css]) => `<div><span style="${css}">${s}</span><small>${m}</small></div>`).join('')}</div>`;
}

function buttons(dir) {
  const vs = dir === 'b' || dir === 'i' ? ['a'] : ['a', 'b', 'c'];
  const pb = (v, extra, label, inner) => `<button class="btn btn-p v${v} ${extra}">${inner || label}</button>`;
  const per = vs.map(v => `
    <div><span class="lbl">D1-${v} · ${D1[v].name}</span>
    <div class="stack" style="gap:10px">
      ${pb(v, '', 'Chiedi il timbro')}
      ${pb(v, 'focus', 'focus', 'Focus (anello unico)')}
      ${pb(v, 'pressed', 'pressed', 'Premuto')}
      ${pb(v, '', 'loading', '<span class="spin"></span> Invio in corso…')}
    </div></div>`).join('<div style="height:18px"></div>');
  return `${per}
  <p class="note">Disabilitato: <b>mai</b>. Con un campo incompleto il bottone resta attivo e al tocco compare il messaggio sotto il campo (vedi «campo invalido»).${dir === 'b' ? ' In B le varianti D1-b/c non sono mostrate: bottone con testo bianco su #c2410c contro bordo e ombra inchiostro appiattisce il contrasto «a tinta unita» che è la firma di B (dettagli in 20-direzioni.md).' : ''}</p>
  <div class="stack" style="margin-top:16px"><button class="btn btn-s">Annulla / secondario</button><button class="btn btn-d">Elimina definitivamente</button><button class="btn btn-q">Rifiuta (outline)</button></div>`;
}

const fields = () => `<div class="stack" style="gap:18px">
  <div class="field"><label for="n1">Come ti chiami?</label><input id="n1" value="Marta" /><div class="hint">Lo useremo per riconoscerti nei locali.</div></div>
  <div class="field bad"><label for="n2">Email</label><div class="wrapi"><input id="n2" value="marta@esempio" aria-invalid="true" />${ic('warning-circle', '', true)}</div><div class="hint">${ic('warning', '')}<span>Controlla l’email: manca qualcosa dopo la chiocciola.</span></div></div>
  <button class="btn btn-p">Invia il codice</button></div>`;

const alerts = () => `<div class="stack" style="gap:10px">
  <div class="al err" role="alert">${ic('x-circle', '', true)}<div><b>Codice non corretto</b>Hai ancora 3 tentativi.</div></div>
  <div class="al warn">${ic('warning', '', true)}<div><b>Connessione assente</b>Ultimo aggiornamento alle 14:32.</div></div>
  <div class="al ok">${ic('check-circle', '', true)}<div><b>Richiesta approvata</b>2 timbri aggiunti alla tua card.</div></div>
  <div class="al info">${ic('info', '', true)}<div><b>Promozione attiva</b>Questa settimana i timbri valgono doppio.</div></div>
  <div class="al prize">${ic('gift', '', true)}<div><b>Premio disponibile: Caffè gratis</b>Il prossimo timbro lo sblocca.</div></div></div>`;

function cards(dir) {
  const venue = (label) => `<div class="venue"><b>Nome del locale</b><span class="tag-be">richiede backend</span></div>`;
  const head = (n, sub, prizeLine) => `${venue()}<div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="big">${n}<span style="font-size:.5em;color:var(--text2);font-weight:700"> su 10</span></div><div style="color:var(--text2);margin-top:6px;font-weight:600">${sub}</div></div>${prizeLine || ''}</div>`;
  const wrap = (inner) => `<div class="card ${dir === 'b' ? 'ticket' : dir === 'c' ? 'ledger' : ''}">${inner}</div>`;
  const p = dir === 'b' ? '<div class="perf"></div>' : dir === 'f' ? '<div class="perfd"></div>' : '';
  return `<div class="stack" style="gap:22px">
   <div><span class="lbl">Pochi timbri (3, 2 nuovi)</span>${wrap(head(3, 'ne mancano 7', `<span class="chip neutral">${ic('clock', '')} in attesa</span>`) + p + stampsGrid(dir, k(3, 2)))}</div>
   <div><span class="lbl">A metà (5)</span>${wrap(head(5, 'ne mancano 5') + p + stampsGrid(dir, k(5, 0)) + (dir === 'a' ? '<div class="bar" aria-hidden="true"><i style="width:50%"></i></div>' : ''))}</div>
   <div><span class="lbl">Piena: premio disponibile</span>${wrap(head(10, 'card piena', `<span class="chip prize">${ic('gift', '', true)} ${dir === 'i' ? 'Al prossimo timbro' : 'Premio'}</span>`) + p + stampsGrid(dir, k(10, 0, 10, true)) + `<div class="al prize" style="margin-top:14px">${ic('gift', '', true)}<div><b>Caffè gratis</b>${dir === 'i' ? 'L’11° timbro ti dà il premio.' : 'Alla prossima conferma lo sblocchi.'}</div></div>`)}</div>
  </div>`;
}

function dialog(dir) {
  const conf = dir === 'b' || dir === 'd' || dir === 'i' ? `<div class="conf" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => {
    const cols = dir === 'd' || dir === 'i' ? ['#2b1408', '#f16417', '#ffffff', '#ffd84d', '#2b1408'] : ['#17110d', '#f16417', '#fff9ec', '#17110d', '#f16417'];
    return `<i style="left:${(i * 47) % 100}%;top:${(i * 31) % 45}%;background:${cols[i % 5]};--rot:${(i * 53) % 360}deg;animation-delay:${(i % 6) * 60}ms"></i>`;
  }).join('')}</div>` : '';
  if (dir === 'i') return `<div class="scrim"><div class="dlg big-prize" role="dialog" aria-modal="true" aria-labelledby="dlgt">${conf}
    <div class="chip" style="background:var(--prize-fg);color:var(--prize);border-color:var(--prize-fg)">${ic('seal-check', '', true)} Premio riscattato</div>
    <h2 id="dlgt" style="margin-top:12px;font-size:38px;line-height:1">PREMIO!</h2>
    <div class="prize-name" style="font-size:28px;margin-top:10px">Caffè gratis</div>
    <p style="margin-bottom:6px;font-weight:700">Nome del locale <span class="tag-be" style="border-color:currentColor;color:inherit">richiede backend</span></p>
    <p style="margin-bottom:16px;font-weight:700">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn" style="background:var(--prize-fg);color:var(--prize);--btn-bd:var(--prize-fg)">Perfetto</button></div></div>
    <p class="note">Audace (D10): coriandoli in 1,5 s, solo CSS, spenti con prefers-reduced-motion. Come D (stesse misure e spaziature) ma senza icona del regalo né disco arancione: lo spazio in alto resta (126 px prima del chip).</p>`;
  if (dir === 'a') return `<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
    <div class="burst">${ic('gift', '', true)}</div>
    <div class="row" style="gap:6px;margin-bottom:6px"><span class="chip prize" style="--prize-bd:transparent">${ic('seal-check', '', true)} Premio riscattato</span></div>
    <h2 id="dlgt">Hai guadagnato un premio</h2>
    <div class="prize-name">Caffè gratis</div>
    <p style="color:var(--text2);margin-bottom:6px">Nome del locale <span class="tag-be">richiede backend</span></p>
    <p style="color:var(--text2);margin-bottom:16px">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn btn-p vb">Perfetto</button></div></div>`;
  if (dir === 'g') return `<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
    <div class="burst">${ic('gift', '', true)}</div>
    <span class="chip prize">${ic('seal-check', '', true)} Premio riscattato</span>
    <h2 id="dlgt" style="margin-top:12px">Hai ottenuto un premio</h2>
    <div class="prize-name">Caffè gratis</div>
    <p style="color:var(--text2);margin-bottom:4px">Nome del locale <span class="tag-be">richiede backend</span></p>
    <p style="color:var(--text2);margin-bottom:20px">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn btn-p vb">Perfetto</button></div></div>
    <p class="note">Sobrio (D10): dissolvenza di 0,3 s e 6 px di spostamento; nessun altro effetto. «Hai ottenuto» è solo un esempio di tono (D23 impone «riscattato» per lo stato).</p>`;
  if (dir === 'h') return `<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
    <div class="burst">${ic('gift', '', true)}</div>
    <div class="row" style="margin-bottom:8px"><span class="chip prize">${ic('seal-check', '', true)} Premio riscattato</span></div>
    <h2 id="dlgt">Per te, dal forno</h2>
    <div class="prize-name">Caffè gratis</div>
    <p style="color:var(--text2);margin-bottom:4px;font-weight:600">Nome del locale <span class="tag-be">richiede backend</span></p>
    <p style="color:var(--text2);margin-bottom:20px;font-weight:600">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn btn-p vb">Perfetto</button></div></div>
    <p class="note">Sobrio (D10): dialog a «finestra ad arco», dissolvenza di 0,35 s. Il titolo è un esempio di tono.</p>`;
  if (dir === 'e') return `<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
    <div class="burst">${ic('gift', '', true)}</div>
    <div class="kick">Premio riscattato</div>
    <h2 id="dlgt">Premio<br>acceso!</h2>
    <div class="prize-name" style="margin:12px 0 4px">Caffè gratis</div>
    <p style="color:var(--text2);margin-bottom:6px">Nome del locale <span class="tag-be">richiede backend</span></p>
    <p style="color:var(--text2);margin-bottom:16px">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn btn-p va">Perfetto</button></div></div>
    <p class="note">Audace (D10): l’insegna si accende con tre lampeggi in 1,5 s, solo CSS; con prefers-reduced-motion resta accesa e ferma. In chiaro l’alone è sostituito dall’inchiostro.</p>`;
  if (dir === 'f') return `<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
    <div class="burst">${ic('gift', '', true)}</div>
    <div class="kick">Scontrino n. 0042 · riscatto</div>
    <h2 id="dlgt">PREMIO<br>RISCATTATO</h2>
    <div class="line"><span>Premio</span><b>Caffè gratis</b></div>
    <div class="line"><span>Locale</span><span>nome del locale <span class="tag-be">richiede backend</span></span></div>
    <div class="line"><span>Consegna</span><span>lo staff lo sa già</span></div>
    <div class="barcode"></div>
    <button class="btn btn-p vb" style="margin-top:16px">Perfetto</button></div></div>
    <p class="note">Sobrio (D10): lo scontrino «esce» con uno scatto di 0,5 s, solo CSS; con prefers-reduced-motion compare fermo.</p>`;
  if (dir === 'c') return `<div class="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
    <div class="rule"></div>
    <div class="burst">${ic('gift', '', true)}</div>
    <div class="kicker">Premio riscattato</div>
    <h2 id="dlgt">Un caffè,<br>offerto da noi.</h2>
    <div class="prize-name">Caffè gratis</div>
    <p style="color:var(--text2);margin-bottom:6px">Nome del locale <span class="tag-be">richiede backend</span></p>
    <p style="color:var(--text2);margin-bottom:16px">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn btn-p vb">Perfetto</button></div></div>
    <p class="note">Sobrio (D10): nessuna animazione oltre a una dissolvenza di 0,3 s. Il testo del titolo è un esempio di tono, non una stringa approvata.</p>`;
  if (dir === 'd') return `<div class="scrim"><div class="dlg big-prize" role="dialog" aria-modal="true" aria-labelledby="dlgt">${conf}
    <div class="burst">${ic('gift', '', true)}</div>
    <div class="chip" style="background:var(--text);color:var(--prize);border-color:var(--text)">${ic('seal-check', '', true)} Premio riscattato</div>
    <h2 id="dlgt" style="margin-top:12px;font-size:38px;line-height:1">PREMIO!</h2>
    <div class="prize-name" style="font-size:28px;margin-top:10px">Caffè gratis</div>
    <p style="margin-bottom:6px;font-weight:700">Nome del locale <span class="tag-be" style="border-color:currentColor;color:inherit">richiede backend</span></p>
    <p style="margin-bottom:16px;font-weight:700">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn" style="background:var(--text);color:var(--prize);--btn-bd:var(--text)">Perfetto</button></div></div>
    <p class="note">Audace (D10): coriandoli e adesivo che «cade» in 1,5 s, solo CSS, spenti con prefers-reduced-motion.</p>`;
  return `<div class="scrim"><div class="dlg big-prize" role="dialog" aria-modal="true" aria-labelledby="dlgt">${conf}
    <div class="burst">${ic('gift', '', true)}</div>
    <div class="chip" style="background:#17110d;color:var(--prize);border-color:#17110d">${ic('seal-check', '', true)} Premio riscattato</div>
    <h2 id="dlgt" style="margin-top:10px;font-size:44px;line-height:.92">Premio<br>sbloccato!</h2>
    <div class="prize-name" style="font-size:36px;margin-top:12px">Caffè gratis</div>
    <p style="margin-bottom:6px;font-weight:600">Nome del locale <span class="tag-be" style="border-color:#17110d;color:#17110d">richiede backend</span></p>
    <p style="margin-bottom:16px;font-weight:600">Lo staff lo sa già: ti consegna il premio.</p>
    <button class="btn" style="background:#17110d;color:var(--prize);--btn-bd:#17110d;box-shadow:4px 4px 0 var(--stamp)">Perfetto</button></div></div>
    <p class="note">Coriandoli: solo CSS, 1,5 s, spenti con prefers-reduced-motion (D10). Nell’anteprima restano fermi a fine animazione.</p>`;
}

function queue(dir) {
  const card = (cls, code, mins, prize, qty, warn) => `<div class="req ${cls}">
   <div class="top"><span class="row" style="gap:8px">${cls === 'first' ? '<span class="chip neutral">1°</span>' : ''}<span>da ${mins} min</span></span>${warn ? `<span class="chip warn">${ic('clock', '', true)} scade tra 4 min</span>` : '<span>scade tra 6 min</span>'}</div>
   ${dir === 'b' || dir === 'd' || dir === 'e' || dir === 'h' ? `<div class="codebox"><span class="code">${code}</span></div>` : dir === 'f' ? `<div class="code">${code}</div><div class="barcode"></div>` : `<div class="code">${code}</div>`}
   ${prize ? `<div class="row"><span class="chip prize">${ic('gift', '', true)} Premio</span><b>Consegna: Caffè gratis</b></div>` : ''}
   <div class="stp"><button aria-label="Meno">${ic('minus', '')}</button><output>${qty}</output><button aria-label="Più">${ic('plus', '')}</button><div class="pre"><span>1</span><span>2</span><span>5</span></div></div>
   <button class="btn btn-p ${PV[dir]}">${ic('check', '')} Conferma ${qty} ${qty === 1 ? 'timbro' : 'timbri'}</button>
   <button class="btn btn-q" style="min-height:48px">Rifiuta</button></div>`;
  return `<div class="menu"><span class="word">${dir === 'a' ? `<i>${ic('star', '', true)}</i>` : `<i>${ic('star', '', true)}</i>`}${NAME}</span><span class="chip neutral">3 in coda</span></div>
  <div class="stack" style="gap:16px">
   ${card('first', 'K7M4-9Q2X', 2, false, 1, false)}
   ${card('', 'R3T8-2LNA', 1, true, 1, true)}
   <div class="undo" role="status"><div style="flex:1"><div>${ic('check-circle', '', true)} Confermata · 2 timbri</div><div class="undo tm" style="padding:0;border:0;background:var(--ok);height:4px;width:60%;margin-top:8px"></div></div><button class="btn btn-s sm">${ic('arrow-counter-clockwise', '')} Annulla</button></div>
   <div class="al warn">${ic('wifi-slash', '')}<div><b>Connessione assente</b>Le richieste nuove non arrivano.</div></div>
  </div>
  <p class="note">La card «scade tra 4 min» resta al suo posto anche dopo la scadenza («Scaduta») e l’esito si comprime senza spostare le altre: niente salti sotto il dito.</p>`;
}

const icons = (w) => {
  const n = [['check-circle', 'ok'], ['x-circle', 'errore'], ['warning', 'avviso'], ['gift', 'premio'], ['star', 'timbro'], ['clock', 'attesa'], ['list', 'menu'], ['arrow-left', 'indietro'], ['qr-code', 'QR'], ['wifi-slash', 'offline']];
  return `<div class="icons">${n.map(([i, l]) => `<div>${ic(i, '')}<span>${l}</span></div>`).join('')}</div><p class="note">Phosphor Icons (MIT), peso «${w}», SVG inline: nessun font di icone, ~0,3 KB per icona.</p>`;
};

function page(dir) {
  const d = DIRS[dir];
  const w = { a: 'regular', b: 'bold', c: 'light', d: 'bold', e: 'bold', f: 'regular', g: 'light', h: 'regular', i: 'regular' }[dir];
  const title = { a: 'A · Carta e inchiostro', b: 'B · Biglietto da bar', c: 'C · Menù stampato', d: 'D · Adesivo', e: 'E · Insegna', f: 'F · Scontrino', g: 'G · Pietra', h: 'H · Forno', i: 'I · Ibrido' }[dir];
  const sub = { i: 'Un mix scelto dal proprietario: carta calda, card morbide, timbri tondi e un rosa per il premio.', a: 'Una carta fedeltà di carta, tenuta in tasca: calda, morbida, ordinata.', b: 'Un biglietto timbrato al banco: contorni netti, ombre dure, un lime per il premio.', c: 'Il menù di una trattoria stampato bene: filetti, numeri grandi, serif pesante, oro per il premio.', d: 'Adesivi fustellati su un fondo pesca: forme piene, pillole, rosa shocking per il premio.', e: 'Un’insegna di locale accesa di notte: lettere alte e strette, tubi al neon, azzurro elettrico per il premio.', f: 'Lo scontrino del bar: caratteri a macchina, righe tratteggiate, bordo a zig-zag, inchiostro blu per il premio.', g: 'Una pagina di pietra calda: tanto spazio, un solo grigio, poche parole, un violetto sobrio per il premio.', h: 'Il forno di quartiere al mattino: toni salvia e sabbia, forme morbide a ciottolo e ad arco, bacca per il premio.' }[dir];
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anteprima direzione ${title}</title>
<script>(function(){var q=new URLSearchParams(location.search),t=q.get('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;if(q.has('shot'))document.addEventListener('DOMContentLoaded',function(){document.body.classList.add('shot')})})()</script>
<style>
html[data-theme=light]{${vars(d, 'light')}color-scheme:light}
html[data-theme=dark]{${vars(d, 'dark')}color-scheme:dark}
${BASE}${{ a: A_CSS, b: B_CSS, c: C_CSS, d: D_CSS, e: E_CSS, f: F_CSS, g: G_CSS, h: H_CSS, i: I_CSS }[dir]}
</style></head><body>
${(CUR = dir, '')}${sprite(w)}
<button class="themebtn" onclick="var h=document.documentElement;h.dataset.theme=h.dataset.theme==='dark'?'light':'dark'">Chiaro / scuro</button>
<main class="wrap">
 <div class="word"><i>${ic('star', '', true)}</i>${NAME} <span class="tag-be">nome segnaposto (D5)</span></div>
 <h1 class="top-title" style="margin-top:22px">${title}</h1>
 <p style="margin-top:10px;font-size:18px">${sub}</p>
 <section class="sec"><h2 class="label">Palette · contrasti calcolati</h2>${swatches(d, 'light').replace(/^/, '')}<p class="note">Il blocco mostra il tema attivo grazie alle variabili; i valori di contrasto stampati sono quelli del tema <b id="thn"></b>.</p></section>
 <section class="sec"><h2 class="label">Scala tipografica</h2>${typeScale(dir)}</section>
 <section class="sec"><h2 class="label">Bottoni</h2>${buttons(dir)}</section>
 <section class="sec"><h2 class="label">Campo normale e invalido</h2>${fields()}</section>
 <section class="sec"><h2 class="label">Alert</h2>${alerts()}</section>
 <section class="sec"><h2 class="label">Card timbri</h2>${cards(dir)}</section>
 <section class="sec"><h2 class="label">Dialog del premio</h2>${dialog(dir)}</section>
 <section class="sec"><h2 class="label">Coda staff</h2>${queue(dir)}</section>
 <section class="sec"><h2 class="label">Icone</h2>${icons(w)}</section>
</main>
<script>document.getElementById('thn').textContent=document.documentElement.dataset.theme</script>
</body></html>`;
}

// I valori di contrasto nelle campioni dipendono dal tema: generiamo la pagina due volte e scegliamo con CSS.
function build(dir) {
  const d = DIRS[dir];
  let html = page(dir);
  const l = swatches(d, 'light'), da = swatches(d, 'dark');
  html = html.replace(l, `<div data-only="light">${l}</div><div data-only="dark">${da}</div>`);
  html = html.replace('</style>', 'html[data-theme=light] [data-only=dark],html[data-theme=dark] [data-only=light]{display:none}</style>');
  writeFileSync(new URL(`./dir-${dir}.html`, import.meta.url), html);
  console.log('scritto', `dir-${dir}.html`, (html.length / 1024).toFixed(0) + ' KB');
}
for (const x of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) build(x);
