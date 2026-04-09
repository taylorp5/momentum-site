"use server";

import { z } from "zod";
import { SUPABASE_REQUIRED_ERROR } from "@/lib/actions/result";
import { requireSessionUser } from "@/lib/auth/user";
import {
  buildFollowUpMetricsLine,
  generateDistributionFollowUpIdeas,
  mockFollowUpIdeas,
  type FollowUpIdea,
} from "@/lib/services/distribution-follow-up-ideas";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { getProject } from "@/lib/data/projects";
import { mockProjects, mockTimelineEntries } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import type { DistributionPlatform, TimelineEntry } from "@/types/momentum";

const inputSchema = z
  .object({
    timeline_entry_id: z.string().uuid(),
  })
  .strict();

export type GenerateDistributionFollowUpsResult =
  | { ideas: FollowUpIdea[] }
  | { error: string };

export async function generateDistributionFollowUpsAction(
  input: unknown
): Promise<GenerateDistributionFollowUpsResult> {
  const user = await requireSessionUser();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  if (isMockDataMode()) {
    const entry = mockTimelineEntries.find(
      (e): e is TimelineEntry & { platform: DistributionPlatform } =>
        e.id === parsed.data.timeline_entry_id &&
        e.user_id === user.id &&
        e.type === "distribution" &&
        e.platform != null
    );
    const proj = entry
      ? mockProjects.find((p) => p.id === entry.project_id)
      : null;
    const title =
      entry && entry.title !== "Distribution post" ? entry.title : "";
    return {
      ideas: mockFollowUpIdeas({
        platformLabel: entry
          ? DISTRIBUTION_PLATFORM_LABELS[entry.platform]
          : "Demo",
        projectName: proj?.name?.trim() || "Demo project",
        title: title || "Example post",
      }),
    };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("timeline_entries")
    .select(
      "id, user_id, project_id, type, platform, title, description, entry_date, metrics"
    )
    .eq("id", parsed.data.timeline_entry_id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!row || row.user_id !== user.id || row.type !== "distribution") {
    return { error: "Post not found." };
  }

  const project = await getProject(user.id, row.project_id as string);
  const projectName = project?.name?.trim() || "Your project";
  const platform = row.platform as DistributionPlatform;

  const metricsLine = buildFollowUpMetricsLine(
    (row.metrics as Record<string, unknown> | null) ?? null
  );

  const gen = await generateDistributionFollowUpIdeas({
    platform,
    projectName,
    postTitle: typeof row.title === "string" ? row.title : "",
    postNotes: typeof row.description === "string" ? row.description : "",
    metricsLine,
    datePosted:
      typeof row.entry_date === "string" ? row.entry_date : "(unknown date)",
  });

  if ("error" in gen) {
    return gen;
  }

  return { ideas: gen.ideas };
}
