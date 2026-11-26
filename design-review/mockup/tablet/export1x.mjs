// export1x.mjs · PNG a scala 1 (820 px = dimensione reale in Figma), ordinati e nominati per il trascinamento manuale -> tablet/drag/
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';
const lib = path.dirname(fileURLToPath(import.meta.url)); const TARGET = process.env.TARGET || 'tablet'; const here = path.join(lib, '..', TARGET);
const require = createRequire(path.resolve(lib, '../../../stampy-frontend/package.json')); const { chromium } = require('playwright');
const out = path.join(here, 'drag'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const b = await chromium.launch(); let n = 0;
for (const flow of ['accesso', 'cliente', 'staff']) {
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1300 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(pathToFileURL(path.join(here, flow, flow + '.html')).href); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const loc = p.locator('.frame'); const c = await loc.count();
  for (let i = 0; i < c; i++) { const name = await loc.nth(i).getAttribute('data-name'); n++; await loc.nth(i).screenshot({ path: path.join(out, `${String(n).padStart(2, '0')} ${name.replace(/[\/:·]/g, '-').replace(/\s+/g, ' ')}.png`) }); }
}
await b.close(); console.log(n, 'png in', out);
