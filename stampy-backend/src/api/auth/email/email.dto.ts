import { IsEmail, IsString, IsUUID, Matches } from "class-validator";

export class emailDTO {
  @IsEmail()
  email: string;
}

export class verifyDTO {
  @IsUUID()
  challengeId: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: "Formato del codice non valido" })
  code: string;
}
