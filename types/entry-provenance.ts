/**
 * Shared provenance for user-authored content tables.
 * Extend via SQL enum migration before adding new literals here.
 */
export type EntrySourceType = "manual" | "ai_capture";

/** Opaque JSON for ingestion jobs (e.g. capture id, model run, storage paths). */
export type EntrySourceMetadata = Record<string, unknown> | null;
