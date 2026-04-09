"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  DollarSign,
  Loader2,
  MessageCircle,
  Receipt,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { applyScreenshotIntakeAction } from "@/app/actions/screenshot-intake";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMELINE_BUCKET, TIMELINE_SNAPSHOT_ACCEPT, TIMELINE_SNAPSHOT_MAX_BYTES } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { mockDetectScreenshot, type DetectionResult, type IntakeDestination, type IntakeKind } from "@/lib/services/screenshot-intake";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/momentum";

type Props = {
  projects: Project[];
};

const KINDS: Array<{ id: IntakeKind; label: string; Icon: LucideIcon }> = [
  { id: "distribution_performance", label: "Distribution performance", Icon: BarChart3 },
  { id: "revenue_analytics", label: "Revenue / subscription analytics", Icon: DollarSign },
  { id: "cost_receipt", label: "Cost / receipt", Icon: Receipt },
  { id: "outreach_conversation", label: "Outreach / conversation", Icon: MessageCircle },
  { id: "product_moment", label: "Product / timeline moment", Icon: Sparkles },
  { id: "auto", label: "Let Momentum suggest", Icon: Wand2 },
];

const DESTINATIONS: Array<{ id: IntakeDestination; label: string }> = [
  { id: "timeline", label: "Timeline" },
  { id: "distribution", label: "Distribution" },
  { id: "costs", label: "Expenses" },
  { id: "revenue", label: "Revenue" },
  { id: "outreach", label: "Outreach" },
  { id: "swipe_file", label: "Swipe file" },
];

function projectDisplayName(p: Project | undefined): string {
  const n = p?.name?.trim();
  return n ? n : "Untitled project";
}

