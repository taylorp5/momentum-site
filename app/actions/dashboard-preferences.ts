"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  READ_ONLY_MOCK_ERROR,
  SUPABASE_REQUIRED_ERROR,
  validationError,
  type ActionResult,
} from "@/lib/actions/result";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import {
  DASHBOARD_WIDGET_IDS,
  type StoredDashboardPreferences,
  parseDashboardPreferences,
  serializePreferences,
} from "@/lib/dashboard-preferences";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function revalidateDashboard() {
  revalidatePath("/dashboard");
}

async function readAndWritePrefs(
  mutator: (current: ReturnType<typeof parseDashboardPreferences>) => void
): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const profile = await getProfile(user.id);
  const current = parseDashboardPreferences(profile?.dashboard_preferences);
  mutator(current);
  const next: StoredDashboardPreferences = serializePreferences(current);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_preferences: next })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidateDashboard();
  return { success: true };
}

export async function hideDashboardWidgetAction(
  widgetId: string
): Promise<ActionResult> {
  if (!(DASHBOARD_WIDGET_IDS as readonly string[]).includes(widgetId)) {
    return { error: "Unknown card." };
  }
  return readAndWritePrefs((p) => {
    p.hiddenWidgets.add(widgetId);
  });
}

export async function showDashboardWidgetAction(
  widgetId: string
): Promise<ActionResult> {
  return readAndWritePrefs((p) => {
    p.hiddenWidgets.delete(widgetId);
  });
}

export async function hideDashboardInsightAction(
  insightId: string
): Promise<ActionResult> {
  if (!insightId.trim()) return { error: "Invalid insight." };
  return readAndWritePrefs((p) => {
    p.hiddenInsights.add(insightId);
  });
}

export async function showDashboardInsightAction(
  insightId: string
): Promise<ActionResult> {
  return readAndWritePrefs((p) => {
    p.hiddenInsights.delete(insightId);
  });
}

const layoutSchema = z.object({
  hidden_widgets: z.array(z.string()).default([]),
  hidden_insights: z.array(z.string()).default([]),
});

export async function applyDashboardLayoutAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = layoutSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const hiddenWidgets = new Set<string>();
  for (const id of parsed.data.hidden_widgets) {
    if ((DASHBOARD_WIDGET_IDS as readonly string[]).includes(id)) {
      hiddenWidgets.add(id);
    }
  }
  const hiddenInsights = new Set(parsed.data.hidden_insights);

  const stored = serializePreferences({
    hiddenWidgets,
    hiddenInsights,
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_preferences: stored })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidateDashboard();
  return { success: true };
}

export async function revealAllHiddenDashboardAction(): Promise<ActionResult> {
  const user = await requireSessionUser();
  if (isMockDataMode()) return { error: READ_ONLY_MOCK_ERROR };
  if (!isSupabaseConfigured()) return { error: SUPABASE_REQUIRED_ERROR };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_preferences: {} })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidateDashboard();
  return { success: true };
}
