"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MomentumLogo } from "@/components/momentum-logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Button } from "@/components/ui/button";
import { PlanProvider } from "@/components/billing/plan-context";
import type { Project, UserPlan } from "@/types/momentum";
import type { RunningWorkSessionBanner } from "@/lib/data/work-sessions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type DashboardFrameProps = {
  children: React.ReactNode;
  displayName: string | null;
  email: string | null;
  projects: Project[];
  plan: UserPlan;
  runningSession: RunningWorkSessionBanner;
};

export function DashboardFrame({
  children,
  displayName,
  email,
  projects,
  plan,
  runningSession,
}: DashboardFrameProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <PlanProvider plan={plan}>
    <div className="flex h-[100dvh] overflow-hidden bg-[#F7F7F8]">
      <AppSidebar />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="flex w-[min(100vw-2rem,272px)] flex-col gap-0 border-zinc-200/80 bg-zinc-50/95 p-0 sm:max-w-[272px]"
        >
          <SheetHeader className="space-y-0 border-b border-zinc-200/50 bg-white/90 px-4 py-4 text-left">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Link
              href="/dashboard"
              onClick={() => setMobileNavOpen(false)}
              className="inline-block outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-zinc-400/80"
            >
              <MomentumLogo />
            </Link>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav
              onNavigate={() => setMobileNavOpen(false)}
              className="pt-2"
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col bg-transparent">
        <DashboardHeader
          displayName={displayName}
          email={email}
          projects={projects}
          runningSession={runningSession}
          leading={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-1 size-9 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" strokeWidth={1.75} />
            </Button>
          }
        />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
    </PlanProvider>
  );
}
