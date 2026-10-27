/**
 * Regola dei timbri (modello `stamps` v1 — l'unico promozionale del MVP).
 *
 * Lo staff inserisce **quanti prodotti sono stati consumati**, premio compreso.
 * Il sistema li scompone: ogni prodotto è un timbro, tranne quello gratuito che
 * si ottiene al raggiungimento della soglia. Il prodotto in premio **consuma una
 * unità della quantità**: non è un timbro e non fa ripartire il conteggio "a
 * gratise".
 *
 * Esempio (soglia 10, card 0, quantità 15):
 *   prodotti 1-10  → stamp 10        (card piena: premio disponibile)
 *   prodotto 11    → redeem 1        (gratis, consuma 1 della quantità)
 *   prodotti 12-15 → stamp 4
 *   → card 4/10, 1 premio consumato.
 *
 * Se la quantità finisce esattamente sulla soglia (es. 10 da 0), la card resta
 * piena (10/10) e il premio è **disponibile**: verrà consumato al primo prodotto
 * successivo, che sarà gratis.
 *
 * Funzione pura: nessun accesso al DB, nessun `now()`, nessuna dipendenza.
 * Il risultato si mappa 1:1 su `stamp_events` (un evento per tratto).
 * Quando arriveranno altri modelli promozionali servirà una funzione per tipo:
 * questa regola vale solo per `type = "stamps"`.
 */

export type StampSegmentType = "stamp" | "redeem";

export type StampSegment = {
  type: StampSegmentType;
  quantity: number;
};

export type SplitStampsResult = {
  segments: StampSegment[];
  // timbri sulla card dopo la conferma, in [0, stampsRequired]:
  // `stampsRequired` significa "card piena, premio disponibile"
  finalCount: number;
  // premi consumati in questa conferma (un evento `redeem` ciascuno)
  rewards: number;
};

export function splitStamps(
  stampsRequired: number,
  currentCount: number,
  quantity: number,
): SplitStampsResult {
  if (!Number.isInteger(stampsRequired) || stampsRequired < 1) {
    throw new Error(`stampsRequired non valido: ${stampsRequired}`);
  }
  if (!Number.isInteger(currentCount) || currentCount < 0 || currentCount > stampsRequired) {
    throw new Error(`currentCount non valido: ${currentCount} (soglia ${stampsRequired})`);
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error(`quantity non valida: ${quantity}`);
  }

  let count = currentCount;
  let remaining = quantity;
  const segments: StampSegment[] = [];
  let rewards = 0;

  while (remaining > 0) {
    // card piena: il prossimo prodotto è in premio e consuma una unità della quantità
    if (count === stampsRequired) {
      segments.push({ type: "redeem", quantity: 1 });
      count = 0;
      remaining -= 1;
      rewards += 1;
      continue;
    }

    const take = Math.min(stampsRequired - count, remaining);
    segments.push({ type: "stamp", quantity: take });
    count += take;
    remaining -= take;
  }

  return { segments, finalCount: count, rewards };
}
