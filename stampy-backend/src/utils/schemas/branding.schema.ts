import { z } from "zod";

export const brandingSchema = z
  .object({
    v: z.literal(1),
    logoUrl: z.string().url(),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bannerUrl: z.string().url().optional(),
  })
  .strict();

export type Branding = z.infer<typeof brandingSchema>;
