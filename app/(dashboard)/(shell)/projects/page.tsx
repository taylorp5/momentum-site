import type { Metadata } from "next";
import { FolderKanban, FolderOpen, GitBranch, Share2 } from "lucide-react";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectCard } from "@/components/projects/project-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth/user";
import { listProjects } from "@/lib/data/projects";
import { listTimelineForProject } from "@/lib/data/timeline";
import { listDistributionForProject } from "@/lib/data/distribution";
import { isMockDataMode } from "@/lib/env";
import type { DistributionEntry, TimelineEntry } from "@/types/momentum";

export const metadata: Metadata = {
  title: "Projects",
};

function latestActivityIso(
  timeline: TimelineEntry[],
  distribution: DistributionEntry[]
): string | null {
  let max = 0;
  for (const t of timeline) {
    max = Math.max(max, new Date(t.updated_at).getTime());
  }
  for (const d of distribution) {
    max = Math.max(max, new Date(d.updated_at).getTime());
  }
  return max > 0 ? new Date(max).toISOString() : null;
}

export default async function ProjectsPage() {
  const user = await requireSessionUser();
  const projects = await listProjects(user.id);

  const timelineCounts = await Promise.all(
    projects.map((p) => listTimelineForProject(user.id, p.id))
  );
  const distributionCounts = await Promise.all(
    projects.map((p) => listDistributionForProject(user.id, p.id))
  );

  const totalTimeline = timelineCounts.reduce((a, t) => a + t.length, 0);
  const totalDistribution = distributionCounts.reduce(
    (a, d) => a + d.length,
    0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Every product or bet gets one home — timeline, distribution, and context stay attached to the same project."
        action={<CreateProjectDialog />}
      />

      {isMockDataMode() ? (
        <Card className="rounded-[11px] border-amber-200/80 bg-amber-50/90 shadow-none ring-0">
          <CardContent className="py-3.5 text-[13px] leading-relaxed text-amber-950">
            Preview mode uses sample projects so you can click through the app.
            Connect Supabase and set{" "}
            <code className="rounded-md bg-amber-100/80 px-1.5 py-0.5 font-mono text-[12px]">
              NEXT_PUBLIC_USE_MOCK_DATA=false
            </code>{" "}
            to create real projects and save data.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatCard
          title="Active products"
          value={projects.length}
          icon={FolderKanban}
          tone="accent"
          className="py-4"
          titleClassName="text-[11px] tracking-[0.11em]"
          valueClassName="text-[2.05rem] sm:text-[2.2rem]"
        />
        <StatCard
          title="Timeline entries"
          value={totalTimeline}
          icon={GitBranch}
          className="py-4"
          titleClassName="text-[11px] tracking-[0.11em]"
          valueClassName="text-[2.05rem] sm:text-[2.2rem]"
        />
        <StatCard
          title="Distribution posts"
          value={totalDistribution}
          icon={Share2}
          tone="success"
          className="py-4"
          titleClassName="text-[11px] tracking-[0.11em]"
          valueClassName="text-[2.05rem] sm:text-[2.2rem]"
        />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-6" strokeWidth={1.5} />}
          title="No projects yet"
          description="Start tracking your first idea or product."
          action={<CreateProjectDialog triggerLabel="Create your first project" />}
          footnote={isMockDataMode() ? "Preview mode is read-only." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {projects.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              timelineCount={timelineCounts[i]?.length ?? 0}
              distributionCount={distributionCounts[i]?.length ?? 0}
              lastActivityAt={latestActivityIso(
                timelineCounts[i] ?? [],
                distributionCounts[i] ?? []
              )}
              isExample={isMockDataMode()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
