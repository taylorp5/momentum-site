import type { Metadata } from "next";
import { FocusModeLocked } from "@/components/dashboard/focus-mode-locked";
import { FocusModeView } from "@/components/dashboard/focus-mode-view";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import {
  isInsightVisible,
  preferencesFromProfile,
} from "@/lib/dashboard-preferences";
import { isProPlan } from "@/lib/plan";
import {
  getFocusModeSnapshot,
} from "@/lib/data/focus-mode";
import {
  getDashboardStats,
  getTakeHomeSummary,
} from "@/lib/data/dashboard";
import { listDistributionEntries } from "@/lib/data/distribution";
import { listProjects } from "@/lib/data/projects";
import { buildDashboardInsights } from "@/lib/insights/build-dashboard-insights";
import type { DistributionPlatform } from "@/types/momentum";

export const metadata: Metadata = {
  title: "Focus Mode",
};

export default async function FocusModePage() {
  const user = await requireSessionUser();
  const profile = await getProfile(user.id);
  const prefs = preferencesFromProfile(profile);
  const isPro = isProPlan(profile?.plan ?? "free");

  if (!isPro) {
    return <FocusModeLocked />;
  }

  const [snapshot, stats, entries, projects, takeHome] = await Promise.all([
    getFocusModeSnapshot(user.id),
    getDashboardStats(user.id),
    listDistributionEntries(user.id, {}),
    listProjects(user.id),
    getTakeHomeSummary(user.id),
  ]);

  const insights =
    stats.projectCount > 0
      ? buildDashboardInsights(entries, stats.distributionLast7Days)
      : [];
  const visibleInsights = insights.filter((i) =>
    isInsightVisible(prefs, i.id)
  );

  const primaryInsight = visibleInsights.length > 0 ? visibleInsights[0]! : null;

  const quickPostPlatform: DistributionPlatform | undefined =
    snapshot.bestPlatformThisWeek?.platform ??
    snapshot.fallbackPlatform ??
    undefined;

  return (
    <FocusModeView
      snapshot={snapshot}
      primaryInsight={primaryInsight}
      quickPostPlatform={quickPostPlatform}
      projects={projects}
      hasProjects={projects.length > 0}
      takeHome={takeHome}
    />
  );
}
