import Link from "next/link";
import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { WeeklyMomentumSnapshot } from "@/lib/data/dashboard";
import {
  dashCard,
  dashMetricActivity,
  dashMetricGrowth,
} from "@/components/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";

type MomentumSummaryCardProps = {
  momentum: WeeklyMomentumSnapshot;
  hasProjects: boolean;
};

export function MomentumSummaryCard({
  momentum,
  hasProjects,
}: MomentumSummaryCardProps) {
  const { hasActivity, postCount, viewCount, platformCount } = momentum;

  return (
    <Card
      className={cn(
        dashCard,
        "h-full overflow-hidden py-0 ring-0 transition-shadow duration-200 ease-out sm:min-h-[232px]"
      )}
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
              <Rocket className="size-5" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0 space-y-2">
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.12em]",
                  dashMetricActivity
                )}
              >
                <span aria-hidden>🚀 </span>Momentum this week
              </p>
              {hasActivity ? (
                <>
                  <p className="text-[17px] font-medium leading-snug tracking-tight text-zinc-900 sm:text-lg">
                    <span className="tabular-nums text-zinc-800">+{postCount}</span>
                    <span className="font-normal text-zinc-500">
                      {" "}
                      {postCount === 1 ? "post" : "posts"}
                    </span>
                    <span className="text-zinc-300"> · </span>
                    <span className={cn(dashMetricGrowth, "text-[1.05em]")}>
                      {viewCount.toLocaleString()}
                    </span>
                    <span className="font-normal text-zinc-500"> views</span>
                    <span className="text-zinc-300"> · </span>
                    <span className="tabular-nums text-zinc-600">{platformCount}</span>
                    <span className="font-normal text-zinc-500">
                      {" "}
                      {platformCount === 1 ? "platform" : "platforms"}
                    </span>
                  </p>
                  <p className="text-[13px] font-normal leading-relaxed text-zinc-500">
                    Keep logging — small streaks turn into real signal.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[16px] font-medium leading-snug text-zinc-900">
                    No activity yet — log your first post to get started
                  </p>
                  <p className="text-[13px] font-normal leading-relaxed text-zinc-500">
                    {hasProjects
                      ? "One entry this week lights up momentum, next moves, and your story."
                      : "Create a project, then log where you showed up online."}
                  </p>
                </>
              )}
            </div>
          </div>
          {!hasActivity && hasProjects ? (
            <Link
              href="/distribution"
              className={cn(
                "inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-4 text-[13px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-emerald-700"
              )}
            >
              Log a post
            </Link>
          ) : null}
        </div>
        <div
          className="h-0.5 w-full bg-gradient-to-r from-emerald-400/25 via-orange-300/30 to-zinc-200/40"
          aria-hidden
        />
      </CardContent>
    </Card>
  );
}
