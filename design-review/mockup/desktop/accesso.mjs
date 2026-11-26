// Desktop · Accesso (1440×900). D37 a: card 480 centrata (come il tablet). Schermate del tablet riusate + quelle che sul tablet erano dedotte.
import { MODE, ic, btn, field, card, alert, mini, headerW, EMAIL } from '../tablet/lib-t.mjs';
import { emptyPage } from '../lib/lib.mjs';
import { screens as T } from '../tablet/accesso.mjs';
MODE.desk = true;
const D = (s, o = {}) => ({ ...s, W: 1440, H: 900, prefix: 'Desktop', flow: 'accesso', ...o });
const S = (o) => D({ backend: 'no', isNew: 'no', ...o });
const centered = (inner, top) => `${headerW({ kind: 'anon' })}<div class="pagew" style="justify-content:${top ? 'flex-start' : 'center'};${top ? 'padding-top:48px' : 'padding-bottom:64px'}"><div class="wrap col480">${inner}</div></div>`;
const oppure = `<div class="row" style="gap:12px"><span class="sep grow"></span><span class="muted t-small">oppure</span><span class="sep grow"></span></div>`;
const privacy = `<p class="privacy">Usiamo la tua email solo per farti entrare.<br><a>Leggi l'informativa sulla privacy</a></p>`;
const loginCard = (f) => card(`<div class="stack g16"><h1 class="t-title w">Accedi</h1><p class="lede">Ti mandiamo un codice via email. Niente password.</p>${f}${btn('primary', 'Invia il codice')}${oppure}${btn('google', 'Continua con Google')}${privacy}</div>`, 'cardc');
const codeHead = `<h1 class="t-title w">Inserisci il codice</h1><p class="lede">Abbiamo scritto a <b>${EMAIL}</b>. Il codice vale 5 minuti.</p>`;
const links = `<div class="row" style="justify-content:space-between;flex-wrap:wrap">${btn('link', 'Invia un nuovo codice')}${btn('link', 'Cambia email')}</div>`;
const stack = (a) => `<div class="tav1" style="gap:20px">${a}</div>`;
export const screens = [
  ...T.map(s => D(s, { render: (t) => ({ ...s.render(t), clip: true }) })),
  S({ id: 'A03', name: 'Login email', state: 'errore: email non valida', src: 'A03', changes: 'card 480 centrata; l\'errore sostituisce il suggerimento nella riga riservata', render: () => ({ inner: centered(loginCard(field({ label: 'Email', value: 'marta.conti@esempio', error: 'Controlla l\'indirizzo: manca la @ o il dominio.' }))) }) }),
  S({ id: 'A08', name: 'Codice', state: 'errore: codice non valido', src: 'A08', changes: 'card 480 centrata', render: () => ({ inner: centered(card(`<div class="stack g16">${codeHead}${field({ label: 'Codice a 6 cifre', value: '482913', error: 'Codice non valido. Ti restano 3 tentativi.', code: true })}${btn('primary', 'Accedi')}${links}</div>`, 'cardc')) }) }),
  S({ id: 'A09', name: 'Codice', state: 'tavola: codice scaduto / tentativi finiti', src: 'A09', changes: 'due card impilate da 480', render: () => ({ inner: centered(stack(
    mini('Codice scaduto', card(`<div class="stack g16">${field({ label: 'Codice a 6 cifre', value: 'Codice non più valido', dead: true, error: 'Codice scaduto. Richiedi un nuovo codice.', reserve: false })}${btn('primary', 'Invia un nuovo codice')}${btn('link', 'Cambia email', { block: true })}</div>`, 'cardc')) +
    mini('Tentativi finiti', card(`<div class="stack g16">${field({ label: 'Codice a 6 cifre', value: 'Codice non più valido', dead: true, error: 'Codice non valido. Hai finito i tentativi: richiedi un nuovo codice.', reserve: false })}${btn('primary', 'Invia un nuovo codice')}${btn('link', 'Cambia email', { block: true })}</div>`, 'cardc'))), true) }) }),
  S({ id: 'A11', name: 'Errore di sessione', state: 'default', src: 'A11', changes: 'card 480 centrata (stati vuoti: max 480, §4.3)', render: () => ({ inner: centered(card(emptyPage({ icon: 'wifi-slash', title: 'Connessione non riuscita', text: 'Controlla la connessione. Se continua, riprova tra poco.', actions: btn('primary', 'Riprova', { icon: 'arrow-clockwise' }) + btn('secondary', 'Vai alla pagina iniziale') }), 'cardc')) }) }),
  S({ id: 'A12', name: 'Pagina non trovata (404)', state: 'default', src: 'A12', changes: 'card 480 centrata', render: () => ({ inner: centered(card(emptyPage({ icon: 'compass', title: 'Pagina non trovata', text: 'Controlla il link, oppure avvicina di nuovo il telefono al tag.', actions: btn('primary', 'Vai alla pagina iniziale') }), 'cardc')) }) }),
];
