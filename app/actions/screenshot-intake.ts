"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { isProPlan } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import { insertTimelineEntry } from "@/lib/services/timeline-entries";
import {
  READ_ONLY_MOCK_ERROR,
  SUPABASE_REQUIRED_ERROR,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import type { DistributionPlatform } from "@/types/momentum";

const detectedPayloadSchema = z
  .object({
    platform: z
      .enum([
        "reddit",
        "tiktok",
        "twitter",
        "product_hunt",
        "instagram",
        "youtube",
        "other",
      ])
      .optional(),
    views: z.number().int().min(0).optional(),
    likes: z.number().int().min(0).optional(),
    comments: z.number().int().min(0).optional(),
    amount: z.number().nonnegative().optional(),
    category: z.string().max(80).optional(),
    revenueSource: z.string().max(120).optional(),
  })
  .optional();

const applyScreenshotIntakeSchema = z
  .object({
    project_id: z.string().uuid(),
    destination: z.enum([
      "revenue",
      "snapshot",
      "note",
      "insight",
      "distribution",
      "costs",
      "outreach",
      "swipe_file",
    ]),
    entry_date: z.string().min(1),
    image_storage_path: z.string().min(1),
    source_label: z.string().max(120).optional(),
    notes: z.string().max(5000).optional(),
    /** User-confirmed; never auto-filled from detection on the server. */
    amount: z.number().positive().optional(),
    revenue_source: z.string().max(120).optional().default(""),
    cost_category: z.string().max(80).optional(),
    entry_title: z.string().max(200).optional(),
    /** Required when destination is distribution (real post URL). */
    distribution_url: z.string().max(2000).optional(),
    detected: detectedPayloadSchema,
  })
  .superRefine((data, ctx) => {
    if (data.destination === "revenue") {
      if (data.amount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a revenue amount.",
          path: ["amount"],
        });
      }
    }
    if (data.destination === "costs") {
      if (data.amount == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter an amount for this expense.",
          path: ["amount"],
        });
      }
      if (!data.cost_category?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose a category.",
          path: ["cost_category"],
        });
      }
    }
    if (data.destination === "snapshot") {
      if (!data.entry_title?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add a title for this screenshot.",
          path: ["entry_title"],
        });
      }
    }
    if (data.destination === "note" || data.destination === "insight") {
      if (!data.entry_title?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add a title.",
          path: ["entry_title"],
        });
      }
    }
    if (data.destination === "distribution") {
      const u = data.distribution_url?.trim();
      if (!u || !z.string().url().safeParse(u).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid post URL to attach this screenshot.",
          path: ["distribution_url"],
        });
      }
    }
  });

export async function applyScreenshotIntakeAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const parsed = applyScreenshotIntakeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const profile = await getProfile(user.id);
  if (!isProPlan(profile?.plan ?? "free")) {
    return {
      error: "Screenshot upload is a Pro feature. Upgrade to unlock.",
    };
  }

  const d = parsed.data;
  const notes = d.notes?.trim() || "";
  const source = d.source_label?.trim() || "Screenshot intake";

  const logEventInput =
    d.destination === "distribution"
      ? {
          type: "distribution" as const,
          project_id: d.project_id,
          entry_date: d.entry_date,
          platform: (d.detected?.platform ?? "other") as DistributionPlatform,
          title: source,
          notes,
          url: d.distribution_url!.trim(),
          image_storage_path: d.image_storage_path,
          metrics: {
            views: d.detected?.views,
            likes: d.detected?.likes,
            comments: d.detected?.comments,
          },
          subreddit: null,
          content_group_id: null,
          new_content_group_title: null,
          new_content_group_description: null,
        }
      : d.destination === "costs"
        ? {
            type: "cost" as const,
            project_id: d.project_id,
            entry_date: d.entry_date,
            amount: d.amount!,
            category: d.cost_category!.trim(),
            description: notes || source,
            billing_type: "one_time" as const,
            recurring_start_date: null,
            recurring_end_date: null,
            recurring_active: true,
            is_recurring: false,
            recurrence_label: null,
            image_storage_path: d.image_storage_path,
          }
        : d.destination === "revenue"
          ? {
              type: "revenue" as const,
              project_id: d.project_id,
              entry_date: d.entry_date,
              amount: d.amount!,
              source: d.revenue_source?.trim() || "",
              linked_distribution_entry_id: null,
              description: notes || source,
              image_storage_path: d.image_storage_path,
              is_recurring: false,
              recurrence_label: null,
            }
          : d.destination === "snapshot"
            ? {
                type: "snapshot" as const,
                project_id: d.project_id,
                entry_date: d.entry_date,
                title: d.entry_title!.trim(),
                description: notes,
                image_storage_path: d.image_storage_path,
              }
            : d.destination === "insight"
              ? {
                  type: "insight" as const,
                  project_id: d.project_id,
                  entry_date: d.entry_date,
                  title: d.entry_title!.trim(),
                  description: notes,
                }
              : d.destination === "note"
                ? {
                    type: "note" as const,
                    project_id: d.project_id,
                    entry_date: d.entry_date,
                    title: d.entry_title!.trim(),
                    description: notes,
                  }
                : {
                    type: "note" as const,
                    project_id: d.project_id,
                    entry_date: d.entry_date,
                    title:
                      d.destination === "outreach"
                        ? "Outreach screenshot"
                        : d.destination === "swipe_file"
                          ? "Swipe file screenshot"
                          : "Screenshot note",
                    description: notes || source,
                  };

  const supabase = await createClient();
  const { error } = await insertTimelineEntry(supabase, {
    userId: user.id,
    data: logEventInput,
    provenance: { source_type: "manual", source_metadata: { source } },
  });
  if (error) return { error: error.message };

  revalidatePath(`/projects/${d.project_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/distribution");
  revalidatePath("/costs");
  revalidatePath("/financials");
  return { success: true };
}
