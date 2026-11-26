// validate.mjs · verifiche automatiche per ogni .frame (contrasti, target, testo >= 13, URL esterni, scroll, tagli)
// Uso diretto: node validate.mjs <flusso>   (usa <flusso>/<flusso>.html)  — di solito lo chiama run.mjs
export const SOGLIE = { testo: 4.5, testoGrande: 3, target: 44, testoMin: 13 };

/** Da eseguire dentro la pagina (page.evaluate). Ritorna un record per frame. */
export function inPage() {
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const bgOf = (el) => { const chain = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { chain.push(c); if (c.a === 1) break; } } let acc = { r: 255, g: 255, b: 255, a: 1 }; for (const c of chain.reverse()) acc = over(c, acc); return acc; };
  const out = [];
  for (const fr of document.querySelectorAll('.frame')) {
    const fb = fr.getBoundingClientRect();
    const rec = { id: fr.id, name: fr.dataset.name, fail: [], contrasts: 0, minContrast: 99, targets: 0, texts: 0 };
    // tablet/desktop (chat 15): la dimensione del frame deve essere quella dichiarata (data-w x data-h)
    if (fr.dataset.w && (Math.abs(fb.width - +fr.dataset.w) > 1 || Math.abs(fb.height - +fr.dataset.h) > 1)) rec.fail.push(`dimensione ${Math.round(fb.width)}x${Math.round(fb.height)} ≠ ${fr.dataset.w}x${fr.dataset.h}`);
    // header largo: altezza 64 (spec 50 §1)
    const hw = fr.querySelector('.hw'); if (hw && Math.abs(hw.getBoundingClientRect().height - 64) > 1.5) rec.fail.push('header ≠ 64');
    // bersagli tablet touch: distanza tra Conferma/Rifiuta ≥ 16 (spec 50 §5)
    for (const c of fr.querySelectorAll('.btn.primary + .btn.dout, .btn.primary + div > .btn.dout')) { const p = c.previousElementSibling && c.previousElementSibling.classList.contains('btn') ? c.previousElementSibling : null; if (p) { const gap = c.getBoundingClientRect().top - p.getBoundingClientRect().bottom; if (gap < 15.5) rec.fail.push(`distanza Conferma/Rifiuta ${gap.toFixed(0)}<16`); } }
    const under = fr.querySelector('.underlay');
    const walker = document.createTreeWalker(fr, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement; if (!t.textContent.trim() || seen.has(el)) continue; seen.add(el);
      if (under && under.contains(el)) continue; // sotto lo scrim: dimmato, non letto
      if (el.closest('[data-nocheck]')) continue;
      const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
      const bg = bgOf(el); const fg = over(parse(cs.color), bg); const r = cr(fg, bg);
      const large = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700);
      const need = large ? 3 : 4.5;
      rec.contrasts++; rec.texts++; rec.minContrast = Math.min(rec.minContrast, r);
      const label = t.textContent.trim().slice(0, 30);
      if (r < need) rec.fail.push(`contrasto ${r.toFixed(2)}<${need} «${label}»`);
      if (fs < 13) rec.fail.push(`testo ${fs}px «${label}»`);
    }
    for (const el of fr.querySelectorAll('[data-tap]')) {
      if (under && under.contains(el)) continue;
      const b = el.getBoundingClientRect(); rec.targets++;
      const need = +el.dataset.h || 44;
      if (b.width < 44 - .5 || b.height < need - .5) rec.fail.push(`target ${b.width.toFixed(0)}x${b.height.toFixed(0)} (serve 44x${need}) «${(el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 20)}»`);
    }
    if (!fr.querySelector('[data-clip]') && fr.scrollHeight > fb.height + 1) rec.fail.push(`contenuto tagliato in basso (${fr.scrollHeight}>${Math.round(fb.height)})`);
    if (fr.scrollWidth > fb.width + 1) rec.fail.push('scroll orizzontale');
    for (const el of fr.querySelectorAll('*')) {
      if (el.closest('.conf') || el.closest('svg') ) continue;
      const b = el.getBoundingClientRect();
      if (b.width && (b.right > fb.right + 1 || b.left < fb.left - 1)) { rec.fail.push('fuori dal frame: ' + (el.className || el.tagName).toString().slice(0, 30)); break; }
    }
    for (const el of fr.querySelectorAll('.hint span, .nm, .st, .al div, .lede, h1, h2, .lbl')) {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible') { rec.fail.push('testo troncato: ' + el.textContent.trim().slice(0, 24)); break; }
    }
    rec.minContrast = +rec.minContrast.toFixed(2);
    out.push(rec);
  }
  return out;
}

export function urlEsterni(html) {
  const re = /(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\/|@import/gi;
  return [...html.matchAll(re)].length;
}
