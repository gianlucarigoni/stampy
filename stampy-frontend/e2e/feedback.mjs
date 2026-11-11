// Feedback flows: staff in-card approval / rejection, reward toast; customer approval text and
// reward modal (persistence, focus trap, keyboard, reload); mobile width.
//   npm run dev, then from stampy-frontend/:   node e2e/feedback.mjs
import { APP, cardCount, check, cleanup, createFixtures, eventsOf, finish, openBrowser, openRequest, pageFor, section, setCard } from './lib.mjs'

let browser
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
const dialogOpen = (page) => page.evaluate(() => !!document.querySelector('dialog[open]'))

try {
  const fx = createFixtures(5)
  const [plain, reward, rejected, staffReward, escape] = fx.customers
  // `reward`, `staffReward`, `escape` start with a full card (5/5): the next product is the free one.
  for (const c of [reward, staffReward, escape]) await setCard(fx.venueId, fx.staff, c, 5)
  const reqPlain = await openRequest(fx.venueId, plain)
  const reqRejected = await openRequest(fx.venueId, rejected)
  const reqStaffReward = await openRequest(fx.venueId, staffReward)
  browser = await openBrowser()

  // ---------------- staff ----------------
  section('Staff: approval, rejection and reward feedback')
  const staff = await pageFor(browser, fx.staff.token)
  await staff.goto(`${APP}/staff/${fx.venueId}`)
  await staff.getByRole('spinbutton').first().waitFor()
  const card = (req) => staff.locator('article', { has: staff.getByRole('button', { name: /^(Conferma|Rifiuta|Chiudi esito)/ }) })
  const articleOf = async (code) => staff.locator('article', { hasText: code })

  const codes = {}
  for (const [name, c] of [['plain', plain], ['rejected', rejected], ['staffReward', staffReward]]) {
    codes[name] = (await (await fetch(`${APP}/api/venues/${fx.venueId}/requests`, { headers: { Cookie: `sid=${fx.staff.token}` } })).json()).requests
  }
  const queue = codes.plain
  // Map request ids to codes through the queue API.
  const codeOf = (id) => queue.find((q) => q.requestId === id).publicCode
  const plainCode = codeOf(reqPlain)
  const rejectedCode = codeOf(reqRejected)
  const rewardCode = codeOf(reqStaffReward)

  // approval of 2 products
  let a = await articleOf(plainCode)
  await a.getByRole('spinbutton').fill('2')
  await a.getByRole('button', { name: /^Conferma/ }).click()
  await staff.getByText('Richiesta approvata').first().waitFor()
  a = await articleOf(plainCode)
  check('approval: in-card text shows +2 timbri, no balance', /\+2 timbri/.test(await a.innerText()) && !/saldo/.test(await a.innerText()), await a.innerText())
  check('approval: card is alert-success', (await a.locator('.alert-success').count()) === 1)
  check('approval: no generic alert at the top', (await staff.locator('.feedback .alert').count()) === 0)
  check('approval: no reward toast', (await staff.locator('.toast-stack .alert').count()) === 0)
  check('DB: card at 2', cardCount(plain.id, fx.venueId) === 2)

  // rejection
  const before = cardCount(rejected.id, fx.venueId)
  a = await articleOf(rejectedCode)
  await a.getByRole('button', { name: /^Rifiuta/ }).click()
  await staff.getByText('Richiesta rifiutata').first().waitFor()
  a = await articleOf(rejectedCode)
  check('rejection: alert-warning with text', (await a.locator('.alert-warning').count()) === 1 && /Nessun timbro aggiunto/.test(await a.innerText()))
  check('rejection: not shown as success or error', (await a.locator('.alert-success, .alert-danger').count()) === 0)
  check('rejection: no top alert', (await staff.locator('.feedback .alert').count()) === 0)
  check('DB: rejected card unchanged', cardCount(rejected.id, fx.venueId) === before, `${before} -> ${cardCount(rejected.id, fx.venueId)}`)

  // reward on a full card
  a = await articleOf(rewardCode)
  await a.getByRole('button', { name: /^Conferma/ }).click()
  await staff.locator('.toast-stack .alert').first().waitFor()
  const toast = await staff.locator('.toast-stack').innerText()
  check('reward toast names the real reward', /Caffè E2E/.test(toast) && /Premio ritirato/.test(toast), toast)
  check('toast text is generic (no instruction about the product)', !/Non far pagare/.test(toast), toast)
  check('toast does not block the page (Rifiuta/Conferma on other cards stay clickable)', (await staff.locator('.toast-stack').evaluate((el) => getComputedStyle(el).pointerEvents)) === 'none')
  await staff.waitForTimeout(3500) // > one poll (3 s); the toast lasts 5 s, outcome cards 8 s
  check('exactly one toast after several polls', (await staff.locator('.toast-stack .alert').count()) === 1)
  check('approved/rejected cards survive the polls', (await staff.locator('article .alert-success').count()) === 2 && (await staff.locator('article .alert-warning').count()) === 1, `${await staff.locator('article .alert-success').count()}/${await staff.locator('article .alert-warning').count()}`)
  check('DB: reward consumed, card at 0', cardCount(staffReward.id, fx.venueId) === 0 && (await eventsOf(reqStaffReward)) === 'redeem:1')
  await staff.getByRole('button', { name: 'Chiudi notifica' }).click()
  check('toast can be dismissed', (await staff.locator('.toast-stack .alert').count()) === 0)
  check('staff page has no horizontal overflow at 390 px', !(await overflow(staff)))

  // ---------------- customer ----------------
  section('Customer: approval message (no reward)')
  const cust = await pageFor(browser, plain.token)
  await cust.goto(`${APP}/r/${reqPlain}`)
  await cust.getByText('Richiesta approvata!').waitFor()
  check('shows "+2 timbri aggiunti"', await cust.getByText('+2 timbri aggiunti').isVisible())
  check('shows balance 2 / 5', await cust.getByText('2 / 5 timbri').isVisible())
  check('no reward modal', !(await dialogOpen(cust)))

  section('Customer: rejected request')
  const rej = await pageFor(browser, rejected.token)
  await rej.goto(`${APP}/r/${reqRejected}`)
  await rej.getByText('Richiesta non confermata').waitFor()
  check('no approval text, no modal', (await rej.getByText('Richiesta approvata').count()) === 0 && !(await dialogOpen(rej)))

  section('Customer: reward modal')
  const reqReward = await openRequest(fx.venueId, reward)
  const rp = await pageFor(browser, reward.token)
  await rp.goto(`${APP}/r/${reqReward}`)
  await rp.getByText('Richiesta inviata').waitFor()
  await fetch(`${APP}/api/venues/${fx.venueId}/requests/${reqReward}/confirm`, {
    method: 'POST', headers: { Cookie: `sid=${fx.staff.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stamps: 1 }),
  })
  await rp.getByRole('dialog').waitFor({ timeout: 8000 }) // picked up by the 2 s polling
  const dlg = rp.getByRole('dialog')
  check('modal names the real reward', /Caffè E2E/.test(await dlg.innerText()), await dlg.innerText())
  check('approval text shows the no-new-stamp case', await rp.getByText('Nessun nuovo timbro: questo prodotto era il premio.').isVisible())
  check('modal is accessible (labelled)', (await dlg.getAttribute('aria-labelledby')) === 'reward-title')
  await rp.waitForTimeout(4000)
  check('modal persists without user action', await dialogOpen(rp))
  const trapped = []
  for (let i = 0; i < 4; i++) { await rp.keyboard.press('Tab'); trapped.push(await rp.evaluate(() => { const a = document.activeElement; return !a || a === document.body || !!a.closest('dialog') })) }
  check('Tab never reaches the inert page behind (dialog or browser UI only)', trapped.every(Boolean), trapped.join())
  check('no horizontal overflow with the modal at 390 px', !(await overflow(rp)))
  await rp.reload()
  await rp.getByRole('dialog').waitFor()
  check('reload before dismissal shows the modal again', await dialogOpen(rp))
  await rp.keyboard.press('Enter') // focus is on "Chiudi" (autofocus)
  await rp.waitForTimeout(300)
  check('Enter on "Chiudi" closes the modal', !(await dialogOpen(rp)))
  await rp.reload()
  await rp.getByText('Richiesta approvata!').waitFor()
  await rp.waitForTimeout(500)
  check('reload after dismissal: no modal, approval card still there', !(await dialogOpen(rp)))

  section('Customer: Esc closes and counts as dismissed')
  const reqEsc = await openRequest(fx.venueId, escape)
  await fetch(`${APP}/api/venues/${fx.venueId}/requests/${reqEsc}/confirm`, {
    method: 'POST', headers: { Cookie: `sid=${fx.staff.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ stamps: 1 }),
  })
  const ep = await pageFor(browser, escape.token)
  await ep.goto(`${APP}/r/${reqEsc}`)
  await ep.getByRole('dialog').waitFor()
  await ep.keyboard.press('Escape')
  await ep.waitForTimeout(300)
  check('Esc closes the modal', !(await dialogOpen(ep)))
  await ep.reload()
  await ep.getByText('Richiesta approvata!').waitFor()
  await ep.waitForTimeout(500)
  check('after Esc and reload it does not reappear', !(await dialogOpen(ep)))
} catch (e) {
  console.error('✘ unexpected error:', e.message)
  try { cleanup() } catch {}
  process.exit(1)
}
await finish(browser)
