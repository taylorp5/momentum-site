import { listTimelineByTypesSince } from "@/lib/data/timeline";
import type { TimelineEntry } from "@/types/momentum";

/** URL / UI range id. Free users are limited to `this_month` on the server. */
export type FinancialRangeKey =
  | "this_month"
  | "last_month"
  | "last_90_days"
  | "ytd";

const RANGE_KEYS: FinancialRangeKey[] = [
  "this_month",
  "last_month",
  "last_90_days",
  "ytd",
];

export function parseFinancialRangeParam(
  raw: string | string[] | undefined
): FinancialRangeKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== "string") return "this_month";
  const n = v.trim().toLowerCase().replace(/-/g, "_");
  return RANGE_KEYS.includes(n as FinancialRangeKey)
    ? (n as FinancialRangeKey)
    : "this_month";
}

function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoUtc(year: number, monthIndex0: number): string {
  const d = new Date(Date.UTC(year, monthIndex0, 1));
  return d.toISOString().slice(0, 10);
}

/** Inclusive end date for a calendar month (UTC). */
function lastDayOfMonthUtc(year: number, monthIndex0: number): string {
  const d = new Date(Date.UTC(year, monthIndex0 + 1, 0));
  return d.toISOString().slice(0, 10);
}

export function financialRangeBounds(
  key: FinancialRangeKey
): { sinceDate: string; untilDate: string; periodLabel: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const today = utcTodayIso();

  switch (key) {
    case "this_month": {
      const sinceDate = monthStartIsoUtc(y, m);
      const start = new Date(Date.UTC(y, m, 1));
      const periodLabel = start.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      return { sinceDate, untilDate: today, periodLabel };
    }
    case "last_month": {
      const ly = m === 0 ? y - 1 : y;
      const lm = m === 0 ? 11 : m - 1;
      const sinceDate = monthStartIsoUtc(ly, lm);
      const untilDate = lastDayOfMonthUtc(ly, lm);
      const start = new Date(Date.UTC(ly, lm, 1));
      const periodLabel = start.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      return { sinceDate, untilDate, periodLabel };
    }
    case "last_90_days": {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 90);
      return {
        sinceDate: d.toISOString().slice(0, 10),
        untilDate: today,
        periodLabel: "Last 90 days",
      };
    }
    case "ytd": {
      const sinceDate = monthStartIsoUtc(y, 0);
      return {
        sinceDate,
        untilDate: today,
        periodLabel: `${y} year to date`,
      };
    }
    default: {
      const _x: never = key;
      return _x;
    }
  }
}

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
 * Financial snapshot from timeline revenue, cost, and deal events for the given range.
 * Revenue share: sum of all deal `revenue_share_percentage` values, capped at 100%, applied to gross revenue.
 */
export async function getFinancialIntelligenceSnapshot(
  userId: string,
  rangeKey: FinancialRangeKey = "this_month"
): Promise<FinancialIntelligenceSnapshot> {
  const { sinceDate, untilDate, periodLabel } = financialRangeBounds(rangeKey);
  const rows = await listTimelineByTypesSince(
    userId,
    ["revenue", "cost", "deal"],
    sinceDate,
    untilDate
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
    periodLabel,
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
