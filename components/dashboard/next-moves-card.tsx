"use client";

import Link from "next/link";
import { ArrowRight, Compass, Lock } from "lucide-react";
import { usePlan } from "@/components/billing/plan-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  dashCard,
  dashCardHeader,
  dashSectionDesc,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { STATUS_TONE_CLASS } from "@/lib/dashboard-colors";
import type { NextMove } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

const FREE_INSIGHT_LIMIT = 2;

type NextMovesCardProps = {
  moves: NextMove[];
  isPro: boolean;
};

export function NextMovesCard({ moves, isPro }: NextMovesCardProps) {
  const { openUpgrade } = usePlan();
  const visible = isPro ? moves : moves.slice(0, FREE_INSIGHT_LIMIT);
  const lockedCount =
    !isPro && moves.length > FREE_INSIGHT_LIMIT
      ? moves.length - FREE_INSIGHT_LIMIT
      : 0;

  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={dashCardHeader}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>Next moves</CardTitle>
        <p className={dashSectionDesc}>
          Personalized nudges from what you&apos;ve logged.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 pb-5 pt-0">
        {moves.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-[#eeeeee] bg-zinc-50/30 p-4">
            <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-white text-zinc-500 ring-1 ring-[#eeeeee]">
              <Compass className="size-4" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-[13px] font-medium text-zinc-800">You&apos;re in a good rhythm</p>
              <p className="mt-1 text-[13px] font-normal leading-relaxed text-zinc-500">
                Keep logging events and distribution as you ship.
              </p>
            </div>
          </div>
        ) : (
          <>
          {visible.map((move) => (
            <div
              key={move.id}
              className="group rounded-xl border border-[#eeeeee] bg-zinc-50/20 p-4 transition-all duration-200 ease-out hover:border-zinc-200 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium leading-snug text-zinc-900">
                  {move.title}
                </p>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                    STATUS_TONE_CLASS[move.tone].badge
                  )}
                >
                  <span
                    className={cn("size-1.5 rounded-full", STATUS_TONE_CLASS[move.tone].dot)}
                  />
                  {STATUS_TONE_CLASS[move.tone].label}
                </span>
              </div>
              <p className="mt-2 text-[13px] font-normal leading-relaxed text-zinc-500">
                {move.detail}
              </p>
              <Link
                href={move.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-4 h-8 rounded-lg border-[#eeeeee] bg-white px-3 text-[12px] font-medium text-zinc-800 shadow-none transition-colors duration-150 hover:bg-zinc-50"
                )}
              >
                {move.cta}
                <ArrowRight className="ml-1 size-3.5 opacity-60" strokeWidth={1.75} />
              </Link>
            </div>
          ))}
          {lockedCount > 0 ? (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/40 p-4">
              <div className="pointer-events-none select-none blur-[2px] opacity-60" aria-hidden>
                <p className="text-[13px] font-medium text-zinc-800">
                  +{lockedCount} more tailored move{lockedCount === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-[13px] text-zinc-500">
                  Based on your recent distribution and timeline activity.
                </p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 px-4 text-center backdrop-blur-[2px]">
                <span className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-[#eeeeee]">
                  <Lock className="size-3.5" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="text-[13px] font-medium text-zinc-800">
                  More insights with Pro
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg border-[#eeeeee] text-[12px]"
                  onClick={openUpgrade}
                >
                  View Pro
                </Button>
              </div>
            </div>
          ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
