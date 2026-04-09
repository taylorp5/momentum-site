"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Handshake,
  Info,
  Layers,
  Lock,
} from "lucide-react";
import { ProAnalyticsGate } from "@/components/billing/pro-analytics-gate";
import { usePlan } from "@/components/billing/plan-context";
import {
  dashCard,
  dashCardHeader,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  FinancialIntelligenceSnapshot,
  FinancialRangeKey,
} from "@/lib/data/financial-intelligence";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const RANGE_OPTIONS: { id: FinancialRangeKey; label: string }[] = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_90_days", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
];

type Props = {
  snapshot: FinancialIntelligenceSnapshot;
  activeRange: FinancialRangeKey;
  /** Server plan: custom ranges only when true (RevenueCat-only Pro still sees locked ranges until profile updates). */
  canCustomizeDateRange: boolean;
};

type InsightBlock = {
  headline: string;
  body: string;
  variant: "positive" | "negative" | "neutral" | "investing";
};

function dashboardInsight(s: FinancialIntelligenceSnapshot): InsightBlock {
  if (!s.hasActivity) {
    return {
      headline: "No financial activity yet",
      body: "Log revenue or expenses on your timeline to answer whether you’re making or losing money this month.",
      variant: "neutral",
    };
  }

  const { grossRevenue: rev, totalCosts: costs, netIncome: net } = s;

  if (rev === 0 && costs > 0) {
    return {
      headline: "You’re currently investing in this project",
      body: `You’ve spent ${money.format(costs)} with no revenue logged yet this period.`,
      variant: "investing",
    };
  }

  if (net > 0) {
    return {
      headline: "You’re profitable",
      body: "You’ve earned more than you’ve spent this period, after costs and partner share.",
      variant: "positive",
    };
  }

  if (rev > 0 && costs > rev && net <= 0) {
    return {
      headline: "Costs are ahead of revenue",
      body: `Spending (${money.format(costs)}) is higher than gross revenue (${money.format(rev)}). Review categories below or focus on growing income.`,
      variant: "negative",
    };
  }

  if (net < 0) {
    return {
      headline: "You’re losing money this period",
      body: "After revenue, expenses, and partner share, net income is negative. Use the breakdowns to see where money goes.",
      variant: "negative",
    };
  }

  return {
    headline: "Roughly break-even",
    body: "Revenue and spending are close this month. Small changes on either side will move net income.",
    variant: "neutral",
  };
}

function NetIncomeHero({
  net,
  hasActivity,
  grossRevenue,
  totalCosts,
  periodLabel,
}: {
  net: number;
  hasActivity: boolean;
  grossRevenue: number;
  totalCosts: number;
  periodLabel: string;
}) {
  const positive = net > 0;
  const negative = net < 0;

  const contextLine = !hasActivity
    ? `${periodLabel} — add revenue or expenses to see your numbers.`
    : `${periodLabel}: ${money.format(grossRevenue)} revenue and ${money.format(totalCosts)} in costs.`;

  const statusLine = !hasActivity
    ? "No activity yet"
    : grossRevenue === 0 && totalCosts > 0
      ? "You're investing in this project"
      : positive
        ? "This project is profitable"
        : negative
          ? "This project is currently losing money"
          : "This project is close to break-even";

  const simpleInsight = !hasActivity
    ? "No activity yet — log your first revenue or expense."
    : grossRevenue === 0 && totalCosts > 0
      ? `You've spent ${money.format(totalCosts)} and earned ${money.format(0)} in this period.`
      : positive
        ? "Revenue is covering your costs."
        : negative
          ? `You've spent ${money.format(totalCosts)} and earned ${money.format(grossRevenue)} in this period.`
          : "You're close to breaking even.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-10",
        "ring-1 ring-inset",
        !hasActivity && "bg-zinc-50 ring-zinc-200/90",
        hasActivity &&
          positive &&
          "bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 ring-emerald-200/80",
        hasActivity &&
          negative &&
          "bg-gradient-to-br from-red-50 via-white to-red-50/30 ring-red-200/80",
        hasActivity &&
          !positive &&
          !negative &&
          "bg-gradient-to-br from-zinc-50 via-white to-zinc-50/80 ring-zinc-200/80"
      )}
    >
      {!hasActivity ? (
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-zinc-200/20 blur-2xl"
          aria-hidden
        />
      ) : null}
      <p className="text-[13px] font-medium tracking-wide text-zinc-600">Net income</p>
      <p
        className={cn(
          "mt-2 text-5xl font-bold tabular-nums tracking-tight sm:text-6xl sm:tracking-tighter",
          !hasActivity && "text-zinc-800",
          hasActivity && positive && "text-emerald-600",
          hasActivity && negative && "text-red-600",
          hasActivity && !positive && !negative && "text-zinc-900"
        )}
      >
        {hasActivity ? money.format(net) : money.format(0)}
      </p>
      <p
        className={cn(
          "mt-2 text-[14px] font-semibold",
          !hasActivity && "text-zinc-600",
          hasActivity && positive && "text-emerald-700",
          hasActivity && negative && "text-red-700",
          hasActivity && !positive && !negative && "text-zinc-700"
        )}
      >
        {statusLine}
      </p>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-zinc-600">{contextLine}</p>
      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-zinc-700">{simpleInsight}</p>
    </div>
  );
}

