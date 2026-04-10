export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function isMockDataMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
}
