import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { AccountSettingsSection } from "@/components/settings/account-settings-section";
import { DevPlanToggle } from "@/components/settings/dev-plan-toggle";
import { PlanBillingSection } from "@/components/settings/plan-billing-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionUser, getProfile } from "@/lib/auth/user";
import { listProjects } from "@/lib/data/projects";
import { isDevPlanToggleEnabled } from "@/lib/env";
import { planFromProfile } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Settings",
};

function firstWorkspaceProject(
  projects: Awaited<ReturnType<typeof listProjects>>
): { id: string; name: string } | null {
  const nonOverhead = projects.find((p) => !p.is_overhead);
  const pick = nonOverhead ?? projects[0];
  if (!pick) return null;
  return { id: pick.id, name: pick.name };
}

export default async function SettingsPage() {
  const user = await requireSessionUser();
  const [profile, projects] = await Promise.all([
    getProfile(user.id),
    listProjects(user.id),
  ]);
  const plan = planFromProfile(profile);
  const showDevPlanToggle = isDevPlanToggleEnabled();
  const defaultProject = firstWorkspaceProject(projects);
  const displayName = profile?.display_name?.trim() ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, plan, and workspace preferences."
      />

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Account
        </h2>
        <Card className="rounded-2xl border-zinc-200/90 bg-white py-0 shadow-sm ring-1 ring-zinc-950/[0.04]">
          <CardHeader className="border-b border-zinc-100 px-5 pb-4 pt-5">
            <CardTitle className="text-[16px] font-semibold tracking-tight text-zinc-950">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-5">
            <AccountSettingsSection displayName={displayName} email={user.email} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Plan & billing
        </h2>
        <Card className="rounded-2xl border-zinc-200/90 bg-white py-0 shadow-sm ring-1 ring-zinc-950/[0.04]">
          <CardHeader className="border-b border-zinc-100 px-5 pb-4 pt-5">
            <CardTitle className="text-[16px] font-semibold tracking-tight text-zinc-950">
              Your plan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-5">
            <PlanBillingSection plan={plan} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Workspace
        </h2>
        <Card className="rounded-2xl border-zinc-200/90 bg-white py-0 shadow-sm ring-1 ring-zinc-950/[0.04]">
          <CardHeader className="border-b border-zinc-100 px-5 pb-4 pt-5">
            <CardTitle className="text-[16px] font-semibold tracking-tight text-zinc-950">
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-5 pt-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Default project
              </p>
              {defaultProject ? (
                <Link
                  href={`/projects/${defaultProject.id}`}
                  className="inline-block text-[15px] font-medium text-zinc-950 underline-offset-4 hover:underline"
                >
                  {defaultProject.name}
                </Link>
              ) : (
                <p className="text-[14px] text-zinc-600">No projects yet — create one from the dashboard.</p>
              )}
            </div>
            <div className="h-px bg-zinc-100" />
            <p className="text-[13px] leading-relaxed text-zinc-500">
              More workspace preferences (defaults, notifications, and exports) will appear here.
            </p>
          </CardContent>
        </Card>
      </section>

      {showDevPlanToggle ? (
        <section className="space-y-3 border-t border-dashed border-zinc-200 pt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/80">
            Developer
          </h2>
          <DevPlanToggle currentPlan={plan} />
        </section>
      ) : null}
    </div>
  );
}
