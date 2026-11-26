// Esporta le anteprime in PNG (390 px, scala 2). Uso: node export-png.mjs   (usa Playwright del frontend)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../stampy-frontend/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
for (const dir of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(here, `dir-${dir}.html`)).href + `?theme=${theme}&shot=1`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1900); // fine animazioni (coriandoli 1,5 s)
  const out = path.join(here, `dir-${dir}-${theme}.png`);
  await page.screenshot({ path: out, fullPage: true });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(path.basename(out), 'scrollWidth', sw);
  await ctx.close();
}
await browser.close();
