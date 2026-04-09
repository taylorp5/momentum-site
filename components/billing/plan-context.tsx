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
    return next;
  }, []);

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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
