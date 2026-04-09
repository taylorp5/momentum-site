"use client";

import { Lock } from "lucide-react";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProAnalyticsGateProps = {
  isPro: boolean;
  children: React.ReactNode;
  className?: string;
  /** Override default paywall headline */
  overlayTitle?: string;
  /** Override default paywall body */
  overlayDescription?: string;
  /** Primary CTA label */
  ctaLabel?: string;
};

const DEFAULT_TITLE = "Unlock real analytics with Pro";
const DEFAULT_DESCRIPTION =
  "Views over time · Per-platform trends · Post comparisons and which days pull the most engagement — tap to learn more.";

/**
 * Blurs analytics for free users; click opens the upgrade modal.
 */
export function ProAnalyticsGate({
  isPro,
  children,
  className,
  overlayTitle = DEFAULT_TITLE,
  overlayDescription = DEFAULT_DESCRIPTION,
  ctaLabel = "Upgrade to Pro",
}: ProAnalyticsGateProps) {
  const { openUpgrade } = usePlan();

  if (isPro) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative rounded-xl", className)}>
      <div
        className="pointer-events-none select-none blur-[3px] transition-[filter,opacity] duration-300"
        aria-hidden
      >
        {children}
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={openUpgrade}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openUpgrade();
          }
        }}
        className="absolute inset-0 z-[1] flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-[#eeeeee] bg-white/75 p-6 text-center shadow-sm backdrop-blur-[2px] transition-colors duration-200 hover:bg-white/85"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-[#eeeeee]">
          <Lock className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="max-w-[16rem] text-[14px] font-medium text-zinc-800">
          {overlayTitle}
        </span>
        <span className="max-w-[18rem] text-[12px] font-normal leading-relaxed text-zinc-500">
          {overlayDescription}
        </span>
        <Button
          type="button"
          className="h-9 rounded-lg bg-zinc-900 px-4 text-[13px] font-medium hover:bg-zinc-800"
          onClick={(e) => {
            e.stopPropagation();
            openUpgrade();
          }}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
