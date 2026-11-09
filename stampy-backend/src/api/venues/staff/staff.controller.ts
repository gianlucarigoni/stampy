import { NextFunction, Response } from "express";
import { requireAuth } from "../../../utils/auth-context";
import { TypedAuthRequest } from "../../../utils/typed-request";
import { historyRow } from "../../requests/history.mapper";
import requestsSrv from "../../requests/requests.service";
import resolveSrv from "../../requests/resolve/resolve.service";
import { confirmDTO, historyQueryDTO, staffRequestParamsDTO } from "./staff.dto";
import { venueIdDTO } from "../venues.dto";
import walletSrv from "../../wallet/wallet.service";
import venuesSrv from "../venues.service";
import cardsSrv from "../../cards/cards.service";

/**
 * Aggiorna il pass Google dopo il commit della conferma. Best effort: il DB è la fonte di
 * verità e il Wallet una vista derivata, quindi qualunque errore (pass non ancora salvato,
 * Google down, timeout) è solo loggato e non fa fallire la risposta allo staff.
 * Nel log solo cardId e status/codice: niente dati personali, token o payload.
 */
async function syncWalletPass(venueId: string, cardId: string) {
  try {
    // la promozione è quella scritta sulla card dal commit (non la "attiva" riletta adesso):
    // così il pass non può divergere dal DB se la promozione cambia tra commit e sync
    const [venue, card] = await Promise.all([venuesSrv.getVenueById(venueId), cardsSrv.getCardById(cardId)]);
    const promotion = card ? await venuesSrv.getPromotionById(venueId, card.promotionId) : null;
    if (!venue || !promotion || !card) {
      console.warn(`[wallet] sync saltata: dati mancanti (card ${cardId})`);
      return;
    }
    await walletSrv.updateCard(card, promotion, venue);
  } catch (err: any) {
    console.warn(
      `[wallet] aggiornamento pass fallito (card ${cardId}): ${err?.response?.status ?? err?.code ?? "errore"}`,
    );
  }
}

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

/** Storico delle richieste del locale con filtri opzionali (solo lettura, mai l'email). */
export const history = async (
  req: TypedAuthRequest<unknown, historyQueryDTO, venueIdDTO>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const items = await requestsSrv.getHistory({ venueId: req.params.venueId }, req.query);
    res.status(200).json({ requests: items.map((r) => historyRow(r)) });
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

    const { cardId, ...result } = await resolveSrv.confirm(
      venueId,
      requestId,
      operatorId,
      req.body.stamps,
    );

    await syncWalletPass(venueId, cardId);

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
