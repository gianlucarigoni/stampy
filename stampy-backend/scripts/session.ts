/**
 * Test di isAuthenticated + GET /api/auth/me + POST /api/auth/logout
 *
 * Esecuzione (server acceso con `npm run dev`, DB di sviluppo):
 *   npx tsx --env-file=.env scripts/session.ts
 *
 * Le sessioni si creano direttamente nel DB con un token noto (in tabella solo SHA-256),
 * quindi non serve passare dall'invio email. Il caso "login vero" usa una sfida OTP
 * preparata a mano (stesso HMAC del server, quindi serve lo stesso OTP_HMAC_SECRET del .env).
 * Usa indirizzi auth-session-*@test.it e ripulisce i propri dati (solo sviluppo).
 */
import crypto from "crypto";
import { pool } from "../src/db";
import otpSrv from "../src/api/auth/otp/otp.service";
import authEventsSrv from "../src/api/auth/auth-events/auth-events.service";
import sessionSrv from "../src/api/auth/session/session.service";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const COOKIE_NAME = "sid";
const RUN = Date.now().toString(36);

if (process.env.NODE_ENV === "production") {
  console.error("Rifiuto di girare con NODE_ENV=production");
  process.exit(1);
}

type Res = { status: number; body: any; cookies: string[] };

async function request(
  path: string,
  opts: { method?: string; cookie?: string; body?: unknown } = {},
): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.cookie !== undefined) headers.Cookie = `${COOKIE_NAME}=${opts.cookie}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const r = await fetch(BASE_URL + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: r.status, body: parsed, cookies: r.headers.getSetCookie() };
}

const me = (cookie?: string) => request("/api/auth/me", { cookie });
const logout = (cookie?: string) => request("/api/auth/logout", { method: "POST", cookie });

const mail = (tag: string) => `auth-session-${RUN}-${tag}@test.it`;
const usedEmails: string[] = [];
const track = (e: string) => (usedEmails.push(e), e);

// ---------- helper DB ----------
type UserOpts = { displayName?: string; anonymized?: boolean };
async function createUser(email: string, o: UserOpts = {}): Promise<string> {
  const r = await pool.query(
    `INSERT INTO users (email, display_name, anonymized_at) VALUES ($1, $2, $3) RETURNING id`,
    [email, o.displayName ?? "Test Utente", o.anonymized ? new Date() : null],
  );
  return r.rows[0].id;
}

type SessionOpts = {
  createdDaysAgo?: number;
  lastSeenMinutesAgo?: number;
  expiresInDays?: number;
  expiresMinutesAgo?: number;
  revoked?: boolean;
};

async function createSession(userId: string, o: SessionOpts = {}): Promise<{ token: string; sessionId: string }> {
  const token = crypto.randomBytes(32).toString("base64url");
  const created = o.createdDaysAgo ? `now() - make_interval(days => ${o.createdDaysAgo})` : "now()";
  const lastSeen = o.lastSeenMinutesAgo ? `now() - make_interval(mins => ${o.lastSeenMinutesAgo})` : "now()";
  const expires = o.expiresMinutesAgo
    ? `now() - make_interval(mins => ${o.expiresMinutesAgo})`
    : `now() + make_interval(days => ${o.expiresInDays ?? 30})`;

  const r = await pool.query(
    `INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at, last_seen_at, created_at, user_agent)
     VALUES ($1, $2, 'email', ${expires}, ${lastSeen}, ${created}, 'test-script')
     RETURNING id`,
    [userId, sessionSrv.hashToken(token)],
  );
  const sessionId: string = r.rows[0].id;
  if (o.revoked) await pool.query(`UPDATE sessions SET revoked_at = now() WHERE id = $1`, [sessionId]);

  return { token, sessionId };
}

async function sessionState(sessionId: string) {
  const r = await pool.query(
    `SELECT extract(epoch from last_seen_at)::float8 AS last_seen,
            extract(epoch from expires_at)::float8   AS expires,
            extract(epoch from created_at)::float8   AS created,
            extract(epoch from revoked_at)::float8   AS revoked
     FROM sessions WHERE id = $1`,
    [sessionId],
  );
  return r.rows[0];
}

async function eventCount(userId: string, type: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM auth_events WHERE user_id = $1 AND type = $2`, [
    userId,
    type,
  ]);
  return r.rows[0].n;
}

