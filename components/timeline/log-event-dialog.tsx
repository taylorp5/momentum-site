"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  Brain,
  Hammer,
  Handshake,
  Loader2,
  Megaphone,
  Wallet,
  WalletCards,
} from "lucide-react";
import { listContentGroupsAction } from "@/app/actions/content-groups";
import { createLogEventAction } from "@/app/actions/timeline";
import { usePlan } from "@/components/billing/plan-context";
import {
  DISTRIBUTION_PLATFORM_LABELS,
  TIMELINE_BUCKET,
  TIMELINE_SNAPSHOT_ACCEPT,
  TIMELINE_SNAPSHOT_MAX_BYTES,
} from "@/lib/constants";
import { PLATFORM_ORDER } from "@/lib/platform-config";
import {
  logEventSchema,
  timelineEntryTypeSchema,
  type BuildProgressKind,
  type LogEventInput,
} from "@/lib/validations/timeline";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogTriggerMerge } from "@/components/ui/dialog-trigger-merge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { toast } from "sonner";
import type {
  DistributionPlatform,
  Project,
  TimelineEntryType,
} from "@/types/momentum";
import { z } from "zod";
import { cn } from "@/lib/utils";

type FormValues = {
  project_id: string;
  type: z.infer<typeof timelineEntryTypeSchema>;
  entry_date: string;
  title: string;
  description: string;
  external_url: string;
  url: string;
  platform?: DistributionPlatform;
  image_storage_path: string | null;
  amount: string;
  category: string;
  revenue_source: string;
  partner_name: string;
  revenue_share_percentage: string;
  dist_views: string;
  dist_likes: string;
  dist_comments: string;
  cost_type: "one_time" | "recurring";
  recurrence_option: "monthly" | "yearly" | "quarterly" | "custom";
  recurrence_label: string;
  linked_distribution_entry_id: string;
  dist_subreddit: string;
  cross_post_track: boolean;
  cross_post_attach: "new" | "existing";
  content_group_existing_id: string;
  new_content_group_title: string;
  new_content_group_description: string;
  build_kind: BuildProgressKind;
};

