import type { Metadata } from "next";
import { CostsView } from "@/components/costs/costs-view";
import { requireSessionUser } from "@/lib/auth/user";
import { getCostsView } from "@/lib/data/costs";
import { listProjects } from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Track and manage project spending, subscriptions, and categories.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CostsPage({ searchParams }: PageProps) {
  const user = await requireSessionUser();
  const raw = await searchParams;
  const filters = {
    q: one(raw.q),
    projectId: one(raw.project),
    category: one(raw.category),
    type: (one(raw.type) as "all" | "recurring" | "one_time" | undefined) ?? "all",
    dateFrom: one(raw.from),
    dateTo: one(raw.to),
  };
  const [costs, projects] = await Promise.all([
    getCostsView(user.id, filters),
    listProjects(user.id),
  ]);

  return (
    <CostsView
      summary={{
        totalSpendThisMonth: costs.totalSpendThisMonth,
        recurringSubscriptionsThisMonth: costs.recurringSubscriptionsThisMonth,
        oneTimeSpendThisMonth: costs.oneTimeSpendThisMonth,
        categoryBreakdown: costs.categoryBreakdown,
      }}
      rows={costs.rows}
      projects={projects}
      categories={costs.categories}
    />
  );
}