async function logoutEvent(userId: string) {
  const r = await pool.query(
    `SELECT provider, metadata FROM auth_events WHERE user_id = $1 AND type = 'logout' ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  return r.rows[0];
}

async function makeChallenge(email: string, code: string): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `UPDATE otp_challenges SET invalidated_at = now()
     WHERE destination = $1 AND consumed_at IS NULL AND invalidated_at IS NULL`,
    [email],
  );
  await pool.query(
    `INSERT INTO otp_challenges (id, channel, destination, code_hash, attempts, expires_at)
     VALUES ($1, 'email', $2, $3, 0, now() + interval '5 minutes')`,
    [id, email, otpSrv.hashCode(id, code)],
  );
  return id;
}

// ---------- mini framework ----------
let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail = "") {
  console.log(`   ${ok ? "✔" : "✘"} ${label}${detail ? `  (${detail})` : ""}`);
  return ok;
}
async function test(name: string, fn: () => Promise<boolean[]>) {
  console.log(`\n▶ ${name}`);
  try {
    const ok = (await fn()).every(Boolean);
    console.log(`   => ${ok ? "SUCCESSO" : "FALLITO"}`);
    ok ? passed++ : (failed++, failures.push(name));
  } catch (e) {
    console.log("   ECCEZIONE:", e);
    console.log("   => FALLITO");
    failed++;
    failures.push(name);
  }
}
const show = (r: Res) =>
  console.log(`   risposta: ${r.status} ${JSON.stringify(r.body)} set-cookie=${r.cookies.length ? "si" : "no"}`);
const is401 = (r: Res) => r.status === 401;

// corpo atteso del 401, riempito al primo caso e confrontato con tutti gli altri
let unauthorizedBody: string | null = null;
function same401(label: string, r: Res): boolean {
  const body = JSON.stringify(r.body ?? {});
  if (unauthorizedBody === null) unauthorizedBody = body;
  return check(label, is401(r) && body === unauthorizedBody, `status=${r.status}`);
}

async function main() {
  // ---------- CASO FELICE ----------
  const e1 = track(mail("ok"));
  const u1 = await createUser(e1, { displayName: "Mario Rossi" });
  const s1 = await createSession(u1);
  const before1 = await sessionState(s1.sessionId);

  await test("Cookie valido -> 200 con utente mappato, nessun dato in piu'", async () => {
    const r = await me(s1.token);
    show(r);
    return [
      check("status 200", r.status === 200),
      check("body contiene solo { user }", Object.keys(r.body ?? {}).join() === "user"),
      check(
        "user = { id, email, displayName }",
        Object.keys(r.body?.user ?? {})
          .sort()
          .join() === "displayName,email,id",
      ),
      check("id corretto", r.body?.user?.id === u1),
      check("email corretta", r.body?.user?.email === e1),
      check("displayName corretto", r.body?.user?.displayName === "Mario Rossi"),
      check("nessun token nel body", !JSON.stringify(r.body).includes(s1.token)),
    ];
  });

  await test("Richiesta ravvicinata: last_seen_at NON viene riscritto", async () => {
    const a = await sessionState(s1.sessionId);
    const r = await me(s1.token);
    const b = await sessionState(s1.sessionId);
    return [
      check("status 200", r.status === 200),
      check("last_seen_at invariato", a.last_seen === b.last_seen, `${a.last_seen} -> ${b.last_seen}`),
      check("expires_at invariato", a.expires === b.expires),
      check("created_at invariato", before1.created === b.created),
    ];
  });

  // ---------- 401: COOKIE ASSENTE / MALFORMATO ----------
  await test("Cookie assente -> 401 generico", async () => {
    const r = await request("/api/auth/me");
    show(r);
    return [same401("401 con corpo unico", r)];
  });

  await test("Cookie alterato o malformato -> 401, nessuna sessione toccata", async () => {
    const out: boolean[] = [];
    const cases: Array<[string, string]> = [
      ["token casuale di 43 caratteri", crypto.randomBytes(32).toString("base64url")],
      ["token di lunghezza sbagliata", "abc"],
      ["cookie vuoto", ""],
    ];
    for (const [label, token] of cases) {
      const r = await me(token);
      out.push(same401(label, r));
    }
    const after = await sessionState(s1.sessionId);
    out.push(check("sessione valida non toccata", after.last_seen === before1.last_seen));
    return out;
  });

  // ---------- 401: SESSIONE NON VALIDA ----------
  await test("Sessione scaduta -> 401", async () => {
    const s = await createSession(u1, { expiresMinutesAgo: 1 });
    const r = await me(s.token);
    show(r);
    return [same401("401 con corpo unico", r)];
  });

  await test("Sessione revocata -> 401", async () => {
    const s = await createSession(u1, { revoked: true });
    const r = await me(s.token);
    show(r);
    return [same401("401 con corpo unico", r)];
  });

  await test("Utente anonimizzato -> 401", async () => {
    const e = track(mail("anon"));
    const u = await createUser(e, { anonymized: true });
    const s = await createSession(u);
    const r = await me(s.token);
    show(r);
    return [same401("401 con corpo unico", r)];
  });

  await test("Tetto assoluto superato (created_at 91 giorni fa) -> 401", async () => {
    const s = await createSession(u1, { createdDaysAgo: 91, lastSeenMinutesAgo: 10, expiresInDays: 1 });
    const r = await me(s.token);
    show(r);
    return [same401("401 con corpo unico", r)];
  });

  // ---------- SCORRIMENTO ----------
  await test("Tocco dopo 10 minuti: last_seen_at e expires_at scorrono a 30 giorni", async () => {
    const s = await createSession(u1, { lastSeenMinutesAgo: 10, expiresInDays: 1 });
    const before = await sessionState(s.sessionId);
    const r = await me(s.token);
    const after = await sessionState(s.sessionId);
    const now = Date.now() / 1000;
    return [
      check("status 200", r.status === 200),
      check("last_seen_at aggiornato a ora", after.last_seen > now - 60, `last_seen=${after.last_seen}`),
      check("last_seen_at era vecchio", before.last_seen < now - 540),
      check("expires_at esteso a ~30 giorni", after.expires > now + 29 * 86400, `expires=${after.expires}`),
      check("expires_at era a ~1 giorno", before.expires < now + 2 * 86400),
    ];
  });

  await test("Tetto assoluto rispettato dallo scorrimento (89 giorni + tocco)", async () => {
    const s = await createSession(u1, { createdDaysAgo: 89, lastSeenMinutesAgo: 10, expiresInDays: 1 });
    const before = await sessionState(s.sessionId);
    const r = await me(s.token);
    const after = await sessionState(s.sessionId);
    const cap = before.created + 90 * 86400;
    return [
      check("status 200", r.status === 200),
      check("last_seen_at aggiornato", after.last_seen > before.last_seen),
      check(
        "expires_at non supera created_at + 90 giorni",
        after.expires <= cap + 1,
        `expires=${after.expires} cap=${cap}`,
      ),
    ];
  });

  // ---------- LOGIN VERO (cookie scritto da /verify) ----------
  const e2 = track(mail("login"));
  let loginCookie: string | null = null;
  await test("Login con OTP: cookie accettato da isAuthenticated", async () => {
    const id = await makeChallenge(e2, "314159");
    const r = await request("/api/auth/email/verify", { method: "POST", body: { challengeId: id, code: "314159" } });
    show(r);
    const cookieLine = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`)) ?? "";
    loginCookie = cookieLine ? cookieLine.split(";")[0].slice(COOKIE_NAME.length + 1) : null;

    const m = loginCookie ? await me(loginCookie) : null;
    if (m) show(m);

    return [
      check("login 200", r.status === 200),
      check("cookie HttpOnly", /httponly/i.test(cookieLine)),
      check("cookie SameSite=Lax", /samesite=lax/i.test(cookieLine)),
      check("cookie Path=/", /path=\//i.test(cookieLine)),
      check("cookie Max-Age ~ 90 giorni", /max-age=77760\d\d/i.test(cookieLine), cookieLine.slice(0, 160)),
      check("il cookie di login supera isAuthenticated", m?.status === 200 && m?.body?.user?.email === e2),
    ];
  });

  await test("Logout: 204, cookie rimosso con le stesse opzioni, evento unico senza metadata", async () => {
    const u = (await pool.query(`SELECT id FROM users WHERE email = $1`, [e2])).rows[0];
    const session = (
      await pool.query(`SELECT id, token_hash FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [u.id])
    ).rows[0];
    const before = await sessionState(session.id);

    const r = await logout(loginCookie!);
    show(r);
    const clearLine = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`)) ?? "";
    const after = await sessionState(session.id);
    const ev = await logoutEvent(u.id);

    return [
      check("status 204", r.status === 204),
      check("cookie svuotato", /^sid=;/.test(clearLine), clearLine.slice(0, 120)),
      check("cookie con scadenza passata", /expires=thu, 01 jan 1970/i.test(clearLine)),
      check("cookie HttpOnly nella rimozione", /httponly/i.test(clearLine)),
      check("cookie SameSite=Lax nella rimozione", /samesite=lax/i.test(clearLine)),
      check("cookie Path=/ nella rimozione", /path=\//i.test(clearLine)),
      check("revoked_at valorizzato", after.revoked !== null, `revoked=${after.revoked}`),
      check("created_at non riscritto", after.created === before.created),
      check("un solo evento logout", (await eventCount(u.id, "logout")) === 1),
      check("evento logout: provider email", ev?.provider === "email"),
      check("evento logout: metadata vuoti", JSON.stringify(ev?.metadata) === "{}", JSON.stringify(ev?.metadata)),
    ];
  });

  await test("Dopo il logout la stessa sessione da' 401", async () => {
    const r = await me(loginCookie!);
    show(r);
    return [same401("401 con corpo unico", r)];
  });

  await test("Logout ripetuto: 401, revoked_at invariato, nessun secondo evento", async () => {
    const u = (await pool.query(`SELECT id FROM users WHERE email = $1`, [e2])).rows[0];
    const session = (
      await pool.query(`SELECT id FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [u.id])
    ).rows[0];
    const before = await sessionState(session.id);

    const r = await logout(loginCookie!);
    show(r);
    const after = await sessionState(session.id);

    return [
      check("status 401 (sessione gia' revocata)", is401(r)),
      check("revoked_at invariato", after.revoked === before.revoked),
      check("ancora un solo evento logout", (await eventCount(u.id, "logout")) === 1),
    ];
  });

  await test("Due logout simultanei: nessun 5xx, un solo evento, revoca non riscritta", async () => {
    const e = track(mail("race"));
    const u = await createUser(e);
    const s = await createSession(u);
    const rs = await Promise.all([logout(s.token), logout(s.token)]);
    rs.forEach(show);
    const after = await sessionState(s.sessionId);
    return [
      check("nessun 5xx", rs.every((r) => r.status < 500)),
      check("tutte 204 o 401", rs.every((r) => r.status === 204 || r.status === 401)),
      check("almeno una 204", rs.some((r) => r.status === 204)),
      check("sessione revocata", after.revoked !== null),
      check("un solo evento logout", (await eventCount(u, "logout")) === 1),
    ];
  });

  // ---------- WHITELIST METADATA ----------
  await test("auth_events.metadata: whitelist zod applicata dentro log()", async () => {
    const out: boolean[] = [];
    let threw = false;
    try {
      await authEventsSrv.log("logout", { userId: u1, metadata: { ip: "127.0.0.1" } });
    } catch {
      threw = true;
    }
    out.push(check("metadata non previsti -> eccezione", threw));

    threw = false;
    try {
      await authEventsSrv.log("otp_failed", { userId: u1, metadata: { attempts: 1, email: e1 } });
    } catch {
      threw = true;
    }
    out.push(check("chiave extra su otp_failed -> eccezione", threw));

    let ok = true;
    try {
      await authEventsSrv.log("otp_failed", { userId: u1, metadata: { attempts: 2 } });
    } catch {
      ok = false;
    }
    out.push(check("metadata validi -> inserimento riuscito", ok && (await eventCount(u1, "otp_failed")) === 1));
    return out;
  });

  // ---------- RIEPILOGO ----------
  console.log("\n==============================");
  console.log(`Passati: ${passed}   Falliti: ${failed}`);
  failures.forEach((f) => console.log(`  - ${f}`));
}

async function cleanup() {
  try {
    const ids = (await pool.query(`SELECT id FROM users WHERE email = ANY($1)`, [usedEmails])).rows.map((r) => r.id);
    await pool.query(`DELETE FROM sessions WHERE user_id = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM auth_events WHERE user_id = ANY($1) OR subject_hash = ANY($2)`, [
      ids,
      usedEmails.map((e) => authEventsSrv.hashSubject(e)),
    ]);
    await pool.query(`DELETE FROM auth_identities WHERE user_id = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM otp_challenges WHERE destination = ANY($1)`, [usedEmails]);
    console.log("Dati di test ripuliti.");
  } catch (e) {
    console.log("Pulizia non riuscita:", e);
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
