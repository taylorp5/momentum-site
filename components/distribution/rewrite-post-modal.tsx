"use client";

import { useCallback, useEffect, useState } from "react";
import { rewriteDistributionPostAction } from "@/app/actions/distribution-rewrite";
import { updateDistributionEntryAction } from "@/app/actions/distribution";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RewriteResult, RewriteTone } from "@/lib/services/distribution-rewrite";
import { parseDistributionMetrics } from "@/lib/distribution-metrics";
import { cn } from "@/lib/utils";
import type { DistributionEntry } from "@/types/momentum";
import { Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";

const TONES: Array<{ id: RewriteTone; label: string; hint: string }> = [
  { id: "casual", label: "Casual", hint: "Warm & conversational" },
  { id: "bold", label: "Bold", hint: "Direct & confident" },
  { id: "story_driven", label: "Story-driven", hint: "Narrative lead" },
];

export function buildRewriteSourceText(entry: DistributionEntry): string {
  const t = entry.title?.trim();
  const n = entry.notes?.trim();
  if (t && n) return `${t}\n\n${n}`;
  return t || n || "";
}

type RewritePostModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: DistributionEntry;
  isPro: boolean;
  mockReadOnly: boolean;
  onApplied: (updated: DistributionEntry) => void;
};

export function RewritePostModal({
  open,
  onOpenChange,
  entry,
  isPro,
  mockReadOnly,
  onApplied,
}: RewritePostModalProps) {
  const { openUpgrade } = usePlan();
  const [sourceText, setSourceText] = useState("");
  const [tone, setTone] = useState<RewriteTone>("casual");
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [tier, setTier] = useState<"basic" | "pro" | null>(null);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSourceText(buildRewriteSourceText(entry));
    setResult(null);
    setError(null);
    setTier(null);
  }, [open, entry]);

  const runRewrite = useCallback(async () => {
    const text = sourceText.trim();
    if (!text) {
      toast.error("Add the original post text first.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await rewriteDistributionPostAction({
      timeline_entry_id: entry.id,
      source_text: text,
      ...(isPro ? { tone } : {}),
    });
    setLoading(false);
    if ("error" in res) {
      setResult(null);
      setError(res.error);
      return;
    }
    setResult(res.result);
    setTier(res.tier);
  }, [entry.id, sourceText, isPro, tone]);

  async function onCopy() {
    if (!result) return;
    const block = [result.title.trim(), "", result.body.trim()]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(block);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — try selecting the text manually.");
    }
  }

  async function onReplaceOriginal() {
    if (!result || mockReadOnly) return;
    setReplacing(true);
    try {
      const titleTrim = result.title.trim();
      const updated: DistributionEntry = {
        ...entry,
        title: titleTrim.length > 0 ? titleTrim : null,
        notes: result.body.trim(),
      };
      const res = await updateDistributionEntryAction({
        id: updated.id,
        project_id: updated.project_id,
        platform: updated.platform,
        title: updated.title ?? "",
        url: updated.url,
        notes: updated.notes,
        date_posted: updated.date_posted,
        metrics: parseDistributionMetrics(
          (updated.metrics as Record<string, unknown> | null) ?? null
        ),
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Post updated with rewrite");
      onApplied(updated);
      onOpenChange(false);
    } finally {
      setReplacing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,780px)] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Rewrite post
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-zinc-600">
            Paste or edit your original copy, then run a rewrite for a clearer
            hook and stronger engagement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rewrite-source" className="text-[13px]">
              Original post text
            </Label>
            <Textarea
              id="rewrite-source"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Title and body, or paste the full post you published…"
              className="min-h-[120px] resize-y rounded-xl border-zinc-200 text-[13px] leading-relaxed"
              disabled={loading || replacing}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-[13px]">Tone</Label>
              {!isPro ? (
                <span className="text-[11px] font-medium text-zinc-500">
                  Basic rewrite · Pro unlocks tones
                </span>
              ) : (
                <span className="text-[11px] font-medium text-emerald-700">
                  Pro — tuned output
                </span>
              )}
            </div>

            {isPro ? (
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={loading || replacing}
                    onClick={() => setTone(t.id)}
                    className={cn(
                      "flex min-w-[100px] flex-1 flex-col rounded-xl border px-3 py-2 text-left transition-colors",
                      tone === t.id
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200/90 bg-white text-zinc-800 hover:border-zinc-300"
                    )}
                  >
                    <span className="text-[12px] font-semibold">{t.label}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        tone === t.id ? "text-zinc-300" : "text-zinc-500"
                      )}
                    >
                      {t.hint}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3">
                <div className="pointer-events-none select-none blur-[5px] opacity-60">
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700"
                      >
                        {t.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/55 px-4 text-center backdrop-blur-[1px]">
                  <p className="text-[12px] font-medium text-zinc-900">
                    Casual, bold &amp; story-driven tones — Pro
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg text-[12px] font-semibold"
                    onClick={() => openUpgrade()}
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-b border-zinc-100 pb-4">
            <Button
              type="button"
              className="h-9 rounded-lg text-[13px] font-semibold"
              disabled={loading || replacing || !sourceText.trim()}
              onClick={() => void runRewrite()}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {result ? "Regenerate" : "Rewrite"}
            </Button>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3 text-[13px] text-red-900">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-[13px]">Improved version</Label>
                {tier ? (
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                    {tier === "pro" ? "Pro rewrite" : "Basic rewrite"}
                  </span>
                ) : null}
              </div>
              {result.hook_explanation?.trim() ? (
                <p className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-[12px] leading-relaxed text-zinc-600">
                  <span className="font-semibold text-zinc-700">Hook: </span>
                  {result.hook_explanation.trim()}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Title / hook line
                </p>
                <p className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-[14px] font-semibold leading-snug text-zinc-950">
                  {result.title.trim() || "—"}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Body
                </p>
                <p className="whitespace-pre-wrap rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-800">
                  {result.body.trim()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="default"
                  className="h-9 rounded-lg text-[13px] font-semibold"
                  disabled={mockReadOnly || replacing}
                  onClick={() => void onReplaceOriginal()}
                >
                  {replacing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Replace original
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg text-[13px] font-semibold"
                  onClick={() => void onCopy()}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type OpenRewritePostButtonProps = {
  disabled?: boolean;
  stopRowClick?: boolean;
  className?: string;
  onOpen: () => void;
};

export function OpenRewritePostButton({
  disabled = false,
  stopRowClick = true,
  className,
  onOpen,
}: OpenRewritePostButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-8 gap-1 rounded-lg px-2.5 text-[11px] font-semibold",
        className
      )}
      disabled={disabled}
      title="Rewrite this post with AI"
      onClick={(e) => {
        if (stopRowClick) {
          e.preventDefault();
          e.stopPropagation();
        }
        onOpen();
      }}
    >
      <PencilLine className="size-3.5 opacity-80" strokeWidth={1.75} />
      Rewrite post
    </Button>
  );
}
