"use client";

import { usePlan } from "@/components/billing/plan-context";

export function useProLock() {
  const { isPro, openUpgrade } = usePlan();
  const locked = !isPro;

  return {
    isPro,
    locked,
    onLockedClick: () => {
      if (locked) openUpgrade();
    },
  };
}
