import type { Metadata } from "next";
import Link from "next/link";
import { MomentumLogo } from "@/components/momentum-logo";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DevPlanToggle } from "@/components/settings/dev-plan-toggle";
import { requireSessionUser, getProfile } from "@/lib/auth/user";
import { planFromProfile } from "@/lib/plan";
import {
  isDevPlanToggleEnabled,
  isMockDataMode,
  isSupabaseConfigured,
} from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await requireSessionUser();
  const profile = await getProfile(user.id);
  const plan = planFromProfile(profile);
  const showDevPlanToggle = isDevPlanToggleEnabled();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Account and environment — team and billing can extend this surface when you need them."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[11px] border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.035)] ring-0">
          <CardHeader className="border-b border-zinc-100/90 px-5 pb-4 pt-5">
            <CardTitle className="text-[15px] font-semibold tracking-tight text-zinc-950">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 pt-5 text-[14px]">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Display name
              </p>
              <p className="mt-1 font-medium text-zinc-950">
                {profile?.display_name ?? "—"}
              </p>
            </div>
            <Separator className="bg-zinc-100" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Email
              </p>
              <p className="mt-1 font-medium text-zinc-950">
                {user.email ?? "—"}
              </p>
            </div>
            <Separator className="bg-zinc-100" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Plan
              </p>
              <p className="mt-1 font-medium capitalize text-zinc-950">
                {plan}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[11px] border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.035)] ring-0">
          <CardHeader className="border-b border-zinc-100/90 px-5 pb-4 pt-5">
            <CardTitle className="text-[15px] font-semibold tracking-tight text-zinc-950">
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 pt-5 text-[14px] text-zinc-600">
            <p>
              Supabase configured:{" "}
              <span className="font-semibold text-zinc-950">
                {isSupabaseConfigured() ? "Yes" : "No"}
              </span>
            </p>
            <p>
              Mock data mode:{" "}
              <span className="font-semibold text-zinc-950">
                {isMockDataMode() ? "On" : "Off"}
              </span>
            </p>
            <Separator className="bg-zinc-100" />
            <div className="flex items-start gap-4 rounded-[10px] border border-zinc-100 bg-zinc-50/60 p-4">
              <MomentumLogo iconOnly />
              <p className="text-[13px] leading-relaxed">
                Replace{" "}
                <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] ring-1 ring-zinc-200/80">
                  public/momentum-logo.png
                </code>{" "}
                with your official mark. The shared logo component lives in{" "}
                <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] ring-1 ring-zinc-200/80">
                  momentum-logo.tsx
                </code>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[11px] border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.035)] ring-0">
        <CardHeader className="border-b border-zinc-100/90 px-5 pb-4 pt-5">
          <CardTitle className="text-[15px] font-semibold tracking-tight text-zinc-950">
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5 pt-5 text-[14px] text-zinc-600">
          <p>Upgrade to Pro for advanced creator tooling and deeper insights.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/upgrade"
              className={cn(buttonVariants({ size: "sm" }), "rounded-lg")}
            >
              Upgrade to Pro
            </Link>
            <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled>
              Manage subscription (coming soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDevPlanToggle ? (
        <div className="max-w-xl">
          <DevPlanToggle currentPlan={plan} />
        </div>
      ) : null}
    </div>
  );
}
