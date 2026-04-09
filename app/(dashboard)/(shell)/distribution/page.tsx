import type { Metadata } from "next";
import { Suspense } from "react";
import { DistributionView } from "@/components/distribution/distribution-view";
import { DistributionViewSkeleton } from "@/components/distribution/distribution-view-skeleton";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { isProPlan } from "@/lib/plan";
import { clampDistributionQueryForPlan } from "@/lib/plan-history";
import {
  getAttributedRevenueByDistributionId,
  listCrossPostComparisons,
  listDistributionEntries,
} from "@/lib/data/distribution";
import { listProjects } from "@/lib/data/projects";
import { parseDistributionPageQuery } from "@/lib/validations/distribution-filters";

export const metadata: Metadata = {
  title: "Distribution",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DistributionPage({ searchParams }: PageProps) {
  const user = await requireSessionUser();
  const raw = await searchParams;
  const filters = parseDistributionPageQuery(raw);

  const profile = await getProfile(user.id);
  const isPro = isProPlan(profile?.plan ?? "free");
  const dateClamp = clampDistributionQueryForPlan(isPro, {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  const [projects, entries, revenueByDistributionId, crossPostComparisons] =
    await Promise.all([
      listProjects(user.id),
      listDistributionEntries(user.id, {
        projectId: filters.projectId,
        platform: filters.platform,
        search: filters.search,
        dateFrom: dateClamp.dateFrom,
        dateTo: dateClamp.dateTo,
      }),
      getAttributedRevenueByDistributionId(user.id),
      listCrossPostComparisons(user.id),
    ]);

  const appliedSearch = filters.search ?? "";
  const hasActiveFilters = Boolean(
    filters.projectId ||
      filters.platform ||
      filters.search ||
      filters.dateFrom ||
      filters.dateTo
  );

  return (
    <Suspense fallback={<DistributionViewSkeleton />}>
      <DistributionView
        isPro={isPro}
        projects={projects}
        entries={entries}
        revenueByDistributionId={revenueByDistributionId}
        crossPostComparisons={crossPostComparisons}
        appliedSearch={appliedSearch}
        appliedDateFrom={dateClamp.dateFrom ?? ""}
        appliedDateTo={dateClamp.dateTo ?? ""}
        hasActiveFilters={hasActiveFilters}
      />
    </Suspense>
  );
}
