"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserPlan } from "@/types/momentum";
import { isProPlan } from "@/lib/plan";
import { UpgradeProDialog } from "@/components/billing/upgrade-pro-dialog";

type PlanContextValue = {
  plan: UserPlan;
  isPro: boolean;
  openUpgrade: () => void;
  closeUpgrade: () => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  plan,
  children,
}: {
  plan: UserPlan;
  children: ReactNode;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isPro = isProPlan(plan);

  const openUpgrade = useCallback(() => setUpgradeOpen(true), []);
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), []);

  const value = useMemo(
    () => ({
      plan,
      isPro,
      openUpgrade,
      closeUpgrade,
    }),
    [plan, isPro, openUpgrade, closeUpgrade]
  );

  return (
    <PlanContext.Provider value={value}>
      {children}
      <UpgradeProDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within PlanProvider");
  }
  return ctx;
}
