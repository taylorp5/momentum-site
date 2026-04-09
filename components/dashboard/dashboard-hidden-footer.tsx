"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  revealAllHiddenDashboardAction,
  showDashboardInsightAction,
  showDashboardWidgetAction,
} from "@/app/actions/dashboard-preferences";
import type { ActionResult } from "@/lib/actions/result";
import { Button } from "@/components/ui/button";
import { DASHBOARD_INSIGHT_LABELS } from "@/lib/insights/build-dashboard-insights";
import {
  DASHBOARD_WIDGET_LABELS,
  isKnownWidgetId,
} from "@/lib/dashboard-preferences";
import type { DashboardInsight } from "@/lib/insights/build-dashboard-insights";

type Props = {
  hiddenWidgets: string[];
  hiddenInsights: string[];
};

function labelForInsight(id: string): string {
  if (id in DASHBOARD_INSIGHT_LABELS) {
    return DASHBOARD_INSIGHT_LABELS[id as DashboardInsight["id"]];
  }
  return id;
}

export function DashboardHiddenFooter({ hiddenWidgets, hiddenInsights }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const total = hiddenWidgets.length + hiddenInsights.length;
  if (total === 0) return null;

  async function run(id: string, fn: () => Promise<ActionResult>) {
    setBusy(id);
    try {
      const res = await fn();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/40 px-5 py-4 transition-colors duration-200 hover:border-zinc-300/90">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[13px] font-medium text-zinc-800">Hidden cards</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">
            Restore anything you hid from a card menu or customization.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy === "all"}
          className="h-8 shrink-0 rounded-lg border-[#eeeeee] text-[12px]"
          onClick={() =>
            void run("all", () => revealAllHiddenDashboardAction())
          }
        >
          Show all hidden
        </Button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {hiddenWidgets.map((id) => {
          const label = isKnownWidgetId(id)
            ? DASHBOARD_WIDGET_LABELS[id]
            : id;
          return (
            <li key={`w-${id}`}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy !== null}
                className="h-8 rounded-lg border border-zinc-200/80 bg-white/90 text-[12px] font-normal text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
                onClick={() =>
                  void run(`w-${id}`, () => showDashboardWidgetAction(id))
                }
              >
                Show: {label}
              </Button>
            </li>
          );
        })}
        {hiddenInsights.map((id) => (
          <li key={`i-${id}`}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy !== null}
              className="h-8 rounded-lg border border-zinc-200/80 bg-white/90 text-[12px] font-normal text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
              onClick={() =>
                void run(`i-${id}`, () => showDashboardInsightAction(id))
              }
            >
              Show insight: {labelForInsight(id)}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
