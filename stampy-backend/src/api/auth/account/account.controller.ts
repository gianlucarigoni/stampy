import { NextFunction, Response } from "express";
import { db } from "../../../db";
import { CodeExpiredError } from "../../../errors/code-expired.error";
import { ForbiddenError } from "../../../errors/forbidden.error";
import { GenericError } from "../../../errors/generic";
import { InvalidCodeError } from "../../../errors/invalid-code.error";
import { TryLaterError } from "../../../errors/try-later.error";
import { requireAuth } from "../../../utils/auth-context";
import { emailSender } from "../../../utils/email/email-sender";
import { TypedAuthRequest } from "../../../utils/typed-request";
import authEventsSrv from "../auth-events/auth-events.service";
import { verifyDTO } from "../email/email.dto";
import otpSrv, { MAX_OTP_ATTEMPTS } from "../otp/otp.service";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../session/session.service";
import accountSrv from "./account.service";

// Eliminazione dell'account in due passi, con conferma tramite OTP inviato all'email dell'utente
// di sessione (mai a un indirizzo preso dal client).

export const requestDeletion = async (req: TypedAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user } = requireAuth(req);
    if (!user.email || (await accountSrv.isDeletionBlocked(user.id))) throw new ForbiddenError();

    const result = await otpSrv.createChallenge("email", user.email);
    if (!result.ok) throw new TryLaterError(result.retryAfterSeconds);

    try {
      await emailSender.sendOtp(user.email, result.code);
    } catch {
      throw new GenericError("Impossibile inviare il codice, riprova", 503);
    }

    res.status(202).json({ challengeId: result.challenge.id });
  } catch (err) {
    next(err);
  }
};

export const confirmDeletion = async (req: TypedAuthRequest<verifyDTO>, res: Response, next: NextFunction) => {
  try {
    const { user } = requireAuth(req);
    const { challengeId, code } = req.body;

    const attempt = await otpSrv.registerAttempt(challengeId);
    if (!attempt) throw new CodeExpiredError();
    // la sfida deve essere per l'email di questo utente: una sfida propria non vale
    if (attempt.destination !== user.email) throw new CodeExpiredError();

    if (!otpSrv.checkCode(challengeId, code, attempt.codeHash)) {
      await authEventsSrv.log("otp_failed", {
        email: attempt.destination,
        provider: "email",
        metadata: { attempts: attempt.attempts },
      });
      if (attempt.attempts >= MAX_OTP_ATTEMPTS) await otpSrv.invalidateChallenge(challengeId);
      throw new InvalidCodeError(Math.max(0, MAX_OTP_ATTEMPTS - attempt.attempts));
    }

    await db.transaction(async (tx) => {
      const consumed = await otpSrv.consumeChallenge(challengeId, tx);
      if (!consumed) throw new CodeExpiredError();

      // ricontrollo nella transazione: tra richiesta e conferma l'utente può essere diventato staff
      if (await accountSrv.isDeletionBlocked(user.id, tx)) throw new ForbiddenError();

      await accountSrv.anonymizeUser(user.id, tx);
    });

    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
