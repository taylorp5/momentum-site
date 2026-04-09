import { format } from "date-fns";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import type { DistributionEntry, DistributionPlatform } from "@/types/momentum";

/** Single post with meaningful reach */
const TRACTION_VIEWS_THRESHOLD = 100;

/** Avoid noisy dominance when totals are tiny */
const DOMINANCE_MIN_TOTAL_VIEWS = 25;

const DOMINANCE_MAJORITY_RATIO = 0.5;

export type DashboardInsightIcon = "fire" | "warning" | "bulb";

export type InsightLogAction = {
  id: string;
  label: string;
  platform?: DistributionPlatform;
  quickLog?: boolean;
};

export type DashboardInsight = {
  id:
    | "platform_dominance"
    | "traction"
    | "inactivity"
    | "experimentation_gap"
    | "improving_posts";
  icon: DashboardInsightIcon;
  /** Short headline for the card */
  title: string;
  whatHappened: string;
  whyItMatters: string;
  whatToDoNext: string;
  logActions: InsightLogAction[];
  priority: number;
};

export const DASHBOARD_INSIGHT_LABELS: Record<DashboardInsight["id"], string> = {
  platform_dominance: "Platform carrying views",
  traction: "Strong reach",
  inactivity: "Posting cadence",
  experimentation_gap: "Single-channel footprint",
  improving_posts: "Improving posts",
};

const TRY_PLATFORM_ORDER: DistributionPlatform[] = [
  "tiktok",
  "twitter",
  "reddit",
  "instagram",
  "youtube",
  "product_hunt",
  "other",
];

function suggestAlternatePlatform(avoid: DistributionPlatform): DistributionPlatform {
  const hit = TRY_PLATFORM_ORDER.find((p) => p !== avoid);
  return hit ?? "other";
}

function platformLabel(p: DistributionPlatform): string {
  return DISTRIBUTION_PLATFORM_LABELS[p];
}

function viewsOf(e: DistributionEntry): number {
  return e.metrics?.views ?? 0;
}

function daysSinceLatestPost(entries: DistributionEntry[]): number {
  if (!entries.length) return Infinity;
  let maxD = entries[0]!.date_posted;
  for (const e of entries) {
    if (e.date_posted > maxD) maxD = e.date_posted;
  }
  const post = new Date(`${maxD}T12:00:00Z`);
  const now = new Date();
  const t0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const t1 = Date.UTC(
    post.getUTCFullYear(),
    post.getUTCMonth(),
    post.getUTCDate()
  );
  return Math.max(0, Math.floor((t0 - t1) / 86400000));
}

function latestPostDateLabel(entries: DistributionEntry[]): string {
  if (!entries.length) return "";
  let maxD = entries[0]!.date_posted;
  for (const e of entries) {
    if (e.date_posted > maxD) maxD = e.date_posted;
  }
  try {
    return format(new Date(`${maxD}T12:00:00`), "MMM d, yyyy");
  } catch {
    return maxD;
  }
}

/**
 * Rule-based insights from distribution entries and 7-day post count.
 */
