"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  SUPABASE_REQUIRED_ERROR,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { requireSessionUser } from "@/lib/auth/user";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  display_name: z.string().min(1, "Add your name").max(80),
});

export async function completeOnboardingAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (isMockDataMode()) {
    revalidatePath("/dashboard");
    return { success: true };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  return { success: true };
}

const displayNameSchema = z.object({
  display_name: z.string().min(1, "Add your name").max(80),
});

/** Update display name from Settings (does not change onboarding flags). */
export async function updateProfileDisplayNameAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireSessionUser();
  const parsed = displayNameSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (isMockDataMode()) {
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.display_name })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
