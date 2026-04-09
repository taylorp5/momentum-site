import { createClient } from "@/lib/supabase/server";
import { listProjectIds, listProjectSummaries } from "@/lib/data/projects";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockTimelineEntries } from "@/lib/mock-data";

export type CostEventRow = {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  amount: number;
  category: string | null;
  is_recurring: boolean;
  recurrence_label: string | null;
  entry_date: string;
  created_at: string;
};

export type CostsFilters = {
  projectId?: string;
  category?: string;
  type?: "all" | "recurring" | "one_time";
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};

function currentMonthStartIso(): string {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  return monthStart.toISOString().slice(0, 10);
}

function applyFilters(rows: CostEventRow[], f: CostsFilters): CostEventRow[] {
  let out = rows;
  if (f.projectId && f.projectId !== "all") {
    out = out.filter((r) => r.project_id === f.projectId);
  }
  if (f.category && f.category !== "all") {
    out = out.filter((r) => (r.category ?? "uncategorized") === f.category);
  }
  if (f.type && f.type !== "all") {
    out = out.filter((r) =>
      f.type === "recurring" ? r.is_recurring : !r.is_recurring
    );
  }
  if (f.dateFrom) out = out.filter((r) => r.entry_date >= f.dateFrom!);
  if (f.dateTo) out = out.filter((r) => r.entry_date <= f.dateTo!);
  const q = f.q?.trim().toLowerCase();
  if (q) {
    out = out.filter((r) =>
      [r.title, r.description, r.category, r.project_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }
  return out.sort(
    (a, b) =>
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime() ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getCostsView(userId: string, filters: CostsFilters = {}) {
  const monthStartIso = currentMonthStartIso();

  const projects = await listProjectSummaries(userId);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  let rows: CostEventRow[] = [];
  if (isMockDataMode()) {
    rows = mockTimelineEntries
      .filter(
        (e): e is typeof e & { amount: number } =>
          e.user_id === userId &&
          e.type === "cost" &&
          typeof e.amount === "number" &&
          Number.isFinite(e.amount)
      )
      .map((e) => ({
        id: e.id,
        project_id: e.project_id,
        project_name: nameById.get(e.project_id) ?? "Project",
        title: e.title,
        description: e.description,
        amount: e.amount,
        category: e.category ?? null,
        is_recurring: e.is_recurring ?? false,
        recurrence_label: e.recurrence_label ?? null,
        entry_date: e.entry_date,
        created_at: e.created_at,
      }));
  } else if (isSupabaseConfigured()) {
    const ids = await listProjectIds(userId);
    if (ids.length > 0) {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("timeline_entries")
        .select(
          "id, project_id, title, description, amount, category, is_recurring, recurrence_label, entry_date, created_at"
        )
        .in("project_id", ids)
        .eq("type", "cost")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      rows = ((data ?? []) as Array<Record<string, unknown>>)
        .filter((r) => typeof r.amount === "number")
        .map((r) => ({
          id: r.id as string,
          project_id: r.project_id as string,
          project_name: nameById.get(r.project_id as string) ?? "Project",
          title: (r.title as string) ?? "Cost event",
          description: (r.description as string) ?? "",
          amount: r.amount as number,
          category: (r.category as string | null) ?? null,
          is_recurring: Boolean(r.is_recurring),
          recurrence_label: (r.recurrence_label as string | null) ?? null,
          entry_date: r.entry_date as string,
          created_at: r.created_at as string,
        }));
    }
  }

  const monthRows = rows.filter((r) => r.entry_date >= monthStartIso);
  const totalSpendThisMonth = monthRows
    .reduce((sum, r) => sum + r.amount, 0);
  const recurringSubscriptionsThisMonth = monthRows
    .filter((r) => r.is_recurring)
    .reduce((sum, r) => sum + r.amount, 0);
  const oneTimeSpendThisMonth = monthRows
    .filter((r) => !r.is_recurring)
    .reduce((sum, r) => sum + r.amount, 0);
  const estimatedTakeHomeImpact = totalSpendThisMonth;

  const byCategory = new Map<string, number>();
  for (const row of monthRows) {
    const key = row.category?.trim() || "uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + row.amount);
  }

  const categoryBreakdown = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const filtered = applyFilters(rows, filters);

  const categories = [...new Set(rows.map((r) => r.category?.trim() || "uncategorized"))]
    .sort((a, b) => a.localeCompare(b));

  return {
    totalSpendThisMonth,
    recurringSubscriptionsThisMonth,
    oneTimeSpendThisMonth,
    estimatedTakeHomeImpact,
    categoryBreakdown,
    rows: filtered,
    projects,
    categories,
    monthStartIso,
  };
}
