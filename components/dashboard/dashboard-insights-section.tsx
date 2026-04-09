"use client";

import { useState } from "react";
import { usePlan } from "@/components/billing/plan-context";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { DashboardInsightCardMenu } from "@/components/dashboard/dashboard-insight-card-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  dashCard,
} from "@/components/dashboard/dashboard-shell";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
import {
  INSIGHT_ICON_EMOJI,
  type DashboardInsight,
  type InsightLogAction,
} from "@/lib/insights/build-dashboard-insights";
import { cn } from "@/lib/utils";
import type { DistributionPlatform, Project } from "@/types/momentum";

const FREE_INSIGHT_CAP = 2;

type DashboardInsightsSectionProps = {
  insights: DashboardInsight[];
  /** Count before per-insight visibility filters (for “all hidden” empty state). */
  totalGenerated?: number;
  isPro: boolean;
  projects: Project[];
};

function InsightBlock({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {kicker}
      </p>
      <p className="line-clamp-3 text-[12.5px] leading-relaxed text-zinc-600">{children}</p>
    </div>
  );
}

export function DashboardInsightsSection({
  insights,
  totalGenerated = 0,
  isPro,
  projects,
}: DashboardInsightsSectionProps) {
  const { openUpgrade } = usePlan();
  const visible = isPro ? insights : insights.slice(0, FREE_INSIGHT_CAP);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? visible : visible.slice(0, 2);
  const moreCount = Math.max(0, visible.length - shown.length);
  const lockedCount = Math.max(0, insights.length - visible.length);

  const [logOpen, setLogOpen] = useState(false);
  const [logNonce, setLogNonce] = useState(0);
  const [logLaunch, setLogLaunch] = useState<{
    platform?: DistributionPlatform;
    quick: boolean;
  }>({ quick: false });

  function openInsightLog(action: InsightLogAction) {
    setLogLaunch({
      platform: action.platform,
      quick: Boolean(action.quickLog),
    });
    setLogNonce((n) => n + 1);
    setLogOpen(true);
  }

  function onLogOpenChange(next: boolean) {
    setLogOpen(next);
    if (!next) setLogLaunch({ quick: false });
  }

  const canLog = projects.length > 0;

  return (
    <section className="space-y-2.5">
      {insights.length === 0 && totalGenerated > 0 ? (
        <Card className={cn(dashCard, "py-0 ring-0")}>
          <CardContent className="flex gap-3 px-4 py-4">
            <span className="text-lg leading-none" aria-hidden>
              {INSIGHT_ICON_EMOJI.bulb}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[13px] font-medium text-zinc-900">Insights are hidden</p>
              <p className="text-[13px] leading-relaxed text-zinc-500">
                You hid every insight card. Use{" "}
                <span className="font-medium text-zinc-700">Show hidden</span> at the bottom
                to bring them back.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : insights.length === 0 ? (
        <Card className={cn(dashCard, "py-0 ring-0")}>
          <CardContent className="flex gap-3 px-4 py-4">
            <span className="text-lg leading-none" aria-hidden>
              {INSIGHT_ICON_EMOJI.bulb}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[13px] font-medium text-zinc-900">No signals yet</p>
              <p className="text-[13px] leading-relaxed text-zinc-500">
                Log distribution posts (and view counts when you can). Insights appear as
                patterns show up — platform mix, traction, cadence, and trends.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((insight, index) => (
              <Card
                key={insight.id}
                className={cn(
                  dashCard,
                  "flex flex-col py-0 ring-0",
                  index === 0 && "sm:col-span-2 xl:col-span-2",
                  insight.icon === "warning" && "border-amber-200/80 bg-amber-50/20",
                  insight.icon === "bulb" && "border-sky-200/60 bg-sky-50/15"
                )}
              >
                <CardContent className="flex flex-1 flex-col gap-2.5 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="mt-0.5 text-[15px] leading-none" aria-hidden>
                        {INSIGHT_ICON_EMOJI[insight.icon]}
                      </span>
                      <p className="text-[13.5px] font-semibold leading-snug text-zinc-900">
                        {insight.title}
                      </p>
                    </div>
                    <DashboardInsightCardMenu insightId={insight.id} />
                  </div>

                  <div className="space-y-2.5">
                    <InsightBlock kicker="What happened">
                      {insight.whatHappened}
                    </InsightBlock>
                    <InsightBlock kicker="Why it matters">
                      {insight.whyItMatters}
                    </InsightBlock>
                    <InsightBlock kicker="What to do next">
                      {insight.whatToDoNext}
                    </InsightBlock>
                  </div>

                  <div className="mt-auto space-y-3 border-t border-[#eeeeee]/90 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {insight.logActions.map((a) => (
                        <Button
                          key={a.id}
                          type="button"
                          size="sm"
                          className="h-9 rounded-lg bg-zinc-900 px-3.5 text-[12px] font-medium text-white shadow-sm hover:bg-zinc-800"
                          disabled={!canLog}
                          title={
                            !canLog
                              ? "Create a project first to log posts."
                              : undefined
                          }
                          onClick={() => openInsightLog(a)}
                        >
                          {a.platform ? (
                            <PlatformIcon platform={a.platform} className="mr-1.5 size-3.5" />
                          ) : null}
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {moreCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
              onClick={() => setShowAll(true)}
            >
              See more insights
            </Button>
          ) : null}
          {showAll && visible.length > 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-[12px] text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
              onClick={() => setShowAll(false)}
            >
              Show fewer
            </Button>
          ) : null}

          {!isPro && lockedCount > 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-zinc-600">
                <span className="font-medium text-zinc-800">{lockedCount} more insight</span>
                {lockedCount === 1 ? "" : "s"} locked — Pro shows the full picture.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 rounded-lg border-[#eeeeee] text-[12px]"
                onClick={openUpgrade}
              >
                Unlock with Pro
              </Button>
            </div>
          ) : null}
        </>
      )}

      <LogEventDialog
        key={logNonce}
        open={logOpen}
        onOpenChange={onLogOpenChange}
        projects={projects}
        defaultEventType="distribution"
        defaultDistributionPlatform={logLaunch.platform}
        distributionQuickMode={logLaunch.quick}
        distributionInitialFocus={logLaunch.platform ? "post_url" : "platform"}
      />
    </section>
  );
}
