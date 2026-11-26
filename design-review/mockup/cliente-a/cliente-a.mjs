// Flusso Cliente · principale: nome, scansione, visita, richiesta, timbro, premio. Mobile 390x844.
import { META } from '../plan-data.mjs';
import { header, card, alert, btn, field, cap, emptyPage, ic, chip, grid, be, confetti, stepN, sk, venueRow, gwBadge, scanHero } from '../lib/lib.mjs';

const S = (id, render) => ({ ...META[id], render });
const shell = (inner, top = 14) => `${header()}<main class="page" style="padding-top:${top}px">${inner}</main>`;
const stepB = (n, text, btnHtml, cur = false) => `<div class="stage full ${cur ? 'cur' : ''}"><div class="n">${n}</div><div class="st">${text}</div><div class="blk">${btnHtml}</div></div>`;
const mini = (title, inner) => `<div class="tav-i">${cap(title)}${card(inner)}</div>`;
const code = (c = '44EE7A5B') => `<div class="codecard">Codice card: <b>${c}</b></div>`;
const need = (n) => `ne mancano ${n}`;
/** card timbri: n su total; newCount timbri nuovi; status = chip a destra */
const stamps = ({ n, total = 10, newCount = 0, status = '', note = '', extra = '' }) => card(`${venueRow()}
<div class="rowb"><div><div class="big">${n}<span> su ${total}</span></div><div class="miss">${n >= total ? 'card piena' : need(total - n)}</div></div>${status}</div>
${grid(n, total, newCount, `${n} timbri su ${total}`, n < total)}${extra}${code()}`);
const plus = (k) => alert('ok', 'Richiesta approvata', `<span class="plus"><em>+${k}</em> ${k === 1 ? 'timbro' : 'timbri'}</span>`);
const prizeAl = (t, x) => alert('prize', t, x);

