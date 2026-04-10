import type { LucideIcon } from "lucide-react";
import {
  CircleDollarSign,
  Hammer,
  ImageIcon,
  Lightbulb,
  Megaphone,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEntry, TimelineEventFamily } from "@/types/momentum";

export const TIMELINE_FILTER_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "work" as const, label: "Work" },
  { value: "build" as const, label: "Build" },
  { value: "distribution" as const, label: "Distribution" },
  { value: "financial" as const, label: "Financial" },
  { value: "asset" as const, label: "Assets" },
  { value: "insight" as const, label: "Insights" },
];

export type TimelineFeedFilter = (typeof TIMELINE_FILTER_OPTIONS)[number]["value"];

/** Subtype strings we use in app + suggested extensions (logo_upload, etc.). */
export const TIMELINE_EVENT_SUBTYPES = {
  work: ["timer_session", "manual_time_entry"] as const,
  build: [
    "build_note",
    "build_idea",
    "build_milestone",
    "experiment",
    "ship_update",
  ] as const,
  distribution: ["distribution_post", "cross_post"] as const,
  financial: ["cost", "revenue", "deal"] as const,
  asset: ["screenshot", "logo_upload"] as const,
  insight: ["reflection"] as const,
} as const;

export function resolveTimelineEventFamily(
  entry: Pick<TimelineEntry, "type" | "event_family">
): TimelineEventFamily {
  if (entry.event_family) {
    return entry.event_family;
  }
  switch (entry.type) {
    case "work":
      return "work";
    case "distribution":
      return "distribution";
    case "cost":
    case "revenue":
    case "deal":
      return "financial";
    case "build":
    case "experiment":
    case "link":
      return "build";
    case "snapshot":
      return "asset";
    case "insight":
    case "note":
      return "insight";
    default:
      return "insight";
  }
}

function financialBadgeLabel(entry: TimelineEntry): string {
  const st = entry.event_subtype;
  if (st === "cost" || entry.type === "cost") return "Cost";
  if (st === "revenue" || entry.type === "revenue") return "Revenue";
  if (st === "deal" || entry.type === "deal") return "Deal · Coming soon";
  return "Financial";
}

export type TimelineCardPresentation = {
  family: TimelineEventFamily;
  badgeLabel: string;
  Icon: LucideIcon;
  /** Left accent bar (project color still used on sm+; this adds family tint). */
  accentBarClass: string;
  /** Card shell: border + light background tint */
  shellClass: string;
};

export function getTimelineCardPresentation(
  entry: TimelineEntry
): TimelineCardPresentation {
  const family = resolveTimelineEventFamily(entry);

  switch (family) {
    case "work":
      return {
        family,
        badgeLabel: "Work session",
        Icon: Timer,
        accentBarClass: "bg-emerald-500",
        shellClass:
          "border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40",
      };
    case "distribution":
      return {
        family,
        badgeLabel: "Distribution",
        Icon: Megaphone,
        accentBarClass: "bg-sky-500",
        shellClass:
          "border-sky-200/80 bg-gradient-to-br from-white to-sky-50/35",
      };
    case "financial":
      return {
        family,
        badgeLabel: financialBadgeLabel(entry),
        Icon: CircleDollarSign,
        accentBarClass: "bg-amber-500",
        shellClass:
          "border-amber-200/80 bg-gradient-to-br from-white to-amber-50/35",
      };
    case "build": {
      const st = entry.event_subtype ?? "";
      let badgeLabel = "Build update";
      if (st === "experiment" || entry.type === "experiment") {
        badgeLabel = "Experiment";
      } else if (st === "build_idea") {
        badgeLabel = "Idea";
      } else if (st === "ship_update") {
        badgeLabel = "Shipped";
      } else if (st === "build_milestone") {
        badgeLabel = "Milestone";
      } else if (entry.type === "link") {
        badgeLabel = "Ship update";
      }
      return {
        family,
        badgeLabel,
        Icon: Hammer,
        accentBarClass: "bg-violet-500",
        shellClass:
          "border-violet-200/80 bg-gradient-to-br from-white to-violet-50/35",
      };
    }
    case "asset": {
      const isLogo = entry.event_subtype === "logo_upload";
      return {
        family,
        badgeLabel: isLogo ? "Brand asset" : "Screenshot",
        Icon: ImageIcon,
        accentBarClass: "bg-slate-500",
        shellClass:
          "border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50",
      };
    }
    case "insight":
    default:
      return {
        family: "insight",
        badgeLabel: "Insight",
        Icon: Lightbulb,
        accentBarClass: "bg-yellow-500",
        shellClass:
          "border-yellow-200/80 bg-gradient-to-br from-white to-yellow-50/30",
      };
  }
}

export function timelineEntryMatchesFilter(
  entry: TimelineEntry,
  filter: TimelineFeedFilter
): boolean {
  if (filter === "all") return true;
  return resolveTimelineEventFamily(entry) === filter;
}

export function presentationShellClass(
  presentation: TimelineCardPresentation,
  className?: string
): string {
  return cn(
    "overflow-hidden rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    presentation.shellClass,
    className
  );
}
