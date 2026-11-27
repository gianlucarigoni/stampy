// Staff queue checklist (T6-D, rewritten for F11: compact cards, 4 s "Annulla", Scaduta / Già gestita, venue chip).
// npm run dev, then from stampy-frontend/:   E2E_APP_URL=http://localhost:<web port> node e2e/t6d.mjs
// Screenshots go to E2E_SHOTS (default: the OS temp dir).
import { tmpdir } from 'node:os'
import { APP, psql as sql, cardCount, check, cleanup, createFixtures, eventsOf, finish, newUser, openBrowser, openRequest, pageFor, section, setCard } from './lib.mjs'

const SHOTS = process.env.E2E_SHOTS ?? tmpdir()
const api = (path, token, method = 'GET', body) =>
  fetch(`${APP}/api${path}`, { method, headers: { Cookie: `sid=${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
const UNDO = 4500 // a bit more than the 4 s undo window

let browser
try {
  const fx = createFixtures(10)
  const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10] = fx.customers
  const V = fx.venueId
  browser = await openBrowser()
  const staff = await pageFor(browser, fx.staff.token)
  const bad404 = []
  staff.on('response', (r) => { if (r.status() === 404) bad404.push(r.url()) })
  const consoleErrors = []
  staff.on('console', (m) => { if (m.type() === 'error' && !/409/.test(m.text())) consoleErrors.push(m.text()) })
  const codeOf = async (id) => (await (await api(`/venues/${V}/requests`, fx.staff.token)).json()).requests.find((q) => q.requestId === id).publicCode
  // The code is the customer's card code: an older request of the same customer may still show as a closed card below. Newest is first.
  const art = (code, page = staff) => page.locator('article', { hasText: code }).first()
  // Taps in the 300 ms after the list changed are ignored on purpose (a card may have moved under the finger).
  const appear = async (code) => { await art(code).waitFor(); await staff.waitForTimeout(450) }
  const confirmOf = (code, page = staff) => art(code, page).getByRole('button', { name: /^Conferma/ })

  section('1. Empty queue')
  await staff.goto(`${APP}/staff/${V}`)
  await staff.getByText('Nessuna richiesta in attesa').waitFor()
  await staff.getByText(/In ascolto · aggiornato alle/).waitFor()
  check('empty message + "In ascolto"', true)
  check('page title is "Stampy"', (await staff.title()) === 'Stampy', await staff.title())
  check('header shows the venue chip (single venue: plain label)', (await staff.locator('.venue-chip').count()) === 1)

  section('2. Request appears within 3 s, newest on top')
  const r1 = await openRequest(V, c1)
  const t0 = Date.now()
  const code1 = await codeOf(r1)
  await art(code1).waitFor({ timeout: 7000 })
  check(`appears within one poll round (${Date.now() - t0} ms)`, Date.now() - t0 <= 6000)
  const txt = await art(code1).innerText()
  check('shows code, customer name, "0 / 5 timbri"', txt.includes(code1) && txt.includes('E2E') && /0 \/ 5 timbri/.test(txt), txt)
  check('tab title shows count "(1) Stampy"', (await staff.title()) === '(1) Stampy', await staff.title())
  check('"Nuova" chip on the card that just arrived', (await art(code1).getByText('Nuova', { exact: true }).count()) === 1)
  check('counter "1 in coda"', (await staff.getByText(/^1 in coda/).count()) === 1)
  const r8 = await openRequest(V, c8)
  const code8 = await codeOf(r8)
  await art(code8).waitFor({ timeout: 5000 })
  const y1 = (await art(code1).boundingBox()).y
  const y8 = (await art(code8).boundingBox()).y
  check('newer request (c8) is above the older one (c1)', y8 < y1, `${y8} vs ${y1}`)

  section('3. Stepper')
  const a = art(code1)
  const minus = a.getByRole('button', { name: /in meno/ }), plus = a.getByRole('button', { name: /in più/ }), qty = a.getByRole('spinbutton')
  check('"−" at its minimum (aria-disabled, not faded)', (await minus.getAttribute('aria-disabled')) === 'true')
  await plus.click(); await plus.click()
  check('plus twice → 3', (await qty.inputValue()) === '3')
  await staff.waitForTimeout(7000)
  check('quantity kept across polls', (await qty.inputValue()) === '3')
  await qty.fill('50')
  check('"+" at its maximum', (await plus.getAttribute('aria-disabled')) === 'true')
  await qty.fill('51')
  await a.getByRole('button', { name: /^Conferma/ }).click()
  check('51 → "Massimo 50." and Confirm still enabled', (await a.getByText('Massimo 50.').count()) === 1 && !(await a.getByRole('button', { name: /^Conferma/ }).isDisabled()))
  await qty.fill('8')
  check('8 → warning "Stai confermando 8 prodotti."', (await a.getByText('Stai confermando 8 prodotti.').count()) === 1)
  await qty.fill('1')

  section('4. "Annulla": no call leaves')
  let calls = 0
  staff.on('request', (rq) => { if (rq.url().includes(`/requests/${r1}/`) && rq.method() === 'POST') calls++ })
  await confirmOf(code1).click()
  await a.getByRole('button', { name: /^Annulla/ }).click()
  await staff.waitForTimeout(UNDO)
  check('no POST after "Annulla"', calls === 0, String(calls))
  check('card is back with Conferma / Rifiuta', (await confirmOf(code1).count()) === 1)
  check('DB: card untouched', cardCount(c1.id, V) === 0 && (await eventsOf(r1)) === '')

  section('5. Confirm 1 product')
  await confirmOf(code1).click()
  await a.getByText(/^Confermo 1 prodotto/).waitFor()
  await a.getByText(/^Confermata/).waitFor({ timeout: 8000 })
  const o = await art(code1).innerText()
  check('quiet row "+1 timbro", no balance', /\+1 timbro/.test(o) && !/saldo/.test(o), o)
  check('success alert in place of the card', (await art(code1).locator('.alert-success').count()) === 1)
  check('DB card at 1', cardCount(c1.id, V) === 1)
  await staff.waitForTimeout(9000)
  check('outcome row does NOT disappear by itself', (await art(code1).count()) === 1)
  await a.getByRole('button', { name: 'Chiudi avviso' }).click()
  check('"Chiudi" removes it', (await art(code1).count()) === 0)

  section('6. Full card: chip "Premio" + "Consegna: premio", then the reward in the outcome')
  await setCard(V, fx.staff, c2, 3)
  await setCard(V, fx.staff, c3, 5)
  const r2 = await openRequest(V, c2); const code2 = await codeOf(r2)
  const r3 = await openRequest(V, c3); const code3 = await codeOf(r3)
  await art(code2).waitFor(); await art(code3).waitFor()
  const full = await art(code3).innerText()
  check('full card shows "Premio" and "Consegna: premio" (no reward name in the queue)', /Premio/.test(full) && /Consegna: premio/.test(full) && !/Caffè E2E/.test(full), full)
  await art(code2).getByRole('spinbutton').fill('3')
  await confirmOf(code2).click()
  await art(code2).getByText(/^Confermata/).waitFor({ timeout: 8000 })
  const outcome2 = await art(code2).innerText()
  check('outcome: prize chip + "Consegna: Caffè E2E", no balance', /Premio/.test(outcome2) && /Consegna: Caffè E2E/.test(outcome2) && !/saldo/.test(outcome2), outcome2)
  check('no Unicode glyphs ✔ ⚠ in the page', !/[✔⚠]/.test(await staff.locator('main').innerText()))
  check('no toast', (await staff.locator('.toast-stack').count()) === 0)

  section('7. Colleague handled it: "Già gestita", same height, selectable code')
  const r4 = await openRequest(V, c4); const code4 = await codeOf(r4)
  await appear(code4)
  const h4 = (await art(code4).boundingBox()).height
  await api(`/venues/${V}/requests/${r4}/confirm`, fx.staff.token, 'POST', { stamps: 1 }) // "the colleague"
  await art(code4).getByText('Già gestita', { exact: true }).waitFor({ timeout: 6000 })
  const h4b = (await art(code4).boundingBox()).height
  check(`card keeps its height (${h4} → ${h4b})`, Math.abs(h4 - h4b) <= 1)
  check('no Conferma on it, "Chiudi" present', (await confirmOf(code4).count()) === 0 && (await art(code4).getByRole('button', { name: /^Chiudi/ }).count()) === 1)
  check('code is still there, selectable', (await art(code4).locator('.queue-code').evaluate((el) => getComputedStyle(el).userSelect)) !== 'none')
  // 409 with `reason`: the colleague confirms inside our undo window
  const r5 = await openRequest(V, c5); const code5 = await codeOf(r5)
  await appear(code5)
  await confirmOf(code5).click()
  await api(`/venues/${V}/requests/${r5}/confirm`, fx.staff.token, 'POST', { stamps: 1 })
  await art(code5).getByText("Un collega l'ha già confermata.").waitFor({ timeout: 9000 })
  check('409 reason=approved → "Un collega l\'ha già confermata."', true)
  check('DB: only one confirm event (the colleague)', cardCount(c5.id, V) === 1)

  section('8. Reject')
  const r6 = await openRequest(V, c6); const code6 = await codeOf(r6)
  await appear(code6)
  await art(code6).getByRole('button', { name: /^Rifiuta/ }).click()
  await art(code6).getByText(/^Rifiutata/).waitFor({ timeout: 8000 })
  check('rejected outcome "nessun timbro", amber alert', (await art(code6).locator('.alert-warning').count()) === 1 && /nessun timbro/.test(await art(code6).innerText()))
  check('balance unchanged (card 0)', cardCount(c6.id, V) === 0)

  section('9. Double-click confirm')
  const r7 = await openRequest(V, c7); const code7 = await codeOf(r7)
  await appear(code7)
  let hits = 0
  staff.on('request', (rq) => { if (rq.url().includes(`/requests/${r7}/confirm`)) hits++ })
  await confirmOf(code7).dblclick()
  await staff.waitForTimeout(UNDO + 1500)
  check(`one confirm request sent (${hits})`, hits === 1)
  check('DB card at 1', cardCount(c7.id, V) === 1)

  section('10. Request expires')
  const r9 = await openRequest(V, c9); const code9 = await codeOf(r9)
  await appear(code9)
  await confirmOf(code9).click()
  sql(`UPDATE stamp_requests SET expires_at = now() - interval '1 second' WHERE id='${r9}'`)
  await art(code9).getByText('Scaduta', { exact: true }).waitFor({ timeout: 9000 })
  check('409 reason=expired → chip "Scaduta"', true)
  check('DB card unchanged', cardCount(c9.id, V) === 0)
  const r10 = await openRequest(V, c10); const code10 = await codeOf(r10)
  await appear(code10)
  sql(`UPDATE stamp_requests SET expires_at = now() - interval '1 second' WHERE id='${r10}'`)
  // Only the device clock is available here (the DB row was aged by hand, `expiresAt` the page knows is still in the future),
  // so the text is the generic "Già gestita"; a real expiry (`expiresAt` passed) reads "Scaduta".
  await art(code10).getByText(/^(Scaduta|Già gestita)$/).waitFor({ timeout: 6000 })
  check('leaves the server queue → card stays, without Conferma', (await confirmOf(code10).count()) === 0)
  check('"Chiudi tutti" with 2+ closed cards', (await staff.getByRole('button', { name: 'Chiudi tutti' }).count()) === 1)
  await staff.getByRole('button', { name: 'Chiudi tutti' }).click()
  check('"Chiudi tutti" clears the closed rows', (await art(code9).count()) === 0 && (await art(code10).count()) === 0)

  section('11. Authorization (same page for a foreign and a missing venue)')
  const br = sql(`SELECT branding FROM venues WHERE branding <> '{}'::jsonb LIMIT 1`)
  const otherId = sql(`INSERT INTO venues (name, slug, branding) VALUES ('E2E second','e2e-second-'||substr(gen_random_uuid()::text,1,8),'${br}'::jsonb) RETURNING id`).split('\n')[0]
  sql(`INSERT INTO promotions (venue_id, type, name, config, starts_at) VALUES ('${otherId}','stamps','E2E','{"v":1,"stampsRequired":5,"reward":"X"}', now() - interval '1 day')`)
  const s2 = await pageFor(browser, fx.staff.token)
  await s2.goto(`${APP}/staff/${otherId}`)
  await s2.getByText('Non sei autorizzato a gestire questo locale.').waitFor()
  const missing = await pageFor(browser, fx.staff.token)
  await missing.goto(`${APP}/staff/00000000-0000-4000-8000-000000000000`)
  await missing.getByText('Non sei autorizzato a gestire questo locale.').waitFor()
  check('foreign and missing venue → same "Non sei autorizzato"', true)
  const cu = await pageFor(browser, fx.customers[0].token)
  await cu.goto(`${APP}/staff/${V}`)
  await cu.getByText('Non sei autorizzato a gestire questo locale.').waitFor()
  check('customer-only on /staff/<id> → same page', true)

  section('12. Two venues: header chip menu')
  sql(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ('${fx.staff.id}','${otherId}','staff')`)
  const two = await pageFor(browser, fx.staff.token)
  await two.goto(`${APP}/staff`)
  await two.getByRole('heading', { name: 'I tuoi locali' }).waitFor()
  check('picker with 2 venues', (await two.locator('a.app-card-link').count()) === 2)
  await two.locator('a.app-card-link', { hasText: 'E2E second' }).click()
  await two.waitForURL(`**/staff/${otherId}`)
  const chip = two.locator('button.venue-chip')
  await chip.waitFor()
  check('chip shows the active venue', /E2E second/.test(await chip.innerText()))
  await chip.click()
  check('menu lists both venues + "Tutti i locali"', (await two.locator('#venue-menu a').count()) === 3)
  check('active venue has aria-current', (await two.locator('#venue-menu a[aria-current]').innerText()).includes('E2E second'))
  await two.locator('#venue-menu a:not([aria-current])').first().click()
  await two.waitForURL(`**/staff/${V}`)
  check('one tap on another venue changes venue', true)
  await two.locator('button.venue-chip').click()
  await two.getByRole('link', { name: 'Tutti i locali' }).click()
  await two.waitForURL('**/staff')
  check('"Tutti i locali" keeps the full page', true)
  await two.goto(`${APP}/staff/${V}`)
  await two.getByRole('button', { name: 'Menu' }).click()
  check('burger menu no longer has "Cambia locale"', (await two.getByText('Cambia locale', { exact: true }).count()) === 0)

  section('13. "Esci" asks for confirmation (D32)')
  // A separate staff user: the sign-out revokes its session, the other sections still need theirs.
  const leaver = newUser('leaver')
  sql(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ('${leaver.id}','${V}','staff')`)
  const three = await pageFor(browser, leaver.token)
  await three.goto(`${APP}/staff/${V}`)
  await three.getByRole('button', { name: 'Menu' }).click()
  await three.locator('#app-menu').getByRole('button', { name: 'Esci' }).click()
  await three.getByText('Vuoi uscire?').waitFor()
  await three.getByRole('button', { name: 'Resta connesso' }).click()
  await three.waitForTimeout(300)
  check('"Resta connesso" keeps the session', new URL(three.url()).pathname === `/staff/${V}`)
  await three.getByRole('button', { name: 'Menu' }).click()
  await three.locator('#app-menu').getByRole('button', { name: 'Esci' }).click()
  await three.getByRole('dialog').getByRole('button', { name: 'Esci' }).click()
  await three.waitForURL('**/login**')
  check('confirmed "Esci" leads to the login', true)

  section('14. Layout: 360 and 390 px, light and dark, touch targets')
  const fresh = await openRequest(V, c1)
  const freshCode = await codeOf(fresh)
  for (const width of [360, 390]) for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width, height: 760 }, colorScheme: scheme })
    await ctx.addCookies([{ name: 'sid', value: fx.staff.token, url: APP }])
    const p = await ctx.newPage()
    const bad = []; p.on('response', (r) => { if (r.status() >= 400 && r.status() !== 401 && r.status() !== 409) bad.push(r.status() + ' ' + r.url()) })
    await p.goto(`${APP}/staff/${V}`)
    await art(freshCode, p).waitFor()
    await p.waitForTimeout(500)
    check(`${width}/${scheme}: theme attribute`, (await p.evaluate(() => document.documentElement.getAttribute('data-bs-theme'))) === scheme)
    check(`${width}/${scheme}: no horizontal scroll`, !(await overflow(p)))
    check(`${width}/${scheme}: no 4xx/5xx in network`, bad.length === 0, bad.join(' | '))
    await p.screenshot({ path: `${SHOTS}/queue-${width}-${scheme}.png`, fullPage: true })
    await ctx.close()
  }
  await staff.reload()
  await art(freshCode).waitFor()
  const cb = await confirmOf(freshCode).boundingBox()
  const rb = await art(freshCode).getByRole('button', { name: /^Rifiuta/ }).boundingBox()
  check(`Conferma and Rifiuta ≥ 44 px tall (${cb.height}, ${rb.height})`, cb.height >= 44 && rb.height >= 44)
  check(`16 px between Conferma and Rifiuta (${rb.y - (cb.y + cb.height)})`, Math.abs(rb.y - (cb.y + cb.height) - 16) <= 1)
  const fav = await staff.evaluate(() => document.querySelector('link[rel~=icon]')?.href)
  const favRes = fav ? await fetch(fav) : { status: 0 }
  check(`favicon declared and served (${fav} → ${favRes.status})`, favRes.status === 200)
  check('no 404 seen in staff page network', bad404.length === 0, bad404.join(' | '))
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '))
} catch (e) {
  console.error('✘ unexpected error:', e.stack)
  try { cleanup() } catch {}
  process.exit(1)
}
try { sql(`DELETE FROM venue_members WHERE venue_id IN (SELECT id FROM venues WHERE name='E2E second'); DELETE FROM promotions WHERE venue_id IN (SELECT id FROM venues WHERE name='E2E second'); DELETE FROM venues WHERE name='E2E second'`) } catch (e) { console.error('cleanup2', e.message) }
await finish(browser)
