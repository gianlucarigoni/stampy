// Shared helpers for the browser tests: throwaway fixtures (users `*@test.it`, one venue with
// a 5-stamp promotion) created straight in the dev DB, a headless browser, ✔/✘ checks.
// Needs `npm run dev` (backend + frontend) and the `stampy-db` container. DEV DATABASE ONLY.
import { execSync } from 'node:child_process'
import crypto from 'node:crypto'
import { chromium } from 'playwright'

export const APP = process.env.E2E_APP_URL ?? 'http://localhost:5173'
const DB = process.env.E2E_DB ?? 'stampy_dev'
const RUN = Date.now().toString(36)

if (process.env.NODE_ENV === 'production') throw new Error('Refusing to run with NODE_ENV=production')

const psql = (sql) =>
  execSync(`docker exec -i stampy-db psql -U stampy -d ${DB} -At -v ON_ERROR_STOP=1`, { input: sql })
    .toString()
    .trim()
    .split('\n')[0]

const ids = { users: [], venues: [] }

function newUser(tag) {
  const id = psql(`INSERT INTO users (email, display_name) VALUES ('e2e-${RUN}-${tag}@test.it','E2E') RETURNING id`)
  ids.users.push(id)
  const token = crypto.randomBytes(32).toString('base64url')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  psql(`INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at, last_seen_at, user_agent)
        VALUES ('${id}','${hash}','email', now() + interval '1 day', now(), 'e2e')`)
  return { id, token }
}

/** One venue (threshold 5, reward "Caffè E2E"), one staff member, `customers` customers. */
export function createFixtures(customers = 1) {
  const branding = psql(`SELECT branding FROM venues WHERE branding <> '{}'::jsonb LIMIT 1`)
  if (!branding) throw new Error('No venue with branding in the DB: create one with scripts/create-venue.ts')
  const venueId = psql(
    `INSERT INTO venues (name, slug, branding) VALUES ('E2E ${RUN}','e2e-${RUN}','${branding}'::jsonb) RETURNING id`,
  )
  ids.venues.push(venueId)
  psql(`INSERT INTO promotions (venue_id, type, name, config, starts_at)
        VALUES ('${venueId}','stamps','E2E','{"v":1,"stampsRequired":5,"reward":"Caffè E2E"}', now() - interval '1 day')`)
  const staff = newUser('staff')
  psql(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ('${staff.id}','${venueId}','staff')`)
  return { venueId, staff, customers: Array.from({ length: customers }, (_, i) => newUser(`c${i}`)) }
}

export function cleanup() {
  if (ids.users.length === 0) return
  const u = ids.users.map((i) => `'${i}'`).join(',')
  const v = ids.venues.map((i) => `'${i}'`).join(',')
  const cards = `SELECT id FROM cards WHERE user_id IN (${u})`
  psql(`DELETE FROM stamp_events WHERE card_id IN (${cards});
        DELETE FROM stamp_requests WHERE card_id IN (${cards});
        DELETE FROM cards WHERE user_id IN (${u});
        DELETE FROM venue_members WHERE user_id IN (${u});
        DELETE FROM sessions WHERE user_id IN (${u});
        DELETE FROM auth_events WHERE user_id IN (${u});
        DELETE FROM users WHERE id IN (${u});
        DELETE FROM promotions WHERE venue_id IN (${v});
        DELETE FROM venues WHERE id IN (${v});`)
}

/** DB reads, to compare what the UI shows with what was really recorded. */
export const cardCount = (userId, venueId) =>
  Number(psql(`SELECT stamps_count FROM cards WHERE user_id='${userId}' AND venue_id='${venueId}'`))
export const eventsOf = (requestId) =>
  psql(`SELECT coalesce(string_agg(type || ':' || quantity, ',' ORDER BY created_at, idempotency_key), '')
        FROM stamp_events WHERE request_id='${requestId}'`)

const call = (path, token) =>
  fetch(APP + '/api' + path, { method: 'POST', headers: { Cookie: `sid=${token}` } }).then((r) => r.json())

/** Opens a pending stamp request for the customer (first tap creates the card). */
export async function openRequest(venueId, customer) {
  await call(`/venues/${venueId}/visit`, customer.token)
  const r = await call(`/venues/${venueId}/visit?requestStamp=1`, customer.token)
  if (!r.requestId) throw new Error('No request created: ' + JSON.stringify(r).slice(0, 120))
  return r.requestId
}

/** Puts the customer's card at `count` stamps by confirming through the API as `staff`. */
export async function setCard(venueId, staff, customer, count) {
  const requestId = await openRequest(venueId, customer)
  await fetch(`${APP}/api/venues/${venueId}/requests/${requestId}/confirm`, {
    method: 'POST',
    headers: { Cookie: `sid=${staff.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ stamps: count }),
  })
}

export async function openBrowser() {
  const executablePath = process.env.E2E_CHROMIUM // optional: a cached Chromium when `playwright install` was not run
  return chromium.launch(executablePath ? { executablePath } : {})
}

export async function pageFor(browser, token, viewport = { width: 390, height: 800 }) {
  const ctx = await browser.newContext({ viewport })
  await ctx.addCookies([{ name: 'sid', value: token, url: APP }])
  return ctx.newPage()
}

let ok = 0
let ko = 0
export function check(name, pass, detail = '') {
  pass ? ok++ : ko++
  console.log(`  ${pass ? '✔' : '✘'} ${name}${pass ? '' : `  (${detail})`}`)
}
export const section = (name) => console.log(`\n${name}`)

export async function finish(browser) {
  await browser?.close()
  try {
    cleanup()
  } catch (e) {
    console.error('cleanup failed:', e.message)
  }
  console.log(`\nTOTAL: ✔ ${ok}  ✘ ${ko}`)
  process.exit(ko === 0 ? 0 : 1)
}
