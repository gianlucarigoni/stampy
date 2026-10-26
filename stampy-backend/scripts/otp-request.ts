/**
 * Test di POST /api/auth/email/request
 *
 * Esecuzione (server acceso con `npm run dev`, DB di sviluppo):
 *   npx tsx --env-file=.env test-otp-request.ts
 *
 * Adegua BASE_URL e PATH se il router monta il percorso altrove.
 * Usa indirizzi otp-test-*@test.it e ripulisce i propri dati (solo sviluppo).
 */
import { pool } from "../src/db";
import authEventsSrv from "../src/api/auth/auth-events.service";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const PATH = "/api/auth/email/request";
const RUN = Date.now().toString(36);

if (process.env.NODE_ENV === "production") {
  console.error("Rifiuto di girare con NODE_ENV=production");
  process.exit(1);
}

type Res = { status: number; body: any; retryAfter: number | null };

async function post(body: unknown, method = "POST", path = PATH): Promise<Res> {
  const r = await fetch(BASE_URL + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  const ra = r.headers.get("retry-after");
  return { status: r.status, body: parsed, retryAfter: ra ? Number(ra) : null };
}

const mail = (tag: string) => `otp-test-${RUN}-${tag}@test.it`;
const usedEmails: string[] = [];
const track = (e: string) => (usedEmails.push(e), e);

async function age(email: string, seconds: number) {
  await pool.query(
    `UPDATE otp_challenges SET created_at = created_at - make_interval(secs => $2) WHERE destination = $1`,
    [email, seconds],
  );
}
async function alive(email: string): Promise<number> {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM otp_challenges
     WHERE destination = $1 AND consumed_at IS NULL AND invalidated_at IS NULL`,
    [email],
  );
  return r.rows[0].n;
}
async function total(email: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM otp_challenges WHERE destination = $1`, [email]);
  return r.rows[0].n;
}
async function events(email: string, type: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM auth_events WHERE subject_hash = $1 AND type = $2`, [
    authEventsSrv.hashSubject(email),
    type,
  ]);
  return r.rows[0].n;
}

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
    const results = await fn();
    const ok = results.every(Boolean);
    console.log(`   => ${ok ? "SUCCESSO" : "FALLITO"}`);
    ok ? passed++ : (failed++, failures.push(name));
  } catch (e) {
    console.log("   ECCEZIONE:", e);
    console.log("   => FALLITO");
    failed++;
    failures.push(name);
  }
}
const show = (r: Res) => console.log(`   risposta: ${r.status} ${JSON.stringify(r.body)} retry-after=${r.retryAfter}`);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  // ---------- VALIDAZIONE INPUT ----------
  await test("Body vuoto -> 400", async () => {
    const r = await post({});
    show(r);
    return [
      check(
        "status 400",
        r.status === 400,
        "se 500: manca validate(emailDTO,'body') sul router o l'email non e' obbligatoria",
      ),
    ];
  });

  await test("Email non valida -> 400", async () => {
    const r = await post({ email: "non-una-email" });
    show(r);
    return [check("status 400", r.status === 400)];
  });

  await test("Email non stringa (numero) -> 400", async () => {
    const r = await post({ email: 12345 });
    show(r);
    return [check("status 400", r.status === 400)];
  });

  await test("Email troppo lunga (300 caratteri) -> 400", async () => {
    const r = await post({ email: "a".repeat(290) + "@test.it" });
    show(r);
    return [check("status 400", r.status === 400, "se 202: manca @MaxLength(254) nel DTO")];
  });

  await test("Metodo GET -> 404", async () => {
    const r = await post({}, "GET");
    show(r);
    return [check("status 404", r.status === 404)];
  });

  // ---------- CASO FELICE ----------
  const e1 = track(mail("ok"));
  await test("Prima richiesta valida -> 202 con challengeId", async () => {
    const r = await post({ email: e1 });
    show(r);
    const row = await pool.query(
      `SELECT code_hash, channel, destination, attempts,
              extract(epoch from (expires_at - created_at))::int AS ttl
       FROM otp_challenges WHERE id = $1`,
      [r.body?.challengeId],
    );
    const c = row.rows[0];
    return [
      check("status 202", r.status === 202),
      check("challengeId e' un UUID", UUID.test(r.body?.challengeId ?? "")),
      check("body contiene solo challengeId", Object.keys(r.body ?? {}).join() === "challengeId"),
      check("riga creata nel DB", !!c),
      check("code_hash e' HMAC hex di 64 caratteri", /^[0-9a-f]{64}$/.test(c?.code_hash ?? "")),
      check("attempts = 0", c?.attempts === 0),
      check("scadenza = 300 secondi", c?.ttl === 300, `ttl=${c?.ttl}`),
      check("una sola sfida viva", (await alive(e1)) === 1),
      check("auth_event otp_sent scritto", (await events(e1, "otp_sent")) === 1),
    ];
  });

  // ---------- NORMALIZZAZIONE ----------
  const e2 = track(mail("case"));
  await test("Email con maiuscole -> salvata in minuscolo", async () => {
    const r = await post({ email: e2.toUpperCase() });
    show(r);
    const n = await total(e2);
    return [check("status 202", r.status === 202), check("destinatario salvato minuscolo", n === 1)];
  });

  // ---------- COOLDOWN ----------
  await test("Seconda richiesta subito dopo -> 429 con Retry-After", async () => {
    const before = await pool.query(
      `SELECT id FROM otp_challenges WHERE destination = $1 AND invalidated_at IS NULL AND consumed_at IS NULL`,
      [e1],
    );
    const r = await post({ email: e1 });
    show(r);
    const after = await pool.query(
      `SELECT id FROM otp_challenges WHERE destination = $1 AND invalidated_at IS NULL AND consumed_at IS NULL`,
      [e1],
    );
    return [
      check("status 429", r.status === 429, "se 500/altro: controllare TryLaterError e gli handler"),
      check(
        "header Retry-After tra 1 e 45",
        (r.retryAfter ?? 0) >= 1 && (r.retryAfter ?? 0) <= 45,
        `valore=${r.retryAfter}`,
      ),
      check("la sfida viva e' rimasta la stessa", before.rows[0]?.id === after.rows[0]?.id),
      check("nessuna nuova riga creata", (await total(e1)) === 1),
      check("auth_event otp_send_blocked scritto", (await events(e1, "otp_send_blocked")) >= 1),
    ];
  });

  await test("Dopo il cooldown (invecchio la sfida di 60 s) -> 202, vecchia invalidata", async () => {
    await age(e1, 60);
    const r = await post({ email: e1 });
    show(r);
    const inval = await pool.query(
      `SELECT count(*)::int AS n FROM otp_challenges WHERE destination = $1 AND invalidated_at IS NOT NULL`,
      [e1],
    );
    return [
      check("status 202", r.status === 202),
      check("2 righe totali", (await total(e1)) === 2),
      check("1 invalidata", inval.rows[0].n === 1),
      check("1 sola viva", (await alive(e1)) === 1),
    ];
  });

  // ---------- TETTO ORARIO ----------
  const e3 = track(mail("hourly"));
  await test("5 invii ok, il 6o -> 429 e la sfida viva resta viva", async () => {
    const out: boolean[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = await post({ email: e3 });
      out.push(check(`invio ${i} -> 202`, r.status === 202, `status=${r.status}`));
      await age(e3, 60);
    }
    const r6 = await post({ email: e3 });
    show(r6);
    out.push(check("6o invio -> 429", r6.status === 429));
    out.push(
      check(
        "Retry-After circa 3300 (tra 2900 e 3600)",
        (r6.retryAfter ?? 0) > 2900 && (r6.retryAfter ?? 0) <= 3600,
        `valore=${r6.retryAfter}`,
      ),
    );
    out.push(check("la 5a sfida e' ancora viva (bug dell'invalidazione prematura)", (await alive(e3)) === 1));
    out.push(check("ancora 5 righe totali", (await total(e3)) === 5));
    out.push(check("auth_event otp_send_blocked per hourly_limit", (await events(e3, "otp_send_blocked")) >= 1));
    return out;
  });

  await test("Dopo la finestra oraria (invecchio tutto di 1 ora) -> 202", async () => {
    await age(e3, 3600);
    const r = await post({ email: e3 });
    show(r);
    return [check("status 202", r.status === 202)];
  });

  // ---------- CONCORRENZA ----------
  const e4 = track(mail("race"));
  await test("5 richieste simultanee sullo stesso destinatario -> una 202, le altre 429, zero 500", async () => {
    const rs = await Promise.all(Array.from({ length: 5 }, () => post({ email: e4 })));
    rs.forEach(show);
    const n202 = rs.filter((r) => r.status === 202).length;
    const n429 = rs.filter((r) => r.status === 429).length;
    const n500 = rs.filter((r) => r.status >= 500).length;
    return [
      check("esattamente una 202", n202 === 1, `202=${n202}`),
      check("le altre 429", n429 === 4, `429=${n429}`),
      check("nessun 5xx", n500 === 0, `5xx=${n500}`),
      check("una sola sfida viva", (await alive(e4)) === 1),
      check("una sola riga nel DB", (await total(e4)) === 1),
    ];
  });

  // ---------- NESSUN LEAK SULL'ESISTENZA DELL'UTENTE ----------
  const eU = track(mail("user"));
  const eN = track(mail("nouser"));
  await test("Risposta uguale per email di utente esistente e inesistente", async () => {
    let created = false;
    try {
      await pool.query(`INSERT INTO users (email) VALUES ($1)`, [eU]);
      created = true;
    } catch (e: any) {
      console.log(`   (inserimento utente di prova non riuscito: ${e.message}; test parziale)`);
    }
    const a = await post({ email: eU });
    const b = await post({ email: eN });
    show(a);
    show(b);
    const out = [
      check("stesso status", a.status === b.status, `${a.status} vs ${b.status}`),
      check("stesse chiavi nel body", Object.keys(a.body ?? {}).join() === Object.keys(b.body ?? {}).join()),
    ];
    if (!created) out.push(false);
    return out;
  });

  // ---------- RIEPILOGO ----------
  console.log("\n==============================");
  console.log(`Passati: ${passed}   Falliti: ${failed}`);
  if (failures.length) failures.forEach((f) => console.log(`  - ${f}`));
}

async function cleanup() {
  try {
    await pool.query(`DELETE FROM otp_challenges WHERE destination = ANY($1)`, [usedEmails]);
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [usedEmails]);
    await pool.query(`DELETE FROM auth_events WHERE subject_hash = ANY($1)`, [
      usedEmails.map((e) => authEventsSrv.hashSubject(e)),
    ]);
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
