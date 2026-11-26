// Contrasti NUOVI della parte A del Cliente (pallini, dialog, avviso promozione, campo invalido).
// Stessa formula WCAG 2.x di contrasts.mjs; nessuna dipendenza.
const hex = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const mix = (a,b,w) => a.map((v,i)=>Math.round(v*(1-w)+b[i]*w));
const over = (fg,bg,al) => mix(bg,fg,al);
const lin = v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; };
const L = c => 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
const cr = (a,b) => { const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const hx = c => '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
const row=(n,a,b)=>console.log(`${n.padEnd(66)} ${hx(a)} su ${hx(b)}  ${cr(a,b).toFixed(2)}:1`);
const W=[255,255,255], K=[0,0,0], brand=hex('#f16417');
const T = { light:{bg:W, body:hex('#212529'), invalid:hex('#dc3545'), secbg:hex('#e9ecef')},
            dark:{bg:hex('#171310'), body:hex('#dee2e6'), invalid:hex('#ea868f'), secbg:hex('#221c18')} };
for (const [t,c] of Object.entries(T)) {
  console.log(`\n== ${t} ==`);
  row('pallino VUOTO: bordo 3px arancione su card (UI, soglia 3)', brand, c.bg);
  row('pallino PIENO: riempimento arancione su card (UI, soglia 3)', brand, c.bg);
  const dim = over(K,c.bg,.6);
  console.log(`  sfondo pagina sotto il backdrop 60%: ${hx(dim)}`);
  row('dialog: fondo dialog vs pagina oscurata (separazione)', c.bg, dim);
  row('dialog: bordo arancione 2px vs pagina oscurata', brand, dim);
  row('dialog: bordo arancione vs fondo dialog', brand, c.bg);
  row('pallino pieno sotto backdrop vs card oscurata', over(K,brand,.6), dim);
  const tint = over(brand,c.bg,.10);
  row('PromotionNotice: testo corpo su fondo tinta 10%', c.body, tint);
  row('PromotionNotice: icona arancione su fondo tinta 10%', brand, tint);
  row('PromotionNotice: bordo (arancione 45%) su sfondo pagina', over(brand,c.bg,.45), c.bg);
  row('campo invalido: bordo/icona rosso su sfondo campo (UI, soglia 3)', c.invalid, c.bg);
  row('burger ☰ (bordo/righe arancione) su sfondo (UI, soglia 3)', brand, c.bg);
  row('burger premuto/aperto: icona bianca su arancione pieno', W, brand);
}
console.log('\nBackdrop: pallino pieno + testo di pagina restano leggibili dietro il dialog? (non necessario: è inerte)');
