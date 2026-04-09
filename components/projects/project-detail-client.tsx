"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ExternalLink, Link2, Plus, StickyNote } from "lucide-react";
import {
  GenerateFollowUpModal,
  OpenDistributionFollowUpButton,
} from "@/components/distribution/generate-follow-up-modal";
import {
  OpenRewritePostButton,
  RewritePostModal,
} from "@/components/distribution/rewrite-post-modal";
import { DistributionPostRoiFooter } from "@/components/distribution/distribution-post-roi-footer";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
import { DeleteTimelineEntryDialog } from "@/components/timeline/delete-timeline-entry-dialog";
import { TimelineEntryEditForm } from "@/components/timeline/timeline-entry-edit-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ProjectExportStoryButton } from "@/components/projects/project-export-story-button";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { WorkSessionCard } from "@/components/projects/work-session-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { parseDistributionMetrics } from "@/lib/distribution-metrics";
import { isMockDataMode } from "@/lib/env";
import { buildGroupedTimelineItems } from "@/lib/timeline/build-grouped-timeline";
import {
  getTimelineCardPresentation,
  presentationShellClass,
  TIMELINE_FILTER_OPTIONS,
  timelineEntryMatchesFilter,
  type TimelineFeedFilter,
} from "@/lib/timeline/timeline-presentation";
import {
  GroupedCrossPostBlock,
  GroupedWorkWeekBlock,
} from "@/components/projects/timeline-group-blocks";
import { cn } from "@/lib/utils";
import type {
  DistributionEntry,
  Project,
  TimelineEntry,
} from "@/types/momentum";
import Image from "next/image";

const timelineMetricFormatter = new Intl.NumberFormat("en-US");

export type TimelineRow = TimelineEntry & {
  image_signed_url: string | null;
};

type ProjectDetailClientProps = {
  project: Project;
  defaultTab?: string;
  showStartPrompt?: boolean;
  overview: {
    recentTimeline: TimelineRow[];
    recentDistribution: DistributionEntry[];
    timelineTotal: number;
    distributionTotal: number;
  };
  timeline: TimelineRow[];
  /** Titles for `content_group_id` on timeline rows (cross-post groups). */
  contentGroupTitles?: Record<string, string>;
  distribution: DistributionEntry[];
  isPro: boolean;
  revenueByDistributionId: Record<string, number>;
  workSessions: {
    todaySeconds: number;
    weekSeconds: number;
    activeSession: import("@/types/momentum").WorkSession | null;
    runningElsewhere: import("@/types/momentum").WorkSession | null;
    recentCompleted: import("@/types/momentum").WorkSession[];
  };
};

