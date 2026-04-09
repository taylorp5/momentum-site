import { listTimelineByTypesSince } from "@/lib/data/timeline";
import type { TimelineEntry } from "@/types/momentum";

export type FinancialDealRow = {
  id: string;
  partnerName: string;
  percent: number;
  /** Gross revenue × (this deal's % / 100); informational when multiple deals exist. */
  nominalDeduction: number;
  entryDate: string;
};

export type FinancialIntelligenceSnapshot = {
  periodLabel: string;
  sinceDate: string;
  grossRevenue: number;
  totalCosts: number;
  /** Combined partner rates, capped at 100%. */
  combinedSharePercent: number;
  /** Applied deduction: grossRevenue × combinedSharePercent / 100. */
  revenueShareDeduction: number;
  netIncome: number;
  hasActivity: boolean;
  insight: string;
  revenueBySource: { source: string; total: number }[];
  costsByCategory: { category: string; total: number }[];
  dealRows: FinancialDealRow[];
  /** True when sum of deal percentages exceeds 100% before capping. */
  shareRatesCapped: boolean;
};

function monthStartIso(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return d.toISOString().slice(0, 10);
}

function periodLabelUtc(): string {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return monthStart.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildInsight(
  hasActivity: boolean,
  net: number,
  revenue: number,
  costs: number
): string {
  if (!hasActivity) {
    return "Log revenue, expenses, and any partner deals on your timeline to see a full picture.";
  }
  if (net > 0) {
    return "Net income is positive for this period — you are keeping more than you are paying out.";
  }
  if (revenue > 0 && costs > revenue) {
    return "Spending exceeds gross revenue this period; optional breakdowns can show where it goes.";
  }
  if (revenue === 0 && costs > 0) {
    return "You have spending logged but no revenue in this window yet.";
  }
  return "Financial activity is roughly balanced for this period.";
}

function aggregateByKey(
  rows: TimelineEntry[],
  keyFn: (r: TimelineEntry) => string,
  amount: (r: TimelineEntry) => number
): { key: string; total: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) ?? 0) + amount(r));
  }
  return [...m.entries()]
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Financial snapshot for the current UTC calendar month from timeline revenue, cost, and deal events.
 * Revenue share: sum of all deal `revenue_share_percentage` values, capped at 100%, applied to gross revenue.
 */
export async function getFinancialIntelligenceSnapshot(
  userId: string
): Promise<FinancialIntelligenceSnapshot> {
  const sinceDate = monthStartIso();
  const rows = await listTimelineByTypesSince(
    userId,
    ["revenue", "cost", "deal"],
    sinceDate
  );

  const revenueRows = rows.filter((r) => r.type === "revenue");
  const costRows = rows.filter((r) => r.type === "cost");
  const dealRows = rows.filter((r) => r.type === "deal");

  const grossRevenue = revenueRows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalCosts = costRows.reduce((s, r) => s + (r.amount ?? 0), 0);

  const rawShareSum = dealRows.reduce(
    (s, r) => s + (r.revenue_share_percentage ?? 0),
    0
  );
  const combinedSharePercent = Math.min(100, rawShareSum);
  const shareRatesCapped = rawShareSum > 100;
  const revenueShareDeduction = grossRevenue * (combinedSharePercent / 100);
  const netIncome = grossRevenue - totalCosts - revenueShareDeduction;

  const hasActivity = rows.length > 0;

  const revenueBySource = aggregateByKey(
    revenueRows,
    (r) => (r.revenue_source?.trim() ? r.revenue_source.trim() : "Uncategorized"),
    (r) => r.amount ?? 0
  ).map(({ key, total }) => ({ source: key, total }));

  const costsByCategory = aggregateByKey(
    costRows,
    (r) => (r.category?.trim() ? r.category.trim() : "Uncategorized"),
    (r) => r.amount ?? 0
  ).map(({ key, total }) => ({ category: key, total }));

  const dealRowModels: FinancialDealRow[] = dealRows.map((r) => {
    const pct = r.revenue_share_percentage ?? 0;
    return {
      id: r.id,
      partnerName: r.partner_name?.trim() || "Partner",
      percent: pct,
      nominalDeduction: grossRevenue * (pct / 100),
      entryDate: r.entry_date,
    };
  });

  return {
    periodLabel: periodLabelUtc(),
    sinceDate,
    grossRevenue,
    totalCosts,
    combinedSharePercent,
    revenueShareDeduction,
    netIncome,
    hasActivity,
    insight: buildInsight(hasActivity, netIncome, grossRevenue, totalCosts),
    revenueBySource,
    costsByCategory,
    dealRows: dealRowModels,
    shareRatesCapped,
  };
}
