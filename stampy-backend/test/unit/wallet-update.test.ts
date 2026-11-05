import { afterEach, beforeEach, describe, expect, it } from "vitest";
import walletSrv from "../../src/api/wallet/wallet.service";
import type { Card, Promotion, Venue } from "../../src/db/types";

// GoogleWalletService.updateCard con client HTTP finto: nessuna chiamata a Google.
// Serve .env (service account) solo per costruire il servizio.

const cardId = "11111111-1111-1111-1111-111111111111";
const card = {
  id: cardId,
  walletObjectId: walletSrv.buildObjectId(cardId),
  publicCode: "ABCD2345",
  stampsCount: 4,
} as Card;
const promotion = { config: { v: 1, stampsRequired: 10, reward: "Caffè gratis" } } as unknown as Promotion;
const venue = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Bar Test",
  branding: { logoUrl: "https://example.com/l.png", backgroundColor: "#112233" },
} as unknown as Venue;

const svc = walletSrv as any;
let realAuth: unknown;
let calls: any[];

beforeEach(() => {
  realAuth = svc.auth;
  calls = [];
});
afterEach(() => {
  svc.auth = realAuth;
});

describe("GoogleWalletService.updateCard", () => {
  describe("richiesta REST", () => {
    beforeEach(async () => {
      svc.auth = { request: async (opts: any) => (calls.push(opts), { status: 200 }) };
      await walletSrv.updateCard(card, promotion, venue);
    });

    it("fa una sola chiamata PATCH sul loyaltyObject della card (id codificato)", () => {
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe("PATCH");
      expect(calls[0].url.endsWith(`/loyaltyObject/${encodeURIComponent(card.walletObjectId)}`)).toBe(true);
    });

    it("invia saldo = stamps_count e tre moduli di testo, con user_progress allineato", () => {
      const { data } = calls[0];
      expect(data.loyaltyPoints.balance.int).toBe(4);
      expect(data.textModulesData).toHaveLength(3);
      expect(data.textModulesData.find((m: any) => m.id === "user_progress").body).toBe("4/10 timbri raccolti");
    });

    it("non manda id/classId/state/barcode né notifyPreference (aggiornamento silenzioso)", () => {
      const { data } = calls[0];
      for (const k of ["id", "classId", "state", "barcode", "notifyPreference"]) expect(data).not.toHaveProperty(k);
    });

    it("imposta timeout e retry anche per PATCH", () => {
      expect(calls[0].timeout).toBeGreaterThan(0);
      expect(calls[0].retryConfig.retry).toBeGreaterThan(0);
      expect(calls[0].retryConfig.httpMethodsToRetry).toContain("PATCH");
    });
  });

  it("propaga l'errore di Google al chiamante (che lo logga e lo ignora)", async () => {
    svc.auth = {
      request: async () => {
        throw Object.assign(new Error("not found"), { response: { status: 404 } });
      },
    };
    await expect(walletSrv.updateCard(card, promotion, venue)).rejects.toThrow();
  });
});
