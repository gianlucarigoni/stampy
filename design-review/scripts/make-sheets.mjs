// Fogli di contatto: node design-review/scripts/make-sheets.mjs <sezione/ruolo> [per-foglio]
// Usa Playwright del frontend (nessuna installazione). Chiaro e scuro affiancati.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(path.resolve('stampy-frontend/package.json'));
const { chromium } = require('playwright');
const dir = process.argv[2] ?? 'accesso/anonimo';
const per = Number(process.argv[3] ?? 3);
const src = path.resolve('design-review/screens', dir);
const out = path.resolve('design-review/screens/_sheets', dir.split('/')[0]);
fs.mkdirSync(out, { recursive: true });
const names = [...new Set(fs.readdirSync(src).filter(f => f.endsWith('__light.png')).map(f => f.replace('__light.png','')))].sort();
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1900, height: 900 } });
const W = 290;
for (let i = 0, n = 1; i < names.length; i += per, n++) {
  const group = names.slice(i, i + per);
  const html = `<body style="margin:0;background:#888;font:12px monospace;color:#000"><div style="display:flex;gap:18px;padding:8px">` +
    group.map(nm => `<div><div style="background:#ff0;padding:2px">${nm}</div><div style="display:flex;gap:4px">` +
      ['light','dark'].map(t => `<img width="${W}" src="file://${src}/${nm}__${t}.png">`).join('') + `</div></div>`).join('') + `</div></body>`;
  const hf = path.join(out, '_tmp.html'); fs.writeFileSync(hf, html); await p.goto('file://' + hf);
  const f = path.join(out, `sheet-${String(n).padStart(2,'0')}.png`);
  await p.screenshot({ path: f, fullPage: true });
  console.log(f, group.join(', '));
}
fs.rmSync(path.join(out,'_tmp.html'),{force:true}); await b.close();
