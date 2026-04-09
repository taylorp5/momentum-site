import { createClient } from "@/lib/supabase/server";
import { listProjectIds } from "@/lib/data/projects";
import { TIMELINE_BUCKET } from "@/lib/constants";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockTimelineEntries } from "@/lib/mock-data";
import type { TimelineEntry } from "@/types/momentum";

const timelineRow =
  "id, project_id, user_id, type, title, description, image_url, external_url, entry_date, platform, metrics, amount, category, is_recurring, recurrence_label, revenue_source, partner_name, revenue_share_percentage, linked_distribution_entry_id, content_group_id, subreddit, event_family, event_subtype, event_metadata, source_type, source_metadata, created_at, updated_at";

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
  untilDate?: string | null
): Promise<TimelineEntry[]> {
  if (types.length === 0) return [];
  if (isMockDataMode()) {
    return mockTimelineEntries
      .filter(
        (e) =>
          e.user_id === userId &&
          types.includes(e.type) &&
          e.entry_date >= sinceDate &&
          (!untilDate || e.entry_date <= untilDate)
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

  let query = supabase
    .from("timeline_entries")
    .select(timelineRow)
    .in("project_id", ids)
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
