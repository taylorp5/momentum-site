import type { Profile, UserPlan } from "@/types/momentum";

export type { UserPlan } from "@/types/momentum";

export function parseUserPlan(raw: string | null | undefined): UserPlan {
  return raw === "pro" ? "pro" : "free";
}

export function isProPlan(plan: UserPlan | null | undefined): boolean {
  return plan === "pro";
}

export function planFromProfile(profile: Pick<Profile, "plan"> | null): UserPlan {
  if (!profile) return "free";
  return parseUserPlan(profile.plan);
}
