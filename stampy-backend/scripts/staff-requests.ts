/**
 * Test end-to-end della Fase 4d: staff, coda, conferma/rifiuto, rate limit di `visit`,
 * saldo nel polling.
 *
 * Esecuzione (server acceso con `npm run dev`, DB di sviluppo):
 *   npx tsx --env-file=.env scripts/staff-requests.ts
 *
 * Le sessioni si creano direttamente nel DB con un token noto (in tabella solo SHA-256)
 * e i membri staff si inseriscono in `venue_members`: non serve passare dall'email.
 * I locali si scelgono dal DB (i primi due con promozione attiva): nessun id a mano.
 * Usa indirizzi staff-test-*@test.it e ripulisce i propri dati (solo sviluppo).
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

type Res = { status: number; body: any; headers: Headers };

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
  return { status: r.status, body: parsed, headers: r.headers };
}

const visit = (venueId: string, cookie?: string) =>
  request(`/api/venues/${venueId}/visit`, { method: "POST", cookie });
const poll = (requestId: string, cookie?: string) => request(`/api/requests/${requestId}`, { cookie });
const queue = (venueId: string, cookie?: string) => request(`/api/venues/${venueId}/requests`, { cookie });
const confirm = (venueId: string, requestId: string, cookie?: string, body?: unknown) =>
  request(`/api/venues/${venueId}/requests/${requestId}/confirm`, { method: "POST", cookie, body });
const reject = (venueId: string, requestId: string, cookie?: string) =>
  request(`/api/venues/${venueId}/requests/${requestId}/reject`, { method: "POST", cookie });
const mine = (cookie?: string) => request(`/api/venues/mine`, { cookie });

const mail = (tag: string) => `staff-test-${RUN}-${tag}@test.it`;
const usedEmails: string[] = [];
const track = (e: string) => (usedEmails.push(e), e);
const usedPromotionIds: string[] = [];

// ---------- helper DB ----------
async function createUser(email: string): Promise<string> {
  const r = await pool.query(`INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id`, [
    email,
    "Staff Test",
  ]);
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

async function addMember(userId: string, venueId: string, role: "owner" | "staff") {
  await pool.query(`INSERT INTO venue_members (user_id, venue_id, role) VALUES ($1, $2, $3)`, [
    userId,
    venueId,
    role,
  ]);
}

async function findVenuesWithActivePromotion(limit: number): Promise<string[]> {
  const r = await pool.query(
    `SELECT v.id
       FROM venues v
       JOIN promotions p ON p.venue_id = v.id
      WHERE v.archived_at IS NULL
        AND p.starts_at <= now()
        AND (p.ends_at IS NULL OR p.ends_at > now())
      ORDER BY v.created_at
      LIMIT $1`,
    [limit],
  );
  return r.rows.map((row) => row.id);
}

async function cardOf(userId: string, venueId: string): Promise<{ id: string; stamps_count: number } | null> {
  const r = await pool.query(`SELECT id, stamps_count FROM cards WHERE user_id = $1 AND venue_id = $2`, [
    userId,
    venueId,
  ]);
  return r.rows[0] ?? null;
}

async function requestState(
  requestId: string,
): Promise<{ status: string; resolved_at: string | null; resolved_by: string | null } | null> {
  const r = await pool.query(`SELECT status, resolved_at, resolved_by FROM stamp_requests WHERE id = $1`, [
    requestId,
  ]);
  return r.rows[0] ?? null;
}

async function eventsOf(requestId: string) {
  const r = await pool.query(
    `SELECT type, quantity, idempotency_key, operator_id, promotion_id
       FROM stamp_events
      WHERE request_id = $1
      ORDER BY split_part(idempotency_key, ':', 2)::int`,
    [requestId],
  );
  return r.rows;
}

async function pendingCount(cardId: string): Promise<number> {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM stamp_requests WHERE card_id = $1 AND status = 'pending'`,
    [cardId],
  );
  return r.rows[0].n;
}

async function allRequestsCount(cardId: string): Promise<number> {
  const r = await pool.query(`SELECT count(*)::int AS n FROM stamp_requests WHERE card_id = $1`, [cardId]);
  return r.rows[0].n;
}

/** Inserisce richieste già chiuse (per costruire la finestra del rate limit). */
async function insertClosedRequests(cardId: string, venueId: string, n: number, minutesAgo = 5) {
  await pool.query(
    `INSERT INTO stamp_requests (card_id, venue_id, status, created_at, expires_at, resolved_at)
     SELECT $1, $2, 'expired', now() - make_interval(mins => $3::int), now() - make_interval(mins => $3::int) + interval '3 minutes', now() - make_interval(mins => $3::int) + interval '3 minutes'
       FROM generate_series(1, $4)`,
    [cardId, venueId, minutesAgo, n],
  );
}

