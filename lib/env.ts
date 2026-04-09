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
 * Never enable in production builds.
 */
export function isDevPlanToggleEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (process.env.DISABLE_DEV_PLAN_TOGGLE === "true") return false;
  return true;
}
