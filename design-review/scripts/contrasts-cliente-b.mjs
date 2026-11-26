// Contrasti NUOVI della parte B del Cliente (profilo, storico, elimina account). Stessa formula WCAG 2.x di contrasts.mjs.
const hex = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const mix = (a,b,w) => a.map((v,i)=>Math.round(v*(1-w)+b[i]*w)); // w = peso di b
const over = (fg,bg,al) => mix(bg,fg,al);                          // fg con alpha al sopra bg
const lin = v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; };
const L = c => 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
const cr = (a,b) => { const [x,y]=[L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const hx = c => '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
const row=(n,a,b)=>console.log(`${n.padEnd(70)} ${hx(a)} su ${hx(b)}  ${cr(a,b).toFixed(2)}:1`);
const W=[255,255,255], brand=hex('#f16417'), wb=hex('#1e3a5f');
const T = { light:{bg:W, tert:hex('#f8f9fa'), body:hex('#212529'), danger:hex('#dc3545'), dz:hex('#c92a3a'), dzrgb:[201,42,58]},
            dark:{bg:hex('#171310'), tert:hex('#2b3035'), body:hex('#dee2e6'), danger:hex('#dc3545'), dz:hex('#f0808b'), dzrgb:[240,128,139]} };
for (const [t,c] of Object.entries(T)) {
  console.log(`\n== ${t} ==`);
  // Elimina account: bottone danger pieno (Bootstrap), stati
  row('btn-danger: bianco su #dc3545 (default)', W, c.danger);
  row('btn-danger: bianco su hover/focus #bb2d3b', W, hex('#bb2d3b'));
  row('btn-danger: bianco su pressed #b02a37', W, hex('#b02a37'));
  // disabilitato: opacity .65 sull'intero elemento
  const fillD = over(c.danger,c.bg,.65), txtD = over(W,c.bg,.65);
  row('btn-danger DISABILITATO (opacity .65): testo su fondo', txtD, fillD);
  row('btn-danger DISABILITATO: fondo vs card (UI)', fillD, c.bg);
  row('btn-danger pieno vs card (UI, soglia 3)', c.danger, c.bg);
  // Zona pericolosa (profilo)
  const dzbg = over(c.dzrgb,c.bg,.06);
  row('Zona pericolosa: titolo/testo bottone su fondo tinta 6%', c.dz, dzbg);
  row('Zona pericolosa: bordo card (alpha .55) su pagina (UI)', over(c.dzrgb,c.bg,.55), c.bg);
  row('Zona pericolosa: bordo bottone (alpha .7) su tinta (UI)', over(c.dzrgb,dzbg,.7), dzbg);
  row('Zona pericolosa: testo bottone pressed (tinta .22)', c.dz, over(c.dzrgb,dzbg,.22));
  // Storico
  row('formError: text-danger #dc3545 su pagina (testo 14-16 px bold)', c.danger, c.bg);
  const rowTint = over(hex('#f16417'),c.bg,.15);
  row('riga profilo hover: testo corpo su tinta 15%', c.body, rowTint);
  row('Filtri aperto/Azzera: bianco su #f16417 (già noto 3,19)', W, brand);
  row('input-group-text «Min/Max»: testo corpo su fondo tertiary', c.body, c.tert);
  row('card Wallet (superficie): testo corpo su tertiary', c.body, c.tert);
  row('Wallet: nero Google #131314 su tertiary (UI, asset di marca)', hex('#131314'), c.tert);
}
console.log('\n== Card Wallet statica (modello, colore #1e3a5f; uguale nei due temi) ==');
const top = mix(wb, W, .22), mid = mix(wb,W,.08);
console.log('gradiente alto-sx ~', hx(top), ' fondo ', hx(wb));
row('titolo bianco su brand', W, wb);
row('titolo bianco su gradiente chiaro (angolo alto)', W, top);
row('«Carta fedeltà» bianco 75% su brand', over(W,wb,.75), wb);
row('«Carta fedeltà» bianco 75% su gradiente chiaro', over(W,top,.75), top);
row('pillola 3/10: bianco su brand+16% bianco', W, over(W,wb,.16));
row('timbro VUOTO (bianco 14%) vs fondo card (UI, soglia 3)', over(W,wb,.14), wb);
row('timbro PIENO bianco vs fondo card (UI)', W, wb);
row('spunta brand su cerchio bianco', wb, W);
console.log('\nPannello Filtri / campi: bordo campo e card già calcolati in contrasts.mjs (1,30 / 2,26; 1,51 / 1,55).');