export function UploadScreenshotDialog({ projects }: Props) {
  const { isPro, openUpgrade } = usePlan();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IntakeKind>("auto");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detected, setDetected] = useState<DetectionResult | null>(null);
  const [destination, setDestination] = useState<IntakeDestination>("timeline");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestedLabel = useMemo(
    () => DESTINATIONS.find((d) => d.id === detected?.suggestedDestination)?.label,
    [detected]
  );

  useEffect(() => {
    if (projects.length === 0) {
      setProjectId("");
      return;
    }
    if (!projectId || !projects.some((p) => p.id === projectId)) {
      setProjectId(projects[0]!.id);
    }
  }, [projects, projectId]);

  async function runDetection() {
    if (!file) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 900));
    const out = mockDetectScreenshot(kind);
    setDetected(out);
    setDestination(out.suggestedDestination);
    setProcessing(false);
  }

  function resetFormState() {
    setFile(null);
    setDetected(null);
    setNotes("");
  }

  async function onApply() {
    if (!isPro) {
      toast.message("Screenshot upload is a Pro feature", {
        description: "Upgrade to turn screenshots into structured entries.",
      });
      openUpgrade();
      return;
    }
    if (!file || !projectId) return;
    if (!detected) return;
    if (!isSupabaseConfigured()) {
      toast.error("Supabase is required for uploads.");
      return;
    }
    if (file.size > TIMELINE_SNAPSHOT_MAX_BYTES) {
      toast.error("Screenshot is too large.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in required.");
        return;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${projectId}/intake-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(TIMELINE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      const res = await applyScreenshotIntakeAction({
        project_id: projectId,
        destination,
        entry_date: new Date().toISOString().slice(0, 10),
        image_storage_path: path,
        source_label: detected.source,
        notes,
        detected: {
          platform: detected.platform,
          views: detected.views,
          likes: detected.likes,
          comments: detected.comments,
          amount: detected.amount,
          category: detected.category,
          revenueSource: detected.revenueSource,
        },
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Screenshot organized into Momentum.");
      setOpen(false);
      resetFormState();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        className="h-8 rounded-lg px-3 text-[12px]"
        title={!isPro ? "Upgrade to Pro to upload screenshots" : undefined}
        onClick={() => {
          if (!isPro) {
            toast.message("Screenshot upload is a Pro feature", {
              description: "Upgrade to auto-organize screenshots into Momentum.",
            });
            openUpgrade();
            return;
          }
          setOpen(true);
        }}
      >
        <Upload className="mr-1.5 size-3.5" /> Upload screenshot
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetFormState();
        }}
      >
        <DialogContent className="overflow-visible sm:max-w-[620px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Upload screenshot</DialogTitle>
            <DialogDescription>
              Turn scattered screenshots into structured product memory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={(v) => setProjectId(v ?? projectId)}>
                <SelectTrigger className="h-auto min-h-9 w-full max-w-full py-2 text-left whitespace-normal [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:text-left">
                  <SelectValue placeholder="Choose project">
                    {(value: string | null) => {
                      if (value == null || value === "") return "Choose project";
                      const p = projects.find((x) => x.id === value);
                      return projectDisplayName(p);
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false} sideOffset={6}>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {projectDisplayName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <p id="upload-screenshot-kind-label" className="text-[13px] font-semibold text-zinc-900">
                  What are you uploading?
                </p>
                <p className="text-[12px] leading-snug text-zinc-500">
                  Tap a category, add your file below, then continue.
                </p>
              </div>
              <div
                role="radiogroup"
                aria-labelledby="upload-screenshot-kind-label"
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {KINDS.map((k) => {
                  const selected = kind === k.id;
                  const { Icon } = k;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setKind(k.id);
                        setDetected(null);
                      }}
                      className={cn(
                        "flex w-full min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-[border-color,background-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected
                          ? "border-primary bg-primary/6 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]"
                          : "border-zinc-200/90 bg-zinc-50/40 hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700/80 dark:bg-zinc-900/30 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border",
                          selected
                            ? "border-primary/25 bg-primary/10 text-primary"
                            : "border-zinc-200/90 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
                        )}
                        aria-hidden
                      >
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 pt-0.5 text-[13px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                        {k.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot-upload-input">Screenshot</Label>
              <input
                ref={fileInputRef}
                id="screenshot-upload-input"
                type="file"
                accept={TIMELINE_SNAPSHOT_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setDetected(null);
                }}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 gap-2 rounded-lg border-zinc-300 bg-white px-4 text-[13px] font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-4" strokeWidth={1.75} />
                  Choose file
                </Button>
                <div className="flex min-h-10 flex-1 items-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2">
                  <p className="truncate text-[13px] text-zinc-600">
                    {file ? (
                      <span className="font-medium text-zinc-900">{file.name}</span>
                    ) : (
                      <span className="text-zinc-500">No file selected — PNG, JPG, or WebP</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {processing ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-[13px] text-zinc-700">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Processing screenshot...
                </span>
              </div>
            ) : null}

            {detected ? (
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.12em] text-zinc-500">Detected from screenshot</p>
                  <p className="mt-1 text-[14px] font-medium text-zinc-900">{detected.source}</p>
                  <p className="mt-1 text-[12px] text-zinc-600">{detected.summary}</p>
                </div>
                <p className="text-[12px] text-zinc-700">
                  Suggested destination: <span className="font-semibold">{suggestedLabel}</span>
                </p>
                <div className="text-[12px] text-zinc-700">
                  {detected.views != null ? <span className="mr-3">{detected.views} views</span> : null}
                  {detected.amount != null ? <span className="mr-3">${detected.amount}</span> : null}
                  {detected.category ? <span>{detected.category}</span> : null}
                </div>
                <div className="space-y-2">
                  <Label>Where should this go?</Label>
                  <Select value={destination} onValueChange={(v) => setDestination(v as IntakeDestination)}>
                    <SelectTrigger className="h-auto min-h-9 w-full max-w-full py-2 text-left whitespace-normal [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_[data-slot=select-value]]:text-left">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false} sideOffset={6}>
                      {DESTINATIONS.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add context before applying" />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {!detected && !processing ? (
                <Button onClick={runDetection} disabled={!file || processing}>
                  Continue
                </Button>
              ) : null}
              {detected ? (
                <Button onClick={() => void onApply()} disabled={saving}>
                  {saving ? "Applying..." : "Confirm and apply"}
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
