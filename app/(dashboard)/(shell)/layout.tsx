import { redirect } from "next/navigation";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { planFromProfile } from "@/lib/plan";
import { listProjects } from "@/lib/data/projects";
import { getRunningWorkSessionBanner } from "@/lib/data/work-sessions";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSessionUser();
  const profile = await getProfile(user.id);
  const [projects, runningSession] = await Promise.all([
    listProjects(user.id),
    getRunningWorkSessionBanner(user.id),
  ]);

  if (!profile) {
    redirect("/login");
  }

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <DashboardFrame
      displayName={profile.display_name}
      email={user.email}
      projects={projects}
      plan={planFromProfile(profile)}
      runningSession={runningSession}
    >
      {children}
    </DashboardFrame>
  );
}
