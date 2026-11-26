// Cattura della sezione CLIENTE (nome, scan, visita, richiesta, profilo, storico, elimina account).
// Uso:  STAGE=name,scan node design-review/scripts/capture-cliente.mjs   (senza STAGE = tutto)
// Ambiente: vedi 02-capture-env.md e 03-capture-cliente.md. Nessun PNG viene aperto da questo script.
import {
  BASE, VENUES, browser as _b, launch, newPage, shot, step, kfocus, pressDown, pressRelease, json, sleep, sql,
  session, waitCooldown, lastCode, wrongCode, holdThenContinue, holdThenAbort, setStamps, setWallet, newPending, manifest, writeManifest, cardWhere,
} from './capture-lib.mjs'

const STAGES = (process.env.STAGE ?? 'name,scan,visit,request,profile,history,delete,member').split(',')
const on = (s) => STAGES.includes(s)
await launch()
const R = 'cliente'
const menuBtn = (p) => p.locator('button[aria-label="Menu"]')
const backBtn = (p) => p.locator('button[aria-label="Indietro"]')
const ok = (extra) => (r) => r.fulfill(extra)

const THEMES = ['light', 'dark']

// ───────────── /name ─────────────
if (on('name')) for (const T of THEMES) await step(T, 'name', async () => {
  const mk = async () => { const x = await newPage(T, 'senza.nome@stampy.test'); await x.page.goto(`${BASE}/name`); await x.page.waitForSelector('#display-name'); return x }
  let { ctx, page } = await mk()
  await shot(page, T, R, 'name__vuoto') // anche input nome default e «Continua» disabled
  await page.keyboard.press('Tab'); await page.locator('#display-name').focus()
  await shot(page, T, R, 'name__input-focus')
  await page.fill('#display-name', 'Gianni Verdi')
  await shot(page, T, R, 'name__compilato') // anche «Continua» abilitato
  await kfocus(page, page.locator('button[type=submit]'))
  await shot(page, T, R, 'name__bottone-continua-focus')
  await pressDown(page, page.locator('button[type=submit]'))
  await shot(page, T, R, 'name__bottone-continua-pressed')
  await pressRelease(page)
  await page.fill('#display-name', 'A'); await page.click('button[type=submit]')
  await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'name__errore-troppo-corto') // anche input invalido (is-invalid)
  await page.fill('#display-name', 'x'.repeat(60)); await page.click('button[type=submit]')
  await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'name__errore-troppo-lungo')
  await page.fill('#display-name', 'Bartolomeomassimilianoalessandrogiovanniferdinando')
  await shot(page, T, R, 'name__nome-lungo-50-caratteri')
  await ctx.close()
  // salvataggio in corso (la richiesta non arriva mai al backend: abort dopo l'attesa)
  ;({ ctx, page } = await mk())
  await page.route('**/api/auth/me', (r) => (r.request().method() === 'PATCH' ? holdThenAbort(7000)(r) : r.continue()))
  await page.fill('#display-name', 'Gianni Verdi'); await page.click('button[type=submit]')
  await page.waitForSelector('text=Salvo…')
  await shot(page, T, R, 'name__salvataggio-in-corso', { o: 'S' })
  await ctx.close()
  ;({ ctx, page } = await mk())
  await page.route('**/api/auth/me', (r) => r.request().method() === 'PATCH'
    ? r.fulfill(json(429, { error: 'TooManyRequests', message: 'x', retryAfterSeconds: 30 }, { 'Retry-After': '30' })) : r.continue())
  await page.fill('#display-name', 'Gianni Verdi'); await page.click('button[type=submit]')
  await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'name__errore-429', { o: 'S' })
  await ctx.close()
  ;({ ctx, page } = await mk())
  await page.route('**/api/auth/me', (r) => r.request().method() === 'PATCH' ? r.abort() : r.continue())
  await page.fill('#display-name', 'Gianni Verdi'); await page.click('button[type=submit]')
  await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'name__errore-generico', { o: 'S' })
  await ctx.close()
})

