"use server";

import { revalidatePath } from "next/cache";
import {
  READ_ONLY_MOCK_ERROR,
  SUPABASE_REQUIRED_ERROR,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { isProPlan } from "@/lib/plan";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import {
  DISTRIBUTION_ATTACHMENTS_BUCKET,
  DISTRIBUTION_PLATFORM_LABELS,
} from "@/lib/constants";
import { listDistributionForProject } from "@/lib/data/distribution";
import { getProject } from "@/lib/data/projects";
import { parseDistributionMetrics } from "@/lib/distribution-metrics";
import { extractDistributionMetricsFromImage } from "@/lib/services/distribution-attachment-extractor";
import { insertTimelineEntry } from "@/lib/services/timeline-entries";
import type { LogEventInput } from "@/lib/validations/timeline";
import { createClient } from "@/lib/supabase/server";
import type {
  DistributionAttachment,
  DistributionMetricSnapshotRow,
  DistributionMetrics,
  DistributionPlatform,
} from "@/types/momentum";
import { z } from "zod";

function revalidateDistributionSurfaces(projectId?: string) {
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/distribution");
  revalidatePath("/dashboard");
  revalidatePath("/distribution", "page");
  revalidatePath("/dashboard", "page");
}

export type CreateDistributionAttachmentResult =
  | { success: true; attachment_id: string }
  | { error: string; fieldErrors?: Record<string, string[]> };

export type ApplyExtractedMetricsResult =
  | { success: true; metrics: DistributionMetrics }
  | { error: string; fieldErrors?: Record<string, string[]> };

const updateDistributionEntrySchema = z
  .object({
    id: z.string().uuid(),
    project_id: z.string().uuid(),
    platform: z.enum([
      "reddit",
      "tiktok",
      "twitter",
      "product_hunt",
      "instagram",
      "youtube",
      "other",
    ]),
    title: z.string().max(200).optional().nullable(),
    url: z.union([z.string().url(), z.literal("")]).default(""),
    notes: z.string().max(5000).optional().default(""),
    date_posted: z.string().min(1),
    subreddit: z.string().max(120).optional().nullable(),
    content_group_id: z.string().uuid().optional().nullable(),
    metrics: z
      .object({
        views: z.number().int().min(0).optional(),
        likes: z.number().int().min(0).optional(),
        comments: z.number().int().min(0).optional(),
        notes_on_performance: z.string().max(600).optional(),
        snapshots: z
          .array(
            z.object({
              at: z.string().min(1),
              views: z.number().int().min(0).optional(),
              likes: z.number().int().min(0).optional(),
              comments: z.number().int().min(0).optional(),
            })
          )
          .optional(),
        promo_spend: z.number().nonnegative().optional(),
      })
      .optional(),
  })
  .strict();

export async function updateDistributionEntryAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = updateDistributionEntrySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const profile = await getProfile(user.id);
  const pro = isProPlan(profile?.plan ?? "free");

  const sub =
    parsed.data.platform === "reddit" && parsed.data.subreddit?.trim()
      ? parsed.data.subreddit
          .trim()
          .replace(/^r\//i, "")
          .replace(/^\//, "")
          .slice(0, 120) || null
      : null;

  const contentGroupId: string | null = pro
    ? parsed.data.content_group_id ?? null
    : null;
  if (pro && contentGroupId) {
    const { data: own, error: ownErr } = await supabase
      .from("content_groups")
      .select("id")
      .eq("id", contentGroupId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (ownErr) return { error: ownErr.message };
    if (!own) return { error: "Invalid content group." };
  }
  const { error } = await supabase
    .from("timeline_entries")
    .update({
      project_id: parsed.data.project_id,
      platform: parsed.data.platform,
      title: parsed.data.title?.trim() || "Distribution post",
      description: parsed.data.notes,
      external_url: parsed.data.url?.trim() || null,
      entry_date: parsed.data.date_posted,
      metrics: parsed.data.metrics ?? null,
      subreddit: sub,
      content_group_id: contentGroupId,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .eq("type", "distribution");
  if (error) return { error: error.message };

  revalidateDistributionSurfaces(parsed.data.project_id);
  return { success: true };
}

const deleteDistributionEntrySchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
});

export async function deleteDistributionEntryAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = deleteDistributionEntrySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("timeline_entries")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .eq("type", "distribution");
  if (error) return { error: error.message };

  revalidateDistributionSurfaces(parsed.data.project_id);
  return { success: true };
}

function normalizeDistributionSubreddit(
  platform: DistributionPlatform,
  raw: string | null | undefined
): string | null {
  if (platform !== "reddit") return null;
  const s = raw?.trim();
  if (!s) return null;
  return s.replace(/^r\//i, "").replace(/^\//, "").slice(0, 120) || null;
}

function buildDistributionRowDescription(
  globalNotes: string,
  platformNotes: string,
  storage: "grouped" | "combined"
): string {
  const g = globalNotes.trim();
  const p = platformNotes.trim();
  if (storage === "grouped") return p;
  return [g, p].filter(Boolean).join("\n\n");
}

async function deleteContentGroupIfOrphaned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupId: string
) {
  const { count, error } = await supabase
    .from("timeline_entries")
    .select("id", { count: "exact", head: true })
    .eq("content_group_id", groupId);
  if (error) return;
  if ((count ?? 0) === 0) {
    await supabase.from("content_groups").delete().eq("id", groupId).eq("user_id", userId);
  }
}

const saveDistributionBundlePlatformSchema = z
  .object({
    timeline_id: z.string().uuid().optional(),
    platform: z.enum([
      "reddit",
      "tiktok",
      "twitter",
      "product_hunt",
      "instagram",
      "youtube",
      "other",
    ]),
    entry_date: z.string().min(1),
    subreddit: z.string().max(120).nullable().optional(),
    url: z.string().url(),
    notes: z.string().max(5000).optional().default(""),
    metrics: updateDistributionEntrySchema.shape.metrics.optional().nullable(),
  })
  .strict();

const saveDistributionBundleSchema = z
  .object({
    project_id: z.string().uuid(),
    content_title: z.string().max(200).optional().nullable(),
    global_notes: z.string().max(5000).optional().default(""),
    existing_content_group_id: z.string().uuid().nullable().optional(),
    platforms: z.array(saveDistributionBundlePlatformSchema).min(1),
    deleted_timeline_ids: z.array(z.string().uuid()).default([]),
  })
  .strict();

/** Create/update/delete distribution timeline rows as one content + platform entries. */
export async function saveDistributionBundleAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = saveDistributionBundleSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const profile = await getProfile(user.id);
  const pro = isProPlan(profile?.plan ?? "free");

  const {
    project_id,
    content_title,
    global_notes,
    existing_content_group_id,
    platforms,
    deleted_timeline_ids,
  } = parsed.data;

  const titleStr = content_title?.trim() || "Distribution post";
  const oldGroupId = existing_content_group_id ?? null;

  const proj = await getProject(project_id, user.id);
  if (!proj) return { error: "Invalid project." };

  const activeTimelineIds = new Set<string>();
  for (const p of platforms) {
    if (p.timeline_id) activeTimelineIds.add(p.timeline_id);
  }
  for (const id of deleted_timeline_ids) {
    if (activeTimelineIds.has(id)) {
      return { error: "Invalid save: a removed row is still listed as active." };
    }
  }

  const idsToVerify = [...activeTimelineIds, ...deleted_timeline_ids];
  if (idsToVerify.length > 0) {
    const { data: foundRows, error: qErr } = await supabase
      .from("timeline_entries")
      .select("id, project_id")
      .eq("user_id", user.id)
      .eq("type", "distribution")
      .in("id", idsToVerify);
    if (qErr) return { error: qErr.message };
    const byId = new Map((foundRows ?? []).map((r) => [r.id as string, r]));
    for (const id of idsToVerify) {
      const r = byId.get(id);
      if (!r || r.project_id !== project_id) {
        return { error: "Invalid distribution entry." };
      }
    }
  }

  const n = platforms.length;
  let groupId: string | null = null;
  let storage: "grouped" | "combined" = "combined";

  if (n > 1 && pro) {
    storage = "grouped";
    if (oldGroupId) {
      const { data: own, error: ownErr } = await supabase
        .from("content_groups")
        .select("id")
        .eq("id", oldGroupId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (ownErr) return { error: ownErr.message };
      if (!own) return { error: "Invalid content group." };
      groupId = oldGroupId;
      const { error: upG } = await supabase
        .from("content_groups")
        .update({
          title: titleStr.slice(0, 200),
          description: global_notes.trim() || null,
        })
        .eq("id", groupId)
        .eq("user_id", user.id);
      if (upG) return { error: upG.message };
    } else {
      const { data: row, error: cgErr } = await supabase
        .from("content_groups")
        .insert({
          user_id: user.id,
          title: titleStr.slice(0, 200),
          description: global_notes.trim() || null,
        })
        .select("id")
        .single();
      if (cgErr) return { error: cgErr.message };
      groupId = row.id as string;
    }
  } else {
    storage = "combined";
    groupId = null;
  }

  for (const id of deleted_timeline_ids) {
    const { error: delErr } = await supabase
      .from("timeline_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("type", "distribution");
    if (delErr) return { error: delErr.message };
  }

  for (const p of platforms) {
    const sub = normalizeDistributionSubreddit(p.platform, p.subreddit);
    const desc = buildDistributionRowDescription(
      global_notes,
      p.notes,
      storage
    );
    const metricsJson = p.metrics ?? null;

    if (p.timeline_id) {
      const { error: upErr } = await supabase
        .from("timeline_entries")
        .update({
          project_id,
          platform: p.platform,
          title: titleStr,
          description: desc,
          external_url: p.url.trim() || null,
          entry_date: p.entry_date,
          metrics: metricsJson,
          subreddit: sub,
          content_group_id: groupId,
        })
        .eq("id", p.timeline_id)
        .eq("user_id", user.id)
        .eq("type", "distribution");
      if (upErr) return { error: upErr.message };
    } else {
      const { error: insErr } = await insertTimelineEntry(supabase, {
        userId: user.id,
        data: {
          type: "distribution",
          project_id,
          entry_date: p.entry_date,
          platform: p.platform,
          title: titleStr,
          notes: desc,
          url: p.url,
          image_storage_path: null,
          metrics: metricsJson ?? undefined,
          subreddit: sub,
          content_group_id: groupId,
          new_content_group_title: null,
          new_content_group_description: null,
        } as LogEventInput,
        provenance: { source_type: "manual", source_metadata: null },
      });
      if (insErr) return { error: insErr.message };
    }
  }

  if (oldGroupId && oldGroupId !== groupId) {
    await deleteContentGroupIfOrphaned(supabase, user.id, oldGroupId);
  }

  revalidateDistributionSurfaces(project_id);
  return { success: true };
}

const listDistributionAttachmentsSchema = z.object({
  timeline_entry_id: z.string().uuid(),
});

type ListDistributionAttachmentsResult =
  | { success: true; attachments: Array<DistributionAttachment & { signed_url: string }> }
  | { error: string };

async function hasAttachmentExtractionColumns(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const { error } = await supabase
    .from("distribution_attachments")
    .select("extraction_status")
    .limit(1);
  return !error;
}

export async function listDistributionAttachmentsAction(
  input: unknown
): Promise<ListDistributionAttachmentsResult> {
  await requireSessionUser();
  if (isMockDataMode()) return { success: true, attachments: [] };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = listDistributionAttachmentsSchema.safeParse(input);
  if (!parsed.success) return { error: "Validation failed" };

  const supabase = await createClient();
  const extractionEnabled = await hasAttachmentExtractionColumns(supabase);
  const selectCols = extractionEnabled
    ? "id, timeline_entry_id, image_url, extraction_status, extracted_platform, extracted_views, extracted_likes, extracted_comments, extracted_payload, extracted_at, extraction_error, created_at"
    : "id, timeline_entry_id, image_url, created_at";
  const { data, error } = await supabase
    .from("distribution_attachments")
    .select(selectCols)
    .eq("timeline_entry_id", parsed.data.timeline_entry_id)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };

  const attachments = ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
    (row) =>
      ({
        id: row.id as string,
        timeline_entry_id: row.timeline_entry_id as string,
        image_url: row.image_url as string,
        extraction_status: extractionEnabled
          ? ((row.extraction_status as
              | "pending"
              | "completed"
              | "failed"
              | "idle") ?? "pending")
          : "pending",
        extracted_platform: extractionEnabled
          ? ((row.extracted_platform as string | null) ?? null)
          : null,
        extracted_views: extractionEnabled
          ? ((row.extracted_views as number | null) ?? null)
          : null,
        extracted_likes: extractionEnabled
          ? ((row.extracted_likes as number | null) ?? null)
          : null,
        extracted_comments: extractionEnabled
          ? ((row.extracted_comments as number | null) ?? null)
          : null,
        extracted_payload: extractionEnabled
          ? ((row.extracted_payload as Record<string, unknown> | null) ?? null)
          : null,
        extracted_at: extractionEnabled
          ? ((row.extracted_at as string | null) ?? null)
          : null,
        extraction_error: extractionEnabled
          ? ((row.extraction_error as string | null) ?? null)
          : null,
        created_at: row.created_at as string,
      }) satisfies DistributionAttachment
  );
  const withUrls = await Promise.all(
    attachments.map(async (a) => {
      const { data: signed } = await supabase.storage
        .from(DISTRIBUTION_ATTACHMENTS_BUCKET)
        .createSignedUrl(a.image_url, 60 * 60 * 24);
      return { ...a, signed_url: signed?.signedUrl ?? "" };
    })
  );

  return {
    success: true,
    attachments: withUrls.filter((a) => Boolean(a.signed_url)),
  };
}

const createDistributionAttachmentSchema = z.object({
  timeline_entry_id: z.string().uuid(),
  image_url: z.string().min(1),
  project_id: z.string().uuid(),
});

export async function createDistributionAttachmentAction(
  input: unknown
): Promise<CreateDistributionAttachmentResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = createDistributionAttachmentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const profile = await getProfile(user.id);
  const pro = isProPlan(profile?.plan ?? "free");
  const extractionEnabled = await hasAttachmentExtractionColumns(supabase);
  const insertPayload: Record<string, unknown> = {
    timeline_entry_id: parsed.data.timeline_entry_id,
    image_url: parsed.data.image_url,
  };
  if (extractionEnabled) {
    insertPayload.extraction_status = pro ? "pending" : "idle";
  }
  const { data: row, error } = await supabase
    .from("distribution_attachments")
    .insert(insertPayload)
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidateDistributionSurfaces(parsed.data.project_id);
  return { success: true, attachment_id: row.id as string };
}

