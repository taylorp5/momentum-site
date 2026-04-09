import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  CircleDollarSign,
  FlaskConical,
  Hammer,
  Handshake,
  Link2,
  Megaphone,
  StickyNote,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashCard,
  dashCardHeader,
  dashSectionDesc,
  dashSectionTitle,
} from "@/components/dashboard/dashboard-shell";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { cn } from "@/lib/utils";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { PLATFORM_ACCENT } from "@/lib/dashboard-colors";
import type { ActivityItem, TimelineEntryType } from "@/types/momentum";

type ActivityFeedProps = {
  items: ActivityItem[];
};

function timelineKindLabel(type: TimelineEntryType) {
  switch (type) {
    case "work":
      return "Work session";
    case "note":
      return "Ship log · Note";
    case "link":
      return "Ship log · Link";
    case "snapshot":
      return "Ship log · Snapshot";
    case "distribution":
      return "Distribution";
    case "build":
      return "Ship log · Build";
    case "insight":
      return "Ship log · Insight";
    case "experiment":
      return "Ship log · Experiment";
    case "cost":
      return "Finance · Cost";
    case "revenue":
      return "Finance · Revenue";
    case "deal":
      return "Finance · Deal";
    default:
      return "Ship log";
  }
}

function activityIcon(type: TimelineEntryType) {
  switch (type) {
    case "work":
      return <Timer className="size-[15px]" strokeWidth={1.75} />;
    case "link":
      return <Link2 className="size-[15px]" strokeWidth={1.75} />;
    case "distribution":
      return <Megaphone className="size-[15px]" strokeWidth={1.75} />;
    case "build":
      return <Hammer className="size-[15px]" strokeWidth={1.75} />;
    case "experiment":
      return <FlaskConical className="size-[15px]" strokeWidth={1.75} />;
    case "cost":
    case "revenue":
      return <CircleDollarSign className="size-[15px]" strokeWidth={1.75} />;
    case "deal":
      return <Handshake className="size-[15px]" strokeWidth={1.75} />;
    default:
      return <StickyNote className="size-[15px]" strokeWidth={1.75} />;
  }
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className={cn(dashCard, "py-0 ring-0")}>
      <CardHeader className={cn(dashCardHeader, "bg-transparent")}>
        <CardTitle className={cn(dashSectionTitle, "text-[14px]")}>Recent activity</CardTitle>
        <p className={dashSectionDesc}>
          Your latest builder moves, all in one place.
        </p>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {items.length === 0 ? (
          <div className="px-0 py-0">
            <div className="grid grid-cols-[32px_1fr_auto] gap-3 border-b border-[#eeeeee] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              <span />
              <span>Event</span>
              <span>When</span>
            </div>
            <div className="divide-y divide-[#eeeeee]">
              {[0, 1].map((i) => (
                <div key={i} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3">
                  <span className="flex size-8 items-center justify-center rounded-md bg-zinc-50 text-zinc-400 ring-1 ring-zinc-200/70">
                    <Megaphone className="size-4" strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-zinc-600">No activity yet</p>
                    <p className="text-[12px] text-zinc-500">Ship your first update and your momentum feed starts here.</p>
                  </div>
                  <span className="text-[11px] text-zinc-400">—</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3.5">
              <p className="text-[13px] font-normal text-zinc-600">No recent activity yet</p>
              <div className="mt-3 flex flex-wrap gap-4">
                <Link
                  href="/projects"
                  className="text-[13px] font-medium text-zinc-700 underline-offset-4 transition-colors hover:text-zinc-900"
                >
                  Open projects
                </Link>
                <Link
                  href="/distribution"
                  className="text-[13px] font-medium text-zinc-700 underline-offset-4 transition-colors hover:text-zinc-900"
                >
                  Distribution
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[#eeeeee]">
            {items.map((item) => {
              const tab =
                item.type === "distribution" ? "distribution" : "timeline";
              const href = `/projects/${item.project_id}?tab=${tab}`;
              const when = new Date(item.at);
              const contextDate = item.entry_date;
              const contextLabel =
                contextDate &&
                format(new Date(`${contextDate}T12:00:00`), "MMM d, yyyy");

              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={href}
                    className="flex gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-zinc-50/80"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200/65">
                      {activityIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug tracking-tight text-zinc-900">
                          {item.title}
                        </p>
                        <time
                          className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-400"
                          dateTime={item.at}
                          title={when.toISOString()}
                        >
                          {formatDistanceToNow(when, { addSuffix: true })}
                        </time>
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        {item.type === "distribution" && item.platform ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span>{timelineKindLabel(item.type)}</span>
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 normal-case tracking-normal ring-1 ${PLATFORM_ACCENT[item.platform].bg} ${PLATFORM_ACCENT[item.platform].text} ${PLATFORM_ACCENT[item.platform].ring}`}
                            >
                              <PlatformIcon platform={item.platform} className="mr-1 size-3" />
                              {DISTRIBUTION_PLATFORM_LABELS[item.platform]}
                            </span>
                          </span>
                        ) : (
                          timelineKindLabel(item.type)
                        )}
                        {contextLabel ? (
                          <>
                            <span className="mx-1.5 text-zinc-300">·</span>
                            <span className="normal-case tracking-normal text-zinc-500">
                              {contextLabel}
                            </span>
                          </>
                        ) : null}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-normal text-zinc-500">
                        <ProjectAvatar
                          name={item.project_name}
                          logoUrl={item.project_logo_url}
                          size="sm"
                          className="size-5 rounded-md"
                        />
                        {item.project_name}
                      </p>
                      {item.detail ? (
                        <p className="mt-1 line-clamp-2 text-[12.5px] font-normal leading-relaxed text-zinc-500">
                          {item.detail}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
