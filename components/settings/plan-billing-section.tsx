"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isProPlan } from "@/lib/plan";
import type { UserPlan } from "@/types/momentum";

type Props = {
  plan: UserPlan;
};

export function PlanBillingSection({ plan }: Props) {
  const pro = isProPlan(plan);

  return (
    <div className="space-y-4">
      {pro ? (
        <>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-zinc-950">You&apos;re on Pro</p>
            <p className="text-[14px] text-zinc-600">$12/month</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg text-[13px]"
            disabled
          >
            Manage subscription (coming soon)
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-zinc-950">You&apos;re on Free</p>
            <p className="text-[14px] leading-relaxed text-zinc-600">
              Upgrade for advanced creator tools, Smart upload, and deeper analytics.
            </p>
          </div>
          <Link
            href="/upgrade"
            className={cn(buttonVariants({ size: "sm" }), "inline-flex h-9 rounded-lg text-[13px]")}
          >
            Upgrade to Pro
          </Link>
        </>
      )}
    </div>
  );
}
