import {
  countDistributionEntries,
  countDistributionEntriesSince,
  listDistributionEntries,
  listDistributionForProject,
  platformCounts,
} from "@/lib/data/distribution";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { countProjects, listProjectSummaries, listProjects } from "@/lib/data/projects";
import type { DashboardStatusTone } from "@/lib/dashboard-colors";
import {
  countTimelineEntries,
  countTimelineEntriesSince,
  listTimelineByTypesSince,
  listRecentTimeline,
  listTimelineForProject,
} from "@/lib/data/timeline";
import {
  clampIsoRangeToFreeHistory,
  freeHistoryDateFromInclusive,
  isoDateDaysAgoInclusive,
} from "@/lib/plan-history";
import {
  buildViewsOverTimeSeries,
  dayKeyFromPosted,
  type ViewsTimeSeriesPoint,
} from "@/lib/data/views-time-series";
import type {
  ActivityItem,
  DistributionEntry,
  DistributionPlatform,
} from "@/types/momentum";

export type { ViewsTimeSeriesPoint } from "@/lib/data/views-time-series";
export { buildViewsOverTimeSeries } from "@/lib/data/views-time-series";

export type DistributionTimeRange = "7d" | "30d" | "all" | "custom";

export type DashboardDistributionFilters = {
  range: DistributionTimeRange;
  platform: DistributionPlatform | "all";
  from?: string;
  to?: string;
};

function resolveDateRange(filters: DashboardDistributionFilters): {
  dateFrom?: string;
  dateTo?: string;
  label: string;
} {
  if (filters.range === "all") {
    return { label: "All time" };
  }
  if (filters.range === "custom") {
    const from = filters.from?.trim();
    const to = filters.to?.trim();
    if (from && to) return { dateFrom: from, dateTo: to, label: "Custom range" };
    if (from) return { dateFrom: from, label: "Custom range" };
    if (to) return { dateTo: to, label: "Custom range" };
    return { label: "Custom range" };
  }
  if (filters.range === "30d") {
    return { dateFrom: isoDateDaysAgoInclusive(30), label: "Last 30 days" };
  }
  return { dateFrom: isoDateDaysAgoInclusive(7), label: "Last 7 days" };
}

function resolveDateRangeForPlan(
  filters: DashboardDistributionFilters,
  isPro: boolean
): { dateFrom?: string; dateTo?: string; label: string } {
  if (isPro) {
    return resolveDateRange(filters);
  }

  if (filters.range === "all") {
    return {
      dateFrom: freeHistoryDateFromInclusive(),
      label: "Last 30 days",
    };
  }

  if (filters.range === "custom") {
    const base = resolveDateRange(filters);
    const clamped = clampIsoRangeToFreeHistory(base.dateFrom, base.dateTo);
    return {
      dateFrom: clamped.dateFrom,
      dateTo: clamped.dateTo,
      label: "Custom range",
    };
  }

  return resolveDateRange(filters);
}

function clipText(text: string, max: number): string | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function getDashboardStats(userId: string) {
  const since7 = isoDateDaysAgoInclusive(7);
  const [allProjects, projectCount, timelineCount, distributionCount, platforms, timelineLast7Days, distributionLast7Days] =
    await Promise.all([
      listProjects(userId),
    countProjects(userId),
    countTimelineEntries(userId),
    countDistributionEntries(userId, {}),
    platformCounts(userId),
    countTimelineEntriesSince(userId, since7),
    countDistributionEntriesSince(userId, since7),
  ]);

  const activeProjectCount = allProjects.filter((p) => p.status !== "paused").length;
  const recentTimeline = await listRecentTimeline(userId, 1);
  const lastActivityAt = recentTimeline[0]?.created_at ?? null;

  let topPlatform: DistributionPlatform | null = null;
  let topCount = 0;
  for (const [k, v] of Object.entries(platforms)) {
    if (v > topCount) {
      topCount = v;
      topPlatform = k as DistributionPlatform;
    }
  }

  return {
    projectCount,
    activeProjectCount,
    timelineCount,
    distributionCount,
    topPlatform,
    topPlatformCount: topCount,
    timelineLast7Days,
    distributionLast7Days,
    lastActivityAt,
    sinceDate: since7,
  };
}

export type DistributionPerformanceRow = {
  platform: DistributionPlatform;
  label: string;
  posts: number;
  views: number;
};

export type TimingInsight = {
  weekdayLabel: string;
  posts: number;
  views: number;
};

