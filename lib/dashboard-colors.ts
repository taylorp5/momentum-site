import type { DistributionPlatform } from "@/types/momentum";

export const PLATFORM_ACCENT: Record<
  DistributionPlatform,
  { bg: string; text: string; ring: string; bar: string }
> = {
  reddit: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-200/80",
    bar: "#fb923c",
  },
  tiktok: {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    ring: "ring-fuchsia-200/80",
    bar: "#e879f9",
  },
  twitter: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200/80",
    bar: "#7dd3fc",
  },
  product_hunt: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-200/80",
    bar: "#fda4af",
  },
  instagram: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    ring: "ring-pink-200/80",
    bar: "#f9a8d4",
  },
  youtube: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200/80",
    bar: "#fca5a5",
  },
  other: {
    bg: "bg-zinc-100",
    text: "text-zinc-700",
    ring: "ring-zinc-200/90",
    bar: "#a1a1aa",
  },
};

export type DashboardStatusTone = "active" | "attention" | "inactive";

export const STATUS_TONE_CLASS: Record<
  DashboardStatusTone,
  { dot: string; badge: string; label: string }
> = {
  active: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
    label: "Active",
  },
  attention: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-200/80",
    label: "Needs attention",
  },
  inactive: {
    dot: "bg-zinc-400",
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-200/90",
    label: "Inactive",
  },
};

// For upcoming metric deltas (+/-) in dashboard cards.
export function metricTrendTone(delta: number | null | undefined): {
  text: string;
  bg: string;
} {
  if (delta == null || delta === 0) {
    return { text: "text-zinc-600", bg: "bg-zinc-100" };
  }
  if (delta > 0) {
    return { text: "text-emerald-700", bg: "bg-emerald-50" };
  }
  return { text: "text-red-700", bg: "bg-red-50" };
}
