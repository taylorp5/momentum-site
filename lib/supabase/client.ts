import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  return createBrowserClient(url, key, {
    auth: {
      // We exchange PKCE / magic-link codes explicitly in /auth/callback and
      // ResetPasswordSessionBridge. Leaving this true races with those calls and
      // can trigger spurious client navigations after recovery.
      detectSessionInUrl: false,
    },
  });
}
