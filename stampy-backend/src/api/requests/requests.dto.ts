import { IsUUID } from "class-validator";

export class requestIdDTO {
  @IsUUID()
  requestId: string;
}
