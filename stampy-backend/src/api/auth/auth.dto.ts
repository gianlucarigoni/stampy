import { Transform } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

// Nome visualizzato: trim e spazi interni ridotti a uno, poi 3-50 caratteri tra lettere
// Unicode, cifre, spazio, apostrofo, trattino e punto. Niente < > né caratteri di controllo.
export class displayNameDTO {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().replace(/ {2,}/g, " ") : value))
  @IsString()
  @Length(3, 50)
  @Matches(/^[\p{L}\p{N} '’.\-]+$/u, { message: "Il nome contiene caratteri non ammessi" })
  displayName: string;
}
