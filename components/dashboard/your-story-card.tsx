import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashCard,
  dashCardHeader,
  dashMetricGrowth,
  dashSectionDesc,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import type { YourStorySnapshot } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

type YourStoryCardProps = {
  story: YourStorySnapshot;
};

export function YourStoryCard({ story }: YourStoryCardProps) {
  const { totalPosts, totalViews, activeProjectCount, projectCount, summary } =
    story;

  const postsLabel =
    totalPosts === 0
      ? "Start your log"
      : `${totalPosts.toLocaleString()} post${totalPosts === 1 ? "" : "s"}`;
  const viewsLabel =
    totalViews === 0
      ? "Add metrics to see totals"
      : `${totalViews.toLocaleString()} total views`;

  return (
    <Card className={cn(dashCard, "h-full py-0 ring-0 sm:min-h-[232px]")}>
      <CardHeader className={cn(dashCardHeader, "flex flex-row items-center gap-3")}>
        <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600 ring-1 ring-[#eeeeee]">
          <BookOpen className="size-4" strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>Your story</CardTitle>
          <p className={dashSectionDesc}>Progress, not perfection</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-1">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-[#eeeeee] bg-zinc-50/40 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500">
              Posts
            </p>
            <p className="mt-1.5 text-lg font-medium tabular-nums text-zinc-900">
              {postsLabel}
            </p>
          </div>
          <div className="rounded-xl border border-[#eeeeee] bg-zinc-50/40 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500">
              Views
            </p>
            <p
              className={cn(
                "mt-1.5 text-lg font-medium leading-snug",
                totalViews > 0 ? dashMetricGrowth : "text-zinc-700"
              )}
            >
              {viewsLabel}
            </p>
          </div>
        </div>
        {projectCount > 0 ? (
          <p className="text-[12px] font-normal text-zinc-500">
            <span className="font-medium tabular-nums text-zinc-700">{activeProjectCount}</span>{" "}
            active project{activeProjectCount === 1 ? "" : "s"} ·{" "}
            <span className="tabular-nums">{projectCount}</span> total
          </p>
        ) : null}
        <p className="text-[13px] font-normal leading-relaxed text-zinc-500">{summary}</p>
      </CardContent>
    </Card>
  );
}
