"use client";

import { PlatformIcon } from "@/components/distribution/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashCard,
  dashCardHeader,
  dashMetricGrowth,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import type { DistributionPerformanceRow, TimingInsight } from "@/lib/data/dashboard";

type DistributionPerformanceCardProps = {
  rows: DistributionPerformanceRow[];
  totalPosts: number;
  totalViews: number;
  allTimePosts: number;
  allTimeViews: number;
  dateLabel: string;
  selectedPlatform: string;
  timingInsight?: TimingInsight | null;
};

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function DistributionPerformanceCard({
  rows,
  totalPosts,
  totalViews,
  allTimePosts,
  allTimeViews,
  dateLabel,
  selectedPlatform,
  timingInsight = null,
}: DistributionPerformanceCardProps) {
  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px] normal-case")}>
          Platform breakdown · {dateLabel.toLowerCase()}
        </CardTitle>
        <p className="mt-0.5 text-[12px] font-normal leading-relaxed text-zinc-500">
          {totalPosts === 0 && allTimePosts === 0 ? (
            <>Nothing in this window yet — log a post to compare channels.</>
          ) : (
            <>
              Compare posts and views by channel ·{" "}
              {selectedPlatform} · {totalPosts}{" "}
              {totalPosts === 1 ? "post" : "posts"} ·{" "}
              <span className={totalViews > 0 ? dashMetricGrowth : "font-medium text-zinc-600"}>
                {number.format(totalViews)}
              </span>{" "}
              views
            </>
          )}
        </p>
        {totalPosts === 0 && allTimePosts > 0 ? (
          <p className="mt-2 text-[12px] font-normal text-zinc-500">
            No posts in this selected window by post date. All time: {allTimePosts} posts ·{" "}
            {number.format(allTimeViews)} views.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="px-0 py-0">
        {timingInsight ? (
          <div className="border-b border-[#eeeeee] bg-orange-50/35 px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-700/90">
              Timing hint
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-zinc-700">
              <span className="font-medium">{timingInsight.weekdayLabel}s</span> look strongest
              in this window —{" "}
              <span className="tabular-nums">{timingInsight.posts}</span>{" "}
              {timingInsight.posts === 1 ? "post" : "posts"}
              {timingInsight.views > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="tabular-nums font-medium text-orange-700">
                    {number.format(timingInsight.views)}
                  </span>{" "}
                  views
                </>
              ) : null}
              .
            </p>
          </div>
        ) : null}
        <ul className="divide-y divide-[#eeeeee]">
          {rows.map((row, idx) => (
            <li
              key={row.platform}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px] transition-colors duration-200 hover:bg-zinc-50/55"
            >
              <span className="min-w-0">
                <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800">
                  <PlatformIcon platform={row.platform} className="size-3.5 text-zinc-500" />
                  {row.label}
                  {idx === 0 && row.views > 0 ? (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200/80">
                      Top
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11px] text-zinc-500">
                  {row.posts} {row.posts === 1 ? "post" : "posts"} logged
                </span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    row.views > 0 ? dashMetricGrowth : "text-zinc-600"
                  )}
                >
                  {number.format(row.views)}
                </span>
                <span className="ml-1 text-[11px] text-zinc-500">views</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
