"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { UserPlan } from "@/types/momentum";
import { isProPlan } from "@/lib/plan";
import { createClient } from "@/lib/supabase/client";
import { syncPlanWithRevenueCatAction } from "@/app/actions/sync-revenuecat-plan";
import {
  configureRevenueCatWeb,
  refreshRevenueCatProEntitlement,
} from "@/lib/revenuecat/web";

type PlanContextValue = {
  plan: UserPlan;
  isPro: boolean;
  openUpgrade: () => void;
  closeUpgrade: () => void;
  refreshProStatus: () => Promise<boolean>;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  plan,
  children,
}: {
  plan: UserPlan;
  children: ReactNode;
}) {
  const router = useRouter();
  const [entitlementIsPro, setEntitlementIsPro] = useState(false);

  const refreshProStatus = useCallback(async () => {
    const next = await refreshRevenueCatProEntitlement();
    setEntitlementIsPro(next);
    const res = await syncPlanWithRevenueCatAction();
    if (res.synced) {
      router.refresh();
    }
    return next;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await configureRevenueCatWeb(user.id);
      const next = await refreshRevenueCatProEntitlement();
      if (!cancelled) setEntitlementIsPro(next);
      const serverSaysPro = isProPlan(plan);
      if (!cancelled && next !== serverSaysPro) {
        const res = await syncPlanWithRevenueCatAction();
        if (res.synced) router.refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, plan]);

  const isPro = isProPlan(plan) || entitlementIsPro;

  const openUpgrade = useCallback(() => router.push("/upgrade"), [router]);
  const closeUpgrade = useCallback(() => {}, []);

  const value = useMemo(
    () => ({
      plan,
      isPro,
      openUpgrade,
      closeUpgrade,
      refreshProStatus,
    }),
    [plan, isPro, openUpgrade, closeUpgrade, refreshProStatus]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within PlanProvider");
  }
  return ctx;
}