// ───────────── /scan ─────────────
if (on('scan')) for (const T of THEMES) await step(T, 'scan', async () => {
  const { ctx, page } = await newPage(T, 'lorenzo.fontana@stampy.test')
  await page.goto(`${BASE}/scan`); await page.waitForSelector('h1')
  await shot(page, T, R, 'scan__default')
  await kfocus(page, menuBtn(page)); await shot(page, T, R, 'scan__bottone-menu-focus')
  await pressDown(page, menuBtn(page)); await shot(page, T, R, 'scan__bottone-menu-pressed'); await pressRelease(page)
  await page.mouse.move(200, 400)
  await menuBtn(page).click()
  await page.waitForSelector('#app-menu')
  await shot(page, T, R, 'scan__menu-aperto', { full: false })
  await page.keyboard.press('Tab')
  await shot(page, T, R, 'scan__menu-voce-focus', { full: false })
  await ctx.close()
})

// ───────────── /v/:id ─────────────
if (on('visit')) for (const T of THEMES) await step(T, 'visit', async () => {
  const email = 'simone.deluca@stampy.test'
  const V = T === 'light' ? VENUES.rossi : VENUES.gennaro
  // pulizia per le riesecuzioni: niente richieste pendenti sulle card di Simone
  sql(`update stamp_requests set status='expired', resolved_at=now() where status='pending' and card_id in (select id from cards where user_id=(select id from users where email='${email}'))`)
  // caricamento (la visita è reale: crea la card)
  let { ctx, page } = await newPage(T, email)
  await page.route('**/api/venues/*/visit*', holdThenContinue(3500))
  await page.goto(`${BASE}/v/${V}`, { waitUntil: 'commit' })
  await page.waitForSelector('text=Un momento…')
  await shot(page, T, R, 'visita__caricamento')
  await page.waitForSelector('text=La tua card è pronta', { timeout: 15000 })
  await shot(page, T, R, 'visita__card-pronta')
  await ctx.close()
  // card pronta, stati dei componenti
  ;({ ctx, page } = await newPage(T, email))
  ctx.on('page', (p) => p.close().catch(() => {}))
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort())
  await page.goto(`${BASE}/v/${V}`); await page.waitForSelector('text=La tua card è pronta')
  const wallet = page.locator('a:has-text("Aggiungi a Google Wallet")'), ask = page.locator('button:has-text("Richiedi il timbro")')
  await kfocus(page, wallet); await shot(page, T, R, 'visita__bottone-wallet-focus')
  await pressDown(page, wallet); await shot(page, T, R, 'visita__bottone-wallet-pressed'); await pressRelease(page)
  await kfocus(page, ask); await shot(page, T, R, 'visita__bottone-richiedi-focus')
  await pressDown(page, ask); await shot(page, T, R, 'visita__bottone-richiedi-pressed'); await pressRelease(page)
  await page.mouse.move(300, 700)
  await wallet.click(); await sleep(300)
  await shot(page, T, R, 'visita__dopo-tap-wallet') // bottoni invertiti primario/outline
  await ask.click()
  await page.waitForURL(/\/r\//)
  await page.waitForSelector('text=Richiesta inviata')
  const rid = page.url().split('/r/')[1]
  sql(`update stamp_requests set expires_at = now() + interval '7 days' where id='${rid}'`)
  await shot(page, T, R, 'richiesta__in-attesa-card-nuova')
  await ctx.close()
  // errori
  const err = async (name, mock, path = `/v/${V}`, extra) => {
    const x = await newPage(T, email)
    if (mock) await x.page.route('**/api/venues/*/visit*', mock)
    await x.page.goto(`${BASE}${path}`); await x.page.waitForSelector('.alert-danger')
    await shot(x.page, T, R, name, { o: mock ? 'S' : 'R' })
    if (extra) await extra(x.page)
    await x.ctx.close()
  }
  await err('visita__errore-link-non-valido', null, '/v/non-un-uuid')
  await err('visita__errore-locale-inesistente', null, '/v/00000000-0000-4000-8000-000000000000')
  await err('visita__errore-nessuna-promozione', ok(json(404, { error: 'PromotionNotFound', message: 'x' })))
  await err('visita__errore-429', ok(json(429, { error: 'TooManyRequests', message: 'x', retryAfterSeconds: 1500 }, { 'Retry-After': '1500' })))
  await err('visita__errore-generico', ok(json(500, { error: 'Boom', message: 'Errore interno' })), `/v/${V}`, async (p) => {
    await kfocus(p, p.locator('button:has-text("Riprova")')); await shot(p, T, R, 'visita__bottone-riprova-focus', { o: 'S' })
    await pressDown(p, p.locator('button:has-text("Riprova")')); await shot(p, T, R, 'visita__bottone-riprova-pressed', { o: 'S' }); await pressRelease(p)
  })
})

