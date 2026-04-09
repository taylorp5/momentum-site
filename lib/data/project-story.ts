import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { listDistributionForProject } from "@/lib/data/distribution";
import { getProject } from "@/lib/data/projects";
import { listTimelineForProject } from "@/lib/data/timeline";
import type { DistributionEntry, DistributionPlatform, Project } from "@/types/momentum";

export type ProjectStoryBestPost = {
  title: string;
  platform: DistributionPlatform;
  platformLabel: string;
  views: number;
  datePosted: string;
  url: string;
};

export type ProjectStoryPayload = {
  project: Project;
  totalPosts: number;
  totalViews: number;
  totalRevenue: number;
  bestPost: ProjectStoryBestPost | null;
  insights: string[];
  generatedAtIso: string;
};

function displayTitle(entry: DistributionEntry): string {
  const t = entry.title?.trim();
  if (t) return t;
  return `Post on ${DISTRIBUTION_PLATFORM_LABELS[entry.platform]}`;
}

function buildProjectInsights(
  projectName: string,
  totalPosts: number,
  totalViews: number,
  totalRevenue: number,
  platformCount: number,
  bestViews: number
): string[] {
  const lines: string[] = [];

  if (totalPosts === 0) {
    lines.push(
      `${projectName} does not have logged distribution posts yet — add one to start this story.`
    );
    return lines;
  }

  lines.push(
    `${totalPosts} distribution post${totalPosts === 1 ? "" : "s"} logged for this project.`
  );

  if (totalViews > 0) {
    lines.push(
      `Combined logged views across posts: ${totalViews.toLocaleString()}.`
    );
  } else {
    lines.push(
      "Add view counts on posts when you can — they make momentum easier to see at a glance."
    );
  }

  if (totalRevenue > 0) {
    lines.push(
      `Revenue tied to this project on the timeline: ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(totalRevenue)}.`
    );
  }

  if (platformCount > 1) {
    lines.push(
      `You are showing up on ${platformCount} channels — diversity spreads discovery risk.`
    );
  } else if (platformCount === 1 && totalPosts > 0) {
    lines.push(
      "Single-channel focus can work; when one channel saturates, try another surface."
    );
  }

  if (bestViews >= 500) {
    lines.push(
      "Your top post crossed strong reach — study what made that one land and repeat the pattern."
    );
  } else if (bestViews > 0 && totalPosts >= 3) {
    lines.push(
      "With several posts in, double down on formats and platforms that already moved the needle."
    );
  }

  if (lines.length === 1) {
    lines.push(
      "Keep logging posts and metrics — the story sharpens every time you capture what you shipped."
    );
  }

  return lines;
}

/**
 * Aggregates distribution + revenue timeline data for the Pro “export story” view.
 */
export async function getProjectStoryPayload(
  userId: string,
  projectId: string
): Promise<ProjectStoryPayload | null> {
  const project = await getProject(userId, projectId);
  if (!project) return null;

  const [distribution, timeline] = await Promise.all([
    listDistributionForProject(userId, projectId),
    listTimelineForProject(userId, projectId),
  ]);

  const totalPosts = distribution.length;
  const totalViews = distribution.reduce(
    (sum, r) => sum + (r.metrics?.views ?? 0),
    0
  );

  const totalRevenue = timeline
    .filter((e) => e.type === "revenue")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const platformCount = new Set(distribution.map((d) => d.platform)).size;

  const sortedByPerf = [...distribution].sort((a, b) => {
    const va = a.metrics?.views ?? 0;
    const vb = b.metrics?.views ?? 0;
    if (vb !== va) return vb - va;
    return (
      new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
    );
  });
  const best = sortedByPerf[0] ?? null;

  const bestPost: ProjectStoryBestPost | null =
    best && totalPosts > 0
      ? {
          title: displayTitle(best),
          platform: best.platform,
          platformLabel: DISTRIBUTION_PLATFORM_LABELS[best.platform],
          views: best.metrics?.views ?? 0,
          datePosted: best.date_posted,
          url: best.url,
        }
      : null;

  const bestViews = bestPost?.views ?? 0;

  const insights = buildProjectInsights(
    project.name,
    totalPosts,
    totalViews,
    totalRevenue,
    platformCount,
    bestViews
  );

  return {
    project,
    totalPosts,
    totalViews,
    totalRevenue,
    bestPost,
    insights,
    generatedAtIso: new Date().toISOString(),
  };
}
