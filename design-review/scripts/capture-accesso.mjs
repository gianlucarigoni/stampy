// Cattura della sezione Accesso (login, codice, errori, session-error, 404).
// Uso:  node design-review/scripts/capture-accesso.mjs
// Variabili:  E2E_APP_URL (default http://localhost:5174)   OUT (default design-review/screens/accesso/anonimo)
// Playwright è quello già presente tra le devDependencies del frontend del worktree: nessuna installazione.
// Nessun PNG viene aperto da questo script. Scrive anche <OUT>/_manifest.json (catturati / falliti).
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const WT = process.env.WT ?? '/home/rigoni_g/Personal/stampy-wt/dr'
const require = createRequire(path.join(WT, 'stampy-frontend/package.json'))
const { chromium } = require('playwright')

const BASE = process.env.E2E_APP_URL ?? 'http://localhost:5174'
const OUT = process.env.OUT ?? path.resolve('design-review/screens/accesso/anonimo')
mkdirSync(OUT, { recursive: true })

// Email reali del DB del worktree (copia di stampy_dev); con OTP_PROVIDER=console non parte nessuna email.
const EMAILS = { light: 'simone.deluca@stampy.test', dark: 'martina.costa@stampy.test' }
const manifest = { captured: [], failed: [], notes: [] }

const browser = await chromium.launch()

async function newPage(theme) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'it-IT',
    hasTouch: true,
  })
  const page = await ctx.newPage()
  page.setDefaultTimeout(8000)
  return { ctx, page }
}

const settle = async (page) => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250) // transizioni (.dot, bottone Google)
}

// full=true: pagina intera (le pagine possono scrollare); full=false: solo il viewport (overlay/elementi fissi).
async function shot(page, theme, name, { full = true } = {}) {
  await settle(page)
  const file = `${name}__${theme}.png`
  await page.screenshot({ path: path.join(OUT, file), fullPage: full })
  manifest.captured.push({ file, mode: full ? 'full-page' : 'viewport' })
  console.log('✔', file)
}

async function step(theme, name, fn) {
  try {
    await fn()
  } catch (e) {
    manifest.failed.push({ name: `${name}__${theme}`, reason: String(e.message ?? e).split('\n')[0] })
    console.log('✘', name, theme, String(e.message ?? e).split('\n')[0])
  }
}

const json = (status, body, headers = {}) => ({
  status,
  contentType: 'application/json',
  headers,
  body: JSON.stringify(body),
})

async function emailStage(page, qs = '') {
  await page.goto(`${BASE}/login${qs}`)
  await page.waitForSelector('#email')
}

// Va allo stato «codice» con una richiesta VERA al backend del worktree.
async function realCodeStage(page, email) {
  await emailStage(page)
  await page.fill('#email', email)
  await page.click('button[type=submit]')
  await page.waitForSelector('#code')
}

// Va allo stato «codice» senza toccare il backend (risposta simulata).
async function mockedCodeStage(page, email) {
  await page.route('**/api/auth/email/request', (r) => r.fulfill(json(200, { challengeId: 'mock-challenge' })))
  await emailStage(page)
  await page.fill('#email', email)
  await page.click('button[type=submit]')
  await page.waitForSelector('#code')
}

