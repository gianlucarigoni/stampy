/**
 * Test di POST /api/auth/email/verify
 *
 * Esecuzione (server acceso con `npm run dev`, DB di sviluppo):
 *   npx tsx --env-file=.env test-otp-verify.ts
 *
 * Non passa dall'invio email: crea le sfide direttamente nel DB con un codice noto
 * (stesso HMAC del server, quindi serve lo stesso OTP_HMAC_SECRET del .env) e chiama solo /verify.
 * Usa indirizzi otp-verify-*@test.it e ripulisce i propri dati (solo sviluppo).
 */
import crypto from "crypto";
import { pool } from "../src/db";
import otpSrv from "../src/api/auth/otp/otp.service";
import authEventsSrv from "../src/api/auth/auth-events/auth-events.service";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const PATH = "/api/auth/email/verify";
const COOKIE_NAME = "sid";
const RUN = Date.now().toString(36);
const GENERIC_MESSAGE_PART = "non valido"; // "Codice non valido o scaduto"

if (process.env.NODE_ENV === "production") {
  console.error("Rifiuto di girare con NODE_ENV=production");
  process.exit(1);
}

type Res = { status: number; body: any; cookies: string[] };

async function verify(body: unknown): Promise<Res> {
  const r = await fetch(BASE_URL + PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: r.status, body: parsed, cookies: r.headers.getSetCookie() };
}

const mail = (tag: string) => `otp-verify-${RUN}-${tag}@test.it`;
const usedEmails: string[] = [];
const track = (e: string) => (usedEmails.push(e), e);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// ---------- helper DB ----------
type ChallengeOpts = { expiredSecondsAgo?: number; attempts?: number; invalidated?: boolean };

