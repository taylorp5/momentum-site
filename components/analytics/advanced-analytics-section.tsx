"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ProAnalyticsGate } from "@/components/billing/pro-analytics-gate";
import { usePlan } from "@/components/billing/plan-context";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashCard,
  dashCardHeader,
  dashSectionDesc,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLATFORM_ACCENT } from "@/lib/dashboard-colors";
import {
  buildBestTimeInsight,
  buildPlatformViewsData,
  buildPostComparisonRows,
  effectiveAnalyticsSelection,
  filterEntriesForAdvancedSelection,
  getAdvancedViewsTimeSeries,
  type AdvancedAnalyticsRange,
  type AdvancedAnalyticsSelection,
  type PostComparisonRow,
} from "@/lib/data/advanced-analytics";
import { isoDateDaysAgoInclusive, utcTodayIsoDate } from "@/lib/plan-history";
import type { ViewsTimeSeriesPoint } from "@/lib/data/views-time-series";
import { cn } from "@/lib/utils";
import type { DistributionEntry } from "@/types/momentum";

type AdvancedAnalyticsSectionProps = {
  entries: DistributionEntry[];
  isPro: boolean;
};

function AdvancedViewsLineChart({
  points,
  rangeLabel,
}: {
  points: ViewsTimeSeriesPoint[];
  rangeLabel: string;
}) {
  const hasPosts = points.some((p) => p.posts > 0);
  const hasViews = points.some((p) => p.views > 0);

  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
          Views over time
        </CardTitle>
        <p className={dashSectionDesc}>Total views by day · {rangeLabel}</p>
      </CardHeader>
      <CardContent className="h-[300px] px-5 pb-5 pt-4">
        {!hasPosts ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-[#eeeeee] bg-zinc-50/40 px-4 py-6 text-[13px] text-zinc-600">
            No posts in this range — log distribution to chart views.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                height={40}
              />
              <YAxis
                allowDecimals={false}
                width={44}
                tick={{ fontSize: 11, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as ViewsTimeSeriesPoint;
                  return (
                    <div className="rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-[12px] shadow-md">
                      <p className="font-medium text-zinc-900">{row.label}</p>
                      <p className="mt-1 tabular-nums text-zinc-600">
                        {row.views.toLocaleString()} views · {row.posts}{" "}
                        {row.posts === 1 ? "post" : "posts"}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 3, fill: "#059669", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {hasPosts && !hasViews ? (
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Add view counts on posts to see this line move.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PlatformViewsPerformanceCard({
  data,
  strongest,
  rangeLabel,
}: {
  data: { key: string; label: string; views: number }[];
  strongest: { label: string; views: number } | null;
  rangeLabel: string;
}) {
  const visible = data.filter((d) => d.views > 0);
  const chartData = visible.length > 0 ? visible : data;

  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
          Platform performance
        </CardTitle>
        <p className={dashSectionDesc}>Total views per channel · {rangeLabel}</p>
        {strongest ? (
          <p className="mt-2 text-[13px] font-medium leading-snug text-emerald-800">
            {strongest.label} is your strongest platform
            <span className="ml-1.5 font-normal tabular-nums text-zinc-600">
              ({strongest.views.toLocaleString()} views)
            </span>
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-zinc-500">
            Log view counts to see which channel pulls the most reach.
          </p>
        )}
      </CardHeader>
      <CardContent className="h-[280px] px-5 pb-5 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              height={48}
            />
            <YAxis
              allowDecimals={false}
              width={40}
              tick={{ fontSize: 11, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(24,24,27,0.04)" }}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e4e4e7",
                fontSize: 12,
              }}
              formatter={(v) => [
                typeof v === "number" ? v.toLocaleString() : String(v ?? ""),
                "Views",
              ]}
            />
            <Bar dataKey="views" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={
                    PLATFORM_ACCENT[entry.key as keyof typeof PLATFORM_ACCENT]?.bar ??
                    "#a1a1aa"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PostComparisonBlock({
  rows,
  isPro,
}: {
  rows: PostComparisonRow[];
  isPro: boolean;
}) {
  const [sortMode, setSortMode] = useState<"views" | "growth">("views");
  const sorted = useMemo(() => {
    const out = [...rows];
    if (sortMode === "views") {
      out.sort((a, b) => b.views - a.views);
    } else {
      out.sort((a, b) => {
        const ga = a.growthVsPrevious ?? -Infinity;
        const gb = b.growthVsPrevious ?? -Infinity;
        return gb - ga;
      });
    }
    return out;
  }, [rows, sortMode]);

  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
              Post comparison
            </CardTitle>
            <p className={dashSectionDesc}>
              How your logged posts stack up in this range
            </p>
          </div>
          {isPro ? (
            <div className="flex shrink-0 gap-1 rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={sortMode === "views" ? "default" : "ghost"}
                className={cn(
                  "h-8 rounded-md px-3 text-[12px]",
                  sortMode === "views" ? "bg-zinc-900 hover:bg-zinc-800" : ""
                )}
                onClick={() => setSortMode("views")}
              >
                By views
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sortMode === "growth" ? "default" : "ghost"}
                className={cn(
                  "h-8 rounded-md px-3 text-[12px]",
                  sortMode === "growth" ? "bg-zinc-900 hover:bg-zinc-800" : ""
                )}
                onClick={() => setSortMode("growth")}
              >
                By growth
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-5 pt-0">
        {sorted.length === 0 ? (
          <p className="px-5 text-[13px] text-zinc-500">No posts in this range.</p>
        ) : (
          <div className="max-h-[320px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#eeeeee] hover:bg-transparent">
                  <TableHead className="pl-5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Title
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Platform
                  </TableHead>
                  <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Views
                  </TableHead>
                  {isPro && sortMode === "growth" ? (
                    <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      vs prev
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.slice(0, 50).map((row) => (
                  <TableRow key={row.id} className="border-[#eeeeee]">
                    <TableCell className="max-w-[200px] pl-5 text-[13px] font-medium text-zinc-900">
                      <span className="line-clamp-2">{row.title}</span>
                    </TableCell>
                    <TableCell className="text-[13px]">
                      <span className="inline-flex items-center gap-1.5 text-zinc-700">
                        <PlatformIcon platform={row.platform} className="size-3.5" />
                        {row.platformLabel}
                      </span>
                    </TableCell>
                    <TableCell className="pr-5 text-right tabular-nums text-[13px] text-zinc-800">
                      {row.views.toLocaleString()}
                    </TableCell>
                    {isPro && sortMode === "growth" ? (
                      <TableCell
                        className={cn(
                          "pr-5 text-right text-[13px] tabular-nums",
                          row.growthVsPrevious == null
                            ? "text-zinc-400"
                            : row.growthVsPrevious >= 0
                              ? "text-emerald-700"
                              : "text-amber-800"
                        )}
                      >
                        {row.growthVsPrevious == null
                          ? "—"
                          : `${row.growthVsPrevious >= 0 ? "+" : ""}${row.growthVsPrevious.toLocaleString()}`}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BestTimeCard({ insight }: { insight: ReturnType<typeof buildBestTimeInsight> }) {
  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
          Best time to post
        </CardTitle>
        <p className={dashSectionDesc}>
          From your logged post dates and save times (UTC)
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5 pt-0">
        {insight.bestDay || insight.bestHour ? (
          <ul className="space-y-2 text-[14px] text-zinc-800">
            {insight.bestDay ? (
              <li className="flex gap-2">
                <span className="font-medium text-zinc-500">Best day</span>
                <span>{insight.bestDay}</span>
              </li>
            ) : null}
            {insight.bestHour ? (
              <li className="flex gap-2">
                <span className="font-medium text-zinc-500">Best hour</span>
                <span className="tabular-nums">{insight.bestHour}</span>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-[13px] text-zinc-600">Not enough data yet.</p>
        )}
        <p className="text-[12px] leading-relaxed text-zinc-500">{insight.detail}</p>
      </CardContent>
    </Card>
  );
}

export function AdvancedAnalyticsSection({ entries, isPro }: AdvancedAnalyticsSectionProps) {
  const { openUpgrade } = usePlan();
  const [range, setRange] = useState<AdvancedAnalyticsRange>("30d");
  const [customFrom, setCustomFrom] = useState(() => isoDateDaysAgoInclusive(30));
  const [customTo, setCustomTo] = useState(() => utcTodayIsoDate());

  const selection = useMemo<AdvancedAnalyticsSelection>(
    () => ({
      range,
      customFrom: range === "custom" ? customFrom : undefined,
      customTo: range === "custom" ? customTo : undefined,
    }),
    [range, customFrom, customTo]
  );

  const effectiveSelection = useMemo(
    () => effectiveAnalyticsSelection(selection, isPro),
    [selection, isPro]
  );

  useEffect(() => {
    if (!isPro && (range === "all" || range === "custom")) {
      setRange("30d");
    }
  }, [isPro, range]);

  const tabHighlight = isPro ? range : effectiveSelection.range;

  const filtered = useMemo(
    () => filterEntriesForAdvancedSelection(entries, effectiveSelection),
    [entries, effectiveSelection]
  );

  const timeSeries = useMemo(
    () => getAdvancedViewsTimeSeries(entries, effectiveSelection),
    [entries, effectiveSelection]
  );

  const platformBlock = useMemo(() => buildPlatformViewsData(filtered), [filtered]);
  const postRows = useMemo(() => buildPostComparisonRows(filtered), [filtered]);
  const bestTime = useMemo(() => buildBestTimeInsight(filtered), [filtered]);

  const inner = (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-[13px] leading-relaxed text-zinc-500">
          Deeper signals from the same distribution entries you already log — trends, channel
          mix, and timing hints.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-wrap justify-end gap-1 rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-0.5">
            {(["7d", "30d"] as const).map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={tabHighlight === id ? "default" : "ghost"}
                className={cn(
                  "h-8 min-w-[4.25rem] rounded-md px-3 text-[12px]",
                  tabHighlight === id ? "bg-zinc-900 hover:bg-zinc-800" : ""
                )}
                onClick={() => setRange(id)}
              >
                {id}
              </Button>
            ))}
            {isPro ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={range === "all" ? "default" : "ghost"}
                  className={cn(
                    "h-8 min-w-[4.25rem] rounded-md px-3 text-[12px]",
                    range === "all" ? "bg-zinc-900 hover:bg-zinc-800" : ""
                  )}
                  onClick={() => setRange("all")}
                >
                  All time
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={range === "custom" ? "default" : "ghost"}
                  className={cn(
                    "h-8 min-w-[5.5rem] rounded-md px-3 text-[12px]",
                    range === "custom" ? "bg-zinc-900 hover:bg-zinc-800" : ""
                  )}
                  onClick={() => setRange("custom")}
                >
                  Custom
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-md px-2.5 text-[12px] text-zinc-500"
                  onClick={() => openUpgrade()}
                >
                  All time · Pro
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-md px-2.5 text-[12px] text-zinc-500"
                  onClick={() => openUpgrade()}
                >
                  Custom · Pro
                </Button>
              </>
            )}
          </div>
          {isPro && range === "custom" ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 w-[154px] rounded-md border-zinc-200 bg-white text-[12px]"
                aria-label="Custom range from"
              />
              <span className="text-[12px] text-zinc-400">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 w-[154px] rounded-md border-zinc-200 bg-white text-[12px]"
                aria-label="Custom range to"
              />
            </div>
          ) : null}
        </div>
      </div>

      <AdvancedViewsLineChart points={timeSeries.points} rangeLabel={timeSeries.rangeLabel} />

      <PlatformViewsPerformanceCard
        data={platformBlock.data}
        strongest={platformBlock.strongest}
        rangeLabel={timeSeries.rangeLabel}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <PostComparisonBlock rows={postRows} isPro={isPro} />
        <BestTimeCard insight={bestTime} />
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className={cn(dashSectionTitle, "text-[15px] font-medium tracking-tight")}>
          Advanced analytics
        </h2>
        <p className={dashSectionDesc}>
          Trends, channel strength, post comparison, and timing — from your activity
        </p>
      </div>

      <ProAnalyticsGate
        isPro={isPro}
        className="space-y-8"
        overlayTitle="Unlock advanced analytics"
        overlayDescription="See trends and understand what works — views over time, platform mix, growth sorting, and timing hints."
        ctaLabel="Upgrade to Pro"
      >
        {inner}
      </ProAnalyticsGate>
    </section>
  );
}
