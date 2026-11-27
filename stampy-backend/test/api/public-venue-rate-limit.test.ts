/**
 * B32: limiter per IP dell'endpoint pubblico del nome del locale, con secchio proprio
 * (separato da quello di /auth/email/*). Il limiter si decide all'import: IP_RATE_LIMIT=on
 * va impostato prima di caricare l'app.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.hoisted(() => {
  process.env.IP_RATE_LIMIT = "on";
});

import { request, startServer } from "../helpers/server";
import { IP_PUBLIC_RATE_LIMIT_MAX } from "../../src/utils/middlewares/ip-rate-limit.middleware";

let baseUrl: string;
let stop: () => Promise<void>;
const get = () => request(baseUrl, `/api/public/venues/${randomUUID()}`);

beforeAll(async () => {
  ({ baseUrl, close: stop } = await startServer());
});
afterAll(async () => {
  await stop();
});

describe("rate limit per IP di GET /api/public/venues/:venueId", () => {
  it("oltre il limite → 429 TryLaterError con Retry-After; il secchio di /auth/email/* resta libero", async () => {
    for (let i = 0; i < IP_PUBLIC_RATE_LIMIT_MAX; i++) expect((await get()).status).toBe(404);

    const blocked = await get();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("TryLaterError");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);

    // secchio separato: /auth/email/request risponde 400 (body vuoto), non 429
    const auth = await request(baseUrl, "/api/auth/email/request", { method: "POST", body: {} });
    expect(auth.status).not.toBe(429);
  });
});
