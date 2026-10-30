import { NextFunction, Response } from "express";
import { TypedRequest } from "../../../utils/typed-request";
import { emailDTO, verifyDTO } from "./email.dto";
import otpSrv, { MAX_OTP_ATTEMPTS } from "../otp/otp.service";
import identitySrv from "../identity/identity.service";
import sessionSrv, {
  SESSION_ABSOLUTE_TTL_DAYS,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../session/session.service";
import authEventsSrv from "../auth-events/auth-events.service";
import { db } from "../../../db";
import { TryLaterError } from "../../../errors/try-later.error";
import { GenericError } from "../../../errors/generic";
import { emailSender } from "../../../utils/email/email-sender";

// stessa risposta per codice errato, scaduto, usato, inesistente o tentativi esauriti
const invalidCode = () => new GenericError("Codice non valido o scaduto", 400);

export const request = async (req: TypedRequest<emailDTO>, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email.trim().toLowerCase();

    const result = await otpSrv.createChallenge("email", email);
    if (!result.ok) {
      throw new TryLaterError(result.retryAfterSeconds);
    }

    try {
      await emailSender.sendOtp(email, result.code);
    } catch {
      throw new GenericError("Impossibile inviare il codice, riprova", 503);
    }

    res.status(202).json({ challengeId: result.challenge.id });
  } catch (err) {
    next(err);
  }
};

export const verify = async (req: TypedRequest<verifyDTO>, res: Response, next: NextFunction) => {
  try {
    const { challengeId, code } = req.body;

    // 1) tentativo contato in modo atomico, FUORI dalla transazione: resta anche se il resto fallisce
    const attempt = await otpSrv.registerAttempt(challengeId);
    if (!attempt) throw invalidCode();

    // 2) codice errato: evento, invalidazione all'ultimo tentativo, errore generico
    if (!otpSrv.checkCode(challengeId, code, attempt.codeHash)) {
      await authEventsSrv.log("otp_failed", {
        email: attempt.destination,
        provider: "email",
        metadata: { attempts: attempt.attempts },
      });
      if (attempt.attempts >= MAX_OTP_ATTEMPTS) await otpSrv.invalidateChallenge(challengeId);
      throw invalidCode();
    }

    // 3) codice giusto: consumo + utente + identità + sessione + eventi in UNA transazione
    const userAgent = req.get("user-agent")?.slice(0, 255) ?? null;

    const { user, token } = await db.transaction(async (tx) => {
      const consumed = await otpSrv.consumeChallenge(challengeId, tx);
      if (!consumed) throw invalidCode(); // un'altra richiesta l'ha già usata

      const login = await identitySrv.loginWithEmail(consumed.destination, tx);
      if (!login) throw invalidCode(); // anonimizzato o identità incoerente: stessa risposta

      const { token } = await sessionSrv.create(login.user.id, "email", userAgent, tx);

      const base = { email: consumed.destination, userId: login.user.id, provider: "email" as const };
      await authEventsSrv.log("otp_verified", base, tx);
      if (login.linked) await authEventsSrv.log("identity_linked", base, tx);
      await authEventsSrv.log("login_success", base, tx);

      return { user: login.user, token };
    });

    // 4) cookie dopo il commit; il token non va mai nel body
    res.cookie(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions(),
      // il cookie vive quanto il tetto assoluto della sessione (lo scorrimento non lo rinnova)
      maxAge: SESSION_ABSOLUTE_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (err) {
    next(err);
  }
};
