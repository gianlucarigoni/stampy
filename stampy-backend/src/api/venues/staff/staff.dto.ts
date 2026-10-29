import { IsInt, IsUUID, Max, Min } from "class-validator";

// Tetto per singola conferma: evita che un errore di digitazione (500 invece di 50)
// gonfi la card e sblocchi premi a raffica. 50 copre un tavolo grande.
export const MAX_STAMPS_PER_CONFIRM = 50;

// Params delle rotte staff: il venueId è solo un selettore, il ruolo autorevole
// viene da venue_members (requireRole); il requestId deve appartenere a quel locale.
export class staffRequestParamsDTO {
  @IsUUID()
  venueId: string;

  @IsUUID()
  requestId: string;
}

export class confirmDTO {
  // QUANTI PRODOTTI sono stati consumati, premio compreso: il backend li scompone in
  // timbri e premi (es. 15 con soglia 10 da 0 -> 10 timbri, 1 premio, 4 timbri).
  // Il nome `stamps` è quello approvato nella fase 4d; il valore è la quantità totale.
  // Numero vero, non stringa: niente coercizione implicita (Number("") vale 0).
  @IsInt()
  @Min(1)
  @Max(MAX_STAMPS_PER_CONFIRM)
  stamps: number;
}
