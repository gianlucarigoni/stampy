// figma-rec.mjs <flusso> <paginaFigma> <nodeId,nodeId,...>  → aggiunge un batch a figma.json
import fs from 'node:fs';
const [flow, page, ids] = process.argv.slice(2);
const f = fs.existsSync('figma.json') ? JSON.parse(fs.readFileSync('figma.json', 'utf8')) : {};
(f[flow] ||= { batches: [] }).batches.push({ page, nodeIds: ids.split(',') });
fs.writeFileSync('figma.json', JSON.stringify(f, null, 1));