function buildLogPayload(
  values: FormValues,
  imagePath: string | null
): LogEventInput | { error: string } {
  const title = values.title.trim();
  const desc = values.description ?? "";
  const parseMoney = (raw: string) => {
    const normalized = raw.replace(/[$,\s]/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  };
  const parseOptionalInt = (v: string) => {
    const s = v.trim();
    if (!s) return undefined;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  };

  switch (values.type) {
    case "distribution": {
      const rawUrl = values.url.trim();
      if (!rawUrl) return { error: "Add a link to the post." };
      const u = z.string().url().safeParse(rawUrl);
      if (!u.success) return { error: "Enter a valid URL for the post." };
      const views = parseOptionalInt(values.dist_views);
      const likes = parseOptionalInt(values.dist_likes);
      const comments = parseOptionalInt(values.dist_comments);
      if (views === null || likes === null || comments === null) {
        return { error: "Performance fields must be non-negative numbers." };
      }
      const metrics =
        views !== undefined || likes !== undefined || comments !== undefined
          ? {
              ...(views !== undefined ? { views } : {}),
              ...(likes !== undefined ? { likes } : {}),
              ...(comments !== undefined ? { comments } : {}),
            }
          : undefined;
      const subRaw = values.dist_subreddit?.trim() ?? "";
      const cross = Boolean(values.cross_post_track);
      const attachNew = values.cross_post_attach === "new";
      const existingId = values.content_group_existing_id?.trim() ?? "";
      return {
        type: "distribution",
        project_id: values.project_id,
        entry_date: values.entry_date,
        platform: values.platform ?? "other",
        title: title.length > 0 ? title : null,
        notes: desc,
        url: u.data,
        image_storage_path: imagePath,
        metrics,
        subreddit: values.platform === "reddit" && subRaw ? subRaw : null,
        content_group_id:
          cross && !attachNew && existingId && z.string().uuid().safeParse(existingId).success
            ? existingId
            : null,
        new_content_group_title:
          cross && attachNew ? values.new_content_group_title?.trim() || null : null,
        new_content_group_description:
          cross && attachNew
            ? values.new_content_group_description?.trim() || null
            : null,
      };
    }
    case "build": {
      const body = desc.trim();
      if (!body) return { error: "Describe what you built, shipped, or decided." };
      return {
        type: "build",
        project_id: values.project_id,
        entry_date: values.entry_date,
        title: title.trim(),
        description: body,
        build_kind: values.build_kind,
        image_storage_path: imagePath,
      };
    }
    case "insight": {
      const body = desc.trim();
      if (!body) return { error: "Write your insight." };
      const firstLine = body.split("\n").find((l) => l.trim())?.trim() ?? body;
      const title =
        firstLine.length > 200 ? `${firstLine.slice(0, 197)}…` : firstLine;
      return {
        type: "insight",
        project_id: values.project_id,
        entry_date: values.entry_date,
        title,
        description: body,
      };
    }
    case "experiment": {
      if (!title) return { error: "Add a title for this experiment." };
      const ext = values.external_url.trim();
      if (ext && !z.string().url().safeParse(ext).success) {
        return { error: "Invalid URL." };
      }
      return {
        type: "experiment",
        project_id: values.project_id,
        entry_date: values.entry_date,
        title,
        description: desc,
        external_url: ext,
      };
    }
    case "snapshot": {
      if (!title) return { error: "Add a title for this snapshot." };
      if (!imagePath?.trim()) {
        return { error: "Snapshots need an uploaded image." };
      }
      return {
        type: "snapshot",
        project_id: values.project_id,
        entry_date: values.entry_date,
        title,
        description: desc,
        image_storage_path: imagePath,
      };
    }
    case "cost": {
      const amount = parseMoney(values.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return { error: "Enter a valid non-negative amount." };
      }
      const category = values.category.trim();
      if (!category) return { error: "Choose a category." };
      return {
        type: "cost",
        project_id: values.project_id,
        entry_date: values.entry_date,
        amount,
        category,
        is_recurring: false,
        recurrence_label: null,
        description: desc,
      };
    }
    case "revenue": {
      const amount = Number(values.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return { error: "Enter a valid non-negative amount." };
      }
      const source = values.revenue_source.trim();
      if (!source) return { error: "Add a revenue source." };
      const rawLink = values.linked_distribution_entry_id?.trim();
      const linked =
        rawLink && z.string().uuid().safeParse(rawLink).success ? rawLink : null;
      return {
        type: "revenue",
        project_id: values.project_id,
        entry_date: values.entry_date,
        amount,
        source,
        linked_distribution_entry_id: linked,
        description: desc,
      };
    }
    case "deal": {
      const partner_name = values.partner_name.trim();
      if (!partner_name) return { error: "Add a deal name." };
      const share = Number(values.revenue_share_percentage);
      if (!Number.isFinite(share) || share < 0 || share > 100) {
        return { error: "Value must be between 0 and 100." };
      }
      return {
        type: "deal",
        project_id: values.project_id,
        entry_date: values.entry_date,
        partner_name,
        revenue_share_percentage: share,
        description: desc,
      };
    }
    case "note": {
      if (!title) return { error: "Add a title for this note." };
      return {
        type: "note",
        project_id: values.project_id,
        entry_date: values.entry_date,
        title,
        description: desc,
      };
    }
    case "link": {
      if (!title) return { error: "Add a title for this link." };
      const ext = values.external_url.trim();
      if (!ext) return { error: "Link entries need a URL." };
      if (!z.string().url().safeParse(ext).success) {
        return { error: "Invalid URL." };
      }
      return {
        type: "link",
        project_id: values.project_id,
        entry_date: values.entry_date,
        title,
        description: desc,
        external_url: ext,
      };
    }
    default:
      return { error: "Unsupported event type." };
  }
}

/** Dialog title when opened from a fixed context (matches primary event labels). */
const CONTEXT_EVENT_TITLE: Partial<Record<TimelineEntryType, string>> = {
  work: "Work session",
  distribution: "Log post",
  cost: "Log cost",
  revenue: "Log revenue",
  deal: "Log deal",
  note: "Note",
  link: "Link",
  snapshot: "Snapshot (image)",
  build: "Build / progress",
  insight: "Insight",
  experiment: "Experiment",
};

function detectPlatformFromUrl(raw: string): DistributionPlatform | null {
  const lower = raw.toLowerCase();
  if (lower.includes("reddit.com")) return "reddit";
  if (lower.includes("tiktok.com")) return "tiktok";
  if (
    lower.includes("twitter.com") ||
    /:\/\/x\.com(\/|$)/i.test(raw.trim())
  ) {
    return "twitter";
  }
  if (lower.includes("producthunt.com")) return "product_hunt";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("youtube.com") || lower.includes("youtu.be"))
    return "youtube";
  return null;
}

