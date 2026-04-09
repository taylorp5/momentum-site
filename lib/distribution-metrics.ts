import type { DistributionMetrics } from "@/types/momentum";

export function normalizeMetric(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  const n = Math.floor(value);
  return n >= 0 ? n : undefined;
}

export function normalizeMoneyMetric(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined;
  }
  if (value < 0) return undefined;
  return Math.round(value * 100) / 100;
}

export function parseDistributionMetrics(
  raw: DistributionMetrics | Record<string, unknown> | null
): DistributionMetrics {
  if (!raw) return {};
  return {
    views: normalizeMetric(raw.views),
    likes: normalizeMetric(raw.likes),
    comments: normalizeMetric(raw.comments),
    promo_spend: normalizeMoneyMetric(raw.promo_spend),
    notes_on_performance:
      typeof raw.notes_on_performance === "string"
        ? raw.notes_on_performance
        : undefined,
    snapshots: Array.isArray(raw.snapshots)
      ? raw.snapshots.filter((s): s is { at: string } => {
          return Boolean(s && typeof s === "object" && "at" in s);
        }) as DistributionMetrics["snapshots"]
      : undefined,
  };
}

export function metricsPreview(metrics: DistributionMetrics | null): string | null {
  const m = metrics ?? {};
  const parts: string[] = [];
  if (typeof m.views === "number") parts.push(`${m.views} views`);
  if (typeof m.likes === "number") parts.push(`${m.likes} upvotes`);
  if (typeof m.comments === "number") parts.push(`${m.comments} comments`);
  return parts.length ? parts.join(" • ") : null;
}
