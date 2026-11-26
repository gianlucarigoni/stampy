// sheet.mjs · fogli di contatto: foglio-tablet.png, foglio-desktop.png (gruppi per confronto a/b), foglio-contatto.html
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../stampy-frontend/package.json')); const { chromium } = require('playwright');
const G = {
  tablet: { w: 820, h: 1180, k: .3, groups: [
    ['Login', ['tablet-login-chiaro']], ['Card timbri', ['tablet-card-chiaro']], ['Dialog del premio: a modale · b foglio', ['tablet-dialog-a-chiaro', 'tablet-dialog-b-chiaro']],
    ['Coda: a coda+dettaglio · b griglia (+ scuro di a)', ['tablet-coda-a-chiaro', 'tablet-coda-b-chiaro', 'tablet-coda-a-scuro']], ['Storico: a righe per giorno · b tabella', ['tablet-storico-a-chiaro', 'tablet-storico-b-chiaro']]] },
  desktop: { w: 1440, h: 900, k: .3, groups: [
    ['Login: a centrato · b diviso', ['desktop-login-a-chiaro', 'desktop-login-b-chiaro']], ['Card timbri: a colonna · b due colonne', ['desktop-card-a-chiaro', 'desktop-card-b-chiaro']],
    ['Dialog del premio (modale centrata)', ['desktop-dialog-chiaro']], ['Coda: a coda+dettaglio · b griglia (+ scuro di a)', ['desktop-coda-a-chiaro', 'desktop-coda-b-chiaro', 'desktop-coda-a-scuro']],
    ['Coda a 1180×820 (tablet orizzontale): a · b', ['orizz-coda-a-chiaro', 'orizz-coda-b-chiaro']], ['Storico: a righe per giorno · b tabella', ['desktop-storico-a-chiaro', 'desktop-storico-b-chiaro']], ['Stati del puntatore', ['desktop-puntatore-chiaro']]] },
};
const b = await chromium.launch(); const out = [];
for (const [vp, g] of Object.entries(G)) {
  const html = `<body style="margin:0;padding:20px;background:#6b645c;font:600 15px Arial;color:#fff;width:${vp === 'tablet' ? 1500 : 1500}px">${g.groups.map(([t, ims]) => `<div style="margin-bottom:22px"><div style="margin-bottom:6px">${t}</div><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">${ims.map(i => {
    const [w, h] = i.startsWith('orizz') ? [1180, 820] : [g.w, g.h]; const k = vp === 'tablet' ? .3 : (i.includes('puntatore') ? .4 : .3);
    return `<figure style="margin:0"><img src="png/${i}.png" width="${Math.round((i.includes('puntatore') ? 1440 : w) * k)}" style="display:block"><figcaption style="font-size:12px;opacity:.8">${i}</figcaption></figure>`; }).join('')}</div></div>`).join('')}</body>`;
  fs.writeFileSync(path.join(here, `foglio-${vp}.html`), html);
  const p = await b.newPage({ viewport: { width: 1540, height: 800 } }); await p.goto(pathToFileURL(path.join(here, `foglio-${vp}.html`)).href); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(here, `foglio-${vp}.png`), fullPage: true }); out.push(vp);
}
await b.close(); console.log(out.join(' '));
