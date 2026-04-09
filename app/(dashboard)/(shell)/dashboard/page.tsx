import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, FolderKanban, Lightbulb, Sparkles } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardAnalyticsStack } from "@/components/dashboard/dashboard-analytics-stack";
import { DashboardHiddenFooter } from "@/components/dashboard/dashboard-hidden-footer";
import { DashboardInsightsSection } from "@/components/dashboard/dashboard-insights-section";
import { ProductStateBar } from "@/components/dashboard/product-state-bar";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardWidgetFrame } from "@/components/dashboard/dashboard-widget-frame";
import { DistributionFilterControls } from "@/components/dashboard/distribution-filter-controls";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProPlanNudge } from "@/components/dashboard/pro-plan-nudge";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { getProfile, requireSessionUser } from "@/lib/auth/user";
import {
  isInsightVisible,
  isWidgetVisible,
  preferencesFromProfile,
} from "@/lib/dashboard-preferences";
import {
  type DashboardDistributionFilters,
  getBestPerformingPost,
  getDashboardStats,
  getDistributionPerformance,
  getRecentActivity,
  getTakeHomeSummary,
  getYourStorySnapshot,
} from "@/lib/data/dashboard";
import { listDistributionEntries } from "@/lib/data/distribution";
import { listProjects } from "@/lib/data/projects";
import { buildDashboardInsights } from "@/lib/insights/build-dashboard-insights";
import { isProPlan } from "@/lib/plan";
import { redirect } from "next/navigation";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import type { DistributionPlatform } from "@/types/momentum";

