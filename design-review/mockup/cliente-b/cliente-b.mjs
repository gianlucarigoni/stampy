// Flusso Cliente · profilo, storico, elimina account. Mobile 390x844.
import { META } from '../plan-data.mjs';
import { header, menuPanel, card, alert, btn, field, cap, emptyPage, ic, chip, sk, be, nw, walletCard } from '../lib/lib.mjs';

const S = (id, render) => ({ ...META[id], render });
const shell = (inner, { top = 14, back = false, open = false, clip = false } = {}) => `${header({ back, open })}<main class="page" ${clip ? 'data-clip' : ''} style="padding-top:${top}px">${inner}</main>`;
const mini = (title, inner) => `<div class="tav-i">${cap(title)}${card(inner)}</div>`;
const EMAIL = 'marta.conti@esempio.it';

// ---- profilo ----
const who = (editBtn = true) => card(`<div class="row" style="gap:12px"><div class="grow" style="min-width:0"><h1 class="t-section" style="overflow-wrap:anywhere">Marta Conti</h1><p class="muted" style="font-size:15px;overflow-wrap:anywhere">${EMAIL}</p></div>${editBtn ? btn('link', 'Modifica nome') : ''}</div>`);
const storico = card(`<div class="rowlink" data-tap data-h="56">${ic('clock-counter-clockwise', 24)}<b style="font:700 17px Figtree">Storico richieste</b>${ic('caret-right', 20, { cls: 'r' })}</div>`, 'pad0');
const delSection = card(`<h2 class="t-section" style="font-size:17px">Elimina l'account</h2><p class="muted" style="font-size:15px;margin:6px 0 14px">Cancella il tuo account e i tuoi dati.</p>${btn('dout', 'Elimina account')}`);
const mie = `<div class="secth"><h2 class="t-section" style="font-size:19px">Le tue card</h2>${be()}</div>${walletCard({ name: 'Bar Pasticceria Rossi', ini: 'BR', brand: '#7a1f2b', n: 3, reward: 'un caffè in regalo' })}${walletCard({ name: 'Gelateria Fiordilatte', ini: 'GF', brand: '#1e3a5f', n: 6, reward: 'un cono in regalo' })}`;
const menuCliente = menuPanel([{ icon: 'user-circle', label: 'Profilo', cur: true }, '-', { icon: 'sign-out', label: 'Esci' }]);

// ---- storico ----
const stChip = { ok: chip('ok', 'Approvata', 'check-circle'), exp: chip('neutral', 'Scaduta', 'clock', { fill: false }), no: chip('warn', 'Non confermata', 'x-circle'), wait: chip('neutral', 'In attesa', 'clock', { fill: false }), prize: chip('prize', 'Premio', 'gift') };
const hrow = (tm, nm, dt, chipHtml, prz = false) => `<div class="hrow ${prz ? 'prz' : ''}"><div class="tm">${tm}</div><div class="mid"><div class="nm">${nm}</div><div class="dt">${dt}</div></div>${chipHtml}</div>`;
const list = card(`${''}${hrow('14:14', 'Bar Pasticceria Rossi', '2 timbri', stChip.ok)}${hrow('09:41', 'Gelateria Fiordilatte', 'Premio riscattato · Caffè gratis ' + '', stChip.prize, true)}`, 'pad0');
const day = (t) => `<div class="dayh">${t}</div>`;
const filtersRow = (n = 0, open = false) => `<div class="filters">${btn('secondary', `Filtri${n ? ' · ' + n : ''}`, { icon: open ? 'caret-up' : 'caret-down', h: 44 }).replace('btn secondary', `btn secondary ${open ? 'open' : ''}`)}${n ? btn('link', 'Azzera') : ''}<span class="grow"></span><span class="muted" role="status" style="font-size:14px">${n ? '3 richieste' : '12 richieste'}</span></div>`;
const sel = (label, val, backend = false) => `<div class="field"><div class="lbl">${label} ${backend ? be() : ''}</div><div class="inp sel" data-tap data-h="52"><span>${val}</span>${ic('caret-down', 20)}</div></div>`;
const half = (label, val, invalid = '') => `<div class="field"><div class="lbl" style="font-size:14px">${label}</div><div class="inp ${invalid ? 'invalid' : ''}" data-tap data-h="52"><span class="${val ? '' : 'ph'}">${val || 'Tutti'}</span></div></div>`;

