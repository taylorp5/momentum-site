"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Layers } from "lucide-react";
import { ProAnalyticsGate } from "@/components/billing/pro-analytics-gate";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import type { CrossPostGroupComparison } from "@/lib/data/distribution";
import type { DistributionEntry } from "@/types/momentum";
import { cn } from "@/lib/utils";

function viewsOf(e: DistributionEntry) {
  return e.metrics?.views ?? 0;
}

function commentsOf(e: DistributionEntry) {
  return e.metrics?.comments ?? 0;
}

function summarizeGroup(entries: DistributionEntry[]) {
  if (entries.length === 0) return null;
  let bestViews = entries[0]!;
  let bestSub: DistributionEntry | null = null;
  for (const e of entries) {
    if (viewsOf(e) > viewsOf(bestViews)) bestViews = e;
  }
  const redditRows = entries.filter((e) => e.platform === "reddit" && e.subreddit);
  for (const e of redditRows) {
    if (!bestSub || viewsOf(e) > viewsOf(bestSub)) bestSub = e;
  }
  const byPlatform = new Map<string, number>();
  for (const e of entries) {
    const k = DISTRIBUTION_PLATFORM_LABELS[e.platform];
    byPlatform.set(k, Math.max(byPlatform.get(k) ?? 0, viewsOf(e)));
  }
  let platformWinner = "";
  let platformMax = -1;
  for (const [k, v] of byPlatform) {
    if (v > platformMax) {
      platformMax = v;
      platformWinner = k;
    }
  }
  return {
    bestViewsEntry: bestViews,
    bestPlatformLabel: platformWinner,
    bestSubreddit: bestSub?.subreddit ?? null,
    maxViews: viewsOf(bestViews),
    maxCommentsEntry: entries.reduce((a, b) =>
      commentsOf(b) > commentsOf(a) ? b : a
    ),
  };
}

export function CrossPostComparisonSection({
  isPro,
  comparisons,
  projectNameById,
}: {
  isPro: boolean;
  comparisons: CrossPostGroupComparison[];
  projectNameById: Map<string, string>;
}) {
  if (comparisons.length === 0) return null;

  return (
    <section id="cross-post-comparisons" className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-2 border-b border-zinc-200/80 pb-2">
        <Layers className="size-4 text-zinc-500" strokeWidth={1.65} />
        <h2 className="text-[14px] font-semibold text-zinc-900">Cross-post comparison</h2>
      </div>
      <p className="text-[13px] leading-relaxed text-zinc-600">
        Same content idea across platforms and dates — see where it landed hardest (Pro).
      </p>

      <ProAnalyticsGate
        isPro={isPro}
        overlayTitle="Compare cross-posts"
        overlayDescription="Group the same idea across TikTok, Shorts, Reddit subs, and more — then see best platform, subreddit, and views."
        ctaLabel="Upgrade to Pro"
      >
        <div className="space-y-6">
          {comparisons.map(({ group, entries }) => {
            const s = summarizeGroup(entries);
            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/30 shadow-sm"
              >
                <div className="border-b border-zinc-200/70 bg-white/80 px-4 py-3">
                  <h3 className="text-[14px] font-semibold text-zinc-900">{group.title}</h3>
                  {group.description?.trim() ? (
                    <p className="mt-1 text-[12px] text-zinc-600">{group.description}</p>
                  ) : null}
                  {s ? (
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-zinc-600">
                      <li>
                        <span className="font-medium text-zinc-800">Best platform: </span>
                        {s.bestPlatformLabel || "—"}
                      </li>
                      <li>
                        <span className="font-medium text-zinc-800">Best subreddit: </span>
                        {s.bestSubreddit ? `r/${s.bestSubreddit}` : "—"}
                      </li>
                      <li>
                        <span className="font-medium text-zinc-800">Highest views: </span>
                        <span className="tabular-nums">{s.maxViews.toLocaleString()}</span>
                        {s.bestViewsEntry ? (
                          <span className="text-zinc-500">
                            {" "}
                            (
                            {DISTRIBUTION_PLATFORM_LABELS[s.bestViewsEntry.platform]}
                            {s.bestViewsEntry.subreddit
                              ? ` · r/${s.bestViewsEntry.subreddit}`
                              : ""}
                            )
                          </span>
                        ) : null}
                      </li>
                      <li>
                        <span className="font-medium text-zinc-800">Most comments: </span>
                        <span className="tabular-nums">
                          {commentsOf(s.maxCommentsEntry).toLocaleString()}
                        </span>
                      </li>
                    </ul>
                  ) : null}
                </div>
                <div className="overflow-x-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Platform / community
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Project
                        </TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Posted
                        </TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wide text-zinc-500">
                          Views
                        </TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wide text-zinc-500">
                          Comments
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => {
                        const d = new Date(`${e.date_posted}T12:00:00`);
                        const isTop =
                          s && viewsOf(e) === s.maxViews && s.maxViews > 0;
                        return (
                          <TableRow key={e.id} className="border-zinc-100">
                            <TableCell className="text-[13px]">
                              <span className="inline-flex items-center gap-1.5">
                                <PlatformIcon platform={e.platform} className="size-3.5" />
                                {DISTRIBUTION_PLATFORM_LABELS[e.platform]}
                                {e.subreddit ? (
                                  <span className="text-zinc-500">· r/{e.subreddit}</span>
                                ) : null}
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-zinc-700">
                              <Link
                                href={`/projects/${e.project_id}?tab=distribution`}
                                className="hover:underline"
                              >
                                {projectNameById.get(e.project_id) ?? "Project"}
                              </Link>
                            </TableCell>
                            <TableCell className="tabular-nums text-[13px] text-zinc-700">
                              {format(d, "MMM d, yyyy")}
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right text-[13px] font-medium tabular-nums",
                                isTop && "text-emerald-700"
                              )}
                            >
                              {viewsOf(e).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-[13px] tabular-nums text-zinc-700">
                              {commentsOf(e).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      </ProAnalyticsGate>
    </section>
  );
}
