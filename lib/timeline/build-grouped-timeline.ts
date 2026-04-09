import { getISOWeek, getISOWeekYear } from "date-fns";
import type { TimelineEntry } from "@/types/momentum";
import { resolveTimelineEventFamily } from "@/lib/timeline/timeline-presentation";

/** Timeline row as loaded on the project page (signed image URL). */
export type TimelineFeedEntry = TimelineEntry & {
  image_signed_url: string | null;
};

export type GroupedTimelineItem =
  | {
      kind: "single";
      entry: TimelineFeedEntry;
      sortTs: number;
    }
  | {
      kind: "work_week";
      weekKey: string;
      entries: TimelineFeedEntry[];
      sortTs: number;
    }
  | {
      kind: "cross_post";
      contentGroupId: string;
      entries: TimelineFeedEntry[];
      groupTitle: string;
      sortTs: number;
    };

function parseEntryDateTs(entryDate: string): number {
  const t = new Date(`${entryDate}T12:00:00`).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function isoWeekKey(entryDate: string): string {
  const d = new Date(`${entryDate}T12:00:00`);
  const y = getISOWeekYear(d);
  const w = getISOWeek(d);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

export function workDurationSeconds(entry: TimelineFeedEntry): number {
  const m = entry.event_metadata as Record<string, unknown> | null | undefined;
  if (m && typeof m.duration_seconds === "number" && Number.isFinite(m.duration_seconds)) {
    return Math.max(0, Math.floor(m.duration_seconds));
  }
  return 0;
}

function maxSortTs(entries: TimelineFeedEntry[]): number {
  return entries.reduce((m, e) => Math.max(m, parseEntryDateTs(e.entry_date)), 0);
}

const MIN_GROUP_SIZE = 2;

/**
 * Cluster related rows into grouped moments (V1: work-by-week, cross-post-by-content-group).
 * Singles stay as `kind: 'single'`. Only groups with ≥2 children.
 */
export function buildGroupedTimelineItems(
  entries: TimelineFeedEntry[],
  contentGroupTitles: Record<string, string>
): GroupedTimelineItem[] {
  const used = new Set<string>();
  const out: GroupedTimelineItem[] = [];

  // Cross-post distribution groups (same content_group_id)
  const distByGroup = new Map<string, TimelineFeedEntry[]>();
  for (const e of entries) {
    if (e.type !== "distribution" || !e.content_group_id) continue;
    const gid = e.content_group_id;
    const list = distByGroup.get(gid) ?? [];
    list.push(e);
    distByGroup.set(gid, list);
  }
  for (const [contentGroupId, groupEntries] of distByGroup) {
    if (groupEntries.length < MIN_GROUP_SIZE) continue;
    for (const e of groupEntries) used.add(e.id);
    const groupTitle =
      contentGroupTitles[contentGroupId]?.trim() ||
      groupEntries[0]?.title?.trim() ||
      "Shared content";
    out.push({
      kind: "cross_post",
      contentGroupId,
      entries: [...groupEntries].sort(
        (a, b) => parseEntryDateTs(b.entry_date) - parseEntryDateTs(a.entry_date)
      ),
      groupTitle,
      sortTs: maxSortTs(groupEntries),
    });
  }

  // Work sessions by ISO week (same project implied — caller scopes to project)
  const workByWeek = new Map<string, TimelineFeedEntry[]>();
  for (const e of entries) {
    if (used.has(e.id)) continue;
    if (e.type !== "work" && resolveTimelineEventFamily(e) !== "work") continue;
    const wk = isoWeekKey(e.entry_date);
    const list = workByWeek.get(wk) ?? [];
    list.push(e);
    workByWeek.set(wk, list);
  }
  for (const [weekKey, groupEntries] of workByWeek) {
    if (groupEntries.length < MIN_GROUP_SIZE) continue;
    for (const e of groupEntries) used.add(e.id);
    out.push({
      kind: "work_week",
      weekKey,
      entries: [...groupEntries].sort(
        (a, b) => parseEntryDateTs(b.entry_date) - parseEntryDateTs(a.entry_date)
      ),
      sortTs: maxSortTs(groupEntries),
    });
  }

  // Remaining as singles
  for (const e of entries) {
    if (used.has(e.id)) continue;
    out.push({
      kind: "single",
      entry: e,
      sortTs: parseEntryDateTs(e.entry_date),
    });
  }

  out.sort((a, b) => b.sortTs - a.sortTs);
  return out;
}