const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function buildTimingInsight(rows: DistributionEntry[]): TimingInsight | null {
  if (rows.length < 3) return null;
  const acc = Array.from({ length: 7 }, () => ({ posts: 0, views: 0 }));
  for (const r of rows) {
    const key = dayKeyFromPosted(r.date_posted);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    const d = new Date(`${key}T12:00:00Z`);
    const wd = d.getUTCDay();
    acc[wd].posts += 1;
    acc[wd].views += r.metrics?.views ?? 0;
  }
  let best = 0;
  for (let i = 1; i < 7; i++) {
    if (acc[i].views > acc[best].views) best = i;
    else if (acc[i].views === acc[best].views && acc[i].posts > acc[best].posts) {
      best = i;
    }
  }
  if (acc[best].posts === 0) return null;
  return {
    weekdayLabel: WEEKDAY_FULL[best]!,
    posts: acc[best].posts,
    views: acc[best].views,
  };
}

export async function getDistributionPerformance(
  userId: string,
  filters: DashboardDistributionFilters,
  isPro: boolean
): Promise<{
  totalPosts: number;
  totalViews: number;
  allTimePosts: number;
  allTimeViews: number;
  dateLabel: string;
  selectedPlatform: DistributionPlatform | "all";
  platformCounts: Partial<Record<DistributionPlatform, number>>;
  rows: DistributionPerformanceRow[];
  viewsTimeSeries: ViewsTimeSeriesPoint[];
  viewsTimeBucket: "day" | "week";
  timingInsight: TimingInsight | null;
}> {
  const { dateFrom, dateTo, label } = resolveDateRangeForPlan(filters, isPro);
  const [rows, allRows] = await Promise.all([
    listDistributionEntries(userId, {
      dateFrom,
      dateTo,
      platform: filters.platform,
    }),
    listDistributionEntries(userId, {}),
  ]);

  const byPlatform = new Map<DistributionPlatform, { posts: number; views: number }>();
  const platformCountsOut: Partial<Record<DistributionPlatform, number>> = {};
  for (const platform of Object.keys(DISTRIBUTION_PLATFORM_LABELS) as DistributionPlatform[]) {
    byPlatform.set(platform, { posts: 0, views: 0 });
    platformCountsOut[platform] = 0;
  }
  for (const row of rows) {
    const current = byPlatform.get(row.platform) ?? { posts: 0, views: 0 };
    current.posts += 1;
    current.views += row.metrics?.views ?? 0;
    byPlatform.set(row.platform, current);
    platformCountsOut[row.platform] = (platformCountsOut[row.platform] ?? 0) + 1;
  }

  const output: DistributionPerformanceRow[] = (
    Object.keys(DISTRIBUTION_PLATFORM_LABELS) as DistributionPlatform[]
  ).map((platform) => {
    const v = byPlatform.get(platform) ?? { posts: 0, views: 0 };
    return {
      platform,
      label: DISTRIBUTION_PLATFORM_LABELS[platform],
      posts: v.posts,
      views: v.views,
    };
  });

  const { points: viewsTimeSeries, bucket: viewsTimeBucket } =
    buildViewsOverTimeSeries(rows, dateFrom, dateTo);
  const timingInsight = buildTimingInsight(rows);

  return {
    totalPosts: output.reduce((sum, r) => sum + r.posts, 0),
    totalViews: output.reduce((sum, r) => sum + r.views, 0),
    allTimePosts: allRows.length,
    allTimeViews: allRows.reduce((sum, r) => sum + (r.metrics?.views ?? 0), 0),
    dateLabel: label,
    selectedPlatform: filters.platform,
    platformCounts: platformCountsOut,
    rows:
      filters.platform === "all"
        ? output
        : output.filter((r) => r.platform === filters.platform),
    viewsTimeSeries,
    viewsTimeBucket,
    timingInsight,
  };
}

export async function getRecentActivity(
  userId: string,
  limit: number
): Promise<ActivityItem[]> {
  const summaries = await listProjectSummaries(userId);
  const nameById = new Map(summaries.map((p) => [p.id, p.name]));
  const logoById = new Map(summaries.map((p) => [p.id, p.logo_url ?? null]));

  const timeline = await listRecentTimeline(userId, limit);

  const items: ActivityItem[] = timeline.map((t) => {
    const title =
      t.type === "distribution" &&
      (!t.title?.trim() || t.title === "Distribution post")
        ? `Post on ${DISTRIBUTION_PLATFORM_LABELS[t.platform ?? "other"]}`
        : t.title;
    const views = t.type === "distribution" ? t.metrics?.views : undefined;
    const metricsSnippet =
      t.type === "distribution" && views != null ? `${views} views` : undefined;
    const textSnippet = clipText(t.description, 90);
    const detail = [metricsSnippet, textSnippet].filter(Boolean).join(" · ");
    return {
      kind: "timeline",
      id: t.id,
      project_id: t.project_id,
      project_name: nameById.get(t.project_id) ?? "Project",
      project_logo_url: logoById.get(t.project_id) ?? null,
      title,
      type: t.type,
      at: t.created_at,
      entry_date: t.entry_date,
      detail: detail || undefined,
      platform: t.platform,
    };
  });

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, limit);
}

