import { Branding } from "../schemas/branding.schema";

export type Venue = {
  id: string;
  name: string;
  slug: string;
  branding: Branding;
  archivedAt: Date | null;
  createdAt: Date;
};

