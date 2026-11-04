import { Transform } from "class-transformer";
import {
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { requestStatus } from "../../../db/schema";

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

// Query-string values arrive as text: `Transform` (no reflect-metadata needed) makes them numbers;
// "abc" becomes NaN and fails @IsInt, "" becomes 0 and fails @Min.

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

// `from` must not be later than `to`. A bare `to` date means "until the end of that UTC day".
// Runs only when both values are present; each is validated as ISO 8601 by its own decorator.
@ValidatorConstraint({ name: "fromNotAfterTo", async: false })
class FromNotAfterTo implements ValidatorConstraintInterface {
  validate(to: unknown, args: ValidationArguments) {
    const from = (args.object as historyQueryDTO).from;
    if (typeof from !== "string" || typeof to !== "string") return true;
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to) + (BARE_DATE.test(to) ? 24 * 60 * 60 * 1000 - 1 : 0);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return true; // reported by @IsISO8601
    return fromMs <= toMs;
  }
  defaultMessage() {
    return "`from` must not be later than `to`";
  }
}

// Filtri opzionali dello storico richieste. Tutti facoltativi; senza filtri = tutto lo storico
// (nessun limit/offset: la risposta contiene tutte le righe che combaciano).
// `from`/`to`: data (YYYY-MM-DD, interpretata in UTC; `to` incluso fino a fine giornata) oppure
// istante ISO 8601 completo. Si filtra su `created_at` (quando il cliente ha fatto la richiesta).
export class historyQueryDTO {
  @IsOptional()
  @IsIn(requestStatus.enumValues)
  status?: (typeof requestStatus.enumValues)[number];

  // timbri confermati (premio compreso): solo le richieste `approved` ne hanno
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_STAMPS_PER_CONFIRM)
  minStamps?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_STAMPS_PER_CONFIRM)
  maxStamps?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Validate(FromNotAfterTo)
  to?: string;
}
