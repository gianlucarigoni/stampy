// Tablet · Accesso (anonimo): A01 login, A07 codice, A04 errori di sistema. 820x1180. Card 480 centrata (50 §3.1).
import { ic, btn, field, chip, card, alert, mini, headerW, EMAIL } from './lib-t.mjs';
const S = (o) => ({ flow: 'accesso', W: 820, H: 1180, ...o });
const centered = (inner) => `${headerW({ kind: 'anon' })}<div class="pagew" style="justify-content:center;padding-bottom:64px"><div class="wrap col480">${inner}</div></div>`;
const oppure = `<div class="row" style="gap:12px"><span class="sep grow"></span><span class="muted t-small">oppure</span><span class="sep grow"></span></div>`;
const privacy = `<p class="privacy">Usiamo la tua email solo per farti entrare.<br><a>Leggi l'informativa sulla privacy</a></p>`;
const login = `<div class="stack g16"><h1 class="t-title w">Accedi</h1><p class="lede">Ti mandiamo un codice via email. Niente password.</p>
${field({ label: 'Email', placeholder: 'nome@esempio.it', hint: 'Ti mandiamo un codice di 6 cifre.' })}${btn('primary', 'Invia il codice')}${oppure}${btn('google', 'Continua con Google')}${privacy}</div>`;
const codeCard = `<div class="stack g16"><h1 class="t-title w">Inserisci il codice</h1><p class="lede">Abbiamo scritto a <b>${EMAIL}</b>. Il codice vale 5 minuti.</p>
${field({ label: 'Codice a 6 cifre', placeholder: '······', hint: 'Non arriva? Controlla anche lo spam.', code: true })}${btn('primary', 'Accedi')}
<div class="row" style="justify-content:space-between;flex-wrap:wrap">${btn('link', 'Invia un nuovo codice')}${btn('link', 'Cambia email')}</div></div>`;
export const screens = [
  S({ id: 'A01', name: 'Login email', state: 'vuoto', src: 'A01', changes: 'card 480 centrata in orizzontale e in verticale; header solo wordmark; titolo 32', backend: 'no', isNew: 'no', render: () => ({ inner: centered(card(login, 'cardc')) }) }),
  S({ id: 'A07', name: 'Codice', state: 'vuoto', src: 'A07', changes: 'stessa card 480 centrata; campo codice 52 (Unbounded 28); link sulla stessa riga', backend: 'no', isNew: 'no', render: () => ({ inner: centered(card(codeCard, 'cardc')) }) }),
  S({ id: 'A04', name: 'Login email', state: 'tavola: errori di sistema (429, rete)', src: 'A04', changes: 'le due card impilate con la stessa larghezza (non affiancate: sono alternative)', backend: 'no', isNew: 'no', render: () => ({ inner: `${headerW({ kind: 'anon' })}<div class="pagew" style="padding-top:48px"><div class="wrap col480"><div class="tav1" style="gap:20px">
${mini('Troppe richieste (429)', card(`<div class="stack g16">${alert('warn', 'Hai fatto troppe richieste', 'Riprova tra 3 min.')}${btn('primary', 'Riprova tra 3 min')}</div>`, 'cardc'))}
${mini('Connessione non riuscita: il campo resta neutro', card(`<div class="stack g16">${alert('err', 'Connessione non riuscita', 'Controlla la connessione. Se continua, riprova tra poco.')}${field({ label: 'Email', value: EMAIL, reserve: false })}${btn('primary', 'Invia il codice')}</div>`, 'cardc'))}
</div></div></div>` }) }),
];
