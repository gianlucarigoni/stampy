import { NextFunction, Response } from "express";
import { TypedRequest } from "../../../utils/typed-request";
import { googleLoginDTO } from "./google.dto";
import googleTokenSrv from "./google-token.service";
import identitySrv from "../identity/identity.service";
import sessionSrv, {
  SESSION_ABSOLUTE_TTL_DAYS,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../session/session.service";
import authEventsSrv from "../auth-events/auth-events.service";
import { db } from "../../../db";
import { GoogleEmailRejectedError } from "../../../errors/google-email-rejected.error";

export const login = async (req: TypedRequest<googleLoginDTO>, res: Response, next: NextFunction) => {
  try {
    // 1) verifica del token (lancia InvalidGoogleToken / 503 se non configurato)
    const verified = await googleTokenSrv.verify(req.body.idToken);
    // il vincolo users_email_normalized_ck rifiuta email non normalizzate: difesa in più oltre al service
    const claims = { ...verified, email: verified.email.trim().toLowerCase() };

    // 2) utente + identità + sessione + eventi in UNA transazione
    const userAgent = req.get("user-agent")?.slice(0, 255) ?? null;

    const outcome = await db.transaction(async (tx) => {
      const result = await identitySrv.loginWithGoogle(claims, tx);
      if (result.kind !== "ok") return result;

      const { token } = await sessionSrv.create(result.user.id, "google", userAgent, tx);

      const base = { email: claims.email, userId: result.user.id, provider: "google" as const };
      if (result.linked) await authEventsSrv.log("identity_linked", base, tx);
      await authEventsSrv.log("login_success", base, tx);

      return { ...result, token };
    });

    // 3) rifiuti: l'evento si scrive solo per le email non garantite da Google (non per i dati incoerenti)
    if (outcome.kind !== "ok") {
      if (outcome.kind === "rejected") {
        await authEventsSrv.log("google_untrusted_email_rejected", { email: claims.email, provider: "google" });
      }
      throw new GoogleEmailRejectedError();
    }

    // 4) cookie dopo il commit; il token non va mai nel body
    res.cookie(SESSION_COOKIE_NAME, outcome.token, {
      ...sessionCookieOptions(),
      maxAge: SESSION_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    const { user } = outcome;
    res.status(200).json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (err) {
    next(err);
  }
};
