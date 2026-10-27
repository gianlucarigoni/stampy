import { NextFunction, Response } from "express";
import { requireAuth } from "../../utils/auth-context";
import { TypedAuthRequest } from "../../utils/typed-request";
import requestsSrv from "../requests/requests.service";
import resolveSrv from "../requests/resolve.service";
import { confirmDTO, staffRequestParamsDTO } from "./staff.dto";
import { venueIdDTO } from "./venues.dto";

/** Coda delle richieste pendenti del locale dello staff (solo lettura). */
export const queue = async (
  req: TypedAuthRequest<unknown, unknown, venueIdDTO>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requests = await requestsSrv.getPendingQueue(req.params.venueId);
    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
};

/** Conferma: lo staff dice quanti prodotti sono stati consumati (premio compreso),
 *  il backend ricalcola i tratti: timbri fino alla soglia, 1 prodotto in premio, il resto. */
export const confirm = async (
  req: TypedAuthRequest<confirmDTO, unknown, staffRequestParamsDTO>,
  res: Response,
  next: NextFunction,
) => {
  try {
    // l'operatore è l'utente di sessione: mai dal body
    const operatorId = requireAuth(req).user.id;
    const { venueId, requestId } = req.params;

    const result = await resolveSrv.confirm(venueId, requestId, operatorId, req.body.stamps);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/** Rifiuto: chiude la richiesta senza toccare la card. */
export const reject = async (
  req: TypedAuthRequest<unknown, unknown, staffRequestParamsDTO>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const operatorId = requireAuth(req).user.id;
    const { venueId, requestId } = req.params;

    const result = await resolveSrv.reject(venueId, requestId, operatorId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
