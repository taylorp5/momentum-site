"use client";

import { DashboardCustomizeModal } from "@/components/dashboard/dashboard-customize-modal";

type Props = {
  hiddenWidgets: string[];
  hiddenInsights: string[];
};

export function DashboardToolbar({ hiddenWidgets, hiddenInsights }: Props) {
  return (
    <DashboardCustomizeModal
      hiddenWidgets={hiddenWidgets}
      hiddenInsights={hiddenInsights}
    />
  );
}