function MetricMini({
  label,
  value,
  accent,
  icon,
  subline,
}: {
  label: string;
  value: string;
  accent: "revenue" | "costs" | "share";
  icon: ReactNode;
  subline?: string;
}) {
  const accentRing =
    accent === "revenue"
      ? "ring-emerald-200/60"
      : accent === "costs"
        ? "ring-orange-200/70"
        : "ring-violet-200/60";
  const accentBg =
    accent === "revenue"
      ? "bg-emerald-50/50"
      : accent === "costs"
        ? "bg-orange-50/40"
        : "bg-violet-50/40";

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm ring-1 ring-transparent",
        accentRing
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.12em]",
            accent === "revenue" && "text-emerald-700",
            accent === "costs" && "text-orange-800",
            accent === "share" && "text-violet-800"
          )}
        >
          {label}
        </span>
        <span className={cn("rounded-md p-1", accentBg)}>{icon}</span>
      </div>
      <p className="mt-3 text-[22px] font-semibold tabular-nums tracking-tight text-zinc-950 sm:text-2xl">
        {value}
      </p>
      {subline ? <p className="mt-1 text-[11px] text-zinc-500">{subline}</p> : null}
    </div>
  );
}

function InsightCard({
  block,
  showActions,
  hasActivity,
}: {
  block: InsightBlock;
  showActions: boolean;
  hasActivity: boolean;
}) {
  const border =
    block.variant === "positive"
      ? "border-emerald-200/70 bg-emerald-50/25"
      : block.variant === "negative"
        ? "border-red-200/60 bg-red-50/20"
        : block.variant === "investing"
          ? "border-amber-200/70 bg-amber-50/25"
          : "border-zinc-200/80 bg-zinc-50/40";

  return (
    <div className={cn("rounded-2xl border px-5 py-5 sm:px-6 sm:py-6", border)}>
      <h2 className="text-[16px] font-semibold leading-snug text-zinc-900 sm:text-[17px]">
        {block.headline}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 sm:text-[14px]">{block.body}</p>
      {showActions ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!hasActivity ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "rounded-lg text-[12px] font-medium no-underline"
                )}
              >
                Log revenue
              </Link>
              <Link
                href="/costs"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-lg text-[12px] font-medium no-underline"
                )}
              >
                Log expense
              </Link>
            </>
          ) : (
            <Link
              href="/costs"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "rounded-lg text-[12px] font-medium no-underline"
              )}
            >
              Review expenses
            </Link>
          )}
          {!hasActivity ? null : block.variant === "investing" ? (
            <span className="text-[12px] text-zinc-500">Log revenue when you get paid.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BreakdownBars({
  label,
  rows,
  emptyHint,
  accent,
}: {
  label: string;
  rows: { label: string; value: number }[];
  emptyHint: string;
  accent: "revenue" | "costs";
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const fillClass =
    accent === "revenue"
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : "bg-gradient-to-r from-orange-500 to-amber-400";

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/30 py-0 shadow-none">
      <div className="border-b border-zinc-100/90 px-5 pb-3 pt-4">
        <h3 className="text-[13px] font-semibold text-zinc-700">{label}</h3>
      </div>
      <div className="space-y-5 px-5 pb-6 pt-4">
        {rows.length === 0 ? (
          <p className="text-[12px] text-zinc-500">{emptyHint}</p>
        ) : (
          <ul className="space-y-5">
            {rows.map((row, i) => (
              <li key={`${row.label}-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] font-medium text-zinc-700">
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-[13px] font-semibold text-zinc-900">
                    {money.format(row.value)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200/60">
                  <div
                    className={cn("h-full max-w-full rounded-full transition-all", fillClass)}
                    style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function FinancialIntelligenceView({
  snapshot,
  activeRange,
  canCustomizeDateRange,
}: Props) {
  const { isPro, openUpgrade } = usePlan();
  const s = snapshot;
  const insight = dashboardInsight(s);

  const revenueRows = s.revenueBySource.map((r) => ({
    label: r.source,
    value: r.total,
  }));
  const costRows = s.costsByCategory.map((r) => ({
    label: r.category,
    value: r.total,
  }));

  const breakdownInner = (
    <div className="grid gap-6 lg:grid-cols-2">
      <BreakdownBars
        label="Revenue by source"
        rows={revenueRows}
        emptyHint="No revenue yet — log your first payment to start tracking sources."
        accent="revenue"
      />
      <BreakdownBars
        label="Costs by category"
        rows={costRows}
        emptyHint="No expenses yet — track tools, ads, and subscriptions."
        accent="costs"
      />
      <Card className={cn(dashCard, "border-zinc-200/50 bg-zinc-50/20 py-0 shadow-none lg:col-span-2")}>
        <CardHeader className={cn(dashCardHeader, "border-b border-zinc-100/80 bg-transparent pb-3")}>
          <CardTitle className={cn(dashSectionTitle, "text-[13px] font-semibold text-zinc-600")}>
            Partner revenue share
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-6 pt-4">
          {s.dealRows.length === 0 ? (
            <p className="text-[12px] text-zinc-500">
              No deal events — add partner agreements with a revenue share % to model deductions.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-100/90">
                {s.dealRows.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-800">{d.partnerName}</p>
                      <p className="text-[11px] tabular-nums text-zinc-500">
                        {d.percent.toFixed(1)}% of gross · {d.entryDate}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums text-zinc-700">
                      −{money.format(d.nominalDeduction)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2.5">
                <span className="text-[11px] font-medium text-zinc-600">
                  Applied ({s.combinedSharePercent.toFixed(1)}% combined)
                </span>
                <span className="text-[13px] font-bold tabular-nums text-zinc-900">
                  −{money.format(s.revenueShareDeduction)}
                </span>
              </div>
              {s.shareRatesCapped ? (
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Partner rates sum above 100%; applied share is capped at gross revenue.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const showInsightActions = !(s.hasActivity && s.netIncome > 0);

  return (
    <div className="space-y-8 pb-4">
      <PageHeader
        eyebrow="Finance"
        title="Financial overview"
        description="Are you making or losing money?"
        action={
          <Link
            href="/costs"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-9 rounded-lg text-[12px] font-medium no-underline"
            )}
          >
            Manage expenses
          </Link>
        }
      />

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Date range
        </p>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((opt) => {
            const selected = opt.id === activeRange;
            const locked = !canCustomizeDateRange && opt.id !== "this_month";
            if (locked) {
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    toast.message("Custom date ranges are a Pro feature", {
                      description: "Upgrade to analyze last month, 90 days, or year to date.",
                    });
                    openUpgrade();
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    "border-dashed border-zinc-300/90 bg-zinc-50/60 text-zinc-500 hover:border-zinc-400/80 hover:bg-zinc-100/80 hover:text-zinc-700"
                  )}
                >
                  <Lock className="size-3 shrink-0 opacity-50" strokeWidth={1.75} aria-hidden />
                  {opt.label}
                </button>
              );
            }
            const href =
              opt.id === "this_month" ? "/financials" : `/financials?range=${opt.id}`;
            return (
              <Link
                key={opt.id}
                href={href}
                scroll={false}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium no-underline transition-colors",
                  selected
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200/90 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
        {!canCustomizeDateRange ? (
          <p className="text-[11px] text-zinc-500">
            Free plan uses <span className="font-medium text-zinc-700">This month</span>. Pro unlocks
            more ranges.
          </p>
        ) : null}
      </div>

      <NetIncomeHero
        net={s.netIncome}
        hasActivity={s.hasActivity}
        grossRevenue={s.grossRevenue}
        totalCosts={s.totalCosts}
        periodLabel={s.periodLabel}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricMini
          label="Total revenue"
          value={money.format(s.grossRevenue)}
          accent="revenue"
          icon={<ArrowUpRight className="size-4 text-emerald-600" strokeWidth={2} />}
        />
        <MetricMini
          label="Total costs"
          value={money.format(s.totalCosts)}
          accent="costs"
          icon={<ArrowDownRight className="size-4 text-orange-600" strokeWidth={2} />}
        />
        <MetricMini
          label="Revenue share"
          value={
            s.revenueShareDeduction > 0
              ? `−${money.format(s.revenueShareDeduction)}`
              : money.format(0)
          }
          accent="share"
          icon={<Handshake className="size-4 text-violet-600" strokeWidth={2} />}
          subline={
            s.combinedSharePercent > 0
              ? `${s.combinedSharePercent.toFixed(1)}% of gross · matches dashboard take-home`
              : "No partner share logged this period"
          }
        />
      </div>

      <section className="space-y-4 border-t border-zinc-200/60 pt-10">
        <div className="flex items-center gap-2 text-zinc-500">
          <Info className="size-4" strokeWidth={1.65} />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Insights
          </h2>
        </div>
        <ProAnalyticsGate
          isPro={isPro}
          overlayTitle="Financial insights"
          overlayDescription="A clearer read on profitability, spend, and what to do next."
          ctaLabel="Upgrade to Pro"
        >
          <InsightCard
            block={insight}
            showActions={showInsightActions}
            hasActivity={s.hasActivity}
          />
        </ProAnalyticsGate>
      </section>

      <section className="space-y-5 border-t border-zinc-200/60 pt-10">
        <div className="flex items-center gap-2 text-zinc-500">
          <Layers className="size-4" strokeWidth={1.65} />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Breakdowns
          </h2>
        </div>
        <ProAnalyticsGate
          isPro={isPro}
          overlayTitle="Detailed breakdowns"
          overlayDescription="Upgrade to see detailed breakdowns."
          ctaLabel="Upgrade to Pro"
        >
          {breakdownInner}
        </ProAnalyticsGate>
      </section>

      <div className="space-y-4 border-t border-zinc-100/80 pt-8">
        <p className="text-center text-[11px] leading-relaxed text-zinc-400 sm:text-left">
          Net income = revenue − costs − revenue share.{" "}
          <Link href="/costs" className="text-zinc-600 underline-offset-2 hover:underline">
            Log spending on Expenses
          </Link>
          .
        </p>
        <p className="flex items-start justify-center gap-1.5 text-center text-[10px] leading-relaxed text-zinc-400/90 sm:justify-start sm:text-left">
          <Info
            className="mt-[2px] size-3 shrink-0 text-zinc-400/80"
            strokeWidth={2}
            aria-hidden
          />
          <span className="max-w-prose">
            These numbers are for tracking and insights, not official financial or tax reporting.
          </span>
        </p>
      </div>
    </div>
  );
}