export const metadata: Metadata = {
  title: "Dashboard",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const PLATFORM_VALUES: Array<DistributionPlatform | "all"> = [
  "all",
  "reddit",
  "tiktok",
  "twitter",
  "product_hunt",
  "instagram",
  "youtube",
  "other",
];

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await requireSessionUser();
  const raw = await searchParams;
  const rawRange = one(raw.range);
  const range: DashboardDistributionFilters["range"] =
    rawRange === "7d" || rawRange === "30d" || rawRange === "all" || rawRange === "custom"
      ? rawRange
      : "30d";
  const rawPlatform = one(raw.platform);
  const platform: DistributionPlatform | "all" =
    rawPlatform && PLATFORM_VALUES.includes(rawPlatform as DistributionPlatform | "all")
      ? (rawPlatform as DistributionPlatform | "all")
      : "all";
  const from = one(raw.from) ?? "";
  const to = one(raw.to) ?? "";
  const profile = await getProfile(user.id);
  const isPro = isProPlan(profile?.plan ?? "free");
  const prefs = preferencesFromProfile(profile);

  if (!isPro && (range === "all" || range === "custom")) {
    const sp = new URLSearchParams();
    sp.set("range", "30d");
    sp.set("platform", platform);
    redirect(`/dashboard?${sp.toString()}`);
  }

  const filters: DashboardDistributionFilters = { range, platform, from, to };

  const [
    stats,
    entries,
    projects,
    activity,
    perf,
    bestPost,
    story,
    takeHome,
  ] = await Promise.all([
    getDashboardStats(user.id),
    listDistributionEntries(user.id, {}),
    listProjects(user.id),
    getRecentActivity(user.id, 4),
    getDistributionPerformance(user.id, filters, isPro),
    getBestPerformingPost(user.id),
    getYourStorySnapshot(user.id),
    getTakeHomeSummary(user.id),
  ]);

  const allInsights =
    stats.projectCount > 0
      ? buildDashboardInsights(entries, stats.distributionLast7Days)
      : [];
  const insights = allInsights.filter((i) => isInsightVisible(prefs, i.id));

  const hasProjects = stats.projectCount > 0;
  const bestPlatformLabel = bestPost
    ? DISTRIBUTION_PLATFORM_LABELS[bestPost.platform]
    : "No signal yet";
  const bestPlatformKey = bestPost?.platform;
  const lastActivityLabel =
    activity.length > 0
      ? formatDistanceToNow(new Date(activity[0]!.at), { addSuffix: true })
      : "No activity yet";
  const showTrends =
    hasProjects &&
    (isPro
      ? isWidgetVisible(prefs, "views_over_time") ||
        isWidgetVisible(prefs, "distribution_performance")
      : isWidgetVisible(prefs, "views_over_time"));

  const toolbar = (
    <DashboardToolbar
      hiddenWidgets={[...prefs.hiddenWidgets]}
      hiddenInsights={[...prefs.hiddenInsights]}
    />
  );

  const sectionLabelClass =
    "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`${story.totalPosts.toLocaleString()} posts · ${story.totalViews.toLocaleString()} views · last activity ${lastActivityLabel}`}
        action={toolbar}
      />
      <ProPlanNudge visible={stats.distributionCount >= 1 && !isPro} />

      {hasProjects ? (
        <>
          <section className="space-y-3">
            <h2 className={sectionLabelClass}>Today</h2>
            <ProductStateBar
              totalPosts={story.totalPosts}
              totalViews={story.totalViews}
              bestPlatformLabel={bestPlatformLabel}
              bestPlatformKey={bestPlatformKey}
              lastActivityLabel={lastActivityLabel}
              projects={projects}
              hasProjects={hasProjects}
            />
          </section>

          {showTrends ? (
            <section className="space-y-2.5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className={sectionLabelClass}>
                  <BarChart3 className="size-3.5 text-blue-500" />
                  Performance
                </h2>
                <DistributionFilterControls
                  isPro={isPro}
                  range={range}
                  platform={platform}
                  from={from}
                  to={to}
                  compact
                />
              </div>
              <DashboardAnalyticsStack
                isPro={isPro}
                selectedPlatform={platform}
                perf={perf}
                showFreeSummary={
                  !isPro &&
                  isWidgetVisible(prefs, "views_over_time")
                }
                showViewsOverTime={isWidgetVisible(prefs, "views_over_time")}
                showPerformanceTable={isWidgetVisible(prefs, "distribution_performance")}
              />
            </section>
          ) : null}

          {isWidgetVisible(prefs, "insights") ? (
            <section className="space-y-2.5">
              <h2 className={sectionLabelClass}>
                <Lightbulb className="size-3.5 text-amber-500" />
                Insights
              </h2>
              <DashboardWidgetFrame widgetId="insights">
                <DashboardInsightsSection
                  insights={insights}
                  totalGenerated={allInsights.length}
                  isPro={isPro}
                  projects={projects}
                />
              </DashboardWidgetFrame>
            </section>
          ) : null}

          <section className="space-y-2.5">
            <h2 className={sectionLabelClass}>
              <Sparkles className="size-3.5 text-blue-500" />
              Recent activity
            </h2>
            <ActivityFeed items={activity} />
          </section>

          {isWidgetVisible(prefs, "revenue") ? (
            <section className="space-y-1.5">
              <h2 className={sectionLabelClass}>Financials</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-3 py-2 text-[12px] text-zinc-600">
                <span>
                  Revenue: <span className="font-medium text-zinc-900">${takeHome.revenue.toLocaleString()}</span>
                </span>
                <span>
                  Expenses: <span className="font-medium text-zinc-900">${takeHome.costs.toLocaleString()}</span>
                </span>
                <span>
                  Take home:{" "}
                  <span className="font-semibold text-zinc-900">
                    ${takeHome.takeHome.toLocaleString()}
                  </span>
                </span>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="space-y-8">
          <ProductStateBar
            totalPosts={story.totalPosts}
            totalViews={story.totalViews}
            bestPlatformLabel={bestPlatformLabel}
            bestPlatformKey={bestPlatformKey}
            lastActivityLabel={lastActivityLabel}
            projects={projects}
            hasProjects={false}
          />
          {isWidgetVisible(prefs, "revenue") ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-200/80 bg-zinc-50/60 px-3 py-2 text-[12px] text-zinc-600">
              <span>
                Revenue: <span className="font-medium text-zinc-900">${takeHome.revenue.toLocaleString()}</span>
              </span>
              <span>
                Expenses: <span className="font-medium text-zinc-900">${takeHome.costs.toLocaleString()}</span>
              </span>
              <span>
                Take home:{" "}
                <span className="font-semibold text-zinc-900">
                  ${takeHome.takeHome.toLocaleString()}
                </span>
              </span>
            </div>
          ) : null}
          <EmptyState
            icon={<FolderKanban className="size-6" strokeWidth={1.6} />}
            title="Start by creating your first project"
            description="Track what you build and how you grow it"
            action={<CreateProjectDialog triggerLabel="Create your first project" />}
          />
        </div>
      )}

      <DashboardHiddenFooter
        hiddenWidgets={[...prefs.hiddenWidgets]}
        hiddenInsights={[...prefs.hiddenInsights]}
      />
    </div>
  );
}
