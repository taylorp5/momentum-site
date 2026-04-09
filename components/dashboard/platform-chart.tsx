"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashCard,
  dashCardHeader,
  dashSectionDesc,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { PLATFORM_ACCENT } from "@/lib/dashboard-colors";
import type { DistributionPlatform } from "@/types/momentum";

type PlatformChartProps = {
  counts: Partial<Record<DistributionPlatform, number>>;
  dateLabel: string;
  selectedPlatform: DistributionPlatform | "all";
};

export function PlatformChart({ counts, dateLabel, selectedPlatform }: PlatformChartProps) {
  const data = (
    Object.entries(DISTRIBUTION_PLATFORM_LABELS) as [
      DistributionPlatform,
      string,
    ][]
  ).map(([key, label]) => ({
    key,
    platform: label,
    posts: counts[key] ?? 0,
  }));

  const visibleData =
    selectedPlatform === "all"
      ? data
      : data.filter((d) => d.key === selectedPlatform);
  const hasData = visibleData.some((d) => d.posts > 0);
  const denseData = visibleData.filter((d) => d.posts > 0);

  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
          Post volume by platform
        </CardTitle>
        <p className={dashSectionDesc}>
          {selectedPlatform === "all"
            ? `Side-by-side post counts · ${dateLabel}`
            : `${DISTRIBUTION_PLATFORM_LABELS[selectedPlatform]} · ${dateLabel}`}
        </p>
      </CardHeader>
      <CardContent className="h-[220px] px-4 pb-4 pt-3">
        {!hasData ? (
          <div className="flex h-full flex-col rounded-xl border border-[#eeeeee] bg-zinc-50/40">
            <div className="grid grid-cols-3 gap-0 border-b border-zinc-200/80 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              <span>Platform</span>
              <span className="text-center">Posts</span>
              <span className="text-right">Last</span>
            </div>
            <div className="flex-1 divide-y divide-zinc-200/75">
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-3 items-center px-4 py-2.5 text-[12px] text-zinc-400">
                  <span className="h-3 w-24 rounded bg-zinc-200/65" />
                  <span className="mx-auto h-3 w-6 rounded bg-zinc-200/65" />
                  <span className="ml-auto h-3 w-16 rounded bg-zinc-200/65" />
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200/80 px-4 py-3">
              <p className="text-[13px] text-zinc-600">No posts logged yet</p>
              <p className="mt-0.5 text-[12px] text-zinc-500">
                Start by logging your first distribution attempt.
              </p>
              <Link
                href="/distribution"
                className="mt-3 inline-flex text-[13px] font-medium text-zinc-700 underline-offset-4 transition-colors hover:text-zinc-900"
              >
                Open distribution →
              </Link>
            </div>
          </div>
        ) : denseData.length < 2 ? (
          <div className="flex h-full flex-col justify-center rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-6">
            <p className="text-[13px] font-medium text-zinc-800">More data needed for platform comparison</p>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              Log posts on at least two platforms in this range to unlock a meaningful comparison.
            </p>
          </div>
        ) : (
          <div className="h-full space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {denseData.map((row) => (
                <span
                  key={`chip-${row.key}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/80 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600"
                >
                  <PlatformIcon platform={row.key} className="size-3.5 text-zinc-500" />
                  {row.platform}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={visibleData}
                margin={{ left: 2, right: 6, top: 2, bottom: 0 }}
                barCategoryGap="22%"
                barGap={6}
              >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e4e4e7"
                strokeOpacity={0.3}
              />
              <XAxis
                dataKey="platform"
                tick={{ fontSize: 10, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={30}
              />
              <YAxis
                allowDecimals={false}
                width={32}
                tick={{ fontSize: 10, fill: "#71717a" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(24,24,27,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as (typeof visibleData)[number];
                  return (
                    <div className="rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-[12px] shadow-[0_10px_30px_-14px_rgba(15,23,42,0.35)]">
                      <p className="font-semibold text-zinc-900">{row.platform}</p>
                      <p className="mt-1 tabular-nums text-zinc-600">
                        {row.posts.toLocaleString()} {row.posts === 1 ? "post" : "posts"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="posts"
                fill="#a1a1aa"
                radius={[10, 10, 0, 0]}
                maxBarSize={54}
              >
                {visibleData.map((entry) => (
                  <Cell
                    key={`cell-${entry.key}`}
                    fill={PLATFORM_ACCENT[entry.key].bar}
                  />
                ))}
              </Bar>
            </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
