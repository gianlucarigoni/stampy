// F12 · shared history (RequestHistory.vue): staff and customer. Rows grouped by day, status chips, named reward,
// live filters in the URL, active-filter chips, per-field errors, "Carica altri" (cursor pagination), venue filter
// (customer only), empty states (two causes), skeleton, error with "Riprova".
//   npm run dev, then from stampy-frontend/:   E2E_APP_URL=http://localhost:<port> node e2e/history.mjs
import { APP, check, cleanup, createFixtures, createVenue, finish, openBrowser, pageFor, section, seedRequests } from './lib.mjs'

let browser
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
try {
  const fx = createFixtures(3)
  const V = fx.venueId
  const [c1, c2] = fx.customers
  const V2 = createVenue('E2E Secondo')
  // 60 requests in the first venue (25 per page → 3 pages): 2 today, 1 yesterday, the rest older; one with a reward.
  const rows = [
    { ago: '1 minute', status: 'approved', added: 2 },
    { ago: '2 minutes', status: 'approved', added: 0, reward: 1 },
    { ago: '1 day', status: 'rejected' },
    { ago: '1 day 1 hour', status: 'expired' },
  ]
  for (let i = 0; i < 56; i++) rows.push({ ago: `${3 + i} days`, status: i % 7 === 0 ? 'rejected' : 'approved', added: (i % 4) + 1 })
  seedRequests(V, c1, fx.staff, rows)
  seedRequests(V2, c1, fx.staff, [{ ago: '30 minutes', status: 'approved', added: 1 }, { ago: '5 days', status: 'approved', added: 3 }])
  seedRequests(V, c2, fx.staff, [{ ago: '40 minutes', status: 'pending' }])
  browser = await openBrowser()

  section('Staff 360 px: grouped list, chips, named reward')
  const staff = await pageFor(browser, fx.staff.token, { width: 360, height: 800 })
  const net = []
  const histReqs = []
  staff.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/abort')) net.push(r.status() + ' ' + r.url()) })
  staff.on('request', (r) => { if (r.url().includes('/requests/history')) histReqs.push(r.url()) })
  await staff.goto(`${APP}/staff/${V}`)
  await staff.getByRole('button', { name: 'Menu' }).click()
  await staff.getByRole('link', { name: 'Storico richieste' }).click()
  await staff.getByRole('heading', { name: 'Storico richieste', level: 1 }).waitFor()
  const rowsEl = () => staff.locator('li[data-row]')
  await rowsEl().first().waitFor()
  const query = () => new URL(staff.url()).search
  const settle = () => staff.waitForTimeout(700) // debounce 250 ms + fetch
  check('first page: 25 rows', (await rowsEl().count()) === 25, String(await rowsEl().count()))
  check('total as the backend gives it: "61 richieste"', (await staff.locator('.hist-count').innerText()) === '61 richieste', await staff.locator('.hist-count').innerText())
  check('footer "Mostrate 25 di 61"', (await staff.getByText('Mostrate 25 di 61').count()) === 1)
  const days = await staff.locator('.hist-day-title').allInnerTexts()
  check('day headings start with "Oggi", "Ieri"', days[0] === 'Oggi' && days[1] === 'Ieri', days.slice(0, 3).join('|'))
  check('rows show the card code, not a table', (await staff.locator('table').count()) === 0 && (await rowsEl().first().locator('.hist-code').count()) === 1)
  const prize = staff.locator('li.is-prize').first()
  check('prize row: chip "Premio" and the reward name', (await prize.innerText()).includes('Premio') && (await prize.innerText()).includes('Caffè E2E'), await prize.innerText())
  check('status chips carry text (Approvata / Non confermata / Scaduta)', await (async () => { const t = await staff.locator('main').innerText(); return /Approvata/.test(t) && /Non confermata/.test(t) && /Scaduta/.test(t) })())
  check('no email shown', !/@/.test(await staff.locator('main').innerText()))
  check('no horizontal scroll at 360 px', !(await overflow(staff)))
  const toggle = staff.getByRole('button', { name: /^Filtri/ })
  check('toggle collapsed, >= 44 px', (await toggle.getAttribute('aria-expanded')) === 'false' && (await toggle.boundingBox()).height >= 44)
  check('no venue filter for staff', (await staff.locator('#h-venue').count()) === 0)

  section('Staff: "Carica altri" (cursor pagination)')
  const more = staff.getByRole('button', { name: 'Carica altri' })
  check('button >= 44 px', (await more.boundingBox()).height >= 44)
  histReqs.length = 0
  await more.click()
  await staff.waitForFunction(() => document.querySelectorAll('li[data-row]').length === 50)
  check('second page appended: 50 rows, request carries a cursor', histReqs.length === 1 && /cursor=/.test(histReqs[0]), histReqs[0])
  check('footer "Mostrate 50 di 61"', (await staff.getByText('Mostrate 50 di 61').count()) === 1)
  await more.click()
  await staff.waitForFunction(() => document.querySelectorAll('li[data-row]').length === 61)
  check('last page: 61 rows, button gone', (await more.count()) === 0)
  check('no duplicated request ids / rows', (await staff.locator('li[data-row]').count()) === 61)
  check('focus moved to the first new row (button is gone)', await staff.evaluate(() => document.activeElement?.hasAttribute('data-row')))
  check('still no horizontal scroll', !(await overflow(staff)))

  section('Staff: filters, chips, URL')
  await toggle.click()
  check('toggle opens the panel; legends Timbri / Periodo', (await toggle.getAttribute('aria-expanded')) === 'true' && (await staff.locator('legend', { hasText: 'Timbri' }).count()) === 1 && (await staff.locator('legend', { hasText: 'Periodo' }).count()) === 1)
  histReqs.length = 0
  await staff.locator('#h-status').selectOption('approved'); await settle()
  check('status → URL ?status=approved, 1 request, first page again', query() === '?status=approved' && histReqs.length === 1 && !/cursor/.test(histReqs[0]), `${query()} ${histReqs.length}`)
  check('toggle "Filtri · 1" and a removable chip "Esito: Approvate"', /Filtri · 1/.test(await toggle.innerText()) && (await staff.locator('.hist-chip', { hasText: 'Esito: Approvate' }).count()) === 1)
  const x = staff.getByRole('button', { name: 'Rimuovi filtro: Esito: Approvate' })
  check('chip remove target >= 44 px', (await x.boundingBox()).height >= 44 && (await x.boundingBox()).width >= 44)
  const reset = staff.getByRole('button', { name: 'Azzera', exact: true })
  const resetStyle = await reset.evaluate((el) => { const s = getComputedStyle(el); return s.backgroundColor })
  check('"Azzera" is a link-style button, not orange fill', resetStyle === 'rgba(0, 0, 0, 0)' || resetStyle === 'transparent', resetStyle)
  const h0 = await staff.evaluate(() => history.length)
  histReqs.length = 0
  await staff.locator('#h-min').pressSequentially('1'); await staff.waitForTimeout(80); await staff.locator('#h-min').pressSequentially('0'); await settle()
  check('typing burst "10" → one history entry, one request', query() === '?status=approved&minStamps=10' && (await staff.evaluate(() => history.length)) === h0 + 1 && histReqs.length === 1, `${query()} ${histReqs.length}`)
  check('minStamps 10 → empty state with two-cause text "Nessun risultato"', (await staff.getByRole('heading', { name: 'Nessun risultato' }).count()) === 1)
  await staff.getByRole('button', { name: 'Azzera filtri' }).click(); await settle()
  check('"Azzera filtri" in the card → empty query, rows again', query() === '' && (await rowsEl().count()) === 25)
  await staff.locator('#h-min').fill('3'); await staff.locator('#h-max').fill('3'); await settle()
  check('stamps 3..3 → chip "Timbri: da 3 a 3"', (await staff.locator('.hist-chip', { hasText: 'Timbri: da 3 a 3' }).count()) === 1, query())
  await x.count() // keep reference alive
  await staff.getByRole('button', { name: 'Rimuovi filtro: Timbri: da 3 a 3' }).click(); await settle()
  check('removing the chip clears both fields and the URL', query() === '' && (await staff.locator('#h-min').inputValue()) === '' && (await staff.locator('#h-max').inputValue()) === '')
  await staff.locator('#h-status').selectOption('approved'); await settle()
  await staff.goBack(); await settle()
  check('Back restores the previous filters', query() === '' && (await staff.locator('#h-status').inputValue()) === '', query())
  await staff.goForward(); await settle()
  check('Forward → status approved again', query() === '?status=approved')

  section('Staff: invalid filters (error next to the field)')
  histReqs.length = 0
  const urlBefore = staff.url()
  await staff.locator('#h-min').fill('5'); await staff.locator('#h-max').fill('2'); await settle()
  const msg = staff.locator('#h-stamps-msg')
  check('min > max → message under the Timbri group, role alert', (await msg.innerText()).includes('Il minimo dei timbri supera il massimo.') && (await msg.locator('[role=alert]').count()) === 1)
  check('both fields marked: aria-invalid + described by the message', (await staff.locator('#h-min').getAttribute('aria-invalid')) === 'true' && (await staff.locator('#h-max').getAttribute('aria-describedby')) === 'h-stamps-msg')
  check('list replaced by "Correggi i filtri"; no request, URL unchanged', (await staff.getByRole('heading', { name: 'Correggi i filtri' }).count()) === 1 && (await rowsEl().count()) === 0 && histReqs.length === 0 && staff.url() === urlBefore)
  check('count hidden while invalid', (await staff.locator('.hist-count').innerText()) === '')
  await staff.locator('#h-min').fill('1'); await staff.locator('#h-max').fill('9'); await settle()
  check('fixing the value removes the error and shows the list', (await staff.locator('#h-stamps-msg').count()) === 0 && (await rowsEl().count()) > 0, query())
  const day = (o) => staff.evaluate((d) => { const t = new Date(Date.now() + d * 864e5); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` }, o)
  const [yest, today, tom] = [await day(-1), await day(0), await day(1)]
  await reset.click(); await settle()
  check('both dates max = today; "Al" min follows "Dal"', (await staff.locator('#h-from').getAttribute('max')) === today && (await staff.locator('#h-to').getAttribute('min')) === null)
  histReqs.length = 0
  await staff.locator('#h-to').fill(tom); await settle()
  check('future date → error under Periodo, no request', (await staff.locator('#h-period-msg').innerText()).includes('Le date nel futuro non sono ammesse.') && histReqs.length === 0)
  await staff.locator('#h-from').fill(today); await staff.locator('#h-to').fill('2000-01-01'); await settle()
  check('"Al" before "Dal" → error, no request', (await staff.locator('#h-period-msg').innerText()).includes('prima della data') && histReqs.length === 0)
  await staff.locator('#h-from').fill(yest); await staff.locator('#h-to').fill(today); await settle()
  check('valid range → error gone, "to" sent as the local end of day', (await staff.locator('#h-period-msg').count()) === 0 && query() === `?from=${yest}&to=${today}` && /to=/.test(histReqs.at(-1) ?? ''), histReqs.at(-1))
  check('chips "Dal …" and "Al …"', (await staff.locator('.hist-chip', { hasText: /^Dal / }).count()) === 1 && (await staff.locator('.hist-chip', { hasText: /^Al / }).count()) === 1)
  await reset.click(); await settle()

  section('Staff: stale responses, deep link, malformed query, errors')
  let n = 0
  await staff.route('**/requests/history**', async (route) => { if (++n === 1) await new Promise((r) => setTimeout(r, 1500)); await route.continue() })
  await staff.locator('#h-status').selectOption('rejected'); await staff.waitForTimeout(450)
  await staff.locator('#h-status').selectOption('expired'); await staff.waitForTimeout(2500)
  check('rapid changes → only the last response (expired, 2 rows: the seeded one + one lazily expired)', (await rowsEl().count()) === 2 && /Scaduta/.test(await rowsEl().first().innerText()), `${await rowsEl().count()} ${query()}`)
  await staff.unroute('**/requests/history**')
  await staff.goto(`${APP}/staff/${V}/history?status=approved&minStamps=3&venueId=00000000-0000-4000-8000-000000000000`)
  await rowsEl().first().waitFor()
  check('deep link fills form and chips; unknown venueId dropped for staff', (await staff.locator('#h-status').inputValue()) === 'approved' && (await staff.locator('#h-min').inputValue()) === '3' && !histReqs.at(-1).includes('venueId'), histReqs.at(-1))
  check('panel collapsed on a deep link, count of active filters shown', (await staff.getByRole('button', { name: /^Filtri/ }).getAttribute('aria-expanded')) === 'false' && /Filtri · 2/.test(await staff.getByRole('button', { name: /^Filtri/ }).innerText()))
  await staff.goto(`${APP}/staff/${V}/history?status=bogus&minStamps=abc&from=nope&limit=5`)
  await rowsEl().first().waitFor()
  check('malformed query dropped silently', (await rowsEl().count()) === 25 && (await staff.getByRole('alert').count()) === 0)
  // skeleton while loading, then error with "Riprova"
  await staff.route('**/requests/history**', async (route) => { await new Promise((r) => setTimeout(r, 1200)); await route.abort() })
  await staff.goto(`${APP}/staff/${V}/history`)
  await staff.locator('.hist-skeleton[aria-busy=true]').waitFor({ timeout: 1000 })
  check('skeleton while loading (busy)', true)
  await staff.getByText('Non siamo riusciti a caricare le richieste').waitFor()
  check('error: alert with what to do + "Riprova"', (await staff.getByText('Controlla la connessione e riprova.').count()) === 1 && (await staff.getByRole('button', { name: 'Riprova' }).count()) === 1)
  await staff.unroute('**/requests/history**')
  await staff.getByRole('button', { name: 'Riprova' }).click()
  await rowsEl().first().waitFor()
  check('"Riprova" loads the list', (await rowsEl().count()) === 25)
  // error on "Carica altri"
  let fail = true
  await staff.route('**/requests/history**', async (route) => { if (fail && route.request().url().includes('cursor=')) return route.abort(); await route.continue() })
  await staff.getByRole('button', { name: 'Carica altri' }).click()
  await staff.getByText('Non siamo riusciti a caricare altre richieste').waitFor()
  check('"Carica altri" error keeps the 25 rows and the button', (await rowsEl().count()) === 25 && (await staff.getByRole('button', { name: 'Carica altri' }).count()) === 1)
  fail = false
  await staff.getByRole('button', { name: 'Carica altri' }).click()
  await staff.waitForFunction(() => document.querySelectorAll('li[data-row]').length === 50)
  check('retry works, error gone', (await staff.getByText('Non siamo riusciti a caricare altre').count()) === 0)
  await staff.unroute('**/requests/history**')
  check('no unexpected 4xx/5xx for staff', net.length === 0, net.join(' | '))

  section('Authorization')
  const cu = await pageFor(browser, c1.token)
  await cu.goto(`${APP}/staff/${V}/history`)
  await cu.getByText('Non sei autorizzato').waitFor()
  check('customer-only account → "Non sei autorizzato"', true)
  const empty = await pageFor(browser, fx.customers[2].token, { width: 360, height: 800 })

  section('Customer 390 px: own requests, venue name, venue filter')
  const own = await pageFor(browser, c1.token, { width: 390, height: 800 })
  const ownReqs = []
  const ownNet = []
  own.on('request', (r) => { if (r.url().includes('/requests/mine')) ownReqs.push(r.url()) })
  own.on('response', (r) => { if (r.status() >= 400) ownNet.push(r.status() + ' ' + r.url()) })
  await own.goto(`${APP}/profile`)
  await own.getByRole('link', { name: /Storico richieste/ }).click()
  await own.getByRole('heading', { name: 'Storico richieste', level: 1 }).waitFor()
  const ownRows = own.locator('li[data-row]')
  await ownRows.first().waitFor()
  check('25 rows, total "62 richieste" (61 + 1 of the second venue)', (await ownRows.count()) === 25 && (await own.locator('.hist-count').innerText()) === '62 richieste', await own.locator('.hist-count').innerText())
  const t = await ownRows.first().innerText()
  check('row shows the venue name and no card code', /E2E/.test(t) && (await own.locator('.hist-code').count()) === 0, t)
  check('never the staff-only customer line (no "E2E ·" display name)', !/E2E · /.test(await own.locator('main').innerText()))
  check("customer does not see other customers' rows (another customer request is not counted (62, not 63))", (await own.locator('.hist-list').allInnerTexts()).every((t) => !/In attesa/.test(t)))
  await own.getByRole('button', { name: /^Filtri/ }).click()
  check('venue filter present with both venues', (await own.locator('#h-venue option').count()) === 3, String(await own.locator('#h-venue option').count()))
  ownReqs.length = 0
  const second = await own.locator('#h-venue option', { hasText: 'E2E Secondo' }).getAttribute('value')
  await own.locator('#h-venue').selectOption(second)
  await own.waitForTimeout(800)
  check('venue chosen → venueId in the URL and in the request, 2 rows', /venueId=/.test(own.url()) && ownReqs.length === 1 && /venueId=/.test(ownReqs[0]) && (await ownRows.count()) === 2, `${own.url()} ${await ownRows.count()}`)
  check('chip "Locale: …" and "Filtri · 1"', (await own.locator('.hist-chip', { hasText: /^Locale:/ }).count()) === 1 && /Filtri · 1/.test(await own.getByRole('button', { name: /^Filtri/ }).innerText()))
  await own.getByRole('button', { name: /Rimuovi filtro: Locale/ }).click(); await own.waitForTimeout(800)
  check('removing the chip clears the venue', !/venueId/.test(own.url()) && (await ownRows.count()) === 25)
  await own.goto(`${APP}/history?venueId=00000000-0000-4000-8000-000000000000`)
  await ownRows.first().waitFor()
  check('a venue the customer has no card in → filter dropped quietly, full list', !/venueId/.test(own.url()) && (await ownRows.count()) === 25 && (await own.getByRole('alert').count()) === 0, own.url())
  check('no horizontal overflow at 390 px', !(await overflow(own)))
  await own.getByRole('button', { name: 'Indietro' }).click()
  await own.waitForURL('**/profile')
  check('back goes to the profile', true)
  check('no unexpected 4xx/5xx for the customer (the dropped venue gives one 404)', ownNet.length === 1 && ownNet[0].startsWith('404'), ownNet.join(' | '))

  section('Customer: empty state (no requests) and no overflow at 360 px')
  await empty.goto(`${APP}/history`)
  await empty.getByRole('heading', { name: 'Non hai ancora richieste' }).waitFor()
  check('empty state: text and "Torna al profilo"', (await empty.getByText('Quando chiedi un timbro, la vedrai qui.').count()) === 1 && (await empty.getByRole('link', { name: 'Torna al profilo' }).count()) === 1)
  check('no venue filter with no cards, no overflow', (await empty.locator('#h-venue').count()) === 0 && !(await overflow(empty)))
} catch (e) {
  console.error('✘ unexpected error:', e.stack)
  try { cleanup() } catch {}
  process.exit(1)
}
await finish(browser)
