import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  /** Primary CTA (e.g. open dialog). */
  action?: React.ReactNode;
  /** Secondary action (e.g. link elsewhere). */
  secondaryAction?: React.ReactNode;
  /** Muted line under actions (tips, prerequisites). */
  footnote?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  className,
  action,
  secondaryAction,
  footnote,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[11px] border border-dashed border-zinc-200/90 bg-zinc-50/35 px-6 py-11 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-white text-zinc-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-zinc-200/80">
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight text-zinc-950">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-zinc-600">
        {description}
      </p>
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {action ? (
            <div className="flex flex-wrap justify-center gap-2">{action}</div>
          ) : null}
          {secondaryAction ? (
            <div className="flex flex-wrap justify-center gap-2">
              {secondaryAction}
            </div>
          ) : null}
        </div>
      ) : null}
      {footnote ? (
        <p className="mt-5 max-w-sm text-center text-[12px] leading-relaxed text-zinc-500">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
