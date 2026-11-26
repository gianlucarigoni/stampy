// Tablet · Cliente: S01 scan, R04 richiesta approvata, R05 premio (modale a, D36 A), P01 profilo, H01 storico (righe per giorno, D39 a). 820x1180. Colonna 32 rem = 512 (D36).
import { MODE, ic, btn, chip, card, be, alert, field, mini, headerW, main, V } from './lib-t.mjs';
import { stampFull, stampEmpty, scanHero, walletCard } from '../lib/lib.mjs';
import { day, hrow, filtersBar, wr } from './lib-t.mjs';
const S = (o) => ({ flow: 'cliente', W: 820, H: 1180, ...o });
const hc = (cur = '') => headerW({ kind: 'cliente', cur });

export const stampsCard = (n, total = 10, newCount = 0, status = '') => {
  const dots = Array.from({ length: total }, (_, i) => i < n ? stampFull(i, newCount > 0 && i >= n - newCount) : stampEmpty(i === n)).join('');
  return `<div class="card cardw"><div class="venue"><b>Nome del locale</b>${be()}${status}</div>
<div class="big" style="font-size:44px">${n}<span> su ${total}</span></div><div class="miss">${n >= total ? 'card piena' : `ne mancano ${total - n}`}</div>
<div class="stampsrow"><div class="dots" role="img" aria-label="${n} timbri su ${total}">${dots}</div></div>
<div class="codecard">Codice card: <b>44EE7A5B</b></div></div>`;
};
export const okAlert = (n) => alert('ok', 'Richiesta approvata', `<span class="plus"><em>+${n}</em> timbri</span>`);

const confetti = () => { const cols = ['#2b1408', '#f16417', '#ffffff', '#ffd84d']; const pts = [[4, 12], [16, 28], [30, 8], [44, 36], [58, 14], [72, 40], [88, 18], [95, 48], [10, 56], [24, 70], [38, 58], [52, 76], [66, 62], [80, 80], [92, 70], [34, 24], [78, 26], [20, 44], [50, 6], [64, 36]]; return `<div class="conf2" aria-hidden="true">${pts.map(([x, y], i) => `<i style="left:${x}%;top:${y}px;background:${cols[i % 4]}"></i>`).join('')}</div>`; };
const prizeBox = () => `<div class="prizebox" role="dialog" aria-modal="true">${confetti()}<span class="chip pk">${ic('seal-check', 18, { fill: true })} Premio riscattato</span><h2 class="pt">PREMIO!</h2><div class="pn">Caffè gratis</div><div class="pv">Nome del locale ${be()}</div><p class="pm">Lo staff lo sa già: ti consegna il premio.</p>${btn('primary', 'Perfetto', { h: 58 }).replace('btn primary', 'btn pbtn')}</div>`;

const stRow = { ok: chip('ok', 'Approvata', 'check-circle'), exp: chip('neutral', 'Scaduta', 'clock', { fill: false }), no: chip('warn', 'Non confermata', 'x-circle'), prize: chip('prize', 'Premio', 'gift') };
const who = card(`<div class="row" style="gap:12px"><div class="grow" style="min-width:0"><h1 class="t-section" style="overflow-wrap:anywhere">Marta Conti</h1><p class="muted" style="font-size:15px">marta.conti@esempio.it</p></div>${btn('link', 'Modifica nome')}</div>`);

