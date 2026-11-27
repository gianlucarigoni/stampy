// Regression: a quantity typed by keyboard must survive the 3 s queue polling and the clock
// re-render, and Confirm must send exactly that quantity. Before the fix the field snapped
// back to 1 at the next poll (the value lived only in `@change`).
//   npm run dev   (repo root), then from stampy-frontend/:   node e2e/staff-input.mjs
import { check, cleanup, createFixtures, eventsOf, finish, openBrowser, openRequest, pageFor, section, cardCount, APP } from './lib.mjs'

let browser
try {
  const fx = createFixtures(1)
  const [customer] = fx.customers
  const requestId = await openRequest(fx.venueId, customer)
  browser = await openBrowser()
  const page = await pageFor(browser, fx.staff.token)
  await page.goto(`${APP}/staff/${fx.venueId}`)
  const input = page.getByRole('spinbutton').first()
  await input.waitFor()

  section('Typed quantity is stable')
  await input.click()
  await input.press('Control+A')
  await input.pressSequentially('3')
  // 7 s > two poll rounds (3 s each); the clock re-render also happens every 10 s.
  const seen = new Set()
  for (let i = 0; i < 7; i++) {
    await page.waitForTimeout(1000)
    seen.add(await input.inputValue())
  }
  check('value stays 3 for 7 s while polling', [...seen].join() === '3', [...seen].join())

  section('Invalid text is never sent silently')
  await input.press('Control+A')
  await input.pressSequentially('60')
  await page.waitForTimeout(3500)
  check('60 stays visible after a poll', (await input.inputValue()) === '60')
  // F11 (D26): primary buttons are never disabled. The tap sends nothing, puts the focus on the quantity field and
  // the message ("Massimo 50.", "Minimo 1.") appears in the reserved row of the card.
  const confirmBtn = page.getByRole('button', { name: /^Conferma/ })
  check('Confirm is not disabled (never-disabled primary)', !(await confirmBtn.isDisabled()))
  let sent = 0
  page.on('request', (r) => r.url().includes('/confirm') && sent++)
  await confirmBtn.click()
  check('tapping Confirm with a bad quantity focuses the field', await input.evaluate((el) => el === document.activeElement))
  check('message "Massimo 50." is shown', await page.getByText('Massimo 50.').isVisible())
  await input.press('Control+A')
  await input.pressSequentially('0')
  await confirmBtn.click()
  check('message "Minimo 1." is shown', await page.getByText('Minimo 1.').isVisible())
  await page.waitForTimeout(4500) // longer than the undo window: a tap that sent nothing must not fire later
  check('nothing was sent for an invalid quantity', sent === 0, String(sent))

  section('Confirm sends the typed value')
  await input.press('Control+A')
  await input.pressSequentially('3')
  const body = page.waitForRequest((r) => r.url().includes('/confirm') && r.method() === 'POST')
  await page.getByRole('button', { name: /^Conferma/ }).click()
  // D27: the call is delayed by 4 s so "Annulla" can cancel it.
  await page.getByText(/^Confermo 3 prodotti/).waitFor()
  check('"Annulla" is offered before the call leaves', (await page.getByRole('button', { name: /^Annulla/ }).count()) === 1)
  check('no stamp recorded during the undo window', (await eventsOf(requestId)) === '')
  check('request body is {stamps: 3}', (await body).postData() === '{"stamps":3}', (await body).postData() ?? '')
  await page.getByText(/^Confermata/).first().waitFor({ timeout: 8000 })
  check('DB: 1 stamp event of quantity 3', (await eventsOf(requestId)) === 'stamp:3', await eventsOf(requestId))
  check('DB: card at 3 stamps', cardCount(customer.id, fx.venueId) === 3)
} catch (e) {
  console.error('✘ unexpected error:', e.message)
  try { cleanup() } catch {}
  process.exit(1)
}
await finish(browser)
