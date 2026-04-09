import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FinancialIntelligenceView } from "@/components/financials/financial-intelligence-view";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import {
  getFinancialIntelligenceSnapshot,
  parseFinancialRangeParam,
} from "@/lib/data/financial-intelligence";
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

  if (!isPro && requested !== "this_month") {
    redirect("/financials");
  }

  const activeRange = !isPro ? "this_month" : requested;
  const snapshot = await getFinancialIntelligenceSnapshot(user.id, activeRange);

  return (
    <FinancialIntelligenceView
      snapshot={snapshot}
      activeRange={activeRange}
      canCustomizeDateRange={isPro}
    />
  );
}
