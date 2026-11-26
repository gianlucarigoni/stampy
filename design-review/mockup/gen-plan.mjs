// gen-plan.mjs · rigenera context/40-mockup-plan.md e MOCKUP-INDEX.md da plan-data.mjs + <flusso>/validate.json + figma.json
// figma.json: { "<flusso>": { "fileUrl": "...", "batches": [ { "page": "nome pagina", "nodeIds": ["1:2", ...] }, ... ] } }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { META, FLOWS, byFlow } from './plan-data.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJ = (p, d) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d;
const fig = readJ(path.join(here, 'figma.json'), {});
const FILE = 'https://www.figma.com/design/ybKvCdJRM8LbMDbkWRIYRd';
const rows = [];
for (const f of FLOWS) {
  const val = readJ(path.join(here, f, 'validate.json'), null);
  const blocked = readJ(path.join(here, f, 'blocked.json'), []);
  const status = {};
  const order = [];
  for (const m of byFlow(f)) for (const t of ['light', 'dark']) {
    const id = `${m.id}-${t}`; const r = val?.find(x => x.id === id);
    status[id] = !val || !r ? 'da fare' : blocked.includes(id) ? 'bloccato' : r.fail.length ? 'non valido' : 'validato';
    if (status[id] === 'validato') order.push(id);
  }
  const map = {};
  if (fig[f]?.stale) { /* mockup cambiato dopo l'import: nodi Figma obsoleti, non mappati */ }
  (fig[f]?.stale ? [] : (fig[f]?.batches || [])).forEach((b, bi) => b.nodeIds.forEach((nid, k) => { const id = order[bi * 20 + k]; if (id) map[id] = { nid, page: b.page, batch: bi + 1 }; }));
  for (const m of byFlow(f)) for (const t of ['light', 'dark']) {
    const id = `${m.id}-${t}`; let st = status[id]; if (st === 'validato' && map[id]) st = 'importato in Figma'; else if (st === 'validato' && fig[f]?.stale) st = 'validato · Figma da aggiornare (non reimportato)';
    rows.push({ ...m, fid: id, theme: t === 'light' ? 'chiaro' : 'scuro', st, fig: map[id], png: `mockup/${f}/png/${m.id}-${t === 'light' ? 'chiaro' : 'scuro'}.png` });
  }
}
const cnt = (k) => rows.filter(r => r.st === k).length;
const sums = `Frame: ${rows.length} · importati: ${cnt('importato in Figma')} · validati (non importati): ${cnt('validato')} · bloccati: ${cnt('bloccato')} · non validi: ${cnt('non valido')} · da fare: ${cnt('da fare')}`;
const head = '| id frame | sezione | flusso | schermata | stato | tema | screenshot di origine | miglioramenti applicati | richiede backend | stato lavoro |\n|---|---|---|---|---|---|---|---|---|---|';
const plan = `# 40 · Piano dei mockup mobile (390×844, chiaro e scuro)

Generato da \`mockup/gen-plan.mjs\` (dati in \`mockup/plan-data.mjs\`; fonte unica anche per \`MOCKUP-INDEX.md\`). Ultimo aggiornamento: ${new Date().toISOString().slice(0, 10)}.

**${sums}** (massimo ammesso: 140 frame, 20 per importazione Figma).

Perimetro: schermate principali di ogni flusso + «tavole degli stati» (più stati di errore/attesa/focus nello stesso frame: «tavola» nel campo stato). Solo mobile. Ordine: Accesso → Cliente principale → Cliente profilo/storico/elimina → Staff.
«Richiede backend» = l'elemento mostrato dipende da un dato/endpoint che oggi non esiste (nel mockup ha l'etichetta tratteggiata «richiede backend»). Elementi che richiedono solo codice frontend (non solo stile) sono citati nei miglioramenti («codice»).

Sorgenti di ogni flusso: \`mockup/<flusso>/<flusso>.mjs\`; HTML \`mockup/<flusso>/<flusso>.html\`; PNG (ignorati da git) \`mockup/<flusso>/png/\`.

${FLOWS.map(f => `## Flusso \`${f}\`\n\n${head}\n${rows.filter(r => r.flow === f).map(r => `| ${r.fid} | ${r.section} | ${r.flow} | ${r.name} | ${r.state} | ${r.theme} | \`${r.src}\` | ${r.improv} | ${r.backend} | ${r.st} |`).join('\n')}`).join('\n\n')}
`;
fs.writeFileSync(path.join(root, 'context/40-mockup-plan.md'), plan);

const idx = `# Indice dei mockup mobile

Generato da \`mockup/gen-plan.mjs\`. ${sums}.
File Figma «Stampy Mockup v2»: ${FILE}?node-id=1-2 (pagina e nodo per frame sotto; chi apre il link naviga al nodo con \`?node-id=\`).

| id frame | flusso | pagina Figma | nome | stato | tema | schermata d'origine | richiede backend | nuovo rispetto all'app | link Figma |
|---|---|---|---|---|---|---|---|---|---|
${rows.map(r => `| ${r.fid} | ${r.flow} | ${r.fig?.page || '—'} | ${r.name} | ${r.state} | ${r.theme} | \`${r.src.split(',')[0]}\` | ${r.backend} | ${r.isNew} | ${r.fig ? `[${r.fig.nid}](${FILE}?node-id=${r.fig.nid.replace(':', '-')})` : '—'} |`).join('\n')}
`;
fs.writeFileSync(path.join(root, 'MOCKUP-INDEX.md'), idx);
console.log(sums);
