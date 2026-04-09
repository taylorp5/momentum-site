import type { Metadata } from "next";
import { BarChart3, LineChart, Sparkles } from "lucide-react";
import { AdvancedAnalyticsSection } from "@/components/analytics/advanced-analytics-section";
import { PageHeader } from "@/components/dashboard/page-header";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { listDistributionEntries } from "@/lib/data/distribution";
import { isProPlan } from "@/lib/plan";
import { clampDistributionQueryForPlan } from "@/lib/plan-history";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  const user = await requireSessionUser();
  const profile = await getProfile(user.id);
  const isPro = isProPlan(profile?.plan ?? "free");
  const listFilters = clampDistributionQueryForPlan(isPro, {});
  const entries = await listDistributionEntries(user.id, listFilters);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Signals from what you already log. Funnels, efficiency, and rollups will layer on this foundation — without changing how you capture work today."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[11px] border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200/70">
              <BarChart3 className="size-4" strokeWidth={1.65} />
            </div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              In your data now
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-zinc-700">
            <li className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-300" />
              Distribution volume by platform — honest channel mix from entries you log.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-300" />
              Activity recency across projects — timeline and posts in one rhythm.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-300" />
              Per-row{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12px] text-zinc-800">
                metrics
              </code>{" "}
              JSON on distribution for KPIs when you are ready — no migration required.
            </li>
          </ul>
        </div>

        <div className="rounded-[11px] border border-zinc-200/60 bg-zinc-50/50 p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-white/80 text-zinc-500 ring-1 ring-zinc-200/60">
              <Sparkles className="size-4" strokeWidth={1.65} />
            </div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
              Next on the roadmap
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-zinc-500">
            <li className="flex gap-2">
              <LineChart className="mt-0.5 size-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
              Per-project funnel views and channel comparison over time.
            </li>
            <li className="flex gap-2">
              <LineChart className="mt-0.5 size-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
              Cohort-style snapshots and one-click monthly builder summaries.
            </li>
          </ul>
        </div>
      </div>

      <AdvancedAnalyticsSection entries={entries} isPro={isPro} />
    </div>
  );
}
