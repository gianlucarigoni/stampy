import { HistoryItem } from "./requests.service";

/**
 * Riga dello storico come esce dall'API: sempre mappata a mano, mai la riga del DB, mai l'email (solo il nome del cliente, `displayName`, B39).
 * Lo stesso formato serve staff e cliente; il nome del locale lo vede solo il cliente
 * (lo staff è già dentro un locale).
 */
export function historyRow(r: HistoryItem, opts: { withVenueName?: boolean } = {}) {
  return {
    requestId: r.requestId,
    publicCode: r.publicCode,
    displayName: r.displayName,
    ...(opts.withVenueName ? { venueName: r.venueName } : {}),
    status: r.status,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    stamps: r.stamps,
    stampsAdded: r.stampsAdded,
    rewardsRedeemed: r.rewardsRedeemed,
    reward: r.reward,
  };
}
