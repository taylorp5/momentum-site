"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Finish recovery session when Supabase lands with:
 * - `token_hash` + `type=recovery` (email link / server redirect)
 * - `code` (PKCE) — must be exchanged in the browser so code_verifier matches resetPasswordForEmail
 */
export function ResetPasswordSessionBridge() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (tokenHash && type === "recovery") {
      ran.current = true;
      void (async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!error) {
          router.replace("/reset-password");
          router.refresh();
        } else {
          router.replace("/login?error=auth");
          router.refresh();
        }
      })();
      return;
    }

    const code = params.get("code");
    if (!code) return;
    ran.current = true;

    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        router.replace("/reset-password");
        router.refresh();
      } else {
        router.replace("/login?error=auth");
        router.refresh();
      }
    })();
  }, [router]);

  return null;
}
