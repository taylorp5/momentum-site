"use client";

import { useCallback, useEffect, useState } from "react";
import { generateDistributionFollowUpsAction } from "@/app/actions/distribution-follow-up";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FollowUpAngle, FollowUpIdea } from "@/lib/services/distribution-follow-up-ideas";
import { cn } from "@/lib/utils";
import type { DistributionEntry } from "@/types/momentum";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ANGLE_LABEL: Record<FollowUpAngle, string> = {
  story: "Story",
  lesson: "Lesson",
  reflection: "Reflection",
};

type GenerateFollowUpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: DistributionEntry;
  projectName: string;
  isPro: boolean;
  onUseIdea: (idea: FollowUpIdea) => void;
};

export function GenerateFollowUpModal({
  open,
  onOpenChange,
  entry,
  projectName,
  isPro,
  onUseIdea,
}: GenerateFollowUpModalProps) {
  const { openUpgrade } = usePlan();
  const [ideas, setIdeas] = useState<FollowUpIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await generateDistributionFollowUpsAction({
      timeline_entry_id: entry.id,
    });
    setLoading(false);
    if ("error" in res) {
      setIdeas(null);
      setError(res.error);
      return;
    }
    setIdeas(res.ideas);
  }, [entry.id]);

  useEffect(() => {
    if (!open) return;
    setIdeas(null);
    setError(null);
    void load();
  }, [open, entry.id, load]);

  async function onCopy(idea: FollowUpIdea) {
    const text = `${idea.title}\n\n${idea.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — try selecting the text manually.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Follow-up ideas
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-zinc-600">
            Three angles that build on{" "}
            <span className="font-medium text-zinc-800">{projectName}</span> — pick
            one, tweak, and post.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-[12px] font-semibold"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : null}
            Regenerate
          </Button>
          {!isPro ? (
            <p className="text-[11px] text-zinc-500">
              Free: full access to the first idea. Upgrade for all three.
            </p>
          ) : null}
        </div>

        <div className="space-y-4 pt-1">
          {error ? (
            <div className="rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3 text-[13px] text-red-900">
              <p>{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-8 rounded-lg"
                onClick={() => void load()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {loading && !ideas?.length ? (
            <div className="flex items-center gap-2 py-10 text-[13px] text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              Drafting ideas…
            </div>
          ) : null}

          {ideas?.map((idea, idx) => {
            const locked = !isPro && idx > 0;
            return (
              <div
                key={`${idea.angle}-${idx}`}
                className="relative overflow-hidden rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-4"
              >
                <div
                  className={cn(
                    "space-y-2",
                    locked && "blur-[6px] select-none"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 ring-1 ring-zinc-200/90">
                      {ANGLE_LABEL[idea.angle]}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold leading-snug text-zinc-950">
                    {idea.title}
                  </p>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
                    {idea.body}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-lg text-[12px] font-semibold"
                      disabled={locked}
                      onClick={() => onUseIdea(idea)}
                    >
                      Use
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg text-[12px] font-semibold"
                      disabled={locked}
                      onClick={() => void onCopy(idea)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {locked ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/55 px-4 text-center backdrop-blur-[2px]">
                    <p className="text-[13px] font-medium text-zinc-900">
                      Unlock story, lesson &amp; reflection sets
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
                ) : null}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type OpenFollowUpButtonProps = {
  disabled?: boolean;
  stopRowClick?: boolean;
  className?: string;
  onOpen: () => void;
};

/** Temporary: disable until the flow is ready (tooltip on wrapper — disabled buttons don’t always show title). */
const FOLLOW_UP_BUTTON_COMING_SOON = true;

/** Opens the parent-owned follow-up flow (single modal per surface). */
export function OpenDistributionFollowUpButton({
  disabled = false,
  stopRowClick = true,
  className,
  onOpen,
}: OpenFollowUpButtonProps) {
  const mergedDisabled = FOLLOW_UP_BUTTON_COMING_SOON || disabled;
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-8 gap-1 rounded-lg px-2.5 text-[11px] font-semibold",
        FOLLOW_UP_BUTTON_COMING_SOON &&
          "cursor-not-allowed border-zinc-200/90 bg-zinc-100/80 text-zinc-400 opacity-70 shadow-none hover:bg-zinc-100/80",
        className
      )}
      disabled={mergedDisabled}
      title={FOLLOW_UP_BUTTON_COMING_SOON ? undefined : "Generate follow-up post ideas"}
      onClick={(e) => {
        if (mergedDisabled) return;
        if (stopRowClick) {
          e.preventDefault();
          e.stopPropagation();
        }
        onOpen();
      }}
    >
      <Sparkles className="size-3.5 opacity-80" strokeWidth={1.75} />
      Generate follow-up
    </Button>
  );

  if (FOLLOW_UP_BUTTON_COMING_SOON) {
    return (
      <span title="Coming soon" className="inline-flex max-w-full">
        {button}
      </span>
    );
  }
  return button;
}
