/**
 * Wrong NEXT_PUBLIC_SUPABASE_URL (e.g. dashboard URL or this app's origin) often yields
 * an HTML 404/login page; the client then fails parsing JSON.
 */
export function getSupabaseMisconfigurationMessage(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("not valid JSON") ||
    msg.includes("<!DOCTYPE") ||
    msg.includes("Unexpected token '<'")
  ) {
    return (
      "Supabase returned a web page instead of API data. In .env set NEXT_PUBLIC_SUPABASE_URL to your " +
      "Project URL from Supabase → Project Settings → API (https://xxxx.supabase.co). " +
      "Restart npm run dev after saving."
    );
  }
  return null;
}
