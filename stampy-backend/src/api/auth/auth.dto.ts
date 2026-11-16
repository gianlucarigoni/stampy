import { Transform } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

// Nome visualizzato: normalizzato NFC, trim e spazi interni ridotti a uno, poi 3-50 caratteri tra
// lettere Unicode, segni combinanti, cifre, spazio, apostrofo, trattino e punto, con almeno una
// lettera. Niente < > né caratteri di controllo.
export class displayNameDTO {
  @Transform(({ value }) => (typeof value === "string" ? value.normalize("NFC").trim().replace(/ {2,}/g, " ") : value))
  @IsString()
  @Length(3, 50)
  @Matches(/^(?=.*\p{L})[\p{L}\p{M}\p{N} '’.\-]+$/u, { message: "Il nome contiene caratteri non ammessi" })
  displayName: string;
}
