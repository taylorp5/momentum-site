import type { DistributionPlatform, ProjectStatus } from "@/types/momentum";
import { PLATFORM_CONFIG } from "@/lib/platform-config";

export const MOCK_USER_ID = "00000000-0000-4000-8000-000000000001";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Idea",
  building: "Building",
  launched: "Launched",
  paused: "Paused",
};

export const DISTRIBUTION_PLATFORM_LABELS: Record<DistributionPlatform, string> =
  Object.fromEntries(
    Object.entries(PLATFORM_CONFIG).map(([platform, cfg]) => [platform, cfg.label])
  ) as Record<DistributionPlatform, string>;

export const TIMELINE_BUCKET = "timeline-images";

/** Snapshot uploads: keep aligned with Supabase storage policies. */
export const TIMELINE_SNAPSHOT_MAX_BYTES = 5 * 1024 * 1024;
export const TIMELINE_SNAPSHOT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif" as const;

export const DISTRIBUTION_ATTACHMENTS_BUCKET = "distribution-attachments";
export const DISTRIBUTION_ATTACHMENT_MAX_BYTES = 6 * 1024 * 1024;
export const DISTRIBUTION_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif" as const;
