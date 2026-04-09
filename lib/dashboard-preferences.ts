import type { Profile } from "@/types/momentum";

/** Structural dashboard cards (not individual insight rules). */
export const DASHBOARD_WIDGET_IDS = [
  "momentum",
  "best_post",
  "your_story",
  "views_over_time",
  "platform_breakdown",
  "distribution_performance",
  "insights",
  "revenue",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type StoredDashboardPreferences = {
  hidden_widgets?: string[];
  hidden_insights?: string[];
};

export type EffectiveDashboardPreferences = {
  hiddenWidgets: Set<string>;
  hiddenInsights: Set<string>;
};

function uniqueStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === "string"))];
}

export function parseDashboardPreferences(
  raw: unknown
): EffectiveDashboardPreferences {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as StoredDashboardPreferences)
      : {};
  return {
    hiddenWidgets: new Set(uniqueStrings(obj.hidden_widgets)),
    hiddenInsights: new Set(uniqueStrings(obj.hidden_insights)),
  };
}

export function preferencesFromProfile(
  profile: Profile | null
): EffectiveDashboardPreferences {
  return parseDashboardPreferences(profile?.dashboard_preferences);
}

export function isWidgetVisible(
  prefs: EffectiveDashboardPreferences,
  id: DashboardWidgetId
): boolean {
  return !prefs.hiddenWidgets.has(id);
}

export function isInsightVisible(
  prefs: EffectiveDashboardPreferences,
  insightId: string
): boolean {
  return !prefs.hiddenInsights.has(insightId);
}

export function serializePreferences(
  prefs: EffectiveDashboardPreferences
): StoredDashboardPreferences {
  return {
    hidden_widgets:
      prefs.hiddenWidgets.size > 0 ? [...prefs.hiddenWidgets] : undefined,
    hidden_insights:
      prefs.hiddenInsights.size > 0 ? [...prefs.hiddenInsights] : undefined,
  };
}

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  momentum: "Momentum this week",
  best_post: "Best post",
  your_story: "Your story",
  views_over_time: "Views over time",
  platform_breakdown: "Platform breakdown",
  distribution_performance: "Performance table",
  insights: "Insights",
  revenue: "Revenue snapshot",
};

export function isKnownWidgetId(id: string): id is DashboardWidgetId {
  return (DASHBOARD_WIDGET_IDS as readonly string[]).includes(id);
}

/** Widgets exposed in the “Customize dashboard” modal (subset of `DASHBOARD_WIDGET_IDS`). */
export const DASHBOARD_CUSTOMIZE_WIDGET_IDS = [
  "best_post",
  "views_over_time",
  "platform_breakdown",
  "insights",
  "revenue",
] as const satisfies readonly DashboardWidgetId[];
