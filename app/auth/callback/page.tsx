"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPasswordRecoveryAccessToken } from "@/lib/supabase/auth-callback-helpers";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/dashboard";
  }
  return raw;
}

/**
 * PKCE code exchange must run in the browser so the code_verifier cookie from
 * resetPasswordForEmail / signInWithOAuth is available. Server route handlers
 * often fail for password recovery with "invalid request" / expired code.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = safeNextPath(params.get("next"));
    const recoveryHint = params.get("type") === "recovery";

    if (!code) {
      router.replace("/login?error=auth");
      return;
    }

    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        setStatus("Could not complete sign-in. Redirecting…");
        if (recoveryHint || next === "/reset-password") {
          await supabase.auth.signOut();
        }
        router.replace("/login?error=auth");
        return;
      }

      let dest = next;
      if (
        recoveryHint ||
        isPasswordRecoveryAccessToken(data.session.access_token) ||
        next === "/reset-password"
      ) {
        dest = "/reset-password";
      }

      router.replace(dest);
      router.refresh();
    })();
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4">
      <p className="text-[15px] text-zinc-600">{status}</p>
    </div>
  );
}
