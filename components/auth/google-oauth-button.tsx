"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseMisconfigurationMessage } from "@/lib/supabase/json-response-errors";
import { isSupabaseConfigured } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={cn("size-[18px] shrink-0", className)} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type GoogleOAuthButtonProps = {
  /** Disables the button (e.g. while the email form is submitting). */
  disabled?: boolean;
  /** App path after successful OAuth (query `next` on callback). */
  next?: string;
  idleLabel: string;
  loadingLabel: string;
  ariaLabel: string;
  /** Fired when OAuth request starts / ends (error path only; redirect leaves page busy). */
  onBusyChange?: (busy: boolean) => void;
};

export function GoogleOAuthButton({
  disabled = false,
  next = "/dashboard",
  idleLabel,
  loadingLabel,
  ariaLabel,
  onBusyChange,
}: GoogleOAuthButtonProps) {
  const [oauthLoading, setOauthLoading] = useState(false);

  async function onClick() {
    if (!isSupabaseConfigured()) {
      toast.error(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env, then restart the dev server."
      );
      return;
    }
    setOauthLoading(true);
    onBusyChange?.(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        toast.error(error.message);
        setOauthLoading(false);
        onBusyChange?.(false);
      }
    } catch (e) {
      const misconfig = getSupabaseMisconfigurationMessage(e);
      if (misconfig) {
        toast.error(misconfig);
      } else {
        toast.error(e instanceof Error ? e.message : "Google sign-in failed");
      }
      setOauthLoading(false);
      onBusyChange?.(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || oauthLoading}
      onClick={() => void onClick()}
      className="h-11 w-full gap-2.5 rounded-xl border-zinc-200 bg-white text-[14px] font-medium text-zinc-800 shadow-sm hover:bg-zinc-50/80"
      aria-label={ariaLabel}
    >
      <GoogleMark />
      {oauthLoading ? loadingLabel : idleLabel}
    </Button>
  );
}

export function AuthOAuthDivider() {
  return (
    <div className="relative flex items-center gap-3">
      <span className="h-px flex-1 bg-zinc-200" aria-hidden />
      <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-zinc-400">or</span>
      <span className="h-px flex-1 bg-zinc-200" aria-hidden />
    </div>
  );
}
