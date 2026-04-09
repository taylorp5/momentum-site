/**
 * Distribution UI reads `timeline_entries` where `type = 'distribution'`.
 * RLS still enforces access via project ownership.
 */

import { createClient } from "@/lib/supabase/server";
import { listProjectIds } from "@/lib/data/projects";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockTimelineEntries } from "@/lib/mock-data";
import { mockContentGroups } from "@/lib/mock-data";
import type {
  ContentGroup,
  DistributionEntry,
  DistributionPlatform,
  TimelineEntry,
} from "@/types/momentum";

/** Cap list responses to keep dashboards predictable (raise if you add pagination). */
export const DISTRIBUTION_LIST_LIMIT = 500;

const timelineDistributionRow =
  "id, project_id, user_id, type, title, description, image_url, external_url, entry_date, platform, metrics, content_group_id, subreddit, source_type, source_metadata, created_at, updated_at";

export type DistributionFilters = {
  projectId?: string;
  platform?: DistributionPlatform | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

function escapeLikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Avoid breaking PostgREST `or=(...)` filter syntax on user input. */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
}

export function timelineRowToDistributionEntry(e: TimelineEntry): DistributionEntry {
  if (e.type !== "distribution" || !e.platform) {
    throw new Error("Expected a distribution timeline row");
  }
  return {
    id: e.id,
    project_id: e.project_id,
    user_id: e.user_id,
    platform: e.platform,
    title: e.title === "Distribution post" ? null : e.title,
    url: e.external_url ?? "",
    notes: e.description,
    date_posted: e.entry_date,
    metrics: e.metrics,
    source_type: e.source_type,
    source_metadata: e.source_metadata,
    created_at: e.created_at,
    updated_at: e.updated_at,
    content_group_id: e.content_group_id ?? null,
    subreddit: e.subreddit ?? null,
  };
}

function mockDistributionForUser(userId: string): DistributionEntry[] {
  return mockTimelineEntries
    .filter(
      (e): e is TimelineEntry & { platform: DistributionPlatform } =>
        e.type === "distribution" &&
        e.user_id === userId &&
        e.platform != null
    )
    .map(timelineRowToDistributionEntry);
}

export async function listDistributionForProject(
  userId: string,
  projectId: string
): Promise<DistributionEntry[]> {
  if (isMockDataMode()) {
    return mockDistributionForUser(userId)
      .filter((e) => e.project_id === projectId)
      .sort(
        (a, b) =>
          new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
      );
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_entries")
    .select(timelineDistributionRow)
    .eq("project_id", projectId)
    .eq("type", "distribution")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(DISTRIBUTION_LIST_LIMIT);
  if (error) throw error;
  return (data ?? []).map((row) =>
    timelineRowToDistributionEntry(row as TimelineEntry)
  );
}

export async function listDistributionEntries(
  userId: string,
  filters: DistributionFilters = {}
): Promise<DistributionEntry[]> {
  if (isMockDataMode()) {
    const rows = mockDistributionForUser(userId);
    return applyDistributionFilters(rows, filters);
  }
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return [];

  let q = supabase
    .from("timeline_entries")
    .select(timelineDistributionRow)
    .eq("type", "distribution");

  const projectFilter =
    filters.projectId && filters.projectId !== "all"
      ? filters.projectId
      : null;
  if (projectFilter) {
    if (!ids.includes(projectFilter)) return [];
    q = q.eq("project_id", projectFilter);
  } else {
    q = q.in("project_id", ids);
  }

  if (filters.platform && filters.platform !== "all") {
    q = q.eq("platform", filters.platform);
  }
  if (filters.dateFrom) {
    q = q.gte("entry_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    q = q.lte("entry_date", filters.dateTo);
  }

  const term = sanitizeSearchTerm(filters.search?.trim() ?? "");
  if (term) {
    const pattern = `%${escapeLikePattern(term)}%`;
    q = q.or(
      `title.ilike.${pattern},description.ilike.${pattern},external_url.ilike.${pattern}`
    );
  }

  q = q
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(DISTRIBUTION_LIST_LIMIT);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) =>
    timelineRowToDistributionEntry(row as TimelineEntry)
  );
}

/** Sum of revenue amounts linked to each distribution `timeline_entries.id`. */
export async function getAttributedRevenueByDistributionId(
  userId: string
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (isMockDataMode()) {
    for (const e of mockTimelineEntries) {
      if (e.user_id !== userId || e.type !== "revenue") continue;
      const lid = e.linked_distribution_entry_id;
      if (
        !lid ||
        typeof e.amount !== "number" ||
        !Number.isFinite(e.amount)
      ) {
        continue;
      }
      out[lid] = (out[lid] ?? 0) + e.amount;
    }
    return out;
  }
  if (!isSupabaseConfigured()) {
    return {};
  }

  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from("timeline_entries")
    .select("amount, linked_distribution_entry_id")
    .in("project_id", ids)
    .eq("type", "revenue")
    .not("linked_distribution_entry_id", "is", null);

  if (error) throw error;
  for (const row of data ?? []) {
    const r = row as { amount: unknown; linked_distribution_entry_id: unknown };
    const lid =
      typeof r.linked_distribution_entry_id === "string"
        ? r.linked_distribution_entry_id
        : null;
    const amt = typeof r.amount === "number" ? r.amount : NaN;
    if (!lid || !Number.isFinite(amt)) continue;
    out[lid] = (out[lid] ?? 0) + amt;
  }
  return out;
}

export async function listRecentDistributionEntries(
  userId: string,
  limit: number
): Promise<Pick<
  DistributionEntry,
  | "id"
  | "project_id"
  | "platform"
  | "title"
  | "notes"
  | "date_posted"
  | "created_at"
