export type User = {
  id: string;
  phoneCountryCode: string | null;
  phoneNationalNumber: string | null;
  phoneVerifiedAt: Date | null;
  displayName: string | null;
  isPlatformAdmin: boolean;
  anonymizedAt: Date | null;
  createdAt: Date;
};
