// Contrasti NUOVI della sezione Staff (coda, esiti, stepper, elenco locali). Stessa formula WCAG 2.x di contrasts.mjs.
const hex = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const mix = (a,b,w) => a.map((v,i)=>Math.round(v*(1-w)+b[i]*w));
const over = (fg,bg,al) => mix(bg,fg,al);
const lin = v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; };
const L = c => 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
const cr = (a,b) => { const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const hx = c => '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
const row=(n,a,b)=>console.log(`${n.padEnd(72)} ${hx(a)} su ${hx(b)}  ${cr(a,b).toFixed(2)}:1`);
const W=[255,255,255], brand=hex('#f16417');
const T = { light:{bg:W}, dark:{bg:hex('#171310')} };
for (const [t,c] of Object.entries(T)) {
  console.log(`\n== ${t} ==`);
  row('«Premio disponibile» text-success #198754 su card', hex('#198754'), c.bg);
  row('«Ok» esito: btn-outline-secondary #6c757d su card (testo)', hex('#6c757d'), c.bg);
  row('«Ok» esito: bordo #6c757d su card (UI)', hex('#6c757d'), c.bg);
  row('«Ok» pressed: bianco su #6c757d', W, hex('#6c757d'));
  const dis = over(brand, c.bg, .65);
  row('Stepper − / + DISABILITATO (arancione opacity .65) su card', dis, c.bg);
  const disR = over(hex('#dc3545'), c.bg, .65);
  row('«Rifiuta» DISABILITATO (rosso opacity .65) su card (durante invio)', disR, c.bg);
  row('«Conferma» DISABILITATO per quantità invalida (bianco .65 su arancione .65)', over(W,c.bg,.65), over(brand,c.bg,.65));
  row('«Rifiuta» outline: bordo/testo #dc3545 su card', hex('#dc3545'), c.bg);
  row('«Rifiuta» pressed/focus: bianco su #dc3545', W, hex('#dc3545'));
  row('Stepper (−/+) bordo e simbolo 24 px arancione su card', brand, c.bg);
  row('Campo quantità: bordo input su card (UI)', c.bg===W?hex('#dee2e6'):hex('#495057'), c.bg);
  row('Link «I tuoi locali» (non autorizzato) arancione su card', c===T.dark?hex('#f4813f'):brand, c.bg);
  row('Bottone locale (btn-outline-primary 14-16 px 600): testo su card', brand, c.bg);
}
// Elenco locali: riempimento del pressed = arancione pieno, testo bianco 3,19 (già noto)
console.log('\nGià noti e non ripetuti: bianco su arancione 3,19; alert 7–10; bordi campo 1,30/2,26; testo secondario 6,73/8,31; pillola promozione 13,84/12,63, icona 2,87; danger 4,53/4,08.');
