"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  READ_ONLY_MOCK_ERROR,
  SUPABASE_REQUIRED_ERROR,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { isProPlan } from "@/lib/plan";
import { getProject } from "@/lib/data/projects";
import { insertTimelineEntry } from "@/lib/services/timeline-entries";
import { createClient } from "@/lib/supabase/server";
import { distributionPlatformSchema } from "@/lib/validations/distribution";
import {
  buildProgressKindSchema,
  costBillingTypeSchema,
  logEventSchema,
  type BuildProgressKind,
} from "@/lib/validations/timeline";
import type { SupabaseClient } from "@supabase/supabase-js";

async function validateRevenueLinkedDistribution(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  linkedId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("timeline_entries")
    .select("id, type, project_id, user_id")
    .eq("id", linkedId)
    .maybeSingle();
  if (error || !data) return false;
  if (
    data.type !== "distribution" ||
    data.project_id !== projectId ||
    data.user_id !== userId
  ) {
    return false;
  }
  return true;
}

/** Single “log once” action for every timeline row kind (including distribution). */
export async function createLogEventAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const parsed = logEventSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (
    parsed.data.type === "snapshot" &&
    !parsed.data.image_storage_path?.trim()
  ) {
    return { error: "Snapshot entries require an uploaded image path." };
  }

  const supabase = await createClient();

  let dataToInsert = parsed.data;

  if (parsed.data.type === "distribution") {
    const profile = await getProfile(user.id);
    const pro = isProPlan(profile?.plan ?? "free");
    let contentGroupId: string | null =
      parsed.data.content_group_id ?? null;
    const newTitle = parsed.data.new_content_group_title?.trim();

    if (pro) {
      if (newTitle) {
        const { data: row, error: cgErr } = await supabase
          .from("content_groups")
          .insert({
            user_id: user.id,
            title: newTitle,
            description:
              parsed.data.new_content_group_description?.trim() || null,
          })
          .select("id")
          .single();
        if (cgErr) {
          return { error: cgErr.message };
        }
        contentGroupId = row.id as string;
      } else if (contentGroupId) {
        const { data: own, error: ownErr } = await supabase
          .from("content_groups")
          .select("id")
          .eq("id", contentGroupId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (ownErr) {
          return { error: ownErr.message };
        }
        if (!own) {
          return { error: "Invalid content group." };
        }
      }
    } else {
      contentGroupId = null;
    }

    const {
      new_content_group_title: _stripTitle,
      new_content_group_description: _stripDesc,
      ...rest
    } = parsed.data;
    void _stripTitle;
    void _stripDesc;
    dataToInsert = {
      ...rest,
      content_group_id: contentGroupId,
      new_content_group_title: null,
      new_content_group_description: null,
    };
  }

  if (
    dataToInsert.type === "revenue" &&
    dataToInsert.linked_distribution_entry_id
  ) {
    const ok = await validateRevenueLinkedDistribution(
      supabase,
      user.id,
      dataToInsert.project_id,
      dataToInsert.linked_distribution_entry_id
    );
    if (!ok) {
      return {
        error: "Linked post must be a distribution entry in this project.",
      };
    }
  }

  const { error } = await insertTimelineEntry(supabase, {
    userId: user.id,
    data: dataToInsert,
    provenance: { source_type: "manual", source_metadata: null },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${dataToInsert.project_id}`);
  revalidatePath("/dashboard");
  if (dataToInsert.type === "distribution") {
    revalidatePath("/distribution");
  }
  if (dataToInsert.type === "revenue") {
    revalidatePath("/distribution");
    revalidatePath("/financials");
  }
  if (dataToInsert.type === "cost") {
    revalidatePath("/costs");
    revalidatePath("/financials");
  }
  return { success: true };
}

const updateTimelineEntrySchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  entry_date: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  external_url: z.union([z.string().max(2000), z.literal("")]).optional(),
  amount: z.number().nonnegative().optional(),
  category: z.string().min(1).max(80).optional(),
  revenue_source: z.union([z.string().max(120), z.literal("")]).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_label: z.string().max(50).optional().nullable(),
  partner_name: z.string().min(1).max(200).optional(),
  revenue_share_percentage: z.number().min(0).max(100).optional(),
  platform: distributionPlatformSchema.optional(),
  subreddit: z.string().max(120).nullable().optional(),
  cost_title_override: z.string().max(200).optional(),
  billing_type: costBillingTypeSchema.optional(),
  recurring_start_date: z.string().optional().nullable(),
  recurring_end_date: z.string().optional().nullable(),
  recurring_active: z.boolean().optional(),
  duration_seconds: z.number().int().min(60).optional(),
  work_session_kind: z
    .enum(["timer_session", "manual_time_entry"])
    .optional(),
  build_kind: buildProgressKindSchema.optional(),
});

/** Update an existing timeline row the user owns (project-scoped). */
export async function updateTimelineEntryAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const parsed = updateTimelineEntrySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const p = parsed.data;
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("timeline_entries")
    .select(
      "id, user_id, project_id, type, title, description, external_url, entry_date, platform, metrics, subreddit, amount, category, is_recurring, recurrence_label, billing_type, recurring_start_date, recurring_end_date, recurring_active, revenue_source, partner_name, revenue_share_percentage, linked_distribution_entry_id, image_url, event_metadata, event_subtype"
    )
    .eq("id", p.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { error: "Entry not found." };
  }

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);

  const type = row.type as string;
  const rowProjectId = row.project_id as string;
  if (type !== "cost" && p.project_id !== rowProjectId) {
    return { error: "Project mismatch." };
  }
  const updates: Record<string, unknown> = {
    entry_date: p.entry_date,
  };

  function mapBuildKindToSubtype(kind: BuildProgressKind): string {
    switch (kind) {
      case "idea":
        return "build_idea";
      case "progress":
        return "build_note";
      case "milestone":
        return "build_milestone";
      case "shipped":
        return "ship_update";
      default: {
        const _e: never = kind;
        return _e;
      }
    }
  }

  switch (type) {
    case "note":
    case "insight":
    case "snapshot": {
      const title = p.title?.trim();
      if (!title) return { error: "Title is required." };
      updates.title = title;
      updates.description =
        p.description !== undefined ? p.description : row.description;
      break;
    }
    case "build": {
      const descRaw =
        p.description !== undefined ? p.description : (row.description ?? "");
      const desc = descRaw.trim();
      if (!desc) return { error: "Description is required." };
      let title = p.title?.trim();
      if (!title) {
        const first = desc.split("\n").find((l: string) => l.trim())?.trim() ?? desc;
        title =
          first.length > 200 ? `${first.slice(0, 197)}…` : first;
      }
      updates.title = title;
      updates.description = desc;
      if (p.build_kind !== undefined) {
        updates.event_subtype = mapBuildKindToSubtype(p.build_kind);
      }
      break;
    }
    case "link":
    case "experiment": {
      const title = p.title?.trim();
      if (!title) return { error: "Title is required." };
      updates.title = title;
      updates.description =
        p.description !== undefined ? p.description : row.description;
      const nextUrl =
        p.external_url !== undefined
          ? p.external_url.trim()
          : (row.external_url ?? "");
      if (type === "link" && !nextUrl) {
        return { error: "Link URL is required." };
      }
      if (nextUrl && !z.string().url().safeParse(nextUrl).success) {
        return { error: "Invalid URL." };
      }
      updates.external_url = nextUrl || null;
      break;
    }
    case "distribution": {
      const title = p.title?.trim();
      if (!title) return { error: "Title is required." };
      updates.title = title;
      updates.description =
        p.description !== undefined ? p.description : row.description;
      const nextUrl =
        p.external_url !== undefined
          ? p.external_url.trim()
          : (row.external_url ?? "");
      if (!nextUrl) return { error: "Post URL is required." };
      if (!z.string().url().safeParse(nextUrl).success) {
        return { error: "Invalid URL." };
      }
      updates.external_url = nextUrl;
      const platform = p.platform ?? row.platform;
      if (!platform) return { error: "Platform is required." };
      updates.platform = platform;
      if (p.subreddit !== undefined) {
        const raw = p.subreddit?.trim() ?? "";
        const sub =
          platform === "reddit" && raw
            ? raw.replace(/^r\//i, "").replace(/^\//, "").slice(0, 120) || null
            : null;
        updates.subreddit = sub;
      }
      break;
    }
    case "cost": {
      const amount = p.amount ?? row.amount;
      const category = p.category ?? row.category;
      if (amount == null || amount < 0) {
        return { error: "Enter a valid amount." };
      }
      if (!category?.trim()) return { error: "Choose a category." };
      const target = await getProject(user.id, p.project_id);
      if (!target) {
        return { error: "Choose a valid project for this expense." };
      }
      const rowB = row as Record<string, unknown>;
      const billingFromRow =
        typeof rowB.billing_type === "string" ? rowB.billing_type : null;
      let billing =
        p.billing_type ??
        (billingFromRow === "monthly" || billingFromRow === "yearly"
          ? billingFromRow
          : rowB.is_recurring
            ? "monthly"
            : "one_time");
      if (billing !== "one_time" && billing !== "monthly" && billing !== "yearly") {
        billing = "one_time";
      }
      const recurring = billing !== "one_time";
      const recStartRaw =
        p.recurring_start_date !== undefined && p.recurring_start_date !== null
          ? p.recurring_start_date.trim().slice(0, 10)
          : typeof rowB.recurring_start_date === "string"
            ? String(rowB.recurring_start_date).slice(0, 10)
            : (row.entry_date as string).slice(0, 10);
      const recEndRaw =
        p.recurring_end_date !== undefined
          ? p.recurring_end_date?.trim().slice(0, 10) || null
          : typeof rowB.recurring_end_date === "string"
            ? String(rowB.recurring_end_date).slice(0, 10)
            : null;
      const recActive =
        p.recurring_active !== undefined
          ? p.recurring_active
          : rowB.recurring_active !== false;
      if (recurring && !recStartRaw) {
        return { error: "Start date is required for subscriptions." };
      }
      if (recStartRaw && recEndRaw && recEndRaw < recStartRaw) {
        return { error: "End date must be on or after start." };
      }
      const override = p.cost_title_override?.trim();
      updates.title = override
        ? override
        : `💸 ${formatMoney(amount)} — ${category.trim()}`;
      updates.description =
        p.description !== undefined ? p.description : row.description;
      updates.amount = amount;
      updates.category = category.trim();
      updates.project_id = p.project_id;
      updates.entry_date = recurring ? recStartRaw : p.entry_date;
      updates.billing_type = billing;
      updates.recurring_start_date = recurring ? recStartRaw : null;
      updates.recurring_end_date =
        recurring && recEndRaw && recEndRaw.length >= 8 ? recEndRaw : null;
      updates.recurring_active = recurring ? recActive : true;
      updates.is_recurring = recurring;
      updates.recurrence_label =
        billing === "monthly"
          ? "Monthly"
          : billing === "yearly"
            ? "Yearly"
            : null;
      break;
    }
    case "revenue": {
      const amount = p.amount ?? row.amount;
      const sourceRaw =
        p.revenue_source !== undefined
          ? p.revenue_source
          : (row.revenue_source ?? "");
      const recurring =
        p.is_recurring !== undefined
          ? p.is_recurring
          : Boolean(row.is_recurring);
      const recLabel =
        p.recurrence_label !== undefined
          ? p.recurrence_label
          : (row.recurrence_label ?? null);
      if (amount == null || amount < 0) {
        return { error: "Enter a valid amount." };
      }
      if (recurring && !recLabel?.trim()) {
        return { error: "Add a recurrence label for recurring revenue." };
      }
      const src = sourceRaw.trim() || null;
      const kindLabel = recurring ? "Recurring" : "One-time";
      updates.title = `💰 ${formatMoney(amount)} — ${kindLabel}${
        src ? ` — ${src}` : ""
      }`;
      updates.description =
        p.description !== undefined ? p.description : row.description;
      updates.amount = amount;
      updates.revenue_source = src;
      updates.is_recurring = recurring;
      updates.recurrence_label = recurring ? recLabel?.trim() || null : null;
      break;
    }
    case "deal": {
      const partner = p.partner_name ?? row.partner_name;
      const share = p.revenue_share_percentage ?? row.revenue_share_percentage;
      if (!partner?.trim()) return { error: "Add a deal name." };
      if (share == null || share < 0 || share > 100) {
        return { error: "Value must be between 0 and 100." };
      }
      updates.title = `🤝 ${share}% — ${partner.trim()}`;
      updates.description =
        p.description !== undefined ? p.description : row.description;
      updates.partner_name = partner.trim();
      updates.revenue_share_percentage = share;
      break;
    }
    case "work": {
      const title = p.title?.trim();
      if (!title) return { error: "Title is required." };
      updates.title = title;
      updates.description =
        p.description !== undefined ? p.description : row.description;
      const prev =
        (row.event_metadata as Record<string, unknown> | null | undefined) ?? {};
      let dur =
        p.duration_seconds ??
        (typeof prev.duration_seconds === "number"
          ? prev.duration_seconds
          : null);
      if (dur == null) {
        return { error: "Duration is required for work sessions." };
      }
      dur = Math.max(60, Math.floor(dur));
      const kind =
        p.work_session_kind ??
        (typeof row.event_subtype === "string" ? row.event_subtype : null) ??
        (typeof prev.work_session_source === "string"
          ? prev.work_session_source
          : null);
      if (kind !== "timer_session" && kind !== "manual_time_entry") {
        return { error: "Invalid work session type." };
      }
      updates.event_subtype = kind;
      updates.event_metadata = {
        ...prev,
        duration_seconds: dur,
        work_session_source: kind,
      };
      break;
    }
    default:
      return { error: "This event type cannot be edited here yet." };
  }

  const { error: updateErr } = await supabase
    .from("timeline_entries")
    .update(updates)
    .eq("id", p.id)
    .eq("user_id", user.id);

  if (updateErr) {
    return { error: updateErr.message };
  }

  const nextProjectId =
    typeof updates.project_id === "string"
      ? updates.project_id
      : rowProjectId;
  revalidatePath(`/projects/${rowProjectId}`);
  if (nextProjectId !== rowProjectId) {
    revalidatePath(`/projects/${nextProjectId}`);
  }
  revalidatePath("/dashboard");
  if (type === "distribution" || type === "revenue") {
    revalidatePath("/distribution");
  }
  if (type === "revenue") {
    revalidatePath("/financials");
  }
  if (type === "cost") {
    revalidatePath("/costs");
    revalidatePath("/financials");
  }
  return { success: true };
}

const deleteTimelineEntrySchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
});

/** Permanently remove a timeline row the user owns. */
export async function deleteTimelineEntryAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const parsed = deleteTimelineEntrySchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { id, project_id } = parsed.data;
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("timeline_entries")
    .select("id, type, project_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return { error: "Entry not found." };
  }

  const rowPid = row.project_id as string;
  if (rowPid !== project_id) {
    return { error: "Project mismatch." };
  }

  const entryType = row.type as string;

  const { error: delErr } = await supabase
    .from("timeline_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (delErr) {
    return { error: delErr.message };
  }

  revalidatePath(`/projects/${rowPid}`);
  revalidatePath("/dashboard");
  if (entryType === "distribution" || entryType === "revenue") {
    revalidatePath("/distribution");
  }
  if (entryType === "revenue") {
    revalidatePath("/financials");
  }
  if (entryType === "cost") {
    revalidatePath("/costs");
    revalidatePath("/financials");
  }
  return { success: true };
}
