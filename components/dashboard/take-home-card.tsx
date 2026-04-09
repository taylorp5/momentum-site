"use client";

import { ArrowDownRight, ArrowUpRight, Handshake, Wallet } from "lucide-react";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TakeHomeSummary } from "@/lib/data/dashboard";
import type { Project } from "@/types/momentum";

type TakeHomeCardProps = {
  summary: TakeHomeSummary;
  projects: Project[];
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function TakeHomeCard({ summary, projects }: TakeHomeCardProps) {
  const takeHomeTone =
    summary.takeHome > 0
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200/80"
      : summary.takeHome < 0
        ? "text-red-700 bg-red-50 ring-red-200/80"
        : "text-zinc-700 bg-zinc-50 ring-zinc-200/80";

  return (
    <Card className="rounded-[12px] border-zinc-200/80 bg-zinc-50/40 py-0 shadow-sm ring-0">
      <CardHeader className="border-b border-zinc-100/90 bg-transparent px-4 pb-3 pt-4">
        <CardTitle className="text-[15px] font-semibold tracking-tight text-zinc-950">
          Take-home (this month)
        </CardTitle>
        <p className="text-[13px] font-normal leading-relaxed text-zinc-600">
          {summary.monthLabel} summary from timeline financial events.
        </p>
      </CardHeader>
      <CardContent className="space-y-3.5 px-4 py-3.5">
        {!summary.hasFinancialActivity ? (
          <div className="space-y-3">
            <p className="text-[14px] font-medium text-zinc-800">
              No financial activity yet
            </p>
            <div className="flex flex-wrap gap-2">
              <LogEventDialog projects={projects} defaultEventType="revenue">
                <Button className="rounded-lg bg-zinc-900 hover:bg-zinc-800">
                  Log revenue
                </Button>
              </LogEventDialog>
              <LogEventDialog projects={projects} defaultEventType="cost">
                <Button variant="outline" className="rounded-lg">
                  Log expense
                </Button>
              </LogEventDialog>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-zinc-600">Revenue</span>
          <span className="inline-flex items-center justify-end gap-1.5 text-right text-[14px] font-semibold tabular-nums text-zinc-950">
            <ArrowUpRight className="size-3.5 text-emerald-600" strokeWidth={1.8} />
            {money.format(summary.revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-zinc-600">Expenses</span>
          <span className="inline-flex items-center justify-end gap-1.5 text-right text-[14px] font-semibold tabular-nums text-zinc-950">
            <ArrowDownRight className="size-3.5 text-amber-600" strokeWidth={1.8} />
            -{money.format(summary.costs)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600">
            <Handshake className="size-3.5 text-zinc-500" strokeWidth={1.8} />
            Revenue share ({summary.revenueSharePercent.toFixed(1)}%)
          </span>
          <span className="text-right text-[14px] font-semibold tabular-nums text-zinc-950">
            -{money.format(summary.revenueShare)}
          </span>
        </div>

        <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ring-1 ${takeHomeTone}`}>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
            <Wallet className="size-3.5" strokeWidth={1.8} />
            Take home
          </span>
          <span className="text-right text-[20px] font-bold tabular-nums">
            {money.format(summary.takeHome)}
          </span>
        </div>
        <p className="text-[12px] text-zinc-600">{summary.insight}</p>
      </CardContent>
    </Card>
  );
}
