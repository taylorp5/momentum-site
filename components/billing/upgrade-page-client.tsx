"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { usePlan } from "@/components/billing/plan-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  openRevenueCatManageSubscription,
  startRevenueCatPurchase,
  type RevenueCatCheckoutMode,
} from "@/lib/revenuecat/web";
import { createClient } from "@/lib/supabase/client";

const PRO_OUTCOMES = [
  "Track what works across platforms (Reddit, TikTok, etc.)",
  "Use custom date ranges to analyze performance",
  "Understand what’s growing and what’s not",
  "Stay consistent with Focus Mode and work sessions",
  "Turn your work into a shareable story (export story coming soon)",
] as const;

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to upgrade.");
        return;
      }
      // RevenueCat Web Purchase Links for logged-in users require this id on the URL or checkout 404s.
      const result = await startRevenueCatPurchase(checkoutMode, {
        appUserId: user.id,
      });
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

  async function onManageSubscription() {
    const opened = await openRevenueCatManageSubscription();
    if (!opened) {
      toast.message("Manage subscription will be available after your first active subscription.");
    }
  }

  async function onRefreshStatus() {
    const active = await refreshProStatus();
    if (active) {
      toast.success("Pro is active.");
      router.push("/dashboard");
      router.refresh();
      return;
    }
    toast.message("Pro entitlement is not active yet.");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-1 py-2">
      <Card className="rounded-2xl border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <CardContent className="space-y-7 p-6 sm:p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto inline-flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Sparkles className="size-4" />
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 sm:text-[2.1rem]">
              Build faster. Ship more. Know what works.
            </h1>
            <p className="text-[15px] text-zinc-600">
              Track your work, distribution, and results — all in one place.
            </p>
          </div>

          <div className="space-y-1 text-center">
            <p className="text-[2rem] font-semibold tracking-tight text-zinc-950 sm:text-[2.4rem]">
              $12 / month
            </p>
            <p className="text-sm text-zinc-500">Cancel anytime. No commitment.</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-center text-sm font-semibold uppercase tracking-[0.1em] text-zinc-600">
              What Pro unlocks
            </h2>
            <ul className="space-y-2.5">
              {PRO_OUTCOMES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] text-zinc-800">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 text-center">
            {isPro ? (
              <>
                <p className="text-[15px] font-medium text-zinc-900">You&apos;re on Pro</p>
                <Button
                  type="button"
                  className="h-11 rounded-lg bg-zinc-900 px-5 text-[14px] font-semibold hover:bg-zinc-800"
                  onClick={() => void onManageSubscription()}
                >
                  Manage subscription
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  className="h-11 rounded-lg bg-zinc-900 px-5 text-[14px] font-semibold hover:bg-zinc-800"
                  onClick={() => void onUpgrade()}
                  disabled={pending}
                >
                  {pending ? "Processing..." : "Upgrade to Pro — $12/month"}
                </Button>
                <p className="text-xs text-zinc-500">Takes less than 30 seconds</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!isPro ? (
        <div className="pt-3 text-center">
          <button
            type="button"
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
            onClick={() => void onRefreshStatus()}
          >
            Already purchased? Refresh status
          </button>
        </div>
      ) : null}
    </div>
  );
}
