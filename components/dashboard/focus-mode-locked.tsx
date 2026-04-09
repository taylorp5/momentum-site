"use client";

import Link from "next/link";
import { Crosshair, Lock } from "lucide-react";
import { useProLock } from "@/components/billing/pro-lock";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FocusModeLocked() {
  const { onLockedClick } = useProLock();

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-4">
      <div className="mb-10 flex justify-end">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-9 rounded-full px-4 text-[13px] font-medium text-zinc-600 hover:text-zinc-900"
          )}
        >
          Full dashboard
        </Link>
      </div>

      <div className="space-y-10 text-center sm:text-left">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80 sm:mx-0">
          <Lock className="size-6" strokeWidth={1.65} aria-hidden />
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Pro
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Crosshair className="size-6 text-zinc-400" strokeWidth={1.5} aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[1.75rem]">
              Focus Mode
            </h1>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-zinc-600">
            A minimal home for logging posts, expenses, and notes in seconds — with
            momentum status and one clear next step. Upgrade to Pro to unlock it.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
          <Button
            type="button"
            className="h-11 rounded-full bg-zinc-900 px-6 text-[14px] font-semibold hover:bg-zinc-800"
            onClick={() => onLockedClick()}
          >
            Upgrade to Pro
          </Button>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 rounded-full border-zinc-200/90 px-6 text-[14px] font-semibold"
            )}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