export const screens = [
  S('N01', () => shell(card(`<h1 class="t-title">Come ti chiami?</h1><p class="lede" style="margin-top:8px">Ci serve per riconoscerti nei locali. Lo puoi cambiare quando vuoi dal tuo profilo.</p>
<div class="stack g12" style="margin-top:20px">${field({ label: 'Il tuo nome', placeholder: 'Marta', hint: 'Da 3 a 50 caratteri.' })}${btn('primary', 'Continua')}</div>`))),
  S('N02', () => shell(card(`<h1 class="t-title">Come ti chiami?</h1><p class="lede" style="margin-top:8px">Ci serve per riconoscerti nei locali. Lo puoi cambiare quando vuoi dal tuo profilo.</p>
<div class="stack g12" style="margin-top:20px">${field({ label: 'Il tuo nome', value: 'Al', error: 'Il nome deve avere da 3 a 50 caratteri.' })}${btn('primary', 'Continua')}</div>`))),
  S('N03', () => shell(`<div class="tavola">
${mini('Salvataggio in corso', `<div class="stack g12">${field({ label: 'Il tuo nome', value: 'Marta Conti', busy: true, reserve: false })}${btn('primary', 'Salvo…', { busy: true })}</div>`)}
${mini('Connessione non riuscita: il campo resta neutro', `<div class="stack g12">${alert('err', 'Connessione non riuscita', 'Il nome non è stato salvato. Riprova tra poco.')}${field({ label: 'Il tuo nome', value: 'Marta Conti', reserve: false })}${btn('primary', 'Continua')}</div>`)}
${mini('Troppe richieste (429)', `<div class="stack g12">${alert('warn', 'Hai fatto troppe richieste', 'Riprova tra 2 min.')}${btn('primary', 'Riprova tra 2 min')}</div>`)}
</div>`, 10)),
  S('S01', () => shell(`<div class="stack g16">${scanHero()}
<h1 class="t-section" style="font-size:24px;line-height:1.15;letter-spacing:-.02em">Avvicina il telefono al tag o inquadra il QR</h1>
${card(`<div class="tl">${[['Avvicina il telefono al tag', ' del locale'], ['Entra con la tua email', ''], ['Chiedi il timbro', ' e salvalo in Google Wallet']].map(([b, r], i) => `<div class="s"><div class="n">${i + 1}</div><div class="t"><b>${b}</b>${r}</div></div>`).join('')}</div>`)}</div>`, 10)),
  S('V01', () => shell(`<p class="muted" role="status" style="font-size:15px">Un momento…</p>${card(`${sk('46%', 16)}<div style="height:16px"></div>${sk('72%', 28)}<div style="height:14px"></div>${sk('100%', 18)}<div style="height:24px"></div>${sk('100%', 52)}<div style="height:12px"></div>${sk('100%', 52)}`)}`, 10)),
  S('V02', () => shell(card(`${venueRow()}<h1 class="t-section" style="margin-top:14px">La tua card è pronta</h1>
<div class="steps" style="margin-top:18px">${stepB(1, 'Salvala in Google Wallet: è qui che vedrai i tuoi timbri.', gwBadge(), true)}${stepB(2, 'Poi chiedi il timbro allo staff.', btn('secondary', 'Richiedi il timbro'))}</div>${code()}`))),
  S('V03', () => shell(`${alert('info', 'Fatto? Ora chiedi il timbro', 'Non possiamo sapere se la card è stata aggiunta: controlla in Google Wallet.')}
${card(`${venueRow()}<h1 class="t-section" style="margin-top:14px">La tua card è pronta</h1>
<div class="steps" style="margin-top:18px">${stepB(1, 'Card salvata in Google Wallet?', gwBadge())}${stepB(2, 'Chiedi il timbro allo staff.', btn('primary', 'Richiedi il timbro'), true)}</div>${code()}`)}`, 10)),
  S('V04', () => shell(`<div class="tavola">
${mini('Link non valido', emptyPage({ icon: 'warning-circle', title: 'Questo link non è valido.', text: 'Avvicina di nuovo il telefono al tag del locale.', actions: btn('primary', 'Vai alla pagina iniziale') }))}
${mini('Nessuna offerta attiva', emptyPage({ icon: 'info', title: 'Nessuna offerta attiva', text: 'Questo locale non ha un\'offerta attiva al momento.', actions: btn('primary', 'Vai alla pagina iniziale') }))}
</div>`, 10)),
  S('V05', () => shell(`<div class="tavola">
${mini('Troppe richieste (429): il tempo sta nel bottone', `<div class="stack g12">${alert('warn', 'Hai fatto troppe richieste', 'Riprova tra 25 min.')}${btn('secondary', 'Riprova tra 25 min')}</div>`)}
${mini('Errore generico', `<div class="stack g12">${alert('err', 'Qualcosa non ha funzionato', 'Riprova tra un attimo.')}${btn('primary', 'Riprova', { icon: 'arrow-clockwise' })}${btn('link', 'Vai alla pagina iniziale', { block: true })}</div>`)}
</div>`, 10)),
  S('R01', () => shell(`<div class="stack g12"><h1 class="t-section">Aspettiamo la conferma dello staff</h1>
<div class="row" style="flex-wrap:wrap">${chip('neutral', '<i class="dotlive"></i>In attesa', null)}${chip('warn', 'Scade tra 4 minuti', 'clock', { fill: false })}</div>
<p class="muted" style="font-size:15px">La richiesta resta valida solo per pochi minuti: se scade potrai rifarla.</p></div>
${stamps({ n: 3, status: '' })}`, 10)),
  S('R02', () => shell(`<div class="stack g12"><h1 class="t-section">Aspettiamo la conferma dello staff</h1>
<div class="row" style="flex-wrap:wrap">${chip('neutral', '<i class="dotlive"></i>In attesa', null)}${chip('warn', 'Scade tra 4 minuti', 'clock', { fill: false })}</div></div>
${stamps({ n: 10, status: chip('prize', 'Al prossimo timbro', 'gift'), extra: `<div style="margin-top:14px">${prizeAl('Premio disponibile: Caffè gratis', 'Il prossimo prodotto è gratis: mostra questa schermata al personale.')}</div>` })}`, 10)),
  S('R03', () => shell(`<div class="stack g12"><h1 class="t-section">Aspettiamo la conferma dello staff</h1>
<div class="row" style="flex-wrap:wrap">${chip('neutral', '<i class="dotlive"></i>In attesa', null)}${chip('warn', 'Scade tra 4 minuti', 'clock', { fill: false })}</div></div>
${alert('info', 'Nuova promozione!', 'La tua card riparte da zero dopo la conferma.')}
${stamps({ n: 0 })}`, 10)),
  S('R04', () => shell(`${plus(2)}${stamps({ n: 7, newCount: 2 })}`)),
  S('R05', () => `<div class="underlay" aria-hidden="true">${header()}<main class="page">${stamps({ n: 10, status: chip('prize', 'Al prossimo timbro', 'gift') })}</main></div>
<div class="scrimfull"></div><div class="dlgwrap"><div class="prizebox" role="dialog" aria-modal="true">${confetti()}
<span class="chip pk">${ic('seal-check', 18, { fill: true })} Premio riscattato</span><h2 class="pt">PREMIO!</h2><div class="pn">Caffè gratis</div>
<div class="pv">Nome del locale ${be()}</div><p class="pm">Lo staff lo sa già: ti consegna il premio.</p>${btn('primary', 'Perfetto', { h: 58 }).replace('btn primary', 'btn pbtn')}</div></div>`),
  S('R06', () => shell(`${prizeAl('Premio riscattato: Caffè gratis', 'Lo staff lo sa già: ti consegna il premio.')}${plus(2)}${stamps({ n: 2, newCount: 2 })}`, 10)),
  S('R07', () => shell(`${plus(1)}${stamps({ n: 10, newCount: 1, status: chip('prize', 'Al prossimo timbro', 'gift'), extra: `<div style="margin-top:14px">${prizeAl('Premio disponibile: Caffè gratis', 'Il prossimo timbro dà il premio.')}</div>` })}`, 10)),
  S('R08', () => shell(`<div class="tavola">
${mini('Richiesta non confermata', `<div class="stack g12">${alert('warn', 'Richiesta non confermata', 'Nessun timbro aggiunto.')}${code('9Q23TSZG')}${btn('primary', 'Richiedi di nuovo', { icon: 'arrow-counter-clockwise' })}</div>`)}
${mini('Richiesta scaduta', `<div class="stack g12">${alert('warn', 'Richiesta scaduta', 'Nessun timbro aggiunto.')}${code('9Q23TSZG')}${btn('primary', 'Richiedi di nuovo', { icon: 'arrow-counter-clockwise' })}</div>`)}
</div>`, 10)),
  S('R09', () => shell(`<div class="tavola">
${mini('Richiesta non trovata', emptyPage({ icon: 'compass', title: 'Richiesta non trovata', text: 'Avvicina di nuovo il telefono al tag del locale per fare una nuova richiesta.', actions: btn('primary', 'Vai alla pagina iniziale') }))}
${mini('Errore', `<div class="stack g12">${alert('err', 'Qualcosa non ha funzionato', 'Riprova tra un attimo.')}${btn('primary', 'Riprova', { icon: 'arrow-clockwise' })}</div>`)}
${mini('Caricamento', `<p class="muted" role="status" style="font-size:15px;margin-bottom:10px">Un momento…</p>${sk('60%', 26)}<div style="height:10px"></div>${sk('100%', 18)}`)}
</div>`, 10)),
];
