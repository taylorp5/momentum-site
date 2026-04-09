import { createClient } from "@/lib/supabase/server";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockProjects } from "@/lib/mock-data";
import type { Project } from "@/types/momentum";

const projectRow =
  "id, user_id, name, description, status, logo_url, color, icon, created_at, updated_at";

export async function listProjectIds(userId: string): Promise<string[]> {
  if (isMockDataMode()) {
    return mockProjects.filter((p) => p.user_id === userId).map((p) => p.id);
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

/** Lightweight map for activity feeds and joins (id + name only). */
export async function listProjectSummaries(
  userId: string
): Promise<{ id: string; name: string; logo_url: string | null }[]> {
  if (isMockDataMode()) {
    return mockProjects
      .filter((p) => p.user_id === userId)
      .map((p) => ({ id: p.id, name: p.name, logo_url: p.logo_url ?? null }));
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, logo_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; logo_url: string | null }[];
}

export async function listProjects(userId: string): Promise<Project[]> {
  if (isMockDataMode()) {
    return mockProjects.filter((p) => p.user_id === userId);
  }
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(projectRow)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(
  userId: string,
  projectId: string
): Promise<Project | null> {
  if (isMockDataMode()) {
    return (
      mockProjects.find(
        (p) => p.user_id === userId && p.id === projectId
      ) ?? null
    );
  }
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(projectRow)
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

export async function countProjects(userId: string): Promise<number> {
  if (isMockDataMode()) {
    return mockProjects.filter((p) => p.user_id === userId).length;
  }
  if (!isSupabaseConfigured()) {
    return 0;
  }
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}
