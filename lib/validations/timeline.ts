import { z } from "zod";
import { distributionPlatformSchema } from "@/lib/validations/distribution";

export const timelineEntryTypeSchema = z.enum([
  "snapshot",
  "note",
  "link",
  "distribution",
  "build",
  "insight",
  "experiment",
  "cost",
  "revenue",
  "deal",
  "work",
]);

const baseDate = z.object({
  project_id: z.string().uuid(),
  entry_date: z.string().min(1),
});

const distributionEvent = baseDate
  .extend({
    type: z.literal("distribution"),
    platform: distributionPlatformSchema,
    title: z.string().max(200).optional().nullable(),
    notes: z.string().max(5000).optional().default(""),
    url: z.string().url(),
    image_storage_path: z.string().optional().nullable(),
    metrics: z
      .object({
        views: z.number().int().min(0).optional(),
        likes: z.number().int().min(0).optional(),
        comments: z.number().int().min(0).optional(),
      })
      .optional(),
    /** Reddit only; stored without `r/`. */
    subreddit: z.string().max(120).optional().nullable(),
    /** Existing cross-post group (Pro). */
    content_group_id: z.string().uuid().optional().nullable(),
    /** Create a new group on insert (Pro); server clears after resolving id. */
    new_content_group_title: z.string().max(200).optional().nullable(),
    new_content_group_description: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const buildProgressKindSchema = z.enum([
  "idea",
  "progress",
  "milestone",
  "shipped",
]);

export type BuildProgressKind = z.infer<typeof buildProgressKindSchema>;

const buildEvent = baseDate
  .extend({
    type: z.literal("build"),
    /** Optional; server derives from description first line when empty. */
    title: z.string().max(200).optional().default(""),
    description: z.string().min(1).max(5000),
    build_kind: buildProgressKindSchema,
    image_storage_path: z.string().optional().nullable(),
  })
  .strict();

const insightEvent = baseDate
  .extend({
    type: z.literal("insight"),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().default(""),
  })
  .strict();

const experimentEvent = baseDate
  .extend({
    type: z.literal("experiment"),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().default(""),
    external_url: z.string().optional().default(""),
  })
  .strict()
  .superRefine((data, ctx) => {
    const u = data.external_url?.trim();
    if (!u) return;
    if (!z.string().url().safeParse(u).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid URL",
        path: ["external_url"],
      });
    }
  });

const costEvent = baseDate
  .extend({
    type: z.literal("cost"),
    /** Optional display title; when omitted or empty, a default amount/category label is used. */
    title: z.string().max(200).optional(),
    amount: z.number().nonnegative(),
    category: z.string().min(1).max(80),
    image_storage_path: z.string().optional().nullable(),
    is_recurring: z.boolean().optional().default(false),
    recurrence_label: z.string().max(50).optional().nullable(),
    description: z.string().max(5000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.is_recurring && !data.recurrence_label?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurrence label is required for recurring costs.",
        path: ["recurrence_label"],
      });
    }
  })
  .strict();

const revenueEvent = baseDate
  .extend({
    type: z.literal("revenue"),
    amount: z.number().nonnegative(),
    /** Optional (e.g. Gumroad, Stripe); empty stores as null in DB. */
    source: z.string().max(120).optional().default(""),
    /** Optional attribution to a distribution timeline row (same project). */
    linked_distribution_entry_id: z.string().uuid().optional().nullable(),
    image_storage_path: z.string().optional().nullable(),
    description: z.string().max(5000).optional().default(""),
    is_recurring: z.boolean().optional().default(false),
    recurrence_label: z.string().max(50).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.is_recurring && !data.recurrence_label?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurrence label is required for recurring revenue.",
        path: ["recurrence_label"],
      });
    }
  })
  .strict();

const dealEvent = baseDate
  .extend({
    type: z.literal("deal"),
    partner_name: z.string().min(1).max(160),
    revenue_share_percentage: z.number().min(0).max(100),
    image_storage_path: z.string().optional().nullable(),
    description: z.string().max(5000).optional().default(""),
  })
  .strict();

const snapshotEvent = baseDate
  .extend({
    type: z.literal("snapshot"),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().default(""),
    image_storage_path: z.string().optional().nullable(),
  })
  .strict();

const noteEvent = baseDate
  .extend({
    type: z.literal("note"),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().default(""),
  })
  .strict();

const workEvent = baseDate
  .extend({
    type: z.literal("work"),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().default(""),
    duration_seconds: z.number().int().min(60),
    work_session_kind: z.enum(["timer_session", "manual_time_entry"]),
  })
  .strict();

const linkEvent = baseDate
  .extend({
    type: z.literal("link"),
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().default(""),
    external_url: z.string().optional().default(""),
  })
  .strict()
  .superRefine((data, ctx) => {
    const u = data.external_url?.trim();
    if (!u) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Link entries need a URL",
        path: ["external_url"],
      });
    } else if (!z.string().url().safeParse(u).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid URL",
        path: ["external_url"],
      });
    }
  });

/** Single payload for “log once” — all timeline row kinds including distribution. */
export const logEventSchema = z.discriminatedUnion("type", [
  distributionEvent,
  buildEvent,
  insightEvent,
  experimentEvent,
  costEvent,
  revenueEvent,
  dealEvent,
  snapshotEvent,
  noteEvent,
  workEvent,
  linkEvent,
]);

export type LogEventInput = z.infer<typeof logEventSchema>;

export const createTimelineEntrySchema = z.discriminatedUnion("type", [
  snapshotEvent,
  noteEvent,
  linkEvent,
]);

export type CreateTimelineEntryInput = z.infer<typeof createTimelineEntrySchema>;
