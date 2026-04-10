import { createClient } from "@/lib/supabase/server";
import { listProjectIds } from "@/lib/data/projects";
import { TIMELINE_BUCKET } from "@/lib/constants";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockTimelineEntries } from "@/lib/mock-data";
import type { TimelineEntry } from "@/types/momentum";

const timelineRow =
  "id, project_id, user_id, type, title, description, image_url, external_url, entry_date, platform, metrics, amount, category, is_recurring, recurrence_label, billing_type, recurring_start_date, recurring_end_date, recurring_active, revenue_source, partner_name, revenue_share_percentage, linked_distribution_entry_id, content_group_id, subreddit, event_family, event_subtype, event_metadata, source_type, source_metadata, created_at, updated_at";

export async function listTimelineForProject(
  userId: string,
  projectId: string
): Promise<TimelineEntry[]> {
  if (isMockDataMode()) {
    return mockTimelineEntries
      .filter((e) => e.project_id === projectId && e.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timeline_entries")
    .select(timelineRow)
    .eq("project_id", projectId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TimelineEntry[];
}

export async function listRecentTimeline(
  userId: string,
  limit: number
): Promise<TimelineEntry[]> {
  if (isMockDataMode()) {
    return [...mockTimelineEntries]
      .filter((e) => e.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("timeline_entries")
    .select(timelineRow)
    .in("project_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TimelineEntry[];
}

/** All timeline rows on a calendar `entry_date` (YYYY-MM-DD). */
export async function listTimelineEntriesOnDate(
  userId: string,
  entryDateYmd: string
): Promise<TimelineEntry[]> {
  const y = entryDateYmd.trim().slice(0, 10);
  if (isMockDataMode()) {
    return mockTimelineEntries
      .filter((e) => e.user_id === userId && e.entry_date.slice(0, 10) === y)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("timeline_entries")
    .select(timelineRow)
    .in("project_id", ids)
    .eq("entry_date", y)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TimelineEntry[];
}

/** Distinct calendar days with any timeline activity on/after `sinceDate` (YYYY-MM-DD). */
export async function listDistinctTimelineEntryDatesSince(
  userId: string,
  sinceDate: string
): Promise<Set<string>> {
  const dates = new Set<string>();
  const since = sinceDate.trim().slice(0, 10);
  if (isMockDataMode()) {
    for (const e of mockTimelineEntries) {
      if (e.user_id === userId && e.entry_date >= since) {
        dates.add(e.entry_date.slice(0, 10));
      }
    }
    return dates;
  }
  if (!isSupabaseConfigured()) {
    return dates;
  }
  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return dates;
  const { data, error } = await supabase
    .from("timeline_entries")
    .select("entry_date")
    .in("project_id", ids)
    .gte("entry_date", since)
    .order("entry_date", { ascending: false })
    .limit(8000);
  if (error) throw error;
  for (const r of data ?? []) {
    dates.add(String((r as { entry_date: string }).entry_date).slice(0, 10));
  }
  return dates;
}

export async function countTimelineEntries(userId: string): Promise<number> {
  if (isMockDataMode()) {
    return mockTimelineEntries.filter((e) => e.user_id === userId).length;
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
    .in("project_id", ids);
  if (error) throw error;
  return count ?? 0;
}

/** Count timeline rows with entry_date on or after `sinceDate` (YYYY-MM-DD). */
export async function countTimelineEntriesSince(
  userId: string,
  sinceDate: string
): Promise<number> {
  if (isMockDataMode()) {
    return mockTimelineEntries.filter(
      (e) => e.user_id === userId && e.entry_date >= sinceDate
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
    .in("project_id", ids)
    .gte("entry_date", sinceDate);
  if (error) throw error;
  return count ?? 0;
}

export async function signTimelineImageUrl(
  storagePath: string | null,
  expiresSec = 3600
): Promise<string | null> {
  if (!storagePath) return null;
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }
  if (isMockDataMode() || !isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(TIMELINE_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function listTimelineByTypesSince(
  userId: string,
  types: TimelineEntry["type"][],
  sinceDate: string,
  untilDate?: string | null,
  /** When set, only rows for this project (must belong to the user). */
  projectId?: string | null
): Promise<TimelineEntry[]> {
  if (types.length === 0) return [];
  if (isMockDataMode()) {
    return mockTimelineEntries
      .filter(
        (e) =>
          e.user_id === userId &&
          types.includes(e.type) &&
          e.entry_date >= sinceDate &&
          (!untilDate || e.entry_date <= untilDate) &&
          (!projectId || e.project_id === projectId)
      )
      .sort(
        (a, b) =>
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );
  }
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return [];
  if (projectId && !ids.includes(projectId)) return [];

  let query = supabase
    .from("timeline_entries")
    .select(timelineRow)
    .in("project_id", projectId ? [projectId] : ids)
    .in("type", types)
    .gte("entry_date", sinceDate);
  if (untilDate?.trim()) {
    query = query.lte("entry_date", untilDate.trim());
  }
  const { data, error } = await query
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as TimelineEntry[];
}

/**
 * Cost rows that may affect [sinceDate, untilDate]: one-time in range, or any
 * monthly/yearly rule (including legacy `is_recurring`).
 */
export async function listCostEntriesForFinancialPeriod(
  userId: string,
  sinceDate: string,
  untilDate: string,
  projectId?: string | null
): Promise<TimelineEntry[]> {
  if (isMockDataMode()) {
    return mockTimelineEntries
      .filter(
        (e) =>
          e.user_id === userId &&
          e.type === "cost" &&
          (!projectId || e.project_id === projectId)
      )
      .sort(
        (a, b) =>
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );
  }
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const ids = await listProjectIds(userId);
  if (ids.length === 0) return [];
  if (projectId && !ids.includes(projectId)) return [];

  const since = sinceDate.trim();
  const until = untilDate.trim();
  const orClause = `and(entry_date.gte.${since},entry_date.lte.${until}),billing_type.eq.monthly,billing_type.eq.yearly,is_recurring.eq.true`;

  const { data, error } = await supabase
    .from("timeline_entries")
    .select(timelineRow)
    .in("project_id", projectId ? [projectId] : ids)
    .eq("type", "cost")
    .or(orClause)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as TimelineEntry[];
}