// ───────────── /r/:id ─────────────
if (on('request')) for (const T of THEMES) await step(T, 'request', async () => {
  const sofia = 'sofia.conti@stampy.test', matteo = 'matteo.ricci@stampy.test', lorenzo = 'lorenzo.fontana@stampy.test'
  const marco = await session('marco.rossi@stampy.test'), gennaro = await session('gennaro.esposito@stampy.test')
  setWallet(lorenzo, VENUES.gennaro, 'active'); setWallet(sofia, VENUES.rossi, 'active')
  const open = async (email, id, opts) => { const x = await newPage(T, email, opts); await x.page.goto(`${BASE}/r/${id}`); return x }
  const confirm = (s, venue, id, n) => s.api.post(`/api/venues/${venue}/requests/${id}/confirm`, { data: { stamps: n } }).then(async (r) => { if (!r.ok()) throw new Error('confirm ' + r.status() + ' ' + (await r.text()).slice(0, 120)) })
  const reject = (s, venue, id) => s.api.post(`/api/venues/${venue}/requests/${id}/reject`).then((r) => { if (!r.ok()) throw new Error('reject ' + r.status()) })

  // in attesa: bassa (1/10) e alta (7/10)
  setStamps(sofia, VENUES.rossi, 1); setStamps(matteo, VENUES.rossi, 7)
  let id = newPending(sofia, VENUES.rossi)
  let { ctx, page } = await open(sofia, id)
  await page.waitForSelector('text=Richiesta inviata')
  await shot(page, T, R, 'richiesta__in-attesa-1-di-10')
  await ctx.close()
  id = newPending(matteo, VENUES.rossi)
  ;({ ctx, page } = await open(matteo, id)); await page.waitForSelector('text=Richiesta inviata')
  await shot(page, T, R, 'richiesta__in-attesa-7-di-10')
  await ctx.close()
  // in attesa con promozione cambiata (simulato sulla risposta) e card piena (reale 8/8)
  ;({ ctx, page } = await newPage(T, matteo))
  await page.route('**/api/requests/*', async (r) => { const res = await r.fetch(); const b = await res.json(); r.fulfill({ response: res, json: { ...b, promotionChanged: true } }) })
  await page.goto(`${BASE}/r/${id}`); await page.waitForSelector('text=Nuova promozione')
  await shot(page, T, R, 'richiesta__in-attesa-promozione-cambiata', { o: 'S' })
  await ctx.close()
  setStamps(lorenzo, VENUES.gennaro, 8)
  id = newPending(lorenzo, VENUES.gennaro)
  ;({ ctx, page } = await open(lorenzo, id)); await page.waitForSelector('text=Premio disponibile')
  await shot(page, T, R, 'richiesta__in-attesa-card-piena')
  await ctx.close()
  // caricamento / errore / non trovata
  ;({ ctx, page } = await newPage(T, sofia))
  await page.route('**/api/requests/*', holdThenContinue(4000))
  await page.goto(`${BASE}/r/${id}`, { waitUntil: 'commit' }); await page.waitForSelector('text=Un momento…')
  await shot(page, T, R, 'richiesta__caricamento', { o: 'S' })
  await ctx.close()
  ;({ ctx, page } = await newPage(T, sofia))
  await page.route('**/api/requests/*', ok(json(403, { error: 'Forbidden', message: 'Non puoi vedere questa richiesta' })))
  await page.goto(`${BASE}/r/${id}`); await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'richiesta__errore', { o: 'S' })
  await kfocus(page, page.locator('button:has-text("Riprova")')); await shot(page, T, R, 'richiesta__bottone-riprova-focus', { o: 'S' })
  await pressDown(page, page.locator('button:has-text("Riprova")')); await shot(page, T, R, 'richiesta__bottone-riprova-pressed', { o: 'S' }); await pressRelease(page)
  await ctx.close()
  ;({ ctx, page } = await open(sofia, '00000000-0000-4000-8000-000000000000')); await page.waitForSelector('text=Richiesta non trovata')
  await shot(page, T, R, 'richiesta__non-trovata'); await ctx.close()
  ;({ ctx, page } = await open(sofia, 'non-un-uuid')); await page.waitForSelector('text=Richiesta non trovata')
  await shot(page, T, R, 'richiesta__non-trovata-id-malformato'); await ctx.close()

  // approvata con timbri (sofia 1/10, +2)
  setStamps(sofia, VENUES.rossi, 1)
  id = newPending(sofia, VENUES.rossi)
  ;({ ctx, page } = await open(sofia, id)); await page.waitForSelector('text=Richiesta inviata')
  await confirm(marco, VENUES.rossi, id, 2); await page.waitForSelector('text=Richiesta approvata!')
  await shot(page, T, R, 'richiesta__approvata-con-timbri'); await ctx.close()
  // approvata e card piena (matteo 7/10, +3)
  setStamps(matteo, VENUES.rossi, 7)
  id = newPending(matteo, VENUES.rossi)
  ;({ ctx, page } = await open(matteo, id)); await page.waitForSelector('text=Richiesta inviata')
  await confirm(marco, VENUES.rossi, id, 3); await page.waitForSelector('text=Richiesta approvata!')
  await shot(page, T, R, 'richiesta__approvata-card-piena'); await ctx.close()
  // approvata con premio + timbri (lorenzo 8/8, 3 prodotti): dialog, poi dialog chiuso, poi ricaricata
  const reward = async (n, tag) => {
    setStamps(lorenzo, VENUES.gennaro, 8)
    const rid = newPending(lorenzo, VENUES.gennaro)
    const x = await open(lorenzo, rid); await x.page.waitForSelector('text=Richiesta inviata')
    await confirm(gennaro, VENUES.gennaro, rid, n); await x.page.waitForSelector('dialog[open]')
    await shot(x.page, T, R, `richiesta__${tag}-dialog-premio`, { full: false })
    await pressDown(x.page, x.page.locator('dialog .reward-close')); await shot(x.page, T, R, `richiesta__${tag}-dialog-bottone-chiudi-pressed`, { full: false }); await pressRelease(x.page)
    await x.page.keyboard.press('Escape'); await x.page.waitForFunction(() => !document.querySelector('dialog[open]'))
    await shot(x.page, T, R, `richiesta__${tag}-dialog-chiuso`)
    await x.page.reload(); await x.page.waitForSelector('text=Richiesta approvata!')
    await shot(x.page, T, R, `richiesta__${tag}-premio-gia-visto`)
    await x.ctx.close()
  }
  await reward(3, 'approvata-premio-e-timbri')
  await reward(1, 'approvata-solo-premio')
  // rifiutata (con e senza «Richiedi di nuovo») e scaduta
  setStamps(matteo, VENUES.rossi, 7)
  for (const [kind, fn] of [['rifiutata', (rid) => reject(marco, VENUES.rossi, rid)], ['scaduta', (rid) => sql(`update stamp_requests set expires_at = now() - interval '1 minute' where id='${rid}'`)]]) {
    const rid = newPending(matteo, VENUES.rossi)
    ;({ ctx, page } = await open(matteo, rid)); await page.waitForSelector('text=Richiesta inviata')
    await fn(rid); await page.waitForSelector(kind === 'rifiutata' ? 'text=Richiesta non confermata' : 'text=Richiesta scaduta')
    await shot(page, T, R, `richiesta__${kind}-senza-locale`) // tab che non conosce il locale: solo testo
    await ctx.close()
    ;({ ctx, page } = await newPage(T, matteo, { init: { fn: ([k, v]) => sessionStorage.setItem(k, JSON.stringify(v)), arg: [`stampy.request.${rid}`, VENUES.rossi] } }))
    await page.goto(`${BASE}/r/${rid}`); await page.waitForSelector('button:has-text("Richiedi di nuovo")')
    await shot(page, T, R, `richiesta__${kind}-con-richiedi-di-nuovo`)
    if (kind === 'rifiutata') {
      await kfocus(page, page.locator('button:has-text("Richiedi di nuovo")')); await shot(page, T, R, 'richiesta__bottone-richiedi-di-nuovo-focus')
      await pressDown(page, page.locator('button:has-text("Richiedi di nuovo")')); await shot(page, T, R, 'richiesta__bottone-richiedi-di-nuovo-pressed'); await pressRelease(page)
    }
    await ctx.close()
  }
  setStamps(matteo, VENUES.rossi, 7); setStamps(sofia, VENUES.rossi, 1); setStamps(lorenzo, VENUES.gennaro, 8)
})

