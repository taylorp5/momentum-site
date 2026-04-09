"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  DollarSign,
  FileImage,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Lightbulb,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { applyScreenshotIntakeAction } from "@/app/actions/screenshot-intake";
import { updateProjectAction } from "@/app/actions/projects";
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
import { Textarea } from "@/components/ui/textarea";
import { localCalendarTodayIso } from "@/lib/cost-recurrence";
import { DISTRIBUTION_PLATFORM_LABELS, TIMELINE_BUCKET, TIMELINE_SNAPSHOT_ACCEPT, TIMELINE_SNAPSHOT_MAX_BYTES } from "@/lib/constants";
import { PLATFORM_ORDER } from "@/lib/platform-config";
import { isSupabaseConfigured } from "@/lib/env";
import {
  buildPerformanceNotes,
  classificationLabel,
  classifyImageMock,
  isLowConfidenceClassification,
  isRevenuePreFillOk,
  type ClassificationResult,
  type ImageClassification,
} from "@/lib/services/screenshot-intake";
import { createClient } from "@/lib/supabase/client";
import type { DistributionPlatform, Project } from "@/types/momentum";

type Props = {
  projects: Project[];
};

type WizardStep = "upload" | "review" | "form";

type FormKind =
  | "revenue"
  | "performance_metrics"
  | "insight"
  | "distribution"
  | "snapshot_asset"
  | "snapshot_timeline"
  | "snapshot_doc"
  | "snapshot_unknown"
  | "note"
  | "note_doc"
  | "set_logo";

const LOGOS_BUCKET = "project-logos";

function projectDisplayName(p: Project | undefined): string {
  const n = p?.name?.trim();
  return n ? n : "Untitled project";
}

function signalRows(r: ClassificationResult): Array<{ label: string; value: string }> {
  const s = r.signals;
  const rows: Array<{ label: string; value: string }> = [];
  if (s.revenue != null && s.revenueConfidenceOk) {
    rows.push({
      label: "Revenue (suggested)",
      value: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(s.revenue),
    });
  }
  if (s.timeRangeLabel) rows.push({ label: "Time range", value: s.timeRangeLabel });
  if (s.customers != null) rows.push({ label: "Customers", value: String(s.customers) });
  if (s.metricsSummary) rows.push({ label: "Metrics", value: s.metricsSummary });
  if (s.views != null) rows.push({ label: "Views", value: String(s.views) });
  if (s.likes != null) rows.push({ label: "Likes", value: String(s.likes) });
  if (s.comments != null) rows.push({ label: "Comments", value: String(s.comments) });
  if (s.likelyLogo) rows.push({ label: "Content", value: "Possible logo or brand mark" });
  if (s.likelyUi) rows.push({ label: "UI", value: "Possible interface screenshot" });
  if (s.likelyProductVisual) rows.push({ label: "Product", value: "Possible product visual" });
  if (s.textHeavy) rows.push({ label: "Layout", value: "Text-heavy" });
  return rows;
}

