import { NextFunction, Response } from "express";
import { requireAuth } from "../../utils/auth-context";
import { TypedAuthRequest } from "../../utils/typed-request";
import { requestIdDTO } from "./requests.dto";
import requestsSrv from "./requests.service";
import { RequestNotFoundError } from "../../errors/request-not-found.error";

export const find = async (
  req: TypedAuthRequest<unknown, unknown, requestIdDTO>,
  res: Response,
  next: NextFunction,
) => {
  // L'utente viene dalla sessione: la richiesta deve appartenere a una sua card.
  const userId = requireAuth(req).user.id;
  const requestId = req.params.requestId;
  try {
    const refresh = await requestsSrv.refreshStatus(requestId, userId);
    if (refresh) {
      res.status(200).json({ status: refresh.status, expiresAt: refresh.expiresAt });
      return;
    }

    const request = await requestsSrv.getRequestById(requestId, userId);
    if (!request) throw new RequestNotFoundError();

    res.status(200).json({ status: request.status, expiresAt: request.expiresAt });
  } catch (err) {
    next(err);
  }
};
