import {
  OVERHEAD_PROJECT_DESCRIPTION,
  OVERHEAD_PROJECT_NAME,
} from "@/lib/constants";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockProjects } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

/**
 * Ensures the user has exactly one `is_overhead` project for general expenses.
 * Idempotent; safe to call from server loaders.
 */
export async function ensureOverheadProject(userId: string): Promise<string> {
  if (isMockDataMode()) {
    const hit = mockProjects.find((p) => p.user_id === userId && p.is_overhead);
    if (hit) return hit.id;
    return mockProjects[0]?.id ?? "";
  }
  if (!isSupabaseConfigured()) {
    return "";
  }

  const supabase = await createClient();

  const { data: existing, error: selErr } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("is_overhead", true)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) return existing.id as string;

  const { data: row, error: insErr } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: OVERHEAD_PROJECT_NAME,
      description: OVERHEAD_PROJECT_DESCRIPTION,
      status: "paused",
      is_overhead: true,
    })
    .select("id")
    .single();

  if (insErr) {
    const { data: again } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .eq("is_overhead", true)
      .maybeSingle();
    if (again?.id) return again.id as string;
    throw insErr;
  }

  return row.id as string;
}
