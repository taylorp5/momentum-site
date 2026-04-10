"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * When Supabase uses implicit redirect, tokens arrive in the URL hash (#access_token=…)
 * instead of ?code=. The server never sees the hash, so we finish the session on the client.
 */
export function LandingImplicitAuthBridge() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || typeof window === "undefined") return;
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash?.includes("access_token")) return;
    ran.current = true;

    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (!access_token || !refresh_token) {
      ran.current = false;
      return;
    }

    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        ran.current = false;
        return;
      }
      history.replaceState(null, "", window.location.pathname + window.location.search);
      if (type === "recovery") {
        router.replace("/reset-password");
      } else {
        router.replace("/dashboard");
      }
      router.refresh();
    })();
  }, [router]);

  return null;
}
