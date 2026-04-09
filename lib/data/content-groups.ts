import { createClient } from "@/lib/supabase/server";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockContentGroups } from "@/lib/mock-data";
import type { ContentGroup } from "@/types/momentum";

export async function getContentGroupByIdForUser(
  userId: string,
  groupId: string
): Promise<ContentGroup | null> {
  if (isMockDataMode()) {
    return mockContentGroups.find((g) => g.user_id === userId && g.id === groupId) ?? null;
  }
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_groups")
    .select("id, user_id, title, description, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  return (data as ContentGroup) ?? null;
}

export async function listContentGroupsForUser(userId: string): Promise<ContentGroup[]> {
  if (isMockDataMode()) {
    return mockContentGroups.filter((g) => g.user_id === userId);
  }
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_groups")
    .select("id, user_id, title, description, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as ContentGroup[];
}

/** Resolve titles for cross-post group cards on the project timeline. */
export async function getContentGroupTitlesByIds(
  userId: string,
  ids: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  if (isMockDataMode()) {
    const map: Record<string, string> = {};
    for (const g of mockContentGroups) {
      if (g.user_id === userId && unique.includes(g.id)) {
        map[g.id] = g.title;
      }
    }
    return map;
  }
  if (!isSupabaseConfigured()) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_groups")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", unique);

  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[(row as { id: string; title: string }).id] = (
      row as { id: string; title: string }
    ).title;
  }
  return map;
}
