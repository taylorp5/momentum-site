import type { Metadata } from "next";
import { FinancialIntelligenceView } from "@/components/financials/financial-intelligence-view";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { getFinancialIntelligenceSnapshot } from "@/lib/data/financial-intelligence";
import { isProPlan } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Financial overview",
  description: "Earnings, spending, and net income across your projects.",
};

export default async function FinancialsPage() {
  const user = await requireSessionUser();
  const [profile, snapshot] = await Promise.all([
    getProfile(user.id),
    getFinancialIntelligenceSnapshot(user.id),
  ]);
  const isPro = isProPlan(profile?.plan ?? "free");

  return (
    <FinancialIntelligenceView isPro={isPro} snapshot={snapshot} />
  );
}
