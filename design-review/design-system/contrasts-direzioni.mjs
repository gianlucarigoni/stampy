// Contrasti WCAG delle due direzioni (stessa formula di ../scripts/contrasts.mjs). Uso: node contrasts-direzioni.mjs [--md]
import { A, B, C, D, E, F, G, H, I, D1 } from './palettes.mjs';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const cr = (a, b) => { const [x, y] = [Lum(hex(a)), Lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Ogni riga: [etichetta, fg, bg, soglia]
export function rows(dir, theme) {
  const t = dir[theme];
  const r = [];
  const add = (n, fg, bg, min) => r.push({ n, fg, bg, min, v: cr(fg, bg) });
  add('testo su sfondo pagina', t.text, t.bg, 4.5);
  add('testo su card', t.text, t.surface, 4.5);
  add('testo secondario su sfondo', t.text2, t.bg, 4.5);
  add('testo secondario su card', t.text2, t.surface, 4.5);
  add('link su sfondo', t.link, t.bg, 4.5);
  add('link su card', t.link, t.surface, 4.5);
  add('bordo campo su card (UI)', t.field, t.surface, 3);
  add('bordo campo su sfondo (UI)', t.field, t.bg, 3);
  add('anello di focus su sfondo (UI)', t.ring, t.bg, 3);
  add('anello di focus su card (UI)', t.ring, t.surface, 3);
  add('card: bordo su sfondo (decorativo)', t.border, t.bg, 0);
  for (const k of ['a', 'b', 'c']) {
    const p = D1[k][theme];
    add(`D1-${k} testo bottone primario`, p.fg, p.fill, 4.5);
    add(`D1-${k} bottone primario vs sfondo (UI)`, p.fill, t.bg, 3);
  }
  add('danger: testo su card', t.danger.text, t.surface, 4.5);
  add('danger: testo bottone su fondo', t.danger.fg, t.danger.fill, 4.5);
  add('danger: fondo bottone vs card (UI)', t.danger.fill, t.surface, 3);
  add('alert danger: testo su tinta', t.danger.tintText, t.danger.tint, 4.5);
  add('success: testo su card', t.success.text, t.surface, 4.5);
  add('alert success: testo su tinta', t.success.tintText, t.success.tint, 4.5);
  add('alert warning: testo su tinta', t.warning.tintText, t.warning.tint, 4.5);
  add('alert info: testo su tinta', t.info.tintText, t.info.tint, 4.5);
  add('premio: testo su fondo pieno', t.premio.fg, t.premio.fill, 4.5);
  add('premio: fondo pieno vs card (UI)', t.premio.fill, t.surface, 3);
  add('premio: testo su tinta', t.premio.tintText, t.premio.tint, 4.5);
  add('timbro pieno vs card (UI)', t.stampFilled, t.surface, 3);
  add('timbro vuoto (anello campo) vs card (UI)', t.field, t.surface, 3);
  return r;
}

if (process.argv[1].endsWith('contrasts-direzioni.mjs')) {
  const md = process.argv.includes('--md');
  for (const dir of [A, B, C, D, E, F, G, H, I]) for (const th of ['light', 'dark']) {
    console.log(`\n== Direzione ${dir.id.toUpperCase()} · ${dir.name} · ${th} ==`);
    for (const x of rows(dir, th)) {
      const ok = x.min === 0 ? ' ' : x.v >= x.min ? '✅' : '❌';
      console.log(`${ok} ${x.n.padEnd(46)} ${x.fg} su ${x.bg}  ${x.v.toFixed(2)}:1  ${x.min ? `(min ${x.min})` : ''}`);
    }
  }
  void md;
}
