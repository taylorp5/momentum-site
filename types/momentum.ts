import type { EntrySourceMetadata, EntrySourceType } from "./entry-provenance";
import type { DistributionMetrics } from "./distribution-metrics";

export type { EntrySourceMetadata, EntrySourceType } from "./entry-provenance";
export type { DistributionMetrics } from "./distribution-metrics";

export type ProjectStatus = "idea" | "building" | "launched" | "paused";

export type TimelineEventFamily =
  | "work"
  | "build"
  | "distribution"
  | "financial"
  | "asset"
  | "insight";

/** Per-row JSON for type-specific fields (duration, metrics snapshot, etc.). */
export type TimelineEventMetadata = Record<string, unknown>;

export type TimelineEntryType =
  | "snapshot"
  | "note"
  | "link"
  | "distribution"
  | "build"
  | "insight"
  | "experiment"
  | "cost"
  | "revenue"
  | "deal"
  | "work";

export type CostBillingType = "one_time" | "monthly" | "yearly";

export type DistributionPlatform =
  | "reddit"
  | "tiktok"
  | "twitter"
  | "product_hunt"
  | "instagram"
  | "youtube"
  | "other";

export type UserPlan = "free" | "pro";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  /** free | pro — feature gating; default free. */
  plan: UserPlan;
  /** JSON: hidden dashboard widgets / insights; see lib/dashboard-preferences.ts */
  dashboard_preferences?: unknown;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  logo_url?: string | null;
  color: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
  /** Synthetic bucket for non-project expenses; hidden from main project grid. */
  is_overhead?: boolean;
};

export type WorkSessionStatus = "running" | "paused" | "completed";

export type WorkSession = {
  id: string;
  user_id: string;
  project_id: string;
  started_at: string;
  ended_at: string | null;
  last_resumed_at: string | null;
  duration_seconds: number;
  status: WorkSessionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TimelineEntry = {
  id: string;
  project_id: string;
  user_id: string;
  type: TimelineEntryType;
  /** High-level UI bucket; set on insert + backfilled for legacy rows. */
  event_family?: TimelineEventFamily | null;
  /** Fine-grained kind within `event_family` (e.g. manual_time_entry, distribution_post). */
  event_subtype?: string | null;
  /** Flexible fields; typed columns remain source of truth for queries where set. */
  event_metadata?: TimelineEventMetadata | null;
  title: string;
  description: string;
  image_url: string | null;
  external_url: string | null;
  entry_date: string;
  /** Present when `type === "distribution"`. */
  platform: DistributionPlatform | null;
  /** Present when `type === "distribution"`; optional KPIs / notes. */
  metrics: DistributionMetrics | null;
  /** When `type === "distribution"`, optional cross-post group (Pro). */
  content_group_id?: string | null;
  /** When `type === "distribution"` and platform is Reddit, optional subreddit (no `r/`). */
  subreddit?: string | null;
  /** Present when `type` is cost/revenue. */
  amount?: number | null;
  /** Present when `type === "cost"` (ads, tools, subscriptions, etc.). */
  category?: string | null;
  /** Present when `type === "cost"` to mark recurring charges. */
  is_recurring?: boolean | null;
  /** Optional recurrence descriptor when `is_recurring` is true. */
  recurrence_label?: string | null;
  /** Present when `type === "cost"`: one_time, monthly, or yearly. */
  billing_type?: CostBillingType | null;
  /** Present when `type === "cost"` and billing is monthly/yearly. */
  recurring_start_date?: string | null;
  /** Present when `type === "cost"`; optional end of subscription (inclusive). */
  recurring_end_date?: string | null;
  /** Present when `type === "cost"`; when false, rule is ignored in period totals. */
  recurring_active?: boolean | null;
  /** Present when `type === "revenue"` (subscriptions, one-time, etc.). */
  revenue_source?: string | null;
  /** Present when `type === "deal"`. */
  partner_name?: string | null;
  /** Present when `type === "deal"` as percentage value (0..100). */
  revenue_share_percentage?: number | null;
  /** When `type === "revenue"`, optional link to a `distribution` row for attribution. */
  linked_distribution_entry_id?: string | null;
  source_type: EntrySourceType;
  source_metadata: EntrySourceMetadata;
  created_at: string;
  updated_at: string;
};

/** View model for the Distribution page (backed by `timeline_entries` with `type = distribution`). */
export type ContentGroup = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type DistributionEntry = {
  id: string;
  project_id: string;
  user_id: string;
  platform: DistributionPlatform;
  title: string | null;
  url: string;
  notes: string;
  date_posted: string;
  metrics: DistributionMetrics | null;
  source_type: EntrySourceType;
  source_metadata: EntrySourceMetadata;
  created_at: string;
  updated_at: string;
  /** Cross-post group (Pro); same idea across platforms. */
  content_group_id: string | null;
  /** Reddit subreddit name without `r/`. */
  subreddit: string | null;
};

export type DistributionAttachment = {
  id: string;
  timeline_entry_id: string;
  image_url: string;
  extraction_status: "pending" | "completed" | "failed" | "idle";
  extracted_platform: string | null;
  extracted_views: number | null;
  extracted_likes: number | null;
  extracted_comments: number | null;
  extracted_payload: Record<string, unknown> | null;
  extracted_at: string | null;
  extraction_error: string | null;
  created_at: string;
};

export type DistributionMetricSnapshotRow = {
  id: string;
  timeline_entry_id: string;
  source_attachment_id: string | null;
  period_label: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  captured_at: string;
  created_at: string;
};

export type ActivityItem = {
  kind: "timeline";
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  type: TimelineEntryType;
  /** ISO timestamp for sorting (usually created_at). */
  at: string;
  /** Shown under the title (e.g. description snippet). */
  detail?: string;
  /** Entry date for display (YYYY-MM-DD). */
  entry_date?: string;
  /** Set when `type === "distribution"` (dashboard icon + label). */
  platform?: DistributionPlatform | null;
  /** Optional project logo for richer activity context. */
  project_logo_url?: string | null;
};
