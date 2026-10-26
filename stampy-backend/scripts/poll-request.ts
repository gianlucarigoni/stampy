/**
 * Test di `POST /api/venues/:venueId/visit` e `GET /api/requests/:requestId` con l'utente di sessione.
 *
 * Esecuzione (server acceso con `npm run dev`, DB di sviluppo):
 *   npx tsx --env-file=.env scripts/poll-request.ts
 *
 * Le sessioni si creano direttamente nel DB con un token noto (in tabella solo SHA-256),
 * quindi non serve passare dall'invio email. Il `venueId` si sceglie dal DB (primo locale
 * non archiviato con una promozione attiva): nessun id scritto a mano.
 *
 * Copre: 401 senza/con cookie fasullo, `userId` nel body ignorato, creazione card,
 * richiesta pending, polling del proprietario, 404 uniforme per la richiesta di un altro
 * utente (senza scriverla), scadenza lazy, nuovo tocco dopo la scadenza, utente anonimizzato.
 * Usa indirizzi visit-test-*@test.it e ripulisce i propri dati (solo sviluppo).
 */
import crypto from "crypto";
import { pool } from "../src/db";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const COOKIE_NAME = "sid";
const RUN = Date.now().toString(36);

if (process.env.NODE_ENV === "production") {
  console.error("Rifiuto di girare con NODE_ENV=production");
  process.exit(1);
}

type Res = { status: number; body: any };

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
  return { status: r.status, body: parsed };
}

const visit = (venueId: string, cookie?: string, body?: unknown) =>
  request(`/api/venues/${venueId}/visit`, { method: "POST", cookie, body });
const poll = (requestId: string, cookie?: string) => request(`/api/requests/${requestId}`, { cookie });

const mail = (tag: string) => `visit-test-${RUN}-${tag}@test.it`;
const usedEmails: string[] = [];
const track = (e: string) => (usedEmails.push(e), e);

// ---------- helper DB ----------
async function createUser(email: string, burn = false): Promise<string> {
  const r = await pool.query(
    `INSERT INTO users (email, display_name, anonymized_at) VALUES ($1, $2, $3) RETURNING id`,
    [email, "Visit Test", burn ? new Date() : null],
  );
  return r.rows[0].id;
}