>[]> {
  if (isMockDataMode()) {
    return mockDistributionForUser(userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit)
      .map((e) => ({
        id: e.id,
        project_id: e.project_id,
        platform: e.platform,
        title: e.title,
        notes: e.notes,
        date_posted: e.date_posted,
        created_at: e.created_at,
      }));
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("timeline_entries")
    .select(
      "id, project_id, platform, title, description, entry_date, created_at"
    )
    .eq("type", "distribution")
    .in("project_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    project_id: row.project_id as string,
    platform: row.platform as DistributionPlatform,
    title: row.title as string | null,
    notes: row.description as string,
    date_posted: row.entry_date as string,
    created_at: row.created_at as string,
  }));
}

/** Count distribution rows with entry_date on or after `sinceDate` (YYYY-MM-DD). */
export async function countDistributionEntriesSince(
  userId: string,
  sinceDate: string
): Promise<number> {
  if (isMockDataMode()) {
    return mockDistributionForUser(userId).filter(
      (e) => e.date_posted >= sinceDate
    ).length;
  }
  if (!isSupabaseConfigured()) {
    return 0;
  }
  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return 0;
  const { count, error } = await supabase
    .from("timeline_entries")
    .select("*", { count: "exact", head: true })
    .eq("type", "distribution")
    .in("project_id", ids)
    .gte("entry_date", sinceDate);
  if (error) throw error;
  return count ?? 0;
}

function applyDistributionFilters(
  rows: DistributionEntry[],
  filters: DistributionFilters
): DistributionEntry[] {
  let out = rows;
  if (filters.projectId && filters.projectId !== "all") {
    out = out.filter((r) => r.project_id === filters.projectId);
  }
  if (filters.platform && filters.platform !== "all") {
    out = out.filter((r) => r.platform === filters.platform);
  }
  if (filters.dateFrom) {
    out = out.filter((r) => r.date_posted >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    out = out.filter((r) => r.date_posted <= filters.dateTo!);
  }
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    out = out.filter((r) => {
      const hay = [r.title, r.notes, r.url, r.platform, r.subreddit]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return out
    .sort(
      (a, b) =>
        new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
    )
    .slice(0, DISTRIBUTION_LIST_LIMIT);
}

export async function countDistributionEntries(
  userId: string,
  filters: DistributionFilters = {}
): Promise<number> {
  if (isMockDataMode()) {
    return applyDistributionFilters(mockDistributionForUser(userId), filters)
      .length;
  }
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return 0;

  let q = supabase
    .from("timeline_entries")
    .select("*", { count: "exact", head: true })
    .eq("type", "distribution");

  const projectFilter =
    filters.projectId && filters.projectId !== "all"
      ? filters.projectId
      : null;
  if (projectFilter) {
    if (!ids.includes(projectFilter)) return 0;
    q = q.eq("project_id", projectFilter);
  } else {
    q = q.in("project_id", ids);
  }

  if (filters.platform && filters.platform !== "all") {
    q = q.eq("platform", filters.platform);
  }
  if (filters.dateFrom) {
    q = q.gte("entry_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    q = q.lte("entry_date", filters.dateTo);
  }

  const term = sanitizeSearchTerm(filters.search?.trim() ?? "");
  if (term) {
    const pattern = `%${escapeLikePattern(term)}%`;
    q = q.or(
      `title.ilike.${pattern},description.ilike.${pattern},external_url.ilike.${pattern}`
    );
  }

  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function platformCounts(
  userId: string
): Promise<Partial<Record<DistributionPlatform, number>>> {
  if (isMockDataMode()) {
    const rows = mockDistributionForUser(userId);
    const acc: Partial<Record<DistributionPlatform, number>> = {};
    for (const r of rows) {
      acc[r.platform] = (acc[r.platform] ?? 0) + 1;
    }
    return acc;
  }
  if (!isSupabaseConfigured()) {
    return {};
  }

  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from("timeline_entries")
    .select("platform")
    .eq("type", "distribution")
    .in("project_id", ids);

  if (error) throw error;

  const acc: Partial<Record<DistributionPlatform, number>> = {};
  for (const row of data ?? []) {
    const p = row.platform as DistributionPlatform;
    acc[p] = (acc[p] ?? 0) + 1;
  }
  return acc;
}

export type CrossPostGroupComparison = {
  group: ContentGroup;
  entries: DistributionEntry[];
};

/** Distribution rows grouped by `content_group_id` for cross-post comparison (Pro UI). */
export async function listCrossPostComparisons(
  userId: string
): Promise<CrossPostGroupComparison[]> {
  const entries = await listDistributionEntries(userId, {});
  const inGroup = entries.filter((e) => e.content_group_id);
  if (inGroup.length === 0) return [];

  const groupIds = [...new Set(inGroup.map((e) => e.content_group_id!))];

  if (isMockDataMode()) {
    const groups = mockContentGroups.filter((g) => groupIds.includes(g.id));
    return groups.map((group) => ({
      group,
      entries: inGroup
        .filter((e) => e.content_group_id === group.id)
        .sort(
          (a, b) =>
            new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
        ),
    }));
  }
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: groupRows, error: gErr } = await supabase
    .from("content_groups")
    .select("id, user_id, title, description, created_at, updated_at")
    .eq("user_id", userId)
    .in("id", groupIds);
  if (gErr) throw gErr;

  const groups = (groupRows ?? []) as ContentGroup[];
  return groups.map((group) => ({
    group,
    entries: inGroup
      .filter((e) => e.content_group_id === group.id)
      .sort(
        (a, b) =>
          new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
      ),
  }));
}