export function buildDashboardInsights(
  entries: DistributionEntry[],
  distributionPostsLast7Days: number
): DashboardInsight[] {
  const out: DashboardInsight[] = [];

  if (entries.length === 0) {
    return out;
  }

  const totalPosts = entries.length;
  const byPlatform = new Map<DistributionPlatform, { posts: number; views: number }>();
  for (const p of Object.keys(DISTRIBUTION_PLATFORM_LABELS) as DistributionPlatform[]) {
    byPlatform.set(p, { posts: 0, views: 0 });
  }
  for (const e of entries) {
    const cur = byPlatform.get(e.platform) ?? { posts: 0, views: 0 };
    cur.posts += 1;
    cur.views += viewsOf(e);
    byPlatform.set(e.platform, cur);
  }

  const platformsUsed = [...byPlatform.entries()].filter(([, v]) => v.posts > 0);
  const totalViews = [...byPlatform.values()].reduce((s, v) => s + v.views, 0);
  const daysSince = daysSinceLatestPost(entries);
  const lastPostLabel = latestPostDateLabel(entries);

  // A. Platform dominance
  if (totalViews >= DOMINANCE_MIN_TOTAL_VIEWS) {
    const ranked = [...byPlatform.entries()]
      .filter(([, v]) => v.views > 0)
      .sort((a, b) => b[1].views - a[1].views);
    if (ranked.length >= 1) {
      const [best, topStats] = ranked[0]!;
      const secondViews = ranked[1]?.[1].views ?? 0;
      const ratio = topStats.views / totalViews;
      const soleLeader = topStats.views > secondViews;
      if (ratio >= DOMINANCE_MAJORITY_RATIO && soleLeader) {
        const name = platformLabel(best);
        const alt = suggestAlternatePlatform(best);
        out.push({
          id: "platform_dominance",
          icon: "fire",
          title: `${name} is carrying your views`,
          whatHappened: `${topStats.views.toLocaleString()} of your ${totalViews.toLocaleString()} logged views (${Math.round(ratio * 100)}%) are on ${name} across ${topStats.posts} post${topStats.posts === 1 ? "" : "s"}.`,
          whyItMatters: "You have clear channel-product fit right now.",
          whatToDoNext: `Post on ${name} again, then run one small ${platformLabel(alt)} test.`,
          logActions: [
            {
              id: "again",
              label: `Post again on ${name}`,
              platform: best,
              quickLog: true,
            },
            {
              id: "try_other",
              label: `Try ${platformLabel(alt)}`,
              platform: alt,
              quickLog: true,
            },
          ],
          priority: 40,
        });
      }
    }
  }

  // B. Traction
  const maxViews = Math.max(...entries.map(viewsOf));
  const topEntry = entries.reduce((a, b) =>
    viewsOf(b) > viewsOf(a) ? b : a
  );
  if (maxViews >= TRACTION_VIEWS_THRESHOLD) {
    out.push({
      id: "traction",
      icon: "fire",
      title: "Strong reach on one post",
      whatHappened: `Your top logged post sits at ${maxViews.toLocaleString()} views on ${platformLabel(topEntry.platform)} — above the ~${TRACTION_VIEWS_THRESHOLD.toLocaleString()} bar we use as “real traction.”`,
      whyItMatters: "Something in that post format is resonating.",
      whatToDoNext: "Ship a follow-up this week while the topic is still warm.",
      logActions: [{ id: "followup", label: "Log a follow-up", quickLog: true }],
      priority: 30,
    });
  }

  // C. Inactivity
  if (totalPosts > 0 && distributionPostsLast7Days === 0) {
    const gapLabel = Number.isFinite(daysSince)
      ? `${daysSince} day${daysSince === 1 ? "" : "s"}`
      : "a while";
    out.push({
      id: "inactivity",
      icon: "warning",
      title: "Posting cadence has gone quiet",
      whatHappened: `It’s been ${gapLabel} since your last logged distribution post${lastPostLabel ? ` (${lastPostLabel})` : ""}, and none in the last 7 days.`,
      whyItMatters: "Long gaps lower momentum and slow feedback loops.",
      whatToDoNext: "Log one lightweight post today to restart cadence.",
      logActions: [{ id: "log_new", label: "Log a new post", quickLog: true }],
      priority: 10,
    });
  }

  // D. Experimentation gap
  if (totalPosts >= 2 && platformsUsed.length === 1) {
    const only = platformsUsed[0]![0];
    const alt = suggestAlternatePlatform(only);
    out.push({
      id: "experimentation_gap",
      icon: "bulb",
      title: "Single-channel footprint",
      whatHappened: `All ${totalPosts} of your logged posts are on ${platformLabel(only)} — no second channel in the log yet.`,
      whyItMatters: "You are concentrated on one distribution surface.",
      whatToDoNext: `Keep ${platformLabel(only)} primary and test ${platformLabel(alt)} once.`,
      logActions: [
        {
          id: "try_alt",
          label: `Try ${platformLabel(alt)}`,
          platform: alt,
          quickLog: true,
        },
        {
          id: "log_home",
          label: `Log on ${platformLabel(only)}`,
          platform: only,
          quickLog: true,
        },
      ],
      priority: 20,
    });
  }

  // E. Improving posts
  const byPosted = [...entries].sort(
    (a, b) =>
      new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
  );
  const latest = byPosted[0];
  const previous = byPosted[1];
  if (latest && previous && viewsOf(latest) > viewsOf(previous)) {
    const vL = viewsOf(latest);
    const vP = viewsOf(previous);
    const lp = latest.platform;
    out.push({
      id: "improving_posts",
      icon: "fire",
      title: "Latest post outperformed the last",
      whatHappened: `Your newest post (${format(new Date(`${latest.date_posted}T12:00:00`), "MMM d")}) has ${vL.toLocaleString()} views vs ${vP.toLocaleString()} on the one before it — both on ${platformLabel(lp)}.`,
      whyItMatters: "Sequential gains suggest your last change worked.",
      whatToDoNext: "Repeat the winning element in your next post and log results.",
      logActions: [
        { id: "followup", label: "Post a follow-up", quickLog: true },
        {
          id: "same_channel",
          label: `Log on ${platformLabel(lp)}`,
          platform: lp,
          quickLog: true,
        },
      ],
      priority: 50,
    });
  }

  out.sort((a, b) => a.priority - b.priority);
  return out;
}

export const INSIGHT_ICON_EMOJI: Record<DashboardInsightIcon, string> = {
  fire: "🔥",
  warning: "⚠️",
  bulb: "📈",
};
