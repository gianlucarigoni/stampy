import { IsUUID } from "class-validator";

export class AddGoogleCardDTO {
  @IsUUID()
  venueId: string;

  @IsUUID()
  userId: string;
}
