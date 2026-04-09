import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import {
  buildViewsOverTimeSeries,
  type ViewsTimeSeriesPoint,
} from "@/lib/data/views-time-series";
import { isoDateDaysAgoInclusive, utcTodayIsoDate } from "@/lib/plan-history";
import type { DistributionEntry, DistributionPlatform } from "@/types/momentum";

export type AdvancedAnalyticsPreset = "7d" | "30d" | "all";
export type AdvancedAnalyticsRange = AdvancedAnalyticsPreset | "custom";

export type AdvancedAnalyticsSelection = {
  range: AdvancedAnalyticsRange;
  /** Pro custom window (YYYY-MM-DD) */
  customFrom?: string;
  customTo?: string;
};

const WEEKDAY = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function dayKeyPosted(datePosted: string): string {
  return datePosted.trim().slice(0, 10);
}

function displayTitle(e: DistributionEntry): string {
  const t = e.title?.trim();
  if (t) return t;
  return `Post on ${DISTRIBUTION_PLATFORM_LABELS[e.platform]}`;
}

export function advancedWindowBounds(sel: AdvancedAnalyticsSelection): {
  dateFrom?: string;
  dateTo?: string;
  label: string;
} {
  if (sel.range === "all") {
    return { label: "All time" };
  }

  if (sel.range === "custom") {
    const today = utcTodayIsoDate();
    const fromRaw = sel.customFrom?.trim();
    const toRaw = sel.customTo?.trim();

    if (fromRaw && toRaw) {
      const a = fromRaw <= toRaw ? fromRaw : toRaw;
      const b = fromRaw <= toRaw ? toRaw : fromRaw;
      return { dateFrom: a, dateTo: b, label: "Custom range" };
    }
    if (fromRaw) {
      return { dateFrom: fromRaw, dateTo: today, label: "Custom range" };
    }
    if (toRaw) {
      const fallbackFrom = isoDateDaysAgoInclusive(30);
      const a = fallbackFrom <= toRaw ? fallbackFrom : toRaw;
      const b = fallbackFrom <= toRaw ? toRaw : fallbackFrom;
      return { dateFrom: a, dateTo: b, label: "Custom range" };
    }
    return {
      dateFrom: isoDateDaysAgoInclusive(30),
      dateTo: today,
      label: "Custom range",
    };
  }

  if (sel.range === "30d") {
    return { dateFrom: isoDateDaysAgoInclusive(30), label: "Last 30 days" };
  }

  return { dateFrom: isoDateDaysAgoInclusive(7), label: "Last 7 days" };
}

/** Free tier: only 7d / 30d presets apply; ignores custom/all on `sel`. */
export function effectiveAnalyticsSelection(
  sel: AdvancedAnalyticsSelection,
  isPro: boolean
): AdvancedAnalyticsSelection {
  if (isPro) return sel;
  if (sel.range === "7d" || sel.range === "30d") {
    return { range: sel.range };
  }
  return { range: "30d" };
}

export function filterEntriesForAdvancedSelection(
  entries: DistributionEntry[],
  sel: AdvancedAnalyticsSelection
): DistributionEntry[] {
  const { dateFrom, dateTo } = advancedWindowBounds(sel);
  return entries.filter((e) => {
    const k = dayKeyPosted(e.date_posted);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    if (dateFrom && k < dateFrom) return false;
    if (dateTo && k > dateTo) return false;
    return true;
  });
}

export function getAdvancedViewsTimeSeries(
  entries: DistributionEntry[],
  sel: AdvancedAnalyticsSelection
): {
  points: ViewsTimeSeriesPoint[];
  bucket: "day" | "week";
  rangeLabel: string;
} {
  const { dateFrom, dateTo, label } = advancedWindowBounds(sel);
  const filtered = filterEntriesForAdvancedSelection(entries, sel);
  const { points, bucket } = buildViewsOverTimeSeries(
    filtered,
    dateFrom,
    dateTo
  );
  return { points, bucket, rangeLabel: label };
}

export type PlatformViewsDatum = {
  key: DistributionPlatform;
  label: string;
  views: number;
};

