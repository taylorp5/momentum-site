"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { setDevPlanForTestingAction } from "@/app/actions/dev-plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserPlan } from "@/types/momentum";

type Props = {
  currentPlan: UserPlan;
};

export function DevPlanToggle({ currentPlan }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setPlan(plan: UserPlan) {
    if (plan === currentPlan) return;
    setPending(true);
    try {
      const res = await setDevPlanForTestingAction({ plan });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Plan set to ${plan}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="rounded-[11px] border-amber-200/90 bg-amber-50/40 py-0 shadow-none ring-0">
      <CardHeader className="border-b border-amber-200/60 px-5 pb-4 pt-5">
        <CardTitle className="text-[15px] font-semibold tracking-tight text-amber-950">
          Development · Plan switch
        </CardTitle>
        <p className="text-[13px] font-normal leading-relaxed text-amber-900/80">
          Only appears in <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[11px]">next dev</code>.
          Updates your <span className="font-medium">profiles.plan</span> in Supabase. Not for production.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5 pt-5">
        <p className="text-[14px] text-amber-950">
          Current:{" "}
          <span className="font-semibold capitalize tabular-nums">
            {currentPlan}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-amber-300/80 bg-white text-[13px] font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-50"
            disabled={pending || currentPlan === "free"}
            onClick={() => void setPlan("free")}
          >
            Free
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-amber-300/80 bg-white text-[13px] font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-50"
            disabled={pending || currentPlan === "pro"}
            onClick={() => void setPlan("pro")}
          >
            Pro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
