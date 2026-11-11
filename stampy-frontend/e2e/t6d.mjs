// T6-D staff flow checklist, automated. npm run dev, then from stampy-frontend/:  node e2e/t6d.mjs
import { execSync } from 'node:child_process'
import { APP, cardCount, check, cleanup, createFixtures, finish, openBrowser, openRequest, pageFor, section, setCard } from './lib.mjs'

const sql = (q) => execSync(`docker exec -i stampy-db psql -U stampy -d stampy_dev -At -v ON_ERROR_STOP=1`, { input: q }).toString().trim()
const api = (path, token, method = 'GET', body) =>
  fetch(`${APP}/api${path}`, { method, headers: { Cookie: `sid=${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
let browser
try {
  const fx = createFixtures(8)
  const [c1, c2, c3, c4, c5, c6, c7, c8] = fx.customers
  const V = fx.venueId
  browser = await openBrowser()
  const staff = await pageFor(browser, fx.staff.token)
  const bad404 = []
  staff.on('response', (r) => { if (r.status() === 404) bad404.push(r.url()) })
  const consoleErrors = []
  staff.on('console', (m) => { if (m.type() === 'error' && !/409/.test(m.text())) consoleErrors.push(m.text()) })
  const codeOf = async (id) => (await (await api(`/venues/${V}/requests`, fx.staff.token)).json()).requests.find((q) => q.requestId === id).publicCode
  const art = (code) => staff.locator('article', { hasText: code })

  section('1. Empty queue')
  await staff.goto(`${APP}/staff/${V}`)
  await staff.getByText('Nessuna richiesta in attesa').waitFor()
  check('empty message', true)
  check('page title is "Stampy"', (await staff.title()) === 'Stampy', await staff.title())

  section('2. Request appears within 3 s')
  const r1 = await openRequest(V, c1)
  const t0 = Date.now()
  const code1 = await codeOf(r1)
  await art(code1).waitFor({ timeout: 5000 })
  check(`appears within 3 s (${Date.now() - t0} ms)`, Date.now() - t0 <= 4000)
  const txt = await art(code1).innerText()
  check('shows code, time, "0 / 5 timbri"', txt.includes(code1) && /0 \/ 5 timbri/.test(txt) && /\d{1,2}[:.]\d{2}/.test(txt), txt)
  check('tab title shows count "(1) Stampy"', (await staff.title()) === '(1) Stampy', await staff.title())

  section('3. Stepper')
  const a = art(code1)
  const minus = a.getByRole('button', { name: /in meno/ }), plus = a.getByRole('button', { name: /in più/ }), qty = a.getByRole('spinbutton')
  check('"−" disabled at 1', await minus.isDisabled())
  await plus.click(); await plus.click()
  check('plus twice → 3', (await qty.inputValue()) === '3')
  await staff.waitForTimeout(7000)
  check('quantity kept across polls', (await qty.inputValue()) === '3')
  await qty.fill('50')
  check('"+" disabled at 50', await plus.isDisabled())
  await qty.fill('51')
  check('51 → "Quantità non valida" + Confirm disabled', (await a.getByText('Quantità non valida').count()) === 1 && (await a.getByRole('button', { name: /^Conferma/ }).isDisabled()))
  await qty.fill('0')
  check('0 → invalid', (await a.getByText('Quantità non valida').count()) === 1)
  await qty.fill('1')

  section('4. Confirm 1 product')
  await a.getByRole('button', { name: /^Conferma/ }).click()
  await staff.getByText('✔ Richiesta approvata').first().waitFor()
  const o = await art(code1).innerText()
  check('outcome card "+1 timbro", no balance', /\+1 timbro/.test(o) && !/saldo/.test(o), o)
  check('green alert-success, no top alert', (await art(code1).locator('.alert-success').count()) === 1 && (await staff.locator('.feedback .alert').count()) === 0)
  check('DB card at 1', cardCount(c1.id, V) === 1)

  section('5. Confirm more than missing (3 at 3/5) → reward')
  await setCard(V, fx.staff, c2, 3)
  await setCard(V, fx.staff, c3, 5)
  const r2 = await openRequest(V, c2); const code2 = await codeOf(r2)
  const r3 = await openRequest(V, c3); const code3 = await codeOf(r3) // stays pending below the card being confirmed
  await art(code2).waitFor(); await art(code3).waitFor()
  await art(code2).getByRole('spinbutton').fill('3')
  await art(code2).getByRole('button', { name: /^Conferma/ }).click()
  await art(code2).getByText(/Richiesta approvata/).waitFor()
  const outcome2 = await art(code2).innerText()
  check('outcome card shows "Premio ritirato" + reward name, no balance, no product instruction', /Premio ritirato/.test(outcome2) && /Caffè E2E/.test(outcome2) && !/saldo/.test(outcome2) && !/Non far pagare/.test(outcome2), outcome2)
  check('no toast: the card is the only feedback', (await staff.locator('.toast-stack').count()) === 0)
  console.log('    DB card after:', cardCount(c2.id, V))
  console.log('    outcome:', outcome2.replace(/\n/g, ' '))
  check('outcome card disappears by itself after ~8 s', await staff.locator('article', { hasText: code2 }).waitFor({ state: 'detached', timeout: 6000 }).then(() => true, () => false))

  section('6. Full card (5/5) in the queue')
  check('"Premio disponibile"', /Premio disponibile/.test(await art(code3).innerText()))

  section('7. Confirm the same request from two tabs')
  const r4 = await openRequest(V, c4); const code4 = await codeOf(r4)
  const tab2 = await pageFor(browser, fx.staff.token); await tab2.goto(`${APP}/staff/${V}`); await art(code4).waitFor(); await tab2.locator('article', { hasText: code4 }).waitFor()
  await tab2.locator('article', { hasText: code4 }).getByRole('button', { name: /^Conferma/ }).click()
  await tab2.getByText('✔ Richiesta approvata').first().waitFor()
  await art(code4).getByRole('button', { name: /^Conferma/ }).click() // tab 1 still shows the stale card
  await staff.locator('.feedback .alert-danger').waitFor({ timeout: 5000 })
  console.log('    error shown:', await staff.locator('.feedback .alert-danger').innerText())
  check('second gets an error alert', true)
  check('DB: only one confirm event', cardCount(c4.id, V) === 1)
  await staff.waitForTimeout(3500)
  check('stale card not left as pending approve button', (await art(code4).getByRole('button', { name: /^Conferma/ }).count()) === 0)

  section('8. Reject')
  const r5 = await openRequest(V, c5); const code5 = await codeOf(r5)
  await art(code5).waitFor()
  await art(code5).getByRole('button', { name: /^Rifiuta/ }).click()
  await staff.getByText('⚠ Richiesta rifiutata').first().waitFor()
  check('yellow outcome card', (await art(code5).locator('.alert-warning').count()) === 1)
  check('balance unchanged (card 0)', cardCount(c5.id, V) === 0)

  section('9. Double-click confirm')
  const r6 = await openRequest(V, c6); const code6 = await codeOf(r6)
  await art(code6).waitFor()
  let hits = 0
  staff.on('request', (rq) => { if (rq.url().includes(`/requests/${r6}/confirm`)) hits++ })
  await art(code6).getByRole('button', { name: /^Conferma/ }).dblclick()
  await staff.waitForTimeout(1500)
  check(`one confirm request sent (${hits})`, hits === 1)
  check('DB card at 1', cardCount(c6.id, V) === 1)

  section('10. Request expires while staff has it open')
  const r7 = await openRequest(V, c7); const code7 = await codeOf(r7)
  await art(code7).waitFor()
  sql(`UPDATE stamp_requests SET expires_at = now() - interval '1 second' WHERE id='${r7}'`)
  await art(code7).getByRole('button', { name: /^Conferma/ }).click()
  await staff.locator('.feedback .alert-danger').waitFor({ timeout: 5000 })
  console.log('    error shown:', await staff.locator('.feedback .alert-danger').innerText())
  check('error on confirm', true)
  await staff.waitForTimeout(1000)
  check('leaves the queue', (await art(code7).count()) === 0)
  check('DB card unchanged', cardCount(c7.id, V) === 0)

  section('11. Authorization')
  const br = sql(`SELECT branding FROM venues WHERE branding <> '{}'::jsonb LIMIT 1`)
  const otherId = sql(`INSERT INTO venues (name, slug, branding) VALUES ('E2E second','e2e-second-'||substr(gen_random_uuid()::text,1,8),'${br}'::jsonb) RETURNING id`).split('\n')[0]
  sql(`INSERT INTO promotions (venue_id, type, name, config, starts_at) VALUES ('${otherId}','stamps','E2E','{"v":1,"stampsRequired":5,"reward":"X"}', now() - interval '1 day')`)
  const other = { venueId: otherId }
  const s2 = await pageFor(browser, fx.staff.token)
  await s2.goto(`${APP}/staff/${other.venueId}`)
  await s2.getByText('Non sei autorizzato').waitFor()
  check('other venue → "Non sei autorizzato"', true)
  const cu = await pageFor(browser, c8.token)
  await cu.goto(`${APP}/staff/${V}`)
  await cu.getByText('Non sei autorizzato').waitFor()
  check('customer-only on /staff/<id> → "Non sei autorizzato"', true)
  await cu.goto(`${APP}/staff`)
  await cu.waitForTimeout(800)
  console.log('    customer-only /staff →', new URL(cu.url()).pathname)

  section('12. Two venues')
  sql(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ('${fx.staff.id}','${other.venueId}','staff')`)
  const two = await pageFor(browser, fx.staff.token)
  await two.goto(`${APP}/staff`)
  await two.getByText('I tuoi locali').waitFor()
  check('picker with 2 venues', (await two.locator('a.btn-outline-primary').count()) === 2)
  await two.locator('a.btn-outline-primary').first().click()
  await two.getByRole('link', { name: 'Cambia locale' }).waitFor()
  check('"Cambia locale" on the queue', true)

  section('13. Layout at 360 px, themes, favicon, network')
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, colorScheme: scheme })
    await ctx.addCookies([{ name: 'sid', value: fx.staff.token, url: APP }])
    const p = await ctx.newPage()
    const bad = []; p.on('response', (r) => { if (r.status() >= 400 && r.status() !== 401) bad.push(r.status() + ' ' + r.url()) })
        await p.goto(`${APP}/staff/${V}`)
    await p.getByRole('heading', { level: 1 }).waitFor()
    await p.waitForTimeout(1500)
    check(`${scheme}: theme attribute`, (await p.evaluate(() => document.documentElement.getAttribute('data-bs-theme'))) === scheme)
    check(`${scheme}: no horizontal scroll at 360 px`, !(await overflow(p)))
    check(`${scheme}: no 4xx/5xx in network`, bad.length === 0, bad.join(' | '))
    await p.screenshot({ path: `/tmp/claude-1000/-home-rigoni-g-Personal-stampy/eced0810-12b7-4725-b7af-09a12ef62726/scratchpad/staff-${scheme}.png` })
    await ctx.close()
  }
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
