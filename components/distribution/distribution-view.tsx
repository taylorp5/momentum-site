"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Edit2, ExternalLink, Filter, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getContentGroupAction } from "@/app/actions/content-groups";
import { deleteDistributionEntryAction } from "@/app/actions/distribution";
import { usePlan } from "@/components/billing/plan-context";
import { AddDistributionDialog } from "@/components/distribution/add-distribution-dialog";
import { CrossPostComparisonSection } from "@/components/distribution/cross-post-comparison-section";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
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
import { PageHeader } from "@/components/dashboard/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { metricsPreview, parseDistributionMetrics } from "@/lib/distribution-metrics";
import { isMockDataMode } from "@/lib/env";
import {
  FREE_HISTORY_DAY_SPAN,
  freeHistoryDateFromInclusive,
  utcTodayIsoDate,
} from "@/lib/plan-history";
import { cn } from "@/lib/utils";
import { PLATFORM_ORDER } from "@/lib/platform-config";
import type { CrossPostGroupComparison } from "@/lib/data/distribution";
import type {
  DistributionAttachment,
  DistributionEntry,
  DistributionMetrics,
  DistributionPlatform,
  Project,
} from "@/types/momentum";

type DistributionViewProps = {
  isPro: boolean;
  projects: Project[];
  entries: DistributionEntry[];
  /** Sum of revenue amounts linked to each distribution entry id. */
  revenueByDistributionId: Record<string, number>;
  crossPostComparisons: CrossPostGroupComparison[];
  /** Current `q` search param applied on the server (after debounce lands in URL). */
  appliedSearch: string;
  appliedDateFrom: string;
  appliedDateTo: string;
  hasActiveFilters: boolean;
};

function buildQueryString(updates: {
  project?: string;
  platform?: string;
  q?: string | null;
  from?: string | null;
  to?: string | null;
}) {
  const params = new URLSearchParams();
  if (updates.project && updates.project !== "all") {
    params.set("project", updates.project);
  }
  if (updates.platform && updates.platform !== "all") {
    params.set("platform", updates.platform);
  }
  if (updates.q && updates.q.trim()) {
    params.set("q", updates.q.trim());
  }
  if (updates.from && updates.from.trim()) params.set("from", updates.from);
  if (updates.to && updates.to.trim()) params.set("to", updates.to);
  return params.toString();
}

