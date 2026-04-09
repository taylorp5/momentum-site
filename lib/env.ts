export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function isMockDataMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
}

/**
 * Settings “dev plan” control: only in local `next dev`, unless explicitly disabled.
 * Can be temporarily force-enabled with ENABLE_DEV_PLAN_TOGGLE=true.
 */
export function isDevPlanToggleEnabled(): boolean {
  if (process.env.DISABLE_DEV_PLAN_TOGGLE === "true") return false;
  if (process.env.ENABLE_DEV_PLAN_TOGGLE === "true") return true;
  if (process.env.NODE_ENV !== "development") return false;
  return true;
}
