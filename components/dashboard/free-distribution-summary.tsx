import { Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashCard,
  dashCardHeader,
  dashMetricGrowth,
  dashSectionDesc,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DistributionPlatform } from "@/types/momentum";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

type FreeDistributionSummaryProps = {
  totalViews: number;
  totalPosts: number;
  allTimeViews: number;
  dateLabel: string;
  platformFilter: DistributionPlatform | "all";
};

/**
 * Free-tier snapshot: totals only. Best post lives in {@link BestPerformingPostCard}.
 */
export function FreeDistributionSummary({
  totalViews,
  totalPosts,
  allTimeViews,
  dateLabel,
  platformFilter,
}: FreeDistributionSummaryProps) {
  const platformSuffix =
    platformFilter === "all"
      ? ""
      : ` · ${DISTRIBUTION_PLATFORM_LABELS[platformFilter]}`;

  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-600 shadow-sm ring-1 ring-[#eeeeee]">
            <Eye className="size-4" strokeWidth={1.6} aria-hidden />
          </span>
          <div>
            <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
              Your reach
            </CardTitle>
            <p className={dashSectionDesc}>
              Total views for {dateLabel.toLowerCase()}
              {platformSuffix}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <div className="rounded-xl border border-[#eeeeee] bg-white/90 px-4 py-3.5 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500">
            Views in this period
          </p>
          <p className={cn(dashMetricGrowth, "mt-1 text-3xl tracking-tight")}>
            {number.format(totalViews)}
          </p>
          <p className="mt-2 text-[12px] font-normal leading-relaxed text-zinc-500">
            {totalPosts === 0 && allTimeViews === 0 ? (
              <>Log posts with view counts to see traction here.</>
            ) : (
              <>
                {totalPosts} {totalPosts === 1 ? "post" : "posts"} in this window ·{" "}
                <span className="tabular-nums text-zinc-600">
                  {number.format(allTimeViews)}
                </span>{" "}
                views all time
              </>
            )}
          </p>
        </div>
        <p className="text-[12px] font-normal leading-relaxed text-zinc-500">
          Your best post is highlighted above.{" "}
          <span className="text-zinc-700">
            Pro adds views over time, per-platform trends, post comparisons, and
            which days pull the most engagement.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
