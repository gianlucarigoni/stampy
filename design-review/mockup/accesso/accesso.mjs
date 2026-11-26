// Flusso Accesso: login email, codice, errori di sessione, 404. Mobile 390x844.
import { META } from '../plan-data.mjs';
import { header, card, alert, btn, field, cap, emptyPage, ic } from '../lib/lib.mjs';

const S = (id, render) => ({ ...META[id], render });
const shell = (inner, top = 14) => `${header({ menu: false })}<main class="page" style="padding-top:${top}px">${inner}</main>`;
const EMAIL = 'marta.conti@esempio.it';
const privacy = `<p class="privacy">Usiamo la tua email solo per farti entrare. <a href="#">Leggi l'informativa sulla privacy</a></p>`;
const oppure = `<div class="row muted" style="gap:12px;margin:2px 0"><div class="sep grow"></div><span style="font-size:15px">oppure</span><div class="sep grow"></div></div>`;
const loginHead = `<h1 class="t-title">Accedi</h1><p class="lede" style="margin-top:8px">Ti mandiamo un codice via email. Niente password.</p>`;
const emailCard = ({ value = '', error = '', busy = false, focus = false, alertHtml = '', primary = btn('primary', 'Invia il codice'), google = true } = {}) =>
  card(`${loginHead}<div class="stack g12" style="margin-top:20px">${alertHtml}
${field({ label: 'Email', value, placeholder: 'nome@esempio.it', hint: 'Ti mandiamo un codice di 6 cifre.', error, busy, focus })}
${primary}${google ? oppure + btn('google', 'Continua con Google') : ''}${privacy}</div>`);

const codeHead = `<h1 class="t-title">Inserisci il codice</h1><p class="lede" style="margin-top:8px">Abbiamo scritto a <b>${EMAIL}</b>. Il codice vale 5 minuti.</p>`;
const links = (nuovo = '<span></span>') => `<div class="row" style="justify-content:space-between;flex-wrap:wrap">${nuovo}${btn('link', 'Cambia email')}</div>`;
const mini = (title, inner) => `<div class="tav-i">${cap(title)}${card(inner)}</div>`;

export const screens = [
  S('A01', () => shell(emailCard())),
  S('A02', () => shell(emailCard({ value: EMAIL, busy: true, primary: btn('primary', 'Invio…', { busy: true }) }))),
  S('A03', () => shell(emailCard({ value: 'marta.conti@esempio', error: 'Controlla l\'indirizzo: manca la @ o il dominio.' }))),
  S('A04', () => shell(`<div class="tavola">
${mini('Troppe richieste (429)', `<div class="stack g12">${alert('warn', 'Hai fatto troppe richieste', 'Riprova tra 3 min.')}${btn('primary', 'Riprova tra 3 min')}</div>`)}
${mini('Connessione non riuscita: il campo resta neutro', `<div class="stack g12">${alert('err', 'Connessione non riuscita', 'Controlla la connessione. Se continua, riprova tra poco.')}${field({ label: 'Email', value: EMAIL, reserve: false })}${btn('primary', 'Invia il codice')}</div>`)}
</div>`, 10)),
  S('A05', () => shell(emailCard({ alertHtml: alert('ok', 'Account eliminato', 'Puoi sempre rientrare con la tua email.') }), 10)),
  S('A06', () => shell(`<div class="tavola" style="gap:12px">
${mini('Campo · focus', field({ label: 'Email', value: 'marta.conti@', focus: true, hint: 'Ti mandiamo un codice di 6 cifre.' }).replace('class="hint ', 'style="min-height:0" class="hint '))}
${mini('Bottone primario · focus', `<div style="padding:4px">${btn('primary', 'Invia il codice', { state: 'focus' })}</div>`)}
${mini('Bottone primario · premuto', btn('primary', 'Invia il codice', { state: 'pressed' }))}
${mini('Google · focus', `<div style="padding:4px">${btn('google', 'Continua con Google', { state: 'focus' })}</div>`)}
</div>`, 10)),
  S('A07', () => shell(card(`${codeHead}<div class="stack g12" style="margin-top:20px">
${field({ label: 'Codice a 6 cifre', placeholder: '······', hint: 'Non arriva? Controlla anche lo spam.', code: true })}
${btn('primary', 'Accedi')}${links(btn('link', 'Invia un nuovo codice'))}</div>`))),
  S('A08', () => shell(card(`${codeHead}<div class="stack g12" style="margin-top:20px">
${field({ label: 'Codice a 6 cifre', value: '482913', error: 'Codice non valido. Ti restano 3 tentativi.', code: true })}
${btn('primary', 'Accedi')}${links(btn('link', 'Invia un nuovo codice'))}</div>`))),
  S('A09', () => shell(`<div class="tavola" style="gap:10px">
${mini('Codice scaduto', `<div class="stack g12">${field({ label: 'Codice a 6 cifre', value: 'Codice non più valido', dead: true, error: 'Codice scaduto. Richiedi un nuovo codice.', reserve: false })}${btn('primary', 'Invia un nuovo codice')}${btn('link', 'Cambia email', { block: true })}</div>`)}
${mini('Tentativi finiti', `<div class="stack g12">${field({ label: 'Codice a 6 cifre', value: 'Codice non più valido', dead: true, error: 'Codice non valido. Hai finito i tentativi: richiedi un nuovo codice.' })}${btn('primary', 'Invia un nuovo codice')}${btn('link', 'Cambia email', { block: true })}</div>`)}
</div>`, 6)),
  S('A10', () => shell(`<div class="tavola" style="gap:12px">
${mini('Verifica in corso', `<div class="stack g12">${field({ label: 'Codice a 6 cifre', value: '482913', busy: true, code: true, reserve: false })}${btn('primary', 'Verifica…', { busy: true })}</div>`)}
${mini('Reinvio in corso: l\'etichetta cambia solo sul link', `<div class="stack g12">${alert('ok', '', 'Nuovo codice inviato.')}<div class="row" style="justify-content:space-between">${btn('link', 'Invio…', { busy: true })}${btn('link', 'Cambia email')}</div></div>`)}
${mini('Troppe richieste (429): il primario resta pieno', `<div class="stack g12">${alert('warn', 'Hai fatto troppe richieste', 'Riprova tra 2 min.')}${btn('primary', 'Riprova tra 2 min')}</div>`)}
</div>`, 10)),
  S('A11', () => shell(emptyPage({ icon: 'wifi-slash', title: 'Connessione non riuscita', text: 'Controlla la connessione. Se continua, riprova tra poco.', actions: btn('primary', 'Riprova', { icon: 'arrow-clockwise' }) + btn('secondary', 'Vai alla pagina iniziale') }), 48)),
  S('A12', () => shell(emptyPage({ icon: 'compass', title: 'Pagina non trovata', text: 'Controlla il link, oppure avvicina di nuovo il telefono al tag.', actions: btn('primary', 'Vai alla pagina iniziale') }), 48)),
];