for (const theme of ['light', 'dark']) {
  const email = EMAILS[theme]

  // ───────── Login email ─────────
  await step(theme, 'login', async () => {
    const { ctx, page } = await newPage(theme)
    await emailStage(page)
    // email-vuota = anche input email DEFAULT e bottone «Invia il codice» DISABLED (stessa schermata)
    await shot(page, theme, 'login__email-vuoto')
    await page.focus('#email')
    await page.keyboard.press('Tab') // fuori e dentro per essere certi del focus-visible da tastiera
    await page.keyboard.press('Shift+Tab')
    await shot(page, theme, 'login__input-email-focus')
    await page.fill('#email', email)
    await shot(page, theme, 'login__email-compilata')
    await shot(page, theme, 'login__bottone-invia-default')
    await page.keyboard.press('Tab')
    await shot(page, theme, 'login__bottone-invia-focus')
    // pressed: mouse giù sul bottone, poi fuori prima di rilasciare (il click non parte)
    const btn = page.locator('button[type=submit]')
    const box = await btn.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await shot(page, theme, 'login__bottone-invia-pressed')
    await page.mouse.move(2, 2)
    await page.mouse.up()
    await ctx.close()
  })

  // ───────── Bottone Google (script esterno) ─────────
  await step(theme, 'google', async () => {
    const { ctx, page } = await newPage(theme)
    await emailStage(page)
    const visible = await page
      .waitForSelector('.google-signin-face', { timeout: 6000 })
      .then(() => true)
      .catch(() => false)
    manifest.notes.push(`google-button ${theme}: ${visible ? 'visibile' : 'NON visibile (script non caricato o client ID assente)'}`)
    if (visible) {
      await page.waitForTimeout(1500) // lo script Google monta l'iframe
      await shot(page, theme, 'login__bottone-google-default')
      await page.fill('#email', email)
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await shot(page, theme, 'login__bottone-google-focus')
    }
    await ctx.close()
  })

  // ───────── Stato B: invio in corso ─────────
  await step(theme, 'invio', async () => {
    const { ctx, page } = await newPage(theme)
    await page.route('**/api/auth/email/request', async (r) => {
      await new Promise((res) => setTimeout(res, 6000))
      await r.fulfill(json(200, { challengeId: 'mock-challenge' }))
    })
    await emailStage(page)
    await page.fill('#email', email)
    await page.click('button[type=submit]')
    await page.waitForFunction(() => document.querySelector('button[type=submit]')?.textContent?.includes('Invio'))
    await shot(page, theme, 'login__invio-in-corso')
    await ctx.close()
  })

  // ───────── Stato C: errore (400 «Email non valida», errore generico) ─────────
  await step(theme, 'errore-400', async () => {
    const { ctx, page } = await newPage(theme)
    await page.route('**/api/auth/email/request', (r) => r.fulfill(json(400, { error: 'ValidationError', message: 'x' })))
    await emailStage(page)
    await page.fill('#email', 'a@b')
    await page.click('button[type=submit]')
    await page.waitForSelector('#login-error')
    // errore-email-non-valida = anche input email INVALIDO
    await shot(page, theme, 'login__errore-email-non-valida')
    await ctx.close()
  })
  await step(theme, 'errore-rete', async () => {
    const { ctx, page } = await newPage(theme)
    await page.route('**/api/auth/email/request', (r) => r.abort())
    await emailStage(page)
    await page.fill('#email', email)
    await page.click('button[type=submit]')
    await page.waitForSelector('#login-error')
    await shot(page, theme, 'login__errore-generico')
    await ctx.close()
  })

  // ───────── Stato D: attesa 429 (risposta simulata, Retry-After 125 s) ─────────
  await step(theme, 'attesa-429', async () => {
    const { ctx, page } = await newPage(theme)
    await page.route('**/api/auth/email/request', (r) =>
      r.fulfill(json(429, { error: 'TooManyRequests', message: 'x', retryAfterSeconds: 125 }, { 'Retry-After': '125' })),
    )
    await emailStage(page)
    await page.fill('#email', email)
    await page.click('button[type=submit]')
    await page.waitForSelector('.alert-warning')
    await shot(page, theme, 'login__attesa-429')
    await ctx.close()
  })

  // ───────── Stato E: avviso dopo eliminazione account ─────────
  await step(theme, 'deleted', async () => {
    const { ctx, page } = await newPage(theme)
    await emailStage(page, '?deleted=1')
    await page.waitForSelector('.alert-success')
    await shot(page, theme, 'login__account-eliminato')
    await ctx.close()
  })

  // ───────── Passo codice: richiesta VERA, tentativi sbagliati VERI ─────────
  await step(theme, 'codice', async () => {
    const { ctx, page } = await newPage(theme)
    await realCodeStage(page, email)
    // codice__vuoto = anche input codice FOCUS (autofocus), bottone «Accedi» DISABLED e link DEFAULT
    await shot(page, theme, 'codice__vuoto')
    await page.fill('#code', '123')
    await shot(page, theme, 'codice__input-codice-compilato-parziale')
    // codice sbagliato vero (000000 non è valido: 1/1.000.000 di probabilità)
    await page.fill('#code', '000000')
    await page.waitForSelector('#login-error')
    // errore-codice-non-valido = anche input codice INVALIDO (aria-invalid, nessuna classe visiva)
    await shot(page, theme, 'codice__errore-codice-non-valido')
    await shot(page, theme, 'codice__input-codice-invalido')
    // il backend concede 5 tentativi: 4 restanti dopo il primo errore; si arriva a «Ti resta 1» e poi a zero
    for (let i = 0; i < 3; i++) {
      await page.fill('#code', '000000')
      await page.waitForTimeout(900)
    }
    await page.waitForFunction(() => /Ti resta 1/.test(document.querySelector('#login-error')?.textContent ?? ''))
    await shot(page, theme, 'codice__errore-ultimo-tentativo')
    await page.fill('#code', '000000')
    await page.waitForFunction(() => document.querySelector('#code')?.disabled)
    // tentativi-finiti = anche input codice DISABLED e bottone «Invia un nuovo codice» PRIMARIO
    await shot(page, theme, 'codice__tentativi-finiti')
    await ctx.close()
  })

  // ───────── Codice scaduto (simulato) ─────────
  await step(theme, 'scaduto', async () => {
    const { ctx, page } = await newPage(theme)
    await page.route('**/api/auth/email/verify', (r) => r.fulfill(json(410, { error: 'CodeExpired', message: 'x' })))
    await mockedCodeStage(page, email)
    await page.fill('#code', '111111')
    await page.waitForFunction(() => document.querySelector('#code')?.disabled)
    await shot(page, theme, 'codice__codice-scaduto')
    await ctx.close()
  })

  // ───────── Verifica in corso (simulato, risposta lenta) ─────────
  await step(theme, 'verifica', async () => {
    const { ctx, page } = await newPage(theme)
    await page.route('**/api/auth/email/verify', async (r) => {
      await new Promise((res) => setTimeout(res, 6000))
      await r.fulfill(json(401, { error: 'InvalidCode', message: 'x', attemptsRemaining: 2 }))
    })
    await mockedCodeStage(page, email)
    await page.fill('#code', '222222')
    await page.waitForFunction(() => document.querySelector('button[type=submit]')?.textContent?.includes('Verifica'))
    await shot(page, theme, 'codice__verifica-in-corso')
    await ctx.close()
  })

  // ───────── Link «Invia un nuovo codice» / «Cambia email» ─────────
  await step(theme, 'link-codice', async () => {
    const { ctx, page } = await newPage(theme)
    await mockedCodeStage(page, email)
    await page.locator('button:has-text("Invia un nuovo codice")').focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await shot(page, theme, 'codice__link-nuovo-codice-focus')
    await page.locator('button:has-text("Cambia email")').focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await shot(page, theme, 'codice__link-cambia-email-focus')
    await ctx.close()
  })

  // Reinvio: in corso (link disabled), riuscito (notice), 429 sul reinvio.
  await step(theme, 'reinvio', async () => {
    const { ctx, page } = await newPage(theme)
    await mockedCodeStage(page, email)
    let calls = 0
    await page.unroute('**/api/auth/email/request')
    await page.route('**/api/auth/email/request', async (r) => {
      calls += 1
      if (calls === 1) {
        await new Promise((res) => setTimeout(res, 4000))
        return r.fulfill(json(200, { challengeId: 'mock-2' }))
      }
      return r.fulfill(json(429, { error: 'TooManyRequests', message: 'x', retryAfterSeconds: 61 }, { 'Retry-After': '61' }))
    })
    await page.click('button:has-text("Invia un nuovo codice")')
    await page.waitForFunction(() => document.querySelector('.btn-link[disabled]'))
    await shot(page, theme, 'codice__reinvio-in-corso')
    await shot(page, theme, 'codice__link-nuovo-codice-disabled')
    await page.waitForSelector('.alert-success')
    await shot(page, theme, 'codice__codice-reinviato')
    await page.click('button:has-text("Invia un nuovo codice")')
    await page.waitForSelector('.alert-warning')
    await shot(page, theme, 'codice__attesa-429')
    await ctx.close()
  })

  // ───────── Non trovata (404, reale) ─────────
  await step(theme, 'non-trovata', async () => {
    const { ctx, page } = await newPage(theme)
    await page.goto(`${BASE}/boh`)
    await page.waitForSelector('h1')
    await shot(page, theme, 'non-trovata__default')
    await ctx.close()
  })

  // ───────── Errore di sessione (simulato: /auth/me non risponde) ─────────
  await step(theme, 'session-error', async () => {
    const { ctx, page } = await newPage(theme)
    await page.route('**/api/auth/me', (r) => r.abort())
    await page.goto(`${BASE}/staff`) // pagina protetta: il controllo di sessione fallisce
    await page.waitForURL('**/session-error**')
    await page.waitForSelector('.alert-danger')
    await shot(page, theme, 'session-error__default')
    const btn = page.locator('button:has-text("Riprova")')
    await page.keyboard.press('Tab')
    await btn.focus()
    await shot(page, theme, 'session-error__bottone-riprova-focus')
    const box = await btn.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await shot(page, theme, 'session-error__bottone-riprova-pressed')
    await page.mouse.move(2, 2)
    await page.mouse.up()
    await ctx.close()
  })
}

await browser.close()
writeFileSync(path.join(OUT, '_manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\ncatturati ${manifest.captured.length}, falliti ${manifest.failed.length}`)