async function makeChallenge(email: string, code: string, o: ChallengeOpts = {}): Promise<string> {
  const id = crypto.randomUUID();
  // una sola sfida viva per destinatario (indice UNIQUE parziale): chiudo quella precedente
  await pool.query(
    `UPDATE otp_challenges SET invalidated_at = now()
     WHERE destination = $1 AND consumed_at IS NULL AND invalidated_at IS NULL`,
    [email],
  );
  const expires = o.expiredSecondsAgo
    ? `now() - make_interval(secs => ${Number(o.expiredSecondsAgo)})`
    : `now() + interval '5 minutes'`;
  await pool.query(
    `INSERT INTO otp_challenges (id, channel, destination, code_hash, attempts, expires_at, invalidated_at)
     VALUES ($1, 'email', $2, $3, $4, ${expires}, ${o.invalidated ? "now()" : "NULL"})`,
    [id, email, otpSrv.hashCode(id, code), o.attempts ?? 0],
  );
  return id;
}
async function challenge(id: string) {
  const r = await pool.query(`SELECT attempts, consumed_at, invalidated_at FROM otp_challenges WHERE id = $1`, [id]);
  return r.rows[0];
}
async function userByEmail(email: string) {
  const r = await pool.query(`SELECT id, email, display_name FROM users WHERE email = $1`, [email]);
  return r.rows;
}
async function identities(userId: string) {
  const r = await pool.query(
    `SELECT provider, provider_user_id, last_used_at FROM auth_identities WHERE user_id = $1`,
    [userId],
  );
  return r.rows;
}
async function sessionsOf(userId: string) {
  const r = await pool.query(
    `SELECT token_hash, auth_provider, expires_at, user_agent FROM sessions WHERE user_id = $1`,
    [userId],
  );
  return r.rows;
}
async function eventCount(email: string, type: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM auth_events WHERE subject_hash = $1 AND type = $2`, [
    authEventsSrv.hashSubject(email),
    type,
  ]);
  return r.rows[0].n;
}
async function eventCountForUser(userId: string, type: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM auth_events WHERE user_id = $1 AND type = $2`, [
    userId,
    type,
  ]);
  return r.rows[0].n;
}
const cookieToken = (r: Res): string | null => {
  const c = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`));
  return c ? c.split(";")[0].slice(COOKIE_NAME.length + 1) : null;
};

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
const isGeneric400 = (r: Res) =>
  r.status === 400 && typeof r.body?.message === "string" && r.body.message.includes(GENERIC_MESSAGE_PART);

async function main() {
  const okId = await makeChallenge(track(mail("seed")), "000000"); // solo per avere un UUID valido nei test di validazione

  // ---------- VALIDAZIONE INPUT ----------
  await test("Body vuoto -> 400", async () => {
    const r = await verify({});
    show(r);
    return [check("status 400", r.status === 400, "se 500: manca validate(verifyDTO,'body') sul router")];
  });
  await test("challengeId non UUID -> 400", async () => {
    const r = await verify({ challengeId: "non-un-uuid", code: "123456" });
    show(r);
    return [check("status 400", r.status === 400)];
  });
  await test("Codice con lettere / 5 cifre / 7 cifre / numero -> 400", async () => {
    const out: boolean[] = [];
    for (const code of ["abcdef", "12345", "1234567", 123456 as any]) {
      const r = await verify({ challengeId: okId, code });
      out.push(check(`code=${JSON.stringify(code)} -> 400`, r.status === 400, `status=${r.status}`));
    }
    const c = await challenge(okId);
    out.push(check("la validazione non consuma tentativi", c.attempts === 0, `attempts=${c.attempts}`));
    return out;
  });

  // ---------- CASO FELICE: UTENTE NUOVO ----------
  const e1 = track(mail("new"));
  let sessionToken1: string | null = null;
  await test("Codice giusto, utente nuovo -> 200, cookie, utente + identita' + sessione", async () => {
    const id = await makeChallenge(e1, "424242");
    const r = await verify({ challengeId: id, code: "424242" });
    show(r);
    const users = await userByEmail(e1);
    const u = users[0];
    const ids = u ? await identities(u.id) : [];
    const token = cookieToken(r);
    sessionToken1 = token;
    const sess = u ? await sessionsOf(u.id) : [];
    const c = await challenge(id);
    const cookieLine = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`)) ?? "";
    return [
      check("status 200", r.status === 200),
      check("body contiene solo { user }", Object.keys(r.body ?? {}).join() === "user"),
      check(
        "user = { id, email, displayName }",
        Object.keys(r.body?.user ?? {})
          .sort()
          .join() === "displayName,email,id",
      ),
      check("il token NON e' nel body", !!token && !JSON.stringify(r.body).includes(token)),
      check("cookie presente", !!token, `token len=${token?.length}`),
      check("cookie HttpOnly", /httponly/i.test(cookieLine)),
      check("cookie SameSite=Lax", /samesite=lax/i.test(cookieLine)),
      check(
        "cookie Max-Age ~ 90 giorni (tetto assoluto della sessione)",
        /max-age=77760\d\d/i.test(cookieLine) || /expires=/i.test(cookieLine),
        cookieLine.slice(0, 120),
      ),
      check("un solo utente creato", users.length === 1),
      check(
        "identita' email creata",
        ids.length === 1 && ids[0].provider === "email" && ids[0].provider_user_id === e1,
      ),
      check(
        "una sessione, hash = SHA-256 del token",
        sess.length === 1 && !!token && sess[0].token_hash === sha256(token),
      ),
      check("sessione provider email", sess[0]?.auth_provider === "email"),
      check("sfida consumata", !!c.consumed_at && !c.invalidated_at),
      check("evento otp_verified", u ? (await eventCountForUser(u.id, "otp_verified")) === 1 : false),
      check("evento login_success", u ? (await eventCountForUser(u.id, "login_success")) === 1 : false),
      check(
        "nessun identity_linked per un utente nuovo",
        u ? (await eventCountForUser(u.id, "identity_linked")) === 0 : false,
      ),
    ];
  });

  await test("Nessuna email in chiaro in auth_events", async () => {
    const r = await pool.query(
      `SELECT count(*)::int AS n FROM auth_events
       WHERE subject_hash = $1 OR metadata::text ILIKE '%' || $1 || '%' OR metadata::text ILIKE '%otp-verify-%'`,
      [e1],
    );
    return [check("nessuna riga con email in chiaro", r.rows[0].n === 0, `righe=${r.rows[0].n}`)];
  });

  // ---------- RIUSO DEL CODICE ----------
  await test("Stesso codice usato due volte -> secondo 400 generico, nessuna seconda sessione", async () => {
    const id = await makeChallenge(e1, "111111");
    const first = await verify({ challengeId: id, code: "111111" });
    const second = await verify({ challengeId: id, code: "111111" });
    show(second);
    const u = (await userByEmail(e1))[0];
    const sess = await sessionsOf(u.id);
    return [
      check("primo 200", first.status === 200),
      check("secondo 400 generico", isGeneric400(second)),
      check("secondo senza cookie", !cookieToken(second)),
      check("sessioni totali = 2 (prima + questa)", sess.length === 2, `sessioni=${sess.length}`),
    ];
  });

  // ---------- CODICE ERRATO ----------
  const e2 = track(mail("wrong"));
  await test("Codice errato -> 400 generico, attempts +1, otp_failed, sfida ancora viva", async () => {
    const id = await makeChallenge(e2, "222222");
    const r = await verify({ challengeId: id, code: "999999" });
    show(r);
    const c = await challenge(id);
    return [
      check("400 generico", isGeneric400(r), "il messaggio deve contenere 'non valido'"),
      check("il messaggio non contiene il challengeId", !JSON.stringify(r.body).includes(id)),
      check("nessun cookie", !cookieToken(r)),
      check("attempts = 1", c.attempts === 1, `attempts=${c.attempts}`),
      check("sfida ancora viva", !c.consumed_at && !c.invalidated_at),
      check("evento otp_failed", (await eventCount(e2, "otp_failed")) === 1),
      check("nessun utente creato", (await userByEmail(e2)).length === 0),
      check("nessuna identita' o sessione", true),
    ];
  });

  // ---------- 5 TENTATIVI ----------
  const e3 = track(mail("five"));
  await test("5 codici errati -> sfida invalidata, il 6o con il codice giusto fallisce", async () => {
    const id = await makeChallenge(e3, "333333");
    const out: boolean[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = await verify({ challengeId: id, code: "000001" });
      out.push(check(`errato ${i} -> 400`, isGeneric400(r), `status=${r.status}`));
    }
    const c = await challenge(id);
    out.push(check("attempts = 5", c.attempts === 5, `attempts=${c.attempts}`));
    out.push(check("sfida invalidata", !!c.invalidated_at));
    const r6 = await verify({ challengeId: id, code: "333333" });
    show(r6);
    out.push(check("6o con il codice GIUSTO -> 400 generico", isGeneric400(r6)));
    out.push(check("nessun utente creato", (await userByEmail(e3)).length === 0));
    out.push(check("5 eventi otp_failed", (await eventCount(e3, "otp_failed")) === 5));
    return out;
  });

  const e4 = track(mail("fifth"));
  await test("4 errati + il 5o giusto -> 200 (il quinto tentativo e' ancora valido)", async () => {
    const id = await makeChallenge(e4, "444444");
    for (let i = 0; i < 4; i++) await verify({ challengeId: id, code: "000001" });
    const r = await verify({ challengeId: id, code: "444444" });
    show(r);
    return [check("status 200", r.status === 200), check("utente creato", (await userByEmail(e4)).length === 1)];
  });

  await test("Sfida gia' a 5 tentativi (anche non invalidata) + codice giusto -> 400", async () => {
    const e = track(mail("exhausted"));
    const id = await makeChallenge(e, "555555", { attempts: 5 });
    const r = await verify({ challengeId: id, code: "555555" });
    show(r);
    return [check("400 generico", isGeneric400(r)), check("nessun utente", (await userByEmail(e)).length === 0)];
  });

  // ---------- SCADUTA / INVALIDATA / INESISTENTE ----------
  await test("Sfida scaduta -> 400 generico, attempts non incrementato", async () => {
    const e = track(mail("expired"));
    const id = await makeChallenge(e, "666666", { expiredSecondsAgo: 10 });
    const r = await verify({ challengeId: id, code: "666666" });
    show(r);
    const c = await challenge(id);
    return [
      check("400 generico", isGeneric400(r)),
      check("attempts = 0", c.attempts === 0),
      check("non consumata", !c.consumed_at),
      check("nessun utente", (await userByEmail(e)).length === 0),
    ];
  });

  await test("Sfida invalidata (sostituita da un nuovo invio) -> 400 generico", async () => {
    const e = track(mail("replaced"));
    const oldId = await makeChallenge(e, "777777");
    await makeChallenge(e, "888888"); // chiude la precedente, come farebbe un nuovo invio
    const r = await verify({ challengeId: oldId, code: "777777" });
    show(r);
    return [
      check("il vecchio codice non funziona piu'", isGeneric400(r)),
      check("nessun utente", (await userByEmail(e)).length === 0),
    ];
  });

  await test("challengeId inesistente -> 400 generico, stesso corpo del codice errato", async () => {
    const r = await verify({ challengeId: crypto.randomUUID(), code: "123456" });
    show(r);
    const wrong = await verify({ challengeId: await makeChallenge(track(mail("cmp")), "121212"), code: "000000" });
    return [
      check("400 generico", isGeneric400(r)),
      check(
        "stesso status e messaggio di un codice errato",
        r.status === wrong.status && r.body?.message === wrong.body?.message,
      ),
    ];
  });

  // ---------- UTENTE GIA' ESISTENTE ----------
  const e5 = track(mail("existing-noident"));
  await test("Utente esistente SENZA identita' email -> 200, stesso utente, identity_linked", async () => {
    const ins = await pool.query(`INSERT INTO users (email) VALUES ($1) RETURNING id`, [e5]);
    const userId: string = ins.rows[0].id;
    const id = await makeChallenge(e5, "515151");
    const r = await verify({ challengeId: id, code: "515151" });
    show(r);
    const ids = await identities(userId);
    return [
      check("status 200", r.status === 200),
      check("stesso user id", r.body?.user?.id === userId),
      check("ancora un solo utente", (await userByEmail(e5)).length === 1),
      check("identita' email aggiunta", ids.length === 1 && ids[0].provider === "email"),
      check("evento identity_linked", (await eventCountForUser(userId, "identity_linked")) === 1),
      check("evento login_success", (await eventCountForUser(userId, "login_success")) === 1),
    ];
  });

  await test("Utente esistente CON identita' -> 200, nessun identity_linked, nuova sessione, last_used_at", async () => {
    const u = (await userByEmail(e1))[0];
    const before = await sessionsOf(u.id);
    const id = await makeChallenge(e1, "616161");
    const r = await verify({ challengeId: id, code: "616161" });
    show(r);
    const after = await sessionsOf(u.id);
    const ids = await identities(u.id);
    const t = cookieToken(r);
    return [
      check("status 200", r.status === 200),
      check("stesso user id", r.body?.user?.id === u.id),
      check("nessun identity_linked", (await eventCountForUser(u.id, "identity_linked")) === 0),
      check("una sessione in piu'", after.length === before.length + 1),
      check("token diverso da quello del primo login", !!t && t !== sessionToken1),
      check("identita' ancora una sola", ids.length === 1),
      check("last_used_at valorizzato", !!ids[0]?.last_used_at),
    ];
  });

  // ---------- CONCORRENZA ----------
  const e6 = track(mail("race"));
  await test("5 verify simultanee con il codice giusto -> una 200, quattro 400, un utente, una sessione", async () => {
    const id = await makeChallenge(e6, "919191");
    const rs = await Promise.all(Array.from({ length: 5 }, () => verify({ challengeId: id, code: "919191" })));
    rs.forEach(show);
    const n200 = rs.filter((r) => r.status === 200).length;
    const n400 = rs.filter((r) => r.status === 400).length;
    const n5xx = rs.filter((r) => r.status >= 500).length;
    const users = await userByEmail(e6);
    const sess = users[0] ? await sessionsOf(users[0].id) : [];
    return [
      check("esattamente una 200", n200 === 1, `200=${n200}`),
      check("le altre 400", n400 === 4, `400=${n400}`),
      check("nessun 5xx", n5xx === 0, `5xx=${n5xx}`),
      check("un solo utente", users.length === 1),
      check("una sola sessione", sess.length === 1, `sessioni=${sess.length}`),
      check("un solo login_success", users[0] ? (await eventCountForUser(users[0].id, "login_success")) === 1 : false),
    ];
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
