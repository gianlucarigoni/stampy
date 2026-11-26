// Cattura della sezione STAFF (elenco locali, coda, esiti, errori, menu, storico del locale, profilo).
// Uso:  STAGE=locali,storico node design-review/scripts/capture-staff.mjs   (senza STAGE = tutto)
// Variabili: WT, DB, DEV_LOG, E2E_APP_URL, OUT (cartella radice: .../screens/staff). Nessun PNG viene aperto.
import {
  BASE, VENUES, launch, newPage, shot, step, kfocus, pressDown, pressRelease, json, sleep, sql,
  session, holdThenContinue, holdThenAbort, setStamps, newPending, manifest, writeManifest,
} from './capture-lib.mjs'

const STAGES = (process.env.STAGE ?? 'locali,storico,profilo,coda,esiti,errori,menu,dati').split(',')
const on = (s) => STAGES.includes(s)
await launch()
const R = 'staff'
const THEMES = ['light', 'dark']
const ROSSI = VENUES.rossi
const FIORD = VENUES.fiordilatte
const GENN = VENUES.gennaro
const E = {
  giulia: 'giulia.bianchi@stampy.test', // staff, 2 locali (Rossi + Fiordilatte)
  luca: 'luca.ferri@stampy.test', // staff, Rossi
  marco: 'marco.rossi@stampy.test', // proprietario, Rossi
  elena: 'elena.greco@stampy.test', // staff, Fiordilatte
}
const C = { sofia: 'sofia.conti@stampy.test', lorenzo: 'lorenzo.fontana@stampy.test', matteo: 'matteo.ricci@stampy.test' }
const menuBtn = (p) => p.locator('button[aria-label="Menu"]')
const backBtn = (p) => p.locator('button[aria-label="Indietro"]')
const QUEUE_GET = (u) => /\/api\/venues\/[^/]+\/requests(\?.*)?$/.test(new URL(u).pathname + new URL(u).search)
const MINE = '**/api/venues/mine'
const LONG_NAME = 'Bar Pasticceria Gelateria Rossi & Figli dal 1962 di Marco Rossi e Famiglia'
const notes = []
const note = (s) => { notes.push(s); console.log('·', s) }

// ───────── dati di scena (SOLO DB del worktree) ─────────
const currentPromo = (v) => `(select id from promotions where venue_id='${v}' and ends_at is null)`
// Coda del locale: tutte le `pending` del locale vengono sostituite da quelle indicate ([email, timbri?]).
// Scadenza +4 minuti: «scade tra 4 min» è realistico (le catture durano pochi secondi per scena).
function seedQ(venue, specs, interval = '4 minutes') {
  sql(`delete from stamp_requests where status='pending' and venue_id='${venue}'`)
  sql(`update cards set promotion_id=${currentPromo(venue)} where venue_id='${venue}'`)
  for (const [email, n] of specs) {
    if (n != null) setStamps(email, venue, n)
    newPending(email, venue, interval)
  }
}
const Q3 = [[C.sofia, 1], [C.lorenzo, 5], [C.matteo, 7]]
const rossiEmails = () =>
  sql(`select u.email from cards c join users u on u.id=c.user_id where c.venue_id='${ROSSI}' order by u.email`).split('\n')
const oldPromo = () => sql(`select id from promotions where venue_id='${ROSSI}' and name like '%(vecchia)'`)
const withName = async (venue, name, fn) => {
  const prev = sql(`select name from venues where id='${venue}'`)
  sql(`update venues set name='${name.replace(/'/g, "''")}' where id='${venue}'`)
  try { await fn() } finally { sql(`update venues set name='${prev.replace(/'/g, "''")}' where id='${venue}'`) }
}

