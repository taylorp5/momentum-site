"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Layers, Timer } from "lucide-react";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { parseDistributionMetrics } from "@/lib/distribution-metrics";
import { presentationShellClass } from "@/lib/timeline/timeline-presentation";
import {
  workDurationSeconds,
  type TimelineFeedEntry,
} from "@/lib/timeline/build-grouped-timeline";
import { cn } from "@/lib/utils";
import type { DistributionPlatform } from "@/types/momentum";

function formatDurationTotal(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatHumanDateRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const parsed = dates
    .map((d) => new Date(`${d}T12:00:00`))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (parsed.length === 0) return "";
  const start = parsed[0]!;
  const end = parsed[parsed.length - 1]!;
  if (start.getTime() === end.getTime()) {
    return format(start, "MMM d");
  }
  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "MMM d")}–${format(end, "d")}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

function workNoteSummary(entries: TimelineFeedEntry[], maxLen = 140): string | null {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    const t = e.description?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    parts.push(t);
    if (parts.length >= 4) break;
  }
  if (parts.length === 0) return null;
  let s = parts.join(", ");
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s;
}

const viewsFmt = new Intl.NumberFormat("en-US");

type GroupShellProps = {
  expanded: boolean;
  onToggle: () => void;
  icon: ReactNode;
  badge: string;
  title: string;
  summaryLines: string[];
  children?: ReactNode;
  shellClass: string;
  accentClass: string;
  ariaLabel: string;
};

function GroupedMomentShell({
  expanded,
  onToggle,
  icon,
  badge,
  title,
  summaryLines,
  children,
  shellClass,
  accentClass,
  ariaLabel,
}: GroupShellProps) {
  return (
    <article
      className={cn(
        presentationShellClass(
          {
            family: "insight",
            badgeLabel: badge,
            Icon: Timer,
            accentBarClass: accentClass,
            shellClass,
          },
          "p-0"
        )
      )}
    >
      <div className="flex flex-col sm:flex-row">
        <div className={cn("hidden w-1 shrink-0 sm:block", accentClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={ariaLabel}
            onClick={onToggle}
            className="flex w-full items-start gap-3 rounded-xl p-5 text-left transition-colors hover:bg-black/[0.02] sm:p-6"
          >
            <span className="mt-0.5 shrink-0 text-zinc-500">{icon}</span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-800 ring-1 ring-zinc-200/80 shadow-sm">
                  {badge}
                </span>
              </div>
              <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-zinc-900 sm:text-[17px]">
                {title}
              </h3>
              {summaryLines.map((line) => (
                <p
                  key={line}
                  className="text-[13px] leading-relaxed text-zinc-600 sm:text-[14px]"
                >
                  {line}
                </p>
              ))}
            </div>
            <span className="mt-1 shrink-0 text-zinc-400">
              {expanded ? (
                <ChevronDown className="size-5" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="size-5" strokeWidth={1.75} />
              )}
            </span>
          </button>
          {expanded && children ? (
            <div className="border-t border-zinc-100/90 px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function GroupedWorkWeekBlock({
  entries,
  expanded,
  onToggle,
  renderChildEntry,
}: {
  entries: TimelineFeedEntry[];
  expanded: boolean;
  onToggle: () => void;
  renderChildEntry: (entry: TimelineFeedEntry) => ReactNode;
}) {
  const dates = entries.map((e) => e.entry_date);
  const rangeLabel = formatHumanDateRange(dates);
  const totalSeconds = entries.reduce((s, e) => s + workDurationSeconds(e), 0);
  const n = entries.length;
  const summary = workNoteSummary(entries);
  const title = rangeLabel ? `Work sessions · ${rangeLabel}` : "Work sessions";

  const statsLine =
    totalSeconds > 0
      ? `${n} session${n === 1 ? "" : "s"} · ${formatDurationTotal(totalSeconds)} total`
      : `${n} session${n === 1 ? "" : "s"}`;

  return (
    <GroupedMomentShell
      expanded={expanded}
      onToggle={onToggle}
      icon={<Timer className="size-5 text-emerald-600" strokeWidth={1.75} />}
      badge="Work sessions"
      title={title}
      summaryLines={[statsLine, ...(summary ? [summary] : [])]}
      shellClass="border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40"
      accentClass="bg-emerald-500"
      ariaLabel={expanded ? "Collapse work sessions" : "Expand work sessions"}
    >
      <div className="space-y-3">
        {entries.map((e) => (
          <div
            key={e.id}
            className="rounded-lg border border-zinc-100/90 bg-zinc-50/40 shadow-none ring-0"
          >
            {renderChildEntry(e)}
          </div>
        ))}
      </div>
    </GroupedMomentShell>
  );
}

export function GroupedCrossPostBlock({
  entries,
  groupTitle,
  expanded,
  onToggle,
  renderChildEntry,
}: {
  entries: TimelineFeedEntry[];
  groupTitle: string;
  expanded: boolean;
  onToggle: () => void;
  renderChildEntry: (entry: TimelineFeedEntry) => ReactNode;
}) {
  const dates = entries.map((e) => e.entry_date);
  const rangeLabel = formatHumanDateRange(dates);

  let totalViews = 0;
  const platformSet = new Set<string>();
  let best: { platform: DistributionPlatform; views: number } | null = null;

  for (const e of entries) {
    const m = parseDistributionMetrics(
      (e.metrics as Record<string, unknown> | null) ?? null
    );
    const v = m.views ?? 0;
    totalViews += v;
    if (e.platform) {
      platformSet.add(DISTRIBUTION_PLATFORM_LABELS[e.platform]);
      if (!best || v > best.views) best = { platform: e.platform, views: v };
    }
  }

  const platformsLine = [...platformSet].sort().join(", ") || "—";
  const postsLine = `${entries.length} post${entries.length === 1 ? "" : "s"} · ${viewsFmt.format(totalViews)} total views`;
  const bestLine =
    best && best.views > 0
      ? `Best: ${DISTRIBUTION_PLATFORM_LABELS[best.platform]} (${viewsFmt.format(best.views)} views)`
      : null;

  const title = rangeLabel ? `Shared content · ${rangeLabel}` : "Shared content";
  const summaryLines = [groupTitle, postsLine, platformsLine, ...(bestLine ? [bestLine] : [])];

  return (
    <GroupedMomentShell
      expanded={expanded}
      onToggle={onToggle}
      icon={<Layers className="size-5 text-sky-600" strokeWidth={1.75} />}
      badge="Shared content"
      title={title}
      summaryLines={summaryLines}
      shellClass="border-sky-200/80 bg-gradient-to-br from-white to-sky-50/35"
      accentClass="bg-sky-500"
      ariaLabel={expanded ? "Collapse shared content" : "Expand shared content"}
    >
      <div className="space-y-3">
        {entries.map((e) => (
          <div
            key={e.id}
            className="overflow-hidden rounded-lg ring-1 ring-zinc-200/60 [&_article]:shadow-none"
          >
            {renderChildEntry(e)}
          </div>
        ))}
      </div>
    </GroupedMomentShell>
  );
}
