import { IsUUID } from "class-validator";

export class userIdDTO {
    @IsUUID()
    userId: string;
}

export class venueIdDTO {
    @IsUUID()
    venueId: string;
}