const nameHead = `<h1 class="t-title w">Come ti chiami?</h1><p class="lede" style="margin-top:8px">Ci serve per riconoscerti nei locali. Lo puoi cambiare quando vuoi dal tuo profilo.</p>`;
const nameCard = (f) => card(`${nameHead}<div class="stack g16" style="margin-top:20px">${f}${btn('primary', 'Continua')}</div>`, 'cardc');
export const screens = [
  S({ id: 'N01', name: 'Come ti chiami?', state: 'vuoto', src: 'N01', changes: 'colonna 512 centrata, card con padding 32; titolo 32; header con voci (niente ☰)', backend: 'no', isNew: 'no',
    render: () => ({ inner: `${hc()}${main(nameCard(field({ label: 'Il tuo nome', placeholder: 'Marta', hint: 'Da 3 a 50 caratteri.' })), { col: 'col' })}` }) }),
  S({ id: 'N02', name: 'Come ti chiami?', state: 'errore: nome troppo corto', src: 'N02', changes: 'come N01; il messaggio sostituisce il suggerimento nella riga riservata (nessun salto)', backend: 'no', isNew: 'no',
    render: () => ({ inner: `${hc()}${main(nameCard(field({ label: 'Il tuo nome', value: 'Al', error: 'Il nome deve avere da 3 a 50 caratteri.' })), { col: 'col' })}` }) }),
  S({ id: 'N03', name: 'Come ti chiami?', state: 'tavola: salvataggio, rete, 429', src: 'N03', changes: 'le tre card impilate nella colonna 512 (alternative, non affiancate)', backend: 'no', isNew: 'no',
    render: () => ({ inner: `${hc()}${main(`<div class="tav1" style="gap:20px">
${mini('Salvataggio in corso', card(`<div class="stack g16">${field({ label: 'Il tuo nome', value: 'Marta Conti', busy: true, reserve: false })}${btn('primary', 'Salvo…', { busy: true })}</div>`, 'cardc'))}
${mini('Connessione non riuscita: il campo resta neutro', card(`<div class="stack g16">${alert('err', 'Connessione non riuscita', 'Il nome non è stato salvato. Riprova tra poco.')}${field({ label: 'Il tuo nome', value: 'Marta Conti', reserve: false })}${btn('primary', 'Continua')}</div>`, 'cardc'))}
${mini('Troppe richieste (429)', card(`<div class="stack g16">${alert('warn', 'Hai fatto troppe richieste', 'Riprova tra 2 min.')}${btn('primary', 'Riprova tra 2 min')}</div>`, 'cardc'))}</div>`, { col: 'col' })}` }) }),
  S({ id: 'S01', name: 'Scansiona (/scan)', state: 'default con gesto e passi', src: 'S01', changes: 'colonna 512 centrata; pannello arancione 260; header con voci (niente ☰); titolo 28', backend: 'no', isNew: 'no',
    render: () => ({ inner: `${hc()}${main(`<div class="stack g16">${scanHero().replace('class="heropanel"', 'class="heropanel tb"')}
<h1 class="scanT">Avvicina il telefono al tag o inquadra il QR</h1>
${card(`<div class="tl">${[['Avvicina il telefono al tag', ' del locale'], ['Entra con la tua email', ''], ['Chiedi il timbro', ' e salvalo in Google Wallet']].map(([b, r], i) => `<div class="s"><div class="n">${i + 1}</div><div class="t"><b>${b}</b>${r}</div></div>`).join('')}</div>`)}</div>`, { col: 'col' })}` }) }),
  S({ id: 'R04', name: 'Richiesta timbro', state: 'approvata con timbri', src: 'R04', changes: 'colonna 512; timbri ≈ 83; numero grande 44; alert di esito sopra la card (ordine di lettura invariato)', backend: 'sì (nome del locale)', isNew: 'no',
    render: () => ({ inner: `${hc()}${main(`<div class="stack g16">${okAlert(2)}${stampsCard(7, 10, 2)}</div>`, { col: 'col' })}` }) }),
  S({ id: 'R05', name: 'Richiesta timbro', state: 'approvata, dialog del premio (modale)', src: 'R05', changes: 'modale centrata 440 (D36 a) invece del blocco a tutta larghezza; coriandoli in %; scrim .72', backend: 'sì (nome del locale)', isNew: 'no',
    render: () => ({ inner: `<div class="underlay" aria-hidden="true">${hc()}${main(`<div class="stack g16">${stampsCard(10, 10, 1, chip('prize', 'Al prossimo timbro', 'gift'))}</div>`, { col: 'col' })}</div><div class="scrimfull"></div><div class="mdlg" style="top:${MODE.desk ? 190 : 330}px">${prizeBox()}</div>` }) }),
  S({ id: 'P01', name: 'Profilo', state: 'default', src: 'P01', changes: 'colonna 512; card del cliente impilate (non griglia); voce «Storico richieste» anche nell\'header; la lista continua fuori frame', backend: 'sì (elenco card con branding, nome del premio: B30)', isNew: 'no',
    render: () => ({ clip: true, inner: `${hc('profilo')}${main(`<div class="stack g16">${who}
<div class="secth"><h2 class="t-section" style="font-size:19px">Le tue card</h2>${be()}</div>
${walletCard({ name: 'Bar Pasticceria Rossi', ini: 'BR', brand: '#7a1f2b', n: 3, reward: 'un caffè in regalo' })}${walletCard({ name: 'Gelateria Fiordilatte', ini: 'GF', brand: '#1e3a5f', n: 6, reward: 'un cono in regalo' })}
${card(`<div class="rowlink" data-tap data-h="56">${ic('clock-counter-clockwise', 24)}<b style="font:700 17px Figtree">Storico richieste</b>${ic('caret-right', 20, { cls: 'r' })}</div>`, 'pad0')}</div>`, { col: 'col' })}` }) }),
  S({ id: 'H01', name: 'Storico richieste', state: 'default (righe per giorno)', src: 'H01', changes: 'colonna 720 centrata (D39 a, righe per giorno come il mobile); toggle «Filtri» + pannello a 3 colonne; riga con tempo largo 64', backend: 'sì (filtro per locale, nome del premio)', isNew: 'no',
    render: () => ({ inner: `${hc('storico')}${main(`<div class="wr stack g16" style="max-width:720px;margin:0 auto;width:100%"><div><h1 class="t-title w">Le tue richieste</h1></div>${filtersBar({ total: '12 richieste' })}
${day('Oggi')}${card(`${hrow('14:14', 'Bar Pasticceria Rossi', '2 timbri', stRow.ok, false, false)}${hrow('09:41', 'Gelateria Fiordilatte', 'Premio riscattato · Caffè gratis ' + be(), stRow.prize, true, false)}`, 'pad0')}
${day('Ieri')}${card(`${hrow('18:05', 'Bar Pasticceria Rossi', '1 timbro', stRow.ok, false, false)}${hrow('12:30', 'Gelateria Fiordilatte', 'Nessun timbro', stRow.exp, false, false)}`, 'pad0')}
${day('20 ottobre')}${card(hrow('08:12', 'Bar Pasticceria Rossi', 'Nessun timbro', stRow.no, false, false), 'pad0')}</div>`)}` }) }),
];