/** Subtle top accent on the distribution form shell (platform hint). */
const DISTRIBUTION_SHELL_ACCENT: Record<DistributionPlatform, string> = {
  reddit: "border-t-[3px] border-t-orange-500/45",
  tiktok: "border-t-[3px] border-t-cyan-500/45",
  twitter: "border-t-[3px] border-t-sky-500/45",
  product_hunt: "border-t-[3px] border-t-orange-600/40",
  instagram: "border-t-[3px] border-t-pink-500/40",
  youtube: "border-t-[3px] border-t-red-500/45",
  other: "border-t-[3px] border-t-zinc-400/55",
};

function contextDialogDescription(t: TimelineEntryType): string {
  switch (t) {
    case "distribution":
      return "Add a post with a link and optional metrics — it appears on Timeline and Distribution.";
    case "cost":
      return "Record spend or a subscription — it appears on Timeline and Expenses.";
    case "revenue":
      return "Log revenue — it feeds your timeline and take-home summary.";
    case "deal":
      return "Record a partner deal and revenue share.";
    default:
      return "One entry on your timeline. Posts you log here also show on Distribution.";
  }
}

const PRIMARY_TYPE_OPTIONS: Array<{
  value: TimelineEntryType;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { value: "distribution", label: "Post / share something", icon: Megaphone },
  { value: "cost", label: "Cost", icon: Wallet },
  { value: "revenue", label: "Revenue", icon: WalletCards },
  { value: "deal", label: "Deal", icon: Handshake },
  { value: "build", label: "Build / progress", icon: Hammer },
  { value: "insight", label: "Insight", icon: Brain },
];

type LogEventDialogProps = {
  children?: React.ReactNode;
  /** When set, new events are always created for this project. */
  projectId?: string;
  /** When logging from the distribution page, user picks project if several. */
  projects?: Project[];
  /**
   * Initial type when the user can change event type (no `defaultEventType`).
   * @default "distribution"
   */
  defaultType?: TimelineEntryType;
  /**
   * When set, hides “What happened?” and fixes the entry type — use from
   * Distribution (distribution), Expenses (cost), dashboard shortcuts, etc.
   */
  defaultEventType?: TimelineEntryType;
  /** Controlled dialog (e.g. Insights). Omit with `children` for trigger-based open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When opening distribution flow, pre-select platform */
  defaultDistributionPlatform?: DistributionPlatform;
  /**
   * When opening from follow-up generator: prefill title + notes (description).
   * Clear in parent when the dialog closes if you use controlled `open`.
   */
  distributionPrefill?: { title: string; notes: string } | null;
  /** Lighter distribution form: platform, URL, title, views, date */
  distributionQuickMode?: boolean;
  /** First field to focus after open */
  distributionInitialFocus?: "platform" | "post_url";
};

