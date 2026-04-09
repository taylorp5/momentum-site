"use server";

import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/auth/user";
import {
  READ_ONLY_MOCK_ERROR,
  SUPABASE_REQUIRED_ERROR,
  validationError,
} from "@/lib/actions/result";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  createProjectSchema,
  deleteProjectSchema,
  updateProjectSchema,
} from "@/lib/validations/project";

export type CreateProjectActionResult =
  | { success: true; projectId: string }
  | { error: string; fieldErrors?: Record<string, string[]> };
export type UpdateProjectActionResult =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string[]> };
export type DeleteProjectActionResult =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string[]> };

export async function createProjectAction(
  input: unknown
): Promise<CreateProjectActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      logo_url: parsed.data.logo_url ?? null,
      color: parsed.data.color,
      icon: parsed.data.icon ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }
  if (!data?.id) {
    return { error: "Project was created but no id was returned." };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/distribution");
  return { success: true, projectId: data.id };
}

export async function updateProjectAction(
  input: unknown
): Promise<UpdateProjectActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      logo_url: parsed.data.logo_url ?? null,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/projects");
  revalidatePath(`/projects/${parsed.data.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/distribution");
  return { success: true };
}

export async function deleteProjectAction(
  input: unknown
): Promise<DeleteProjectActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) {
    return { error: READ_ONLY_MOCK_ERROR };
  }
  if (!isSupabaseConfigured()) {
    return { error: SUPABASE_REQUIRED_ERROR };
  }

  const parsed = deleteProjectSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const id = parsed.data.id;
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/story`);
  revalidatePath("/dashboard");
  revalidatePath("/distribution");
  revalidatePath("/financials");
  revalidatePath("/focus");
  revalidatePath("/costs");
  revalidatePath("/reports");
  revalidatePath("/outreach");
  revalidatePath("/swipe-file");
  return { success: true };
}