export function UploadScreenshotDialog({ projects }: Props) {
  const router = useRouter();
  const { isPro, openUpgrade } = usePlan();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("upload");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [formProjectId, setFormProjectId] = useState("");
  const [formDate, setFormDate] = useState(() => localCalendarTodayIso());
  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueSource, setRevenueSource] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [distributionUrl, setDistributionUrl] = useState("");
  const [distributionPlatform, setDistributionPlatform] =
    useState<DistributionPlatform>("other");

  useEffect(() => {
    if (projects.length === 0) {
      setProjectId("");
      return;
    }
    if (!projectId || !projects.some((p) => p.id === projectId)) {
      setProjectId(projects[0]!.id);
    }
  }, [projects, projectId]);

  function resetFormState() {
    setFile(null);
    setClassification(null);
    setStoragePath(null);
    setStep("upload");
    setFormKind(null);
    setFormProjectId("");
    setFormDate(localCalendarTodayIso());
    setRevenueAmount("");
    setRevenueSource("");
    setEntryTitle("");
    setEntryNotes("");
    setDistributionUrl("");
    setDistributionPlatform("other");
  }

  async function runClassification() {
    if (!file) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 700));
    setClassification(classifyImageMock(file));
    setProcessing(false);
    setStep("review");
  }

  function startForm(kind: FormKind) {
    setFormKind(kind);
    setFormProjectId(projectId);
    setFormDate(localCalendarTodayIso());
    const c = classification;
    const sig = c?.signals;

    switch (kind) {
      case "revenue":
        if (sig && isRevenuePreFillOk(sig)) {
          setRevenueAmount(String(sig.revenue));
          setRevenueSource(sig.platform ? "analytics" : "");
        } else {
          setRevenueAmount("");
          setRevenueSource("");
        }
        setEntryTitle("");
        setEntryNotes("");
        break;
      case "performance_metrics":
        setEntryTitle("Performance metrics");
        setEntryNotes(sig ? buildPerformanceNotes(sig) : "");
        break;
      case "insight":
        setEntryTitle("Insight from screenshot");
        setEntryNotes("");
        break;
      case "distribution":
        setDistributionUrl("");
        setEntryTitle(c?.title ?? "Distribution post");
        setEntryNotes("");
        break;
      case "snapshot_asset":
        setEntryTitle("Project asset");
        setEntryNotes("Saved from screenshot upload.");
        break;
      case "snapshot_timeline":
      case "snapshot_doc":
      case "snapshot_unknown":
        setEntryTitle(c?.title ?? "Screenshot");
        setEntryNotes("");
        break;
      case "note":
      case "note_doc":
        setEntryTitle("Note");
        setEntryNotes("");
        break;
      case "set_logo":
        setEntryNotes("");
        break;
      default:
        break;
    }
    setStep("form");
  }

  async function uploadFileToStorage(targetProjectId: string): Promise<string | null> {
    if (!file || !targetProjectId) return null;
    if (!isSupabaseConfigured()) {
      toast.error("Supabase is required for uploads.");
      return null;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in required.");
      return null;
    }
    if (file.size > TIMELINE_SNAPSHOT_MAX_BYTES) {
      toast.error("Screenshot is too large.");
      return null;
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${targetProjectId}/intake-${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from(TIMELINE_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      toast.error(upErr.message);
      return null;
    }
    return path;
  }

  async function ensureStoragePath(targetProjectId: string): Promise<string | null> {
    if (storagePath?.includes(`/${targetProjectId}/`)) return storagePath;
    setStoragePath(null);
    const path = await uploadFileToStorage(targetProjectId);
    if (path) setStoragePath(path);
    return path;
  }

  async function submitSetLogo() {
    if (!file || !isPro) return;
    const pid = formProjectId;
    const p = projects.find((x) => x.id === pid);
    if (!p) {
      toast.error("Choose a project.");
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.error("Supabase is required.");
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
      const objectPath = `${user.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(LOGOS_BUCKET)
        .upload(objectPath, file, { upsert: false, cacheControl: "3600" });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from(LOGOS_BUCKET).getPublicUrl(objectPath);
      const res = await updateProjectAction({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        logo_url: pub.publicUrl,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Project logo updated.");
      router.refresh();
      setOpen(false);
      resetFormState();
    } finally {
      setSaving(false);
    }
  }

  async function submitTimelineEntry() {
    if (!isPro) {
      toast.message("Screenshot upload is a Pro feature", {
        description: "Upgrade to save screenshots to Momentum.",
      });
      openUpgrade();
      return;
    }
    if (!classification || !formKind) return;
    const pid = formProjectId;
    if (!pid || !projects.some((p) => p.id === pid)) {
      toast.error("Choose a project.");
      return;
    }

    if (formKind === "set_logo") {
      await submitSetLogo();
      return;
    }

    const path = await ensureStoragePath(pid);
    if (!path) return;

    const sig = classification.signals;
    const src = classification.title;

    if (formKind === "revenue") {
      const normalized = revenueAmount.replace(/[$,\s]/g, "");
      const n = Number(normalized);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error("Enter a positive revenue amount.");
        return;
      }
      setSaving(true);
      try {
        const res = await applyScreenshotIntakeAction({
          project_id: pid,
          destination: "revenue",
          entry_date: formDate,
          image_storage_path: path,
          source_label: src,
          notes: entryNotes,
          amount: n,
          revenue_source: revenueSource,
          detected: {
            platform: sig.platform,
            views: sig.views,
            likes: sig.likes,
            comments: sig.comments,
            amount: sig.revenue,
            revenueSource: revenueSource || undefined,
          },
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Revenue logged.");
        setOpen(false);
        resetFormState();
        router.refresh();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formKind === "performance_metrics") {
      setSaving(true);
      try {
        const res = await applyScreenshotIntakeAction({
          project_id: pid,
          destination: "snapshot",
          entry_date: formDate,
          image_storage_path: path,
          source_label: src,
          notes: entryNotes,
          entry_title: entryTitle.trim() || "Performance metrics",
          detected: {
            platform: sig.platform,
            views: sig.views,
            likes: sig.likes,
            comments: sig.comments,
          },
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Performance snapshot saved.");
        setOpen(false);
        resetFormState();
        router.refresh();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formKind === "distribution") {
      const u = distributionUrl.trim();
      if (!u || !/^https?:\/\//i.test(u)) {
        toast.error("Paste a valid post URL (https://…).");
        return;
      }
      setSaving(true);
      try {
        const res = await applyScreenshotIntakeAction({
          project_id: pid,
          destination: "distribution",
          entry_date: formDate,
          image_storage_path: path,
          source_label: src,
          notes: entryNotes,
          distribution_url: u,
          detected: {
            platform: distributionPlatform,
            views: sig.views,
            likes: sig.likes,
            comments: sig.comments,
          },
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Attached to distribution.");
        setOpen(false);
        resetFormState();
        router.refresh();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (
      formKind === "snapshot_asset" ||
      formKind === "snapshot_timeline" ||
      formKind === "snapshot_doc" ||
      formKind === "snapshot_unknown"
    ) {
      const t = entryTitle.trim();
      if (!t) {
        toast.error("Add a title.");
        return;
      }
      setSaving(true);
      try {
        const res = await applyScreenshotIntakeAction({
          project_id: pid,
          destination: "snapshot",
          entry_date: formDate,
          image_storage_path: path,
          source_label: src,
          notes: entryNotes,
          entry_title: t,
          detected: {},
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Saved to timeline.");
        setOpen(false);
        resetFormState();
        router.refresh();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formKind === "insight") {
      const t = entryTitle.trim();
      if (!t) {
        toast.error("Add a title.");
        return;
      }
      setSaving(true);
      try {
        const res = await applyScreenshotIntakeAction({
          project_id: pid,
          destination: "insight",
          entry_date: formDate,
          image_storage_path: path,
          source_label: src,
          notes: entryNotes,
          entry_title: t,
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Insight saved.");
        setOpen(false);
        resetFormState();
        router.refresh();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formKind === "note" || formKind === "note_doc") {
      const t = entryTitle.trim();
      if (!t) {
        toast.error("Add a title.");
        return;
      }
      setSaving(true);
      try {
        const res = await applyScreenshotIntakeAction({
          project_id: pid,
          destination: "note",
          entry_date: formDate,
          image_storage_path: path,
          source_label: src,
          notes: entryNotes,
          entry_title: t,
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Note saved.");
        setOpen(false);
        resetFormState();
        router.refresh();
      } finally {
        setSaving(false);
      }
    }
  }

  const reviewRows = useMemo(
    () => (classification ? signalRows(classification) : []),
    [classification]
  );

  const uncertain = classification && isLowConfidenceClassification(classification);
  const showRevenueHint =
    classification?.classification === "analytics" &&
    !isRevenuePreFillOk(classification.signals);

  function renderActionButtons(c: ImageClassification) {
    const btn =
      "flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left text-[13px] transition-colors hover:border-zinc-300 hover:bg-zinc-50";
    const sub = "mt-0.5 block text-[12px] font-normal text-zinc-500";

    if (c === "analytics") {
      return (
        <div className="grid gap-2">
          <button type="button" className={btn} onClick={() => startForm("revenue")}>
            <DollarSign className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            <span>
              <span className="font-semibold text-zinc-900">Log as revenue</span>
              <span className={sub}>Confirm amount and date — we won&apos;t save $0 unless you enter it.</span>
            </span>
          </button>
          <button type="button" className={btn} onClick={() => startForm("performance_metrics")}>
            <BarChart3 className="mt-0.5 size-4 shrink-0 text-sky-700" />
            <span>
              <span className="font-semibold text-zinc-900">Log performance metrics</span>
              <span className={sub}>Save as a timeline snapshot with detected metrics in the notes.</span>
            </span>
          </button>
          <button type="button" className={btn} onClick={() => startForm("insight")}>
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-800" />
            <span>
              <span className="font-semibold text-zinc-900">Save as insight</span>
              <span className={sub}>A short reflection tied to this image.</span>
            </span>
          </button>
          <button type="button" className={btn} onClick={() => startForm("distribution")}>
            <Link2 className="mt-0.5 size-4 shrink-0 text-violet-800" />
            <span>
              <span className="font-semibold text-zinc-900">Attach to distribution</span>
              <span className={sub}>You&apos;ll paste the post URL — we don&apos;t invent links.</span>
            </span>
          </button>
        </div>
      );
    }
    if (c === "content_asset") {
      return (
        <div className="grid gap-2">
          <button type="button" className={btn} onClick={() => startForm("snapshot_asset")}>
            <FileImage className="mt-0.5 size-4 shrink-0 text-indigo-700" />
            <span>
              <span className="font-semibold text-zinc-900">Add to project assets</span>
              <span className={sub}>Timeline snapshot labeled as an asset.</span>
            </span>
          </button>
          <button type="button" className={btn} onClick={() => startForm("set_logo")}>
            <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <span>
              <span className="font-semibold text-zinc-900">Set as project logo</span>
              <span className={sub}>Uploads to your project&apos;s logo (confirm on next step).</span>
            </span>
          </button>
          <button type="button" className={btn} onClick={() => startForm("snapshot_timeline")}>
            <ImageIcon className="mt-0.5 size-4 shrink-0 text-sky-700" />
            <span>
              <span className="font-semibold text-zinc-900">Add to timeline</span>
              <span className={sub}>Image snapshot on your project timeline.</span>
            </span>
          </button>
        </div>
      );
    }
    if (c === "document") {
      return (
        <div className="grid gap-2">
          <button type="button" className={btn} onClick={() => startForm("note_doc")}>
            <FileText className="mt-0.5 size-4 shrink-0 text-zinc-700" />
            <span>
              <span className="font-semibold text-zinc-900">Save as note</span>
              <span className={sub}>Text-first entry with optional context.</span>
            </span>
          </button>
          <button type="button" className={btn} onClick={() => startForm("snapshot_doc")}>
            <LayoutDashboard className="mt-0.5 size-4 shrink-0 text-zinc-700" />
            <span>
              <span className="font-semibold text-zinc-900">Add to timeline</span>
              <span className={sub}>Keep the screenshot on the visual timeline.</span>
            </span>
          </button>
        </div>
      );
    }
    return (
      <div className="grid gap-2">
        <button type="button" className={btn} onClick={() => startForm("snapshot_unknown")}>
          <ImageIcon className="mt-0.5 size-4 shrink-0 text-zinc-700" />
          <span>
            <span className="font-semibold text-zinc-900">Save to project</span>
            <span className={sub}>Timeline snapshot you can title and describe.</span>
          </span>
        </button>
        <button type="button" className={btn} onClick={() => startForm("note")}>
          <FileText className="mt-0.5 size-4 shrink-0 text-zinc-700" />
          <span>
            <span className="font-semibold text-zinc-900">Add note</span>
            <span className={sub}>Capture context without emphasizing the image.</span>
          </span>
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            setOpen(false);
            resetFormState();
          }}
        >
          <Trash2 className="mt-0.5 size-4 shrink-0 text-zinc-500" />
          <span>
            <span className="font-semibold text-zinc-900">Discard</span>
            <span className={sub}>Close without saving.</span>
          </span>
        </button>
      </div>
    );
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
              description: "Upgrade to classify and save screenshots.",
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
        <DialogContent className="max-h-[min(92vh,760px)] overflow-y-auto sm:max-w-[600px] rounded-2xl border-zinc-200/90 p-0 gap-0 shadow-lg">
          <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg font-semibold tracking-tight">Upload screenshot</DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-zinc-600">
                We classify the image and suggest next steps — nothing is saved until you confirm.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-5">
            {step === "upload" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Project</Label>
                  <Select value={projectId} onValueChange={(v) => setProjectId(v ?? projectId)}>
                    <SelectTrigger className="rounded-xl border-zinc-200">
                      <SelectValue placeholder="Choose project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {projectDisplayName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="screenshot-upload-input" className="text-[13px] font-medium">
                    Image
                  </Label>
                  <input
                    ref={fileInputRef}
                    id="screenshot-upload-input"
                    type="file"
                    accept={TIMELINE_SNAPSHOT_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setClassification(null);
                      setStoragePath(null);
                    }}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0 rounded-xl border-zinc-200"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 size-4" />
                      Choose file
                    </Button>
                    <p className="min-h-10 flex-1 truncate rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-3 py-2 text-[13px] text-zinc-600">
                      {file ? (
                        <span className="font-medium text-zinc-900">{file.name}</span>
                      ) : (
                        "PNG, JPG, or WebP"
                      )}
                    </p>
                  </div>
                </div>
                {processing ? (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[13px] text-zinc-700">
                    <Loader2 className="size-4 animate-spin text-zinc-500" />
                    Classifying image…
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <Button
                      className="rounded-xl"
                      onClick={() => void runClassification()}
                      disabled={!file || !projectId || processing}
                    >
                      Analyze
                    </Button>
                  </div>
                )}
              </>
            ) : null}

            {step === "review" && classification ? (
              <>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Here&apos;s what we think this is
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[12px] font-semibold text-zinc-900">
                      {classificationLabel(classification.classification)}
                    </span>
                    <span className="text-[12px] tabular-nums text-zinc-500">
                      {Math.round(classification.confidence * 100)}% match
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{classification.summary}</p>

                  {uncertain ? (
                    <p className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-950">
                      Not sure what this is — choose how to save it below.
                    </p>
                  ) : null}

                  {showRevenueHint ? (
                    <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] text-zinc-700">
                      We couldn&apos;t confidently extract revenue — you can still log it manually.
                    </p>
                  ) : null}

                  {reviewRows.length > 0 ? (
                    <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
                      {reviewRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex justify-between gap-3 text-[13px]"
                        >
                          <dt className="text-zinc-500">{row.label}</dt>
                          <dd className="text-right font-medium text-zinc-900">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>

                <div>
                  <p className="text-[13px] font-semibold text-zinc-900">What would you like to do?</p>
                  <p className="mt-0.5 text-[12px] text-zinc-500">
                    Pick an action — you&apos;ll confirm details before anything is saved.
                  </p>
                  <div className="mt-3">{renderActionButtons(classification.classification)}</div>
                </div>

                <Button type="button" variant="ghost" className="px-0 text-[13px]" onClick={() => setStep("upload")}>
                  ← Back
                </Button>
              </>
            ) : null}

            {step === "form" && formKind && classification ? (
              <>
                <p className="text-[12px] text-zinc-500">
                  {formKind === "set_logo"
                    ? "This will replace the project logo using this file."
                    : "Review and edit, then save."}
                </p>

                {formKind !== "set_logo" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select value={formProjectId} onValueChange={(v) => setFormProjectId(v ?? formProjectId)}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {projectDisplayName(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ss-date">Date</Label>
                      <Input
                        id="ss-date"
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="max-w-[11rem] rounded-xl"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={formProjectId} onValueChange={(v) => setFormProjectId(v ?? formProjectId)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {projectDisplayName(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formKind === "revenue" ? (
                  <>
                    {showRevenueHint ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[13px] text-amber-950">
                        Enter the revenue amount — we don&apos;t assume a value.
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="ss-amt">Amount</Label>
                      <div className="relative max-w-[14rem]">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                        <Input
                          id="ss-amt"
                          inputMode="decimal"
                          className="rounded-xl pl-7"
                          placeholder="0.00"
                          value={revenueAmount}
                          onChange={(e) => setRevenueAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ss-src">Source (optional)</Label>
                      <Input
                        id="ss-src"
                        className="rounded-xl"
                        placeholder="e.g. Stripe"
                        value={revenueSource}
                        onChange={(e) => setRevenueSource(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {formKind === "distribution" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select
                        value={distributionPlatform}
                        onValueChange={(v) => setDistributionPlatform(v as DistributionPlatform)}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORM_ORDER.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {DISTRIBUTION_PLATFORM_LABELS[opt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ss-url">Post URL</Label>
                      <Input
                        id="ss-url"
                        type="url"
                        className="rounded-xl"
                        placeholder="https://…"
                        value={distributionUrl}
                        onChange={(e) => setDistributionUrl(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}

                {formKind !== "revenue" &&
                formKind !== "distribution" &&
                formKind !== "set_logo" ? (
                  <div className="space-y-2">
                    <Label htmlFor="ss-title">Title</Label>
                    <Input
                      id="ss-title"
                      className="rounded-xl"
                      value={entryTitle}
                      onChange={(e) => setEntryTitle(e.target.value)}
                    />
                  </div>
                ) : null}

                {formKind !== "set_logo" && formKind !== "revenue" && formKind !== "distribution" ? (
                  <div className="space-y-2">
                    <Label htmlFor="ss-notes">Notes (optional)</Label>
                    <Textarea
                      id="ss-notes"
                      rows={4}
                      className="min-h-[100px] resize-y rounded-xl"
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                    />
                  </div>
                ) : null}

                {formKind === "revenue" || formKind === "distribution" ? (
                  <div className="space-y-2">
                    <Label htmlFor="ss-notes2">Notes (optional)</Label>
                    <Textarea
                      id="ss-notes2"
                      rows={3}
                      className="resize-y rounded-xl"
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-between gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep("review");
                      setFormKind(null);
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl"
                    onClick={() => void submitTimelineEntry()}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : formKind === "set_logo" ? "Set logo" : "Save"}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
