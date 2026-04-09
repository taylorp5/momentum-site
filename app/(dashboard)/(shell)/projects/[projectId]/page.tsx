import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { getProjectOverviewSlices } from "@/lib/data/dashboard";
import {
  getAttributedRevenueByDistributionId,
  listDistributionForProject,
} from "@/lib/data/distribution";
import { isProPlan } from "@/lib/plan";
import { getContentGroupTitlesByIds } from "@/lib/data/content-groups";
import { getProject } from "@/lib/data/projects";
import { listTimelineForProject, signTimelineImageUrl } from "@/lib/data/timeline";
import type { TimelineRow } from "@/components/projects/project-detail-client";
import { getWorkSessionSummary } from "@/lib/data/work-sessions";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: "Project",
    // Dynamic title resolved after auth in page; keep short default
    description: `Project ${projectId}`,
  };
}

async function withSignedUrls(
  entries: Awaited<ReturnType<typeof listTimelineForProject>>
): Promise<TimelineRow[]> {
  return Promise.all(
    entries.map(async (e) => ({
      ...e,
      image_signed_url: await signTimelineImageUrl(e.image_url),
    }))
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireSessionUser();
  const { projectId } = await params;
  const { tab } = await searchParams;

  const project = await getProject(user.id, projectId);
  if (!project) {
    notFound();
  }

  const [profile, overviewData, timeline, distribution, revenueByDistributionId, workSessions] =
    await Promise.all([
      getProfile(user.id),
      getProjectOverviewSlices(user.id, projectId, 4),
      listTimelineForProject(user.id, projectId),
      listDistributionForProject(user.id, projectId),
      getAttributedRevenueByDistributionId(user.id),
      getWorkSessionSummary(user.id, projectId),
    ]);
  const isPro = isProPlan(profile?.plan ?? "free");

  const [timelineSigned, overviewTimelineSigned, overviewDist] =
    await Promise.all([
      withSignedUrls(timeline),
      withSignedUrls(overviewData.recentTimeline),
      Promise.resolve(overviewData.recentDistribution),
    ]);

  const contentGroupIds = [
    ...new Set(
      timelineSigned
        .map((e) => e.content_group_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const contentGroupTitles = await getContentGroupTitlesByIds(
    user.id,
    contentGroupIds
  );

  const overview = {
    ...overviewData,
    recentTimeline: overviewTimelineSigned,
    recentDistribution: overviewDist,
  };

  const hasNoEntries =
    overviewData.timelineTotal + overviewData.distributionTotal === 0;

  return (
    <ProjectDetailClient
      project={project}
      defaultTab={tab ?? "overview"}
      showStartPrompt={hasNoEntries}
      overview={overview}
      timeline={timelineSigned}
      contentGroupTitles={contentGroupTitles}
      distribution={distribution}
      isPro={isPro}
      revenueByDistributionId={revenueByDistributionId}
      workSessions={workSessions}
    />
  );
}
