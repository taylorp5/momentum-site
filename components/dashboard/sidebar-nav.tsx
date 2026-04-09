"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { futureNav, mainNav } from "@/components/dashboard/nav-config";

type SidebarNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-1 flex-col px-2.5 pb-5 pt-0.5", className)}>
      <div className="space-y-px">
        <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          Workspace
        </p>
        {mainNav.map((item) => {
          const active =
            !item.disabled &&
            (pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/focus" &&
                pathname.startsWith(item.href)));

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-zinc-400"
                aria-disabled="true"
                title="Coming soon"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <item.icon
                    className="size-[17px] shrink-0 text-zinc-400"
                    strokeWidth={1.65}
                    aria-hidden
                  />
                  <span>{item.title}</span>
                </span>
                {item.badge ? (
                  <span className="shrink-0 text-[10px] font-medium tracking-wide text-zinc-400/90">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-blue-50/80 text-blue-900 shadow-[0_1px_1px_rgba(15,23,42,0.03)] ring-1 ring-blue-200/90"
                  : "text-zinc-700 hover:bg-zinc-100/80 hover:text-zinc-950"
              )}
            >
              <item.icon
                className={cn(
                  "size-[17px] shrink-0 transition-colors",
                  active ? "text-blue-700" : "text-zinc-500 group-hover:text-zinc-700"
                )}
                strokeWidth={active ? 2 : 1.65}
              />
              {item.title}
            </Link>
          );
        })}
      </div>

      {futureNav.length > 0 ? (
        <>
          <Separator className="my-4 bg-zinc-300/45" />

          <div className="space-y-px">
            <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400/85">
              Roadmap
            </p>
            {futureNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100/70 hover:text-zinc-700"
                title="Preview — full module later"
              >
                <span className="flex items-center gap-2.5">
                  <item.icon
                    className="size-4 shrink-0 text-zinc-400/80"
                    strokeWidth={1.5}
                  />
                  {item.title}
                </span>
                {item.badge ? (
                  <span className="tabular-nums text-[10px] font-medium tracking-wide text-zinc-400/70">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </nav>
  );
}
