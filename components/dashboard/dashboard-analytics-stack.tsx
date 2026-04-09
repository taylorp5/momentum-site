"use client";

import { ProAnalyticsGate } from "@/components/billing/pro-analytics-gate";
import { DistributionPerformanceCard } from "@/components/dashboard/distribution-performance-card";
import { FreeDistributionSummary } from "@/components/dashboard/free-distribution-summary";
import { ViewsOverTimeChart } from "@/components/dashboard/views-over-time-chart";
import type {
  DistributionPerformanceRow,
  TimingInsight,
} from "@/lib/data/dashboard";
import type { ViewsTimeSeriesPoint } from "@/lib/data/views-time-series";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import type { DistributionPlatform } from "@/types/momentum";

type Props = {
  isPro: boolean;
  selectedPlatform: DistributionPlatform | "all";
  perf: {
    rows: DistributionPerformanceRow[];
    totalPosts: number;
    totalViews: number;
    allTimePosts: number;
    allTimeViews: number;
    dateLabel: string;
    selectedPlatform: DistributionPlatform | "all";
    viewsTimeSeries: ViewsTimeSeriesPoint[];
    viewsTimeBucket: "day" | "week";
    timingInsight: TimingInsight | null;
  };
  /** When false, that block is omitted (dashboard customization). */
  showFreeSummary?: boolean;
  showViewsOverTime?: boolean;
  showPerformanceTable?: boolean;
};

export function DashboardAnalyticsStack({
  isPro,
  selectedPlatform,
  perf,
  showFreeSummary = true,
  showViewsOverTime = true,
  showPerformanceTable = true,
}: Props) {
  const gatedBlocks = (
    <>
      {showViewsOverTime ? (
        <ViewsOverTimeChart
          points={perf.viewsTimeSeries}
          bucket={perf.viewsTimeBucket}
          dateLabel={perf.dateLabel}
        />
      ) : null}
      {showPerformanceTable ? (
        <DistributionPerformanceCard
          rows={perf.rows}
          totalPosts={perf.totalPosts}
          totalViews={perf.totalViews}
          allTimePosts={perf.allTimePosts}
          allTimeViews={perf.allTimeViews}
          dateLabel={perf.dateLabel}
          selectedPlatform={
            selectedPlatform === "all"
              ? "All platforms"
              : DISTRIBUTION_PLATFORM_LABELS[selectedPlatform]
          }
          timingInsight={perf.timingInsight}
        />
      ) : null}
    </>
  );

  const hasGatedContent = showViewsOverTime || showPerformanceTable;

  return (
    <div className="space-y-5">
      {!isPro && showFreeSummary ? (
        <FreeDistributionSummary
          totalViews={perf.totalViews}
          totalPosts={perf.totalPosts}
          allTimeViews={perf.allTimeViews}
          dateLabel={perf.dateLabel}
          platformFilter={selectedPlatform}
        />
      ) : null}
      {hasGatedContent ? (
        <ProAnalyticsGate isPro={isPro} className="space-y-5">
          {gatedBlocks}
        </ProAnalyticsGate>
      ) : null}
    </div>
  );
}
