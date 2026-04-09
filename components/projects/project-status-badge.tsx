import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { ProjectStatus } from "@/types/momentum";
import { cn } from "@/lib/utils";

/** Restrained, product-grade status chips — no loud accent colors. */
const tone: Record<ProjectStatus, string> = {
  idea: "border-zinc-200/80 bg-zinc-50 text-zinc-600",
  building: "border-zinc-800 bg-zinc-900 text-zinc-50",
  launched: "border-zinc-300 bg-white text-zinc-800",
  paused: "border-zinc-200/70 bg-zinc-100/70 text-zinc-500",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone[status]
      )}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
