import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectStoryContent } from "@/components/projects/project-story-content";
import { ProjectStoryLocked } from "@/components/projects/project-story-locked";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { getProjectStoryPayload } from "@/lib/data/project-story";
import { getProject } from "@/lib/data/projects";
import { isProPlan } from "@/lib/plan";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: "Project story",
    description: `Shareable story for project ${projectId}`,
  };
}

export default async function ProjectStoryPage({ params }: PageProps) {
  const user = await requireSessionUser();
  const { projectId } = await params;

  const [profile, project] = await Promise.all([
    getProfile(user.id),
    getProject(user.id, projectId),
  ]);

  if (!project) {
    notFound();
  }

  const isPro = isProPlan(profile?.plan ?? "free");

  if (!isPro) {
    return <ProjectStoryLocked projectId={project.id} projectName={project.name} />;
  }

  const payload = await getProjectStoryPayload(user.id, projectId);
  if (!payload) {
    notFound();
  }

  return <ProjectStoryContent payload={payload} />;
}
