import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FinancialIntelligenceView } from "@/components/financials/financial-intelligence-view";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import {
  getFinancialIntelligenceSnapshot,
  parseFinancialProjectParam,
  parseFinancialRangeParam,
} from "@/lib/data/financial-intelligence";
import { listProjects } from "@/lib/data/projects";
import { isProPlan } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Financial overview",
  description: "Earnings, spending, and net income across your projects.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinancialsPage({ searchParams }: PageProps) {
  const user = await requireSessionUser();
  const raw = await searchParams;
  const profile = await getProfile(user.id);
  const isPro = isProPlan(profile?.plan ?? "free");
  const requested = parseFinancialRangeParam(raw.range);
  let projectFilter = parseFinancialProjectParam(raw);

  if (!isPro && requested !== "this_month") {
    const q = new URLSearchParams();
    if (projectFilter !== "all") q.set("project", projectFilter);
    const qs = q.toString();
    redirect(qs ? `/financials?${qs}` : "/financials");
  }

  const activeRange = !isPro ? "this_month" : requested;
  const projects = await listProjects(user.id);
  if (
    projectFilter !== "all" &&
    !projects.some((p) => p.id === projectFilter)
  ) {
    projectFilter = "all";
  }

  const snapshot = await getFinancialIntelligenceSnapshot(
    user.id,
    activeRange,
    projectFilter
  );

  return (
    <FinancialIntelligenceView
      snapshot={snapshot}
      activeRange={activeRange}
      activeProjectFilter={projectFilter}
      projects={projects}
      canCustomizeDateRange={isPro}
    />
  );
}
