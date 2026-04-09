"use client";

import { Activity, BarChart3, Clock3, Plus, Shapes } from "lucide-react";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DistributionPlatform, Project } from "@/types/momentum";

type Props = {
  totalPosts: number;
  totalViews: number;
  bestPlatformLabel: string;
  bestPlatformKey?: DistributionPlatform;
  lastActivityLabel: string;
  activeStreakDays: number;
  projects: Project[];
  hasProjects: boolean;
};

function Stat({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "neutral" | "accent" | "success";
}) {
  return (
    <div className="flex min-w-[120px] items-start gap-2.5">
      <span
        className={cn(
          "mt-[2px] text-zinc-500",
          tone === "accent" && "text-blue-600",
          tone === "success" && "text-emerald-600"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.04em] text-zinc-600">
          {label}
        </p>
        <p
          className={cn(
            "truncate text-[20px] font-semibold leading-tight tracking-tight text-zinc-900",
            tone === "accent" && "font-semibold text-blue-700",
            tone === "success" && "font-semibold text-emerald-700"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function ProductStateBar({
  totalPosts,
  totalViews,
  bestPlatformLabel,
  bestPlatformKey,
  lastActivityLabel,
  activeStreakDays,
  projects,
  hasProjects,
}: Props) {
  return (
    <Card className="rounded-xl border border-zinc-200/70 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-0">
      <CardContent className="flex flex-col gap-2.5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            label="Posts shipped"
            value={totalPosts.toLocaleString()}
            icon={<BarChart3 className="size-4" />}
          />
          <Stat
            label="Views generated"
            value={totalViews.toLocaleString()}
            icon={<Activity className="size-4" />}
            tone="accent"
          />
          <Stat
            label="Best platform"
            value={bestPlatformLabel}
            icon={
              bestPlatformKey ? (
                <PlatformIcon platform={bestPlatformKey} className="size-4" />
              ) : (
                <Shapes className="size-4" />
              )
            }
            tone="success"
          />
          <Stat
            label="Last shipped"
            value={lastActivityLabel}
            icon={<Clock3 className="size-4" />}
          />
          <Stat
            label="Active streak"
            value={
              activeStreakDays > 0
                ? `🔥 ${activeStreakDays} day${activeStreakDays === 1 ? "" : "s"}`
                : "Start your streak today"
            }
            icon={<span className="text-[16px]">🔥</span>}
            tone={activeStreakDays > 0 ? "success" : "neutral"}
          />
        </div>

        <LogEventDialog projects={projects} defaultEventType="distribution">
          <Button
            type="button"
            disabled={!hasProjects}
            className={cn(
              "h-9 shrink-0 rounded-lg bg-blue-600 px-3.5 text-[14px] font-medium text-white hover:bg-blue-700",
              !hasProjects && "cursor-not-allowed opacity-50"
            )}
            title={!hasProjects ? "Create a project first to log something." : undefined}
          >
            <Plus className="mr-1.5 size-3.5" />
            Log something
          </Button>
        </LogEventDialog>
      </CardContent>
    </Card>
  );
}
