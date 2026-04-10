"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  costRecurringContextLine,
  localCalendarTodayIso,
} from "@/lib/cost-recurrence";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
import { DeleteTimelineEntryDialog } from "@/components/timeline/delete-timeline-entry-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CostEventRow } from "@/lib/data/costs";
import type { Project } from "@/types/momentum";

type CostsViewProps = {
  summary: {
    totalSpendThisMonth: number;
    recurringSubscriptionsThisMonth: number;
    oneTimeSpendThisMonth: number;
    categoryBreakdown: Array<{ category: string; total: number }>;
  };
  rows: CostEventRow[];
  projects: Project[];
  categories: string[];
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function qString(
  q: string,
  project: string,
  category: string,
  type: "all" | "recurring" | "one_time",
  from: string,
  to: string
) {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (project !== "all") p.set("project", project);
  if (category !== "all") p.set("category", category);
  if (type !== "all") p.set("type", type);
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  return p.toString();
}

export function CostsView({ summary, rows, projects, categories }: CostsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const todayIso = useMemo(() => localCalendarTodayIso(), []);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const project = searchParams.get("project") ?? "all";
  const category = searchParams.get("category") ?? "all";
  const type = (searchParams.get("type") as "all" | "recurring" | "one_time" | null) ?? "all";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const projectModels = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        description: p.description,
        status: p.status,
        color: p.color,
        icon: p.icon,
        is_overhead: p.is_overhead,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    [projects]
  );

  const sortedExpenseProjects = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const ao = a.is_overhead ? 1 : 0;
        const bo = b.is_overhead ? 1 : 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }),
    [projects]
  );

  const projectFilterLabel =
    project === "all"
      ? "All projects"
      : (projects.find((p) => p.id === project)?.name ?? "Unknown project");

  function apply(
    next: Partial<{
      q: string;
      project: string;
      category: string;
      type: "all" | "recurring" | "one_time";
      from: string;
      to: string;
    }>
  ) {
    const search = qString(
      next.q ?? query,
      next.project ?? project,
      next.category ?? category,
      next.type ?? type,
      next.from ?? from,
      next.to ?? to
    );
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname);
    });
  }

  const ledgerCard = (
    <Card className="rounded-xl border-zinc-300/80 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-zinc-950/[0.04] transition-colors hover:border-zinc-300">
      <CardHeader className="border-b border-zinc-200/90 px-6 pb-4 pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-[18px] font-semibold tracking-tight text-zinc-950">
              Expense ledger
            </CardTitle>
            <p className="text-[14px] leading-relaxed text-zinc-600">
              Every spend line tied to your projects. Filter by project, category, type, and date
              to quickly understand where money is going.
            </p>
          </div>
          <LogEventDialog projects={projectModels} defaultEventType="cost">
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-md border-zinc-300 text-[13px] font-medium"
            >
              Log expense
            </Button>
          </LogEventDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-6 py-5">
        <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-zinc-600">
            Filters
          </p>
          <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label className="text-[11px] font-medium text-zinc-600">Search</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => apply({ q: query })}
                placeholder="Notes or description"
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-medium text-zinc-600">Project</Label>
            <Select value={project} onValueChange={(v) => apply({ project: v ?? "all" })}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Project">{projectFilterLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {sortedExpenseProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] font-medium text-zinc-600">Category</Label>
            <Select value={category} onValueChange={(v) => apply({ category: v ?? "all" })}>
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] font-medium text-zinc-600">Type</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                apply({ type: (v ?? "all") as "all" | "recurring" | "one_time" })
              }
            >
              <SelectTrigger className="mt-1 h-10">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2" />
          <div>
            <Label className="text-[11px] font-medium text-zinc-600">From</Label>
            <Input
              type="date"
              className="mt-1 h-10"
              value={from}
              onChange={(e) => apply({ from: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-[11px] font-medium text-zinc-600">To</Label>
            <Input
              type="date"
              className="mt-1 h-10"
              value={to}
              onChange={(e) => apply({ to: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="h-10 w-full"
              onClick={() => {
                setQuery("");
                apply({ q: "", project: "all", category: "all", type: "all", from: "", to: "" });
              }}
            >
              Reset filters
            </Button>
          </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white text-zinc-600 ring-1 ring-zinc-200/80">
              <CreditCard className="size-5" strokeWidth={1.6} />
            </div>
            <div className="max-w-xl">
              <p className="text-[20px] font-semibold tracking-tight text-zinc-900">
                No expenses logged yet
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
                Track tools, subscriptions, ads, or anything you&apos;re spending to build your project.
              </p>
            </div>
            <LogEventDialog projects={projectModels} defaultEventType="cost">
              <Button className="h-10 rounded-lg px-5 text-[13px] font-semibold">
                Log your first expense
              </Button>
            </LogEventDialog>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200/90">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="min-w-[240px]">Expense</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-zinc-50"
                    onClick={() => router.push(`/projects/${row.project_id}?tab=timeline`)}
                  >
                    <TableCell className="text-zinc-600">
                      {format(new Date(row.entry_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-zinc-900">
                      <p className="text-[13px] font-semibold leading-snug tracking-tight">
                                               <span className="text-zinc-950">
                          {projects.find((p) => p.id === row.project_id)?.name ??
                            row.project_name}
                        </span>
                        <span className="font-normal text-zinc-400"> · </span>
                        <span className="tabular-nums">{money.format(row.amount)}</span>
                        <span className="font-normal text-zinc-400"> · </span>
                        <span className="font-medium capitalize text-zinc-800">
                          {row.category ?? "Uncategorized"}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[380px] truncate text-[13px] text-zinc-600">
                      {row.description || row.title}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {row.billing_type === "monthly" ? (
                            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900">
                              Monthly
                            </span>
                          ) : null}
                          {row.billing_type === "yearly" ? (
                            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-900">
                              Yearly
                            </span>
                          ) : null}
                          {row.billing_type !== "one_time" ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                              Recurring
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900">
                              One-time
                            </span>
                          )}
                        </div>
                        {(() => {
                          const line = costRecurringContextLine(row, todayIso);
                          return line ? (
                            <p className="text-[11px] leading-snug text-zinc-500">
                              {line}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DeleteTimelineEntryDialog
                        entryId={row.id}
                        projectId={row.project_id}
                        previewTitle={`${money.format(row.amount)} — ${row.category ?? "Expense"}`}
                        onDeleted={() => router.refresh()}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pending ? <p className="text-[12px] text-zinc-500">Updating filters…</p> : null}
      </CardContent>
    </Card>
  );

  const monthSnapshot = (
    <section className="space-y-5">
      <div className="border-b border-zinc-200/90 pb-3">
        <h2 className="text-[16px] font-semibold tracking-[0.02em] text-zinc-900">
          This month at a glance
        </h2>
        <p className="mt-1 text-[14px] text-zinc-600">
          Your spending snapshot this month, rolled up from the ledger.
        </p>
        {project !== "all" ? (
          <p className="mt-2 text-[13px] font-medium text-zinc-800">
            Filtered to <span className="text-zinc-950">{projectFilterLabel}</span> — totals match
            the ledger below.
          </p>
        ) : null}
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Total spend this month
            </p>
            <p className="mt-2 tabular-nums text-[2rem] font-semibold leading-none tracking-tight text-zinc-950">
              {money.format(summary.totalSpendThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Recurring subscriptions
            </p>
            <p className="mt-2 tabular-nums text-[1.5rem] font-semibold text-zinc-950">
              {money.format(summary.recurringSubscriptionsThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              One-time spend
            </p>
            <p className="mt-2 tabular-nums text-[1.5rem] font-semibold text-zinc-950">
              {money.format(summary.oneTimeSpendThisMonth)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CardHeader className="border-b border-zinc-100/90 px-5 pb-3 pt-4">
          <CardTitle className="text-[14px] font-semibold tracking-tight text-zinc-950">
            By category (this month)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {summary.categoryBreakdown.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-zinc-500">No categories yet this month.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.categoryBreakdown.map((item) => (
                <li key={item.category} className="flex items-center justify-between px-5 py-3">
                  <span className="capitalize text-[13px] text-zinc-700">{item.category}</span>
                  <span className="tabular-nums text-[13px] font-semibold text-zinc-950">
                    {money.format(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Spending"
        title="Expenses"
        description="Track and manage everything you spend on your project"
        action={
          projects.length > 0 ? (
            <LogEventDialog projects={projectModels} defaultEventType="cost">
              <Button size="lg" className="h-10 rounded-lg px-5 text-[13px] font-semibold">
                Log expense
              </Button>
            </LogEventDialog>
          ) : null
        }
      />
      <div className="space-y-10">
        {monthSnapshot}
        {ledgerCard}
      </div>
    </div>
  );
}
