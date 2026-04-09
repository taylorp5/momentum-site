"use client";

import Link from "next/link";
import { MomentumLogo } from "@/components/momentum-logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  className?: string;
};

export function AppSidebar({ className }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-full w-[248px] shrink-0 flex-col border-r border-zinc-200/80 bg-zinc-50/75 lg:flex",
        className
      )}
    >
      <div className="flex h-[52px] shrink-0 items-center border-b border-zinc-200/80 bg-white/95 px-4 backdrop-blur-sm">
        <Link
          href="/dashboard"
          className="-m-1 rounded-lg p-1 outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-zinc-400/50"
        >
          <MomentumLogo />
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <SidebarNav className="pt-3" />
      </ScrollArea>
    </aside>
  );
}
