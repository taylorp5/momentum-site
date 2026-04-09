"use client";

import { Sparkles } from "lucide-react";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProPlanNudgeProps = {
  /** Show when user has at least one distribution post and is on free plan. */
  visible: boolean;
  className?: string;
};

export function ProPlanNudge({ visible, className }: ProPlanNudgeProps) {
  const { isPro, openUpgrade } = usePlan();

  if (!visible || isPro) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-[#eeeeee] bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Sparkles className="size-4" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[13px] font-medium text-zinc-900">You&apos;re building momentum</p>
          <p className="text-[13px] font-normal leading-relaxed text-zinc-500">
            Pro adds Smart upload, trend analytics, and smarter next moves when you&apos;re ready.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 rounded-lg border-[#eeeeee] font-medium"
        onClick={openUpgrade}
      >
        View Pro
      </Button>
    </div>
  );
}
