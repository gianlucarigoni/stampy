// record.mjs <flusso> <lotto> <file-risposta.json> : abbina i nodeIds ai frame importati (stesso ordine dell'import) -> status.json
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const [flow, batch, resp] = process.argv.slice(2);
const html = fs.readFileSync(path.join(here, flow, 'import', `${flow}-${batch}.html`), 'utf8');
const ids = [...html.matchAll(/<section class="frame[^"]*" id="([^"]+)"/g)].map(m => m[1]);
const nodes = JSON.parse(fs.readFileSync(path.join(here, flow, resp), 'utf8')).nodeIds;
if (ids.length !== nodes.length) { console.error('lunghezze diverse', ids.length, nodes.length); process.exit(1); }
const sp = path.join(here, 'status.json'); const st = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, 'utf8')) : {};
ids.forEach((id, i) => st[id] = { stato: 'importato', node: nodes[i] });
fs.writeFileSync(sp, JSON.stringify(st, null, 1)); console.log(ids.length, 'registrati');
