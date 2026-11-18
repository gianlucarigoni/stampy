// Invio del codice di accesso (issue #36 / T2): casi normali e limite, con screenshot.
//   OTP_PROVIDER=console npm run dev   (MAI "both"/"gmail": manderebbe email vere)
//   E2E_APP_URL=http://localhost:<web port> E2E_DB=<db del worktree> node e2e/email-request.mjs
// Screenshot in docs/reports/t2-screenshots/ (E2E_SHOTS per cambiare cartella).
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { APP, check, finish, openBrowser, psql, section } from './lib.mjs'

const SHOTS = resolve(process.env.E2E_SHOTS ?? '../docs/reports/t2-screenshots')
mkdirSync(SHOTS, { recursive: true })
const RUN = Date.now().toString(36)
const emails = []
const mail = (tag) => {
  const e = `e2e-${RUN}-otp-${tag}@test.it`
  emails.push(e)
  return e
}
const challenges = (email) => Number(psql(`SELECT count(*) FROM otp_challenges WHERE destination='${email}'`))
const live = (email) =>
  Number(psql(`SELECT count(*) FROM otp_challenges WHERE destination='${email}' AND consumed_at IS NULL AND invalidated_at IS NULL`))
const age = (email, secs) =>
  psql(`UPDATE otp_challenges SET created_at = created_at - make_interval(secs => ${secs}) WHERE destination='${email}'`)

