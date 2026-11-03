import { IsIn, IsOptional, IsUUID } from "class-validator";

export class venueIdDTO {
    @IsUUID()
    venueId: string;
}

export class visitQueryDTO {
    // "1" = the customer tapped "Richiedi il timbro": open a stamp request even if the card
    // has not been added to the wallet. Without it, a not_added card gets the wallet screen.
    @IsOptional()
    @IsIn(["1"])
    requestStamp?: string;
}
