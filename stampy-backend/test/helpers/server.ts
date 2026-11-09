import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import app from "../../src/app";

if (process.env.NODE_ENV === "production") {
  throw new Error("Rifiuto di girare con NODE_ENV=production");
}

export type Res = { status: number; body: any; cookies: string[]; headers: Headers };

/** Avvia l'app in-process su una porta libera: non serve `npm run dev`. */
export async function startServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

export const COOKIE_NAME = "sid";

export type ReqOpts = { method?: string; cookie?: string; body?: unknown; headers?: Record<string, string> };

/** Chiamata HTTP all'app di test. `cookie` è il valore del cookie di sessione (non l'intera riga). */
export async function request(baseUrl: string, path: string, opts: ReqOpts = {}): Promise<Res> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.cookie !== undefined) headers.Cookie = `${COOKIE_NAME}=${opts.cookie}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(baseUrl + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: r.status, body: parsed, cookies: r.headers.getSetCookie(), headers: r.headers };
}

export const postJson = (baseUrl: string, path: string, body: unknown) =>
  request(baseUrl, path, { method: "POST", body });

export const cookieToken = (r: Res): string | null => {
  const c = r.cookies.find((x) => x.startsWith(`${COOKIE_NAME}=`));
  return c ? c.split(";")[0].slice(COOKIE_NAME.length + 1) : null;
};
