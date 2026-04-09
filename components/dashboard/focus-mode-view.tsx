"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Settings2 } from "lucide-react";
import { createLogEventAction } from "@/app/actions/timeline";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { INSIGHT_ICON_EMOJI } from "@/lib/insights/build-dashboard-insights";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FocusModeSnapshot } from "@/lib/data/focus-mode";
import type { TakeHomeSummary } from "@/lib/data/dashboard";
import type { DashboardInsight } from "@/lib/insights/build-dashboard-insights";
import type { DistributionPlatform, Project } from "@/types/momentum";
import { toast } from "sonner";

type FocusModeViewProps = {
  snapshot: FocusModeSnapshot;
  primaryInsight: DashboardInsight | null;
  /** Platform hint for + Post quick action */
  quickPostPlatform: DistributionPlatform | undefined;
  projects: Project[];
  hasProjects: boolean;
  takeHome: TakeHomeSummary;
};

type LogSpec =
  | {
      type: "distribution";
      platform?: DistributionPlatform;
      distributionQuickMode: boolean;
    }
  | null;

export function FocusModeView({
  snapshot,
  primaryInsight,
  quickPostPlatform,
  projects,
  hasProjects,
  takeHome,
}: FocusModeViewProps) {
  const [logSpec, setLogSpec] = useState<LogSpec>(null);
  const [logOpen, setLogOpen] = useState(false);

  const openLog = useCallback((spec: NonNullable<LogSpec>) => {
    setLogSpec(spec);
    setLogOpen(true);
  }, []);

  const onLogOpenChange = useCallback((open: boolean) => {
    setLogOpen(open);
    if (!open) setLogSpec(null);
  }, []);

  const lastPostLabel = snapshot.lastPostDate
    ? format(new Date(`${snapshot.lastPostDate}T12:00:00`), "MMM d, yyyy")
    : "No posts yet";
  const daysSinceLastPost = snapshot.lastPostDate
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(`${snapshot.lastPostDate}T12:00:00`).getTime()) /
            86400000
        )
      )
    : null;

  const bestPlatformLabel =
    snapshot.bestPlatformThisWeek?.label ?? "—";
  const [logType, setLogType] = useState<"post" | "cost" | "note">("post");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [pending, setPending] = useState(false);

  const [postPlatform, setPostPlatform] = useState<DistributionPlatform>(
    quickPostPlatform ?? "other"
  );
  const [postTitle, setPostTitle] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [postViews, setPostViews] = useState("");
  const [postNotes, setPostNotes] = useState("");

  const [costAmount, setCostAmount] = useState("");
  const [costCategory, setCostCategory] = useState("");
  const [costNotes, setCostNotes] = useState("");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [showMetrics, setShowMetrics] = useState(true);
  const [showFinancials, setShowFinancials] = useState(false);
  const [showMiniChart, setShowMiniChart] = useState(false);
  const selectedProject = projects.find((p) => p.id === projectId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("focus-mode-prefs-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        showMetrics?: boolean;
        showFinancials?: boolean;
        showMiniChart?: boolean;
      };
      setShowMetrics(parsed.showMetrics ?? true);
      setShowFinancials(parsed.showFinancials ?? false);
      setShowMiniChart(parsed.showMiniChart ?? false);
    } catch {
      // noop
    }
  }, []);

  function persistPrefs(next: {
    showMetrics: boolean;
    showFinancials: boolean;
    showMiniChart: boolean;
  }) {
    setShowMetrics(next.showMetrics);
    setShowFinancials(next.showFinancials);
    setShowMiniChart(next.showMiniChart);
    try {
      localStorage.setItem("focus-mode-prefs-v1", JSON.stringify(next));
    } catch {
      // noop
    }
  }

  const sparklinePoints = useMemo(() => {
    const arr = snapshot.viewsTrend7d;
    const max = Math.max(1, ...arr);
    return arr
      .map((v, i) => {
        const x = (i / Math.max(1, arr.length - 1)) * 100;
        const y = 20 - (v / max) * 20;
        return `${x},${y}`;
      })
      .join(" ");
  }, [snapshot.viewsTrend7d]);
  const trendData = snapshot.viewsTrend7d.filter((v) => v > 0);
  const canRenderMiniChart = trendData.length >= 3;
  const latestViewsPoint = [...snapshot.viewsTrend7d].reverse().find((v) => v > 0) ?? 0;

  async function submitLog() {
    if (!projectId) {
      toast.error("Select a project first.");
      return;
    }
    const entryDate = new Date().toISOString().slice(0, 10);
    setPending(true);
    try {
      if (logType === "post") {
        const payload = {
          type: "distribution" as const,
          project_id: projectId,
          entry_date: entryDate,
          platform: postPlatform,
          title: postTitle || null,
          notes: postNotes,
          url: postUrl.trim() || "https://example.com",
          metrics: postViews.trim()
            ? { views: Number(postViews) || 0 }
            : undefined,
        };
        const res = await createLogEventAction(payload);
        if ("error" in res) return toast.error(res.error);
        toast.success("Post logged.");
        setPostTitle("");
        setPostUrl("");
        setPostViews("");
        setPostNotes("");
        return;
      }
      if (logType === "cost") {
        const amount = Number(costAmount);
        if (!Number.isFinite(amount) || amount < 0) {
          toast.error("Enter a valid amount.");
          return;
        }
        const res = await createLogEventAction({
          type: "cost" as const,
          project_id: projectId,
          entry_date: entryDate,
          amount,
          category: costCategory || "General",
          description: costNotes,
          title: "",
          is_recurring: false,
        });
        if ("error" in res) return toast.error(res.error);
        toast.success("Cost logged.");
        setCostAmount("");
        setCostCategory("");
        setCostNotes("");
        return;
      }
      const res = await createLogEventAction({
        type: "note" as const,
        project_id: projectId,
        entry_date: entryDate,
        title: noteTitle.trim() || "Quick note",
        description: noteBody,
      });
      if ("error" in res) return toast.error(res.error);
      toast.success("Note logged.");
      setNoteTitle("");
      setNoteBody("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Pro
        </p>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-9 rounded-full px-4 text-[13px] font-medium text-zinc-600 hover:text-zinc-900"
          )}
        >
          Full dashboard
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200/90 bg-white px-2.5 text-[12px] text-zinc-700 hover:bg-zinc-50">
            <Settings2 className="size-3.5" />
            Customize
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuCheckboxItem
              checked={showMetrics}
              onCheckedChange={(checked) =>
                persistPrefs({
                  showMetrics: Boolean(checked),
                  showFinancials,
                  showMiniChart,
                })
              }
            >
              Show metrics strip
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showFinancials}
              onCheckedChange={(checked) =>
                persistPrefs({
                  showMetrics,
                  showFinancials: Boolean(checked),
                  showMiniChart,
                })
              }
            >
              Show financial snapshot
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showMiniChart}
              onCheckedChange={(checked) =>
                persistPrefs({
                  showMetrics,
                  showFinancials,
                  showMiniChart: Boolean(checked),
                })
              }
            >
              Show mini chart
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[1.8rem] sm:leading-tight">
          Focus Mode
        </h1>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          One insight. Three actions. Back to building.
        </p>
      </header>

      {showMetrics ? (
      <div className="grid gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/40 p-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-zinc-200/70 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Last post</p>
          <p className="mt-0.5 text-[12px] font-medium text-zinc-800">{lastPostLabel}</p>
        </div>
        <div className="rounded-md border border-zinc-200/70 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Total views</p>
          <p className="mt-0.5 text-[12px] font-medium tabular-nums text-zinc-800">
            {snapshot.totalViews.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200/70 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Best platform</p>
          <p className="mt-0.5 text-[12px] font-medium text-zinc-800">{bestPlatformLabel}</p>
        </div>
        <div className="rounded-md border border-zinc-200/70 bg-white/80 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Days since post</p>
          <p className="mt-0.5 text-[12px] font-medium tabular-nums text-zinc-800">
            {daysSinceLastPost === null ? "—" : daysSinceLastPost}
          </p>
        </div>
      </div>
      ) : null}

      <section className="space-y-2.5">
        {primaryInsight ? (
          <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Primary insight
            </p>
            <p className="mt-1.5 flex items-start gap-2 text-[14px] font-semibold text-zinc-900">
              <span className="mt-0.5" aria-hidden>
                {INSIGHT_ICON_EMOJI[primaryInsight.icon]}
              </span>
              <span>{primaryInsight.title}</span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
              {primaryInsight.whatHappened}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
              {primaryInsight.whatToDoNext}
            </p>
            <div className="mt-3">
              <Button
                type="button"
                disabled={!hasProjects}
                className="h-9 rounded-lg bg-zinc-900 px-4 text-[13px] font-medium hover:bg-zinc-800"
                onClick={() =>
                  openLog({
                    type: "distribution",
                    platform: quickPostPlatform,
                    distributionQuickMode: true,
                  })
                }
              >
                Log a post
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-3.5 py-3 text-[13px] text-zinc-600">
            Log a few distribution posts to unlock a primary insight.
          </div>
        )}
      </section>

      <section className="space-y-2.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Log something
        </h2>
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3">
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-lg bg-zinc-100 p-1">
            {(["post", "cost", "note"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLogType(t)}
                className={cn(
                  "h-8 rounded-md px-3 text-[12px] font-medium capitalize transition-colors",
                  logType === t
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-500">Project</Label>
              <Select value={projectId} onValueChange={(v) => setProjectId(v ?? "")}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select project">
                    {(value: string | null) => {
                      if (!value) return "Select project";
                      return projects.find((p) => p.id === value)?.name ?? "Select project";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedProject ? (
                <p className="text-[11px] text-zinc-500">Choose a project to log quickly.</p>
              ) : null}
            </div>
          </div>

          {logType === "post" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Platform</Label>
                <Select
                  value={postPlatform}
                  onValueChange={(v) =>
                    setPostPlatform((v ?? "other") as DistributionPlatform)
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DISTRIBUTION_PLATFORM_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Views (optional)</Label>
                <Input value={postViews} onChange={(e) => setPostViews(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-zinc-500">Title / description</Label>
                <Input
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="What did you post?"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-zinc-500">URL (optional)</Label>
                <Input
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-zinc-500">Notes (optional)</Label>
                <Textarea
                  value={postNotes}
                  onChange={(e) => setPostNotes(e.target.value)}
                  placeholder="Any context worth remembering?"
                />
              </div>
            </div>
          ) : null}

          {logType === "cost" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Amount</Label>
                <Input
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  placeholder="12.00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Category</Label>
                <Input
                  value={costCategory}
                  onChange={(e) => setCostCategory(e.target.value)}
                  placeholder="Tools, Ads, Hosting..."
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] text-zinc-500">Notes (optional)</Label>
                <Textarea
                  value={costNotes}
                  onChange={(e) => setCostNotes(e.target.value)}
                  placeholder="Optional context"
                />
              </div>
            </div>
          ) : null}

          {logType === "note" ? (
            <div className="mt-3 grid gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Title (optional)</Label>
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Quick note"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-500">Note body</Label>
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="What happened?"
                />
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              disabled={!hasProjects || pending}
              className="h-9 rounded-lg bg-zinc-900 px-4 text-[13px] font-medium hover:bg-zinc-800"
              onClick={() => void submitLog()}
            >
              {pending ? "Saving..." : "Save log"}
            </Button>
          </div>
        </div>
        {!hasProjects ? (
          <CreateProjectDialog triggerLabel="Create project" />
        ) : null}
      </section>

      {showFinancials ? (
        <section className="rounded-lg border border-zinc-200/80 bg-zinc-50/40 px-3 py-2 text-[12px] text-zinc-600">
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-zinc-500">
            This month
          </p>
          <p className="mt-1">
            Revenue: <span className="font-medium text-zinc-900">${takeHome.revenue.toLocaleString()}</span>
            <span className="mx-2 text-zinc-300">•</span>
            Expenses: <span className="font-medium text-zinc-900">${takeHome.costs.toLocaleString()}</span>
            <span className="mx-2 text-zinc-300">•</span>
            Net: <span className="font-semibold text-zinc-900">${takeHome.takeHome.toLocaleString()}</span>
          </p>
        </section>
      ) : null}

      {showMiniChart ? (
        <section className="rounded-lg border border-zinc-200/80 bg-zinc-50/40 px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-zinc-500">
            Views trend (7d)
          </p>
          {canRenderMiniChart ? (
            <svg viewBox="0 0 100 16" className="h-6 w-full">
              <polyline
                fill="none"
                stroke="#86efac"
                strokeWidth="1.25"
                points={sparklinePoints}
              />
            </svg>
          ) : (
            <div className="space-y-0.5 text-[12px] text-zinc-600">
              <p>No trend yet — log more posts to see patterns.</p>
              {latestViewsPoint > 0 ? (
                <p className="text-[11px] text-zinc-500">
                  {latestViewsPoint.toLocaleString()} views from your latest logged post.
                </p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {logSpec ? (
        <LogEventDialog
          key={`${logSpec.type}-${logSpec.type === "distribution" ? (logSpec.platform ?? "any") + (logSpec.distributionQuickMode ? "-q" : "-f") : "x"}`}
          open={logOpen}
          onOpenChange={onLogOpenChange}
          projects={projects}
          defaultEventType={logSpec.type}
          defaultDistributionPlatform={
            logSpec.type === "distribution" ? logSpec.platform : undefined
          }
          distributionQuickMode={
            logSpec.type === "distribution" && logSpec.distributionQuickMode
          }
        />
      ) : null}
    </div>
  );
}
