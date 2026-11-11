import { OAuth2Client } from "google-auth-library";
import { env } from "../../../config/env";
import { GenericError } from "../../../errors/generic";
import { InvalidGoogleTokenError } from "../../../errors/invalid-google-token.error";

export type GoogleClaims = { sub: string; email: string; emailVerified: boolean; hd?: string };

type Verifier = Pick<OAuth2Client, "verifyIdToken">;

export class GoogleTokenService {
  constructor(
    private readonly client: Verifier,
    private readonly clientId: string | undefined,
  ) {}

  /** Verifica firma, audience, issuer e scadenza (google-auth-library) e restituisce solo i claim che servono. */
  async verify(idToken: string): Promise<GoogleClaims> {
    if (!this.clientId) throw new GenericError("Login con Google non disponibile", 503);

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      payload = ticket.getPayload();
    } catch {
      throw new InvalidGoogleTokenError();
    }
    if (!payload?.sub || !payload.email) throw new InvalidGoogleTokenError();

    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: payload.email_verified === true,
      hd: payload.hd || undefined,
    };
  }
}

export default new GoogleTokenService(new OAuth2Client(), env.GOOGLE_CLIENT_ID);
