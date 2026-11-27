// Profile page (B30): one card per venue with the venue's branding and the official Wallet link; empty state without cards.
//   E2E_APP_URL=http://localhost:<web port> E2E_DB=<db of the worktree> node e2e/profile-cards.mjs
import { APP, check, createFixtures, finish, newUser, openBrowser, openRequest, pageFor, psql, section } from './lib.mjs'

let browser
try {
  const fx = createFixtures(1)
  const customer = fx.customers[0]
  // second venue with a LIGHT background: the text must switch to dark
  const light = psql(`INSERT INTO venues (name, slug, branding) VALUES ('E2E Chiaro','e2e-light-${Date.now()}',
    '{"v":1,"logoUrl":"https://placehold.co/512x512.png","backgroundColor":"#F5E6A8"}') RETURNING id`)
  psql(`INSERT INTO promotions (venue_id, type, name, config, starts_at)
        VALUES ('${light}','stamps','E2E','{"v":1,"stampsRequired":8,"reward":"Premio"}', now() - interval '1 day')`)
  await openRequest(fx.venueId, customer)
  await fetch(`${APP}/api/venues/${light}/visit`, { method: 'POST', headers: { Cookie: `sid=${customer.token}` } })
  const lonely = newUser('nocards')

  browser = await openBrowser()
  for (const scheme of ['light', 'dark']) {
    section(`Customer with 2 cards, 360 px, ${scheme} theme`)
    const page = await pageFor(browser, customer.token, { width: 360, height: 800 })
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto(`${APP}/profile`)
    await page.locator('a.wallet-button').first().waitFor()
    check('one card per venue', (await page.locator('section[aria-labelledby^="wallet-card-"]').count()) === 2)
    check('"Bar Aurora" model is gone', (await page.getByText('Bar Aurora').count()) === 0)
    const hrefs = await page.locator('a.wallet-button').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    check('buttons are links to the save URL', hrefs.length === 2 && hrefs.every((h) => h?.startsWith('https://pay.google.com/gp/v/save/')), String(hrefs))
    check('no <button> for the Wallet', (await page.locator('button:has(img[src*="google-wallet"])').count()) === 0)
    const colours = await page.locator('section[aria-labelledby^="wallet-card-"] > div:first-child').evaluateAll((els) => els.map((e) => getComputedStyle(e).color))
    check('light background gets dark text, dark background gets white', colours.includes('rgb(26, 26, 26)') && colours.includes('rgb(255, 255, 255)'), String(colours))
    check('no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await page.screenshot({ path: `${process.env.E2E_SHOTS ?? '.'}/profile-cards-${scheme}.png`, fullPage: true })
  }

  section('User without cards')
  const page = await pageFor(browser, lonely.token, { width: 360, height: 800 })
  await page.goto(`${APP}/profile`)
  await page.getByText('Non hai ancora nessuna card').waitFor()
  check('empty state, no Wallet button', (await page.locator('a.wallet-button').count()) === 0)

  section('Staff member without cards')
  const spage = await pageFor(browser, fx.staff.token, { width: 360, height: 800 })
  await spage.goto(`${APP}/profile`)
  await spage.getByText('Non hai ancora nessuna card').waitFor()
  check('empty state, no Wallet button', (await spage.locator('a.wallet-button').count()) === 0)
  psql(`DELETE FROM cards WHERE venue_id='${light}'; DELETE FROM promotions WHERE venue_id='${light}'; DELETE FROM venues WHERE id='${light}'`)
} finally {
  await finish(browser)
}
