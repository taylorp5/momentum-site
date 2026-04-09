"use server";

import { z } from "zod";
import { SUPABASE_REQUIRED_ERROR } from "@/lib/actions/result";
import { requireSessionUser, getProfile } from "@/lib/auth/user";
import { isProPlan } from "@/lib/plan";
import {
  mockRewriteResult,
  platformLabelForRewrite,
  rewriteDistributionPost,
  type RewriteResult,
  type RewriteTone,
} from "@/lib/services/distribution-rewrite";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DistributionPlatform } from "@/types/momentum";

const toneSchema = z.enum(["casual", "bold", "story_driven"]);

const inputSchema = z
  .object({
    timeline_entry_id: z.string().uuid(),
    source_text: z.string().min(1).max(15000),
    tone: toneSchema.optional(),
  })
  .strict();

export type RewriteDistributionPostResult =
  | { result: RewriteResult; tier: "basic" | "pro" }
  | { error: string };

export async function rewriteDistributionPostAction(
  input: unknown
): Promise<RewriteDistributionPostResult> {
  const user = await requireSessionUser();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const profile = await getProfile(user.id);
  const pro = isProPlan(profile?.plan ?? "free");
  const toneEffective: RewriteTone | null = pro
    ? (parsed.data.tone ?? "casual")
    : null;

  if (isMockDataMode()) {
    return {
      result: mockRewriteResult(parsed.data.source_text, toneEffective),
      tier: pro ? "pro" : "basic",
    };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("timeline_entries")
    .select("id, user_id, type, platform")
    .eq("id", parsed.data.timeline_entry_id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row || row.user_id !== user.id || row.type !== "distribution") {
    return { error: "Post not found." };
  }

  const platform = row.platform as DistributionPlatform;
  const platformLabel = platformLabelForRewrite(platform);

  const out = await rewriteDistributionPost({
    sourceText: parsed.data.source_text,
    platformLabel,
    tone: toneEffective,
    tier: pro ? "pro" : "basic",
  });

  if ("error" in out) return out;
  return { result: out.result, tier: pro ? "pro" : "basic" };
}
