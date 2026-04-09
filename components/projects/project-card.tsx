import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronRight, Share2, StickyNote } from "lucide-react";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import type { Project } from "@/types/momentum";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  timelineCount: number;
  distributionCount: number;
  /** Most recent timeline or distribution `updated_at` for this project, if any. */
  lastActivityAt: string | null;
  isExample?: boolean;
};

export function ProjectCard({
  project,
  timelineCount,
  distributionCount,
  lastActivityAt,
  isExample = false,
}: ProjectCardProps) {
  const started = format(new Date(project.created_at), "MMM yyyy");
  const totalSignals = timelineCount + distributionCount;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-[10px] border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow] hover:border-zinc-300/85 hover:shadow-[0_3px_10px_-4px_rgba(15,23,42,0.12)]"
    >
      <div className="flex flex-col sm:flex-row">
        <div
          className="h-1.5 w-full shrink-0 sm:h-auto sm:w-1.5 sm:min-h-[104px] sm:rounded-l-xl"
          style={{ backgroundColor: project.color }}
          aria-hidden
        />
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-0 p-0 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0 flex-1 space-y-2 px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectAvatar name={project.name} logoUrl={project.logo_url} size="sm" />
              <h2 className="truncate text-[17px] font-semibold tracking-tight text-zinc-950">
                {project.name}
              </h2>
              <ProjectStatusBadge status={project.status} />
              {isExample ? (
                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                  Example project
                </span>
              ) : null}
            </div>
            <p className="line-clamp-2 text-[14px] leading-relaxed text-zinc-600">
              {project.description ||
                "Add a one-line pitch so future you knows what this is."}
            </p>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <StickyNote
                    className="size-3.5 text-zinc-400"
                    strokeWidth={1.75}
                  />
                  <span className="tabular-nums font-semibold text-zinc-800">
                    {timelineCount}
                  </span>
                  <span>timeline</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Share2
                    className="size-3.5 text-zinc-400"
                    strokeWidth={1.75}
                  />
                  <span className="tabular-nums font-semibold text-zinc-800">
                    {distributionCount}
                  </span>
                  <span>distribution</span>
                </span>
              </div>
              <span className="hidden text-zinc-300 sm:inline">·</span>
              <span className="text-[12px] text-zinc-500">
                Started {started}
                {totalSignals > 0 ? (
                  <>
                    <span className="mx-1.5 text-zinc-300">·</span>
                    {lastActivityAt ? (
                      <time
                        dateTime={lastActivityAt}
                        className="font-medium text-zinc-600"
                      >
                        Active{" "}
                        {formatDistanceToNow(new Date(lastActivityAt), {
                          addSuffix: true,
                        })}
                      </time>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="mx-1.5 text-zinc-300">·</span>
                    <span className="text-zinc-400">No entries yet</span>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-zinc-100 px-4 py-3 sm:border-l sm:border-t-0">
            <p className="text-[11px] font-medium text-zinc-400 sm:hidden">
              Updated{" "}
              {new Date(project.updated_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="hidden text-right text-[11px] font-medium text-zinc-400 sm:block">
              Record updated{" "}
              {formatDistanceToNow(new Date(project.updated_at), {
                addSuffix: true,
              })}
            </p>
            <ChevronRight
              className={cn(
                "size-5 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500"
              )}
              strokeWidth={1.75}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
