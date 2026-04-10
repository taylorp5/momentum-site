"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Marketing `/` must not use `redirect("/dashboard")` on the server while the user is
 * signed in: Next will prefetch `/` from auth pages (e.g. reset-password logo link),
 * and that prefetch would return a redirect to `/dashboard`, which can interrupt the
 * reset flow. Defer the dashboard redirect to the client on `/` only.
 */
export function HomeDeferredDashboardRedirect({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/" || !isLoggedIn || typeof window === "undefined") return;

    const search = new URLSearchParams(window.location.search);
    if (search.get("code") || search.get("token_hash")) return;

    const hash = window.location.hash?.replace(/^#/, "") ?? "";
    if (hash.includes("access_token") || hash.includes("type=recovery")) return;

    router.replace("/dashboard");
  }, [pathname, isLoggedIn, router]);

  return null;
}
