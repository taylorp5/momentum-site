import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  hint?: string;
  className?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "accent" | "success";
};

export function StatCard({
  title,
  value,
  hint,
  className,
  icon: Icon,
  tone = "neutral",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-zinc-200/85 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_22px_-18px_rgba(15,23,42,0.2)] transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-[1px] hover:bg-zinc-50/30 hover:border-zinc-300/70 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.2)] sm:p-4",
        tone === "accent" && "bg-blue-50/[0.35]",
        tone === "success" && "bg-emerald-50/[0.22]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-500">
          {title}
        </p>
        {Icon ? (
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-md bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200/70",
              tone === "accent" && "bg-blue-50 text-blue-600 ring-blue-200/80",
              tone === "success" && "bg-emerald-50 text-emerald-600 ring-emerald-200/80"
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.65} />
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-2 tabular-nums text-[1.78rem] font-semibold leading-none tracking-tight text-zinc-950 sm:text-[1.95rem]",
          tone === "accent" && "text-blue-700",
          tone === "success" && "text-emerald-700"
        )}
      >
        {value}
      </div>
      {hint ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-zinc-500/90">{hint}</p>
      ) : null}
    </div>
  );
}
