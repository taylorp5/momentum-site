"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashCard,
  dashCardHeader,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import type { ViewsTimeSeriesPoint } from "@/lib/data/views-time-series";

const POSTS_FOR_TREND = 3;

type ViewsOverTimeChartProps = {
  points: ViewsTimeSeriesPoint[];
  bucket: "day" | "week";
  dateLabel: string;
};

export function ViewsOverTimeChart({
  points,
  bucket,
  dateLabel,
}: ViewsOverTimeChartProps) {
  /** Total posts represented in the series (same filtered rows as the chart; not “days with posts”). */
  const totalPostsLogged = points.reduce((sum, p) => sum + p.posts, 0);
  const hasAnyViews = points.some((p) => p.views > 0);
  const hasAnyPosts = totalPostsLogged > 0;
  const peak = points.reduce(
    (best, p) => (p.views > best.views ? p : best),
    points[0] ?? { label: "", views: 0, posts: 0 }
  );
  const avgViews = points.length
    ? points.reduce((sum, p) => sum + p.views, 0) / points.length
    : 0;
  const hasSpike = peak.views > 0 && peak.views >= avgViews * 1.75;
  const hasLowData = hasAnyPosts && totalPostsLogged < POSTS_FOR_TREND;

  const bucketDescription =
    bucket === "week"
      ? "Weekly totals by post date"
      : "Daily totals by post date";

  return (
    <Card className={cn(dashCard, "overflow-visible py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
          Views over time
        </CardTitle>
        <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">
          {bucketDescription} · {dateLabel}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pb-3.5 pt-2.5">
        {!hasAnyPosts ? (
          <div className="flex min-h-[140px] flex-col justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-4 py-5">
            <p className="text-[13px] font-medium text-zinc-800">No posts in this range</p>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              Log distribution posts with dates in this window to see views over time. Totals match
              your filters above (date range and platform).
            </p>
            <p className="mt-2 text-[11px] text-zinc-500">Showing {dateLabel}</p>
            <Link
              href="/distribution"
              className="mt-4 inline-flex w-fit text-[13px] font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900"
            >
              Open distribution →
            </Link>
          </div>
        ) : hasLowData ? (
          <div className="flex min-h-[160px] flex-col justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-5">
            <p className="text-[13px] font-medium text-zinc-800">
              You need at least {POSTS_FOR_TREND} posts to see trends over time
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              Once you have a few posts in this period, we can show a clearer pattern. Each post is
              counted once—grouped by day or week on the chart.
            </p>
            <p className="mt-3 text-[12px] text-zinc-600">
              <span className="font-medium tabular-nums text-zinc-800">
                {totalPostsLogged} of {POSTS_FOR_TREND}
              </span>{" "}
              posts needed to see a trend
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Showing {dateLabel} · {totalPostsLogged}{" "}
              {totalPostsLogged === 1 ? "post" : "posts"} logged
            </p>
          </div>
        ) : (
          <div className="min-h-[200px] w-full shrink-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={points} margin={{ left: 2, right: 6, top: 6, bottom: 2 }}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e4e4e7"
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(points.length / 5))}
                  height={34}
                />
                <YAxis
                  allowDecimals={false}
                  width={34}
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ stroke: "#d4d4d8", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as ViewsTimeSeriesPoint;
                    return (
                      <div className="rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-[12px] shadow-[0_10px_30px_-14px_rgba(15,23,42,0.35)]">
                        <p className="font-semibold text-zinc-900">{row.label}</p>
                        <p className="mt-1 tabular-nums text-zinc-600">
                          {row.views.toLocaleString()} views · {row.posts}{" "}
                          {row.posts === 1 ? "post" : "posts"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#2563eb"
                  strokeWidth={2.2}
                  fill="url(#viewsFill)"
                  connectNulls
                  activeDot={{ r: 4.5, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1.5 }}
                  dot={(props) => {
                    const payload = props.payload as ViewsTimeSeriesPoint;
                    const isSpikePoint = hasSpike && payload.label === peak.label && payload.views > 0;
                    if (!isSpikePoint) return null;
                    const { cx, cy } = props;
                    if (typeof cx !== "number" || typeof cy !== "number") return null;
                    return (
                      <circle cx={cx} cy={cy} r={4.5} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {!hasLowData && hasAnyPosts ? (
          <p className="text-[11px] text-zinc-500">
            Showing {dateLabel} · {totalPostsLogged}{" "}
            {totalPostsLogged === 1 ? "post" : "posts"} logged
          </p>
        ) : null}
        {hasAnyPosts && !hasLowData && !hasAnyViews ? (
          <p className="text-center text-[11px] leading-snug text-zinc-500">
            Add view counts on posts to see this line climb.
          </p>
        ) : null}
        {hasAnyPosts && !hasLowData && hasSpike ? (
          <p className="text-[11px] leading-snug text-zinc-500">
            Spike: <span className="font-medium text-zinc-700">{peak.label}</span> hit{" "}
            <span className="tabular-nums">{peak.views.toLocaleString()}</span> views.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
