export type Promotion = {
  id: string;
  venueId: string;
  type: "stamps";
  name: string;
  config: unknown;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
};
