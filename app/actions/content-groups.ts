"use server";

import { READ_ONLY_MOCK_ERROR, SUPABASE_REQUIRED_ERROR } from "@/lib/actions/result";
import { requireSessionUser } from "@/lib/auth/user";
import { listContentGroupsForUser } from "@/lib/data/content-groups";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";

export type ListContentGroupsResult =
  | { success: true; groups: { id: string; title: string }[] }
  | { error: string };

export async function listContentGroupsAction(): Promise<ListContentGroupsResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }
  try {
    const rows = await listContentGroupsForUser(user.id);
    return {
      success: true,
      groups: rows.map((g) => ({ id: g.id, title: g.title })),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load groups.";
    return { error: msg };
  }
}
