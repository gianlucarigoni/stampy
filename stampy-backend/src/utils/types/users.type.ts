export type User = {
  id: string;
  email: string | null;
  displayName: string | null;
  isPlatformAdmin: boolean;
  anonymizedAt: Date | null;
  createdAt: Date;
};