// ───────── helpers di pagina ─────────
async function openQueue(T, email, venue = ROSSI, { init, pre, waitName = true } = {}) {
  const x = await newPage(T, email)
  if (pre) await pre(x.page)
  await x.page.goto(`${BASE}/staff/${venue}`)
  await x.page.waitForSelector('article, p.card.card-body', { timeout: 12000 })
  if (waitName) await x.page.waitForFunction(() => document.querySelector('h1')?.textContent?.trim() !== 'Richieste')
  await x.page.waitForTimeout(300)
  return x
}
const art = (p, i = 0) => p.locator('article.card').nth(i)
const confirmBtn = (p, i = 0) => art(p, i).getByRole('button', { name: /^Conferma / })
const rejectBtn = (p, i = 0) => art(p, i).getByRole('button', { name: /^Rifiuta / })
const plusBtn = (p, i = 0) => art(p, i).locator('button[aria-label^="Un prodotto in più"]')
const minusBtn = (p, i = 0) => art(p, i).locator('button[aria-label^="Un prodotto in meno"]')
const qty = (p, i = 0) => art(p, i).locator('input.quantity-input')
const mainText = (p) => p.locator('main').innerText().catch(() => '')

for (const T of THEMES) {
  // ───────────────────────────── /staff · I tuoi locali ─────────────────────────────
  if (on('locali')) {
    const open = async (email = E.giulia, pre) => {
      const x = await newPage(T, email)
      if (pre) await pre(x.page)
      await x.page.goto(`${BASE}/staff`)
      return x
    }
    await step(T, 'locali', async () => {
      let { ctx, page } = await open()
      await page.waitForSelector('h1:has-text("I tuoi locali")')
      await shot(page, T, R, 'locali__default')
      await kfocus(page, page.locator('a.btn-outline-primary').first())
      await shot(page, T, R, 'locali__bottone-locale-focus')
      await pressDown(page, page.locator('a.btn-outline-primary').nth(1)); await shot(page, T, R, 'locali__bottone-locale-pressed'); await pressRelease(page)
      await page.mouse.move(300, 600)
      await kfocus(page, menuBtn(page)); await shot(page, T, R, 'locali__bottone-menu-focus')
      await pressDown(page, menuBtn(page)); await shot(page, T, R, 'locali__bottone-menu-pressed'); await pressRelease(page)
      await menuBtn(page).click(); await page.waitForSelector('#app-menu')
      await shot(page, T, R, 'locali__menu-aperto', { full: false }) // solo Profilo + Esci (niente «Cambia locale» sull'elenco)
      await page.locator('#app-menu a').first().focus(); await shot(page, T, R, 'locali__menu-voce-focus', { full: false })
      await ctx.close()
      // caricamento (risposta reale ritardata)
      ;({ ctx, page } = await open(E.giulia, (p) => p.route(MINE, holdThenContinue(3500))))
      await page.waitForSelector('text=Caricamento…')
      await shot(page, T, R, 'locali__caricamento', { o: 'R' })
      await ctx.close()
      // errore + Riprova (rete interrotta)
      ;({ ctx, page } = await open(E.giulia, (p) => p.route(MINE, (r) => r.abort())))
      await page.waitForSelector('.alert-danger')
      await shot(page, T, R, 'locali__errore', { o: 'S' })
      await kfocus(page, page.locator('button:has-text("Riprova")')); await shot(page, T, R, 'locali__bottone-riprova-focus', { o: 'S' })
      await pressDown(page, page.locator('button:has-text("Riprova")')); await shot(page, T, R, 'locali__bottone-riprova-pressed', { o: 'S' }); await pressRelease(page)
      await ctx.close()
      // nome lungo
      await withName(FIORD, LONG_NAME, async () => {
        ;({ ctx, page } = await open())
        await page.waitForSelector('h1:has-text("I tuoi locali")')
        await shot(page, T, R, 'locali__nome-locale-lungo')
        await ctx.close()
      })
      // tre locali (giulia aggiunta a Da Gennaro solo per questa scena)
      const gid = sql(`select id from users where email='${E.giulia}'`)
      sql(`insert into venue_members (user_id, venue_id, role) values ('${gid}','${GENN}','staff') on conflict do nothing`)
      try {
        ;({ ctx, page } = await open())
        await page.waitForSelector('h1:has-text("I tuoi locali")')
        await shot(page, T, R, 'locali__tre-locali')
        await ctx.close()
      } finally { sql(`delete from venue_members where user_id='${gid}' and venue_id='${GENN}'`) }
    })
  }

  // ───────────────────────────── Storico del locale ─────────────────────────────
  if (on('storico')) await step(T, 'storico', async () => {
    seedQ(ROSSI, Q3) // 3 «In attesa» nello storico (stato esclusivo dello staff)
    const hist = async (email = E.luca, venue = ROSSI, query = '', pre) => {
      const x = await newPage(T, email)
      if (pre) await pre(x.page)
      await x.page.goto(`${BASE}/staff/${venue}/history${query}`)
      await x.page.waitForSelector('h1:has-text("Storico richieste")')
      await x.page.waitForSelector('ul.list-unstyled li, p.card.card-body', { timeout: 12000 }).catch(() => {})
      await x.page.waitForTimeout(300)
      return x
    }
    let { ctx, page } = await hist()
    await shot(page, T, R, 'storico__default')
    note(`storico staff, righe: ${await page.locator('ul.list-unstyled li').count()}`)
    await kfocus(page, backBtn(page)); await shot(page, T, R, 'storico__bottone-indietro-focus')
    await pressDown(page, backBtn(page)); await shot(page, T, R, 'storico__bottone-indietro-pressed'); await pressRelease(page)
    await page.mouse.move(300, 600)
    await menuBtn(page).click(); await page.waitForSelector('#app-menu')
    await shot(page, T, R, 'storico__menu-aperto', { full: false }) // voce «Storico richieste» attiva
    await menuBtn(page).click()
    await page.locator('button.filter-toggle').click()
    await page.waitForSelector('#h-panel', { state: 'visible' })
    await shot(page, T, R, 'storico__filtri-aperti')
    await ctx.close()
    ;({ ctx, page } = await hist(E.luca, ROSSI, '?status=pending'))
    await page.locator('button.filter-toggle').click(); await page.waitForTimeout(200)
    await shot(page, T, R, 'storico__filtro-in-attesa') // righe «… In attesa» + «Azzera»
    await ctx.close()
    ;({ ctx, page } = await hist(E.luca, ROSSI, '?status=approved'))
    await shot(page, T, R, 'storico__filtro-esito-approvate')
    await ctx.close()
    ;({ ctx, page } = await hist(E.luca, ROSSI, '?minStamps=50'))
    await shot(page, T, R, 'storico__vuoto-con-filtri')
    await ctx.close()
    // non autorizzato: lo staff di Rossi apre lo storico di Fiordilatte (risposta VERA del backend)
    ;({ ctx, page } = await newPage(T, E.luca))
    await page.goto(`${BASE}/staff/${FIORD}/history`)
    await page.waitForTimeout(2500)
    await shot(page, T, R, 'storico__non-autorizzato-altro-locale')
    note(`storico altro locale, testo: ${(await mainText(page)).replace(/\s+/g, ' ').slice(0, 120)}`)
    await ctx.close()
    ;({ ctx, page } = await newPage(T, E.luca))
    await page.route(/\/api\/venues\/[^/]+\/requests\/history/, (r) => r.fulfill(json(403, { error: 'Forbidden', message: 'Non autorizzato' })))
    await page.goto(`${BASE}/staff/${ROSSI}/history`)
    await page.waitForSelector('text=Non sei autorizzato')
    await shot(page, T, R, 'storico__non-autorizzato-403', { o: 'S' })
    await kfocus(page, page.locator('a:has-text("I tuoi locali")')); await shot(page, T, R, 'storico__link-i-tuoi-locali-focus', { o: 'S' })
    await ctx.close()
  })

  // ───────────────────────────── Profilo (visto da staff) ─────────────────────────────
  if (on('profilo')) await step(T, 'profilo', async () => {
    seedQ(ROSSI, Q3)
    const { ctx, page } = await openQueue(T, E.luca)
    await menuBtn(page).click(); await page.click('#app-menu a:has-text("Profilo")')
    await page.waitForSelector('text=Zona pericolosa')
    await shot(page, T, R, 'profilo__default') // staff (non proprietario): stesso blocco «gestisce un locale»
    await kfocus(page, backBtn(page)); await shot(page, T, R, 'profilo__bottone-indietro-focus')
    await page.mouse.move(300, 700)
    await menuBtn(page).click(); await page.waitForSelector('#app-menu')
    await shot(page, T, R, 'profilo__menu-aperto', { full: false }) // arrivando dalla coda: solo Profilo + Esci
    await menuBtn(page).click()
    await backBtn(page).click(); await page.waitForSelector('article')
    await shot(page, T, R, 'profilo__ritorno-alla-coda')
    await ctx.close()
  })

  // ───────────────────────────── Coda ─────────────────────────────
  if (on('coda')) await step(T, 'coda', async () => {
    seedQ(ROSSI, Q3)
    let { ctx, page } = await openQueue(T, E.luca)
    note(`titolo tab con 3 richieste: «${await page.title()}»`)
    await shot(page, T, R, 'coda__default-3-richieste')
    // componenti
    await kfocus(page, plusBtn(page)); await shot(page, T, R, 'coda__bottone-piu-focus')
    await pressDown(page, plusBtn(page)); await shot(page, T, R, 'coda__bottone-piu-pressed'); await pressRelease(page)
    await kfocus(page, qty(page)); await shot(page, T, R, 'coda__input-quantita-focus')
    await kfocus(page, rejectBtn(page)); await shot(page, T, R, 'coda__bottone-rifiuta-focus')
    await pressDown(page, rejectBtn(page)); await shot(page, T, R, 'coda__bottone-rifiuta-pressed'); await pressRelease(page)
    await kfocus(page, confirmBtn(page)); await shot(page, T, R, 'coda__bottone-conferma-focus')
    await pressDown(page, confirmBtn(page)); await shot(page, T, R, 'coda__bottone-conferma-pressed'); await pressRelease(page)
    // stepper e quantità
    await plusBtn(page).click(); await plusBtn(page).click()
    await kfocus(page, minusBtn(page)); await shot(page, T, R, 'coda__bottone-meno-focus') // − attivo (qty 3)
    await pressDown(page, minusBtn(page)); await shot(page, T, R, 'coda__bottone-meno-pressed'); await pressRelease(page)
    await page.mouse.move(300, 800)
    await qty(page).fill('50'); await qty(page).blur()
    await shot(page, T, R, 'coda__quantita-50-piu-disabled')
    await qty(page).fill('')
    await shot(page, T, R, 'coda__quantita-vuota-invalida') // anche input aria-invalid + Conferma disabled
    await qty(page).fill('0'); await shot(page, T, R, 'coda__quantita-0-invalida')
    await qty(page).fill('51'); await shot(page, T, R, 'coda__quantita-51-invalida')
    await qty(page).fill('2.5'); await shot(page, T, R, 'coda__quantita-decimale-invalida')
    await qty(page).fill('07'); await qty(page).blur(); await shot(page, T, R, 'coda__quantita-normalizzata-07')
    await ctx.close()

    // una sola richiesta, vuota, premio disponibile, promozione cambiata
    seedQ(ROSSI, [[C.lorenzo, 5]])
    ;({ ctx, page } = await openQueue(T, E.luca)); await shot(page, T, R, 'coda__una-richiesta'); await ctx.close()
    seedQ(ROSSI, [[C.matteo, 10], [C.sofia, 1]])
    ;({ ctx, page } = await openQueue(T, E.luca)); await shot(page, T, R, 'coda__richiesta-premio-disponibile'); await ctx.close()
    seedQ(ROSSI, [[C.sofia, 3], [C.lorenzo, 5]])
    sql(`update cards set promotion_id='${oldPromo()}' where venue_id='${ROSSI}' and user_id=(select id from users where email='${C.sofia}')`)
    ;({ ctx, page } = await openQueue(T, E.luca)); await shot(page, T, R, 'coda__richiesta-promozione-cambiata'); await ctx.close()
    seedQ(ROSSI, [])
    ;({ ctx, page } = await openQueue(T, E.luca))
    await shot(page, T, R, 'coda__vuota')
    note(`titolo tab con coda vuota: «${await page.title()}»`)
    const luca = (await mainText(page)).replace(/\s+/g, ' ')
    await menuBtn(page).click(); const lucaMenu = await page.locator('#app-menu').innerText()
    await ctx.close()
    // proprietario vs staff: stesso locale, stessa coda vuota → stesso testo e stesse voci di menu?
    ;({ ctx, page } = await openQueue(T, E.marco))
    const marco = (await mainText(page)).replace(/\s+/g, ' ')
    await menuBtn(page).click(); const marcoMenu = await page.locator('#app-menu').innerText()
    note(`proprietario vs staff (coda vuota Rossi): testo ${luca === marco ? 'IDENTICO' : 'DIVERSO'}, menu ${lucaMenu === marcoMenu ? 'IDENTICO' : 'DIVERSO'} («${lucaMenu.replace(/\s+/g, ' | ')}»)`)
    await ctx.close()

    // caricamento / segnaposto / poll
    seedQ(ROSSI, Q3)
    ;({ ctx, page } = await newPage(T, E.luca))
    await page.route((u) => QUEUE_GET(u.toString()), (r) => (r.request().method() === 'GET' ? holdThenContinue(3500)(r) : r.continue()))
    await page.goto(`${BASE}/staff/${ROSSI}`); await page.waitForSelector('text=Caricamento…')
    await shot(page, T, R, 'coda__caricamento', { o: 'R' })
    await ctx.close()
    ;({ ctx, page } = await newPage(T, E.luca))
    await page.route(MINE, holdThenContinue(4000))
    await page.goto(`${BASE}/staff/${ROSSI}`); await page.waitForSelector('article')
    await page.waitForTimeout(200)
    await shot(page, T, R, 'coda__titolo-segnaposto-richieste', { o: 'R' }) // titolo «Richieste» finché non arriva il nome del locale
    await ctx.close()

    // nome locale lungo + lista lunga
    await withName(ROSSI, LONG_NAME, async () => {
      seedQ(ROSSI, Q3)
      ;({ ctx, page } = await openQueue(T, E.luca)); await shot(page, T, R, 'coda__nome-locale-lungo'); await ctx.close()
    })
    seedQ(ROSSI, rossiEmails().map((e) => [e, null]))
    ;({ ctx, page } = await openQueue(T, E.luca))
    note(`lista lunga: ${await page.locator('article.card').count()} richieste, titolo tab «${await page.title()}»`)
    await shot(page, T, R, 'coda__lista-lunga')
    await ctx.close()
  })

  // ───────────────────────────── Esiti ─────────────────────────────
  if (on('esiti')) await step(T, 'esiti', async () => {
    const outcome = async (name, specs, act, { after } = {}) => {
      seedQ(ROSSI, specs)
      const { ctx, page } = await openQueue(T, E.luca)
      await act(page)
      await page.waitForSelector('article .alert-success, article .alert-warning')
      await page.waitForTimeout(250)
      await shot(page, T, R, name)
      note(`${name}: «${(await art(page).innerText()).replace(/\s+/g, ' ')}»`)
      if (after) await after(page)
      await ctx.close()
    }
    const ok = async (p, n) => { if (n > 1) await qty(p).fill(String(n)); await confirmBtn(p).click() }
    await outcome('coda__esito-approvata-1-timbro', [[C.sofia, 1], [C.lorenzo, 5]], (p) => ok(p, 1), {
      after: async (p) => {
        await kfocus(p, p.getByRole('button', { name: /^Chiudi esito/ })); await shot(p, T, R, 'coda__esito-bottone-ok-focus')
        await pressDown(p, p.getByRole('button', { name: /^Chiudi esito/ })); await shot(p, T, R, 'coda__esito-bottone-ok-pressed'); await pressRelease(p)
      },
    })
    await outcome('coda__esito-approvata-3-timbri', [[C.sofia, 1]], (p) => ok(p, 3))
    await outcome('coda__esito-approvata-card-piena', [[C.sofia, 9]], (p) => ok(p, 1)) // «· Premio disponibile»
    await outcome('coda__esito-premio-ritirato-senza-timbri', [[C.matteo, 10]], (p) => ok(p, 1))
    await outcome('coda__esito-premio-e-timbri', [[C.matteo, 10]], (p) => ok(p, 4))
    await outcome('coda__esito-premi-multipli', [[C.matteo, 10]], (p) => ok(p, 25))
    await outcome('coda__esito-rifiutata', [[C.sofia, 1], [C.lorenzo, 5]], (p) => rejectBtn(p).click())
    // più esiti insieme: approvata, rifiutata e una ancora da gestire
    seedQ(ROSSI, Q3)
    let { ctx, page } = await openQueue(T, E.luca)
    await confirmBtn(page, 0).click(); await page.waitForSelector('article .alert-success')
    await rejectBtn(page, 1).click(); await page.waitForSelector('article .alert-warning')
    await shot(page, T, R, 'coda__esiti-multipli')
    // l'esito sparisce da solo dopo 8 s
    await page.waitForTimeout(8500)
    await shot(page, T, R, 'coda__esiti-spariti-dopo-8s')
    await ctx.close()
    // busy: la conferma parte ma la risposta non arriva (i bottoni restano disabilitati, «Invio…»)
    seedQ(ROSSI, Q3)
    ;({ ctx, page } = await openQueue(T, E.luca))
    await page.route(/\/requests\/[^/]+\/confirm$/, holdThenAbort(6000))
    await confirmBtn(page).click(); await page.waitForSelector('button:has-text("Invio…")')
    await shot(page, T, R, 'coda__invio-in-corso', { o: 'S' })
    await ctx.close()
  })

  // ───────────────────────────── Errori ─────────────────────────────
  if (on('errori')) await step(T, 'errori', async () => {
    // richiesta già gestita da un altro dispositivo (rifiuto VERO dal proprietario, poi Conferma dall'altro telefono)
    seedQ(ROSSI, Q3)
    let { ctx, page } = await openQueue(T, E.luca)
    const id = sql(`select r.id from stamp_requests r join cards c on c.id=r.card_id where r.status='pending' and r.venue_id='${ROSSI}' order by r.created_at limit 1`)
    const mk = await session(E.marco)
    const rr = await mk.api.post(`/api/venues/${ROSSI}/requests/${id}/reject`)
    note(`rifiuto da altro dispositivo: ${rr.status()}`)
    await confirmBtn(page, 0).click(); await page.waitForSelector('.feedback .alert-danger')
    await shot(page, T, R, 'coda__errore-gia-gestita')
    note(`errore già gestita: «${await page.locator('.feedback .alert-danger').innerText()}»`)
    await ctx.close()
    // sticky con lista lunga: l'alert resta in alto mentre si scorre
    seedQ(ROSSI, rossiEmails().map((e) => [e, null]))
    ;({ ctx, page } = await openQueue(T, E.luca))
    const id2 = sql(`select r.id from stamp_requests r where r.status='pending' and r.venue_id='${ROSSI}' order by r.created_at limit 1`)
    await mk.api.post(`/api/venues/${ROSSI}/requests/${id2}/reject`)
    await confirmBtn(page, 0).click(); await page.waitForSelector('.feedback .alert-danger')
    await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(300)
    await shot(page, T, R, 'coda__errore-sticky-dopo-scroll', { full: false })
    await ctx.close()
    // errori simulati
    const sim = async (name, fulfillOrAbort, kind = 'confirm') => {
      seedQ(ROSSI, Q3)
      const { ctx, page } = await openQueue(T, E.luca)
      await page.route(new RegExp(`/requests/[^/]+/${kind}$`), fulfillOrAbort)
      await (kind === 'confirm' ? confirmBtn(page) : rejectBtn(page)).click()
      await page.waitForSelector('.feedback .alert-danger')
      await shot(page, T, R, name, { o: 'S' })
      await ctx.close()
    }
    await sim('coda__errore-esito-non-confermato', (r) => r.abort())
    await sim('coda__errore-generico-500', (r) => r.fulfill(json(500, { error: 'InternalServerError', message: 'Errore interno' })))
    await sim('coda__errore-429-troppe-richieste', (r) => r.fulfill(json(429, { error: 'TooManyRequests', message: 'Troppe richieste. Riprova tra 30 s.', retryAfterSeconds: 30 }, { 'Retry-After': '30' })))
    await sim('coda__errore-rifiuto-non-confermato', (r) => r.abort(), 'reject')
    // errore di connessione del polling (alert-warning): la prima GET va, le altre falliscono
    seedQ(ROSSI, Q3)
    ;({ ctx, page } = await newPage(T, E.luca))
    let n = 0
    await page.route((u) => QUEUE_GET(u.toString()), (r) => (r.request().method() === 'GET' && ++n > 1 ? r.abort() : r.continue()))
    await page.goto(`${BASE}/staff/${ROSSI}`); await page.waitForSelector('article')
    await page.waitForSelector('.alert-warning', { timeout: 10000 })
    await shot(page, T, R, 'coda__errore-connessione-poll', { o: 'S' })
    await ctx.close()
    // non autorizzato: risposta VERA del backend (staff di Rossi sul locale Fiordilatte; id malformato)
    for (const [name, path] of [['coda__non-autorizzato-altro-locale', FIORD], ['coda__non-autorizzato-id-malformato', 'boh']]) {
      ;({ ctx, page } = await newPage(T, E.luca))
      await page.goto(`${BASE}/staff/${path}`)
      await page.waitForTimeout(2500)
      await shot(page, T, R, name)
      note(`${name}: «${(await mainText(page)).replace(/\s+/g, ' ').slice(0, 140)}»`)
      if (await page.locator('a:has-text("I tuoi locali")').count()) {
        await kfocus(page, page.locator('a:has-text("I tuoi locali")')); await shot(page, T, R, `${name}-link-focus`)
      }
      await ctx.close()
    }
  })

  // ───────────────────────────── Menu ☰ ─────────────────────────────
  if (on('menu')) await step(T, 'menu', async () => {
    seedQ(ROSSI, Q3)
    let { ctx, page } = await openQueue(T, E.luca)
    await kfocus(page, menuBtn(page)); await shot(page, T, R, 'coda__bottone-menu-focus')
    await pressDown(page, menuBtn(page)); await shot(page, T, R, 'coda__bottone-menu-pressed'); await pressRelease(page)
    await page.mouse.move(300, 800)
    await menuBtn(page).click(); await page.waitForSelector('#app-menu')
    await shot(page, T, R, 'coda__menu-aperto', { full: false }) // staff in un locale: Profilo + Storico richieste + Esci
    await page.locator('#app-menu a').nth(1).focus(); await shot(page, T, R, 'coda__menu-voce-focus', { full: false })
    await ctx.close()
    ;({ ctx, page } = await openQueue(T, E.giulia))
    await menuBtn(page).click(); await page.waitForSelector('#app-menu')
    await shot(page, T, R, 'coda__menu-aperto-multi-locale', { full: false }) // + «Cambia locale»
    await ctx.close()
    // prima che arrivino i ruoli (memberships non ancora caricate): il menu ha solo Profilo + Esci
    ;({ ctx, page } = await newPage(T, E.giulia))
    await page.route(MINE, holdThenContinue(4000))
    await page.goto(`${BASE}/staff/${ROSSI}`); await page.waitForSelector('article')
    await menuBtn(page).click(); await page.waitForSelector('#app-menu')
    await shot(page, T, R, 'coda__menu-aperto-ruoli-non-ancora-caricati', { full: false, o: 'R' })
    await ctx.close()
  })
}

note('stati NON catturabili da screenshot: titolo della scheda del browser «(N) Stampy» (registrato nelle note), annuncio screen-reader')
writeManifest().then(() => {
  console.log(`\nfatto: ${manifest.captured.length} PNG, ${manifest.failed.length} falliti`)
  for (const f of manifest.failed) console.log('  ✘', f.name, '—', f.reason)
  import('node:fs').then((fs) => fs.writeFileSync(`${process.env.OUT}/_notes.json`, JSON.stringify(notes, null, 2)))
})
await (await import('./capture-lib.mjs')).browser.close()
