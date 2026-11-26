// run.mjs (tablet) · build + PNG scala 2 + validate + file d'importazione. Uso: node tablet/run.mjs <flusso> [--import]
// <flusso> = accesso | cliente | staff. Scrive tablet/<flusso>/<flusso>.html, png/, validate.json, import/<flusso>-N.html (max 20 frame, solo validi e non bloccati).
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path'; import fs from 'node:fs';
import { fontCss, css } from '../lib/lib.mjs';
import { frameT } from './lib-t.mjs';
import { inPage, urlEsterni } from '../validate.mjs';
const lib = path.dirname(fileURLToPath(import.meta.url)); const TARGET = process.env.TARGET || 'tablet'; const here = path.join(lib, '..', TARGET);
const flow = process.argv[2]; if (!flow) { console.error('uso: node run.mjs <flusso> [--import]'); process.exit(1); }
const dir = path.join(here, flow); fs.mkdirSync(dir, { recursive: true });
const { screens } = await import(pathToFileURL(path.join(here, flow + '.mjs')).href);
const extra = `.btn.focus-ring-p{outline:3px solid var(--prize-fg);outline-offset:3px}`;
const page = (title, body) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${fontCss}${css()}${extra}</style></head><body>${body}</body></html>`;
const one = (s, t) => { const r = s.render(t); return frameT(s, t, r.inner, r.clip || TARGET === 'desktop'); };
const items = screens.flatMap(s => ['light', 'dark'].map(t => ({ s, t, id: `${s.id}-${t}`, html: one(s, t) })));
const html = page('Mockup tablet · ' + flow, items.map(i => i.html).join('\n'));
fs.writeFileSync(path.join(dir, flow + '.html'), html);
const ext = urlEsterni(html);
console.log(`${flow}.html ${(html.length / 1024).toFixed(0)} kB · frame ${items.length} · URL esterni: ${ext}`);
const require = createRequire(path.resolve(lib, '../../../stampy-frontend/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const pg = await (await browser.newContext({ viewport: { width: 1600, height: 1300 }, deviceScaleFactor: 2 })).newPage();
await pg.goto(pathToFileURL(path.join(dir, flow + '.html')).href);
await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
fs.mkdirSync(path.join(dir, 'png'), { recursive: true });
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const loc = pg.locator('.frame'); const n = await loc.count();
for (let i = 0; i < n; i++) { const id = await loc.nth(i).getAttribute('id'); if (only && !only.some(o => id.startsWith(o))) continue; await loc.nth(i).screenshot({ path: path.join(dir, 'png', id.replace(/-light$/, '-chiaro').replace(/-dark$/, '-scuro') + '.png') }); }
const res = await pg.evaluate(inPage); await browser.close();
const blocked = fs.existsSync(path.join(dir, 'blocked.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'blocked.json'), 'utf8')) : [];
let ko = 0; for (const r of res) if (r.fail.length) { ko++; console.log(`✗ ${r.id}: ${r.fail.slice(0, 4).join(' | ')}`); }
console.log(`validate: ${res.length - ko}/${res.length} ok · contrasto minimo ${Math.min(...res.map(r => r.minContrast))} · target ${res.reduce((a, r) => a + r.targets, 0)}${ext ? ' · URL ESTERNI!' : ''}`);
fs.writeFileSync(path.join(dir, 'validate.json'), JSON.stringify(res, null, 1));
if (process.argv.includes('--import')) {
  const ok = new Set(res.filter(r => !r.fail.length && !blocked.includes(r.id)).map(r => r.id));
  fs.mkdirSync(path.join(dir, 'import'), { recursive: true }); for (const f of fs.readdirSync(path.join(dir, 'import'))) fs.unlinkSync(path.join(dir, 'import', f));
  const ordered = items.filter(i => ok.has(i.id));
  for (let i = 0, b = 1; i < ordered.length; i += 20, b++) { fs.writeFileSync(path.join(dir, 'import', `${flow}-${b}.html`), page(`Tablet ${flow} ${b}`, ordered.slice(i, i + 20).map(x => x.html).join('\n'))); console.log(`import/${flow}-${b}.html: ${Math.min(20, ordered.length - i)} frame`); }
}
process.exit(ext ? 2 : 0);
