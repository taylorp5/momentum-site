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
    <div className="flex min-w-[120px] items-center gap-2">
      <span
        className={cn(
          "text-zinc-400",
          tone === "accent" && "text-blue-600",
          tone === "success" && "text-emerald-600"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-zinc-400">
          {label}
        </p>
        <p
          className={cn(
            "truncate text-[13px] font-medium text-zinc-900",
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
  projects,
  hasProjects,
}: Props) {
  return (
    <Card className="rounded-xl border border-zinc-200/70 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ring-0">
      <CardContent className="flex flex-col gap-2.5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Total posts"
            value={totalPosts.toLocaleString()}
            icon={<BarChart3 className="size-4" />}
          />
          <Stat
            label="Total views"
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
            label="Last activity"
            value={lastActivityLabel}
            icon={<Clock3 className="size-4" />}
          />
        </div>

        <LogEventDialog projects={projects} defaultEventType="distribution">
          <Button
            type="button"
            disabled={!hasProjects}
            className={cn(
              "h-8 shrink-0 rounded-lg bg-blue-600 px-3.5 text-[12.5px] font-medium text-white hover:bg-blue-700",
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
