"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import type { UserPlan } from "@/types/momentum";

const PRO_ENTITLEMENT_ID = "pro";
const RC_SUBSCRIBERS = "https://api.revenuecat.com/v1/subscribers";

const REVALIDATE_PATHS = [
  "/settings",
  "/dashboard",
  "/focus",
  "/distribution",
  "/reports",
  "/financials",
  "/projects",
  "/upgrade",
  "/costs",
  "/outreach",
  "/swipe-file",
] as const;

function entitlementIsActive(ent: { expires_date: string | null } | undefined): boolean {
  if (!ent) return false;
  if (ent.expires_date == null) return true;
  return new Date(ent.expires_date) > new Date();
}

async function revenueCatSubscriberIsPro(appUserId: string): Promise<
  | { ok: true; pro: boolean }
  | { ok: false; reason: "no_secret" | "http_error"; status?: number }
> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!secret) {
    return { ok: false, reason: "no_secret" };
  }

  const res = await fetch(`${RC_SUBSCRIBERS}/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });

  if (res.status === 404) {
    return { ok: true, pro: false };
  }
  if (!res.ok) {
    return { ok: false, reason: "http_error", status: res.status };
  }

  const body = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
  };
  const ent = body.subscriber?.entitlements?.[PRO_ENTITLEMENT_ID];
  return { ok: true, pro: entitlementIsActive(ent) };
}

/**
 * Verifies the signed-in user with RevenueCat (server secret) and updates
 * `profiles.plan` so server actions and RSC match Web Billing purchases.
 *
 * Set `REVENUECAT_SECRET_API_KEY` in the server environment (RevenueCat → API keys → Secret).
 */
export async function syncPlanWithRevenueCatAction(): Promise<{
  synced: boolean;
  plan?: UserPlan;
  skipped?: boolean;
  error?: string;
}> {
  if (isMockDataMode() || !isSupabaseConfigured()) {
    return { synced: false, skipped: true };
  }

  const user = await requireSessionUser();
  const rc = await revenueCatSubscriberIsPro(user.id);

  if (!rc.ok) {
    if (rc.reason === "no_secret") {
      return { synced: false, skipped: true };
    }
    return {
      synced: false,
      error: `RevenueCat error${rc.status != null ? ` (${rc.status})` : ""}`,
    };
  }

  const newPlan: UserPlan = rc.pro ? "pro" : "free";
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ plan: newPlan }).eq("id", user.id);

  if (error) {
    return { synced: false, error: error.message };
  }

  for (const p of REVALIDATE_PATHS) {
    revalidatePath(p);
  }

  return { synced: true, plan: newPlan };
}
