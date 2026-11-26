// Contrasti WCAG 2.x del design system (chat 10, direzione I «Ibrido»).
// Fonte dei valori: palettes.mjs (export I) = valori estratti da dir-i.html; più i token NUOVI di questa chat (marcati `new`).
// Uso: node contrasts-21.mjs            -> stampa tutto
//      node contrasts-21.mjs --md       -> stampa le tabelle in Markdown (usate in 21-design-system.md)
//      node contrasts-21.mjs --tokens   -> stampa i token (tabella ruoli) in Markdown
import { I, D1 } from './palettes.mjs';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const cr = (a, b) => { const [x, y] = [Lum(hex(a)), Lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// colore `fg` con alpha `a` sopra `bg` -> hex
const over = (fg, a, bg) => '#' + hex(fg).map((c, i) => Math.round(c * a + hex(bg)[i] * (1 - a)).toString(16).padStart(2, '0')).join('');

// ---------- token (ruoli semantici) ----------
// Tutto ciò che non è `new` viene da dir-i.html (palettes.mjs · I). `new` = scelto in questa chat e calcolato qui.
export const T = {
  light: {
    bg: I.light.bg, surface: I.light.surface, surface2: I.light.surface2,
    text: I.light.text, text2: I.light.text2, border: I.light.border, field: I.light.field,
    link: I.light.link, ring: I.light.ring,
    brand: '#f16417', brandDeep: '#c2410c',
    action: { fill: D1.a.light.fill, fg: D1.a.light.fg, bd: '#9a3412', hover: '#f7782f' /*new*/, pressed: '#db5a11' /*new*/ },
    danger: { ...I.light.danger, pressed: '#8f1d17' /*new*/, hover: '#9d2019' /*new*/ },
    ok: I.light.success, warn: I.light.warning, info: I.light.info,
    warnBd: I.light.warning.tintText, infoBd: I.light.info.tintText,
    prize: { ...I.light.premio, bd: '#2b1408', pressed: '#e34a8f' /*new*/ },
    stamp: I.light.stampFilled, stampInk: I.light.stampInk,
    ringOnPrize: '#2b1408' /*new*/,
    scrim: { rgb: '#0a0603', a: 0.72 } /*new: .72 invece di .62 di dir-i*/,
    skeleton: '#dfe5d2',
  },
  dark: {
    bg: I.dark.bg, surface: I.dark.surface, surface2: I.dark.surface2,
    text: I.dark.text, text2: I.dark.text2, border: I.dark.border, field: I.dark.field,
    link: I.dark.link, ring: I.dark.ring,
    brand: '#f16417', brandDeep: '#c2410c',
    action: { fill: D1.a.dark.fill, fg: D1.a.dark.fg, bd: 'transparent', hover: '#f87a35' /*new*/, pressed: '#db5a11' /*new*/ },
    danger: { ...I.dark.danger, pressed: '#f06f63' /*new*/, hover: '#ff9f96' /*new*/ },
    ok: I.dark.success, warn: I.dark.warning, info: I.dark.info,
    warnBd: I.dark.warning.tintText, infoBd: I.dark.info.tintText,
    prize: { ...I.dark.premio, bd: 'transparent', pressed: '#f0488f' /*new*/ },
    stamp: I.dark.stampFilled, stampInk: I.dark.stampInk,
    ringOnPrize: '#2b1408' /*new*/,
    scrim: { rgb: '#0a0603', a: 0.72 } /*new: .72 invece di .62 di dir-i*/,
    skeleton: '#31261e',
  },
};

export function rows(theme) {
  const t = T[theme];
  const r = [];
  const add = (grp, n, fg, bg, min, waive) => r.push({ grp, n, fg, bg, min, waive, v: cr(fg, bg) });
  // Testo
  add('Testo', 'testo su sfondo pagina', t.text, t.bg, 4.5);
  add('Testo', 'testo su card', t.text, t.surface, 4.5);
  add('Testo', 'testo su piano (surface2)', t.text, t.surface2, 4.5);
  add('Testo', 'testo secondario su sfondo', t.text2, t.bg, 4.5);
  add('Testo', 'testo secondario su card', t.text2, t.surface, 4.5);
  add('Testo', 'testo secondario su piano (surface2)', t.text2, t.surface2, 4.5);
  add('Testo', 'link su sfondo', t.link, t.bg, 4.5);
  add('Testo', 'link su card', t.link, t.surface, 4.5);
  add('Testo', 'link su piano (surface2)', t.link, t.surface2, 4.5);
  // Azione (D1-a)
  add('Azione', 'testo del primario (riposo) su fondo', t.action.fg, t.action.fill, 4.5);
  add('Azione', 'testo del primario (hover) su fondo', t.action.fg, t.action.hover, 4.5);
  add('Azione', 'testo del primario (premuto) su fondo', t.action.fg, t.action.pressed, 4.5);
  add('Azione', 'fondo primario vs sfondo pagina (UI)', t.action.fill, t.bg, 3, 'bordo 1,5 px #9a3412 (riga sotto)');
  add('Azione', 'fondo primario vs card (UI)', t.action.fill, t.surface, 3);
  if (t.action.bd !== 'transparent') {
    add('Azione', 'bordo del primario vs sfondo pagina (UI)', t.action.bd, t.bg, 3);
    add('Azione', 'bordo del primario vs card (UI)', t.action.bd, t.surface, 3);
    add('Azione', 'bordo del primario vs fondo primario', t.action.bd, t.action.fill, 1);
  }
  add('Azione', 'secondario: bordo vs card (UI)', t.field, t.surface, 3);
  add('Azione', 'secondario: bordo vs sfondo (UI)', t.field, t.bg, 3);
  add('Azione', 'secondario premuto: testo su surface2', t.text, t.surface2, 4.5);
  // Focus
  add('Focus', 'anello di focus su sfondo (UI)', t.ring, t.bg, 3);
  add('Focus', 'anello di focus su card (UI)', t.ring, t.surface, 3);
  add('Focus', 'anello di focus su piano surface2 (UI)', t.ring, t.surface2, 3);
  add('Focus', 'anello di focus su tinta «ok» (barra annulla) (UI)', t.ring, t.ok.tint, 3);
  add('Focus', 'anello di focus su tinta «avviso» (UI)', t.ring, t.warn.tint, 3);
  add('Focus', 'anello di focus su tinta «pericolo» (UI)', t.ring, t.danger.tint, 3);
  add('Focus', 'anello di focus (blu) su fondo premio (dialog) (UI)', t.ring, t.prize.fill, 3, 'nel dialog rosa si usa `ringOnPrize` (riga sotto)');
  add('Focus', 'anello `ringOnPrize` su fondo premio (dialog) (UI)', t.ringOnPrize, t.prize.fill, 3);
  // Campi
  add('Campi', 'bordo campo vs card (UI)', t.field, t.surface, 3);
  add('Campi', 'bordo campo vs sfondo (UI)', t.field, t.bg, 3);
  add('Campi', 'bordo campo vs piano surface2 (UI)', t.field, t.surface2, 3);
  add('Campi', 'segnaposto/suggerimento (text2) su card', t.text2, t.surface, 4.5);
  add('Campi', 'campo invalido: bordo/icona danger vs card (UI)', t.danger.text, t.surface, 3);
  add('Campi', 'messaggio d’errore (danger) su card', t.danger.text, t.surface, 4.5);
  add('Campi', 'messaggio d’errore (danger) su sfondo', t.danger.text, t.bg, 4.5);
  // Pericolo
  add('Pericolo', 'testo del bottone pericolo su fondo', t.danger.fg, t.danger.fill, 4.5);
  add('Pericolo', 'testo del bottone pericolo (hover)', t.danger.fg, t.danger.hover, 4.5);
  add('Pericolo', 'testo del bottone pericolo (premuto)', t.danger.fg, t.danger.pressed, 4.5);
  add('Pericolo', 'fondo bottone pericolo vs card (UI)', t.danger.fill, t.surface, 3);
  add('Pericolo', '«Rifiuta» outline: testo/bordo danger su card', t.danger.text, t.surface, 4.5);
  add('Pericolo', '«Rifiuta» outline premuto: testo su tinta pericolo', t.danger.tintText, t.danger.tint, 4.5);
  // Alert e stati
  add('Alert', 'alert pericolo: testo su tinta', t.danger.tintText, t.danger.tint, 4.5);
  add('Alert', 'alert pericolo: bordo vs sfondo (UI)', t.danger.text, t.bg, 3);
  add('Alert', 'alert successo: testo su tinta', t.ok.tintText, t.ok.tint, 4.5);
  add('Alert', 'alert successo: bordo vs sfondo (UI)', t.ok.text, t.bg, 3);
  add('Alert', 'alert avviso: testo su tinta', t.warn.tintText, t.warn.tint, 4.5);
  add('Alert', 'alert avviso: bordo vs sfondo (UI)', t.warnBd, t.bg, 3);
  add('Alert', 'alert info: testo su tinta', t.info.tintText, t.info.tint, 4.5);
  add('Alert', 'alert info: bordo vs sfondo (UI)', t.infoBd, t.bg, 3);
  add('Alert', 'testo «successo» su card', t.ok.text, t.surface, 4.5);
  add('Alert', 'barra a tempo «annulla» (ok) su tinta ok (UI)', t.ok.text, t.ok.tint, 3);
  // Premio
  add('Premio', 'testo scuro su fondo premio', t.prize.fg, t.prize.fill, 4.5);
  add('Premio', 'testo scuro su fondo premio (premuto)', t.prize.fg, t.prize.pressed, 4.5);
  add('Premio', 'fondo premio vs card (UI, senza bordo)', t.prize.fill, t.surface, 3, 'bordo inchiostro 2 px (riga sotto)');
  if (t.prize.bd !== 'transparent') add('Premio', 'bordo premio (inchiostro) vs card (UI)', t.prize.bd, t.surface, 3);
  add('Premio', 'bordo/testo inchiostro su fondo premio', t.prize.bd === 'transparent' ? t.prize.fg : t.prize.bd, t.prize.fill, 4.5);
  add('Premio', 'testo premio su tinta premio (alert)', t.prize.tintText, t.prize.tint, 4.5);
  add('Premio', 'dialog rosa: chip/alert (rosa su inchiostro)', t.prize.fill, t.prize.fg, 4.5);
  add('Premio', 'premio vs arancione brand (distinzione, non è un minimo)', t.prize.fill, t.brand, 1);
  // Timbri
  add('Timbri', 'timbro pieno vs card (UI)', t.stamp, t.surface, 3);
  add('Timbri', 'stella (inchiostro) su timbro pieno (UI)', t.stampInk, t.stamp, 3);
  add('Timbri', 'timbro vuoto (profilo tratteggiato) vs card (UI)', t.field, t.surface, 3);
  add('Timbri', 'timbro pieno vs piano surface2 (UI)', t.stamp, t.surface2, 3, 'regola: i timbri stanno sempre sulla card (surface), mai sul piano');
  // Dialog / scrim
  const scrimBg = over(t.scrim.rgb, t.scrim.a, t.bg);
  add('Dialog', `dialog (card) vs pagina oscurata (scrim → ${scrimBg}) (UI)`, t.surface, scrimBg, 3, theme === 'dark' ? 'in scuro regge il bordo `field` (riga sotto)' : undefined);
  add('Dialog', 'bordo dialog (chiaro: `border`; scuro: `field`) vs scrim (UI)', theme === 'dark' ? t.field : t.border, scrimBg, 3);
  add('Dialog', 'dialog del premio (rosa) vs scrim (UI)', t.prize.fill, scrimBg, 3, undefined);
  add('Dialog', 'bordo inchiostro del dialog del premio vs scrim (UI)', t.prize.fg, scrimBg, 3, 'non serve: il rosa regge da solo (riga sopra)');
  // Chip e stato
  add('Chip', 'chip neutro: testo su surface2', t.text, t.surface2, 4.5);
  add('Chip', 'chip neutro: bordo `field` vs card (UI)', t.field, t.surface, 3);
  add('Chip', 'chip avviso («scade tra 4 min»): testo su tinta', t.warn.tintText, t.warn.tint, 4.5);
  add('Chip', 'chip premio: testo inchiostro su rosa', t.prize.fg, t.prize.fill, 4.5);
  // Decorativo
  add('Decorativo', 'bordo card `border` vs sfondo (decorativo, non richiesto)', t.border, t.bg, 0);
  add('Decorativo', 'scheletro (surface2) vs card (decorativo)', t.skeleton, t.surface, 0);
  return r;
}

export function mdTable(theme) {
  const out = [];
  let grp = '';
  out.push('| Gruppo | Coppia | Primo piano | Sfondo | Rapporto | Soglia | Esito |');
  out.push('|---|---|---|---|---|---|---|');
  for (const x of rows(theme)) {
    const ok = x.min <= 1 ? '—' : x.v >= x.min ? '✓' : (x.waive ? `✗ → ${x.waive}` : '✗');
    out.push(`| ${x.grp === grp ? '' : x.grp} | ${x.n} | \`${x.fg}\` | \`${x.bg}\` | ${x.v.toFixed(2)} | ${x.min > 1 ? '≥ ' + x.min : '—'} | ${ok} |`);
    grp = x.grp;
  }
  return out.join('\n');
}

if ((process.argv[1] || '').endsWith('contrasts-21.mjs')) {
  if (process.argv.includes('--md')) {
    console.log('### Tema chiaro\n\n' + mdTable('light') + '\n\n### Tema scuro\n\n' + mdTable('dark'));
  } else {
    for (const th of ['light', 'dark']) {
      console.log(`\n== ${th} ==`);
      for (const x of rows(th)) {
        const ok = x.min <= 1 ? ' ' : x.v >= x.min ? '✅' : (x.waive ? '🟡' : '❌');
        console.log(`${ok} ${x.grp.padEnd(10)} ${x.n.padEnd(70)} ${x.fg} su ${x.bg}  ${x.v.toFixed(2)}:1 ${x.min > 1 ? `(min ${x.min})` : ''}`);
      }
    }
  }
}
