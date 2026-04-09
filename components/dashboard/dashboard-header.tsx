"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Crosshair, LayoutDashboard, LogOut, Pause, Play, Search, Square, Timer } from "lucide-react";
import {
  pauseWorkSessionAction,
  resumeWorkSessionAction,
  startWorkSessionAction,
  stopWorkSessionAction,
} from "@/app/actions/work-sessions";
import { createClient } from "@/lib/supabase/client";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { UploadScreenshotDialog } from "@/components/intake/upload-screenshot-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [startOpen, setStartOpen] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const [sessionActionPending, setSessionActionPending] = useState(false);
  const [sessionProjectId, setSessionProjectId] = useState(projects[0]?.id ?? "");
  const [sessionNote, setSessionNote] = useState("");
  const NOTE_KEY = "momentum:active-session-note";
  const NOTE_PROJECT_KEY = "momentum:active-session-note-project";
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
    if (!runningSession || runningSession.status !== "running") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [runningSession?.status, runningSession]);

  useEffect(() => {
    if (!startOpen) return;
    setSessionProjectId(projects[0]?.id ?? "");
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(NOTE_KEY) ?? "";
      setSessionNote(saved);
    } else {
      setSessionNote("");
    }
  }, [startOpen, projects]);

  useEffect(() => {
    if (!runningSession || typeof window === "undefined") return;
    const projectId = window.localStorage.getItem(NOTE_PROJECT_KEY);
    const saved = window.localStorage.getItem(NOTE_KEY) ?? "";
    if (projectId === runningSession.projectId && saved && !sessionNote) {
      setSessionNote(saved);
    }
  }, [runningSession, sessionNote]);

  const elapsedLabel = useMemo(() => {
    if (!runningSession) return null;
    const extra =
      runningSession.status === "running" && runningSession.lastResumedAt
      ? Math.max(
          0,
          Math.floor((now - new Date(runningSession.lastResumedAt).getTime()) / 1000)
        )
      : 0;
    const total = runningSession.durationSeconds + extra;
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [runningSession, now]);

  const sessionProjectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: project.id,
        label: project.name?.trim() || "Untitled project",
      })),
    [projects]
  );
  const selectedSessionProjectLabel =
    sessionProjectOptions.find((option) => option.value === sessionProjectId)?.label ??
    "";

  async function onStartSession() {
    if (!sessionProjectId) {
      toast.error("Choose a project to start a build session.");
      return;
    }
    setStartPending(true);
    try {
      const res = await startWorkSessionAction(sessionProjectId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NOTE_KEY, sessionNote.trim());
        window.localStorage.setItem(NOTE_PROJECT_KEY, sessionProjectId);
      }
      toast.success("Session started. You're building now.");
      setStartOpen(false);
      router.refresh();
    } finally {
      setStartPending(false);
    }
  }

  async function onPauseResume() {
    if (!runningSession) return;
    setSessionActionPending(true);
    try {
      const res =
        runningSession.status === "running"
          ? await pauseWorkSessionAction(runningSession.projectId)
          : await resumeWorkSessionAction(runningSession.projectId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(runningSession.status === "running" ? "Session paused." : "Session resumed.");
      router.refresh();
    } finally {
      setSessionActionPending(false);
    }
  }

  async function onEndSession() {
    if (!runningSession) return;
    setSessionActionPending(true);
    try {
      const res = await stopWorkSessionAction({
        projectId: runningSession.projectId,
        note: sessionNote,
        createTimelineEntry: true,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Session ended and logged to timeline.");
      setSessionNote("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(NOTE_KEY);
        window.localStorage.removeItem(NOTE_PROJECT_KEY);
      }
      router.refresh();
    } finally {
      setSessionActionPending(false);
    }
  }

  return (
    <div className="sticky top-0 z-30 border-b border-zinc-300/35 bg-zinc-50/85 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-50/75">
      <header className="flex h-[52px] shrink-0 items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-8">
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
          <Button
            type="button"
            variant={runningSession ? "secondary" : "default"}
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold"
            disabled={projects.length === 0 || Boolean(runningSession)}
            onClick={() => setStartOpen(true)}
            title={
              projects.length === 0
                ? "Create a project first."
                : runningSession
                  ? "End current session before starting another."
                  : undefined
            }
          >
            <Timer className="size-3.5" strokeWidth={1.75} />
            Start session
          </Button>
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

      {runningSession ? (
        <div className="border-t border-emerald-200/70 bg-emerald-50/55 px-3 py-2 sm:px-5 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-emerald-900">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 font-semibold">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {runningSession.projectName}
            </span>
            <span className="font-semibold tabular-nums">{elapsedLabel}</span>
            <span className="text-emerald-800/80">
              {runningSession.status === "running" ? "Building now" : "Paused"}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-md border-emerald-300/80 bg-white/85 px-2 text-[11px] text-emerald-900 hover:bg-white"
                disabled={sessionActionPending}
                onClick={() => void onPauseResume()}
              >
                {runningSession.status === "running" ? (
                  <Pause className="mr-1 size-3.5" />
                ) : (
                  <Play className="mr-1 size-3.5" />
                )}
                {runningSession.status === "running" ? "Pause" : "Resume"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-md bg-zinc-900 px-2 text-[11px] text-white hover:bg-zinc-800"
                disabled={sessionActionPending}
                onClick={() => void onEndSession()}
              >
                <Square className="mr-1 size-3.5" />
                End session
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start session</DialogTitle>
            <DialogDescription>
              Pick a project and start building. Keep it lightweight.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={sessionProjectId}
                onValueChange={(v) => setSessionProjectId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose project">
                    {selectedSessionProjectLabel || "Choose project"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sessionProjectOptions.map((project) => (
                    <SelectItem key={project.value} value={project.value}>
                      {project.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-note">
                What are you working on? <span className="text-zinc-500">(optional)</span>
              </Label>
              <Textarea
                id="session-note"
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
                placeholder="Landing page polish, bug fixes, onboarding flow..."
                className="min-h-[90px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStartOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onStartSession()}
              disabled={startPending || !sessionProjectId}
            >
              {startPending ? "Starting..." : "Start session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
