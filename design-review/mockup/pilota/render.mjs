// Renderizza un PNG per .frame (scala 2) e fa le verifiche automatiche.
// Uso: node render.mjs [--check]   (usa Playwright del frontend)
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../stampy-frontend/package.json'));
const { chromium } = require('playwright');
const names = ['1-cliente-timbri-chiaro', '2-cliente-timbri-scuro', '3-cliente-premio-chiaro', '4-cliente-premio-scuro', '5-staff-coda-chiaro', '6-staff-coda-scuro'];
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 500, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.goto(pathToFileURL(path.join(here, 'pilota.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const frames = page.locator('.frame');
const n = await frames.count();
fs.mkdirSync(path.join(here, 'png'), { recursive: true });
for (let i = 0; i < n; i++) await frames.nth(i).screenshot({ path: path.join(here, 'png', names[i] + '.png') });
console.log('frame:', n, '| scrollWidth', await page.evaluate(() => document.documentElement.scrollWidth));

const res = await page.evaluate(() => {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a === 1) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const c of chain.reverse()) acc = over(c, acc); return acc; };
  const out = [];
  for (const fr of document.querySelectorAll('.frame')) {
    const rec = { id: fr.id, contrasts: [], small: [], targets: [] };
    const under = fr.querySelector('.underlay');
    const walker = document.createTreeWalker(fr, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement; if (!t.textContent.trim() || seen.has(el)) continue; seen.add(el);
      if (under && under.contains(el)) continue; // testo sotto lo scrim: dimmato, non letto
      const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
      const fg = over(parse(cs.color), bgOf(el)); const bg = bgOf(el); const r = cr(fg, bg);
      const large = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
      rec.contrasts.push({ t: t.textContent.trim().slice(0, 28), fs, r: +r.toFixed(2), need: large ? 3 : 4.5, ok: r >= (large ? 3 : 4.5) });
      if (fs < 13) rec.small.push({ t: t.textContent.trim().slice(0, 28), fs });
    }
    for (const el of fr.querySelectorAll('[data-tap]')) {
      if (under && under.contains(el)) continue;
      const b = el.getBoundingClientRect(); rec.targets.push({ t: (el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 24), w: +b.width.toFixed(1), h: +b.height.toFixed(1), need: +el.dataset.h || 44 });
    }
    // distanza Conferma -> Rifiuta
    const c = fr.querySelector('.conf-btn'), r = fr.querySelector('.rif-btn');
    if (c && r) rec.gap = +(r.getBoundingClientRect().top - c.getBoundingClientRect().bottom).toFixed(1);
    const dlg = fr.querySelector('.prizebox'); if (dlg) { const b = dlg.getBoundingClientRect(), f = fr.getBoundingClientRect(); rec.dlg = { w: +b.width.toFixed(1), top: +(b.top - f.top).toFixed(1), bottom: +(f.bottom - b.bottom).toFixed(1) }; }
    const ci = fr.querySelectorAll('.card, .req'); rec.cards = [...ci].map(e => { const b = e.getBoundingClientRect(), f = fr.getBoundingClientRect(); return { cls: e.className, top: +(b.top - f.top).toFixed(0), bottom: +(b.bottom - f.top).toFixed(0) }; });
    out.push(rec);
  }
  return out;
});
await browser.close();
if (process.argv.includes('--check')) {
  for (const r of res) {
    const bad = r.contrasts.filter(c => !c.ok), tmin = r.targets.filter(t => t.w < 44 || t.h < t.need);
    console.log(`\n== ${r.id}: contrasti ${r.contrasts.length} (min ${Math.min(...r.contrasts.map(c => c.r))}), sotto soglia: ${bad.length}; testo <13px: ${r.small.length}; target ${r.targets.length}, fuori misura: ${tmin.length}; gap Conferma→Rifiuta: ${r.gap ?? '-'}`);
    bad.forEach(c => console.log('  CONTRASTO', JSON.stringify(c)));
    r.small.forEach(c => console.log('  PICCOLO', JSON.stringify(c)));
    tmin.forEach(c => console.log('  TARGET', JSON.stringify(c)));
    if (r.dlg) console.log('  dialog', JSON.stringify(r.dlg));
    console.log('  card', JSON.stringify(r.cards));
  }
  fs.writeFileSync(path.join(here, 'checks.json'), JSON.stringify(res, null, 1));
}