async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, auth_provider, expires_at, last_seen_at, user_agent)
     VALUES ($1, $2, 'email', now() + interval '30 days', now(), 'test-script')`,
    [userId, tokenHash],
  );
  return token;
}

async function findVenueWithActivePromotion(): Promise<string | null> {
  const r = await pool.query(
    `SELECT v.id
       FROM venues v
       JOIN promotions p ON p.venue_id = v.id
      WHERE v.archived_at IS NULL
        AND p.starts_at <= now()
        AND (p.ends_at IS NULL OR p.ends_at > now())
      ORDER BY v.created_at
      LIMIT 1`,
  );
  return r.rows[0]?.id ?? null;
}

async function cardOf(userId: string, venueId: string): Promise<{ id: string; stamps_count: number } | null> {
  const r = await pool.query(`SELECT id, stamps_count FROM cards WHERE user_id = $1 AND venue_id = $2`, [
    userId,
    venueId,
  ]);
  return r.rows[0] ?? null;
}

async function requestState(requestId: string): Promise<{ status: string; resolved_at: string | null } | null> {
  const r = await pool.query(`SELECT status, resolved_at FROM stamp_requests WHERE id = $1`, [requestId]);
  return r.rows[0] ?? null;
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

const show = (r: Res) => console.log(`   risposta: ${r.status} ${JSON.stringify(r.body)}`);
const is401 = (r: Res) => r && r.status === 401 && r.body?.message === "Non autenticato";
const is404 = (r: Res) => r.status === 404 && r.body?.error === "RequestNotFound";

async function main() {
  const venueId = await findVenueWithActivePromotion();
  if (!venueId) {
    console.error("Nessun locale con promozione attiva nel DB: lancia prima `npm run seed` (solo sviluppo).");
    process.exitCode = 1;
    return;
  }
  console.log(`Locale di test: ${venueId}`);

  const ownerEmail = track(mail("owner"));
  const ownerId = await createUser(ownerEmail);
  const ownerToken = await createSession(ownerId);

  const intruderEmail = track(mail("intruder"));
  const intruderId = await createUser(intruderEmail);
  const intruderToken = await createSession(intruderId);

  let cardId = "";
  let firstRequestId = "";

  // ---------- AUTENTICAZIONE ----------
  await test("visit senza cookie -> 401 (utente dalla sessione, non dal body)", async () => {
    const r = await visit(venueId);
    show(r);
    const invalidNoCookie = await visit("non-un-uuid");
    return [
      check("status 401", is401(r), `status=${r.status}`),
      check(
        "params non validi senza sessione -> 401, non 400 (auth prima della validazione)",
        is401(invalidNoCookie),
        `status=${invalidNoCookie.status}`,
      ),
    ];
  });

  await test("visit con cookie fasullo -> 401", async () => {
    const r = await visit(venueId, "x".repeat(43));
    show(r);
    return [check("status 401", is401(r), `status=${r.status}`)];
  });

  await test("visit con sessione di un utente anonimizzato -> 401", async () => {
    const burnEmail = track(mail("anon"));
    const burnId = await createUser(burnEmail, true);
    const burnToken = await createSession(burnId);
    const r = await visit(venueId, burnToken);
    show(r);
    return [
      check("status 401", is401(r), `status=${r.status}`),
      check("nessuna card creata per l'utente anonimizzato", (await cardOf(burnId, venueId)) === null),
    ];
  });

  // ---------- PRIMO TOCCO: CARD ----------
  await test("primo tocco: 201 card_created, `userId` nel body ignorato, card dell'utente di sessione", async () => {
    // il body contiene l'id di un ALTRO utente: deve essere ignorato
    const r = await visit(venueId, ownerToken, { userId: intruderId });
    show(r);
    const ownerCard = await cardOf(ownerId, venueId);
    cardId = ownerCard?.id ?? "";
    return [
      check("status 201", r.status === 201, `status=${r.status}`),
      check("state = card_created", r.body?.state === "card_created", String(r.body?.state)),
      check("saveUrl presente", typeof r.body?.saveUrl === "string" && r.body.saveUrl.length > 0),
      check("publicCode presente (8 caratteri)", typeof r.body?.publicCode === "string" && r.body.publicCode.length === 8),
      check("card creata per l'utente di sessione", ownerCard !== null),
      check("card NON creata per l'utente nel body", (await cardOf(intruderId, venueId)) === null),
      check("card a 0 timbri", ownerCard?.stamps_count === 0, `${ownerCard?.stamps_count}`),
    ];
  });

  // ---------- SECONDO TOCCO: RICHIESTA ----------
  await test("secondo tocco: 201 request_pending con requestId ed expiresAt", async () => {
    const r = await visit(venueId, ownerToken);
    show(r);
    firstRequestId = r.body?.requestId ?? "";
    return [
      check("status 201", r.status === 201, `status=${r.status}`),
      check("state = request_pending", r.body?.state === "request_pending", String(r.body?.state)),
      check("requestId presente", typeof firstRequestId === "string" && firstRequestId.length === 36),
      check("expiresAt presente", typeof r.body?.expiresAt === "string"),
      check("nessun saveUrl nel secondo tocco", r.body?.saveUrl === undefined),
      check("richiesta pending nel DB", (await requestState(firstRequestId))?.status === "pending"),
    ];
  });

  // ---------- POLLING ----------
  await test("polling del proprietario -> 200 pending con expiresAt", async () => {
    const r = await poll(firstRequestId, ownerToken);
    show(r);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("status = pending", r.body?.status === "pending", String(r.body?.status)),
      check("expiresAt presente", typeof r.body?.expiresAt === "string"),
      check("body solo {status, expiresAt}", Object.keys(r.body ?? {}).sort().join() === "expiresAt,status"),
    ];
  });

  await test("polling senza cookie -> 401", async () => {
    const r = await poll(firstRequestId);
    show(r);
    return [check("status 401", is401(r), `status=${r.status}`)];
  });

  await test("polling con UUID malformato e sessione valida -> 400", async () => {
    const r = await poll("non-un-uuid", ownerToken);
    show(r);
    return [check("status 400", r.status === 400, `status=${r.status}`)];
  });

  await test("visit con venue UUID malformato e sessione valida -> 400", async () => {
    const r = await visit("non-un-uuid", ownerToken);
    show(r);
    return [check("status 400", r.status === 400, `status=${r.status}`)];
  });

  // ---------- OWNERSHIP ----------
  await test("polling della richiesta di un altro utente -> 404 identico a inesistente, nessuna scrittura", async () => {
    const foreign = await poll(firstRequestId, intruderToken);
    const missing = await poll(crypto.randomUUID(), intruderToken);
    show(foreign);
    console.log(`   confronto con id inesistente: ${missing.status} ${JSON.stringify(missing.body)}`);
    return [
      check("status 404", is404(foreign), `status=${foreign.status}`),
      check("corpo identico al 404 di un id inesistente", JSON.stringify(foreign.body) === JSON.stringify(missing.body)),
      check(
        "la richiesta dell'altro utente resta pending (nessuna scrittura)",
        (await requestState(firstRequestId))?.status === "pending",
      ),
    ];
  });

  // ---------- SCADENZA LAZY ----------
  await test("richiesta scaduta -> expired (scadenza lazy, solo da pending)", async () => {
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [
      firstRequestId,
    ]);
    const r = await poll(firstRequestId, ownerToken);
    show(r);
    const after = await requestState(firstRequestId);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("status = expired", r.body?.status === "expired", String(r.body?.status)),
      check("DB: expired", after?.status === "expired", String(after?.status)),
      check("DB: resolved_at valorizzato", after?.resolved_at !== null),
    ];
  });

  await test("dopo la scadenza un nuovo tocco crea una nuova richiesta pending", async () => {
    const r = await visit(venueId, ownerToken);
    show(r);
    const newId = r.body?.requestId;
    return [
      check("status 201", r.status === 201, `status=${r.status}`),
      check("state = request_pending", r.body?.state === "request_pending", String(r.body?.state)),
      check("nuovo requestId diverso dal precedente", typeof newId === "string" && newId !== firstRequestId),
      check("nuova richiesta pending nel DB", (await requestState(newId))?.status === "pending"),
      check("una sola pending per la card", (await pendingCount(cardId)) === 1, `${await pendingCount(cardId)}`),
    ];
  });

  // ---------- RIEPILOGO ----------
  console.log("\n==============================");
  console.log(`Passati: ${passed}   Falliti: ${failed}`);
  failures.forEach((f) => console.log(`  - ${f}`));
}

async function pendingCount(cardId: string): Promise<number> {
  if (!cardId) return 0;
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM stamp_requests WHERE card_id = $1 AND status = 'pending'`,
    [cardId],
  );
  return r.rows[0].n;
}

async function cleanup() {
  try {
    const ids = (await pool.query(`SELECT id FROM users WHERE email = ANY($1)`, [usedEmails])).rows.map(
      (r) => r.id,
    );
    if (ids.length) {
      await pool.query(`DELETE FROM stamp_requests WHERE card_id IN (SELECT id FROM cards WHERE user_id = ANY($1))`, [
        ids,
      ]);
      await pool.query(`DELETE FROM cards WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM sessions WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
    }
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
