import { describe, expect, it, vi } from "vitest";
import { GoogleTokenService } from "../../src/api/auth/google/google-token.service";
import { InvalidGoogleTokenError } from "../../src/errors/invalid-google-token.error";
import { GenericError } from "../../src/errors/generic";

const CLIENT_ID = "client-di-prova.apps.googleusercontent.com";

// Il client di google-auth-library è iniettato: qui non si chiama mai Google.
const makeClient = (payload: unknown) => ({
  verifyIdToken: vi.fn().mockResolvedValue({ getPayload: () => payload }),
});
const asClient = (c: unknown) => c as ConstructorParameters<typeof GoogleTokenService>[0];

describe("GoogleTokenService.verify", () => {
  it("chiama verifyIdToken con audience = GOOGLE_CLIENT_ID", async () => {
    const client = makeClient({ sub: "123", email: "a@gmail.com", email_verified: true });
    await new GoogleTokenService(asClient(client), CLIENT_ID).verify("tok");
    expect(client.verifyIdToken).toHaveBeenCalledWith({ idToken: "tok", audience: CLIENT_ID });
  });

  it("restituisce sub, email normalizzata (minuscola, trim), emailVerified e hd", async () => {
    const client = makeClient({ sub: "123", email: " Anna@Azienda.IT ", email_verified: true, hd: "azienda.it" });
    const claims = await new GoogleTokenService(asClient(client), CLIENT_ID).verify("tok");
    expect(claims).toEqual({ sub: "123", email: "anna@azienda.it", emailVerified: true, hd: "azienda.it" });
  });

  it("payload senza sub o senza email → InvalidGoogleTokenError", async () => {
    for (const payload of [{ email: "a@gmail.com", email_verified: true }, { sub: "123", email_verified: true }]) {
      const svc = new GoogleTokenService(asClient(makeClient(payload)), CLIENT_ID);
      await expect(svc.verify("tok")).rejects.toBeInstanceOf(InvalidGoogleTokenError);
    }
  });

  it("errore della libreria (firma, exp, aud) → InvalidGoogleTokenError senza il messaggio interno", async () => {
    const client = { verifyIdToken: vi.fn().mockRejectedValue(new Error("Wrong recipient, payload audience != requiredAudience")) };
    const err = await new GoogleTokenService(asClient(client), CLIENT_ID).verify("tok").catch((e: any) => e);
    expect(err).toBeInstanceOf(InvalidGoogleTokenError);
    expect(String(err.message)).not.toContain("audience");
  });

  // Aggiunto rispetto alla proposta approvata (assunzione 3: 503 se manca GOOGLE_CLIENT_ID).
  it("senza GOOGLE_CLIENT_ID → GenericError 503, senza chiamare la libreria", async () => {
    const client = makeClient({ sub: "123", email: "a@gmail.com", email_verified: true });
    const err = await new GoogleTokenService(asClient(client), undefined).verify("tok").catch((e: any) => e);
    expect(err).toBeInstanceOf(GenericError);
    expect(err.statusCode).toBe(503);
    expect(client.verifyIdToken).not.toHaveBeenCalled();
  });
});
