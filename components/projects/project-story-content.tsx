import Link from "next/link";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { ProjectStoryPayload } from "@/lib/data/project-story";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type Props = {
  payload: ProjectStoryPayload;
};

export function ProjectStoryContent({ payload }: Props) {
  const { project, totalPosts, totalViews, totalRevenue, bestPost, insights, generatedAtIso } =
    payload;
  const generated = new Date(generatedAtIso);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-16 sm:px-6">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/projects/${project.id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 text-[13px] font-medium text-zinc-600 hover:text-zinc-900"
          )}
        >
          ← Back to project
        </Link>
        <p className="text-[11px] tabular-nums text-zinc-400">
          Generated {format(generated, "MMM d, yyyy · h:mm a")}
        </p>
      </div>

      <header className="border-b border-zinc-200/90 pb-8">
        <div className="flex items-center gap-3">
          <span
            className="size-3.5 shrink-0 rounded-full ring-2 ring-zinc-100"
            style={{ backgroundColor: project.color }}
            aria-hidden
          />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.65rem] sm:leading-tight">
            {project.name}
          </h1>
        </div>
        {project.description?.trim() ? (
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">{project.description}</p>
        ) : null}
        <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-zinc-400">
          Project story
        </p>
      </header>

      <section className="mt-10 space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Total posts
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {totalPosts.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Total views
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {totalViews.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">From logged metrics on posts</p>
          </div>
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-4 py-3.5 sm:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Total revenue
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {money.format(totalRevenue)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Sum of revenue events on this project&apos;s timeline
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Best performing post
          </h2>
          {bestPost ? (
            <div className="mt-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-4 shadow-sm">
              <p className="text-[16px] font-semibold leading-snug text-zinc-900">
                {bestPost.title}
              </p>
              <p className="mt-2 text-[13px] text-zinc-600">
                {bestPost.platformLabel}
                <span className="mx-1.5 text-zinc-300">·</span>
                <span className="tabular-nums">{bestPost.views.toLocaleString()} views</span>
                <span className="mx-1.5 text-zinc-300">·</span>
                {format(new Date(`${bestPost.datePosted}T12:00:00`), "MMM d, yyyy")}
              </p>
              {bestPost.url ? (
                <a
                  href={bestPost.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-700 underline-offset-2 hover:underline"
                >
                  Open link
                  <ExternalLink className="size-3.5" strokeWidth={1.65} />
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-zinc-500">
              No distribution posts yet — log one to populate this section.
            </p>
          )}
        </div>

        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Insights
          </h2>
          <ul className="mt-3 space-y-3 text-[14px] leading-relaxed text-zinc-700">
            {insights.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-14 border-t border-zinc-100 pt-6 text-center text-[11px] text-zinc-400">
        Snapshot from Momentum · For sharing or print
      </footer>
    </div>
  );
}
