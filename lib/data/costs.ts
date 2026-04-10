import {
  costAmountInPeriod,
  expenseRowTouchesDateWindow,
  isRecurringCostRule,
} from "@/lib/cost-recurrence";
import { createClient } from "@/lib/supabase/server";
import { listProjectIds, listProjectSummaries } from "@/lib/data/projects";
import { ensureOverheadProject } from "@/lib/data/overhead-project";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { mockTimelineEntries } from "@/lib/mock-data";
import type { CostBillingType } from "@/types/momentum";

export type CostEventRow = {
  id: string;
  project_id: string;
  project_name: string;
  /** True when row uses the synthetic overhead project */
  is_overhead?: boolean;
  title: string;
  description: string;
  amount: number;
  category: string | null;
  is_recurring: boolean;
  recurrence_label: string | null;
  billing_type: CostBillingType;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  recurring_active: boolean;
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

function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapDbCostRow(
  r: Record<string, unknown>,
  nameById: Map<string, string>,
  overheadById: Map<string, boolean>
): CostEventRow | null {
  if (typeof r.amount !== "number") return null;
  const billingRaw = r.billing_type as string | null | undefined;
  const billing: CostBillingType =
    billingRaw === "monthly" || billingRaw === "yearly" || billingRaw === "one_time"
      ? billingRaw
      : r.is_recurring
        ? "monthly"
        : "one_time";
  const pid = r.project_id as string;
  return {
    id: r.id as string,
    project_id: pid,
    project_name: nameById.get(pid) ?? "Project",
    is_overhead: overheadById.get(pid) === true,
    title: (r.title as string) ?? "Cost event",
    description: (r.description as string) ?? "",
    amount: r.amount as number,
    category: (r.category as string | null) ?? null,
    is_recurring: Boolean(r.is_recurring),
    recurrence_label: (r.recurrence_label as string | null) ?? null,
    billing_type: billing,
    recurring_start_date: (r.recurring_start_date as string | null) ?? null,
    recurring_end_date: (r.recurring_end_date as string | null) ?? null,
    recurring_active: r.recurring_active !== false,
    entry_date: r.entry_date as string,
    created_at: r.created_at as string,
  };
}

function sortRows(rows: CostEventRow[]): CostEventRow[] {
  return rows.sort(
    (a, b) =>
      new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime() ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function applyProjectScope(rows: CostEventRow[], f: CostsFilters): CostEventRow[] {
  if (f.projectId && f.projectId !== "all") {
    return rows.filter((r) => r.project_id === f.projectId);
  }
  return rows;
}

function applyLedgerFilters(rows: CostEventRow[], f: CostsFilters): CostEventRow[] {
  let out = rows;
  if (f.category && f.category !== "all") {
    out = out.filter((r) => (r.category ?? "uncategorized") === f.category);
  }
  if (f.type && f.type !== "all") {
    out = out.filter((r) =>
      f.type === "recurring" ? isRecurringCostRule(r) : !isRecurringCostRule(r)
    );
  }
  if (f.dateFrom?.trim() || f.dateTo?.trim()) {
    out = out.filter((r) =>
      expenseRowTouchesDateWindow(r, f.dateFrom, f.dateTo)
    );
  }
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
  return sortRows(out);
}

export async function getCostsView(userId: string, filters: CostsFilters = {}) {
  const monthStartIso = currentMonthStartIso();

  await ensureOverheadProject(userId);
  const projects = await listProjectSummaries(userId);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));
  const overheadById = new Map(
    projects.filter((p) => p.is_overhead).map((p) => [p.id, true])
  );

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
      .map((e) => {
        const billingRaw = e.billing_type;
        const billing: CostBillingType =
          billingRaw === "monthly" || billingRaw === "yearly" || billingRaw === "one_time"
            ? billingRaw
            : e.is_recurring
              ? "monthly"
              : "one_time";
        return {
          id: e.id,
          project_id: e.project_id,
          project_name: nameById.get(e.project_id) ?? "Project",
          is_overhead: overheadById.get(e.project_id) === true,
          title: e.title,
          description: e.description,
          amount: e.amount,
          category: e.category ?? null,
          is_recurring: e.is_recurring ?? false,
          recurrence_label: e.recurrence_label ?? null,
          billing_type: billing,
          recurring_start_date: e.recurring_start_date ?? null,
          recurring_end_date: e.recurring_end_date ?? null,
          recurring_active: e.recurring_active !== false,
          entry_date: e.entry_date,
          created_at: e.created_at,
        };
      });
  } else if (isSupabaseConfigured()) {
    const ids = await listProjectIds(userId);
    if (ids.length > 0) {
      const supabase = await createClient();
      const sel =
        "id, project_id, title, description, amount, category, is_recurring, recurrence_label, billing_type, recurring_start_date, recurring_end_date, recurring_active, entry_date, created_at";
      const [recentRes, recurRes] = await Promise.all([
        supabase
          .from("timeline_entries")
          .select(sel)
          .in("project_id", ids)
          .eq("type", "cost")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("timeline_entries")
          .select(sel)
          .in("project_id", ids)
          .eq("type", "cost")
          .or("billing_type.eq.monthly,billing_type.eq.yearly,is_recurring.eq.true")
          .order("entry_date", { ascending: false })
          .limit(150),
      ]);
      if (recentRes.error) throw recentRes.error;
      if (recurRes.error) throw recurRes.error;
      const byId = new Map<string, Record<string, unknown>>();
      for (const r of [...(recentRes.data ?? []), ...(recurRes.data ?? [])]) {
        byId.set(r.id as string, r as Record<string, unknown>);
      }
      rows = [...byId.values()]
        .map((r) => mapDbCostRow(r, nameById, overheadById))
        .filter((r): r is CostEventRow => r != null);
    }
  }

  const projectScopedRows = applyProjectScope(rows, filters);
  const ledgerRows = applyLedgerFilters(projectScopedRows, filters);

  const monthEndIso = utcTodayIso();
  const totalSpendThisMonth = projectScopedRows.reduce(
    (sum, r) => sum + costAmountInPeriod(r, monthStartIso, monthEndIso),
    0
  );
  const recurringSubscriptionsThisMonth = projectScopedRows
    .filter((r) => isRecurringCostRule(r))
    .reduce(
      (sum, r) => sum + costAmountInPeriod(r, monthStartIso, monthEndIso),
      0
    );
  const oneTimeSpendThisMonth = projectScopedRows
    .filter((r) => !isRecurringCostRule(r))
    .reduce(
      (sum, r) => sum + costAmountInPeriod(r, monthStartIso, monthEndIso),
      0
    );
  const estimatedTakeHomeImpact = totalSpendThisMonth;

  const byCategory = new Map<string, number>();
  for (const row of projectScopedRows) {
    const key = row.category?.trim() || "uncategorized";
    const amt = costAmountInPeriod(row, monthStartIso, monthEndIso);
    if (amt <= 0) continue;
    byCategory.set(key, (byCategory.get(key) ?? 0) + amt);
  }

  const categoryBreakdown = [...byCategory.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const categories = [
    ...new Set(projectScopedRows.map((r) => r.category?.trim() || "uncategorized")),
  ].sort((a, b) => a.localeCompare(b));

  return {
    totalSpendThisMonth,
    recurringSubscriptionsThisMonth,
    oneTimeSpendThisMonth,
    estimatedTakeHomeImpact,
    categoryBreakdown,
    rows: ledgerRows,
    projects,
    categories,
    monthStartIso,
  };
}