const runAttachmentExtractionSchema = z.object({
  attachment_id: z.string().uuid(),
  timeline_entry_id: z.string().uuid(),
});

export async function runDistributionAttachmentExtractionAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = runAttachmentExtractionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const profile = await getProfile(user.id);
  if (!isProPlan(profile?.plan ?? "free")) {
    return {
      error:
        "AI metric reading from screenshots is a Pro feature. Upgrade to unlock.",
    };
  }

  const supabase = await createClient();
  const extractionEnabled = await hasAttachmentExtractionColumns(supabase);
  if (!extractionEnabled) {
    return {
      error:
        "Extraction columns are missing. Run migration 20260407130000_distribution_attachment_extraction.sql.",
    };
  }
  const { data: attachment, error: loadError } = await supabase
    .from("distribution_attachments")
    .select("id, timeline_entry_id, image_url")
    .eq("id", parsed.data.attachment_id)
    .eq("timeline_entry_id", parsed.data.timeline_entry_id)
    .single();
  if (loadError || !attachment) return { error: loadError?.message ?? "Attachment not found" };

  const { data: entryRow } = await supabase
    .from("timeline_entries")
    .select("platform")
    .eq("id", parsed.data.timeline_entry_id)
    .eq("type", "distribution")
    .single();

  await supabase
    .from("distribution_attachments")
    .update({
      extraction_status: "pending",
      extraction_error: null,
    })
    .eq("id", attachment.id);

  const extracted = await extractDistributionMetricsFromImage({
    imagePath: attachment.image_url,
    entryPlatform: entryRow?.platform as DistributionPlatform | undefined,
  });

  if (extracted.status === "failed") {
    const { error } = await supabase
      .from("distribution_attachments")
      .update({
        extraction_status: "failed",
        extraction_error: extracted.error,
        extracted_payload: extracted.payload ?? null,
      })
      .eq("id", attachment.id);
    if (error) return { error: error.message };
    return { success: true };
  }

  const { error } = await supabase
    .from("distribution_attachments")
    .update({
      extraction_status: "completed",
      extracted_platform: extracted.platform ?? null,
      extracted_views: extracted.views ?? null,
      extracted_likes: extracted.likes ?? null,
      extracted_comments: extracted.comments ?? null,
      extracted_payload: extracted.payload ?? null,
      extracted_at: new Date().toISOString(),
      extraction_error: null,
    })
    .eq("id", attachment.id);
  if (error) return { error: error.message };
  return { success: true };
}

