"use client";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  action?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
  titleClassName,
  action,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[#eeeeee] pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "text-[1.625rem] font-medium leading-tight tracking-tight text-zinc-900 sm:text-[1.875rem] sm:leading-[1.12]",
            titleClassName
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl pt-0.5 text-[14px] font-normal leading-relaxed text-zinc-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap gap-2 sm:pb-px">{action}</div>
      ) : null}
    </div>
  );
}
