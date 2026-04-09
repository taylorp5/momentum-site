"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { usePlan } from "@/components/billing/plan-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  projectName: string;
};

export function ProjectStoryLocked({ projectId, projectName }: Props) {
  const { openUpgrade } = usePlan();

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-16 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80">
        <Lock className="size-6" strokeWidth={1.65} aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Export story is a Pro feature
        </h1>
        <p className="text-[14px] leading-relaxed text-zinc-600">
          Turn <span className="font-medium text-zinc-800">{projectName}</span> into a clean,
          share-ready summary — posts, views, revenue highlights, and quick insights.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          className="h-10 rounded-lg bg-zinc-900 px-5 text-[13px] font-semibold hover:bg-zinc-800"
          onClick={() => openUpgrade()}
        >
          Upgrade to Pro
        </Button>
        <Link
          href={`/projects/${projectId}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-10 rounded-lg px-5 text-[13px] font-semibold"
          )}
        >
          Back to project
        </Link>
      </div>
    </div>
  );
}