const applyExtractedMetricsSchema = z.object({
  attachment_id: z.string().uuid(),
  timeline_entry_id: z.string().uuid(),
  project_id: z.string().uuid(),
  period_label: z.string().max(50).optional(),
});

export async function applyExtractedMetricsToEntryAction(
  input: unknown
): Promise<ApplyExtractedMetricsResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = applyExtractedMetricsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const profile = await getProfile(user.id);
  if (!isProPlan(profile?.plan ?? "free")) {
    return {
      error:
        "Applying AI-read metrics is a Pro feature. Upgrade to unlock, or enter metrics manually.",
    };
  }

  const supabase = await createClient();
  const { data: attachment, error: aErr } = await supabase
    .from("distribution_attachments")
    .select(
      "id, extraction_status, extracted_views, extracted_likes, extracted_comments, extracted_at"
    )
    .eq("id", parsed.data.attachment_id)
    .eq("timeline_entry_id", parsed.data.timeline_entry_id)
    .single();
  if (aErr || !attachment) return { error: aErr?.message ?? "Attachment not found" };
  if (attachment.extraction_status !== "completed") {
    return { error: "No completed extraction available for this screenshot." };
  }

  const { data: entry, error: eErr } = await supabase
    .from("timeline_entries")
    .select("id, user_id, metrics")
    .eq("id", parsed.data.timeline_entry_id)
    .eq("user_id", user.id)
    .eq("type", "distribution")
    .single();
  if (eErr || !entry) return { error: eErr?.message ?? "Distribution entry not found" };

  const current = parseDistributionMetrics(
    (entry.metrics as Record<string, unknown> | null) ?? null
  );
  const next = {
    ...current,
    views: attachment.extracted_views ?? current.views,
    likes: attachment.extracted_likes ?? current.likes,
    comments: attachment.extracted_comments ?? current.comments,
  };

  const { error: updateErr } = await supabase
    .from("timeline_entries")
    .update({ metrics: next })
    .eq("id", parsed.data.timeline_entry_id)
    .eq("user_id", user.id)
    .eq("type", "distribution");
  if (updateErr) return { error: updateErr.message };

  const { error: snapshotErr } = await supabase
    .from("distribution_metric_snapshots")
    .insert({
      timeline_entry_id: parsed.data.timeline_entry_id,
      source_attachment_id: attachment.id,
      period_label: parsed.data.period_label ?? null,
      views: attachment.extracted_views,
      likes: attachment.extracted_likes,
      comments: attachment.extracted_comments,
      captured_at: attachment.extracted_at ?? new Date().toISOString(),
    });
  if (snapshotErr) {
    console.warn("distribution_metric_snapshots insert skipped:", snapshotErr.message);
  }

  revalidateDistributionSurfaces(parsed.data.project_id);
  return { success: true, metrics: next };
}

