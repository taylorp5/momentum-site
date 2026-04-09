/**
 * Types for a future screenshot → parse → (optional) review → persist pipeline.
 * Parsing/vision stays in workers or route handlers; persisted rows use
 * `lib/services/timeline-entries` and `lib/services/distribution-entries` with
 * `source_type: "ai_capture"` and `source_metadata` for job linkage.
 */

export type ScreenshotIngestionStatus = "pending" | "parsed" | "failed";

/** Shape for a future durable job row or queue message — not stored yet. */
export type ScreenshotIngestionJobStub = {
  id: string;
  project_id: string;
  user_id: string;
  /** Raw capture in storage (same bucket family as timeline snapshots or a dedicated bucket). */
  capture_storage_path: string;
  status: ScreenshotIngestionStatus;
};