// ───────────── /profile ─────────────
if (on('profile')) for (const T of THEMES) await step(T, 'profile', async () => {
  const email = 'lorenzo.fontana@stampy.test'
  let { ctx, page } = await newPage(T, email)
  await page.goto(`${BASE}/profile`); await page.waitForSelector('text=Zona pericolosa'); await page.waitForSelector('text=Storico richieste')
  await shot(page, T, R, 'profilo__default')
  await kfocus(page, page.locator('button:has-text("Modifica nome")')); await shot(page, T, R, 'profilo__bottone-modifica-nome-focus')
  await pressDown(page, page.locator('button:has-text("Modifica nome")')); await shot(page, T, R, 'profilo__bottone-modifica-nome-pressed'); await pressRelease(page)
  const row = page.locator('.profile-row')
  await kfocus(page, row); await shot(page, T, R, 'profilo__riga-storico-focus')
  await pressDown(page, row); await shot(page, T, R, 'profilo__riga-storico-pressed'); await pressRelease(page)
  await kfocus(page, page.locator('button[aria-label="Aggiungi a Google Wallet"]')); await shot(page, T, R, 'profilo__bottone-wallet-modello-focus')
  await kfocus(page, page.locator('a:has-text("Elimina account")')); await shot(page, T, R, 'profilo__bottone-elimina-focus')
  await pressDown(page, page.locator('a:has-text("Elimina account")')); await shot(page, T, R, 'profilo__bottone-elimina-pressed'); await pressRelease(page)
  await kfocus(page, menuBtn(page)); await page.mouse.move(300, 500)
  await menuBtn(page).click(); await page.waitForSelector('#app-menu')
  await shot(page, T, R, 'profilo__menu-aperto', { full: false }) // voce «Profilo» attiva
  await menuBtn(page).click()
  // forma «modifica nome»
  await page.click('button:has-text("Modifica nome")'); await page.waitForSelector('#display-name')
  await shot(page, T, R, 'profilo__modifica-nome-aperto') // campo con focus + «Annulla»
  await kfocus(page, page.locator('button:has-text("Annulla")')); await shot(page, T, R, 'profilo__bottone-annulla-focus')
  await page.fill('#display-name', ''); await shot(page, T, R, 'profilo__modifica-nome-vuoto') // «Salva» disabled
  await page.fill('#display-name', 'A'); await page.click('form button[type=submit]'); await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'profilo__modifica-nome-invalido')
  await ctx.close()
  // salvataggio in corso / errore
  ;({ ctx, page } = await newPage(T, email))
  await page.route('**/api/auth/me', (r) => (r.request().method() === 'PATCH' ? holdThenAbort(7000)(r) : r.continue()))
  await page.goto(`${BASE}/profile`); await page.click('button:has-text("Modifica nome")'); await page.fill('#display-name', 'Lorenzo F.'); await page.click('form button[type=submit]')
  await page.waitForSelector('text=Salvo…'); await shot(page, T, R, 'profilo__modifica-nome-salvataggio-in-corso', { o: 'S' })
  await ctx.close()
  ;({ ctx, page } = await newPage(T, email))
  await page.route('**/api/auth/me', (r) => r.request().method() === 'PATCH' ? r.fulfill(json(400, { error: 'ValidationError', message: 'x', details: [] })) : r.continue())
  await page.goto(`${BASE}/profile`); await page.click('button:has-text("Modifica nome")'); await page.fill('#display-name', 'Lorenzo F.'); await page.click('form button[type=submit]')
  await page.waitForSelector('.alert-danger'); await shot(page, T, R, 'profilo__modifica-nome-errore-server', { o: 'S' })
  await ctx.close()
  // ruoli non ancora noti (caricamento di /venues/mine)
  ;({ ctx, page } = await newPage(T, email))
  await page.route('**/api/venues/mine', holdThenContinue(5000))
  await page.goto(`${BASE}/profile`, { waitUntil: 'commit' }); await page.waitForSelector('text=Zona pericolosa')
  await shot(page, T, R, 'profilo__caricamento-ruoli', { o: 'S' }) // senza riga storico, «Elimina account» già offerto
  await ctx.close()
  // tasto Indietro (arrivando da /scan) e nome lungo
  ;({ ctx, page } = await newPage(T, email))
  await page.goto(`${BASE}/scan`); await page.waitForSelector('h1')
  await menuBtn(page).click(); await page.click('a:has-text("Profilo")'); await page.waitForSelector('text=Zona pericolosa')
  await page.mouse.move(300, 600)
  await kfocus(page, backBtn(page)); await shot(page, T, R, 'profilo__bottone-indietro-focus')
  await pressDown(page, backBtn(page)); await shot(page, T, R, 'profilo__bottone-indietro-pressed'); await pressRelease(page)
  await ctx.close()
  ;({ ctx, page } = await newPage(T, 'nome.molto.lungo.per.provare.il.layout.del.profilo@stampy.test'))
  await page.goto(`${BASE}/profile`); await page.waitForSelector('text=Zona pericolosa')
  await shot(page, T, R, 'profilo__nome-ed-email-lunghi')
  await ctx.close()
  if (T === 'light' || T === 'dark') { // variante telefono stretto: bottone Google Wallet condensato (<380px)
    ;({ ctx, page } = await newPage(T, email, { width: 360, height: 740 }))
    await page.goto(`${BASE}/profile`); await page.waitForSelector('text=Zona pericolosa')
    await shot(page, T, R, 'profilo__viewport-360-wallet-condensato')
    await ctx.close()
  }
})