export function ProjectDetailClient({
  project,
  defaultTab = "overview",
  showStartPrompt = false,
  overview,
  timeline,
  contentGroupTitles = {},
  distribution,
  isPro,
  revenueByDistributionId,
  workSessions,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState(defaultTab);

  const [followUpAnchor, setFollowUpAnchor] = useState<DistributionEntry | null>(
    null
  );
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpLogPrefill, setFollowUpLogPrefill] = useState<{
    title: string;
    notes: string;
  } | null>(null);
  const [followUpLogOpen, setFollowUpLogOpen] = useState(false);

  const [rewriteAnchor, setRewriteAnchor] = useState<DistributionEntry | null>(
    null
  );
  const [rewriteModalOpen, setRewriteModalOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFeedFilter>("all");
  const [expandedTimelineGroups, setExpandedTimelineGroups] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!followUpModalOpen && !followUpLogOpen) {
      setFollowUpAnchor(null);
      setFollowUpLogPrefill(null);
    }
  }, [followUpModalOpen, followUpLogOpen]);

  const sortedTimeline = useMemo(
    () =>
      [...timeline].sort(
        (a, b) =>
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      ),
    [timeline]
  );

  const filteredTimeline = useMemo(
    () =>
      sortedTimeline.filter((e) => timelineEntryMatchesFilter(e, timelineFilter)),
    [sortedTimeline, timelineFilter]
  );

  const groupedTimeline = useMemo(
    () => buildGroupedTimelineItems(filteredTimeline, contentGroupTitles),
    [filteredTimeline, contentGroupTitles]
  );

  const toggleTimelineGroup = (groupId: string) => {
    setExpandedTimelineGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 border-b border-zinc-200/70 pb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Project
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ProjectAvatar name={project.name} logoUrl={project.logo_url} size="lg" />
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem] sm:leading-tight">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="max-w-2xl text-[15px] leading-relaxed text-zinc-600">
            {project.description ||
              "Add a description so future you will know what you meant."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <EditProjectDialog project={project} />
          <DeleteProjectDialog project={project} />
          <ProjectExportStoryButton />
          <Link
            href="/projects"
            className={buttonVariants({
              variant: "outline",
              className:
                "h-10 rounded-[10px] border-zinc-200/90 px-4 text-[13px] font-semibold",
            })}
          >
            All projects
          </Link>
        </div>
      </div>

      {showStartPrompt ? (
        <Card className="rounded-[11px] border-zinc-200/90 bg-zinc-50/50 py-0 shadow-none ring-0">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold tracking-tight text-zinc-950">
                Start your first log
              </p>
              <p className="mt-1 text-[13px] text-zinc-600">
                Log a single event — it appears on Timeline, and distribution posts
                also show on the Distribution tab automatically.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <LogEventDialog projectId={project.id} projects={[project]}>
                <Button className="h-9 rounded-lg">Log event</Button>
              </LogEventDialog>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="space-y-8">
        <TabsList
          variant="line"
          className="h-auto w-full min-w-0 flex-wrap justify-start gap-0 border-b border-zinc-200/80 bg-transparent p-0"
        >
          <TabsTrigger
            value="overview"
            className="mr-6 rounded-none border-0 bg-transparent px-0 pb-3 text-[13px] font-semibold text-zinc-500 shadow-none data-[active]:text-zinc-900"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="mr-6 rounded-none border-0 bg-transparent px-0 pb-3 text-[13px] font-semibold text-zinc-500 shadow-none data-[active]:text-zinc-900"
          >
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="distribution"
            className="rounded-none border-0 bg-transparent px-0 pb-3 text-[13px] font-semibold text-zinc-500 shadow-none data-[active]:text-zinc-900"
          >
            Distribution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 text-[15px]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Timeline entries" value={overview.timelineTotal} />
            <StatCard
              title="Distribution posts"
              value={overview.distributionTotal}
            />
            <StatCard
              title="Last updated"
              value={format(new Date(project.updated_at), "MMM d, yyyy")}
            />
            <StatCard
              title="Created"
              value={format(new Date(project.created_at), "MMM d, yyyy")}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="rounded-xl border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-zinc-100/80 pb-4">
                <CardTitle className="text-[15px] font-semibold tracking-tight">
                  Recent timeline
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-[12px] font-semibold text-zinc-600 hover:text-zinc-900"
                  onClick={() => setTab("timeline")}
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {overview.recentTimeline.length === 0 ? (
                  <p className="text-[13px] leading-relaxed text-zinc-500">
                    No story beats yet — add a note, link, or snapshot on the
                    Timeline tab.
                  </p>
                ) : (
                  overview.recentTimeline.map((e) => (
                    <div
                      key={e.id}
                      className="flex gap-3 rounded-[10px] border border-zinc-100/90 bg-zinc-50/40 p-3.5 transition-colors hover:bg-zinc-50/80"
                    >
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-200/60 text-zinc-500">
                        {e.type === "link" ? (
                          <Link2 className="size-4" strokeWidth={1.75} />
                        ) : (
                          <StickyNote className="size-4" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-zinc-900">
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-zinc-500">
                          {format(new Date(e.entry_date), "MMM d, yyyy")} ·{" "}
                          {e.type}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-zinc-100/80 pb-4">
                <CardTitle className="text-[15px] font-semibold tracking-tight">
                  Recent distribution
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-[12px] font-semibold text-zinc-600 hover:text-zinc-900"
                  onClick={() => setTab("distribution")}
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {overview.recentDistribution.length === 0 ? (
                  <p className="text-[13px] leading-relaxed text-zinc-500">
                    Log where you posted — the Distribution tab is built for
                    fast capture.
                  </p>
                ) : (
                  overview.recentDistribution.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-1.5 rounded-[10px] border border-zinc-100/90 bg-zinc-50/40 p-3.5 transition-colors hover:bg-zinc-50/80"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[14px] font-semibold text-zinc-900">
                          {d.title?.trim() ||
                            DISTRIBUTION_PLATFORM_LABELS[d.platform]}
                        </p>
                        <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 ring-1 ring-zinc-200/70">
                          {DISTRIBUTION_PLATFORM_LABELS[d.platform]}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-500">
                        {format(new Date(d.date_posted), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <WorkSessionCard
            projectId={project.id}
            projectName={project.name}
            todaySeconds={workSessions.todaySeconds}
            weekSeconds={workSessions.weekSeconds}
            activeSession={workSessions.activeSession}
            runningElsewhere={workSessions.runningElsewhere}
            recentCompleted={workSessions.recentCompleted}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <div className="flex flex-col gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Timeline
              </h2>
              <p className="max-w-xl text-[14px] leading-relaxed text-zinc-600">
                One chronological story — work time, builds, distribution, money,
                assets, and insights. Filter when you want to focus.
              </p>
            </div>
            <LogEventDialog projectId={project.id} projects={[project]}>
              <Button
                className="h-10 shrink-0 rounded-[10px] bg-zinc-900 px-4 text-[13px] font-semibold hover:bg-zinc-800"
                disabled={isMockDataMode()}
              >
                <Plus className="mr-1.5 size-4" strokeWidth={1.75} />
                Log event
              </Button>
            </LogEventDialog>
          </div>

          {sortedTimeline.length === 0 ? (
            <EmptyState
              icon={<StickyNote className="size-6" strokeWidth={1.5} />}
              title="Capture what shipped"
              description="Notes for decisions, links to launches, snapshots with receipts — your future self uses this to remember the arc, not just the code."
              action={
                <LogEventDialog projectId={project.id} projects={[project]}>
                  <Button
                    className="h-10 rounded-[10px]"
                    disabled={isMockDataMode()}
                  >
                    Log your first event
                  </Button>
                </LogEventDialog>
              }
              footnote={
                isMockDataMode()
                  ? "Preview mode: connect Supabase to save timeline entries."
                  : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {TIMELINE_FILTER_OPTIONS.map((opt) => {
                  const active = timelineFilter === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className={cn(
                        "h-8 rounded-full px-3 text-[12px] font-medium",
                        active && "bg-zinc-900 hover:bg-zinc-800"
                      )}
                      onClick={() => setTimelineFilter(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
              {filteredTimeline.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-200/90 bg-zinc-50/50 px-4 py-6 text-center text-[13px] text-zinc-600">
                  Nothing in this category yet.{" "}
                  <button
                    type="button"
                    className="font-semibold text-zinc-900 underline-offset-2 hover:underline"
                    onClick={() => setTimelineFilter("all")}
                  >
                    Show all
                  </button>
                </p>
              ) : (
                groupedTimeline.map((item) => {
                  if (item.kind === "single") {
                    return (
                      <TimelineFeedCard
                        key={item.entry.id}
                        entry={item.entry}
                        mockReadOnly={isMockDataMode()}
                        onUpdated={() => router.refresh()}
                      />
                    );
                  }
                  if (item.kind === "work_week") {
                    const gid = `work-week:${item.weekKey}`;
                    return (
                      <GroupedWorkWeekBlock
                        key={gid}
                        entries={item.entries}
                        expanded={expandedTimelineGroups.has(gid)}
                        onToggle={() => toggleTimelineGroup(gid)}
                        renderChildEntry={(e) => (
                          <TimelineFeedCard
                            entry={e}
                            mockReadOnly={isMockDataMode()}
                            onUpdated={() => router.refresh()}
                          />
                        )}
                      />
                    );
                  }
                  const gid = `cross-post:${item.contentGroupId}`;
                  return (
                    <GroupedCrossPostBlock
                      key={gid}
                      entries={item.entries}
                      groupTitle={item.groupTitle}
                      expanded={expandedTimelineGroups.has(gid)}
                      onToggle={() => toggleTimelineGroup(gid)}
                      renderChildEntry={(e) => (
                        <TimelineFeedCard
                          entry={e}
                          mockReadOnly={isMockDataMode()}
                          onUpdated={() => router.refresh()}
                        />
                      )}
                    />
                  );
                })
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="flex flex-col gap-4 border-b border-zinc-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Distribution
              </h2>
              <p className="max-w-xl text-[14px] leading-relaxed text-zinc-600">
                Filtered view of distribution-type timeline events — log once from
                Timeline with type “Distribution post” and it shows here too.
              </p>
            </div>
            <LogEventDialog
              projectId={project.id}
              projects={[project]}
              defaultEventType="distribution"
            >
              <Button
                className="h-10 shrink-0 rounded-[10px] bg-zinc-900 px-4 text-[13px] font-semibold hover:bg-zinc-800"
                disabled={isMockDataMode()}
              >
                <Plus className="mr-1.5 size-4" strokeWidth={1.75} />
                Log distribution post
              </Button>
            </LogEventDialog>
          </div>

          {distribution.length === 0 ? (
            <EmptyState
              icon={<ExternalLink className="size-6" strokeWidth={1.5} />}
              title="Log where you show up"
              description="Thread, Short, launch, newsletter — one row per touchpoint with a link and your own notes so you know what to repeat (or avoid)."
              action={
                <LogEventDialog
                  projectId={project.id}
                  projects={[project]}
                  defaultEventType="distribution"
                >
                  <Button
                    className="h-10 rounded-[10px]"
                    disabled={isMockDataMode()}
                  >
                    Log first distribution post
                  </Button>
                </LogEventDialog>
              }
              footnote={
                isMockDataMode()
                  ? "Preview mode: connect Supabase to save distribution rows."
                  : undefined
              }
            />
          ) : (
            <Card className="overflow-hidden rounded-[10px] border-zinc-200/85 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.035)] ring-0">
              <CardContent className="p-0">
                <div className="grid grid-cols-[160px_minmax(220px,1fr)_minmax(200px,auto)] border-b border-zinc-200/80 bg-zinc-50/90 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                  <span>Platform</span>
                  <span>Post</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {distribution.map((d) => (
                    <div
                      key={d.id}
                      className="grid grid-cols-[160px_minmax(220px,1fr)_minmax(200px,auto)] items-start gap-0 px-4 py-3 transition-colors hover:bg-zinc-50/70"
                    >
                      <div className="flex items-center gap-2 pt-0.5">
                        <PlatformIcon platform={d.platform} className="size-4 text-zinc-600" />
                        <div>
                          <p className="text-[12px] font-semibold text-zinc-900">
                            {DISTRIBUTION_PLATFORM_LABELS[d.platform]}
                          </p>
                          <p className="text-[11px] tabular-nums text-zinc-400">
                            {format(new Date(d.date_posted), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-[13px] font-semibold text-zinc-950" title={d.title?.trim() || "Untitled post"}>
                          {d.title?.trim() || "Untitled post"}
                        </p>
                        {d.notes ? (
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-zinc-600">
                            {d.notes}
                          </p>
                        ) : (
                          <p className="text-[12px] italic text-zinc-400">No notes</p>
                        )}
                        <DistributionPostRoiFooter
                          isPro={isPro}
                          attributedRevenue={revenueByDistributionId[d.id] ?? 0}
                          promoSpend={parseDistributionMetrics(
                            (d.metrics as Record<string, unknown> | null) ?? null
                          ).promo_spend}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <OpenDistributionFollowUpButton
                          disabled={isMockDataMode()}
                          stopRowClick={false}
                          className="w-full max-w-[200px] sm:w-auto"
                          onOpen={() => {
                            setFollowUpAnchor(d);
                            setFollowUpModalOpen(true);
                          }}
                        />
                        <OpenRewritePostButton
                          disabled={isMockDataMode()}
                          stopRowClick={false}
                          className="w-full max-w-[200px] sm:w-auto"
                          onOpen={() => {
                            setRewriteAnchor(d);
                            setRewriteModalOpen(true);
                          }}
                        />
                        {d.url ? (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200/85 bg-white px-2 py-1.5 text-[12px] font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                          >
                            Open
                            <ExternalLink className="size-3.5" strokeWidth={1.75} />
                          </a>
                        ) : (
                          <span className="text-[12px] text-zinc-300">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {rewriteAnchor ? (
        <RewritePostModal
          open={rewriteModalOpen}
          onOpenChange={(o) => {
            setRewriteModalOpen(o);
            if (!o) setRewriteAnchor(null);
          }}
          entry={rewriteAnchor}
          isPro={isPro}
          mockReadOnly={isMockDataMode()}
          onApplied={() => {
            router.refresh();
          }}
        />
      ) : null}

      {followUpAnchor ? (
        <>
          <GenerateFollowUpModal
            open={followUpModalOpen}
            onOpenChange={setFollowUpModalOpen}
            entry={followUpAnchor}
            projectName={project.name}
            isPro={isPro}
            onUseIdea={(idea) => {
              setFollowUpLogPrefill({
                title: idea.title,
                notes: idea.body,
              });
              setFollowUpModalOpen(false);
              setFollowUpLogOpen(true);
            }}
          />
          <LogEventDialog
            open={followUpLogOpen}
            onOpenChange={setFollowUpLogOpen}
            projectId={project.id}
            projects={[project]}
            defaultEventType="distribution"
            defaultDistributionPlatform={followUpAnchor.platform}
            distributionPrefill={followUpLogPrefill}
          />
        </>
      ) : null}
    </div>
  );
}

function TimelineFeedCard({
  entry,
  mockReadOnly = false,
  onUpdated,
}: {
  entry: TimelineRow;
  mockReadOnly?: boolean;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const presentation = getTimelineCardPresentation(entry);
  const BadgeIcon = presentation.Icon;

  if (editing) {
    return (
      <article
        className={presentationShellClass(presentation, "p-5 sm:p-6")}
      >
        <TimelineEntryEditForm
          entry={entry}
          disabled={mockReadOnly}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            toast.success("Timeline updated");
            setEditing(false);
            onUpdated();
          }}
          onDeleted={() => {
            setEditing(false);
            onUpdated();
          }}
        />
      </article>
    );
  }
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);

  const financialTitle =
    entry.type === "cost" && entry.amount != null
      ? `💸 ${formatMoney(entry.amount)} — ${entry.category ?? "Cost"}`
      : entry.type === "revenue" && entry.amount != null
        ? `💰 ${formatMoney(entry.amount)} — ${entry.revenue_source ?? "Revenue"}`
        : entry.type === "deal" && entry.revenue_share_percentage != null
          ? `🤝 ${entry.revenue_share_percentage}% — ${entry.partner_name ?? "Partner"}`
          : entry.title;

  const displayTitle = entry.type === "work" ? entry.title : financialTitle;

  const primaryUrl =
    entry.external_url &&
    (entry.type === "link" ||
      entry.type === "distribution" ||
      entry.type === "experiment")
      ? entry.external_url
      : null;

  return (
    <article className={presentationShellClass(presentation)}>
      <div className="flex flex-col sm:flex-row">
        <div
          className={cn("hidden w-1 shrink-0 sm:block", presentation.accentBarClass)}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-5 sm:flex-row sm:gap-6 sm:p-6">
          {(entry.type === "snapshot" || entry.type === "build") &&
          entry.image_signed_url ? (
            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-[10px] bg-zinc-100 ring-1 ring-zinc-200/60 sm:aspect-square sm:max-w-[220px]">
              <Image
                src={entry.image_signed_url}
                alt={entry.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 220px"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-zinc-800 ring-1 ring-zinc-200/80 shadow-sm">
                <BadgeIcon className="size-3.5 shrink-0 text-zinc-600" strokeWidth={1.75} />
                {presentation.badgeLabel}
                {entry.type === "distribution" && entry.platform ? (
                  <span className="font-normal text-zinc-500">
                    · {DISTRIBUTION_PLATFORM_LABELS[entry.platform]}
                    {entry.platform === "reddit" && entry.subreddit?.trim() ? (
                      <> · r/{entry.subreddit.trim()}</>
                    ) : null}
                  </span>
                ) : null}
              </span>
              <span className="text-[12px] font-medium tabular-nums text-zinc-400">
                {format(new Date(entry.entry_date), "MMM d, yyyy")}
              </span>
            </div>
            <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-zinc-900">
              {displayTitle}
            </h3>
            {entry.description ? (
              <p
                className={cn(
                  "whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-600",
                  entry.type === "work" && "font-medium text-zinc-700"
                )}
              >
                {entry.description}
              </p>
            ) : null}
            {entry.type === "distribution" ? (
              (() => {
                const m = parseDistributionMetrics(
                  (entry.metrics as Record<string, unknown> | null) ?? null
                );
                const bits: string[] = [];
                if (typeof m.views === "number") {
                  bits.push(`${timelineMetricFormatter.format(m.views)} views`);
                }
                if (typeof m.comments === "number") {
                  bits.push(`${timelineMetricFormatter.format(m.comments)} comments`);
                }
                return bits.length ? (
                  <p className="text-[13px] tabular-nums text-zinc-600">{bits.join(" · ")}</p>
                ) : null;
              })()
            ) : null}
            {primaryUrl ? (
              <>
                <Separator className="my-1 bg-zinc-100" />
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 break-all text-[13px] font-semibold text-zinc-900 underline-offset-4 hover:underline"
                >
                  {primaryUrl}
                  <ExternalLink className="size-3.5 shrink-0" strokeWidth={1.75} />
                </a>
              </>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <DeleteTimelineEntryDialog
                entryId={entry.id}
                projectId={entry.project_id}
                previewTitle={displayTitle}
                disabled={mockReadOnly}
                onDeleted={onUpdated}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg text-[12px]"
                disabled={mockReadOnly}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
