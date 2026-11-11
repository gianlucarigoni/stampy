import { IsString, MaxLength, MinLength } from "class-validator";

export class googleLoginDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  idToken: string;
}
