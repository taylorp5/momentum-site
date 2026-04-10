"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * If Supabase redirects the recovery link to `/reset-password?code=...` (or any path
 * with `code`), exchange it in the browser so the session exists for `updateUser`.
 */
export function ResetPasswordSessionBridge() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || typeof window === "undefined") return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    ran.current = true;

    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        router.replace("/reset-password");
        router.refresh();
      }
    })();
  }, [router]);

  return null;
}
