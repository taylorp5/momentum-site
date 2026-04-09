"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Crosshair, LayoutDashboard, LogOut, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { UploadScreenshotDialog } from "@/components/intake/upload-screenshot-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Project } from "@/types/momentum";
import type { RunningWorkSessionBanner } from "@/lib/data/work-sessions";

type DashboardHeaderProps = {
  displayName: string | null;
  email: string | null;
  projects: Project[];
  runningSession: RunningWorkSessionBanner;
  leading?: React.ReactNode;
};

export function DashboardHeader({
  displayName,
  email,
  projects,
  runningSession,
  leading,
}: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const onFocusPage = pathname === "/focus";
  const initials =
    (displayName ?? email ?? "U")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  async function signOut() {
    if (isMockDataMode()) {
      toast.message("Demo mode — there is no session to end.");
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.error("Supabase is not configured.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!runningSession) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [runningSession]);
  const runningLabel = useMemo(() => {
    if (!runningSession) return null;
    const extra = runningSession.lastResumedAt
      ? Math.max(
          0,
          Math.floor((now - new Date(runningSession.lastResumedAt).getTime()) / 1000)
        )
      : 0;
    const total = runningSession.durationSeconds + extra;
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${runningSession.projectName} • ${h}:${m}:${s} running`;
  }, [runningSession, now]);

  return (
    <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-2 border-b border-zinc-300/35 bg-zinc-50/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-50/75 sm:gap-3 sm:px-5 lg:px-8">
      {leading ? (
        <div className="flex shrink-0 items-center">{leading}</div>
      ) : null}

      <div className="relative min-w-0 max-w-[min(100%,17rem)] flex-1 sm:max-w-[15.5rem] lg:max-w-[17rem]">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400/90"
          strokeWidth={1.5}
        />
        <Input
          readOnly
          placeholder="Search…"
          className="h-8 rounded-lg border-zinc-200/70 bg-zinc-50/80 pl-8 pr-3 text-[13px] text-zinc-800 shadow-none ring-offset-0 placeholder:text-zinc-400/75 focus-visible:border-zinc-300/90 focus-visible:ring-1 focus-visible:ring-zinc-300/30"
          aria-label="Search (coming soon)"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        {runningLabel ? (
          <div className="hidden h-8 items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/45 px-2.5 text-[11px] font-medium text-emerald-800 md:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {runningLabel}
          </div>
        ) : null}
        <Link
          href={onFocusPage ? "/dashboard" : "/focus"}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 gap-1.5 rounded-lg border-zinc-200/90 bg-white px-2.5 text-[12px] font-semibold text-zinc-800 shadow-none hover:bg-zinc-50"
          )}
        >
          {onFocusPage ? (
            <LayoutDashboard className="size-3.5 opacity-90" strokeWidth={1.75} />
          ) : (
            <Crosshair className="size-3.5 opacity-90" strokeWidth={1.75} />
          )}
          {onFocusPage ? "Full dashboard" : "Focus Mode"}
        </Link>
        <UploadScreenshotDialog projects={projects} />
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex size-9 items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none ring-offset-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400/45 sm:size-9">
            <Avatar className="size-8 border border-zinc-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:size-9">
              <AvatarFallback className="bg-zinc-900 text-[10px] font-semibold text-white sm:text-[11px]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl border-zinc-200/90 shadow-lg"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm font-semibold text-zinc-950">
                  {displayName ?? "Builder"}
                </div>
                <div className="text-xs font-normal text-zinc-500">{email}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-zinc-100" />
            <DropdownMenuItem
              className="rounded-lg text-[13px]"
              onClick={() => router.push("/settings")}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-100" />
            <DropdownMenuItem
              className="rounded-lg text-[13px] text-red-600 focus:text-red-600"
              onClick={signOut}
            >
              <LogOut className="mr-2 size-4" strokeWidth={1.75} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
