import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default async function OnboardingPage() {
  const user = await requireSessionUser();
  const profile = await getProfile(user.id);
  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Let&apos;s personalize Momentum
        </h1>
        <p className="text-sm text-zinc-600">
          Tell us how to address you. You can change this anytime in settings.
        </p>
      </div>
      <OnboardingForm initialName={profile?.display_name ?? ""} />
    </div>
  );
}
