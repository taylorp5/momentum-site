"use client";

import { BookOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Placeholder until export story ships; keeps a stable import site on the project header. */
export function ProjectExportStoryButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 cursor-not-allowed gap-2 rounded-[10px] border-zinc-200/70 bg-zinc-50/80 px-4 text-[13px] font-semibold text-zinc-400 opacity-70 shadow-none"
            )}
          />
        }
      >
        <BookOpen className="size-4 text-zinc-400" strokeWidth={1.65} />
        Export story
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        Coming soon
      </TooltipContent>
    </Tooltip>
  );
}
