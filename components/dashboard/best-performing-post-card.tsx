import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import {
  dashCard,
  dashCardHeader,
  dashMetricGrowth,
  dashSectionDesc,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { PLATFORM_ACCENT } from "@/lib/dashboard-colors";
import type { BestPerformingPostInfo } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

type BestPerformingPostCardProps = {
  best: BestPerformingPostInfo | null;
};

export function BestPerformingPostCard({ best }: BestPerformingPostCardProps) {
  return (
    <Card
      className={cn(
        dashCard,
        "relative h-full py-0 ring-0 sm:min-h-[232px]",
        "bg-gradient-to-b from-emerald-50/[0.45] to-white"
      )}
    >
      <CardHeader
        className={cn(dashCardHeader, "flex flex-row items-center gap-3 bg-transparent")}
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm ring-1 ring-[#eeeeee]">
          <TrendingUp className="size-4" strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>
            Best performing post
          </CardTitle>
          <p className={dashSectionDesc}>Ranked by views</p>
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4 px-4 pb-4 pt-1">
        {best ? (
          <>
            <p className="text-[15px] font-medium leading-snug text-zinc-900 line-clamp-3">
              {best.title}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset",
                  PLATFORM_ACCENT[best.platform].bg,
                  PLATFORM_ACCENT[best.platform].text,
                  PLATFORM_ACCENT[best.platform].ring
                )}
              >
                <PlatformIcon platform={best.platform} className="size-3.5" />
                {DISTRIBUTION_PLATFORM_LABELS[best.platform]}
              </span>
            </div>
            <div className="rounded-xl border border-[#eeeeee] bg-white/90 px-4 py-3.5 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500">
                Views
              </p>
              <p className={cn(dashMetricGrowth, "mt-1 text-2xl tracking-tight")}>
                {best.views.toLocaleString()}
              </p>
            </div>
            {best.views === 0 ? (
              <p className="text-[13px] font-normal leading-relaxed text-zinc-500">
                Add view counts on your posts to surface a real leader here.
              </p>
            ) : (
              <Link
                href="/distribution"
                className="mt-auto inline-flex w-fit items-center text-[13px] font-medium text-zinc-700 underline-offset-4 transition-colors hover:text-zinc-900"
              >
                View all posts →
              </Link>
            )}
          </>
        ) : (
          <p className="text-[13px] font-normal leading-relaxed text-zinc-500">
            Log a distribution post with a link — we&apos;ll highlight your top performer by views
            here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
