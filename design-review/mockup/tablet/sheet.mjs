// sheet.mjs (tablet) · foglio di contatto di un flusso: node tablet/sheet.mjs <flusso> [scala] [filtro-id,...] -> <flusso>/foglio.png
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';
const lib = path.dirname(fileURLToPath(import.meta.url)); const TARGET = process.env.TARGET || 'tablet'; const here = path.join(lib, '..', TARGET);
const require = createRequire(path.resolve(lib, '../../../stampy-frontend/package.json')); const { chromium } = require('playwright');
const flow = process.argv[2]; const k = +(process.argv[3] || .32); const only = process.argv[4]?.split(',');
const pngs = fs.readdirSync(path.join(here, flow, 'png')).filter(f => f.endsWith('.png') && (!only || only.some(o => f.startsWith(o + '-')))).sort();
const html = `<body style="margin:0;padding:16px;background:#6b645c;font:600 13px Arial;color:#fff;width:1500px;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">${pngs.map(f => `<figure style="margin:0"><img src="png/${f}" style="display:block;width:${Math.round((TARGET === 'desktop' ? 1440 : f.startsWith('Q01h') ? 1180 : 820) * k)}px"><figcaption>${f}</figcaption></figure>`).join('')}</body>`;
const hp = path.join(here, flow, 'foglio.html'); fs.writeFileSync(hp, html);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1530, height: 800 } }); await p.goto(pathToFileURL(hp).href); await p.waitForTimeout(500);
await p.screenshot({ path: path.join(here, flow, 'foglio.png'), fullPage: true }); await b.close(); console.log(pngs.length + ' png');
