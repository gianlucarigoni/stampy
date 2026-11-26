// sheet.mjs · foglio di contatto: node sheet.mjs <out.png> <png1> <png2> ... (max 3 per riga, 1x)
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../stampy-frontend/package.json'));
const { chromium } = require('playwright');
const [out, ...imgs] = process.argv.slice(2);
const per = Math.min(3, imgs.length);
const rows = Math.ceil(imgs.length / per);
const html = `<body style="margin:0;background:#777;display:grid;grid-template-columns:repeat(${per},390px);gap:8px;padding:8px;width:max-content">${imgs.map(i => `<img src="${pathToFileURL(path.resolve(i)).href}" width="390" height="844">`).join('')}</body>`;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: per * 398 + 8, height: rows * 852 + 8 } });
import('node:fs').then(()=>0); const fs=await import('node:fs'); const tmp=path.resolve(out)+'.html'; fs.writeFileSync(tmp,html); await pg.goto(pathToFileURL(tmp).href); await pg.waitForLoadState('load'); await pg.waitForTimeout(200);
await pg.screenshot({ path: out }); await b.close(); console.log(out);
