// Funzioni comuni per le catture (login via API con OTP in console, SQL sul DB del worktree, screenshot).
// Nessun PNG viene aperto. Le sessioni restano in memoria: nessun cookie viene scritto su file.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const WT = process.env.WT ?? '/home/rigoni_g/Personal/stampy-wt/dr3'
export const BASE = process.env.E2E_APP_URL ?? 'http://localhost:5174'
const LOG = process.env.DEV_LOG ?? '/tmp/dr3-dev.log'
const DB = process.env.DB ?? 'stampy_wt_dr3'
const require = createRequire(path.join(WT, 'stampy-frontend/package.json'))
export const { chromium, request } = require('playwright')

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const sql = (q) =>
  execFileSync('docker', ['exec', '-i', 'stampy-db', 'psql', '-U', 'stampy', '-d', DB, '-At', '-q', '-v', 'ON_ERROR_STOP=1', '-c', q], {
    encoding: 'utf8',
  }).trim()

export const json = (status, body, headers = {}) => ({
  status,
  contentType: 'application/json',
  headers,
  body: JSON.stringify(body),
})

// Ultimo codice OTP scritto nel log del backend per quell'email (OTP_PROVIDER=console).
export function lastCode(email) {
  const lines = readFileSync(LOG, 'utf8').split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/\[DEV\] codice per (\S+): (\d{6})/)
    if (m && m[1] === email) return m[2]
  }
  throw new Error(`nessun codice nel log per ${email}`)
}
export const wrongCode = (code) => code.slice(0, 5) + ((Number(code[5]) + 1) % 10)

const sessions = new Map()
// Login VERO (richiesta + verifica del codice) una sola volta per email: restituisce { state, api }.
export async function session(email) {
  if (sessions.has(email)) return sessions.get(email)
  const api = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE } })
  const r1 = await api.post('/api/auth/email/request', { data: { email } })
  if (!r1.ok()) throw new Error(`login ${email}: richiesta ${r1.status()}`)
  const { challengeId } = await r1.json()
  await sleep(400)
  const r2 = await api.post('/api/auth/email/verify', { data: { challengeId, code: lastCode(email) } })
  if (!r2.ok()) throw new Error(`login ${email}: verifica ${r2.status()}`)
  const s = { state: await api.storageState(), api, at: Date.now() }
  sessions.set(email, s)
  return s
}

export const manifest = { captured: [], failed: [], notes: [] }
export let browser
export async function launch() {
  // limiti OTP per email (nel DB): si azzerano le sfide del DB del worktree a ogni avvio dello script
  sql('delete from otp_challenges')
  browser = await chromium.launch()
  return browser
}

export async function newPage(theme, email, { width = 390, height = 844, init } = {}) {
  const s = email ? await session(email) : null
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: 'it-IT',
    hasTouch: true,
    storageState: s?.state,
  })
  if (init) await ctx.addInitScript(init.fn, init.arg)
  const page = await ctx.newPage()
  page.setDefaultTimeout(8000)
  return { ctx, page }
}

export const OUT_ROOT = process.env.OUT ?? path.join(WT, 'design-review/screens/cliente')

// full=true: pagina intera; full=false: solo viewport (overlay, menu, dialog). o: 'R' reale, 'S' simulato.
export async function shot(page, theme, role, name, { full = true, o = 'R' } = {}) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  const dir = path.join(OUT_ROOT, role)
  mkdirSync(dir, { recursive: true })
  const file = `${name}__${theme}.png`
  await page.screenshot({ path: path.join(dir, file), fullPage: full })
  manifest.captured.push({ role, file, mode: full ? 'full-page' : 'viewport', origin: o })
  console.log('✔', role, file)
}

export async function step(theme, name, fn) {
  try {
    await fn()
  } catch (e) {
    const reason = String(e.message ?? e).split('\n')[0]
    manifest.failed.push({ name: `${name}__${theme}`, reason })
    console.log('✘', name, theme, reason)
  }
}

// Focus da tastiera (:focus-visible) su un elemento preciso.
export async function kfocus(page, locator) {
  await page.keyboard.press('Tab')
  await locator.focus()
}
// Pressed: mouse giù al centro dell'elemento (il rilascio lo fa pressRelease).
export async function pressDown(page, locator) {
  const b = await locator.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
}
export async function pressRelease(page) {
  await page.mouse.move(1, 1)
  await page.mouse.up()
}

// Risposta ritardata che poi prosegue (stato «caricamento») o poi fallisce (stato «in corso» che non si chiude).
export const holdThenContinue = (ms) => async (r) => {
  await sleep(ms)
  try { await r.continue() } catch {}
}
export const holdThenAbort = (ms) => async (r) => {
  await sleep(ms)
  try { await r.abort() } catch {}
}

export const writeManifest = (extra = {}) => {
  mkdirSync(OUT_ROOT, { recursive: true })
  return import('node:fs').then((fs) =>
    fs.writeFileSync(path.join(OUT_ROOT, `_manifest${extra.suffix ?? ''}.json`), JSON.stringify(manifest, null, 2)),
  )
}

export const VENUES = {
  rossi: 'fb467a6e-ec61-4f2f-8e2c-251ed7b9727f',
  gennaro: 'fcabed57-e2a6-4ab4-bf2e-b24f689caa30',
  fiordilatte: 'a59ab86c-98e1-4525-8e47-f61de171e55e',
}

// Dati di scena (SOLO DB del worktree)
export const cardWhere = (email, venue) =>
  `user_id=(select id from users where email='${email}') and venue_id='${venue}'`
export const setStamps = (email, venue, n) => sql(`update cards set stamps_count=${n} where ${cardWhere(email, venue)}`)
export const setWallet = (email, venue, st) => sql(`update cards set wallet_status='${st}' where ${cardWhere(email, venue)}`)
// Una nuova richiesta in attesa per la card (elimina eventuali pendenti della card).
export function newPending(email, venue, interval = '7 days') {
  const card = `(select id from cards where ${cardWhere(email, venue)})`
  sql(`delete from stamp_requests where status='pending' and card_id=${card}`)
  return sql(
    `insert into stamp_requests (card_id, venue_id, status, expires_at) values (${card}, '${venue}', 'pending', now() + interval '${interval}') returning id`,
  ).split('\n')[0]
}

// Il backend impone ~60 s tra due invii di codice per lo stesso utente (il login ne ha già fatto uno).
export async function waitCooldown(email, seconds = 65) {
  const s = sessions.get(email)
  const left = s ? seconds * 1000 - (Date.now() - s.at) : 0
  if (left > 0) { console.log(`… attendo ${Math.ceil(left / 1000)} s (limite tra invii di codice)`); await sleep(left) }
}
