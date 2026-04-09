import { z } from "zod";

/** Server-side only: trusted callers (actions, jobs) set provenance; forms use .strict() and omit this. */
export const entrySourceTypeSchema = z.enum(["manual", "ai_capture"]);

export const entrySourceMetadataSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional();

/** Use when validating trusted ingestion payloads before calling `lib/services/*`. */
export const entryProvenanceSchema = z.object({
  source_type: entrySourceTypeSchema.default("manual"),
  source_metadata: entrySourceMetadataSchema,
});

export type EntryProvenanceInput = z.infer<typeof entryProvenanceSchema>;
