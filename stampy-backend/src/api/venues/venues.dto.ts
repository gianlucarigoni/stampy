import { IsUUID } from "class-validator";

export class venueIdDTO {
    @IsUUID()
    venueId: string;
}