export const screens = [
  S('P01', () => shell(`${who()}${mie}${storico}${delSection}`, { back: true, clip: true })),
  S('P02', () => shell(`${card(`<div class="stack g12">${field({ label: 'Il tuo nome', value: 'Marta Conti', hint: 'Da 3 a 50 caratteri.' })}${btn('primary', 'Salva')}${btn('secondary', 'Annulla')}</div>`)}${storico}`, { back: true })),
  S('P03', () => shell(`<div class="tavola" style="gap:10px">
${mini('Nome non valido', `<div class="stack g12">${field({ label: 'Il tuo nome', value: 'Al', error: 'Il nome deve avere da 3 a 50 caratteri.', reserve: false })}${btn('primary', 'Salva')}</div>`)}
${mini('Errore del server: il campo resta neutro', `<div class="stack g12">${alert('err', 'Non siamo riusciti a salvare il nome', 'Riprova tra poco.')}${field({ label: 'Il tuo nome', value: 'Marta Conti', reserve: false })}${btn('primary', 'Salva')}</div>`)}
${mini('Dopo il salvataggio: la riga resta', `<div class="stack g12">${who()}${alert('ok', '', 'Nome aggiornato.')}</div>`)}
</div>`, { top: 8, back: true })),
  S('P04', () => `${shell(`${who()}${mie}${storico}${delSection}`, { back: true, open: true, clip: true })}${menuCliente}`),
  S('P05', () => shell(`${who()}${card(`<h2 class="t-section" style="font-size:17px">Elimina l'account</h2><div style="margin-top:10px">${alert('warn', '', 'Questo account gestisce un locale e non può essere eliminato da qui.')}</div>`)}`, { back: true })),
  S('P06', () => shell(`${who()}${card(`<div class="stack g12"><div class="row" style="gap:12px">${sk('24px', 24)}${sk('50%', 18)}</div></div>`)}${card(`${sk('40%', 18)}<div style="height:14px"></div>${sk('100%', 52)}`)}<p class="muted" style="font-size:14px" role="status">Un momento…</p>`, { back: true })),
  S('P07', () => shell(`<div class="tavola" style="gap:10px">
${mini('Nessuna card ancora', emptyPage({ icon: 'wallet', title: 'Non hai ancora card', text: 'Avvicina il telefono al tag di un locale per avere la tua prima card.', actions: btn('secondary', 'Vai alla pagina iniziale') }))}
${mini('Caricamento: scheletro della card', `${sk('100%', 96)}<div style="height:12px"></div>${sk('60%', 18)}<div style="height:14px"></div>${sk('100%', 50)}`)}
${mini('Errore', `<div class="stack g12">${alert('err', 'Non siamo riusciti a caricare le tue card', 'Controlla la connessione e riprova.')}${btn('primary', 'Riprova', { icon: 'arrow-clockwise' })}</div>`)}
</div>`, { back: true, top: 8, clip: true })),
  S('H01', () => shell(`<h1 class="t-title">Le tue richieste</h1>${filtersRow()}
${day('Oggi')}${list}${day('Ieri')}${card(`${hrow('18:05', 'Bar Pasticceria Rossi', '1 timbro', stChip.ok)}${hrow('12:30', 'Gelateria Fiordilatte', 'Nessun timbro', stChip.exp)}`, 'pad0')}${day('20 ottobre')}${card(hrow('08:12', 'Bar Pasticceria Rossi', 'Nessun timbro', stChip.no), 'pad0')}`, { back: true, top: 6 })),
  S('H02', () => shell(`<h1 class="t-title">Le tue richieste</h1>${filtersRow(2, true)}
<div class="row" style="flex-wrap:wrap"><span class="chipx">Esito: Approvate<button class="xbtn" aria-label="Rimuovi filtro" data-tap>${ic('x', 18)}</button></span><span class="chipx">Dal 1 ott<button class="xbtn" aria-label="Rimuovi filtro" data-tap>${ic('x', 18)}</button></span></div>
${card(`<div class="stack g12">${sel('Esito', 'Approvate')}${sel('Locale', 'Tutti i locali', true)}<div class="fgrid">${half('Timbri · Min', '1')}${half('Max', '')}</div><div class="fgrid">${half('Dal', '01/10/2026')}${half('Al', '')}</div></div>`)}`, { back: true, top: 6 })),
  S('H03', () => shell(`<h1 class="t-title">Le tue richieste</h1>${filtersRow(1, true)}
${card(`<div class="stack g12">${sel('Esito', 'Tutti')}<div class="fgrid">${half('Timbri · Min', '20', 'x')}${half('Max', '5', 'x')}</div>
<div class="hint err nores" role="alert" style="min-height:0">${ic('warning-circle', 16, { fill: true })}<span>Il minimo dei timbri supera il massimo.</span></div></div>`)}
${card(`<div class="stack g12"><b style="font:700 17px Figtree">Correggi i filtri</b><p class="muted" style="font-size:15px">Finché i filtri non sono validi non mostriamo l'elenco.</p></div>`)}`, { back: true, top: 6 })),
  S('H04', () => shell(`<div class="tavola">
${mini('Nessuna richiesta', emptyPage({ icon: 'clock-counter-clockwise', title: 'Non hai ancora richieste', text: 'Quando chiedi un timbro, la vedrai qui.', actions: btn('primary', 'Vai alla pagina iniziale') }))}
${mini('Nessun risultato con i filtri', emptyPage({ icon: 'funnel', title: 'Nessun risultato', text: 'Nessun risultato con questi filtri.', actions: btn('secondary', 'Azzera filtri') }))}
</div>`, { back: true, top: 8 })),
  S('H05', () => shell(`<div class="tavola">
${mini('Caricamento: scheletro della stessa altezza', `<p class="muted" role="status" style="font-size:14px;margin-bottom:10px">Caricamento…</p>${[1, 2, 3].map(() => `<div class="row" style="gap:12px;margin-bottom:14px">${sk('44px', 18)}<div class="grow stack g8">${sk('60%', 16)}${sk('35%', 14)}</div>${sk('84px', 32)}</div>`).join('')}`)}
${mini('Errore', `<div class="stack g12">${alert('err', 'Non siamo riusciti a caricare le richieste', 'Controlla la connessione e riprova.')}${btn('primary', 'Riprova', { icon: 'arrow-clockwise' })}</div>`)}
</div>`, { back: true, top: 8 })),
  S('E01', () => shell(card(`<h1 class="t-title">Elimina il tuo account</h1>
<div class="stack g12" style="margin-top:16px">${alert('warn', 'Non si può annullare.', 'Se continui, tutti i dati dell\'account vengono eliminati, comprese le card dei tuoi posti preferiti.')}
<div>${nw('testo da validare (privacy)')}</div>
<p>Per sicurezza ti mandiamo un codice via email: lo userai per confermare.</p>
${btn('primary', 'Continua: invia il codice')}<div style="height:4px"></div>${btn('secondary', 'Torna al profilo')}</div>`), { back: true })),
  S('E02', () => shell(card(`<h1 class="t-title">Elimina il tuo account</h1><p class="lede" style="margin-top:8px">Abbiamo scritto a <b>${EMAIL}</b>. Il codice vale 5 minuti.</p>
<div class="stack g12" style="margin-top:12px"><div>${btn('link', 'Invia un nuovo codice')}</div>${field({ label: 'Codice a 6 cifre', value: '482913', code: true, hint: 'Qui il codice non si invia da solo.' })}
${btn('danger', 'Elimina definitivamente il mio account', { h: 64 })}<div style="height:4px"></div>${btn('secondary', 'Torna al profilo')}</div>`), { back: true })),
  S('E03', () => shell(`<div class="tavola" style="gap:10px">
${mini('Codice non valido', `<div class="stack g12">${field({ value: '482913', error: 'Codice non valido. Ti restano 2 tentativi.', code: true, reserve: false })}${btn('danger', 'Elimina definitivamente il mio account', { h: 64 })}</div>`)}
${mini('Codice scaduto: resta solo il nuovo codice', `<div class="stack g12">${field({ value: 'Codice non più valido', dead: true, error: 'Codice scaduto. Richiedi un nuovo codice.', reserve: false })}${btn('primary', 'Invia un nuovo codice')}</div>`)}
${mini('Troppe richieste (429)', `<div class="stack g12">${alert('warn', 'Hai fatto troppe richieste', 'Riprova tra 2 min.')}${btn('secondary', 'Riprova tra 2 min')}</div>`)}
</div>`, { back: true, top: 8 })),
  S('E04', () => shell(card(`<h1 class="t-title">Elimina il tuo account</h1><div class="stack g12" style="margin-top:16px">${alert('warn', '', 'Questo account gestisce un locale e non può essere eliminato da qui.')}${btn('secondary', 'Torna al profilo')}</div>`), { back: true })),
];