let browser
let n = 0
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, '0')}-${name}.png` })
const fresh = async (viewport = { width: 390, height: 780 }) => {
  const page = await (await browser.newContext({ viewport })).newPage()
  await page.goto(`${APP}/login`)
  await page.getByLabel('Email').waitFor()
  return page
}
const posts = (page) => {
  const seen = []
  page.on('request', (r) => r.method() === 'POST' && r.url().includes('/auth/email/request') && seen.push(r.url()))
  return seen
}

try {
  browser = await openBrowser()

  section('Caso normale: invio del codice')
  {
    const email = mail('ok')
    const page = await fresh()
    await shot(page, 'login-vuoto')
    await page.getByLabel('Email').fill(email)
    await shot(page, 'login-email-compilata')
    await page.getByRole('button', { name: 'Invia il codice' }).click()
    await page.getByRole('heading', { name: 'Inserisci il codice' }).waitFor()
    await shot(page, 'passo-codice')
    check('si passa al passo "Inserisci il codice"', true)
    check('DB: una sola sfida, viva', challenges(email) === 1 && live(email) === 1, `${challenges(email)}/${live(email)}`)
    check('il campo del codice ha il focus', (await page.evaluate(() => document.activeElement?.id)) === 'code')
  }

  section('Cooldown: nuovo codice subito dopo il primo')
  {
    const email = mail('cooldown')
    const page = await fresh()
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Invia il codice' }).click()
    await page.getByRole('heading', { name: 'Inserisci il codice' }).waitFor()
    await page.getByRole('button', { name: 'Invia un nuovo codice' }).click()
    await page.getByText(/Riprova tra/).first().waitFor()
    await shot(page, 'cooldown-attesa')
    check('compare "Riprova tra …"', true)
    check('il pulsante "Invia un nuovo codice" è disabilitato', await page.getByRole('button', { name: 'Invia un nuovo codice' }).isDisabled())
    check('DB: ancora una sola sfida, la stessa viva', challenges(email) === 1 && live(email) === 1, `${challenges(email)}/${live(email)}`)
  }

  section('Caso limite: doppio clic velocissimo su "Invia il codice"')
  {
    const email = mail('dblclick')
    const page = await fresh()
    const seen = posts(page)
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Invia il codice' }).dblclick({ delay: 0 })
    await page.getByRole('heading', { name: 'Inserisci il codice' }).waitFor()
    await page.waitForTimeout(500)
    await shot(page, 'doppio-clic')
    check('parte una sola richiesta', seen.length === 1, `richieste: ${seen.length}`)
    check('DB: una sola sfida, viva', challenges(email) === 1 && live(email) === 1, `${challenges(email)}/${live(email)}`)
  }

  section('Caso limite: 5 richieste simultanee dal browser (la race di T2)')
  {
    const email = mail('burst')
    const page = await fresh()
    const statuses = await page.evaluate(async (e) => {
      const rs = await Promise.all(
        Array.from({ length: 5 }, () =>
          fetch('/api/auth/email/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: e }),
          }).then((r) => r.status),
        ),
      )
      return rs.sort()
    }, email)
    check('una 202 e quattro 429, nessun 5xx', statuses.join(',') === '202,429,429,429,429', statuses.join(','))
    check('DB: una sola sfida, viva', challenges(email) === 1 && live(email) === 1, `${challenges(email)}/${live(email)}`)
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Invia il codice' }).click()
    await page.getByText(/Riprova tra/).first().waitFor()
    await shot(page, 'dopo-raffica-attesa')
    check('dopo la raffica la UI mostra l\'attesa', true)
  }

  section('Caso limite: email non valida')
  {
    const page = await fresh()
    await page.getByLabel('Email').fill('non-una-email')
    await page.getByRole('button', { name: 'Invia il codice' }).click()
    await shot(page, 'email-non-valida-browser')
    const invalidByBrowser = await page.getByLabel('Email').evaluate((el) => !el.validity.valid)
    check('il browser blocca l\'invio (type=email)', invalidByBrowser)
    const page2 = await fresh()
    await page2.getByLabel('Email').fill('a@b')
    await page2.getByRole('button', { name: 'Invia il codice' }).click()
    await page2.waitForTimeout(800)
    await shot(page2, 'email-a-at-b')
    const error = await page2.getByRole('alert').first().textContent().catch(() => null)
    check('"a@b": o il passo del codice o un errore leggibile (nessuna pagina rotta)',
      error !== null || (await page2.getByRole('heading', { name: 'Inserisci il codice' }).count()) === 1, String(error))
    emails.push('a@b')
  }

  section('Caso limite: errore del server (503, risposta simulata dal browser)')
  {
    const page = await fresh()
    await page.route('**/api/auth/email/request', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'GenericError', message: 'Impossibile inviare il codice, riprova' }) }),
    )
    await page.getByLabel('Email').fill(mail('503'))
    await page.getByRole('button', { name: 'Invia il codice' }).click()
    await page.getByText('Impossibile inviare il codice, riprova').waitFor()
    await shot(page, 'errore-503')
    check('messaggio d\'errore visibile e pulsante di nuovo attivo', !(await page.getByRole('button', { name: 'Invia il codice' }).isDisabled()))
  }

  section('Caso limite: tetto orario (5 invii/ora)')
  {
    const email = mail('hourly')
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${APP}/api/auth/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (r.status !== 202) throw new Error(`invio ${i + 1}: ${r.status}`)
      age(email, 60)
    }
    const page = await fresh()
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: 'Invia il codice' }).click()
    await page.getByText(/Riprova tra \d+ min$/).waitFor()
    await shot(page, 'tetto-orario')
    check('attesa lunga in minuti', true)
    check('DB: nessuna sesta sfida', challenges(email) === 5, String(challenges(email)))
    check('il pulsante resta disabilitato', await page.getByRole('button', { name: 'Invia il codice' }).isDisabled())
  }

  section('Schermo largo (desktop)')
  {
    const page = await fresh({ width: 1280, height: 720 })
    await page.getByLabel('Email').fill(mail('desktop'))
    await page.getByRole('button', { name: 'Invia il codice' }).click()
    await page.getByRole('heading', { name: 'Inserisci il codice' }).waitFor()
    await shot(page, 'desktop-passo-codice')
    check('passo del codice anche su desktop', true)
  }
} catch (e) {
  console.error(e)
  check('lo script finisce senza eccezioni', false, e.message.split('\n')[0])
} finally {
  try {
    const list = emails.map((e) => `'${e}'`).join(',')
    if (list) psql(`DELETE FROM otp_challenges WHERE destination IN (${list})`)
  } catch (e) {
    console.error('pulizia fallita:', e.message)
  }
  await finish(browser)
}
