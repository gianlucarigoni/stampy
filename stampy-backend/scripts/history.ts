/**
 * End-to-end test of the request history: GET /api/venues/:venueId/requests/history.
 * Also checks the customer history GET /api/requests/mine and that the customer polling
 * response carries `publicCode`.
 *
 * Run (server up with `npm run dev`, dev DB):
 *   npx tsx --env-file=.env scripts/history.ts
 *
 * Seeds 4 requests of one venue dated 2020 (approved 3 stamps, approved 12, rejected, expired)
 * so that date ranges never collide with real dev data; assertions look only at those 4 codes.
 * Users are history-test-*@test.it and are cleaned up (dev only).
 */
import crypto from "crypto";
import { pool } from "../src/db";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const RUN = Date.now().toString(36);

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run with NODE_ENV=production");
  process.exit(1);
}

type Res = { status: number; body: any };
async function request(path: string, opts: { method?: string; cookie?: string; body?: unknown } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.cookie !== undefined) headers.Cookie = `sid=${opts.cookie}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(BASE_URL + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { status: r.status, body };
}

const emails: string[] = [];
let venueBId: string | undefined;
async function newUser(tag: string) {
  const email = `history-test-${RUN}-${tag}@test.it`;
  emails.push(email);
  const id = (await pool.query(`INSERT INTO users (email, display_name) VALUES ($1,'History Test') RETURNING id`, [email])).rows[0].id;
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at, last_seen_at, user_agent)
     VALUES ($1,$2,'email', now() + interval '1 day', now(), 'test-script')`,
    [id, hash],
  );
  return { id: id as string, token };
}

const history = (venueId: string, qs: string, cookie?: string) =>
  request(`/api/venues/${venueId}/requests/history${qs ? "?" + qs : ""}`, { cookie });

let passed = 0;
let failed = 0;
const failures: string[] = [];
const check = (label: string, ok: boolean, detail = "") => (console.log(`   ${ok ? "✔" : "✘"} ${label}${ok || !detail ? "" : `  (${detail})`}`), ok);
async function test(name: string, fn: () => Promise<boolean[]>) {
  console.log(`\n▶ ${name}`);
  try {
    const ok = (await fn()).every(Boolean);
    console.log(`   => ${ok ? "SUCCESS" : "FAILED"}`);
    ok ? passed++ : (failed++, failures.push(name));
  } catch (e) {
    console.log("   EXCEPTION:", e);
    failed++;
    failures.push(name);
  }
}