async function insertPendingRequest(cardId: string, venueId: string): Promise<string> {
  const r = await pool.query(
    `INSERT INTO stamp_requests (card_id, venue_id, status, expires_at)
     VALUES ($1, $2, 'pending', now() + interval '3 minutes') RETURNING id`,
    [cardId, venueId],
  );
  return r.rows[0].id;
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
const is401 = (r: Res) => r.status === 401 && r.body?.message === "Non autenticato";
const is403 = (r: Res) => r.status === 403 && r.body?.error === "Forbidden";
const is404 = (r: Res) => r.status === 404 && r.body?.error === "RequestNotFound";
const is409 = (r: Res) => r.status === 409;

async function main() {
  const [venueA, venueB] = await findVenuesWithActivePromotion(2);
  if (!venueA || !venueB) {
    console.error("Servono 2 locali con promozione attiva: lancia `npm run seed` (solo sviluppo).");
    process.exitCode = 1;
    return;
  }
  console.log(`Locale A: ${venueA}\nLocale B: ${venueB}`);

  // utenti
  const staffAId = await createUser(track(mail("staff-a")));
  const staffAToken = await createSession(staffAId);
  await addMember(staffAId, venueA, "staff");

  const ownerAId = await createUser(track(mail("owner-a")));
  const ownerAToken = await createSession(ownerAId);
  await addMember(ownerAId, venueA, "owner");

  // membro di due locali: serve per il 404 "richiesta di un altro locale"
  const multiId = await createUser(track(mail("multi")));
  const multiToken = await createSession(multiId);
  await addMember(multiId, venueA, "staff");
  await addMember(multiId, venueB, "owner");

  const intruderId = await createUser(track(mail("intruder")));
  const intruderToken = await createSession(intruderId);

  const customerAId = await createUser(track(mail("customer-a")));
  const customerAToken = await createSession(customerAId);

  const customerBId = await createUser(track(mail("customer-b")));
  const customerBToken = await createSession(customerBId);

  const customerCId = await createUser(track(mail("customer-c")));
  const customerCToken = await createSession(customerCId);

  // cliente dedicato ai casi "soglia esatta / card piena": usato solo dai test in
  // sequenza più sotto, così il saldo di partenza è sempre noto
  const customerDId = await createUser(track(mail("customer-d")));
  const customerDToken = await createSession(customerDId);

  const rateUserId = await createUser(track(mail("rate")));
  const rateUserToken = await createSession(rateUserId);

  let cardAId = "";
  let requestAId = "";
  let requestBId = "";
  let rejectedRequestId = "";

  // ---------- /venues/mine ----------
  await test("GET /venues/mine senza cookie -> 401", async () => {
    const r = await mine();
    show(r);
    return [check("status 401", is401(r), `status=${r.status}`)];
  });

  await test("GET /venues/mine di un utente senza ruoli -> 200 con lista vuota", async () => {
    const r = await mine(intruderToken);
    show(r);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("nessun locale", Array.isArray(r.body?.venues) && r.body.venues.length === 0, `${r.body?.venues?.length}`),
    ];
  });

  await test("GET /venues/mine di un membro di due locali -> 2 voci con il ruolo giusto", async () => {
    const r = await mine(multiToken);
    show(r);
    const venues: any[] = r.body?.venues ?? [];
    const a = venues.find((v) => v.venueId === venueA);
    const b = venues.find((v) => v.venueId === venueB);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("due locali", venues.length === 2, `${venues.length}`),
      check("ruolo staff su A", a?.role === "staff", String(a?.role)),
      check("ruolo owner su B", b?.role === "owner", String(b?.role)),
      check("nessuna email nella risposta", !JSON.stringify(r.body).includes("@test.it")),
    ];
  });

  // ---------- coda: autorizzazione ----------
  await test("coda senza cookie -> 401", async () => {
    const r = await queue(venueA);
    show(r);
    return [check("status 401", is401(r), `status=${r.status}`)];
  });

  await test("coda di un utente autenticato ma non membro -> 403", async () => {
    const r = await queue(venueA, intruderToken);
    show(r);
    return [check("status 403", is403(r), `status=${r.status}`)];
  });

  await test("coda con venueId malformato e sessione valida -> 403 (ruolo prima della validazione)", async () => {
    const r = await queue("non-un-uuid", staffAToken);
    show(r);
    return [check("status 403", is403(r), `status=${r.status}`)];
  });

  // ---------- il cliente crea la richiesta ----------
  await test("cliente: primo tocco card_created, secondo tocco request_pending", async () => {
    const first = await visit(venueA, customerAToken);
    show(first);
    const second = await visit(venueA, customerAToken);
    show(second);
    const card = await cardOf(customerAId, venueA);
    cardAId = card?.id ?? "";
    requestAId = second.body?.requestId ?? "";
    return [
      check("primo tocco 201 card_created", first.status === 201 && first.body?.state === "card_created"),
      check("secondo tocco 201 request_pending", second.status === 201 && second.body?.state === "request_pending"),
      check("card creata", card !== null),
      check("richiesta pending nel DB", (await requestState(requestAId))?.status === "pending"),
    ];
  });

  // ---------- coda: contenuto ----------
  await test("coda staffA -> contiene la richiesta di A con publicCode, saldo e soglia", async () => {
    const r = await queue(venueA, staffAToken);
    show(r);
    const item = (r.body?.requests ?? []).find((x: any) => x.requestId === requestAId);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("richiesta presente", item !== undefined),
      check("publicCode presente (8 caratteri)", typeof item?.publicCode === "string" && item.publicCode.length === 8),
      check("stampsCount 0", item?.stampsCount === 0, `${item?.stampsCount}`),
      check("stampsRequired 10", item?.stampsRequired === 10, `${item?.stampsRequired}`),
      check("createdAt/expiresAt presenti", typeof item?.createdAt === "string" && typeof item?.expiresAt === "string"),
      check("nessuna email del cliente", !JSON.stringify(r.body).includes("@test.it")),
    ];
  });

  // ---------- coda: isolamento tra locali ----------
  await test("coda: la richiesta di B non compare nella coda di A", async () => {
    const firstB = await visit(venueB, customerBToken);
    show(firstB);
    const second = await visit(venueB, customerBToken);
    show(second);
    requestBId = second.body?.requestId ?? "";

    const queueA = await queue(venueA, staffAToken);
    const queueB = await queue(venueB, multiToken);
    const inA = (queueA.body?.requests ?? []).some((x: any) => x.requestId === requestBId);
    const inB = (queueB.body?.requests ?? []).some((x: any) => x.requestId === requestBId);
    return [
      check("richiesta di B creata", typeof requestBId === "string" && requestBId.length === 36),
      check("assente dalla coda di A", inA === false),
      check("presente nella coda di B", inB === true),
    ];
  });

  // ---------- conferma ----------
  await test("conferma quantità 15 -> 200, card 4/10, 3 eventi, resolved_by = operatore", async () => {
    const r = await confirm(venueA, requestAId, staffAToken, { stamps: 15 });
    show(r);
    const state = await requestState(requestAId);
    const events = await eventsOf(requestAId);
    const card = await cardOf(customerAId, venueA);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("status approved", r.body?.status === "approved", String(r.body?.status)),
      // 15 prodotti = 10 timbri + 1 premio (prodotto 11) + 4 timbri
      check("saldo 4", r.body?.stampsCount === 4, `${r.body?.stampsCount}`),
      check("soglia 10", r.body?.stampsRequired === 10, `${r.body?.stampsRequired}`),
      check("1 premio consumato", r.body?.rewards === 1, `${r.body?.rewards}`),
      check("DB: richiesta approved", state?.status === "approved", String(state?.status)),
      check("DB: resolved_by = staff", state?.resolved_by === staffAId, String(state?.resolved_by)),
      check("DB: resolved_at valorizzato", state?.resolved_at !== null),
      check("DB: card a 4 timbri", card?.stamps_count === 4, `${card?.stamps_count}`),
      check("DB: 3 eventi", events.length === 3, `${events.length}`),
      check(
        "DB: tratti stamp 10 / redeem 1 / stamp 4",
        events.map((e) => `${e.type}:${e.quantity}`).join(",") === "stamp:10,redeem:1,stamp:4",
        events.map((e) => `${e.type}:${e.quantity}`).join(","),
      ),
      check(
        "DB: timbri registrati = quantità - premi",
        events.filter((e) => e.type === "stamp").reduce((n, e) => n + e.quantity, 0) === 14,
      ),
      check(
        "DB: chiavi idempotenti {requestId}:{n}",
        events.map((e) => e.idempotency_key).join(",") === `${requestAId}:1,${requestAId}:2,${requestAId}:3`,
      ),
      check("DB: operator_id = staff", events.every((e) => e.operator_id === staffAId)),
    ];
  });

  await test("polling del cliente dopo la conferma -> approved con il saldo aggiornato", async () => {
    const r = await poll(requestAId, customerAToken);
    show(r);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("status approved", r.body?.status === "approved", String(r.body?.status)),
      check("stampsCount 4", r.body?.stampsCount === 4, `${r.body?.stampsCount}`),
      check("stampsRequired 10", r.body?.stampsRequired === 10, `${r.body?.stampsRequired}`),
    ];
  });

  await test("doppia conferma -> 409 e nessun evento in più", async () => {
    const before = (await eventsOf(requestAId)).length;
    const r = await confirm(venueA, requestAId, staffAToken, { stamps: 15 });
    show(r);
    const after = (await eventsOf(requestAId)).length;
    const card = await cardOf(customerAId, venueA);
    return [
      check("status 409", is409(r), `status=${r.status}`),
      check("nessun evento nuovo", after === before, `${before} -> ${after}`),
      check("card invariata (4)", card?.stamps_count === 4, `${card?.stamps_count}`),
    ];
  });

  await test("validazione della quantità: 0, 51, '10', 1.5, assente -> 400", async () => {
    const bodies: unknown[] = [{ stamps: 0 }, { stamps: 51 }, { stamps: "10" }, { stamps: 1.5 }, {}];
    const results = await Promise.all(bodies.map((b) => confirm(venueA, requestAId, staffAToken, b)));
    results.forEach((r) => show(r));
    return [check("tutti 400", results.every((r) => r.status === 400), results.map((r) => r.status).join(","))];
  });

  // ---------- rifiuto ----------
  await test("rifiuto -> 200 rejected, resolved_by = operatore, nessun evento", async () => {
    const v = await visit(venueA, customerAToken);
    rejectedRequestId = v.body?.requestId ?? "";
    const r = await reject(venueA, rejectedRequestId, staffAToken);
    show(r);
    const state = await requestState(rejectedRequestId);
    const events = await eventsOf(rejectedRequestId);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("status rejected", r.body?.status === "rejected", String(r.body?.status)),
      check("DB: rejected", state?.status === "rejected", String(state?.status)),
      check("DB: resolved_by = staff", state?.resolved_by === staffAId),
      check("nessun evento", events.length === 0, `${events.length}`),
    ];
  });

  await test("conferma dopo un rifiuto -> 409 e nessun evento", async () => {
    const r = await confirm(venueA, rejectedRequestId, staffAToken, { stamps: 5 });
    show(r);
    return [
      check("status 409", is409(r), `status=${r.status}`),
      check("nessun evento", (await eventsOf(rejectedRequestId)).length === 0),
    ];
  });

  // ---------- scadenza ----------
  await test("richiesta scaduta: la coda la scarta, la conferma dà 409 e non scrive eventi", async () => {
    const v = await visit(venueA, customerAToken);
    const requestId = v.body?.requestId ?? "";
    await pool.query(`UPDATE stamp_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [
      requestId,
    ]);

    const q = await queue(venueA, staffAToken);
    const visible = (q.body?.requests ?? []).some((x: any) => x.requestId === requestId);
    const stateAfterQueue = await requestState(requestId);

    const r = await confirm(venueA, requestId, staffAToken, { stamps: 5 });
    show(r);
    const events = await eventsOf(requestId);

    return [
      check("assente dalla coda", visible === false),
      check("DB: la coda l'ha portata a expired", stateAfterQueue?.status === "expired", String(stateAfterQueue?.status)),
      check("conferma 409", is409(r), `status=${r.status}`),
      check("nessun evento", events.length === 0, `${events.length}`),
    ];
  });

  // ---------- cross-venue ----------
  await test("richiesta di un altro locale -> 404, resta pending (nessuna scrittura)", async () => {
    const r = await confirm(venueA, requestBId, multiToken, { stamps: 5 });
    show(r);
    const state = await requestState(requestBId);
    return [
      check("status 404", is404(r), `status=${r.status}`),
      check("richiesta di B ancora pending", state?.status === "pending", String(state?.status)),
    ];
  });

  // ---------- promozione della card non più attiva ----------
  await test("card su una promozione vecchia -> 409, richiesta resta pending, nessun evento", async () => {
    const promo = await pool.query(
      `INSERT INTO promotions (venue_id, type, name, config, starts_at, ends_at)
       VALUES ($1, 'stamps', 'Vecchia promozione', $2::jsonb, now() - interval '90 days', now() - interval '60 days')
       RETURNING id`,
      [venueA, JSON.stringify({ v: 1, stampsRequired: 10, reward: "Premio vecchio" })],
    );
    const oldPromotionId = promo.rows[0].id;
    usedPromotionIds.push(oldPromotionId);

    const oldUserId = await createUser(track(mail("old-promo")));
    const publicCode = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
    const card = await pool.query(
      `INSERT INTO cards (user_id, venue_id, promotion_id, stamps_count, public_code, wallet_provider, wallet_object_id, wallet_status)
       VALUES ($1, $2, $3, 3, $4, 'google', $5, 'not_added') RETURNING id`,
      [oldUserId, venueA, oldPromotionId, publicCode, `${process.env.WALLET_ISSUER_ID}.${crypto.randomUUID()}`],
    );
    const requestId = await insertPendingRequest(card.rows[0].id, venueA);

    const r = await confirm(venueA, requestId, staffAToken, { stamps: 5 });
    show(r);
    const state = await requestState(requestId);
    const events = await eventsOf(requestId);
    const cardAfter = await pool.query(`SELECT stamps_count FROM cards WHERE id = $1`, [card.rows[0].id]);

    return [
      check("status 409", is409(r), `status=${r.status}`),
      check("richiesta resta pending (rollback)", state?.status === "pending", String(state?.status)),
      check("nessun evento", events.length === 0, `${events.length}`),
      check("card invariata (3)", cardAfter.rows[0].stamps_count === 3, `${cardAfter.rows[0].stamps_count}`),
    ];
  });

  // ---------- owner ----------
  await test("conferma da un owner -> 200 (owner e staff hanno lo stesso potere)", async () => {
    await visit(venueA, customerCToken);
    const v = await visit(venueA, customerCToken);
    const requestId = v.body?.requestId ?? "";
    // 11 prodotti da 0: 10 timbri + il prodotto 11 gratis -> card 0, 1 premio
    const r = await confirm(venueA, requestId, ownerAToken, { stamps: 11 });
    show(r);
    const card = await cardOf(customerCId, venueA);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("saldo 0 dopo il premio", r.body?.stampsCount === 0, `${r.body?.stampsCount}`),
      check("1 premio", r.body?.rewards === 1, `${r.body?.rewards}`),
      check("DB: card a 0", card?.stamps_count === 0, `${card?.stamps_count}`),
    ];
  });

  // ---------- soglia esatta e premio consumato al prodotto successivo ----------
  await test("quantità 10 esatta -> card piena 10/10, nessun premio consumato", async () => {
    await visit(venueA, customerDToken); // crea la card
    const v = await visit(venueA, customerDToken);
    const requestId = v.body?.requestId ?? "";
    const r = await confirm(venueA, requestId, staffAToken, { stamps: 10 });
    show(r);
    const events = await eventsOf(requestId);
    const card = await cardOf(customerDId, venueA);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("saldo 10 (card piena)", r.body?.stampsCount === 10, `${r.body?.stampsCount}`),
      check("0 premi consumati", r.body?.rewards === 0, `${r.body?.rewards}`),
      check("DB: card a 10", card?.stamps_count === 10, `${card?.stamps_count}`),
      check("DB: 1 solo evento stamp 10", events.length === 1 && events[0].type === "stamp" && events[0].quantity === 10),
    ];
  });

  await test("card piena: il prodotto successivo è gratis -> 0 timbri, premio consumato", async () => {
    const v = await visit(venueA, customerDToken);
    const requestId = v.body?.requestId ?? "";
    const r = await confirm(venueA, requestId, staffAToken, { stamps: 1 });
    show(r);
    const events = await eventsOf(requestId);
    const card = await cardOf(customerDId, venueA);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("saldo 0", r.body?.stampsCount === 0, `${r.body?.stampsCount}`),
      check("1 premio consumato", r.body?.rewards === 1, `${r.body?.rewards}`),
      check("DB: card a 0", card?.stamps_count === 0, `${card?.stamps_count}`),
      check("DB: 1 solo evento redeem 1", events.length === 1 && events[0].type === "redeem" && events[0].quantity === 1),
    ];
  });

  await test("card piena + quantità 13 -> premio, 10 timbri, premio, 1 timbro: card 1/10", async () => {
    // porta la card di D di nuovo a 10 (10 prodotti, soglia esatta)
    await visit(venueA, customerDToken);
    const full = await visit(venueA, customerDToken);
    await confirm(venueA, full.body?.requestId ?? "", staffAToken, { stamps: 10 });

    const v = await visit(venueA, customerDToken);
    const requestId = v.body?.requestId ?? "";
    const r = await confirm(venueA, requestId, staffAToken, { stamps: 13 });
    show(r);
    const events = await eventsOf(requestId);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("saldo 1", r.body?.stampsCount === 1, `${r.body?.stampsCount}`),
      check("2 premi consumati", r.body?.rewards === 2, `${r.body?.rewards}`),
      check(
        "DB: tratti redeem 1 / stamp 10 / redeem 1 / stamp 1",
        events.map((e) => `${e.type}:${e.quantity}`).join(",") === "redeem:1,stamp:10,redeem:1,stamp:1",
        events.map((e) => `${e.type}:${e.quantity}`).join(","),
      ),
      check(
        "DB: timbri registrati 11 (13 prodotti - 2 premi)",
        events.filter((e) => e.type === "stamp").reduce((n, e) => n + e.quantity, 0) === 11,
      ),
    ];
  });

  // ---------- rate limit di visit ----------
  await test("rate limit: 11ª richiesta nell'ora -> 429 con Retry-After, nessuna pending creata", async () => {
    await visit(venueA, rateUserToken); // crea la card
    const card = await cardOf(rateUserId, venueA);
    await insertClosedRequests(card!.id, venueA, 10, 5);

    const r = await visit(venueA, rateUserToken);
    show(r);
    const retryAfter = Number(r.headers.get("retry-after"));
    return [
      check("status 429", r.status === 429, `status=${r.status}`),
      check("Retry-After tra 1 e 3600", retryAfter >= 1 && retryAfter <= 3600, `${retryAfter}`),
      check("nessuna pending creata", (await pendingCount(card!.id)) === 0),
      check("totale richieste invariato (10)", (await allRequestsCount(card!.id)) === 10),
    ];
  });

  await test("rate limit: un ritocco su pendente viva -> 200 e non consuma quota", async () => {
    const card = await cardOf(rateUserId, venueA);
    await insertPendingRequest(card!.id, venueA);

    const r = await visit(venueA, rateUserToken);
    show(r);
    return [
      check("status 200", r.status === 200, `status=${r.status}`),
      check("state request_pending", r.body?.state === "request_pending", String(r.body?.state)),
      check("nessuna nuova richiesta (11 totali)", (await allRequestsCount(card!.id)) === 11, `${await allRequestsCount(card!.id)}`),
    ];
  });

  // ---------- riepilogo ----------
  console.log("\n==============================");
  console.log(`Passati: ${passed}   Falliti: ${failed}`);
  failures.forEach((f) => console.log(`  - ${f}`));
}

async function cleanup() {
  try {
    const ids = (await pool.query(`SELECT id FROM users WHERE email = ANY($1)`, [usedEmails])).rows.map(
      (r) => r.id,
    );
    if (ids.length) {
      await pool.query(
        `DELETE FROM stamp_events
          WHERE card_id IN (SELECT id FROM cards WHERE user_id = ANY($1))
             OR operator_id = ANY($1)`,
        [ids],
      );
      await pool.query(`DELETE FROM stamp_requests WHERE card_id IN (SELECT id FROM cards WHERE user_id = ANY($1))`, [
        ids,
      ]);
      await pool.query(`DELETE FROM cards WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM venue_members WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM sessions WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM auth_identities WHERE user_id = ANY($1)`, [ids]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
    }
    if (usedPromotionIds.length) {
      await pool.query(`DELETE FROM promotions WHERE id = ANY($1)`, [usedPromotionIds]);
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
