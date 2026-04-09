"use client";

import { Lock } from "lucide-react";
import { usePlan } from "@/components/billing/plan-context";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type Props = {
  isPro: boolean;
  attributedRevenue: number;
  /** Optional promo / ad spend on the post (from metrics). */
  promoSpend?: number;
  className?: string;
};

/**
 * Per-post revenue attribution + ROI (Pro). Free users see a single upgrade hint.
 * ROI % = (revenue / cost) × 100 when promo spend is set (per product spec).
 */
export function DistributionPostRoiFooter({
  isPro,
  attributedRevenue,
  promoSpend,
  className,
}: Props) {
  const { openUpgrade } = usePlan();

  if (!isPro) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openUpgrade();
        }}
        className={cn(
          "mt-2 w-full rounded-md border border-dashed border-zinc-200/90 bg-zinc-50/60 px-2.5 py-2 text-left transition-colors hover:bg-zinc-50",
          className
        )}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
          <Lock className="size-3 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
          See what posts actually make money
        </span>
      </button>
    );
  }

  if (attributedRevenue <= 0) {
    return null;
  }

  const spend = promoSpend != null && promoSpend > 0 ? promoSpend : null;
  const roiPct =
    spend != null && spend > 0 ? (attributedRevenue / spend) * 100 : null;

  return (
    <div
      className={cn(
        "mt-2 rounded-md border border-emerald-100/90 bg-emerald-50/35 px-2.5 py-2",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[11px] font-medium text-emerald-950">
        Revenue generated:{" "}
        <span className="tabular-nums">{money.format(attributedRevenue)}</span>
      </p>
      {roiPct != null ? (
        <p className="mt-0.5 text-[11px] tabular-nums text-emerald-800/95">
          ROI: {roiPct.toFixed(0)}%
        </p>
      ) : null}
    </div>
  );
}