export async function getProjectOverviewSlices(
  userId: string,
  projectId: string,
  take: number
) {
  const [timeline, distribution] = await Promise.all([
    listTimelineForProject(userId, projectId),
    listDistributionForProject(userId, projectId),
  ]);

  const nonDistributionTimeline = timeline.filter((e) => e.type !== "distribution");

  return {
    recentTimeline: nonDistributionTimeline.slice(0, take),
    recentDistribution: distribution.slice(0, take),
    timelineTotal: timeline.length,
    distributionTotal: distribution.length,
  };
}

export type NextMove = {
  id:
    | "first-distribution"
    | "post-this-week"
    | "try-new-platform"
    | "add-metrics"
    | "log-build"
    | "double-down";
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: DashboardStatusTone;
};

function distributionDisplayTitle(entry: {
  title: string | null;
  platform: DistributionPlatform;
}): string {
  const t = entry.title?.trim();
  if (t) return t;
  return `Post on ${DISTRIBUTION_PLATFORM_LABELS[entry.platform]}`;
}

/** Last-7-day distribution activity for the momentum hero. */
export type WeeklyMomentumSnapshot = {
  hasActivity: boolean;
  postCount: number;
  viewCount: number;
  platformCount: number;
};

export async function getWeeklyMomentumSnapshot(
  userId: string
): Promise<WeeklyMomentumSnapshot> {
  const since7 = isoDateDaysAgoInclusive(7);
  const rows = await listDistributionEntries(userId, { dateFrom: since7 });
  const postCount = rows.length;
  const viewCount = rows.reduce(
    (sum, r) => sum + (r.metrics?.views ?? 0),
    0
  );
  const platformCount = new Set(rows.map((r) => r.platform)).size;
  return {
    hasActivity: postCount > 0,
    postCount,
    viewCount,
    platformCount,
  };
}

export type BestPerformingPostInfo = {
  id: string;
  title: string;
  platform: DistributionPlatform;
  views: number;
  datePosted: string;
};

export async function getBestPerformingPost(
  userId: string
): Promise<BestPerformingPostInfo | null> {
  const all = await listDistributionEntries(userId, {});
  if (all.length === 0) return null;
  const sorted = [...all].sort((a, b) => {
    const va = a.metrics?.views ?? 0;
    const vb = b.metrics?.views ?? 0;
    if (vb !== va) return vb - va;
    return (
      new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
    );
  });
  const top = sorted[0]!;
  return {
    id: top.id,
    title: distributionDisplayTitle(top),
    platform: top.platform,
    views: top.metrics?.views ?? 0,
    datePosted: top.date_posted,
  };
}

export type YourStorySnapshot = {
  totalPosts: number;
  totalViews: number;
  activeProjectCount: number;
  projectCount: number;
  summary: string;
};

function buildYourStorySummary(
  totalPosts: number,
  totalViews: number,
  activeProjectCount: number
): string {
  if (totalPosts === 0) {
    return "Your story starts with one logged post — ship, share, and watch the arc take shape.";
  }
  if (totalPosts <= 3 && totalViews < 100) {
    return "Early wins count. Keep showing up; small posts compound into real momentum.";
  }
  if (totalViews >= 500) {
    return "People are watching — double down on what resonates and keep the cadence steady.";
  }
  if (totalViews > 0) {
    return "You're on the board. Tighten hooks, reply in-thread, and log the next touchpoint.";
  }
  if (activeProjectCount > 0) {
    return `${activeProjectCount} active project${activeProjectCount === 1 ? "" : "s"} — tie each post back to what you're building.`;
  }
  return "Every entry is a breadcrumb for future you — notes, metrics, and links add up.";
}

