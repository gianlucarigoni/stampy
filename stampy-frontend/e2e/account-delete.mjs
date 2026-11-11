// Account deletion (B4): menu entry, warning, OTP, success, wrong code, staff blocked.
//   E2E_APP_URL=http://localhost:<web port> E2E_DB=<db of the worktree> node e2e/account-delete.mjs
// The OTP code is unknown to the test (the server only stores its HMAC), so after the UI asks for it the
// challenge's hash is replaced with the HMAC of a known code, using OTP_HMAC_SECRET from the backend .env.
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { APP, check, finish, newUser, openBrowser, pageFor, psql, section } from './lib.mjs'

const CODE = '123456'
const secret =
  process.env.OTP_HMAC_SECRET ??
  readFileSync(new URL('../../stampy-backend/.env', import.meta.url), 'utf8').match(/^OTP_HMAC_SECRET=(.*)$/m)?.[1]?.replace(/^["']|["']$/g, '')
if (!secret) throw new Error('OTP_HMAC_SECRET not found')

const emailOf = (id) => psql(`SELECT email FROM users WHERE id='${id}'`)
const userState = (id) => psql(`SELECT coalesce(email,'NULL') || '|' || (anonymized_at IS NOT NULL) FROM users WHERE id='${id}'`)

/** Makes the live challenge of this email answer to CODE. */
function knownCode(email) {
  const id = psql(`SELECT id FROM otp_challenges WHERE destination='${email}' ORDER BY created_at DESC LIMIT 1`)
  const hash = crypto.createHmac('sha256', secret).update(`otp:${id}:${CODE}`).digest('hex')
  psql(`UPDATE otp_challenges SET code_hash='${hash}' WHERE id='${id}'`)
}

let browser
let venueId
const customer = newUser('del-customer')
const staff = newUser('del-staff')
try {
  venueId = psql(
    `INSERT INTO venues (name, slug, branding) VALUES ('E2E del','e2e-del-${Date.now().toString(36)}','{"v":1,"logoUrl":"https://placehold.co/512x512.png","backgroundColor":"#AA0000"}'::jsonb) RETURNING id`,
  )
  psql(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ('${staff.id}','${venueId}','staff')`)
  browser = await openBrowser()

  section('Customer: menu → warning → code → deletion')
  const page = await pageFor(browser, customer.token)
  await page.goto(`${APP}/history`)
  await page.getByRole('button', { name: 'Menu' }).click()
  check('menu offers "Profilo" and not "Elimina account"', (await page.getByRole('link', { name: 'Profilo' }).count()) === 1 && (await page.getByRole('link', { name: 'Elimina account' }).count()) === 0)
  await page.getByRole('link', { name: 'Profilo' }).click()
  await page.getByRole('link', { name: 'Elimina account' }).waitFor()
  check('profile offers "Elimina account"', true)
  await page.getByRole('link', { name: 'Elimina account' }).click()
  await page.getByRole('heading', { name: 'Elimina il tuo account' }).waitFor()
  check('URL is /account/delete', new URL(page.url()).pathname === '/account/delete')
  check('warning says it cannot be undone', (await page.getByText('Non si può annullare').count()) === 1)

  await page.getByRole('button', { name: 'Invia il codice' }).click()
  await page.getByLabel('Codice a 6 cifre').waitFor()
  check('code field appears after sending', true)
  knownCode(emailOf(customer.id))

  await page.getByLabel('Codice a 6 cifre').fill('000000')
  await page.getByRole('button', { name: 'Elimina il mio account' }).click()
  await page.getByText('Codice non valido. Ti restano 4 tentativi.').waitFor()
  check('wrong code: message with remaining attempts, account untouched', userState(customer.id).endsWith('|false'), userState(customer.id))

  await page.getByLabel('Codice a 6 cifre').fill(CODE)
  await page.waitForTimeout(500)
  check('the correct code does NOT delete by itself (irreversible action)', userState(customer.id).endsWith('|false') && new URL(page.url()).pathname === '/account/delete')
  await page.getByRole('button', { name: 'Elimina il mio account' }).click()
  await page.getByText('Account eliminato').waitFor()
  check('lands on /login with the confirmation', new URL(page.url()).pathname === '/login')
  check('DB: email NULL and anonymized_at set', userState(customer.id) === 'NULL|true', userState(customer.id))
  const cookies = await page.context().cookies()
  check('session cookie is gone', !cookies.some((c) => c.name === 'sid' && c.value))
  await page.goto(`${APP}/history`)
  await page.waitForURL(/\/login/)
  check('old session no longer opens private pages', true)

  section('Staff: blocked')
  const s = await pageFor(browser, staff.token)
  await s.goto(`${APP}/staff/${venueId}`)
  await s.getByRole('button', { name: 'Menu' }).click()
  check('staff menu does not offer "Elimina account"', (await s.getByRole('link', { name: 'Elimina account' }).count()) === 0)
  await s.goto(`${APP}/account/delete`)
  await s.getByText('non può essere eliminato da qui').waitFor()
  check('direct URL shows the block message', true)
  check('no "Invia il codice" button for staff', (await s.getByRole('button', { name: 'Invia il codice' }).count()) === 0)
  check('DB: staff untouched', userState(staff.id).endsWith('|false'))

  section('Mobile width')
  const narrow = await pageFor(browser, newUser('del-narrow').token, { width: 360, height: 700 })
  await narrow.goto(`${APP}/account/delete`)
  await narrow.getByRole('heading', { name: 'Elimina il tuo account' }).waitFor()
  check('no horizontal overflow at 360 px', !(await narrow.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)))
} catch (e) {
  check('script ran without exceptions', false, e.message)
} finally {
  try {
    if (venueId) psql(`DELETE FROM venue_members WHERE venue_id='${venueId}'; DELETE FROM venues WHERE id='${venueId}';`)
  } catch {}
  await finish(browser)
}
