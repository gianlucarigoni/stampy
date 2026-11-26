// run.mjs · build + render + validate di un flusso.
// Uso: node run.mjs <flusso> [--import]
//  - legge <flusso>/<flusso>.mjs (export const screens), scrive <flusso>/<flusso>.html
//  - PNG a scala 2 in <flusso>/png/<id>-<chiaro|scuro>.png (ignorati da git)
//  - valida ogni frame (validate.mjs); scrive <flusso>/validate.json
//  - con --import: scrive <flusso>/import/<flusso>-N.html con SOLO i frame validi e non bloccati, max 20 frame per file
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { frameHtml, pageHtml } from './lib/lib.mjs';
import { inPage, urlEsterni } from './validate.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const flow = process.argv[2];
if (!flow) { console.error('uso: node run.mjs <flusso> [--import]'); process.exit(1); }
const dir = path.join(here, flow);
const { screens } = await import(pathToFileURL(path.join(dir, flow + '.mjs')).href);
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const frames = screens.flatMap(s => ['light', 'dark'].map(t => frameHtml(s, t))).join('\n');
const html = pageHtml('Mockup mobile · ' + flow, frames);
fs.writeFileSync(path.join(dir, flow + '.html'), html);
const ext = urlEsterni(html);
console.log(`${flow}.html ${(html.length / 1024).toFixed(0)} kB · frame ${screens.length * 2} · URL esterni: ${ext}`);

const require = createRequire(path.resolve(here, '../../stampy-frontend/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 500, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.goto(pathToFileURL(path.join(dir, flow + '.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
fs.mkdirSync(path.join(dir, 'png'), { recursive: true });
const loc = page.locator('.frame');
const n = await loc.count();
for (let i = 0; i < n; i++) {
  const id = await loc.nth(i).getAttribute('id');
  if (only && !only.some(o => id.startsWith(o))) continue;
  await loc.nth(i).screenshot({ path: path.join(dir, 'png', id.replace(/-light$/, '-chiaro').replace(/-dark$/, '-scuro') + '.png') });
}
const res = await page.evaluate(inPage);
await browser.close();
const blocked = fs.existsSync(path.join(dir, 'blocked.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'blocked.json'), 'utf8')) : [];
let ko = 0;
for (const r of res) {
  if (r.fail.length) { ko++; console.log(`✗ ${r.id}: ${r.fail.slice(0, 4).join(' | ')}`); }
}
console.log(`validate: ${res.length - ko}/${res.length} frame ok · contrasto minimo ${Math.min(...res.map(r => r.minContrast))} · target ${res.reduce((a, r) => a + r.targets, 0)}${ext ? ' · URL ESTERNI!' : ''}`);
fs.writeFileSync(path.join(dir, 'validate.json'), JSON.stringify(res, null, 1));

if (process.argv.includes('--import')) {
  const okIds = new Set(res.filter(r => !r.fail.length && !blocked.includes(r.id)).map(r => r.id));
  fs.mkdirSync(path.join(dir, 'import'), { recursive: true });
  for (const f of fs.readdirSync(path.join(dir, 'import'))) fs.unlinkSync(path.join(dir, 'import', f));
  const ordered = screens.flatMap(s => ['light', 'dark'].map(t => ({ id: `${s.id}-${t}`, s, t }))).filter(x => okIds.has(x.id));
  for (let i = 0, b = 1; i < ordered.length; i += 20, b++) {
    const chunk = ordered.slice(i, i + 20).map(x => frameHtml(x.s, x.t)).join('\n');
    fs.writeFileSync(path.join(dir, 'import', `${flow}-${b}.html`), pageHtml(`Mockup ${flow} ${b}`, chunk));
    console.log(`import/${flow}-${b}.html: ${Math.min(20, ordered.length - i)} frame`);
  }
}
process.exit(ext ? 2 : 0);