export function buildPlatformViewsData(entries: DistributionEntry[]): {
  data: PlatformViewsDatum[];
  strongest: { label: string; views: number } | null;
} {
  const m = new Map<DistributionPlatform, number>();
  for (const p of Object.keys(DISTRIBUTION_PLATFORM_LABELS) as DistributionPlatform[]) {
    m.set(p, 0);
  }
  for (const e of entries) {
    m.set(e.platform, (m.get(e.platform) ?? 0) + (e.metrics?.views ?? 0));
  }
  const data: PlatformViewsDatum[] = (
    Object.keys(DISTRIBUTION_PLATFORM_LABELS) as DistributionPlatform[]
  ).map((key) => ({
    key,
    label: DISTRIBUTION_PLATFORM_LABELS[key],
    views: m.get(key) ?? 0,
  }));
  let best: DistributionPlatform | null = null;
  let bestV = -1;
  for (const [k, v] of m) {
    if (v > bestV) {
      bestV = v;
      best = k;
    }
  }
  const strongest =
    best != null && bestV > 0
      ? { label: DISTRIBUTION_PLATFORM_LABELS[best], views: bestV }
      : null;
  return { data, strongest };
}

export type PostComparisonRow = {
  id: string;
  title: string;
  platform: DistributionPlatform;
  platformLabel: string;
  views: number;
  datePosted: string;
  growthVsPrevious: number | null;
};

export function buildPostComparisonRows(
  entries: DistributionEntry[]
): PostComparisonRow[] {
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.date_posted).getTime() - new Date(b.date_posted).getTime()
  );
  let prevViews: number | null = null;
  const rows: PostComparisonRow[] = [];
  for (const e of sorted) {
    const v = e.metrics?.views ?? 0;
    const growth = prevViews === null ? null : v - prevViews;
    rows.push({
      id: e.id,
      title: displayTitle(e),
      platform: e.platform,
      platformLabel: DISTRIBUTION_PLATFORM_LABELS[e.platform],
      views: v,
      datePosted: e.date_posted,
      growthVsPrevious: growth,
    });
    prevViews = v;
  }
  return rows;
}

export type BestTimeInsight = {
  bestDay: string | null;
  bestHour: string | null;
  detail: string;
};

function formatUtcHour(h: number): string {
  const d = new Date(Date.UTC(2000, 0, 1, h, 0, 0));
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function buildBestTimeInsight(entries: DistributionEntry[]): BestTimeInsight {
  if (entries.length === 0) {
    return {
      bestDay: null,
      bestHour: null,
      detail: "Log distribution posts to see when you tend to ship and how timing lines up with views.",
    };
  }

  const dayAgg = Array.from({ length: 7 }, () => ({ views: 0, posts: 0 }));
  const hourAgg = Array.from({ length: 24 }, () => ({ views: 0, posts: 0 }));

  for (const e of entries) {
    const dk = dayKeyPosted(e.date_posted);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dk)) {
      const d = new Date(`${dk}T12:00:00Z`);
      const wd = d.getUTCDay();
      dayAgg[wd].views += e.metrics?.views ?? 0;
      dayAgg[wd].posts += 1;
    }
    const h = new Date(e.created_at).getUTCHours();
    hourAgg[h].views += e.metrics?.views ?? 0;
    hourAgg[h].posts += 1;
  }

  let bestD = 0;
  for (let i = 1; i < 7; i++) {
    if (dayAgg[i].views > dayAgg[bestD].views) bestD = i;
    else if (
      dayAgg[i].views === dayAgg[bestD].views &&
      dayAgg[i].posts > dayAgg[bestD].posts
    ) {
      bestD = i;
    }
  }

  let bestH = 0;
  for (let i = 1; i < 24; i++) {
    if (hourAgg[i].views > hourAgg[bestH].views) bestH = i;
    else if (
      hourAgg[i].views === hourAgg[bestH].views &&
      hourAgg[i].posts > hourAgg[bestH].posts
    ) {
      bestH = i;
    }
  }

  const bestDay = dayAgg[bestD].posts > 0 ? WEEKDAY[bestD]! : null;
  const bestHour = hourAgg[bestH].posts > 0 ? formatUtcHour(bestH) : null;

  let detail = "Based on your logged post dates and timestamps (UTC).";
  if (bestDay && bestHour) {
    detail = `Your logged posts skew toward ${bestDay} and around ${bestHour} by total views. Use it as a hint, not a rule — audience and platform matter more.`;
  } else if (bestDay) {
    detail = `Most views in this range cluster on ${bestDay} by post date.`;
  } else if (bestHour) {
    detail = `By time of day (when you saved the entry), ${bestHour} shows the strongest view totals.`;
  }

  return { bestDay, bestHour, detail };
}
