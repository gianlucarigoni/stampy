// Staff history screen (URL-driven live filters, back/forward, date rules, no paging), the customer's history
// (same component, own requests only, same header) and the customer's card code during polling.
//   npm run dev, then from stampy-frontend/:   node e2e/history.mjs
import { APP, check, cleanup, createFixtures, finish, openBrowser, openRequest, pageFor, section } from './lib.mjs'

let browser
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
const act = (path, token, body) =>
  fetch(`${APP}/api${path}`, { method: 'POST', headers: { Cookie: `sid=${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
try {
  const fx = createFixtures(30)
  const V = fx.venueId
  const [c1, c2, c3] = fx.customers
  const r1 = await openRequest(V, c1)
  const r2 = await openRequest(V, c2)
  const r3 = await openRequest(V, c3)
  await act(`/venues/${V}/requests/${r1}/confirm`, fx.staff.token, { stamps: 3 })
  await act(`/venues/${V}/requests/${r2}/reject`, fx.staff.token)
  const code = async (id) => (await (await fetch(`${APP}/api/venues/${V}/requests`, { headers: { Cookie: `sid=${fx.staff.token}` } })).json()).requests.find((q) => q.requestId === id)?.publicCode
  const code3 = await code(r3)
  browser = await openBrowser()

  section('Customer: card code stays visible while polling and after closing')
  const cust = await pageFor(browser, c3.token)
  await cust.goto(`${APP}/r/${r3}`)
  await cust.getByText('Richiesta inviata').waitFor()
  check('pending screen shows "Codice card: <code>"', (await cust.getByText(`Codice card: ${code3}`).count()) === 1, await cust.innerText('main'))
  await act(`/venues/${V}/requests/${r3}/reject`, fx.staff.token)
  await cust.getByText('Richiesta non confermata').waitFor({ timeout: 6000 })
  check('rejected screen still shows the code', (await cust.getByText(`Codice card: ${code3}`).count()) === 1)
  const c1p = await pageFor(browser, c1.token)
  await c1p.goto(`${APP}/r/${r1}`)
  await c1p.getByText('Richiesta approvata!').waitFor()
  check('approved screen shows the code', (await c1p.getByText(/Codice card: [A-Z0-9]+/).count()) === 1)

  section('Staff: history screen')
  const staff = await pageFor(browser, fx.staff.token, { width: 360, height: 800 })
  const net = []
  const histReqs = []
  staff.on('response', (r) => { if (r.status() >= 400) net.push(r.status() + ' ' + r.url()) })
  staff.on('request', (r) => { if (r.url().includes('/requests/history')) histReqs.push(r.url()) })
  await staff.goto(`${APP}/staff/${V}`)
  await staff.getByRole('button', { name: 'Menu' }).click()
  await staff.getByRole('link', { name: 'Storico richieste' }).click()
  await staff.getByRole('heading', { name: 'Storico richieste' }).waitFor()
  const rows = () => staff.locator('ul.list-unstyled > li')
  await rows().first().waitFor()
  const query = () => new URL(staff.url()).search
  const settle = () => staff.waitForTimeout(700) // debounce 250 ms + fetch
  check('opened from the header menu; lists the 3 requests', (await rows().count()) === 3, String(await rows().count()))
  check('live count "3 richieste" in a status region', (await staff.getByRole('status').innerText()).includes('3 richieste'))
  const all = await staff.locator('ul.list-unstyled').innerText()
  check('shows outcomes and "3 confermati"', /Approvata/.test(all) && /Rifiutata/.test(all) && /3 confermati/.test(all), all)
  check('no email shown', !/@/.test(await staff.locator('main, body').first().innerText()))
  check('no horizontal scroll at 360 px', !(await overflow(staff)))
  check('no "Filtra" button and no "Carica altre"', (await staff.getByRole('button', { name: 'Filtra' }).count()) === 0 && (await staff.getByText('Carica altre').count()) === 0)
  const toggle = staff.getByRole('button', { name: /^Filtri/ })
  check('panel collapsed by default (aria-expanded=false), toggle >= 44 px', (await toggle.getAttribute('aria-expanded')) === 'false' && (await toggle.boundingBox()).height >= 44)
  await toggle.click()
  check('toggle opens the panel (aria-expanded=true)', (await toggle.getAttribute('aria-expanded')) === 'true' && (await staff.locator('#h-status').isVisible()))
  check('labels: legends "Timbri"/"Periodo", "Min"/"Max"', (await staff.getByLabel('Min', { exact: true }).count()) === 1 && (await staff.getByLabel('Max', { exact: true }).count()) === 1 && (await staff.locator('legend', { hasText: 'Timbri' }).count()) === 1 && (await staff.locator('legend', { hasText: 'Periodo' }).count()) === 1)

  // live filtering: no button, one URL change, one request
  histReqs.length = 0
  await staff.locator('#h-status').selectOption('approved'); await settle()
  check('status = approved → URL ?status=approved, 1 row, 1 request', query() === '?status=approved' && (await rows().count()) === 1 && histReqs.length === 1, `${query()} ${histReqs.length}`)
  check('toggle shows the active count "Filtri · 1"', /Filtri · 1/.test(await toggle.innerText()))
  const h0 = await staff.evaluate(() => history.length)
  histReqs.length = 0
  await staff.locator('#h-min').pressSequentially('1'); await staff.waitForTimeout(80); await staff.locator('#h-min').pressSequentially('0'); await settle()
  check('typing burst "10" → one history entry, one request', query() === '?status=approved&minStamps=10' && (await staff.evaluate(() => history.length)) === h0 + 1 && histReqs.length === 1, `${query()} ${histReqs.length}`)
  check('minStamps 10 → none ("Nessuna richiesta trovata")', (await staff.getByText('Nessuna richiesta trovata').count()) === 1)
  await staff.locator('#h-min').fill('3'); await staff.locator('#h-max').fill('3'); await settle()
  check('stamps 3..3 → 1 row', query() === '?status=approved&minStamps=3&maxStamps=3' && (await rows().count()) === 1, query())

  // back / forward restore filters and results
  await staff.goBack(); await settle()
  check('Back → previous filters (min 10, max empty), no results', (await staff.locator('#h-min').inputValue()) === '10' && (await staff.locator('#h-max').inputValue()) === '' && query() === '?status=approved&minStamps=10' && (await rows().count()) === 0, query())
  await staff.goBack(); await settle()
  check('Back again → status only, min empty, 1 row', (await staff.locator('#h-min').inputValue()) === '' && query() === '?status=approved' && (await rows().count()) === 1, query())
  await staff.goForward(); await settle()
  check('Forward → min 10 again, still on the history page', (await staff.locator('#h-min').inputValue()) === '10' && staff.url().includes('/history'))
  await staff.goForward(); await settle()
  check('Forward again → min 3 / max 3, 1 row', (await staff.locator('#h-max').inputValue()) === '3' && (await rows().count()) === 1)

  // invalid stamps: inline error, no push, no request
  histReqs.length = 0
  const urlBefore = staff.url()
  await staff.locator('#h-min').fill('5'); await staff.locator('#h-max').fill('2'); await settle()
  check('min > max → inline error, URL unchanged, no request', (await staff.getByText('Il minimo dei timbri supera il massimo.').count()) === 1 && staff.url() === urlBefore && histReqs.length === 0)
  await staff.getByRole('button', { name: 'Azzera' }).click(); await settle()
  check('Azzera → empty query, 3 rows, form empty', query() === '' && (await rows().count()) === 3 && (await staff.locator('#h-status').inputValue()) === '' && (await staff.locator('#h-min').inputValue()) === '')

  // dates
  const day = (offset) => staff.evaluate((o) => { const d = new Date(Date.now() + o * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }, offset)
  const [yest, today, tom] = [await day(-1), await day(0), await day(1)]
  check('both dates have max = today', (await staff.locator('#h-from').getAttribute('max')) === today && (await staff.locator('#h-to').getAttribute('max')) === today)
  check('"Al" has no min while "Dal" is empty', (await staff.locator('#h-to').getAttribute('min')) === null)
  await staff.locator('#h-from').fill(yest); await settle()
  check('"Al" min = "Dal"', (await staff.locator('#h-to').getAttribute('min')) === yest)
  check('only "Dal" = yesterday → 3 (URL ?from=…)', query() === `?from=${yest}` && (await rows().count()) === 3, query())
  histReqs.length = 0
  const urlDates = staff.url()
  await staff.locator('#h-to').fill(tom); await settle()
  check('typed future "Al" → inline error, no push, no request', (await staff.getByText('Le date nel futuro non sono ammesse.').count()) === 1 && staff.url() === urlDates && histReqs.length === 0)
  await staff.locator('#h-to').fill('2000-01-01'); await settle()
  check('typed "Al" before "Dal" → inline error, no request', (await staff.getByText('La data "Al" è prima della data "Dal".').count()) === 1 && histReqs.length === 0)
  await staff.locator('#h-to').fill(today); await settle()
  check('valid range yesterday..today → error gone, 3 rows', (await staff.getByText('prima della data').count()) === 0 && query() === `?from=${yest}&to=${today}` && (await rows().count()) === 3, query())
  await staff.getByRole('button', { name: 'Azzera' }).click(); await settle()

  // stale responses: slow first answer must not overwrite the last one
  let n = 0
  await staff.route('**/requests/history**', async (route) => { if (++n === 1) await new Promise((r) => setTimeout(r, 1500)); await route.continue() })
  await staff.locator('#h-status').selectOption('rejected'); await staff.waitForTimeout(450)
  await staff.locator('#h-status').selectOption('approved'); await staff.waitForTimeout(2500)
  check('rapid changes → only the last response is shown (approved, 1 row)', (await rows().count()) === 1 && /Approvata/.test(await rows().first().innerText()))
  await staff.unroute('**/requests/history**')

  // deep link + malformed query
  await staff.goto(`${APP}/staff/${V}/history?status=approved&minStamps=3`)
  await rows().first().waitFor()
  check('deep link ?status=approved&minStamps=3 → form and list match', (await staff.locator('#h-status').inputValue()) === 'approved' && (await staff.locator('#h-min').inputValue()) === '3' && (await rows().count()) === 1)
  check('panel stays collapsed on a deep link', (await staff.getByRole('button', { name: /^Filtri/ }).getAttribute('aria-expanded')) === 'false')
  await staff.goto(`${APP}/staff/${V}/history?status=bogus&minStamps=abc&from=nope&limit=5`)
  await rows().first().waitFor()
  check('malformed query dropped silently (3 rows, no error)', (await rows().count()) === 3 && (await staff.getByRole('alert').count()) === 0)

  section('Staff: no pagination (27 more requests → all 30 rows)')
  for (const c of fx.customers.slice(3)) await openRequest(V, c)
  await staff.reload()
  await rows().first().waitFor()
  check('full list rendered: 30 rows, no "Carica altre"', (await rows().count()) === 30 && (await staff.getByText('Carica altre').count()) === 0, String(await rows().count()))
  check('count says "30 richieste"', (await staff.getByRole('status').innerText()).includes('30 richieste'))

  section('Authorization')
  const cu = await pageFor(browser, c1.token)
  await cu.goto(`${APP}/staff/${V}/history`)
  await cu.getByText('Non sei autorizzato').waitFor()
  check('customer-only account → "Non sei autorizzato"', true)
  section('Customer: history (same component, own requests only)')
  const own = await pageFor(browser, c1.token)
  const ownNet = []
  own.on('response', (r) => { if (r.status() >= 400) ownNet.push(r.status() + ' ' + r.url()) })
  await own.goto(`${APP}/r/${r1}`)
  await own.getByText('Richiesta approvata!').waitFor()
  await own.getByRole('button', { name: 'Menu' }).click()
  const items = await own.locator('#app-menu').innerText()
  check('customer menu: "Profilo" + "Esci" only (no staff items)', /Profilo/.test(items) && /Esci/.test(items) && !/Coda richieste/.test(items), items)
  check('no back button outside the profile and history pages', (await own.getByRole('button', { name: 'Indietro' }).count()) === 0)
  await own.getByRole('link', { name: 'Profilo' }).click()
  await own.getByRole('link', { name: 'Storico richieste' }).click()
  await own.getByRole('heading', { name: 'Le tue richieste' }).waitFor()
  await own.locator('ul.list-unstyled > li').first().waitFor()
  const ownRows = own.locator('ul.list-unstyled > li')
  check('only the customer\'s own request, although the venue has 30', (await ownRows.count()) === 1, String(await ownRows.count()))
  const rowText = await ownRows.first().innerText()
  check('row shows the venue name, the outcome and the confirmed stamps', /E2E \w+/.test(rowText) && rowText.includes('Approvata') && rowText.includes('3 confermati'), rowText)
  check('same filters as staff (panel opens, status filter in the URL)', await (async () => {
    await own.getByRole('button', { name: /Filtri/ }).click()
    await own.locator('#h-status').selectOption('rejected')
    await own.waitForTimeout(700)
    return new URL(own.url()).search === '?status=rejected' && (await own.getByText('Nessuna richiesta trovata.').count()) === 1
  })())
  check('header: back button on the left, logo centered', await (async () => {
    const back = await own.getByRole('button', { name: 'Indietro' }).boundingBox()
    const logo = await own.locator('.wordmark').boundingBox()
    const w = await own.evaluate(() => window.innerWidth)
    return !!back && !!logo && back.x < logo.x && Math.abs(logo.x + logo.width / 2 - w / 2) < 6
  })())
  await own.getByRole('button', { name: 'Indietro' }).click()
  await own.getByText('Richiesta approvata!').waitFor()
  check('back returns to the page the customer came from', own.url().includes(`/r/${r1}`))
  check('no horizontal overflow at 390 px', !(await overflow(own)))
  check('no unexpected 4xx/5xx for the customer', ownNet.length === 0, ownNet.join(' | '))

  section('Staff header is the same one')
  await staff.goto(`${APP}/staff/${V}/history`)
  await staff.getByRole('heading', { name: 'Storico richieste' }).waitFor()
  check('back on the staff history goes to the queue', await (async () => {
    await staff.getByRole('button', { name: 'Indietro' }).click()
    await staff.waitForURL(`**/staff/${V}`)
    return (await staff.getByRole('button', { name: 'Indietro' }).count()) === 0
  })())
  check('no unexpected 4xx/5xx for staff', net.length === 0, net.join(' | '))
} catch (e) {
  console.error('✘ unexpected error:', e.stack)
  try { cleanup() } catch {}
  process.exit(1)
}
await finish(browser)
