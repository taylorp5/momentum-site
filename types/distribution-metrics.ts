export type DistributionMetricSnapshot = {
  at: string;
  views?: number;
  likes?: number;
  comments?: number;
  period_label?: string;
  source?: "manual" | "screenshot_ai";
  source_attachment_id?: string;
};

/**
 * Lightweight, extensible performance payload for a distribution row.
 * Snapshots enable future "over time" tracking without requiring UI now.
 */
export type DistributionMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  /** Optional promo / ad spend for this post (used for Pro ROI vs linked revenue). */
  promo_spend?: number;
  notes_on_performance?: string;
  snapshots?: DistributionMetricSnapshot[];
};