export function DistributionView({
  isPro,
  projects,
  entries,
  revenueByDistributionId,
  crossPostComparisons,
  appliedSearch,
  appliedDateFrom,
  appliedDateTo,
  hasActiveFilters,
}: DistributionViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { openUpgrade } = usePlan();

  const platforms = PLATFORM_ORDER;

  const rawProject = searchParams.get("project") ?? "all";
  const projectId =
    rawProject === "all" || projects.some((p) => p.id === rawProject)
      ? rawProject
      : "all";

  const rawPlatform = searchParams.get("platform") ?? "all";
  const platform = (
    rawPlatform === "all" || platforms.includes(rawPlatform as DistributionPlatform)
      ? rawPlatform
      : "all"
  ) as DistributionPlatform | "all";

  const [searchDraft, setSearchDraft] = useState(appliedSearch);
  const [fromDate, setFromDate] = useState(appliedDateFrom);
  const [toDate, setToDate] = useState(appliedDateTo);
  const [rows, setRows] = useState(entries);
  const [editing, setEditing] = useState<DistributionEntry | null>(null);
  const [editingGroupDescription, setEditingGroupDescription] = useState<
    string | null
  >(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const editingBundle = useMemo(() => {
    if (!editing) return [];
    if (!editing.content_group_id) return [editing];
    return rows.filter(
      (r) =>
        r.content_group_id === editing.content_group_id &&
        r.project_id === editing.project_id
    );
  }, [editing, rows]);

  useEffect(() => {
    if (!editing?.content_group_id) {
      setEditingGroupDescription(null);
      return;
    }
    let cancelled = false;
    void getContentGroupAction(editing.content_group_id).then((res) => {
      if (cancelled) return;
      if ("success" in res && res.success) {
        setEditingGroupDescription(res.description);
      } else {
        setEditingGroupDescription(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editing?.content_group_id, editing?.id]);

  useEffect(() => {
    setSearchDraft(appliedSearch);
  }, [appliedSearch]);
  useEffect(() => {
    setFromDate(appliedDateFrom);
    setToDate(appliedDateTo);
  }, [appliedDateFrom, appliedDateTo]);
  useEffect(() => {
    setRows(entries);
  }, [entries]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!followUpModalOpen && !followUpLogOpen) {
      setFollowUpAnchor(null);
      setFollowUpLogPrefill(null);
    }
  }, [followUpModalOpen, followUpLogOpen]);

  const nameByProject = new Map(projects.map((p) => [p.id, p.name]));

  const defaultProjectId = projects[0]?.id;

  const freeDateMin = isPro ? undefined : freeHistoryDateFromInclusive();
  const freeDateMax = isPro ? undefined : utcTodayIsoDate();

  function pushQuery(next: {
    project?: string;
    platform?: string;
    q?: string;
    from?: string | null;
    to?: string | null;
  }) {
    const qs = buildQueryString({
      project: next.project ?? projectId,
      platform: next.platform ?? platform,
      q: next.q !== undefined ? next.q : searchDraft,
      from: next.from !== undefined ? next.from : fromDate,
      to: next.to !== undefined ? next.to : toDate,
    });
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function onSearchChange(value: string) {
    setSearchDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushQuery({ q: value });
    }, 400);
  }

  function onDateChange(nextFrom: string, nextTo: string) {
    setFromDate(nextFrom);
    setToDate(nextTo);
    pushQuery({ from: nextFrom || null, to: nextTo || null });
  }

  async function onDelete(entry: DistributionEntry) {
    const previous = rows;
    setRows((r) => r.filter((x) => x.id !== entry.id));
    const res = await deleteDistributionEntryAction({
      id: entry.id,
      project_id: entry.project_id,
    });
    if ("error" in res) {
      setRows(previous);
      toast.error(res.error);
      return;
    }
    toast.success("Distribution logged removed");
    router.refresh();
  }

  const globalEmpty = rows.length === 0 && !hasActiveFilters;
  const filteredEmpty = rows.length === 0 && hasActiveFilters;
  const topPostId =
    rows.length > 1
      ? [...rows]
          .sort((a, b) => {
            const av = parseDistributionMetrics(
              (a.metrics as Record<string, unknown> | null) ?? null
            ).views ?? 0;
            const bv = parseDistributionMetrics(
              (b.metrics as Record<string, unknown> | null) ?? null
            ).views ?? 0;
            return bv - av;
          })[0]?.id
      : null;

  return (
    <div className="relative space-y-7">
      {pending ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-white/40 pt-32 backdrop-blur-[1px]"
          aria-busy="true"
          aria-label="Loading results"
        >
          <Loader2 className="size-8 animate-spin text-zinc-400" />
        </div>
      ) : null}

      <PageHeader
        eyebrow="Growth"
        title="Distribution"
        description="One ledger for every post and launch â€” filter by project and channel, then lean into what works."
        action={
          projects.length > 0 ? (
            <AddDistributionDialog projects={projects}>
              <Button
                size="lg"
                className="h-9 rounded-lg px-4 text-[13px] font-semibold"
                disabled={isMockDataMode()}
              >
                Log distribution
              </Button>
            </AddDistributionDialog>
          ) : null
        }
      />

      {isMockDataMode() ? (
        <Card className="rounded-xl border-amber-200/80 bg-amber-50/90 shadow-none">
          <CardContent className="py-3.5 text-[13px] leading-relaxed text-amber-950">
            Demo mode is read-only for writes. Disable mock data to log real
            posts.
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-[11px] border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.035)] ring-0">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3.5 rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Input
                value={searchDraft}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search title, notes, URLâ€¦"
                className="h-10 rounded-lg border-zinc-200/85 bg-white pr-3 pl-3 text-[13px] text-zinc-800 placeholder:text-zinc-400/85"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400 sm:mr-0.5">
                <Filter className="size-3.5" strokeWidth={1.5} />
                Filters
              </div>
              <Select
                value={projectId}
                onValueChange={(v) => pushQuery({ project: v ?? "all" })}
              >
                <SelectTrigger className="h-10 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[196px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={platform}
                onValueChange={(v) =>
                  pushQuery({ platform: (v ?? "all") as DistributionPlatform | "all" })
                }
              >
                <SelectTrigger className="h-10 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[196px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="inline-flex items-center gap-2">
                        <PlatformIcon platform={p} className="size-3.5 text-zinc-500" />
                        {DISTRIBUTION_PLATFORM_LABELS[p]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={fromDate}
                min={freeDateMin}
                max={freeDateMax}
                onChange={(e) => onDateChange(e.target.value, toDate)}
                className="h-10 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[154px]"
                aria-label="From date"
              />
              <Input
                type="date"
                value={toDate}
                min={freeDateMin}
                max={freeDateMax}
                onChange={(e) => onDateChange(fromDate, e.target.value)}
                className="h-10 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[154px]"
                aria-label="To date"
              />
            </div>
          </div>
          {!isPro ? (
            <p className="text-[12px] leading-relaxed text-zinc-500">
              Free plan loads the last {FREE_HISTORY_DAY_SPAN} days of distribution history.{" "}
              <button
                type="button"
                className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
                onClick={() => openUpgrade()}
              >
                Upgrade to Pro
              </button>{" "}
              for full history and open-ended date filters.
            </p>
          ) : null}

          {globalEmpty || filteredEmpty ? (
            <div className="rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/60 px-5 py-10 text-center">
              <p className="text-[22px] font-semibold tracking-tight text-zinc-900">
                {globalEmpty ? "No distribution yet" : "No matches"}
              </p>
              <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-zinc-600">
                {globalEmpty
                  ? "Start sharing your project to see what gets traction."
                  : "No posts match these filters. Try widening project, platform, or date range."}
              </p>
              {globalEmpty ? (
                <p className="mt-1 text-[13px] text-zinc-500">
                  Try Reddit, TikTok, or X to get initial feedback.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {defaultProjectId && globalEmpty ? (
                  <AddDistributionDialog projectId={defaultProjectId} projects={projects}>
                    <Button size="lg" className="h-10 rounded-lg" disabled={isMockDataMode()}>
                      Log your first post
                    </Button>
                  </AddDistributionDialog>
                ) : null}
                {globalEmpty && !defaultProjectId ? (
                  <Link
                    href="/projects"
                    className={cn(buttonVariants({ variant: "outline" }), "rounded-lg")}
                  >
                    Create a project first
                  </Link>
                ) : null}
              </div>
              {globalEmpty && isMockDataMode() ? (
                <p className="mt-3 text-[12px] text-zinc-500">
                  Preview mode is read-only. Turn off mock data to log real posts.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200/85">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200/80 hover:bg-transparent">
                    <TableHead className="h-10 whitespace-nowrap bg-zinc-50/95 px-3.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Date
                    </TableHead>
                    <TableHead className="h-10 bg-zinc-50/95 px-3.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Project
                    </TableHead>
                    <TableHead className="h-10 bg-zinc-50/95 px-3.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Platform
                    </TableHead>
                    <TableHead className="min-w-[180px] h-10 bg-zinc-50/95 px-3.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Post
                    </TableHead>
                    <TableHead className="h-10 min-w-[260px] w-[280px] bg-zinc-50/95 px-3.5 text-right text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => {
                    const posted = new Date(`${e.date_posted}T12:00:00`);
                    const metrics = parseDistributionMetrics(
                      (e.metrics as Record<string, unknown> | null) ?? null
                    );
                    const views = metrics.views ?? 0;
                    const isTopPost = topPostId != null && e.id === topPostId && views > 0;
                    return (
                      <TableRow
                        key={e.id}
                        className={cn(
                          "group cursor-pointer border-zinc-100 transition-colors hover:bg-zinc-50/80",
                          isTopPost && "bg-amber-50/45 hover:bg-amber-50/60"
                        )}
                        onClick={() => setEditing(e)}
                      >
                        <TableCell className="align-top px-3.5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-semibold tabular-nums text-zinc-950">
                              {format(posted, "MMM d, yyyy")}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {formatDistanceToNow(posted, { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top px-3.5 py-4">
                          <Link
                            href={`/projects/${e.project_id}?tab=distribution`}
                            className="text-[13px] font-semibold text-zinc-950 underline-offset-2 hover:underline"
                          >
                            {nameByProject.get(e.project_id) ?? "Project"}
                          </Link>
                        </TableCell>
                        <TableCell className="align-top px-3.5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
                              <PlatformIcon platform={e.platform} className="size-3.5 text-zinc-700" />
                              {DISTRIBUTION_PLATFORM_LABELS[e.platform]}
                            </span>
                            {e.platform === "reddit" && e.subreddit ? (
                              <span className="text-[11px] text-zinc-500">r/{e.subreddit}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 max-w-[min(100vw-12rem,340px)] align-top px-3.5 py-4 sm:max-w-[380px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <span
                              className="text-[15px] font-semibold leading-snug tracking-tight text-zinc-950"
                              title={e.title?.trim() || "Untitled post"}
                            >
                              {e.title?.trim() || "Untitled post"}
                              </span>
                              {isTopPost ? (
                                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                  Top post
                                </span>
                              ) : null}
                            </div>
                            {e.notes?.trim() ? (
                              <span className="line-clamp-2 text-[12px] leading-relaxed text-zinc-500">
                                {e.notes}
                              </span>
                            ) : (
                              <span className="text-[12px] italic text-zinc-400">
                                Add notes next time â€” future you will want context.
                              </span>
                            )}
                            <div className="mt-0.5 inline-flex items-baseline gap-1.5">
                              <span className="text-[17px] font-semibold tabular-nums text-zinc-900">
                                {views.toLocaleString()}
                              </span>
                              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                views
                              </span>
                            </div>
                            {metricsPreview(e.metrics) && metricsPreview(e.metrics) !== `${views} views` ? (
                              <span className="text-[11px] font-medium text-zinc-500/95">
                                {metricsPreview(e.metrics)}
                              </span>
                            ) : null}
                            <DistributionPostRoiFooter
                              isPro={isPro}
                              attributedRevenue={revenueByDistributionId[e.id] ?? 0}
                              promoSpend={parseDistributionMetrics(
                                (e.metrics as Record<string, unknown> | null) ?? null
                              ).promo_spend}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="align-top px-3.5 py-4">
                          <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                            <OpenDistributionFollowUpButton
                              disabled={isMockDataMode()}
                              className="shrink-0 border-zinc-200/90 bg-white"
                              onOpen={() => {
                                setFollowUpAnchor(e);
                                setFollowUpModalOpen(true);
                              }}
                            />
                            <OpenRewritePostButton
                              disabled={isMockDataMode()}
                              className="shrink-0 border-zinc-200/90 bg-white"
                              onOpen={() => {
                                setRewriteAnchor(e);
                                setRewriteModalOpen(true);
                              }}
                            />
                            {e.url ? (
                              <a
                                href={e.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-md border border-zinc-200/90 bg-white p-1.5 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                                title="Open link"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <ExternalLink className="size-3.5" strokeWidth={1.75} />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-md border border-zinc-200/90 bg-white p-1.5 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditing(e);
                              }}
                              title="Edit"
                            >
                              <Edit2 className="size-3.5" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-md border border-zinc-200/90 bg-white p-1.5 text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onDelete(e);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.75} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CrossPostComparisonSection
        isPro={isPro}
        comparisons={crossPostComparisons}
        projectNameById={nameByProject}
      />

      {followUpAnchor ? (
        <>
          <GenerateFollowUpModal
            open={followUpModalOpen}
            onOpenChange={setFollowUpModalOpen}
            entry={followUpAnchor}
            projectName={
              nameByProject.get(followUpAnchor.project_id) ?? "Project"
            }
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
            projectId={followUpAnchor.project_id}
            projects={projects}
            defaultEventType="distribution"
            defaultDistributionPlatform={followUpAnchor.platform}
            distributionPrefill={followUpLogPrefill}
          />
        </>
      ) : null}
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
          onApplied={(updated) => {
            setRows((current) =>
              current.map((r) => (r.id === updated.id ? updated : r))
            );
            router.refresh();
          }}
        />
      ) : null}
      <LogEventDialog
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        defaultEventType="distribution"
        projectId={editing?.project_id}
        projects={projects}
        distributionEdit={
          editing
            ? {
                anchorTimelineId: editing.id,
                bundle: editingBundle,
                groupDescription: editingGroupDescription,
              }
            : undefined
        }
        distributionAttachmentsReadOnly={isMockDataMode()}
      />
    </div>
  );
}