export function LogEventDialog({
  children,
  projectId: fixedProjectId,
  projects,
  defaultType = "distribution",
  defaultEventType,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultDistributionPlatform,
  distributionPrefill,
  distributionQuickMode = false,
  distributionInitialFocus,
}: LogEventDialogProps) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    controlledOnOpenChange?.(next);
    if (!isControlled) setUncontrolledOpen(next);
  };
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [screenshotProcessing, setScreenshotProcessing] = useState(false);
  const { isPro, openUpgrade } = usePlan();
  const [contentGroupOptions, setContentGroupOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const platformTriggerRef = useRef<HTMLButtonElement | null>(null);
  const postUrlInputRef = useRef<HTMLInputElement | null>(null);

  const initialProjectId = fixedProjectId ?? projects?.[0]?.id ?? "";

  const form = useForm<FormValues>({
    defaultValues: {
      project_id: initialProjectId,
      type: defaultEventType ?? defaultType,
      entry_date: new Date().toISOString().slice(0, 10),
      title: "",
      description: "",
      external_url: "",
      url: "",
      platform: "reddit",
      image_storage_path: null,
      amount: "",
      category: "",
      revenue_source: "",
      partner_name: "",
      revenue_share_percentage: "",
      dist_views: "",
      dist_likes: "",
      dist_comments: "",
      cost_type: "one_time",
      recurrence_option: "monthly",
      recurrence_label: "",
      linked_distribution_entry_id: "",
      dist_subreddit: "",
      cross_post_track: false,
      cross_post_attach: "new",
      content_group_existing_id: "",
      new_content_group_title: "",
      new_content_group_description: "",
      build_kind: "progress",
    },
  });

  useEffect(() => {
    if (!open) return;
    const pid = fixedProjectId ?? projects?.[0]?.id ?? "";
    form.setValue("project_id", pid);
    form.setValue("type", defaultEventType ?? defaultType);
    if (defaultEventType === "distribution" && defaultDistributionPlatform) {
      form.setValue("platform", defaultDistributionPlatform);
    }
  }, [
    open,
    fixedProjectId,
    projects,
    defaultType,
    defaultEventType,
    defaultDistributionPlatform,
    form,
  ]);

  useEffect(() => {
    if (!open || defaultEventType !== "distribution") return;
    if (!distributionPrefill) return;
    form.setValue("title", distributionPrefill.title);
    form.setValue("description", distributionPrefill.notes);
  }, [open, defaultEventType, distributionPrefill, form]);

  const type = form.watch("type");
  const isContextLocked = defaultEventType != null;
  const effectiveType = isContextLocked ? defaultEventType! : type;
  const isDistributionFlow = effectiveType === "distribution";
  const distQuick = Boolean(distributionQuickMode) && isDistributionFlow;
  const distUrlField = form.register("url");
  const distUrl = form.watch("url");
  const distPlatform = (form.watch("platform") ?? "reddit") as DistributionPlatform;
  const crossPostTrack = form.watch("cross_post_track");
  const crossPostAttach = form.watch("cross_post_attach");
  const showProjectSelect =
    !fixedProjectId && (projects?.length ?? 0) > 1;
  const selectedProjectId = form.watch("project_id") || "";
  const hasProjectContext = Boolean(
    (fixedProjectId ?? selectedProjectId ?? "").trim()
  );
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const fixedProject = fixedProjectId
    ? projects?.find((p) => p.id === fixedProjectId)
    : undefined;

  useEffect(() => {
    if (!open) return;
    setFile(null);
  }, [type, open]);

  useEffect(() => {
    if (!open || !isDistributionFlow) return;
    const detected = detectPlatformFromUrl(distUrl);
    if (detected) form.setValue("platform", detected);
  }, [distUrl, open, isDistributionFlow, form]);

  useEffect(() => {
    if (!open || !isDistributionFlow) return;
    const focus =
      distributionInitialFocus ??
      (defaultDistributionPlatform ? "post_url" : "platform");
    const id = requestAnimationFrame(() => {
      if (focus === "post_url") {
        postUrlInputRef.current?.focus();
      } else {
        platformTriggerRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    open,
    isDistributionFlow,
    distributionInitialFocus,
    defaultDistributionPlatform,
  ]);

  useEffect(() => {
    if (!open || !isDistributionFlow || !isPro || !crossPostTrack) {
      return;
    }
    let cancelled = false;
    void listContentGroupsAction().then((res) => {
      if (cancelled) return;
      if ("success" in res && res.success) {
        setContentGroupOptions(res.groups);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, isDistributionFlow, isPro, crossPostTrack]);

  useEffect(() => {
    if (!open || !isDistributionFlow) {
      setScreenshotProcessing(false);
      return;
    }
    if (!file) {
      setScreenshotProcessing(false);
      return;
    }
    setScreenshotProcessing(true);
    const t = window.setTimeout(() => setScreenshotProcessing(false), 1600);
    return () => window.clearTimeout(t);
  }, [file, open, isDistributionFlow]);

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to be signed in to log events.");
        return;
      }
      const userId = user.id;

      let imagePath: string | null = null;
      const submitType = defaultEventType ?? values.type;
      const projectIdForSubmit = (fixedProjectId ?? values.project_id ?? "").trim();
      if (
        submitType === "distribution" &&
        !z.string().uuid().safeParse(projectIdForSubmit).success
      ) {
        toast.error("Choose a project before logging a post.");
        return;
      }
      if (
        submitType === "snapshot" ||
        submitType === "build" ||
        submitType === "experiment" ||
        submitType === "distribution"
      ) {
        if (file) {
          if (file.size > TIMELINE_SNAPSHOT_MAX_BYTES) {
            toast.error(
              `Image must be under ${Math.round(TIMELINE_SNAPSHOT_MAX_BYTES / (1024 * 1024))} MB.`
            );
            return;
          }
          if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image file.");
            return;
          }
          if (!isSupabaseConfigured()) {
            toast.error("Supabase is required for image uploads.");
            return;
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${userId}/${projectIdForSubmit}/${Date.now()}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from(TIMELINE_BUCKET)
            .upload(path, file, { cacheControl: "3600", upsert: false });
          if (upErr) {
            toast.error(upErr.message);
            return;
          }
          imagePath = path;
        } else if (submitType === "snapshot") {
          toast.error("Choose an image for this snapshot.");
          return;
        }
      }

      const payload = buildLogPayload(
        {
          ...values,
          type: defaultEventType ?? values.type,
          project_id: projectIdForSubmit,
        },
        imagePath
      );
      if ("error" in payload) {
        toast.error(payload.error);
        return;
      }

      const checked = logEventSchema.safeParse(payload);
      if (!checked.success) {
        toast.error("Please check the form fields.");
        return;
      }

      const res = await createLogEventAction(checked.data);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        submitType === "distribution"
          ? "Post logged — momentum updated"
          : "Event saved",
        {
          description:
            submitType === "distribution"
              ? "Dashboard and insights will refresh on the next view."
              : "Your timeline is updated.",
          duration: 4000,
        }
      );
      setOpen(false);
      form.reset({
        project_id: fixedProjectId ?? projects?.[0]?.id ?? "",
        type: defaultEventType ?? defaultType,
        entry_date: new Date().toISOString().slice(0, 10),
        title: "",
        description: "",
        external_url: "",
        url: "",
        platform: "reddit",
        image_storage_path: null,
        amount: "",
        category: "",
        revenue_source: "",
        partner_name: "",
        revenue_share_percentage: "",
        dist_views: "",
        dist_likes: "",
        dist_comments: "",
        cost_type: "one_time",
        recurrence_option: "monthly",
        recurrence_label: "",
        linked_distribution_entry_id: "",
        dist_subreddit: "",
        cross_post_track: false,
        cross_post_attach: "new",
        content_group_existing_id: "",
        new_content_group_title: "",
        new_content_group_description: "",
        build_kind: "progress",
      });
      setFile(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const descLabel = "Notes";
  const dialogTitle = isContextLocked
    ? (CONTEXT_EVENT_TITLE[defaultEventType!] ?? "Log event")
    : "Log event";
  const dialogDescription = isContextLocked
    ? contextDialogDescription(defaultEventType!)
    : "Pick what happened, add details, and save — fast.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children != null ? (
        <DialogTriggerMerge>
          {children as ReactElement<Record<string, unknown>>}
        </DialogTriggerMerge>
      ) : null}
      <DialogContent
        className={cn(
          "max-h-[min(90vh,760px)] overflow-y-auto rounded-2xl",
          isDistributionFlow ? "sm:max-w-xl" : "sm:max-w-lg"
        )}
      >
        <DialogHeader className="space-y-1.5 text-left">
          {isDistributionFlow ? (
            <>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                {distQuick ? "Quick log post" : "Log post"}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-zinc-600">
                {distQuick
                  ? "Platform, link, title, and views — add more detail anytime from Distribution."
                  : "Track how this post performs over time"}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </>
          )}
        </DialogHeader>
        <form
          className={cn("space-y-4", isDistributionFlow && "space-y-5")}
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <input type="hidden" {...form.register("project_id")} />
          {showProjectSelect ? (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={(v) => {
                  if (v) {
                    form.setValue("project_id", v);
                    form.setValue("linked_distribution_entry_id", "");
                  }
                }}
              >
                <SelectTrigger className="rounded-lg border-zinc-200">
                  <SelectValue placeholder="Choose project">
                    {selectedProject?.name ?? "Choose project"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {isDistributionFlow && !fixedProject && (projects?.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-900">
              Add a project first, then log distribution posts under that project.
            </p>
          ) : null}
          {!showProjectSelect && fixedProject ? (
            <div className="space-y-1.5">
              <Label>Project</Label>
              <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-[13px] font-medium text-zinc-800">
                {fixedProject.name}
              </div>
            </div>
          ) : null}
          {!isContextLocked ? (
            <div className="space-y-2">
              <Label>What happened?</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PRIMARY_TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        form.setValue("type", opt.value);
                        form.setValue("image_storage_path", null);
                        form.setValue("external_url", "");
                        form.setValue("url", "");
                        form.setValue("amount", "");
                        form.setValue("category", "");
                        form.setValue("revenue_source", "");
                        form.setValue("partner_name", "");
                        form.setValue("revenue_share_percentage", "");
                        form.setValue("linked_distribution_entry_id", "");
                        form.setValue("dist_views", "");
                        form.setValue("dist_likes", "");
                        form.setValue("dist_comments", "");
                        form.setValue("cost_type", "one_time");
                        form.setValue("recurrence_option", "monthly");
                        form.setValue("recurrence_label", "");
                        form.setValue("title", "");
                        form.setValue("description", "");
                        form.setValue("build_kind", "progress");
                        setFile(null);
                      }}
                      className={cn(
                        "inline-flex min-h-[2.75rem] items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-[12px] font-medium leading-snug transition-colors sm:text-[13px]",
                        selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      )}
                    >
                      <Icon className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-zinc-900">Details</Label>
            <div className="space-y-4 pt-0.5">
          {effectiveType === "distribution" ? (
            <div
              className={cn(
                "space-y-6 rounded-xl border-x border-b border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/50 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5",
                DISTRIBUTION_SHELL_ACCENT[distPlatform]
              )}
            >
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-zinc-900">
                  Platform
                </Label>
                <Select
                  value={distPlatform}
                  onValueChange={(v) =>
                    form.setValue("platform", v as DistributionPlatform)
                  }
                >
                  <SelectTrigger
                    ref={platformTriggerRef}
                    className="h-10 w-full max-w-full rounded-xl border-zinc-200/90 bg-white py-2 shadow-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    {PLATFORM_ORDER.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        <span className="inline-flex items-center gap-2">
                          <PlatformIcon platform={opt} className="size-3.5" />
                          {DISTRIBUTION_PLATFORM_LABELS[opt]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {distPlatform === "reddit" ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="ev-dist-subreddit"
                    className="text-[13px] font-semibold text-zinc-900"
                  >
                    Subreddit{" "}
                    <span className="font-normal text-zinc-500">(optional)</span>
                  </Label>
                  <Input
                    id="ev-dist-subreddit"
                    className="h-10 rounded-xl border-zinc-200/90 bg-white text-[15px] shadow-sm"
                    placeholder="e.g. SaaS (no r/)"
                    autoComplete="off"
                    {...form.register("dist_subreddit")}
                  />
                  <p className="text-[11px] text-zinc-500">
                    Track which community this ran in for cross-post comparisons.
                  </p>
                </div>
              ) : null}

              <TooltipProvider delay={200}>
                <div className="space-y-3 rounded-xl border border-zinc-200/70 bg-white/60 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      id="ev-cross-post-track"
                      type="checkbox"
                      className="mt-1 size-4 rounded border-zinc-300 text-zinc-900"
                      checked={crossPostTrack}
                      onChange={(e) =>
                        form.setValue("cross_post_track", e.target.checked)
                      }
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label
                        htmlFor="ev-cross-post-track"
                        className="cursor-pointer text-[13px] font-semibold text-zinc-900"
                      >
                        Cross-post tracking
                      </Label>
                      <p className="text-[12px] leading-snug text-zinc-500">
                        Link this post to the same content idea published elsewhere (Pro).
                      </p>
                    </div>
                  </div>

                  {crossPostTrack ? (
                    <div className="space-y-4 border-t border-zinc-200/60 pt-4">
                      {!isPro ? (
                        <button
                          type="button"
                          className="w-full rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-left text-[12px] font-medium text-amber-950"
                          onClick={() => openUpgrade()}
                        >
                          Upgrade to Pro to compare the same content across platforms and
                          communities
                        </button>
                      ) : null}
                      <div className={cn(!isPro && "opacity-55")}>
                      <div className="space-y-2">
                        <Label className="text-[12px] text-zinc-700">Attach to</Label>
                        <Select
                          value={crossPostAttach}
                          onValueChange={(v) =>
                            form.setValue(
                              "cross_post_attach",
                              v as "new" | "existing"
                            )
                          }
                          disabled={!isPro}
                        >
                          <SelectTrigger className="h-10 rounded-xl border-zinc-200/90 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New content group</SelectItem>
                            <SelectItem value="existing">Existing group</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {crossPostAttach === "new" ? (
                        <>
                          <div className="space-y-2">
                            <Label
                              htmlFor="ev-new-cg-title"
                              className="text-[12px] text-zinc-700"
                            >
                              Content group title
                            </Label>
                            <Input
                              id="ev-new-cg-title"
                              className="h-10 rounded-xl border-zinc-200/90 bg-white"
                              placeholder="e.g. April launch thread"
                              disabled={!isPro}
                              title={
                                !isPro
                                  ? "Upgrade to Pro to compare the same content across platforms and communities"
                                  : undefined
                              }
                              {...form.register("new_content_group_title")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="ev-new-cg-desc"
                              className="text-[12px] text-zinc-700"
                            >
                              Description{" "}
                              <span className="font-normal text-zinc-500">(optional)</span>
                            </Label>
                            <Textarea
                              id="ev-new-cg-desc"
                              className="min-h-[72px] rounded-xl border-zinc-200/90 bg-white"
                              placeholder="What is this piece of content about?"
                              disabled={!isPro}
                              {...form.register("new_content_group_description")}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-[12px] text-zinc-700">Content group</Label>
                          <Select
                            value={form.watch("content_group_existing_id") || "__none__"}
                            onValueChange={(v) =>
                              form.setValue(
                                "content_group_existing_id",
                                v === "__none__" || v == null ? "" : v
                              )
                            }
                            disabled={!isPro}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-zinc-200/90 bg-white">
                              <SelectValue placeholder="Choose a group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Select…</SelectItem>
                              {contentGroupOptions.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isPro && contentGroupOptions.length === 0 ? (
                            <p className="text-[11px] text-zinc-500">
                              No groups yet — choose &quot;New content group&quot; above.
                            </p>
                          ) : null}
                        </div>
                      )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </TooltipProvider>

              <div className="space-y-2">
                <Label htmlFor="ev-url" className="text-[13px] font-semibold text-zinc-900">
                  Link
                </Label>
                <Input
                  id="ev-url"
                  className="h-10 rounded-xl border-zinc-200/90 bg-white text-[15px] shadow-sm"
                  placeholder="Paste post link"
                  autoComplete="off"
                  {...distUrlField}
                  ref={(el) => {
                    postUrlInputRef.current = el;
                    distUrlField.ref(el);
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label
                        htmlFor="ev-dist-views"
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500"
                      >
                        Views
                      </Label>
                      <span className="text-[11px] text-zinc-500">Optional</span>
                    </div>
                    <Input
                      id="ev-dist-views"
                      type="number"
                      min="0"
                      step="1"
                      className="mt-2 h-9 border-0 bg-transparent p-0 text-lg font-semibold tabular-nums text-zinc-900 shadow-none focus-visible:ring-0"
                      placeholder="—"
                      {...form.register("dist_views")}
                    />
                </div>
              </div>

              {!distQuick ? (
                <div className="space-y-2 rounded-xl border border-dashed border-zinc-200/90 bg-white/70 p-4">
                  <Label
                    htmlFor="ev-file-dist"
                    className="text-[13px] font-semibold text-zinc-900"
                  >
                    Upload analytics screenshot
                  </Label>
                  <p className="text-[12px] leading-snug text-zinc-500">
                    We&apos;ll extract metrics automatically
                  </p>
                  <Input
                    id="ev-file-dist"
                    type="file"
                    accept={TIMELINE_SNAPSHOT_ACCEPT}
                    className="cursor-pointer rounded-lg border-zinc-200/80 bg-white text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-zinc-800"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {screenshotProcessing ? (
                    <p className="flex items-center gap-2 text-[12px] font-medium text-zinc-600">
                      <Loader2
                        className="size-3.5 shrink-0 animate-spin text-zinc-500"
                        aria-hidden
                      />
                      Processing…
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="ev-desc-dist" className="text-[13px] text-zinc-800">
                  Notes{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </Label>
                <Textarea
                  id="ev-desc-dist"
                  className="min-h-[80px] rounded-xl border-zinc-200/90 bg-white shadow-sm"
                  placeholder="Anything interesting about this post?"
                  {...form.register("description")}
                />
              </div>
            </div>
          ) : null}
          {effectiveType === "insight" ? (
            <div className="space-y-2">
              <Textarea
                id="ev-insight-body"
                className="min-h-[140px] rounded-lg border-zinc-200"
                placeholder="What did you learn or notice?"
                aria-label="Insight"
                {...form.register("description")}
              />
            </div>
          ) : null}
          {effectiveType === "build" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ev-build-title">
                  Title{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </Label>
                <Input
                  id="ev-build-title"
                  className="rounded-lg border-zinc-200"
                  placeholder="e.g. Landing page refresh"
                  {...form.register("title")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-build-kind">Kind</Label>
                <Select
                  value={form.watch("build_kind")}
                  onValueChange={(v) =>
                    form.setValue("build_kind", v as BuildProgressKind)
                  }
                >
                  <SelectTrigger
                    id="ev-build-kind"
                    className="rounded-lg border-zinc-200"
                  >
                    <SelectValue placeholder="Kind" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-build-desc">What changed?</Label>
                <Textarea
                  id="ev-build-desc"
                  className="min-h-[120px] rounded-lg border-zinc-200"
                  placeholder="Notes, scope, or outcomes — this is the main entry."
                  required
                  {...form.register("description")}
                />
              </div>
            </>
          ) : null}
          {effectiveType !== "distribution" &&
          effectiveType !== "cost" &&
          effectiveType !== "revenue" &&
          effectiveType !== "deal" &&
          effectiveType !== "insight" &&
          effectiveType !== "build" ? (
            <div className="space-y-2">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                className="rounded-lg border-zinc-200"
                {...form.register("title")}
              />
            </div>
          ) : null}
          {effectiveType !== "distribution" &&
          effectiveType !== "cost" &&
          effectiveType !== "revenue" &&
          effectiveType !== "deal" &&
          effectiveType !== "insight" &&
          effectiveType !== "build" ? (
            <div className="space-y-2">
              <Label htmlFor="ev-desc">{descLabel}</Label>
              <Textarea
                id="ev-desc"
                className="min-h-[88px] rounded-lg border-zinc-200"
                {...form.register("description")}
              />
            </div>
          ) : null}
          {effectiveType === "cost" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ev-amount-cost">Amount</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-zinc-500">
                    $
                  </span>
                  <Input
                    id="ev-amount-cost"
                    inputMode="decimal"
                    className="rounded-lg border-zinc-200 pl-7 font-medium tabular-nums"
                    placeholder="200.00"
                    {...form.register("amount")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.watch("category") || ""}
                  onValueChange={(v) => form.setValue("category", v ?? "")}
                >
                  <SelectTrigger className="rounded-lg border-zinc-200">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {["ads", "tools", "subscriptions", "contractor", "other"].map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-cost-desc">Description</Label>
                <Textarea
                  id="ev-cost-desc"
                  className="min-h-[88px] rounded-lg border-zinc-200"
                  placeholder="What was this expense for?"
                  {...form.register("description")}
                />
              </div>
            </>
          ) : null}
          {effectiveType === "revenue" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ev-amount-revenue">Amount</Label>
                <Input
                  id="ev-amount-revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-lg border-zinc-200"
                  placeholder="500"
                  {...form.register("amount")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-revenue-source">Source</Label>
                <Input
                  id="ev-revenue-source"
                  className="rounded-lg border-zinc-200"
                  placeholder="subscriptions"
                  {...form.register("revenue_source")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-revenue-notes">
                  Notes{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </Label>
                <Textarea
                  id="ev-revenue-notes"
                  className="min-h-[88px] rounded-lg border-zinc-200"
                  placeholder="Any context for this revenue"
                  {...form.register("description")}
                />
              </div>
            </>
          ) : null}
          {effectiveType === "deal" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ev-partner-name">Deal name</Label>
                <Input
                  id="ev-partner-name"
                  className="rounded-lg border-zinc-200"
                  placeholder="e.g. Agency partner"
                  {...form.register("partner_name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-share">Value</Label>
                <p className="text-[11px] text-zinc-500">
                  Revenue share percentage (0–100).
                </p>
                <Input
                  id="ev-share"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="rounded-lg border-zinc-200"
                  placeholder="15"
                  {...form.register("revenue_share_percentage")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-deal-notes">
                  Notes{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </Label>
                <Textarea
                  id="ev-deal-notes"
                  className="min-h-[88px] rounded-lg border-zinc-200"
                  placeholder="Terms, next steps, or context"
                  {...form.register("description")}
                />
              </div>
            </>
          ) : null}
          {effectiveType === "link" ? (
            <div className="space-y-2">
              <Label htmlFor="ev-ext-url">URL</Label>
              <Input
                id="ev-ext-url"
                className="rounded-lg border-zinc-200"
                placeholder="https://"
                {...form.register("external_url")}
              />
            </div>
          ) : null}
          {effectiveType === "snapshot" ||
          effectiveType === "build" ||
          effectiveType === "experiment" ? (
            <div className="space-y-2">
              <Label htmlFor="ev-file">
                Screenshot{effectiveType === "snapshot" ? "" : " (optional)"}
              </Label>
              <Input
                id="ev-file"
                type="file"
                accept={TIMELINE_SNAPSHOT_ACCEPT}
                className="rounded-lg border-zinc-200"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}
            </div>
          </div>
          <div className="space-y-2 border-t border-zinc-200/60 pt-4">
            <Label
              htmlFor="ev-date-shared"
              className="text-[13px] font-semibold text-zinc-900"
            >
              Date
            </Label>
            <Input
              id="ev-date-shared"
              type="date"
              className="h-10 max-w-[11rem] rounded-xl border-zinc-200/90 bg-white shadow-sm"
              {...form.register("entry_date")}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-lg bg-zinc-900 hover:bg-zinc-800"
              disabled={pending || (isDistributionFlow && !hasProjectContext)}
            >
              {pending
                ? "Saving…"
                : defaultEventType === "cost"
                  ? "Save cost"
                  : isDistributionFlow
                    ? "Log post"
                    : "Save event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
