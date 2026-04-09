import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { MOCK_USER_ID } from "@/lib/constants";
import { mockProfile } from "@/lib/mock-data";
import { parseUserPlan } from "@/lib/plan";
import type { Profile } from "@/types/momentum";

export type SessionUser = {
  id: string;
  email: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isMockDataMode()) {
    return { id: MOCK_USER_ID, email: "demo@momentum.app" };
  }
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (isMockDataMode()) {
    return { ...mockProfile, id: userId };
  }
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Profile & { plan?: string };
  return {
    ...row,
    plan: parseUserPlan(row.plan),
  };
}

export async function requireProfile(userId: string): Promise<Profile> {
  const profile = await getProfile(userId);
  if (!profile) {
    redirect("/login");
  }
  return profile;
}
