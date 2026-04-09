import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import type { DashboardInsight } from "@/lib/insights/build-dashboard-insights";
import { listDistributionEntries } from "@/lib/data/distribution";
import { getDashboardStats, type NextMove } from "@/lib/data/dashboard";
import { costAmountInPeriod } from "@/lib/cost-recurrence";
import { listCostEntriesForFinancialPeriod } from "@/lib/data/timeline";
import { isoDateDaysAgoInclusive } from "@/lib/plan-history";
import type { DistributionPlatform } from "@/types/momentum";

export type FocusModeSnapshot = {
  lastPostDate: string | null;
  totalViews: number;
  viewsThisWeek: number;
  viewsTrend7d: number[];
  postsThisWeek: number;
  spendThisWeek: number;
  bestPlatformThisWeek: { platform: DistributionPlatform; label: string } | null;
  /** When the week has no platform signal, use for smart prefill */
  fallbackPlatform: DistributionPlatform | null;
};

export async function getFocusModeSnapshot(
  userId: string
): Promise<FocusModeSnapshot> {
  const since7 = isoDateDaysAgoInclusive(7);
  const until = new Date().toISOString().slice(0, 10);
  const [weekEntries, allEntries, stats, costRows] = await Promise.all([
    listDistributionEntries(userId, { dateFrom: since7 }),
    listDistributionEntries(userId, {}),
    getDashboardStats(userId),
    listCostEntriesForFinancialPeriod(userId, since7, until),
  ]);

  let lastPostDate: string | null = null;
  for (const e of allEntries) {
    if (!lastPostDate || e.date_posted > lastPostDate) {
      lastPostDate = e.date_posted;
    }
  }

  const viewsThisWeek = weekEntries.reduce(
    (s, e) => s + (e.metrics?.views ?? 0),
    0
  );
  const viewsByDate = new Map<string, number>();
  for (const e of weekEntries) {
    viewsByDate.set(
      e.date_posted,
      (viewsByDate.get(e.date_posted) ?? 0) + (e.metrics?.views ?? 0)
    );
  }
  const today = new Date();
  const viewsTrend7d: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i)
    );
    const key = d.toISOString().slice(0, 10);
    viewsTrend7d.push(viewsByDate.get(key) ?? 0);
  }
  const totalViews = allEntries.reduce((s, e) => s + (e.metrics?.views ?? 0), 0);
  const postsThisWeek = weekEntries.length;
  const spendThisWeek = costRows.reduce(
    (s, r) =>
      s +
      costAmountInPeriod(
        {
          amount: r.amount ?? 0,
          entry_date: r.entry_date,
          billing_type: r.billing_type,
          recurring_start_date: r.recurring_start_date,
          recurring_end_date: r.recurring_end_date,
          recurring_active: r.recurring_active,
          is_recurring: r.is_recurring,
        },
        since7,
        until
      ),
    0
  );

  const byPlat = new Map<
    DistributionPlatform,
    { posts: number; views: number }
  >();
  for (const e of weekEntries) {
    const cur = byPlat.get(e.platform) ?? { posts: 0, views: 0 };
    cur.posts += 1;
    cur.views += e.metrics?.views ?? 0;
    byPlat.set(e.platform, cur);
  }

  let best: {
    platform: DistributionPlatform;
    views: number;
    posts: number;
  } | null = null;
  for (const [platform, v] of byPlat) {
    if (
      !best ||
      v.views > best.views ||
      (v.views === best.views && v.posts > best.posts)
    ) {
      best = { platform, ...v };
    }
  }

  const bestPlatformThisWeek =
    best && (best.posts > 0 || best.views > 0)
      ? {
          platform: best.platform,
          label: DISTRIBUTION_PLATFORM_LABELS[best.platform],
        }
      : null;

  return {
    lastPostDate,
    totalViews,
    viewsThisWeek,
    viewsTrend7d,
    postsThisWeek,
    spendThisWeek,
    bestPlatformThisWeek,
    fallbackPlatform: stats.topPlatform,
  };
}

export type FocusNextAction =
  | {
      kind: "log";
      label: string;
      platform?: DistributionPlatform;
      quickLog?: boolean;
    }
  | { kind: "link"; label: string; href: string };

export function buildFocusNextActions(
  insights: DashboardInsight[],
  moves: NextMove[],
  max = 3
): FocusNextAction[] {
  const out: FocusNextAction[] = [];
  const seen = new Set<string>();

  for (const ins of insights) {
    for (const la of ins.logActions) {
      if (out.length >= max) break;
      const key = `log:${la.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        kind: "log",
        label: la.label,
        platform: la.platform,
        quickLog: la.quickLog,
      });
    }
    if (out.length >= max) return out;
  }

  for (const m of moves) {
    if (out.length >= max) break;
    const key = `link:${m.href}:${m.cta}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: "link", label: m.cta, href: m.href });
  }

  if (out.length === 0) {
    out.push({
      kind: "log",
      label: "Log a post",
      quickLog: true,
    });
  }

  return out.slice(0, max);
}
