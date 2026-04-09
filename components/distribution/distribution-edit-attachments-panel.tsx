"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  applyExtractedMetricsToEntryAction,
  createDistributionAttachmentAction,
  deleteDistributionAttachmentAction,
  listDistributionAttachmentsAction,
  runDistributionAttachmentExtractionAction,
} from "@/app/actions/distribution";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DISTRIBUTION_ATTACHMENT_ACCEPT,
  DISTRIBUTION_ATTACHMENT_MAX_BYTES,
  DISTRIBUTION_ATTACHMENTS_BUCKET,
  DISTRIBUTION_PLATFORM_LABELS,
} from "@/lib/constants";
import { parseDistributionMetrics } from "@/lib/distribution-metrics";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  DistributionAttachment,
  DistributionMetrics,
  DistributionPlatform,
} from "@/types/momentum";

type Props = {
  timelineEntryId: string;
  projectId: string;
  userId: string;
  isPro: boolean;
  mockReadOnly: boolean;
  /** Current metrics for the anchor platform row (for comparison UI). */
  metrics: DistributionMetrics;
  onMetricsChange: (next: DistributionMetrics) => void;
};

export function DistributionEditAttachmentsPanel({
  timelineEntryId,
  projectId,
  userId,
  isPro,
  mockReadOnly,
  metrics,
  onMetricsChange,
}: Props) {
  const { openUpgrade } = usePlan();
  const [attachments, setAttachments] = useState<
    Array<DistributionAttachment & { signed_url: string }>
  >([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(
    null
  );
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [runningExtractionId, setRunningExtractionId] = useState<string | null>(null);
  const [dismissingReviewIds, setDismissingReviewIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissingReviewIds([]);
  }, [timelineEntryId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingAttachments(true);
    void listDistributionAttachmentsAction({
      timeline_entry_id: timelineEntryId,
    }).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setAttachments([]);
        toast.error(res.error);
      } else {
        setAttachments(res.attachments);
      }
      setLoadingAttachments(false);
    });
    return () => {
      cancelled = true;
    };
  }, [timelineEntryId]);

  const hasExistingMetrics = Boolean(
    metrics.views ?? metrics.likes ?? metrics.comments
  );

  async function onUploadAttachment(file: File | null) {
    if (!file || mockReadOnly) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > DISTRIBUTION_ATTACHMENT_MAX_BYTES) {
      toast.error(
        `Image must be under ${Math.round(DISTRIBUTION_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB.`
      );
      return;
    }

    setUploadingAttachment(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${userId}/${projectId}/${timelineEntryId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(DISTRIBUTION_ATTACHMENTS_BUCKET)
        .upload(objectPath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const createRes = await createDistributionAttachmentAction({
        timeline_entry_id: timelineEntryId,
        image_url: objectPath,
        project_id: projectId,
      });
      if (!("attachment_id" in createRes)) {
        toast.error(createRes.error);
        return;
      }

      const attachmentId = createRes.attachment_id;

      const refresh = await listDistributionAttachmentsAction({
        timeline_entry_id: timelineEntryId,
      });
      if ("error" in refresh) {
        toast.error(refresh.error);
        return;
      }
      setAttachments(refresh.attachments);

      if (isPro) {
        setRunningExtractionId(attachmentId);
        const ext = await runDistributionAttachmentExtractionAction({
          attachment_id: attachmentId,
          timeline_entry_id: timelineEntryId,
        });
        if ("error" in ext) {
          toast.error(ext.error);
        } else {
          const after = await listDistributionAttachmentsAction({
            timeline_entry_id: timelineEntryId,
          });
          if (!("error" in after)) setAttachments(after.attachments);
        }
        setRunningExtractionId(null);
      }

      const { data: signed } = await supabase.storage
        .from(DISTRIBUTION_ATTACHMENTS_BUCKET)
        .createSignedUrl(objectPath, 60 * 60 * 24);
      if (!signed?.signedUrl) {
        toast.success("Screenshot saved. Refresh if preview is missing.");
      } else if (isPro) {
        toast.success("Screenshot attached");
      } else {
        toast.success(
          "Screenshot saved with this post. Upgrade to Pro for AI metric read."
        );
      }
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function onRetryExtraction(attachmentId: string) {
    if (!isPro) {
      openUpgrade();
      return;
    }
    setRunningExtractionId(attachmentId);
    try {
      const res = await runDistributionAttachmentExtractionAction({
        attachment_id: attachmentId,
        timeline_entry_id: timelineEntryId,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const refreshed = await listDistributionAttachmentsAction({
        timeline_entry_id: timelineEntryId,
      });
      if ("error" in refreshed) {
        toast.error(refreshed.error);
        return;
      }
      setAttachments(refreshed.attachments);
    } finally {
      setRunningExtractionId(null);
    }
  }

  async function onDeleteAttachment(
    item: DistributionAttachment & { signed_url: string }
  ) {
    setDeletingAttachmentId(item.id);
    try {
      const res = await deleteDistributionAttachmentAction({
        id: item.id,
        timeline_entry_id: item.timeline_entry_id,
        image_url: item.image_url,
        project_id: projectId,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setAttachments((prev) => prev.filter((x) => x.id !== item.id));
      toast.success("Attachment removed");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function onApplyDetectedMetrics(
    item: DistributionAttachment & { signed_url: string }
  ) {
    if (!isPro) {
      openUpgrade();
      return;
    }
    const res = await applyExtractedMetricsToEntryAction({
      attachment_id: item.id,
      timeline_entry_id: timelineEntryId,
      project_id: projectId,
    });
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    onMetricsChange(res.metrics);
    toast.success("Metrics saved from this screenshot.");
  }

  function onEditFromDetected(item: DistributionAttachment & { signed_url: string }) {
    const base = parseDistributionMetrics(
      (metrics as Record<string, unknown> | null) ?? null
    );
    onMetricsChange({
      ...base,
      views: item.extracted_views ?? base.views,
      likes: item.extracted_likes ?? base.likes,
      comments: item.extracted_comments ?? base.comments,
    });
    toast.success("Detected values loaded. Review and save.");
  }

  return (
    <>
      <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3.5 ring-1 ring-zinc-200/50">
        <div className="space-y-0.5">
          <p className="text-[12px] font-semibold text-zinc-900">
            Analytics screenshots
          </p>
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Tied to the post you opened from. Uploads stay paired with what we read from
            each image.
          </p>
          {!isPro ? (
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Pro auto-reads views and engagement from screenshots; free stays manual.
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-zinc-700">
            Attach from Reddit, TikTok, or other platforms
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Label
              htmlFor="distribution-edit-attachment-file"
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 shadow-sm hover:bg-zinc-50",
                mockReadOnly || uploadingAttachment
                  ? "pointer-events-none opacity-60"
                  : ""
              )}
            >
              <Upload className="size-3.5" />
              {uploadingAttachment ? "Uploading…" : "Upload analytics screenshot"}
            </Label>
            <Input
              id="distribution-edit-attachment-file"
              type="file"
              accept={DISTRIBUTION_ATTACHMENT_ACCEPT}
              className="hidden"
              disabled={mockReadOnly || uploadingAttachment}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void onUploadAttachment(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        {uploadingAttachment ? (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[12px] text-zinc-600 shadow-sm">
            <Loader2 className="size-4 shrink-0 animate-spin text-zinc-500" />
            Uploading screenshot…
          </div>
        ) : null}

        {loadingAttachments ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white/80 px-3 py-3 text-[12px] text-zinc-600">
            <Loader2 className="size-4 animate-spin text-zinc-400" />
            Loading screenshots…
          </div>
        ) : attachments.length > 0 ? (
          <div className="space-y-4">
            {attachments.map((item) => {
              const dismissed = dismissingReviewIds.includes(item.id);
              const isActivelyExtracting =
                runningExtractionId === item.id ||
                (isPro && item.extraction_status === "pending");
              const isManualOnly =
                item.extraction_status === "idle" ||
                (!isPro && item.extraction_status === "pending");
              const failed = item.extraction_status === "failed";
              const completed = item.extraction_status === "completed";
              const isMock =
                item.extracted_payload &&
                typeof item.extracted_payload === "object" &&
                item.extracted_payload !== null &&
                (item.extracted_payload as { strategy?: string }).strategy === "mock-v1";
              const hasReadableMetrics =
                completed &&
                (item.extracted_views != null ||
                  item.extracted_likes != null ||
                  item.extracted_comments != null ||
                  Boolean(item.extracted_platform));
              const emptySuccess = completed && !failed && !hasReadableMetrics;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow",
                    isActivelyExtracting
                      ? "border-zinc-400/70 ring-2 ring-zinc-300/40"
                      : "border-zinc-200/90"
                  )}
                >
                  <div className="relative border-b border-zinc-100 bg-zinc-50/50 p-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="relative shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-200/60"
                        onClick={() => setExpandedImage(item.signed_url)}
                        title="Expand screenshot"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.signed_url}
                          alt="Performance screenshot"
                          className="h-[88px] w-[120px] object-cover"
                        />
                        {isActivelyExtracting ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-white/75 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 backdrop-blur-[2px]">
                            <Loader2 className="mr-1 size-3.5 animate-spin" />
                            Processing
                          </span>
                        ) : null}
                      </button>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[12px] font-semibold text-zinc-900">Screenshot</p>
                        <p className="text-[11px] text-zinc-500">
                          Tap the image to enlarge. Results for this file appear directly
                          below.
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              isActivelyExtracting
                                ? "bg-amber-100/90 text-amber-950"
                                : isManualOnly
                                  ? "bg-sky-100/80 text-sky-950"
                                  : completed
                                    ? "bg-emerald-100/80 text-emerald-950"
                                    : failed || emptySuccess
                                      ? "bg-zinc-200/80 text-zinc-800"
                                      : "bg-zinc-100 text-zinc-700"
                            )}
                          >
                            {isActivelyExtracting
                              ? "Reading screenshot…"
                              : isManualOnly
                                ? "Saved"
                                : completed && hasReadableMetrics
                                  ? "Metrics detected"
                                  : failed || emptySuccess
                                    ? "Couldn’t read"
                                    : "Waiting"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        title="Remove screenshot"
                        disabled={mockReadOnly || deletingAttachmentId === item.id}
                        onClick={() => void onDeleteAttachment(item)}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {!dismissed ? (
                    <div className="p-3">
                      <div
                        className={cn(
                          "rounded-lg border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                          isActivelyExtracting
                            ? "border-amber-200/90 bg-amber-50/20"
                            : "border-zinc-200/90"
                        )}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-600">
                          {isManualOnly ? "Screenshot on file" : "Detected from screenshot"}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {isManualOnly
                            ? "Pro can auto-read metrics from images like this."
                            : "Review before applying"}
                        </p>

                        {isActivelyExtracting ? (
                          <div className="mt-3 space-y-2 rounded-md border border-dashed border-zinc-300/90 bg-zinc-50/80 px-3 py-3">
                            <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-800">
                              <Loader2 className="size-4 animate-spin text-zinc-500" />
                              Processing screenshot…
                            </div>
                            <p className="text-[11px] leading-relaxed text-zinc-600">
                              Extracting views, upvotes, and comments from this image.
                            </p>
                          </div>
                        ) : isManualOnly ? (
                          <div className="mt-3 space-y-3">
                            <p className="text-[12px] leading-relaxed text-zinc-700">
                              Your screenshot is saved with this post. Enter views in the
                              platform row, or upgrade for automatic reads.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-md text-[12px]"
                              onClick={openUpgrade}
                            >
                              Unlock with Pro
                            </Button>
                          </div>
                        ) : failed || emptySuccess ? (
                          <div className="mt-3 space-y-3">
                            <p className="text-[12px] leading-relaxed text-zinc-700">
                              We couldn&apos;t confidently read this screenshot. You can
                              still enter metrics manually, or try again.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-md text-[12px]"
                              onClick={() => void onRetryExtraction(item.id)}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <p className="text-[12px] text-zinc-700">
                              {hasExistingMetrics
                                ? "This screenshot suggests updated values. Current metrics are shown for comparison."
                                : "Here’s what we found. Apply to merge into this platform row, then save."}
                            </p>
                            {isMock ? (
                              <p className="text-[11px] text-zinc-500">
                                Preview extraction — confirm these numbers match your
                                screenshot before applying.
                              </p>
                            ) : null}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[12px]">
                              <span className="text-zinc-500">Platform</span>
                              <span className="font-medium text-zinc-900">
                                {item.extracted_platform
                                  ? DISTRIBUTION_PLATFORM_LABELS[
                                      item.extracted_platform as DistributionPlatform
                                    ] ?? item.extracted_platform
                                  : "Not found"}
                              </span>
                              <span className="text-zinc-500">Views</span>
                              <span className="font-medium text-zinc-900">
                                {hasExistingMetrics && metrics.views !== undefined
                                  ? `${metrics.views} → ${item.extracted_views ?? "—"}`
                                  : (item.extracted_views ?? "Not found")}
                              </span>
                              <span className="text-zinc-500">Upvotes</span>
                              <span className="font-medium text-zinc-900">
                                {hasExistingMetrics && metrics.likes !== undefined
                                  ? `${metrics.likes} → ${item.extracted_likes ?? "—"}`
                                  : (item.extracted_likes ?? "Not found")}
                              </span>
                              <span className="text-zinc-500">Comments</span>
                              <span className="font-medium text-zinc-900">
                                {hasExistingMetrics && metrics.comments !== undefined
                                  ? `${metrics.comments} → ${item.extracted_comments ?? "—"}`
                                  : (item.extracted_comments ?? "Not found")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                              <Button
                                size="sm"
                                className="h-8 rounded-md text-[12px]"
                                onClick={() => void onApplyDetectedMetrics(item)}
                              >
                                Apply metrics
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-md text-[12px]"
                                onClick={() => onEditFromDetected(item)}
                              >
                                Edit first
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-md text-[12px]"
                                onClick={() => void onRetryExtraction(item.id)}
                              >
                                Retry
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-md text-[12px] text-zinc-600"
                                onClick={() =>
                                  setDismissingReviewIds((prev) => [...prev, item.id])
                                }
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/30 px-3 py-2.5">
                      <p className="text-[11px] text-zinc-500">
                        Detection summary hidden for this screenshot.
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 text-[12px] text-zinc-700"
                        onClick={() =>
                          setDismissingReviewIds((prev) =>
                            prev.filter((id) => id !== item.id)
                          )
                        }
                      >
                        Show
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-300/90 bg-white/60 px-3 py-3 text-[12px] text-zinc-600">
            No screenshots yet. Upload one to see detected metrics here.
          </p>
        )}
      </div>

      <Dialog
        open={Boolean(expandedImage)}
        onOpenChange={(open) => !open && setExpandedImage(null)}
      >
        <DialogContent className="rounded-2xl p-2 sm:max-w-3xl">
          {expandedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expandedImage}
              alt="Expanded performance screenshot"
              className="max-h-[78vh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