async function main() {
  const venueA: string | undefined = (
    await pool.query(
      `SELECT v.id FROM venues v JOIN promotions p ON p.venue_id = v.id
        WHERE v.archived_at IS NULL AND p.starts_at <= now() AND (p.ends_at IS NULL OR p.ends_at > now())
        ORDER BY v.created_at LIMIT 1`,
    )
  ).rows[0]?.id;
  if (!venueA) {
    console.error("Needs 1 venue with an active promotion (scripts/create-venue.ts).");
    process.exitCode = 1;
    return;
  }
  // own second venue for the tenant-isolation check (removed in cleanup)
  venueBId = (
    await pool.query(
      `INSERT INTO venues (name, slug, branding) SELECT 'History test B', $1, branding FROM venues WHERE id = $2 RETURNING id`,
      [`history-test-${RUN}`, venueA],
    )
  ).rows[0].id;
  const venueB = venueBId as string;
  await pool.query(
    `INSERT INTO promotions (venue_id, type, name, config, starts_at)
     VALUES ($1,'stamps','History test','{"v":1,"stampsRequired":5,"reward":"Test"}', now() - interval '1 day')`,
    [venueB],
  );
  const staff = await newUser("staff");
  const otherVenueStaff = await newUser("staffb");
  const outsider = await newUser("outsider");
  const customers = [await newUser("c1"), await newUser("c2"), await newUser("c3"), await newUser("c4")];
  await pool.query(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ($1,$2,'staff')`, [staff.id, venueA]);
  await pool.query(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ($1,$2,'staff')`, [otherVenueStaff.id, venueB]);

  // ---- seed: open, resolve, then back-date ----
  const reqIds: string[] = [];
  for (const c of customers) {
    await request(`/api/venues/${venueA}/visit`, { method: "POST", cookie: c.token }); // first tap creates the card
    const v = await request(`/api/venues/${venueA}/visit?requestStamp=1`, { method: "POST", cookie: c.token });
    reqIds.push(v.body.requestId);
  }
  const confirm = (i: number, n: number) =>
    request(`/api/venues/${venueA}/requests/${reqIds[i]}/confirm`, { method: "POST", cookie: staff.token, body: { stamps: n } });
  await confirm(0, 3);
  await confirm(1, 12);
  await request(`/api/venues/${venueA}/requests/${reqIds[2]}/reject`, { method: "POST", cookie: staff.token });
  await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [reqIds[3]]); // left pending: history must show it expired
  const dates = ["2020-01-10 12:00+00", "2020-02-10 12:00+00", "2020-03-10 12:00+00", "2020-04-10 12:00+00"];
  for (let i = 0; i < 4; i++) await pool.query(`UPDATE stamp_requests SET created_at = $2 WHERE id = $1`, [reqIds[i], dates[i]]);
  const codes = (
    await pool.query(
      `SELECT r.id, c.public_code FROM stamp_requests r JOIN cards c ON c.id = r.card_id WHERE r.id = ANY($1)`,
      [reqIds],
    )
  ).rows;
  const codeOf = (i: number) => codes.find((r) => r.id === reqIds[i]).public_code as string;
  const mine = (r: Res) => (r.body?.requests ?? []).filter((x: any) => reqIds.includes(x.requestId));
  const idxs = (r: Res) => mine(r).map((x: any) => reqIds.indexOf(x.requestId)).sort();
  const WINDOW = "from=2020-01-01&to=2020-12-31";

  await test("auth: 401 without session, 403 non-member and other venue's staff", async () => [
    check("401", (await history(venueA, "")).status === 401),
    check("403 outsider", (await history(venueA, "", outsider.token)).status === 403),
    check("403 staff of another venue", (await history(venueA, "", otherVenueStaff.token)).status === 403),
  ]);

  await test("no filters: 200, all statuses, mapped fields, no email, no paging fields", async () => {
    const r = await history(venueA, "", staff.token);
    const row = r.body?.requests?.[0] ?? {};
    return [
      check("200", r.status === 200, String(r.status)),
      check("exact field set", Object.keys(row).sort().join() === "createdAt,publicCode,requestId,resolvedAt,rewardsRedeemed,stamps,stampsAdded,status", Object.keys(row).join()),
      check("no email anywhere", !/@test\.it|email/i.test(JSON.stringify(r.body))),
      check("only { requests } in the body (no paging fields)", Object.keys(r.body ?? {}).join() === "requests"),
      check("newest first", r.body.requests.every((x: any, i: number, a: any[]) => i === 0 || a[i - 1].createdAt >= x.createdAt)),
    ];
  });

  await test("content of the 4 seeded requests", async () => {
    const r = await history(venueA, WINDOW, staff.token);
    const by = (i: number) => mine(r).find((x: any) => x.requestId === reqIds[i]) ?? {};
    return [
      check("exactly the 4 seeded in 2020", mine(r).length === 4 && r.body.requests.length === 4, `${r.body?.requests?.length}`),
      check("approved 3: stamps 3, publicCode of the card", by(0).status === "approved" && by(0).stamps === 3 && by(0).publicCode === codeOf(0)),
      check("approved 12: stamps 12, stampsAdded+rewards coherent", by(1).stamps === 12 && by(1).stampsAdded + by(1).rewardsRedeemed <= 12 && by(1).stampsAdded >= 1),
      check("rejected: stamps/stampsAdded/rewards null", by(2).status === "rejected" && by(2).stamps === null && by(2).stampsAdded === null && by(2).rewardsRedeemed === null),
      check("lazy expiry: pending past expires_at shows as expired", by(3).status === "expired", by(3).status),
      check("newest first inside the window", r.body.requests.map((x: any) => x.requestId).join() === [3, 2, 1, 0].map((i) => reqIds[i]).join()),
    ];
  });

  await test("status filter", async () => [
    check("approved → 0,1", idxs(await history(venueA, `status=approved&${WINDOW}`, staff.token)).join() === "0,1"),
    check("rejected → 2", idxs(await history(venueA, `status=rejected&${WINDOW}`, staff.token)).join() === "2"),
    check("expired → 3", idxs(await history(venueA, `status=expired&${WINDOW}`, staff.token)).join() === "3"),
    check("invalid status → 400", (await history(venueA, "status=bogus", staff.token)).status === 400),
  ]);

  await test("confirmed stamps filter (min/max, approved only)", async () => [
    check("minStamps=5 → 1", idxs(await history(venueA, `minStamps=5&${WINDOW}`, staff.token)).join() === "1"),
    check("maxStamps=5 → 0", idxs(await history(venueA, `maxStamps=5&${WINDOW}`, staff.token)).join() === "0"),
    check("min=3&max=12 → 0,1", idxs(await history(venueA, `minStamps=3&maxStamps=12&${WINDOW}`, staff.token)).join() === "0,1"),
    check("min=3&max=3 (exact) → 0", idxs(await history(venueA, `minStamps=3&maxStamps=3&${WINDOW}`, staff.token)).join() === "0"),
    check("min=13 → none", idxs(await history(venueA, `minStamps=13&${WINDOW}`, staff.token)).length === 0),
    check("0 / 51 / text → 400",
      (await history(venueA, "minStamps=0", staff.token)).status === 400 &&
      (await history(venueA, "maxStamps=51", staff.token)).status === 400 &&
      (await history(venueA, "minStamps=abc", staff.token)).status === 400),
  ]);

  await test("date filter: none / only from / only to / both", async () => {
    const toOnly = await history(venueA, "to=2020-01-31", staff.token);
    return [
    check("no date at all → 200 (no implicit date limit)", (await history(venueA, "", staff.token)).status === 200),
    check("only from=2020-02-10 → 1,2,3 (from inclusive; excludes 0)", idxs(await history(venueA, "from=2020-02-10&to=2020-12-31", staff.token)).join() === "1,2,3"),
    check("only from=2020-02-11 (no to) includes 2,3 and not 0,1", idxs(await history(venueA, "from=2020-02-11", staff.token)).join() === "2,3"),
    check("only to=2020-02-10 (date-only = end of that day) → 0,1", idxs(await history(venueA, "to=2020-02-10&from=2019-01-01", staff.token)).join() === "0,1"),
    check("only to=2020-01-31 (no from) → 0 and nothing from 2020-02 on", (() => { const r = toOnly; return idxs(r).join() === "0"; })()),
    check("both 2020-02-01..2020-03-31 → 1,2", idxs(await history(venueA, "from=2020-02-01&to=2020-03-31", staff.token)).join() === "1,2"),
    check("full ISO instant bounds: from 12:00:01 excludes the 12:00 request", idxs(await history(venueA, "from=2020-02-10T12:00:01Z&to=2020-03-10T12:00:00Z", staff.token)).join() === "2"),
    check("invalid date → 400", (await history(venueA, "from=not-a-date", staff.token)).status === 400 && (await history(venueA, "to=2020-13-45", staff.token)).status === 400),
    check("from after to → 400", (await history(venueA, "from=2020-12-01&to=2020-01-01", staff.token)).status === 400),
    check("from after to (ISO instants) → 400", (await history(venueA, "from=2020-03-10T12:00:01Z&to=2020-03-10T12:00:00Z", staff.token)).status === 400),
    check("from == to (same day) → 200", (await history(venueA, "from=2020-02-10&to=2020-02-10", staff.token)).status === 200),
    ];
  });

  await test("filters combine (AND); no pagination", async () => {
    const combo = await history(venueA, `status=approved&minStamps=5&from=2020-02-01&to=2020-02-28`, staff.token);
    const all = await history(venueA, "", staff.token);
    const total = await pool.query(`SELECT count(*)::int AS n FROM stamp_requests WHERE venue_id = $1`, [venueA]);
    return [
      check("approved + min 5 + February → 1", idxs(combo).join() === "1"),
      check("full list: every row of the venue, no cap", all.body.requests.length === total.rows[0].n, `${all.body?.requests?.length} vs ${total.rows[0].n}`),
      check("limit → 400", (await history(venueA, "limit=2", staff.token)).status === 400),
      check("offset → 400", (await history(venueA, "offset=0", staff.token)).status === 400),
      check("old names minProducts / maxProducts → 400",
        (await history(venueA, "minProducts=1", staff.token)).status === 400 &&
        (await history(venueA, "maxProducts=1", staff.token)).status === 400),
      check("unknown query field rejected (400)", (await history(venueA, "foo=1", staff.token)).status === 400),
    ];
  });

  await test("tenant isolation: venue B staff sees none of venue A's requests", async () => {
    const r = await history(venueB, "from=2020-01-01&to=2020-12-31", otherVenueStaff.token);
    return [check("200 and none of the 4", r.status === 200 && mine(r).length === 0)];
  });

  await test("history does not shadow confirm/reject routes and the queue still works", async () => {
    const q = await request(`/api/venues/${venueA}/requests`, { cookie: staff.token });
    return [check("queue 200", q.status === 200 && Array.isArray(q.body.requests))];
  });

  await test("customer history: GET /api/requests/mine (own requests, all venues, same filters)", async () => {
    const nameA = (await pool.query(`SELECT name FROM venues WHERE id = $1`, [venueA])).rows[0].name as string;
    const mineOf = (c: { token: string }, qs: string) => request(`/api/requests/mine${qs ? "?" + qs : ""}`, { cookie: c.token });
    const own = (r: Res) => mine(r).map((x: any) => reqIds.indexOf(x.requestId));
    const c1 = await mineOf(customers[0], WINDOW);
    const row = mine(c1)[0] ?? {};

    // customer 1 also taps venue B: the history must then span two venues
    await request(`/api/venues/${venueB}/visit`, { method: "POST", cookie: customers[0].token });
    await request(`/api/venues/${venueB}/visit?requestStamp=1`, { method: "POST", cookie: customers[0].token });
    const both = await mineOf(customers[0], "");
    const venueNames = new Set((both.body?.requests ?? []).map((x: any) => x.venueName));

    return [
      check("401 without session", (await request("/api/requests/mine")).status === 401),
      check("200, only own request, newest first", c1.status === 200 && own(c1).join() === "0" && c1.body.requests.length === 1, JSON.stringify(c1.body)),
      check("exact field set (staff set + venueName)", Object.keys(row).sort().join() === "createdAt,publicCode,requestId,resolvedAt,rewardsRedeemed,stamps,stampsAdded,status,venueName", Object.keys(row).join()),
      check("venueName = the venue's name, publicCode = own card code", row.venueName === nameA && row.publicCode === codeOf(0)),
      check("approved 3: stamps 3", row.status === "approved" && row.stamps === 3),
      check("no email, only { requests }", !/@test\.it|email/i.test(JSON.stringify(c1.body)) && Object.keys(c1.body).join() === "requests"),
      check("isolation: customer 2 never sees customer 1's request", !own(await mineOf(customers[1], WINDOW)).includes(0) && own(await mineOf(customers[1], WINDOW)).join() === "1"),
      check("status filter: customer 3 rejected → 2; customer 1 rejected → none", own(await mineOf(customers[2], `status=rejected&${WINDOW}`)).join() === "2" && mine(await mineOf(customers[0], `status=rejected&${WINDOW}`)).length === 0),
      check("stamps + date filters apply", own(await mineOf(customers[1], `minStamps=5&${WINDOW}`)).join() === "1" && mine(await mineOf(customers[1], `maxStamps=5&${WINDOW}`)).length === 0 && own(await mineOf(customers[0], "from=2020-02-01&to=2020-12-31")).length === 0),
      check("lazy expiry: customer 4's pending request shows as expired", mine(await mineOf(customers[3], WINDOW))[0]?.status === "expired"),
      check("spans venues: A and B after tapping both", both.status === 200 && venueNames.has(nameA) && venueNames.has("History test B"), [...venueNames].join()),
      check("invalid status / paging / unknown field → 400",
        (await mineOf(customers[0], "status=bogus")).status === 400 &&
        (await mineOf(customers[0], "limit=2")).status === 400 &&
        (await mineOf(customers[0], "foo=1")).status === 400),
      check("/api/requests/:id still works (fixed route before it)", (await request(`/api/requests/${reqIds[0]}`, { cookie: customers[0].token })).status === 200),
    ];
  });

  await test("customer polling carries publicCode (also after approval)", async () => {
    const a = await request(`/api/requests/${reqIds[0]}`, { cookie: customers[0].token });
    const b = await request(`/api/requests/${reqIds[2]}`, { cookie: customers[2].token });
    return [
      check("approved: publicCode = card code", a.body?.publicCode === codeOf(0), JSON.stringify(a.body)),
      check("rejected: publicCode present", b.body?.publicCode === codeOf(2)),
      check("someone else's request → still 404", (await request(`/api/requests/${reqIds[0]}`, { cookie: customers[1].token })).status === 404),
    ];
  });

  console.log("\n==============================");
  console.log(`Passati: ${passed}   Falliti: ${failed}`);
  failures.forEach((f) => console.log(`  - ${f}`));
}

async function cleanup() {
  try {
    const ids = (await pool.query(`SELECT id FROM users WHERE email = ANY($1)`, [emails])).rows.map((r) => r.id);
    if (ids.length) {
      await pool.query(`DELETE FROM stamp_events WHERE card_id IN (SELECT id FROM cards WHERE user_id = ANY($1)) OR operator_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM stamp_requests WHERE card_id IN (SELECT id FROM cards WHERE user_id = ANY($1))`, [ids]);
      await pool.query(`DELETE FROM cards WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM venue_members WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM sessions WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM auth_identities WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
    }
    if (venueBId) {
      await pool.query(`DELETE FROM promotions WHERE venue_id = $1`, [venueBId]);
      await pool.query(`DELETE FROM venues WHERE id = $1`, [venueBId]);
    }
    console.log("Test data cleaned up.");
  } catch (e) {
    console.log("Cleanup failed:", e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await pool.end();
    if (failed > 0) process.exitCode = 1;
  });
