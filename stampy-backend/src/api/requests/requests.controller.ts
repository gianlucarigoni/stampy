import { NextFunction, Response } from "express";
import { TypedRequest } from "../../utils/typed-request";
import { requestIdDTO } from "./requests.dto";
import requestsSrv from "./requests.service";
import { RequestNotFoundError } from "../../errors/request-not-found.error";

export const find = async (req: TypedRequest<unknown, unknown, requestIdDTO>, res: Response, next: NextFunction) => {
  const requestId = req.params.requestId;
  try {
    const refresh = await requestsSrv.refreshStatus(requestId);
    if (refresh) {
      res.status(200).json({ status: refresh.status, expiresAt: refresh.expiresAt });
      return;
    }

    const request = await requestsSrv.getRequestById(requestId);
    if (!request) throw new RequestNotFoundError();

    res.status(200).json({ status: request.status, expiresAt: request.expiresAt });
  } catch (err) {
    next(err);
  }
};
