"use server";

import {
  READ_ONLY_MOCK_ERROR,
  SUPABASE_REQUIRED_ERROR,
  validationError,
} from "@/lib/actions/result";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { isProPlan } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  getContentGroupByIdForUser,
  listContentGroupsForUser,
} from "@/lib/data/content-groups";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";

export type ListContentGroupsResult =
  | { success: true; groups: { id: string; title: string }[] }
  | { error: string };

export type GetContentGroupResult =
  | { success: true; title: string; description: string | null }
  | { error: string };

const createDistributionContentGroupSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().nullable(),
  })
  .strict();

export type CreateDistributionContentGroupResult =
  | { success: true; content_group_id: string }
  | { error: string; fieldErrors?: Record<string, string[]> };

/** Pro: create a content group row for multi-platform distribution (global notes live on the group). */
export async function createDistributionContentGroupAction(
  input: unknown
): Promise<CreateDistributionContentGroupResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }
  const parsed = createDistributionContentGroupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const profile = await getProfile(user.id);
  if (!isProPlan(profile?.plan ?? "free")) {
    return { error: "Pro is required to link multiple platforms to one content item." };
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("content_groups")
    .insert({
      user_id: user.id,
      title: parsed.data.title.trim().slice(0, 200),
      description: parsed.data.description?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, content_group_id: row.id as string };
}

export async function getContentGroupAction(
  groupId: string
): Promise<GetContentGroupResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }
  try {
    const row = await getContentGroupByIdForUser(user.id, groupId);
    if (!row) return { error: "Content group not found." };
    return {
      success: true,
      title: row.title,
      description: row.description,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load content group.";
    return { error: msg };
  }
}

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