// ───────────── /history ─────────────
if (on('history')) for (const T of THEMES) await step(T, 'history', async () => {
  const email = 'lorenzo.fontana@stampy.test'
  // dati: richieste varie (la pendente di Lorenzo @ Fiordilatte è già nel DB)
  const go = async (qs = '', mock, who = email) => {
    const x = await newPage(T, who); if (mock) await mock(x.page)
    await x.page.goto(`${BASE}/history${qs}`); return x
  }
  let { ctx, page } = await go(); await page.waitForSelector('text=richieste')
  await shot(page, T, R, 'storico__default')
  await page.mouse.move(300, 500)
  await kfocus(page, backBtn(page)); await shot(page, T, R, 'storico__bottone-indietro-focus')
  await kfocus(page, page.locator('.filter-toggle')); await shot(page, T, R, 'storico__bottone-filtri-focus')
  await pressDown(page, page.locator('.filter-toggle')); await shot(page, T, R, 'storico__bottone-filtri-pressed'); await pressRelease(page)
  await page.click('.filter-toggle'); await page.mouse.move(300, 760)
  await shot(page, T, R, 'storico__filtri-aperti') // select Esito, Min/Max, Dal/Al in stato default
  await kfocus(page, page.locator('#h-status')); await shot(page, T, R, 'storico__select-esito-focus')
  await kfocus(page, page.locator('#h-min')); await shot(page, T, R, 'storico__input-min-focus')
  await kfocus(page, page.locator('#h-from')); await shot(page, T, R, 'storico__input-data-focus')
  await page.selectOption('#h-status', 'approved'); await page.waitForURL(/status=approved/); await sleep(600)
  await shot(page, T, R, 'storico__filtro-esito-attivo') // «Azzera» visibile
  await kfocus(page, page.locator('.filter-reset')); await shot(page, T, R, 'storico__bottone-azzera-focus')
  await pressDown(page, page.locator('.filter-reset')); await shot(page, T, R, 'storico__bottone-azzera-pressed'); await pressRelease(page)
  await page.fill('#h-min', 'abc'); await sleep(600)
  await shot(page, T, R, 'storico__errore-timbri-non-numerici')
  await ctx.close()
  ;({ ctx, page } = await go('?status=pending&minStamps=50')); await page.waitForSelector('text=Nessuna richiesta trovata')
  await shot(page, T, R, 'storico__vuoto-con-filtri'); await ctx.close()
  ;({ ctx, page } = await go('?minStamps=5&maxStamps=2')); await page.waitForSelector('text=⚠')
  await shot(page, T, R, 'storico__errore-min-maggiore-max'); await ctx.close()
  ;({ ctx, page } = await go('?from=2026-11-20&to=2026-11-10')); await page.waitForSelector('text=⚠')
  await shot(page, T, R, 'storico__errore-date-incoerenti'); await ctx.close()
  ;({ ctx, page } = await go('?from=2099-01-01')); await page.waitForSelector('text=⚠')
  await shot(page, T, R, 'storico__errore-data-nel-futuro'); await ctx.close()
  ;({ ctx, page } = await go('', null, 'vuoto.storico@stampy.test')); await page.waitForSelector('text=Nessuna richiesta trovata')
  await shot(page, T, R, 'storico__vuoto'); await ctx.close()
  ;({ ctx, page } = await go('', (p) => p.route('**/api/requests/mine*', holdThenContinue(4000))))
  await page.waitForSelector('text=Caricamento…'); await shot(page, T, R, 'storico__caricamento', { o: 'S' }); await ctx.close()
  ;({ ctx, page } = await go('', (p) => p.route('**/api/requests/mine*', ok(json(500, { error: 'Boom', message: 'Errore interno' })))))
  await page.waitForSelector('.alert-danger'); await shot(page, T, R, 'storico__errore', { o: 'S' }); await ctx.close()
  // dati lunghi: nome del locale molto lungo (rinomina temporanea nel DB del worktree, poi ripristinata)
  const orig = sql(`select name from venues where id='${VENUES.fiordilatte}'`)
  try {
    sql(`update venues set name='Gelateria Artigianale Fiordilatte di Montagna e Valle dei Mille Sapori e Delizie' where id='${VENUES.fiordilatte}'`)
    ;({ ctx, page } = await go()); await page.waitForSelector('text=richieste')
    await shot(page, T, R, 'storico__dati-lunghi-nome-locale'); await ctx.close()
  } finally { sql(`update venues set name='${orig.replace(/'/g, "''")}' where id='${VENUES.fiordilatte}'`) }
})

