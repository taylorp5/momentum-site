"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult } from "@/lib/actions/result";
import { requireSessionUser } from "@/lib/auth/user";
import {
  isDevPlanToggleEnabled,
  isMockDataMode,
  isSupabaseConfigured,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  plan: z.enum(["free", "pro"]),
});

const SUPABASE_REQUIRED_ERROR =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

/**
 * Flip `profiles.plan` for the signed-in user.
 * Enabled in local dev by default; can be force-enabled with ENABLE_DEV_PLAN_TOGGLE=true.
 */
export async function setDevPlanForTestingAction(
  input: unknown
): Promise<ActionResult> {
  if (!isDevPlanToggleEnabled()) {
    return { error: "Dev plan toggle is not available in this environment." };
  }

  const user = await requireSessionUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid plan." };
  }

  if (isMockDataMode()) {
    return {
      error:
        "Turn off NEXT_PUBLIC_USE_MOCK_DATA — the dev toggle updates your Supabase profile, not demo data.",
    };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ plan: parsed.data.plan })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  const paths = [
    "/settings",
    "/dashboard",
    "/focus",
    "/distribution",
    "/reports",
    "/financials",
    "/projects",
  ];
  for (const p of paths) {
    revalidatePath(p);
  }

  return { success: true };
}
