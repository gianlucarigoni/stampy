// Display name page (F2): shown once while display_name is NULL, not skippable, editable from the profile.
//   E2E_APP_URL=http://localhost:<web port> E2E_DB=<db of the worktree> node e2e/display-name.mjs
import { APP, check, finish, newUser, openBrowser, pageFor, psql, section } from './lib.mjs'

const nameOf = (id) => psql(`SELECT coalesce(display_name,'NULL') FROM users WHERE id='${id}'`)

let browser
const fresh = newUser('name-fresh')
const named = newUser('name-named')
try {
  psql(`UPDATE users SET display_name = NULL WHERE id='${fresh.id}'`)
  browser = await openBrowser()
  const path = (page) => new URL(page.url()).pathname

  section('User without a name: every page leads to "Come ti chiami?"')
  const page = await pageFor(browser, fresh.token)
  await page.goto(`${APP}/history`)
  await page.getByRole('heading', { name: 'Come ti chiami?' }).waitFor()
  check('/history redirects to /name', path(page) === '/name', page.url())
  check('no way to skip it', (await page.getByRole('button', { name: /salta/i }).count()) === 0)

  await page.getByRole('button', { name: 'Menu' }).click()
  check('B28 (4): the menu on /name offers only "Esci"',
    (await page.locator('#app-menu .dropdown-item').allTextContents()).map((t) => t.trim()).join() === 'Esci')
  await page.keyboard.press('Escape')

  section('Validation')
  await page.getByLabel('Il tuo nome').fill('Al')
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.getByText('Scrivi almeno 3 caratteri').waitFor()
  check('too short: message, nothing saved', nameOf(fresh.id) === 'NULL', nameOf(fresh.id))
  await page.getByLabel('Il tuo nome').fill('<b>Mario</b>')
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.getByText(/Usa solo lettere/).waitFor()
  check('forbidden characters: message, nothing saved', nameOf(fresh.id) === 'NULL')
  check('the error is linked to the field and holds the focus',
    (await page.getByLabel('Il tuo nome').getAttribute('aria-invalid')) === 'true' &&
      (await page.evaluate(() => document.activeElement?.id)) === 'display-name')
  await page.getByLabel('Il tuo nome').fill('123')
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.getByText('Scrivi almeno una lettera').waitFor()
  check('digits only: its own message, nothing saved', nameOf(fresh.id) === 'NULL')
  await page.getByLabel('Il tuo nome').fill('Mario Rossi')
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.getByText(/Usa solo lettere/).waitFor()
  check('non-breaking space inside: refused', nameOf(fresh.id) === 'NULL')

  section('Saving')
  await page.getByLabel('Il tuo nome').fill("  Zoë   D'Angelo  ")
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.waitForURL((u) => u.pathname !== '/name')
  check('saved normalised in the DB', nameOf(fresh.id) === "Zoë D'Angelo", nameOf(fresh.id))
  check('goes to the original destination (/history)', path(page) === '/history', page.url())
  await page.reload()
  await page.waitForTimeout(500)
  check('reload: the page does not come back', path(page) === '/history', page.url())
  await page.goto(`${APP}/name`)
  await page.waitForURL((u) => u.pathname !== '/name')
  check('/name with a name set leads away', path(page) !== '/name', page.url())

  section('Profile: change the name')
  await page.goto(`${APP}/profile`)
  await page.getByRole('heading', { name: "Zoë D'Angelo" }).waitFor()
  await page.getByRole('button', { name: 'Modifica nome' }).click()
  await page.getByLabel('Il tuo nome').fill('Anna Bianchi')
  await page.getByRole('button', { name: 'Salva' }).click()
  await page.getByRole('heading', { name: 'Anna Bianchi' }).waitFor()
  check('profile shows and saves the new name', nameOf(fresh.id) === 'Anna Bianchi', nameOf(fresh.id))
  check('focus returns to "Modifica nome" after saving',
    (await page.evaluate(() => document.activeElement?.textContent?.trim())) === 'Modifica nome')
  await page.getByRole('button', { name: 'Modifica nome' }).click()
  await page.getByLabel('Il tuo nome').fill('José राहुल शर्मा')
  await page.getByRole('button', { name: 'Salva' }).click()
  await page.getByRole('heading', { name: 'José राहुल शर्मा' }).waitFor()
  check('combining marks and Devanagari accepted, saved in NFC', nameOf(fresh.id) === 'José राहुल शर्मा', nameOf(fresh.id))

  section('User with a name: never asked')
  const other = await pageFor(browser, named.token)
  await other.goto(`${APP}/history`)
  await other.getByRole('heading', { name: 'Le tue richieste' }).waitFor()
  check('goes straight to /history', path(other) === '/history', other.url())
} catch (e) {
  console.error(e)
  process.exitCode = 1
} finally {
  await finish(browser)
}
