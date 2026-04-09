import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuildProgressKind, LogEventInput } from "@/lib/validations/timeline";
import type {
  EntrySourceMetadata,
  EntrySourceType,
  TimelineEventFamily,
} from "@/types/momentum";

function eventSubtypeForBuildKind(kind: BuildProgressKind): string {
  switch (kind) {
    case "idea":
      return "build_idea";
    case "progress":
      return "build_note";
    case "milestone":
      return "build_milestone";
    case "shipped":
      return "ship_update";
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}

export type TimelineEntryProvenance = {
  source_type?: EntrySourceType;
  source_metadata?: EntrySourceMetadata;
};

function taxonomy(
  family: TimelineEventFamily,
  subtype: string,
  metadata: Record<string, unknown> = {}
) {
  return {
    event_family: family,
    event_subtype: subtype,
    event_metadata: metadata,
  };
}

function buildInsertRow(
  userId: string,
  data: LogEventInput,
  source_type: EntrySourceType,
  source_metadata: EntrySourceMetadata
) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);

  const nullDist = {
    platform: null as null,
    metrics: null as null,
    content_group_id: null as null,
    subreddit: null as null,
  };
  const nullFinancial = {
    amount: null as null,
    category: null as null,
    is_recurring: null as null,
    recurrence_label: null as null,
    revenue_source: null as null,
    partner_name: null as null,
    revenue_share_percentage: null as null,
    linked_distribution_entry_id: null as null,
  };

  switch (data.type) {
    case "distribution": {
      const sub =
        data.platform === "reddit" && data.subreddit?.trim()
          ? data.subreddit
              .trim()
              .replace(/^r\//i, "")
              .replace(/^\//, "")
              .slice(0, 120) || null
          : null;
      const meta: Record<string, unknown> = {};
      if (data.metrics) meta.metrics = data.metrics;
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "distribution" as const,
        title: data.title?.trim() || "Distribution post",
        description: data.notes,
        external_url: data.url,
        image_url: data.image_storage_path ?? null,
        entry_date: data.entry_date,
        platform: data.platform,
        metrics: data.metrics ?? null,
        content_group_id: data.content_group_id ?? null,
        subreddit: sub,
        ...nullFinancial,
        ...taxonomy(
          "distribution",
          data.content_group_id ? "cross_post" : "distribution_post",
          meta
        ),
        source_type,
        source_metadata,
      };
    }
    case "build": {
      const desc = data.description.trim();
      const rawTitle = data.title?.trim() ?? "";
      const title =
        rawTitle ||
        (() => {
          const first = desc.split("\n").find((l) => l.trim())?.trim() ?? desc;
          return first.length > 200 ? `${first.slice(0, 197)}…` : first;
        })();
      const sub = eventSubtypeForBuildKind(data.build_kind);
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "build" as const,
        title,
        description: desc,
        image_url: data.image_storage_path ?? null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        ...nullFinancial,
        ...taxonomy("build", sub, {}),
        source_type,
        source_metadata,
      };
    }
    case "insight":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "insight" as const,
        title: data.title,
        description: data.description,
        image_url: null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        ...nullFinancial,
        ...taxonomy("insight", "reflection", {}),
        source_type,
        source_metadata,
      };
    case "experiment":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "experiment" as const,
        title: data.title,
        description: data.description,
        image_url: null,
        external_url: data.external_url?.trim() || null,
        entry_date: data.entry_date,
        ...nullDist,
        ...nullFinancial,
        ...taxonomy("build", "experiment", {}),
        source_type,
        source_metadata,
      };
    case "cost": {
      const customTitle = data.title?.trim();
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "cost" as const,
        title: customTitle
          ? customTitle
          : `💸 ${formatMoney(data.amount)} — ${data.category}`,
        description: data.description,
        image_url: data.image_storage_path ?? null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        amount: data.amount,
        category: data.category,
        is_recurring: data.is_recurring ?? false,
        recurrence_label: data.is_recurring ? data.recurrence_label?.trim() || null : null,
        revenue_source: null,
        partner_name: null,
        revenue_share_percentage: null,
        linked_distribution_entry_id: null,
        ...taxonomy("financial", "cost", {
          category: data.category,
          amount: data.amount,
        }),
        source_type,
        source_metadata,
      };
    }
    case "revenue":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "revenue" as const,
        title: `💰 ${formatMoney(data.amount)} — ${data.source}`,
        description: data.description,
        image_url: data.image_storage_path ?? null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        amount: data.amount,
        category: null,
        is_recurring: null,
        recurrence_label: null,
        revenue_source: data.source,
        partner_name: null,
        revenue_share_percentage: null,
        linked_distribution_entry_id: data.linked_distribution_entry_id ?? null,
        ...taxonomy("financial", "revenue", {
          amount: data.amount,
          source: data.source,
        }),
        source_type,
        source_metadata,
      };
    case "deal":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "deal" as const,
        title: `🤝 ${data.revenue_share_percentage}% — ${data.partner_name}`,
        description: data.description,
        image_url: data.image_storage_path ?? null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        amount: null,
        category: null,
        is_recurring: null,
        recurrence_label: null,
        revenue_source: null,
        partner_name: data.partner_name,
        revenue_share_percentage: data.revenue_share_percentage,
        linked_distribution_entry_id: null,
        ...taxonomy("financial", "deal", {
          partner_name: data.partner_name,
          revenue_share_percentage: data.revenue_share_percentage,
        }),
        source_type,
        source_metadata,
      };
    case "snapshot":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "snapshot" as const,
        title: data.title,
        description: data.description,
        image_url: data.image_storage_path ?? null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        ...nullFinancial,
        ...taxonomy("asset", "screenshot", {}),
        source_type,
        source_metadata,
      };
    case "work":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "work" as const,
        title: data.title,
        description: data.description,
        image_url: null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        ...nullFinancial,
        ...taxonomy("work", data.work_session_kind, {
          duration_seconds: data.duration_seconds,
          work_session_source: data.work_session_kind,
        }),
        source_type,
        source_metadata,
      };
    case "note":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "note" as const,
        title: data.title,
        description: data.description,
        image_url: null,
        external_url: null,
        entry_date: data.entry_date,
        ...nullDist,
        ...nullFinancial,
        ...taxonomy("insight", "reflection", {}),
        source_type,
        source_metadata,
      };
    case "link":
      return {
        project_id: data.project_id,
        user_id: userId,
        type: "link" as const,
        title: data.title,
        description: data.description,
        image_url: null,
        external_url: data.external_url?.trim() || null,
        entry_date: data.entry_date,
        ...nullDist,
        ...nullFinancial,
        ...taxonomy("build", "ship_update", {}),
        source_type,
        source_metadata,
      };
  }
}

/**
 * Single write path for timeline rows (notes, links, distribution posts, etc.).
 */
export async function insertTimelineEntry(
  supabase: SupabaseClient,
  args: {
    userId: string;
    data: LogEventInput;
    provenance?: TimelineEntryProvenance;
  }
): Promise<{ error: { message: string } | null }> {
  const source_type: EntrySourceType =
    args.provenance?.source_type ?? "manual";
  const source_metadata: EntrySourceMetadata =
    args.provenance?.source_metadata !== undefined
      ? args.provenance.source_metadata
      : null;

  const row = buildInsertRow(
    args.userId,
    args.data,
    source_type,
    source_metadata
  );
  const { error } = await supabase.from("timeline_entries").insert(row);
  return { error };
}
