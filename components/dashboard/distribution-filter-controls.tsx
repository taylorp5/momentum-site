"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePlan } from "@/components/billing/plan-context";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DistributionPlatform } from "@/types/momentum";
import { PLATFORM_ORDER } from "@/lib/platform-config";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";

type Props = {
  isPro: boolean;
  range: "7d" | "30d" | "all" | "custom";
  platform: DistributionPlatform | "all";
  from: string;
  to: string;
  compact?: boolean;
};

export function DistributionFilterControls({
  isPro,
  range,
  platform,
  from,
  to,
  compact = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openUpgrade } = usePlan();

  function push(next: {
    range?: string;
    platform?: string;
    from?: string;
    to?: string;
  }) {
    const p = new URLSearchParams(searchParams.toString());
    const nr = next.range ?? range;
    const np = next.platform ?? platform;
    const nf = next.from ?? from;
    const nt = next.to ?? to;
    p.set("range", nr);
    p.set("platform", np);
    if (nr === "custom") {
      if (nf) p.set("from", nf);
      else p.delete("from");
      if (nt) p.set("to", nt);
      else p.delete("to");
    } else {
      p.delete("from");
      p.delete("to");
    }
    router.replace(`${pathname}?${p.toString()}`);
  }

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-3 py-2"
          : "rounded-xl border border-[#eeeeee] bg-white px-4 py-3 shadow-sm transition-shadow duration-200 ease-out hover:shadow-[0_4px_16px_-8px_rgba(15,23,42,0.1)]"
      }
    >
      <div className="flex flex-wrap items-end gap-x-2.5 gap-y-2">
      <div className="min-w-[152px]">
        <p
          className={
            compact
              ? "mb-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
              : "mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
          }
        >
          Range
        </p>
        <Select
          value={range}
          onValueChange={(v) => {
            const next = v ?? range;
            if (!isPro && (next === "all" || next === "custom")) {
              openUpgrade();
              return;
            }
            push({ range: next });
          }}
        >
          <SelectTrigger
            className={
              compact
                ? "h-7 rounded-md border-zinc-200 bg-white text-[12px] font-medium text-zinc-800 shadow-none focus-visible:ring-zinc-300/50"
                : "h-8 rounded-md border-zinc-200 bg-zinc-50/60 text-[12px] font-medium text-zinc-800 shadow-none focus-visible:ring-zinc-300/50"
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="all">All time{!isPro ? " · Pro" : ""}</SelectItem>
            <SelectItem value="custom">Custom range{!isPro ? " · Pro" : ""}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[182px]">
        <p
          className={
            compact
              ? "mb-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
              : "mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
          }
        >
          Platform
        </p>
        <Select value={platform} onValueChange={(v) => push({ platform: v ?? platform })}>
          <SelectTrigger
            className={
              compact
                ? "h-7 rounded-md border-zinc-200 bg-white text-[12px] font-medium text-zinc-800 shadow-none focus-visible:ring-zinc-300/50"
                : "h-8 rounded-md border-zinc-200 bg-zinc-50/60 text-[12px] font-medium text-zinc-800 shadow-none focus-visible:ring-zinc-300/50"
            }
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORM_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                <span className="inline-flex items-center gap-2">
                  <PlatformIcon platform={p} className="size-3.5 text-zinc-500" />
                  {DISTRIBUTION_PLATFORM_LABELS[p]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {range === "custom" ? (
        <>
          <div className="min-w-[150px]">
            <p
              className={
                compact
                  ? "mb-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
                  : "mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
              }
            >
              From
            </p>
            <Input
              className={
                compact
                  ? "h-7 rounded-md border-zinc-200 bg-white text-[12px] text-zinc-800 shadow-none"
                  : "h-8 rounded-md border-zinc-200 bg-zinc-50/60 text-[12px] text-zinc-800 shadow-none"
              }
              type="date"
              value={from}
              onChange={(e) => push({ from: e.target.value })}
            />
          </div>
          <div className="min-w-[150px]">
            <p
              className={
                compact
                  ? "mb-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
                  : "mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500"
              }
            >
              To
            </p>
            <Input
              className={
                compact
                  ? "h-7 rounded-md border-zinc-200 bg-white text-[12px] text-zinc-800 shadow-none"
                  : "h-8 rounded-md border-zinc-200 bg-zinc-50/60 text-[12px] text-zinc-800 shadow-none"
              }
              type="date"
              value={to}
              onChange={(e) => push({ to: e.target.value })}
            />
          </div>
        </>
      ) : null}
      </div>
    </div>
  );
}
