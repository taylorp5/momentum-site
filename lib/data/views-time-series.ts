import type { DistributionEntry } from "@/types/momentum";

export type ViewsTimeSeriesPoint = {
  key: string;
  label: string;
  views: number;
  posts: number;
};

export function dayKeyFromPosted(datePosted: string): string {
  return datePosted.trim().slice(0, 10);
}

function utcMondayOfDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatShortDay(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatWeekStartLabel(mondayKey: string): string {
  const d = new Date(`${mondayKey}T12:00:00Z`);
  const end = new Date(d);
  end.setUTCDate(d.getUTCDate() + 6);
  const a = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const b = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${a}–${b}`;
}

export function buildViewsOverTimeSeries(
  rows: DistributionEntry[],
  dateFrom: string | undefined,
  dateTo: string | undefined
): { points: ViewsTimeSeriesPoint[]; bucket: "day" | "week" } {
  const byDay = new Map<string, { views: number; posts: number }>();
  for (const r of rows) {
    const key = dayKeyFromPosted(r.date_posted);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    const cur = byDay.get(key) ?? { views: 0, posts: 0 };
    cur.views += r.metrics?.views ?? 0;
    cur.posts += 1;
    byDay.set(key, cur);
  }

  const sortedDays = [...byDay.keys()].sort();
  if (sortedDays.length === 0) {
    return { points: [], bucket: "day" };
  }

  let from = dateFrom?.slice(0, 10) ?? sortedDays[0]!;
  let to = dateTo?.slice(0, 10) ?? sortedDays[sortedDays.length - 1]!;
  if (from > to) [from, to] = [to, from];

  const fromMs = new Date(`${from}T12:00:00Z`).getTime();
  const toMs = new Date(`${to}T12:00:00Z`).getTime();
  const daySpan = Math.floor((toMs - fromMs) / 86400000) + 1;
  const useWeeks = daySpan > 90;

  if (!useWeeks) {
    const points: ViewsTimeSeriesPoint[] = [];
    for (let t = fromMs; t <= toMs; t += 86400000) {
      const key = new Date(t).toISOString().slice(0, 10);
      const v = byDay.get(key) ?? { views: 0, posts: 0 };
      points.push({
        key,
        label: formatShortDay(key),
        views: v.views,
        posts: v.posts,
      });
    }
    return { points, bucket: "day" };
  }

  const byWeek = new Map<string, { views: number; posts: number }>();
  for (const r of rows) {
    const key = dayKeyFromPosted(r.date_posted);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    const wk = utcMondayOfDayKey(key);
    const cur = byWeek.get(wk) ?? { views: 0, posts: 0 };
    cur.views += r.metrics?.views ?? 0;
    cur.posts += 1;
    byWeek.set(wk, cur);
  }

  const mon0 = utcMondayOfDayKey(from);
  const mon1 = utcMondayOfDayKey(to);
  const startMs = new Date(`${mon0}T12:00:00Z`).getTime();
  const endMs = new Date(`${mon1}T12:00:00Z`).getTime();
  const points: ViewsTimeSeriesPoint[] = [];
  for (let t = startMs; t <= endMs; t += 7 * 86400000) {
    const wk = new Date(t).toISOString().slice(0, 10);
    const v = byWeek.get(wk) ?? { views: 0, posts: 0 };
    points.push({
      key: wk,
      label: formatWeekStartLabel(wk),
      views: v.views,
      posts: v.posts,
    });
  }
  return { points, bucket: "week" };
}