// ───────────── /account/delete ─────────────
if (on('delete')) for (const T of THEMES) await step(T, 'delete', async () => {
  const email = T === 'light' ? 'valentina.rizzo@stampy.test' : 'andrea.lombardi@stampy.test'
  const go = async (mock) => { const x = await newPage(T, email); if (mock) await mock(x.page); await x.page.goto(`${BASE}/account/delete`); await x.page.waitForSelector('text=Elimina il tuo account'); return x }
  const REQ = '**/api/auth/account/delete/request', CONF = '**/api/auth/account/delete/confirm'
  let { ctx, page } = await go()
  await shot(page, T, R, 'elimina__intro')
  await kfocus(page, page.locator('button:has-text("Invia il codice")')); await shot(page, T, R, 'elimina__bottone-invia-focus')
  await pressDown(page, page.locator('button:has-text("Invia il codice")')); await shot(page, T, R, 'elimina__bottone-invia-pressed'); await pressRelease(page)
  await kfocus(page, page.locator('button:has-text("Annulla")')); await shot(page, T, R, 'elimina__bottone-annulla-focus')
  await ctx.close()
  ;({ ctx, page } = await go((p) => p.route(REQ, holdThenAbort(7000))))
  await page.click('button:has-text("Invia il codice")'); await page.waitForSelector('text=Invio…'); await shot(page, T, R, 'elimina__invio-in-corso', { o: 'S' }); await ctx.close()
  ;({ ctx, page } = await go((p) => p.route(REQ, (r) => r.abort())))
  await page.click('button:has-text("Invia il codice")'); await page.waitForSelector('.alert-danger'); await shot(page, T, R, 'elimina__errore-generico', { o: 'S' }); await ctx.close()
  ;({ ctx, page } = await go((p) => p.route(REQ, ok(json(429, { error: 'TooManyRequests', message: 'x', retryAfterSeconds: 125 }, { 'Retry-After': '125' })))))
  await page.click('button:has-text("Invia il codice")'); await page.waitForSelector('.alert-warning'); await shot(page, T, R, 'elimina__attesa-429', { o: 'S' }); await ctx.close()
  // flusso reale: codice (console), errori di codice reali. NON si conferma mai con il codice giusto.
  await waitCooldown(email)
  ;({ ctx, page } = await go())
  await page.click('button:has-text("Invia il codice")'); await page.waitForSelector('#code'); await sleep(500)
  const real = lastCode(email), bad = wrongCode(real)
  await shot(page, T, R, 'elimina__codice-vuoto') // anche input codice con focus, «Elimina il mio account» disabled
  await page.fill('#code', bad.slice(0, 3)); await shot(page, T, R, 'elimina__codice-parziale')
  await page.fill('#code', bad); await shot(page, T, R, 'elimina__codice-completo-non-inviato') // bottone abilitato (si invia solo al click)
  await kfocus(page, page.locator('button:has-text("Elimina il mio account")')); await shot(page, T, R, 'elimina__bottone-elimina-focus')
  await pressDown(page, page.locator('button:has-text("Elimina il mio account")')); await shot(page, T, R, 'elimina__bottone-elimina-pressed'); await pressRelease(page)
  await kfocus(page, page.locator('button:has-text("Invia un nuovo codice")')); await shot(page, T, R, 'elimina__link-nuovo-codice-focus')
  await page.click('button:has-text("Elimina il mio account")'); await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'elimina__errore-codice-non-valido') // 4 tentativi; anche input invalido
  for (let i = 0; i < 3; i++) { await page.fill('#code', bad); await page.click('button:has-text("Elimina il mio account")'); await sleep(500) }
  await shot(page, T, R, 'elimina__errore-ultimo-tentativo')
  await page.fill('#code', bad); await page.click('button:has-text("Elimina il mio account")'); await page.waitForSelector('#code:disabled')
  await shot(page, T, R, 'elimina__tentativi-finiti') // input disabled, «Invia un nuovo codice» primario
  await ctx.close()
  // codice scaduto / eliminazione in corso / reinvio: risposte simulate, la conferma NON parte mai verso il backend
  const toCode = async (mock) => { const x = await go(async (p) => { await p.route(REQ, ok(json(200, { challengeId: 'mock' }))); await mock(p) }); await x.page.click('button:has-text("Invia il codice")'); await x.page.waitForSelector('#code'); return x }
  ;({ ctx, page } = await toCode((p) => p.route(CONF, ok(json(410, { error: 'CodeExpired', message: 'x' })))))
  await page.fill('#code', '123456'); await page.click('button:has-text("Elimina il mio account")'); await page.waitForSelector('#code:disabled')
  await shot(page, T, R, 'elimina__codice-scaduto', { o: 'S' }); await ctx.close()
  ;({ ctx, page } = await toCode((p) => p.route(CONF, holdThenAbort(7000))))
  await page.fill('#code', '123456'); await page.click('button:has-text("Elimina il mio account")'); await page.waitForSelector('text=Elimino…')
  await shot(page, T, R, 'elimina__eliminazione-in-corso', { o: 'S' }); await ctx.close()
  ;({ ctx, page } = await toCode((p) => p.route(CONF, (r) => r.abort())))
  await page.fill('#code', '123456'); await page.click('button:has-text("Elimina il mio account")'); await page.waitForSelector('.alert-danger')
  await shot(page, T, R, 'elimina__errore-generico-conferma', { o: 'S' }); await ctx.close()
  ;({ ctx, page } = await toCode(async () => {}))
  await page.click('button:has-text("Invia un nuovo codice")'); await page.waitForSelector('.alert-success')
  await shot(page, T, R, 'elimina__codice-reinviato', { o: 'S' }); await ctx.close()
  // reinvio in corso e 429 sul reinvio
  let n = 0
  ;({ ctx, page } = await toCode(async (p) => { await p.unroute(REQ); await p.route(REQ, (r) => { n++; return n === 1 ? r.fulfill(json(200, { challengeId: 'mock' })) : holdThenAbort(7000)(r) }) }))
  await page.click('button:has-text("Invia un nuovo codice")'); await sleep(400)
  await shot(page, T, R, 'elimina__reinvio-in-corso', { o: 'S' }); await ctx.close()
  n = 0
  ;({ ctx, page } = await toCode(async (p) => { await p.unroute(REQ); await p.route(REQ, (r) => { n++; return n === 1 ? r.fulfill(json(200, { challengeId: 'mock' })) : r.fulfill(json(429, { error: 'TooManyRequests', message: 'x', retryAfterSeconds: 61 }, { 'Retry-After': '61' })) }) }))
  await page.click('button:has-text("Invia un nuovo codice")'); await page.waitForSelector('.alert-warning')
  await shot(page, T, R, 'elimina__attesa-429-reinvio', { o: 'S' }); await ctx.close()
})

// ───────────── variante membro (proprietario/staff) dalle schermate del cliente ─────────────
if (on('member')) for (const T of THEMES) await step(T, 'member', async () => {
  const email = 'marco.rossi@stampy.test'
  let { ctx, page } = await newPage(T, email)
  await page.goto(`${BASE}/profile`); await page.waitForSelector('text=Questo account gestisce un locale')
  await shot(page, T, 'membro', 'profilo__default')
  await ctx.close()
  ;({ ctx, page } = await newPage(T, email))
  await page.goto(`${BASE}/account/delete`); await page.waitForSelector('.alert-warning')
  await shot(page, T, 'membro', 'elimina__bloccato')
  await ctx.close()
})

await writeManifest({ suffix: process.env.STAGE ? '-' + process.env.STAGE.replace(/,/g, '_') : '' })
console.log(`\ncatturati ${manifest.captured.length}, falliti ${manifest.failed.length}`)
for (const f of manifest.failed) console.log(' ✘', f.name, '—', f.reason)
process.exit(0)
