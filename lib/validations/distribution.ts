import { z } from "zod";

export const distributionPlatformSchema = z.enum([
  "reddit",
  "tiktok",
  "twitter",
  "linkedin",
  "product_hunt",
  "instagram",
  "youtube",
  "other",
]);

/** Form payload only; provenance is set server-side (see `lib/services/distribution-entries`). */
export const createDistributionEntrySchema = z
  .object({
    project_id: z.string().uuid(),
    platform: distributionPlatformSchema,
    title: z.string().max(200).optional().nullable(),
    url: z.union([z.string().url(), z.literal("")]).default(""),
    notes: z.string().max(5000).optional().default(""),
    date_posted: z.string().min(1),
  })
  .strict();

export type CreateDistributionEntryInput = z.infer<
  typeof createDistributionEntrySchema
>;
