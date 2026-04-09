"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UpgradeProDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const BULLETS = [
  {
    title: "See what’s actually working",
    body: "Views over time, per-platform breakdowns, post comparisons, and which days pull the most engagement.",
  },
  {
    title: "Log posts instantly with AI",
    body: "Smart upload reads your screen and helps you log metrics with fewer taps.",
  },
  {
    title: "Get smarter about distribution",
    body: "Know where to post and what to try next.",
  },
] as const;

export function UpgradeProDialog({ open, onOpenChange }: UpgradeProDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl border-[#eeeeee] sm:max-w-md">
        <DialogHeader className="space-y-3 text-left">
          <div className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
            <Sparkles className="size-5" strokeWidth={1.5} aria-hidden />
          </div>
          <DialogTitle className="text-xl font-medium tracking-tight text-zinc-900">
            Momentum Pro
          </DialogTitle>
          <DialogDescription className="text-[14px] font-normal leading-relaxed text-zinc-500">
            Understand what&apos;s working. Double down faster.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-4 border-y border-[#eeeeee] py-5">
          {BULLETS.map((b) => (
            <li key={b.title} className="space-y-1">
              <p className="text-[13px] font-medium text-zinc-900">{b.title}</p>
              <p className="text-[13px] font-normal leading-relaxed text-zinc-500">{b.body}</p>
            </li>
          ))}
        </ul>

        <p className="text-center text-[14px] font-medium tabular-nums text-zinc-800">
          $10/month · Cancel anytime
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="h-10 w-full rounded-xl bg-zinc-900 font-medium hover:bg-zinc-800"
            onClick={() => {
              toast.success("Thanks for your interest", {
                description: "Checkout is coming soon — we’ll email you when Pro is live.",
                duration: 4500,
              });
              onOpenChange(false);
            }}
          >
            Upgrade to Pro
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full rounded-xl font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() => onOpenChange(false)}
          >
            Continue with free
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
