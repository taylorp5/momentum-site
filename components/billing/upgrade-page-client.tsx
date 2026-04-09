"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  startRevenueCatPurchase,
  type RevenueCatCheckoutMode,
} from "@/lib/revenuecat/web";

const PRO_FEATURES = [
  "Cross-post tracking",
  "Custom date ranges",
  "Advanced analytics",
  "Focus Mode",
  "Work sessions",
  "Export story",
] as const;

const FREE_FEATURES = ["Basic tracking", "Core dashboard", "Project timeline"] as const;

export function UpgradePageClient() {
  const router = useRouter();
  const { isPro, refreshProStatus } = usePlan();
  const [pending, setPending] = useState(false);

  const checkoutMode: RevenueCatCheckoutMode = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_RC_WEB_CHECKOUT_MODE;
    return raw === "sdk" ? "sdk" : "purchase_link";
  }, []);

  async function onUpgrade() {
    setPending(true);
    try {
      const result = await startRevenueCatPurchase(checkoutMode);
      if (result.status === "failed") {
        toast.error(result.message);
        return;
      }
      if (result.status === "redirected") {
        return;
      }

      const active = await refreshProStatus();
      if (active) {
        toast.success("Momentum Pro unlocked.");
        router.push("/dashboard");
        router.refresh();
        return;
      }
      toast.message("Purchase completed, but Pro is not active yet. Try refresh in a moment.");
    } finally {
      setPending(false);
    }
  }

  async function onRefreshStatus() {
    const active = await refreshProStatus();
    if (active) {
      toast.success("Pro is active.");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.message("Pro entitlement not active yet.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Upgrade to Momentum Pro
        </h1>
        <p className="text-sm text-zinc-600">$12/month</p>
        <p className="text-sm text-zinc-500">Cancel anytime.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl border-zinc-200/90">
          <CardHeader>
            <CardTitle className="text-base">Free</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            {FREE_FEATURES.map((feature) => (
              <p key={feature} className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-zinc-500" />
                {feature}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-zinc-900/15 bg-zinc-900/[0.02]">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Pro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-800">
            {PRO_FEATURES.map((feature) => (
              <p key={feature} className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-emerald-600" />
                {feature}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="rounded-lg bg-zinc-900 hover:bg-zinc-800"
          onClick={() => void onUpgrade()}
          disabled={pending || isPro}
        >
          {isPro ? "Pro active" : pending ? "Processing..." : "Upgrade to Pro"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void onRefreshStatus()}>
          Refresh Pro status
        </Button>
      </div>
    </div>
  );
}
