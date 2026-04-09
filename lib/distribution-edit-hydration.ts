import { parseDistributionMetrics } from "@/lib/distribution-metrics";
import type {
  DistributionEntry,
  DistributionMetrics,
  DistributionPlatform,
} from "@/types/momentum";

export type HydratedPlatformRow = {
  /** Stable client id for React keys */
  id: string;
  timelineId: string;
  platform: DistributionPlatform;
  subreddit: string;
  url: string;
  views: string;
  notes: string;
  entry_date: string;
  persistedMetrics: DistributionMetrics;
};

export type HydratedDistributionEdit = {
  contentTitle: string;
  globalNotes: string;
  contentGroupId: string | null;
  platformRows: HydratedPlatformRow[];
};

function sortBundle(entries: DistributionEntry[]): DistributionEntry[] {
  return [...entries].sort((a, b) => {
    const da = a.date_posted.localeCompare(b.date_posted);
    if (da !== 0) return da;
    return a.created_at.localeCompare(b.created_at);
  });
}

/**
 * Maps DB distribution rows into the shared “content + platforms[]” edit shape.
 * When a content group has a description, it becomes global notes and row descriptions are per-platform.
 * Legacy single rows put all copy in global notes.
 */
export function hydrateDistributionEdit(
  bundle: DistributionEntry[],
  contentGroupDescription: string | null
): HydratedDistributionEdit {
  const sorted = sortBundle(bundle);
  if (sorted.length === 0) {
    return {
      contentTitle: "",
      globalNotes: "",
      contentGroupId: null,
      platformRows: [],
    };
  }

  const contentTitle = sorted[0]?.title?.trim() ?? "";
  const contentGroupId = sorted[0]?.content_group_id ?? null;
  const groupDesc = contentGroupDescription?.trim() ?? "";
  const hasExplicitGlobal = groupDesc.length > 0;

  let globalNotes: string;
  let useRowNotesAsPlatformOnly: boolean;

  if (hasExplicitGlobal) {
    globalNotes = contentGroupDescription ?? "";
    useRowNotesAsPlatformOnly = true;
  } else if (sorted.length === 1) {
    globalNotes = sorted[0].notes ?? "";
    useRowNotesAsPlatformOnly = false;
  } else {
    globalNotes = "";
    useRowNotesAsPlatformOnly = true;
  }

  const platformRows: HydratedPlatformRow[] = sorted.map((e) => {
    const m = parseDistributionMetrics(
      (e.metrics as Record<string, unknown> | null) ?? null
    );
    const rowNotes = e.notes ?? "";
    const platformNotes = useRowNotesAsPlatformOnly ? rowNotes : "";

    return {
      id: crypto.randomUUID(),
      timelineId: e.id,
      platform: e.platform,
      subreddit: e.subreddit ?? "",
      url: e.url ?? "",
      views: m.views !== undefined ? String(m.views) : "",
      notes: platformNotes,
      entry_date: e.date_posted,
      persistedMetrics: m,
    };
  });

  return {
    contentTitle,
    globalNotes,
    contentGroupId,
    platformRows,
  };
}

export function mergePlatformMetricsForSave(
  viewsInput: string,
  persisted?: DistributionMetrics
): DistributionMetrics | null {
  const base = parseDistributionMetrics(
    (persisted as Record<string, unknown> | undefined) ?? null
  );
  const raw = viewsInput.trim();
  if (raw === "") {
    delete base.views;
  } else {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) {
      base.views = n;
    } else {
      delete base.views;
    }
  }
  return Object.keys(base).length > 0 ? base : null;
}
