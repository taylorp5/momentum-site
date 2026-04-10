import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Compass,
  Package,
  Wallet,
} from "lucide-react";
import { PlatformIcon } from "@/components/distribution/platform-icon";
import { MomentumLogo } from "@/components/momentum-logo";
import { Button } from "@/components/ui/button";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { PLATFORM_ORDER } from "@/lib/platform-config";
import { getSessionUser } from "@/lib/auth/user";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { DistributionPlatform } from "@/types/momentum";

const sectionClass = "py-14 sm:py-20 md:py-24";

export default async function HomePage() {
  if (isMockDataMode()) redirect("/dashboard");
  if (!isSupabaseConfigured()) redirect("/login");
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const steps = [
    {
      title: "Log what you ship",
      body: "Posts, launches, notes, and spend — tied to real projects so nothing lives in a forgotten tab.",
      icon: Package,
    },
    {
      title: "See what gets traction",
      body: "Views, platforms, and trends over time so you double down on what actually moves the needle.",
      icon: BarChart3,
    },
    {
      title: "Know what to do next",
      body: "A clear read on momentum and gaps — less thrash, more of the work that compounds.",
      icon: Compass,
    },
  ] as const;

  const crossPostBars: { platform: DistributionPlatform; label: string; pct: number }[] = [
    { platform: "youtube", label: "Shorts", pct: 88 },
    { platform: "tiktok", label: "TikTok", pct: 64 },
    { platform: "reddit", label: "r/SaaS", pct: 42 },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-400">
            <MomentumLogo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/login">
              <Button variant="ghost" className="h-9 rounded-lg text-[13px] text-zinc-600">
                Sign in
              </Button>
            </Link>
            <Link href="/signup" className="hidden sm:block">
              <Button className="h-9 rounded-lg px-3.5 text-[13px] font-semibold">Get started free</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section
          className={cn(
            "relative overflow-hidden border-b border-zinc-200/60 bg-white",
            sectionClass
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-0 h-[420px] w-[520px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),rgba(34,197,94,0.06),transparent_70%)] blur-3xl"
          />
          <div
            className={cn(
              "relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:gap-12 sm:px-6",
              "lg:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] lg:gap-y-10 lg:gap-x-12 xl:gap-x-14"
            )}
          >
            <div className="max-w-lg space-y-6 lg:max-w-none lg:pr-2 xl:pr-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                For builders shipping in public
              </p>
              <h1 className="text-[2.25rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl sm:leading-[1.05]">
                Stop guessing what works.
                <span className="block text-zinc-700">Start building with clarity.</span>
              </h1>
              <p className="text-[16px] leading-relaxed text-zinc-600 sm:text-[17px]">
                Track what you ship, where you share it, and what actually gets traction — all in
                one place.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/signup">
                  <Button className="h-11 rounded-xl px-6 text-[14px] font-semibold shadow-sm">
                    Get started free
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative min-w-0 w-full lg:-mr-2 xl:-mr-0">
              <div
                className={cn(
                  "overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-100/80",
                  "shadow-[0_32px_72px_-32px_rgba(15,23,42,0.48),0_0_0_1px_rgba(255,255,255,0.6)_inset]",
                  "ring-1 ring-zinc-950/[0.06]",
                  "before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-2xl before:shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                )}
              >
                <div
                  className={cn(
                    "relative w-full overflow-hidden",
                    "aspect-[16/12] min-h-[240px] sm:aspect-[16/10] sm:min-h-[280px]",
                    "lg:aspect-auto lg:min-h-[420px] lg:max-h-[min(60vh,640px)] xl:min-h-[460px]"
                  )}
                >
                  <Image
                    src="/landing/hero-dashboard.png"
                    alt="Momentum dashboard: at a glance metrics, today activity, and performance chart"
                    fill
                    priority
                    sizes="(min-width: 1280px) 760px, (min-width: 1024px) 62vw, 100vw"
                    className="object-contain object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 steps */}
        <section className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", sectionClass)}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              How it works
            </h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              From noise to signal in three moves
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
            {steps.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="group rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-200/80">
                  <Icon className="size-5 text-zinc-700" strokeWidth={1.75} />
                </div>
                <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cross-post */}
        <section className="border-y border-zinc-200/70 bg-white">
          <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", sectionClass)}>
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-lg space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                  See where your content actually works
                </h2>
                <p className="text-[15px] leading-relaxed text-zinc-600 sm:text-[16px]">
                  Track the same content across platforms and communities and compare performance —
                  so you know whether to lean into Shorts, TikTok, Reddit, or something else.
                </p>
                <ul className="space-y-2.5 text-[14px] text-zinc-600">
                  <li className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    Group posts that share one idea, even on different dates.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    Compare views and engagement side by side.
                  </li>
                </ul>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:underline"
                >
                  Try it on Pro
                  <ArrowUpRight className="size-4" strokeWidth={2} />
                </Link>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-6 shadow-inner">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Same idea — different placements
                </p>
                <div className="mt-6 space-y-5">
                  {crossPostBars.map((row) => (
                    <div key={row.platform + row.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="flex items-center gap-2 font-medium text-zinc-800">
                          <PlatformIcon platform={row.platform} className="size-4 text-zinc-600" />
                          {row.label}
                        </span>
                        <span className="tabular-nums text-zinc-500">{row.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-200/80">
                        <div
                          className="h-full rounded-full bg-zinc-800"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-center text-[12px] text-zinc-500">
                  Illustrative comparison — your numbers, your channels.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Platform coverage */}
        <section className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", sectionClass)}>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Show up where it matters
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
              Log distribution across the channels you actually use. Everything rolls into one ledger
              and your dashboards.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {PLATFORM_ORDER.map((p) => (
              <div
                key={p}
                className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white px-3 py-5 shadow-sm transition-shadow hover:border-zinc-300/90 hover:shadow-md"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                  <PlatformIcon platform={p} className="size-6 text-zinc-700" />
                </div>
                <span className="text-center text-[12px] font-medium text-zinc-700">
                  {DISTRIBUTION_PLATFORM_LABELS[p]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Financial */}
        <section className="border-t border-zinc-200/70 bg-zinc-100/40">
          <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", sectionClass)}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="order-2 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-sm lg:order-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <Wallet className="size-3.5 text-zinc-400" strokeWidth={2} />
                  Snapshot
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-zinc-500">Revenue</span>
                    <span className="font-semibold tabular-nums text-emerald-700">+$4,200</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-zinc-500">Expenses</span>
                    <span className="font-semibold tabular-nums text-zinc-800">−$1,180</span>
                  </div>
                  <div className="border-t border-zinc-100 pt-4">
                    <div className="flex justify-between text-[14px]">
                      <span className="font-medium text-zinc-800">Net income</span>
                      <span className="text-lg font-bold tabular-nums text-zinc-900">$3,020</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">Example figures for illustration.</p>
                  </div>
                </div>
              </div>
              <div className="order-1 max-w-lg space-y-4 lg:order-2">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                  Know if it&apos;s actually worth it
                </h2>
                <p className="text-[15px] leading-relaxed text-zinc-600 sm:text-[16px]">
                  Track your costs, revenue, and net income in one place — aligned with the same
                  projects and timeline you already use.
                </p>
                <p className="text-[14px] leading-relaxed text-zinc-600">
                  Less spreadsheet juggling. More confidence about whether the grind is paying off.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", sectionClass)}>
          <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Questions
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Quick answers
          </p>
          <div className="mx-auto mt-10 max-w-2xl divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-white">
            {[
              ["What is Momentum?", "A workspace to log what you build, where you share it, and how it performs — plus simple money clarity."],
              ["Who is it for?", "Solo builders and founders who ship publicly and want signal without a pile of tools."],
              ["Is there a free plan?", "Yes. Get started free and upgrade when you want deeper analytics and cross-post comparison."],
            ].map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-[14px] font-semibold text-zinc-900">
                  {q}
                </summary>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-zinc-200/80 bg-white pb-16 pt-12 sm:pb-20 sm:pt-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Start building with clarity
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-zinc-600">
              Join builders who track shipping and traction in one calm place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button className="h-11 rounded-xl px-8 text-[14px] font-semibold shadow-sm">
                  Get started free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="h-11 rounded-xl px-6 text-[14px]">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

