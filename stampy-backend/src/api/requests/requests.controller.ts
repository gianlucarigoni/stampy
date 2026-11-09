import { NextFunction, Response } from "express";
import { requireAuth } from "../../utils/auth-context";
import { TypedAuthRequest } from "../../utils/typed-request";
import { historyQueryDTO } from "../venues/staff/staff.dto";
import { historyRow } from "./history.mapper";
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
    // scadenza lazy (solo da pending); poi una sola lettura con il saldo della card
    await requestsSrv.refreshStatus(requestId, userId);

    const request = await requestsSrv.getRequestByUserId(requestId, userId);
    if (!request) throw new RequestNotFoundError();

    res.status(200).json({
      status: request.status,
      publicCode: request.publicCode, // il cliente può dirlo allo staff durante la verifica
      expiresAt: request.expiresAt,
      stampsCount: request.stampsCount,
      stampsRequired: request.stampsRequired,
      promotionChanged: request.promotionChanged,
      // solo `approved`; negli altri stati i tre campi sono assenti
      ...(request.outcome ?? {}),
    });
  } catch (err) {
    next(err);
  }
};

/** Storico del cliente loggato: le sue richieste in tutti i locali (stessi filtri dello staff). */
export const mine = async (req: TypedAuthRequest<unknown, historyQueryDTO>, res: Response, next: NextFunction) => {
  try {
    const items = await requestsSrv.getHistory({ userId: requireAuth(req).user.id }, req.query);
    res.status(200).json({ requests: items.map((r) => historyRow(r, { withVenueName: true })) });
  } catch (err) {
    next(err);
  }
};