export async function getYourStorySnapshot(
  userId: string
): Promise<YourStorySnapshot> {
  const [all, stats] = await Promise.all([
    listDistributionEntries(userId, {}),
    getDashboardStats(userId),
  ]);
  const totalPosts = all.length;
  const totalViews = all.reduce(
    (sum, r) => sum + (r.metrics?.views ?? 0),
    0
  );
  return {
    totalPosts,
    totalViews,
    activeProjectCount: stats.activeProjectCount,
    projectCount: stats.projectCount,
    summary: buildYourStorySummary(
      totalPosts,
      totalViews,
      stats.activeProjectCount
    ),
  };
}

export async function getNextMoves(userId: string): Promise<NextMove[]> {
  const [distribution, stats] = await Promise.all([
    listDistributionEntries(userId, {}),
    getDashboardStats(userId),
  ]);

  const moves: NextMove[] = [];
  const platformsUsed = new Set(distribution.map((d) => d.platform)).size;
  const hasAnyViews = distribution.some(
    (d) => (d.metrics?.views ?? 0) > 0
  );
  const inactiveThisWeek =
    distribution.length > 0 && stats.distributionLast7Days === 0;

  if (distribution.length === 0) {
    moves.push({
      id: "first-distribution",
      title: "Log your first post",
      detail: "One distribution entry unlocks momentum, next moves, and your story on the dashboard.",
      href: "/distribution",
      cta: "Log a post",
      tone: "inactive",
    });
  }

  if (inactiveThisWeek) {
    moves.push({
      id: "post-this-week",
      title: "Ship something this week",
      detail: "No posts logged in the last 7 days — add one to keep streak and learning alive.",
      href: "/distribution",
      cta: "Log new post",
      tone: "attention",
    });
  }

  if (distribution.length > 0 && platformsUsed <= 1) {
    moves.push({
      id: "try-new-platform",
      title: "Try another platform",
      detail: "You're focused on one channel — experiment elsewhere to find new reach.",
      href: "/distribution",
      cta: "Add a channel",
      tone: "attention",
    });
  }

  if (hasAnyViews) {
    moves.push({
      id: "double-down",
      title: "Double down on what's working",
      detail: "You have posts with traction — reply, repost, or iterate on the same angle while it's warm.",
      href: "/distribution",
      cta: "Review posts",
      tone: "active",
    });
  }

  const missingMetricsCount = distribution.filter((d) => {
    const m = d.metrics;
    return !m || (m.views == null && m.likes == null && m.comments == null);
  }).length;
  if (missingMetricsCount > 0) {
    moves.push({
      id: "add-metrics",
      title: "Fill in performance metrics",
      detail: `${missingMetricsCount} post${
        missingMetricsCount === 1 ? "" : "s"
      } missing views or engagement — quick wins for your dashboard.`,
      href: "/distribution",
      cta: "Update metrics",
      tone: "attention",
    });
  }

  if (stats.timelineLast7Days === 0 && distribution.length > 0) {
    moves.push({
      id: "log-build",
      title: "Log a build or insight",
      detail: "Balance distribution with what you shipped — one timeline note this week keeps the full picture.",
      href: "/projects",
      cta: "Open projects",
      tone: "active",
    });
  }

  return moves.slice(0, 5);
}

export type TakeHomeSummary = {
  monthLabel: string;
  revenue: number;
  costs: number;
  revenueShare: number;
  takeHome: number;
  revenueSharePercent: number;
  hasFinancialActivity: boolean;
  insight: string;
};

export async function getTakeHomeSummary(
  userId: string
): Promise<TakeHomeSummary> {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const since = monthStart.toISOString().slice(0, 10);

  const rows = await listTimelineByTypesSince(
    userId,
    ["revenue", "cost", "deal"],
    since
  );

  const revenue = rows
    .filter((r) => r.type === "revenue")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const costs = rows
    .filter((r) => r.type === "cost")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const revenueSharePercent = Math.min(
    100,
    rows
      .filter((r) => r.type === "deal")
      .reduce((sum, r) => sum + (r.revenue_share_percentage ?? 0), 0)
  );
  const revenueShare = revenue * (revenueSharePercent / 100);
  const takeHome = revenue - costs - revenueShare;
  const hasFinancialActivity = rows.length > 0;

  const insight =
    !hasFinancialActivity
      ? "No financial activity yet."
      : takeHome > 0
        ? "You're profitable - keep going."
        : revenue > 0 && costs > revenue
          ? "You're spending more than you're earning this month."
          : revenue === 0 && costs > 0
            ? `You've invested ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              }).format(costs)} so far.`
            : "Financial activity is balanced so far.";

  return {
    monthLabel: monthStart.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    revenue,
    costs,
    revenueShare,
    takeHome,
    revenueSharePercent,
    hasFinancialActivity,
    insight,
  };
}
