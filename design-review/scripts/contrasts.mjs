// Rapporti di contrasto WCAG 2.x calcolati dai valori Bootstrap 5.3 + stampy.scss (nessuna dipendenza).
const hex = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const mix = (a,b,w) => a.map((v,i)=>Math.round(v*(1-w)+b[i]*w)); // w = quota di b
const over = (fg,bg,al) => mix(bg,fg,al);
const lin = v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; };
const L = c => 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
const cr = (a,b) => { const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const W=[255,255,255], K=[0,0,0];
const success=hex('#198754'), warning=hex('#ffc107'), danger=hex('#dc3545');
const T = {
 light: { bg:W, body:hex('#212529'), sec:over(hex('#212529'),W,.75), border:hex('#dee2e6'), secbg:hex('#e9ecef'),
   link:hex('#f16417'), alert:{ danger:[mix(danger,W,.8),mix(danger,K,.6)], warning:[mix(warning,W,.8),mix(warning,K,.6)], success:[mix(success,W,.8),mix(success,K,.6)] } },
 dark: { bg:hex('#171310'), body:hex('#dee2e6'), sec:over(hex('#dee2e6'),hex('#171310'),.75), border:hex('#495057'), secbg:hex('#221c18'),
   link:hex('#f4813f'), alert:{ danger:[mix(danger,K,.8),mix(danger,W,.4)], warning:[mix(warning,K,.8),mix(warning,W,.4)], success:[mix(success,K,.8),mix(success,W,.4)] } },
};
const brand=hex('#f16417'), brandActive=hex('#c2410c');
const hx = c => '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
const row=(n,a,b)=>console.log(`${n.padEnd(58)} ${hx(a)} su ${hx(b)}  ${cr(a,b).toFixed(2)}:1`);
for (const [t,c] of Object.entries(T)) {
  console.log(`\n== ${t} ==`);
  row('testo corpo su sfondo', c.body, c.bg);
  row('testo secondario (.text-body-secondary) su sfondo', c.sec, c.bg);
  row('link/btn-link arancione su sfondo (12-14px sottolineato)', c.link, c.bg);
  row('bordo input/card (non testo, soglia 3:1) su sfondo', c.border, c.bg);
  if (t==='light') row('bordo card rgba(0,0,0,.175) su bianco', over(K,W,.175), W);
  else row('bordo card rgba(255,255,255,.15) su sfondo', over(W,c.bg,.15), c.bg);
  for (const [k,[bg,fg]] of Object.entries(c.alert)) row(`alert-${k} testo su fondo`, fg, bg);
  for (const [k,[bg,fg]] of Object.entries(c.alert)) row(`alert-${k} fondo su sfondo pagina (distinzione)`, bg, c.bg);
  row('bianco su arancione (btn-primary, 16px 600)', W, brand);
  row('btn-primary vs sfondo pagina (UI, 3:1)', brand, c.bg);
  const dis = over(brand,c.bg,.65); const disTxt = over(W,dis,.65);
  console.log(`  disabled: bottone ${hx(dis)} testo ${hx(disTxt)}`);
  row('btn-primary DISABLED (opacity .65): testo su bottone', over(W,c.bg,.65) /*approx*/, dis);
  row('  (calcolo corretto: bianco*.65 su bg composto)', disTxt, dis);
  row('placeholder/etichette disabilitate: link disabled', over(c.link,c.bg,.65), c.bg);
  row('input disabilitato: testo body su secondary-bg', over(c.body,c.secbg,.65), c.secbg);
  row('anello focus arancione 3px su sfondo', brand, c.bg);
  row('anello focus arancione vs bg card/alert danger', brand, c.alert.danger[0]);
}
console.log('\nbianco su pressed #c2410c', cr(W,brandActive).toFixed(2));
row('btn-primary hover/focus-visible stato scuro', W, mix(brand,K,.2));
