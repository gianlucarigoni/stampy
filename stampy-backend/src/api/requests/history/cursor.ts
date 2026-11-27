/**
 * Cursore dello storico: opaco per il client, `<direzione>.<base64url([createdAt, id])>`.
 * `n` = pagina successiva (più vecchia del bordo), `p` = pagina precedente (più recente).
 * `createdAt` è il testo UTC del DB con i microsecondi: un `Date` di JS li perderebbe e farebbe
 * saltare o ripetere righe. Il cursore non porta lo scope: scope e filtri si applicano sempre in SQL.
 */
export type CursorDirection = "n" | "p";
export type Cursor = { direction: CursorDirection; createdAt: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

export function encodeCursor(c: Cursor): string {
  return `${c.direction}.${Buffer.from(JSON.stringify([c.createdAt, c.id])).toString("base64url")}`;
}

/** Restituisce `null` se il cursore non è ben formato (il DTO risponde 400). */
export function decodeCursor(raw: unknown): Cursor | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  const m = /^([np])\.([A-Za-z0-9_-]+)$/.exec(raw);
  if (!m) return null;
  try {
    const parsed = JSON.parse(Buffer.from(m[2], "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    const [createdAt, id] = parsed;
    if (typeof createdAt !== "string" || !TIMESTAMP.test(createdAt) || Number.isNaN(Date.parse(createdAt))) return null;
    if (typeof id !== "string" || !UUID.test(id)) return null;
    return { direction: m[1] as CursorDirection, createdAt, id };
  } catch {
    return null;
  }
}
