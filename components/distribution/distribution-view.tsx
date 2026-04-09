 "use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Edit2, ExternalLink, Filter, Loader2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { listContentGroupsAction } from "@/app/actions/content-groups";
import {
  applyExtractedMetricsToEntryAction,
  createDistributionAttachmentAction,
  deleteDistributionAttachmentAction,
  deleteDistributionEntryAction,
  listDistributionAttachmentsAction,
  runDistributionAttachmentExtractionAction,
  updateDistributionEntryAction,
} from "@/app/actions/distribution";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import {
  DISTRIBUTION_ATTACHMENT_ACCEPT,
  DISTRIBUTION_ATTACHMENT_MAX_BYTES,
  DISTRIBUTION_ATTACHMENTS_BUCKET,
} from "@/lib/constants";
import { metricsPreview, parseDistributionMetrics } from "@/lib/distribution-metrics";
import { isMockDataMode } from "@/lib/env";
import {
  FREE_HISTORY_DAY_SPAN,
  freeHistoryDateFromInclusive,
  utcTodayIsoDate,
} from "@/lib/plan-history";
import { createClient } from "@/lib/supabase/client";
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
  const [savingEdit, setSavingEdit] = useState(false);
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

  async function onSaveEdit(updated: DistributionEntry) {
    setSavingEdit(true);
    try {
      const res = await updateDistributionEntryAction({
        id: updated.id,
        project_id: updated.project_id,
        platform: updated.platform,
        title: updated.title ?? "",
        url: updated.url,
        notes: updated.notes,
        date_posted: updated.date_posted,
        subreddit: updated.subreddit,
        content_group_id: updated.content_group_id,
        metrics: parseDistributionMetrics(
          (updated.metrics as Record<string, unknown> | null) ?? null
        ),
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setRows((current) =>
        current.map((r) => (r.id === updated.id ? updated : r))
      );
      setEditing(null);
      toast.success("Distribution updated");
      router.refresh();
    } finally {
      setSavingEdit(false);
    }
  }

  const globalEmpty = rows.length === 0 && !hasActiveFilters;
  const filteredEmpty = rows.length === 0 && hasActiveFilters;

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
        description="One ledger for every post and launch — filter by project and channel, then lean into what works."
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
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Input
                value={searchDraft}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search title, notes, URL…"
                className="h-9 rounded-lg border-zinc-200/85 bg-white pr-3 pl-3 text-[13px] text-zinc-800 placeholder:text-zinc-400/85"
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
                <SelectTrigger className="h-9 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[196px]">
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
                <SelectTrigger className="h-9 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[196px]">
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
                className="h-9 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[154px]"
                aria-label="From date"
              />
              <Input
                type="date"
                value={toDate}
                min={freeDateMin}
                max={freeDateMax}
                onChange={(e) => onDateChange(fromDate, e.target.value)}
                className="h-9 w-full rounded-lg border-zinc-200/85 bg-white text-[13px] sm:w-[154px]"
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
            <div className="overflow-hidden rounded-lg border border-zinc-200/85">
              <div className="grid grid-cols-[140px_160px_minmax(220px,1fr)_120px] gap-0 border-b border-zinc-200/80 bg-zinc-50/95 px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                <span>Date</span>
                <span>Platform</span>
                <span>Post</span>
                <span className="text-right">Link</span>
              </div>
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="grid grid-cols-[140px_160px_minmax(220px,1fr)_120px] items-center gap-0 border-b border-zinc-100/80 px-3.5 py-3"
                >
                  <span className="h-3 w-20 rounded bg-zinc-200/70" />
                  <span className="h-3 w-24 rounded bg-zinc-200/70" />
                  <span className="h-3 w-44 rounded bg-zinc-200/70" />
                  <span className="ml-auto h-3 w-12 rounded bg-zinc-200/70" />
                </div>
              ))}
              <div className="px-4 py-4">
                <p className="text-[14px] font-semibold text-zinc-900">
                  {globalEmpty ? "No distribution yet" : "No matches"}
                </p>
                <p className="mt-1 text-[13px] text-zinc-600">
                  {globalEmpty
                    ? "Start by logging your first distribution attempt."
                    : "Nothing fits these filters. Widen project or platform, or clear search."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {defaultProjectId && globalEmpty ? (
                    <AddDistributionDialog
                      projectId={defaultProjectId}
                      projects={projects}
                    >
                      <Button
                        size="lg"
                        className="h-9 rounded-lg"
                        disabled={isMockDataMode()}
                      >
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
                    return (
                      <TableRow
                        key={e.id}
                        className="group cursor-pointer border-zinc-100 transition-colors hover:bg-zinc-50/70"
                        onClick={() => setEditing(e)}
                      >
                        <TableCell className="align-top px-3.5 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-semibold tabular-nums text-zinc-950">
                              {format(posted, "MMM d, yyyy")}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {formatDistanceToNow(posted, { addSuffix: true })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top px-3.5 py-3.5">
                          <Link
                            href={`/projects/${e.project_id}?tab=distribution`}
                            className="text-[13px] font-semibold text-zinc-950 underline-offset-2 hover:underline"
                          >
                            {nameByProject.get(e.project_id) ?? "Project"}
                          </Link>
                        </TableCell>
                        <TableCell className="align-top px-3.5 py-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-700">
                              <PlatformIcon platform={e.platform} className="size-3.5" />
                              {DISTRIBUTION_PLATFORM_LABELS[e.platform]}
                            </span>
                            {e.platform === "reddit" && e.subreddit ? (
                              <span className="text-[11px] text-zinc-500">r/{e.subreddit}</span>
                            ) : null}
                            {e.content_group_id ? (
                              <a
                                href="#cross-post-comparisons"
                                className="w-fit text-[10px] font-medium text-blue-700 underline-offset-2 hover:underline"
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                Cross-post group
                              </a>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 max-w-[min(100vw-12rem,320px)] align-top px-3.5 py-3.5 sm:max-w-[360px]">
                          <div className="flex flex-col gap-1">
                            <span
                              className="text-[13px] font-semibold leading-snug text-zinc-950"
                              title={e.title?.trim() || "Untitled post"}
                            >
                              {e.title?.trim() || "Untitled post"}
                            </span>
                            {e.notes?.trim() ? (
                              <span className="line-clamp-2 text-[12px] leading-relaxed text-zinc-500">
                                {e.notes}
                              </span>
                            ) : (
                              <span className="text-[12px] italic text-zinc-400">
                                Add notes next time — future you will want context.
                              </span>
                            )}
                            {metricsPreview(e.metrics) ? (
                              <span className="text-[11px] font-medium text-zinc-500/95">
                                {metricsPreview(e.metrics)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-400">
                                Add metrics
                              </span>
                            )}
                            <DistributionPostRoiFooter
                              isPro={isPro}
                              attributedRevenue={revenueByDistributionId[e.id] ?? 0}
                              promoSpend={parseDistributionMetrics(
                                (e.metrics as Record<string, unknown> | null) ?? null
                              ).promo_spend}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="align-top px-3.5 py-3.5">
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
      <EditDistributionDialog
        isPro={isPro}
        projects={projects}
        entry={editing}
        onClose={() => setEditing(null)}
        onSave={onSaveEdit}
        saving={savingEdit}
        onMetricsApplied={(updated) => {
          setRows((r) => r.map((x) => (x.id === updated.id ? updated : x)));
          setEditing(updated);
        }}
      />
    </div>
  );
}

function EditDistributionDialog({
  isPro,
  entry,
  projects,
  onClose,
  onSave,
  saving,
  onMetricsApplied,
}: {
  isPro: boolean;
  entry: DistributionEntry | null;
  projects: Project[];
  onClose: () => void;
  onSave: (entry: DistributionEntry) => Promise<void>;
  saving: boolean;
  onMetricsApplied?: (entry: DistributionEntry) => void;
}) {
  const { openUpgrade } = usePlan();
  const [contentGroupOptions, setContentGroupOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [draft, setDraft] = useState<DistributionEntry | null>(entry);
  const [attachments, setAttachments] = useState<
    Array<DistributionAttachment & { signed_url: string }>
  >([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(
    null
  );
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [runningExtractionId, setRunningExtractionId] = useState<string | null>(null);
  const [dismissingReviewIds, setDismissingReviewIds] = useState<string[]>([]);
  useEffect(() => setDraft(entry), [entry]);
  useEffect(() => {
    if (!entry || !isPro) {
      setContentGroupOptions([]);
      return;
    }
    let cancelled = false;
    void listContentGroupsAction().then((res) => {
      if (cancelled) return;
      if ("success" in res && res.success) {
        setContentGroupOptions(res.groups);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [entry, isPro]);
  useEffect(() => {
    setDismissingReviewIds([]);
  }, [entry?.id]);
  useEffect(() => {
    if (!entry) {
      setAttachments([]);
      return;
    }
    let cancelled = false;
    setLoadingAttachments(true);
    void listDistributionAttachmentsAction({
      timeline_entry_id: entry.id,
    }).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setAttachments([]);
        toast.error(res.error);
      } else {
        setAttachments(res.attachments);
      }
      setLoadingAttachments(false);
    });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const platforms = PLATFORM_ORDER;

  if (!draft) return null;
  const selectedProject = projects.find((p) => p.id === draft.project_id);

  const metrics = parseDistributionMetrics(
    (draft.metrics as Record<string, unknown> | null) ?? null
  );

  const hasExistingMetrics = Boolean(
    metrics.views ?? metrics.likes ?? metrics.comments
  );

  function setMetricField<K extends keyof DistributionMetrics>(
    key: K,
    value: DistributionMetrics[K]
  ) {
    setDraft((current) => {
      if (!current) return current;
      const next: DistributionMetrics = {
        ...parseDistributionMetrics(
          (current.metrics as Record<string, unknown> | null) ?? null
        ),
      };
      if (value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return { ...current, metrics: next };
    });
  }

  function toMetricNumber(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    const rounded = Math.floor(parsed);
    return rounded >= 0 ? rounded : undefined;
  }

  function toPromoSpend(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const n = Number(value.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0) return undefined;
    return Math.round(n * 100) / 100;
  }

  async function onUploadAttachment(file: File | null) {
    if (!file || !entry) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > DISTRIBUTION_ATTACHMENT_MAX_BYTES) {
      toast.error(
        `Image must be under ${Math.round(DISTRIBUTION_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB.`
      );
      return;
    }

    setUploadingAttachment(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${entry.user_id}/${entry.project_id}/${entry.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(DISTRIBUTION_ATTACHMENTS_BUCKET)
        .upload(objectPath, file, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const createRes = await createDistributionAttachmentAction({
        timeline_entry_id: entry.id,
        image_url: objectPath,
        project_id: entry.project_id,
      });
      if (!("attachment_id" in createRes)) {
        toast.error(createRes.error);
        return;
      }

      const attachmentId = createRes.attachment_id;

      const refresh = await listDistributionAttachmentsAction({
        timeline_entry_id: entry.id,
      });
      if ("error" in refresh) {
        toast.error(refresh.error);
        return;
      }
      setAttachments(refresh.attachments);

      if (isPro) {
        setRunningExtractionId(attachmentId);
        const ext = await runDistributionAttachmentExtractionAction({
          attachment_id: attachmentId,
          timeline_entry_id: entry.id,
        });
        if ("error" in ext) {
          toast.error(ext.error);
        } else {
          const after = await listDistributionAttachmentsAction({
            timeline_entry_id: entry.id,
          });
          if (!("error" in after)) setAttachments(after.attachments);
        }
        setRunningExtractionId(null);
      }

      const { data: signed } = await supabase.storage
        .from(DISTRIBUTION_ATTACHMENTS_BUCKET)
        .createSignedUrl(objectPath, 60 * 60 * 24);
      if (!signed?.signedUrl) {
        toast.success("Screenshot saved. Refresh if preview is missing.");
      } else if (isPro) {
        toast.success("Screenshot attached");
      } else {
        toast.success(
          "Screenshot saved with this post. Upgrade to Pro for AI metric read."
        );
      }
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function onRetryExtraction(attachmentId: string) {
    if (!entry) return;
    if (!isPro) {
      openUpgrade();
      return;
    }
    setRunningExtractionId(attachmentId);
    try {
      const res = await runDistributionAttachmentExtractionAction({
        attachment_id: attachmentId,
        timeline_entry_id: entry.id,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const refreshed = await listDistributionAttachmentsAction({
        timeline_entry_id: entry.id,
      });
      if ("error" in refreshed) {
        toast.error(refreshed.error);
        return;
      }
      setAttachments(refreshed.attachments);
    } finally {
      setRunningExtractionId(null);
    }
  }

  async function onDeleteAttachment(
    item: DistributionAttachment & { signed_url: string }
  ) {
    if (!entry) return;
    setDeletingAttachmentId(item.id);
    try {
      const res = await deleteDistributionAttachmentAction({
        id: item.id,
        timeline_entry_id: item.timeline_entry_id,
        image_url: item.image_url,
        project_id: entry.project_id,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setAttachments((prev) => prev.filter((x) => x.id !== item.id));
      toast.success("Attachment removed");
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function onApplyDetectedMetrics(
    item: DistributionAttachment & { signed_url: string }
  ) {
    if (!entry) return;
    if (!isPro) {
      openUpgrade();
      return;
    }
    const res = await applyExtractedMetricsToEntryAction({
      attachment_id: item.id,
      timeline_entry_id: entry.id,
      project_id: entry.project_id,
    });
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    const nextMetrics = res.metrics;
    setDraft((current) =>
      current ? { ...current, metrics: nextMetrics } : current
    );
    onMetricsApplied?.({ ...entry, metrics: nextMetrics });
    toast.success("Metrics saved from this screenshot.");
  }

  function onEditFromDetected(item: DistributionAttachment & { signed_url: string }) {
    setDraft((current) => {
      if (!current) return current;
      const base = parseDistributionMetrics(
        (current.metrics as Record<string, unknown> | null) ?? null
      );
      return {
        ...current,
        metrics: {
          ...base,
          views: item.extracted_views ?? base.views,
          likes: item.extracted_likes ?? base.likes,
          comments: item.extracted_comments ?? base.comments,
        },
      };
    });
    toast.success("Detected values loaded. Review and save.");
  }

  return (
    <>
      <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-zinc-200 px-5 pt-5 pb-3">
          <DialogTitle>Post details</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-4">
          <section className="space-y-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              Post info
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-medium text-zinc-800">Platform</Label>
                <Select
                  value={draft.platform}
                  onValueChange={(v) =>
                    setDraft((d) =>
                      d ? { ...d, platform: v as DistributionPlatform } : d
                    )
                  }
                >
                  <SelectTrigger className="rounded-lg border-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>
              <div className="space-y-1.5">
                <Label className="font-medium text-zinc-800">Date posted</Label>
                <Input
                  type="date"
                  value={draft.date_posted}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, date_posted: e.target.value } : d))
                  }
                  className="rounded-lg border-zinc-200"
                />
              </div>
            </div>
            {draft.platform === "reddit" ? (
              <div className="space-y-1.5">
                <Label className="font-medium text-zinc-800">Subreddit (optional)</Label>
                <Input
                  value={draft.subreddit ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, subreddit: e.target.value.trim() || null } : d
                    )
                  }
                  placeholder="e.g. SaaS (no r/)"
                  className="rounded-lg border-zinc-200"
                />
              </div>
            ) : null}
            {isPro ? (
              <div className="space-y-1.5">
                <Label className="font-medium text-zinc-800">Cross-post group</Label>
                <Select
                  value={draft.content_group_id ?? "__none__"}
                  onValueChange={(v) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            content_group_id: v === "__none__" ? null : v,
                          }
                        : d
                    )
                  }
                >
                  <SelectTrigger className="rounded-lg border-zinc-200">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {contentGroupOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zinc-500">
                  Compare this post with other placements of the same idea.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500">
                <button
                  type="button"
                  className="font-medium text-zinc-700 underline-offset-2 hover:underline"
                  onClick={() => openUpgrade()}
                >
                  Upgrade to Pro
                </button>{" "}
                to link posts into cross-post groups.
              </p>
            )}
            <div className="space-y-1.5">
              <Label className="font-medium text-zinc-800">Project</Label>
              <Select
                value={draft.project_id}
                onValueChange={(v) =>
                  setDraft((d) => (d ? { ...d, project_id: v ?? d.project_id } : d))
                }
              >
                <SelectTrigger className="rounded-lg border-zinc-200">
                  <SelectValue placeholder="Choose project">
                    {selectedProject?.name ?? "Choose project"}
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
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-zinc-800">URL</Label>
              <Input
                value={draft.url}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, url: e.target.value } : d))
                }
                className="rounded-lg border-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-zinc-800">Title</Label>
              <Input
                value={draft.title ?? ""}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, title: e.target.value } : d))
                }
                className="rounded-lg border-zinc-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-zinc-800">Notes</Label>
              <Textarea
                value={draft.notes}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, notes: e.target.value } : d))
                }
                className="min-h-[84px] rounded-lg border-zinc-200"
              />
            </div>
          </section>

          <div className="border-t border-zinc-200/80" />

          <section className="space-y-3.5 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
              Performance
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-medium text-zinc-800">Views</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={metrics.views ?? ""}
                  onChange={(e) => setMetricField("views", toMetricNumber(e.target.value))}
                  className="rounded-lg border-zinc-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-medium text-zinc-800">Likes / upvotes</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={metrics.likes ?? ""}
                  onChange={(e) => setMetricField("likes", toMetricNumber(e.target.value))}
                  className="rounded-lg border-zinc-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-medium text-zinc-800">Comments</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={metrics.comments ?? ""}
                  onChange={(e) =>
                    setMetricField("comments", toMetricNumber(e.target.value))
                  }
                  className="rounded-lg border-zinc-200"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-zinc-800">
                Promo spend (optional)
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                value={metrics.promo_spend ?? ""}
                onChange={(e) =>
                  setMetricField("promo_spend", toPromoSpend(e.target.value))
                }
                className="rounded-lg border-zinc-200"
              />
              <p className="text-[10px] leading-relaxed text-zinc-500">
                Ad or boost spend for this post. Pro ROI compares linked revenue to this amount.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="font-medium text-zinc-800">
                Notes on performance
              </Label>
              <Textarea
                value={metrics.notes_on_performance ?? ""}
                onChange={(e) =>
                  setMetricField("notes_on_performance", e.target.value || undefined)
                }
                placeholder="Example: Did well in r/startups but flat elsewhere."
                className="min-h-[84px] rounded-lg border-zinc-200"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3.5 ring-1 ring-zinc-200/50">
              <div className="space-y-0.5">
                <p className="text-[12px] font-semibold text-zinc-900">
                  Analytics screenshots
                </p>
                <p className="text-[11px] leading-relaxed text-zinc-600">
                  Each upload stays paired with what we read from it — nothing disappears
                  into the background.
                </p>
                {!isPro ? (
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    Pro auto-reads views and engagement from screenshots; free stays manual.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-zinc-700">
                  Attach from Reddit, TikTok, or other platforms
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Label
                    htmlFor="distribution-attachment-file"
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[12px] font-medium text-zinc-700 shadow-sm hover:bg-zinc-50",
                      uploadingAttachment ? "pointer-events-none opacity-60" : ""
                    )}
                  >
                    <Upload className="size-3.5" />
                    {uploadingAttachment
                      ? "Uploading…"
                      : "Upload analytics screenshot"}
                  </Label>
                  <Input
                    id="distribution-attachment-file"
                    type="file"
                    accept={DISTRIBUTION_ATTACHMENT_ACCEPT}
                    className="hidden"
                    disabled={uploadingAttachment}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void onUploadAttachment(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>

              {uploadingAttachment ? (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[12px] text-zinc-600 shadow-sm">
                  <Loader2 className="size-4 shrink-0 animate-spin text-zinc-500" />
                  Uploading screenshot…
                </div>
              ) : null}

              {loadingAttachments ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white/80 px-3 py-3 text-[12px] text-zinc-600">
                  <Loader2 className="size-4 animate-spin text-zinc-400" />
                  Loading screenshots…
                </div>
              ) : attachments.length > 0 ? (
                <div className="space-y-4">
                  {attachments.map((item) => {
                    const dismissed = dismissingReviewIds.includes(item.id);
                    const isActivelyExtracting =
                      runningExtractionId === item.id ||
                      (isPro && item.extraction_status === "pending");
                    const isManualOnly =
                      item.extraction_status === "idle" ||
                      (!isPro && item.extraction_status === "pending");
                    const failed = item.extraction_status === "failed";
                    const completed = item.extraction_status === "completed";
                    const isMock =
                      item.extracted_payload &&
                      typeof item.extracted_payload === "object" &&
                      item.extracted_payload !== null &&
                      (item.extracted_payload as { strategy?: string }).strategy ===
                        "mock-v1";
                    const hasReadableMetrics =
                      completed &&
                      (item.extracted_views != null ||
                        item.extracted_likes != null ||
                        item.extracted_comments != null ||
                        Boolean(item.extracted_platform));
                    const emptySuccess = completed && !failed && !hasReadableMetrics;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow",
                          isActivelyExtracting
                            ? "border-zinc-400/70 ring-2 ring-zinc-300/40"
                            : "border-zinc-200/90"
                        )}
                      >
                        <div className="relative border-b border-zinc-100 bg-zinc-50/50 p-3">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              className="relative shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-200/60"
                              onClick={() => setExpandedImage(item.signed_url)}
                              title="Expand screenshot"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.signed_url}
                                alt="Performance screenshot"
                                className="h-[88px] w-[120px] object-cover"
                              />
                              {isActivelyExtracting ? (
                                <span className="absolute inset-0 flex items-center justify-center bg-white/75 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 backdrop-blur-[2px]">
                                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                                  Processing
                                </span>
                              ) : null}
                            </button>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[12px] font-semibold text-zinc-900">
                                Screenshot
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                Tap the image to enlarge. Results for this file appear
                                directly below.
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    isActivelyExtracting
                                      ? "bg-amber-100/90 text-amber-950"
                                      : isManualOnly
                                        ? "bg-sky-100/80 text-sky-950"
                                        : completed
                                          ? "bg-emerald-100/80 text-emerald-950"
                                          : failed || emptySuccess
                                            ? "bg-zinc-200/80 text-zinc-800"
                                            : "bg-zinc-100 text-zinc-700"
                                  )}
                                >
                                  {isActivelyExtracting
                                    ? "Reading screenshot…"
                                    : isManualOnly
                                      ? "Saved"
                                      : completed && hasReadableMetrics
                                        ? "Metrics detected"
                                        : failed || emptySuccess
                                          ? "Couldn’t read"
                                          : "Waiting"}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              title="Remove screenshot"
                              disabled={deletingAttachmentId === item.id}
                              onClick={() => void onDeleteAttachment(item)}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {!dismissed ? (
                          <div className="p-3">
                            <div
                              className={cn(
                                "rounded-lg border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                                isActivelyExtracting
                                  ? "border-amber-200/90 bg-amber-50/20"
                                  : "border-zinc-200/90"
                              )}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-600">
                                {isManualOnly ? "Screenshot on file" : "Detected from screenshot"}
                              </p>
                              <p className="mt-1 text-[11px] text-zinc-500">
                                {isManualOnly
                                  ? "Pro can auto-read metrics from images like this."
                                  : "Review before applying"}
                              </p>

                              {isActivelyExtracting ? (
                                <div className="mt-3 space-y-2 rounded-md border border-dashed border-zinc-300/90 bg-zinc-50/80 px-3 py-3">
                                  <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-800">
                                    <Loader2 className="size-4 animate-spin text-zinc-500" />
                                    Processing screenshot…
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-zinc-600">
                                    Extracting views, upvotes, and comments from this
                                    image. This usually takes a moment.
                                  </p>
                                </div>
                              ) : isManualOnly ? (
                                <div className="mt-3 space-y-3">
                                  <p className="text-[12px] leading-relaxed text-zinc-700">
                                    Your screenshot is saved with this post. Enter
                                    metrics above, or upgrade for automatic reads.
                                  </p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-md text-[12px]"
                                    onClick={openUpgrade}
                                  >
                                    Unlock with Pro
                                  </Button>
                                </div>
                              ) : failed || emptySuccess ? (
                                <div className="mt-3 space-y-3">
                                  <p className="text-[12px] leading-relaxed text-zinc-700">
                                    We couldn&apos;t confidently read this screenshot. You
                                    can still enter metrics manually above, or try again.
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-md text-[12px]"
                                    onClick={() => void onRetryExtraction(item.id)}
                                  >
                                    Retry
                                  </Button>
                                </div>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  <p className="text-[12px] text-zinc-700">
                                    {hasExistingMetrics
                                      ? "This screenshot suggests updated values. Current metrics are shown for comparison."
                                      : "Here’s what we found. Apply to save to this post, or edit the fields above first."}
                                  </p>
                                  {isMock ? (
                                    <p className="text-[11px] text-zinc-500">
                                      Preview extraction — confirm these numbers match
                                      your screenshot before applying.
                                    </p>
                                  ) : null}
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[12px]">
                                    <span className="text-zinc-500">Platform</span>
                                    <span className="font-medium text-zinc-900">
                                      {item.extracted_platform
                                        ? DISTRIBUTION_PLATFORM_LABELS[
                                            item.extracted_platform as DistributionPlatform
                                          ] ?? item.extracted_platform
                                        : "Not found"}
                                    </span>
                                    <span className="text-zinc-500">Views</span>
                                    <span className="font-medium text-zinc-900">
                                      {hasExistingMetrics && metrics.views !== undefined
                                        ? `${metrics.views} → ${item.extracted_views ?? "—"}`
                                        : (item.extracted_views ?? "Not found")}
                                    </span>
                                    <span className="text-zinc-500">Upvotes</span>
                                    <span className="font-medium text-zinc-900">
                                      {hasExistingMetrics && metrics.likes !== undefined
                                        ? `${metrics.likes} → ${item.extracted_likes ?? "—"}`
                                        : (item.extracted_likes ?? "Not found")}
                                    </span>
                                    <span className="text-zinc-500">Comments</span>
                                    <span className="font-medium text-zinc-900">
                                      {hasExistingMetrics &&
                                      metrics.comments !== undefined
                                        ? `${metrics.comments} → ${item.extracted_comments ?? "—"}`
                                        : (item.extracted_comments ?? "Not found")}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                                    <Button
                                      size="sm"
                                      className="h-8 rounded-md text-[12px]"
                                      onClick={() => void onApplyDetectedMetrics(item)}
                                    >
                                      Apply metrics
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-md text-[12px]"
                                      onClick={() => onEditFromDetected(item)}
                                    >
                                      Edit first
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-md text-[12px]"
                                      onClick={() => void onRetryExtraction(item.id)}
                                    >
                                      Retry
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 rounded-md text-[12px] text-zinc-600"
                                      onClick={() =>
                                        setDismissingReviewIds((prev) => [...prev, item.id])
                                      }
                                    >
                                      Dismiss
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/30 px-3 py-2.5">
                            <p className="text-[11px] text-zinc-500">
                              Detection summary hidden for this screenshot.
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 text-[12px] text-zinc-700"
                              onClick={() =>
                                setDismissingReviewIds((prev) =>
                                  prev.filter((id) => id !== item.id)
                                )
                              }
                            >
                              Show
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-300/90 bg-white/60 px-3 py-3 text-[12px] text-zinc-600">
                  No screenshots yet. Upload one to see detected metrics here.
                </p>
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <p className="col-span-2 text-[11px] text-zinc-500">
              Metrics are optional and can be updated anytime as results come in.
            </p>
          </div>
        </div>
        <DialogFooter className="shrink-0 -mx-0 -mb-0 rounded-none border-zinc-200 bg-zinc-50/70 px-5 py-3">
          <Button variant="outline" className="rounded-lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-lg"
            disabled={saving}
            onClick={() => void onSave(draft)}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(expandedImage)}
        onOpenChange={(open) => !open && setExpandedImage(null)}
      >
        <DialogContent className="rounded-2xl p-2 sm:max-w-3xl">
          {expandedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expandedImage}
              alt="Expanded performance screenshot"
              className="max-h-[78vh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