const listDistributionMetricSnapshotsSchema = z.object({
  timeline_entry_id: z.string().uuid(),
});

type ListDistributionMetricSnapshotsResult =
  | { success: true; snapshots: DistributionMetricSnapshotRow[] }
  | { error: string };

export async function listDistributionMetricSnapshotsAction(
  input: unknown
): Promise<ListDistributionMetricSnapshotsResult> {
  await requireSessionUser();
  if (isMockDataMode()) return { success: true, snapshots: [] };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = listDistributionMetricSnapshotsSchema.safeParse(input);
  if (!parsed.success) return { error: "Validation failed" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("distribution_metric_snapshots")
    .select(
      "id, timeline_entry_id, source_attachment_id, period_label, views, likes, comments, captured_at, created_at"
    )
    .eq("timeline_entry_id", parsed.data.timeline_entry_id)
    .order("captured_at", { ascending: false })
    .limit(100);
  if (error) return { error: error.message };

  return { success: true, snapshots: (data ?? []) as DistributionMetricSnapshotRow[] };
}

const deleteDistributionAttachmentSchema = z.object({
  id: z.string().uuid(),
  timeline_entry_id: z.string().uuid(),
  image_url: z.string().min(1),
  project_id: z.string().uuid(),
});

export async function deleteDistributionAttachmentAction(
  input: unknown
): Promise<ActionResult> {
  await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = deleteDistributionAttachmentSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("distribution_attachments")
    .delete()
    .eq("id", parsed.data.id)
    .eq("timeline_entry_id", parsed.data.timeline_entry_id);
  if (error) return { error: error.message };

  const { error: storageError } = await supabase.storage
    .from(DISTRIBUTION_ATTACHMENTS_BUCKET)
    .remove([parsed.data.image_url]);
  if (storageError) return { error: storageError.message };

  revalidateDistributionSurfaces(parsed.data.project_id);
  return { success: true };
}

const listPostsForLinkingSchema = z.object({
  project_id: z.string().uuid(),
});

export async function listDistributionPostsForLinkingAction(
  input: unknown
): Promise<
  { success: true; posts: { id: string; label: string }[] } | { error: string }
> {
  const user = await requireSessionUser();
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = listPostsForLinkingSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid project." };

  const project = await getProject(user.id, parsed.data.project_id);
  if (!project) return { error: "Project not found." };

  const rows = await listDistributionForProject(
    user.id,
    parsed.data.project_id
  );
  const posts = rows.map((r) => ({
    id: r.id,
    label: `${r.title?.trim() || "Post"} · ${DISTRIBUTION_PLATFORM_LABELS[r.platform]} · ${r.date_posted}`,
  }));
  return { success: true, posts };
}
