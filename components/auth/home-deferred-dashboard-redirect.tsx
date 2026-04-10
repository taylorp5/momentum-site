"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Marketing `/` used to redirect signed-in users on the server. That ran before the
 * client could read `location.hash` (implicit recovery / magic-link tokens), so
 * recovery could never complete. Defer the dashboard redirect to the client when the
 * URL does not show an obvious auth handoff.
 */
export function HomeDeferredDashboardRedirect({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn || typeof window === "undefined") return;

    const search = new URLSearchParams(window.location.search);
    if (search.get("code") || search.get("token_hash")) return;

    const hash = window.location.hash?.replace(/^#/, "") ?? "";
    if (hash.includes("access_token") || hash.includes("type=recovery")) return;

    router.replace("/dashboard");
  }, [isLoggedIn, router]);

  return null;
}
