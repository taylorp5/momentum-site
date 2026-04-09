"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { LogEventDialog } from "@/components/timeline/log-event-dialog";
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
    estimatedTakeHomeImpact: number;
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
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
    [projects]
  );

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
    <Card className="rounded-lg border-zinc-300/80 bg-white py-0 shadow-sm ring-1 ring-zinc-950/[0.04]">
      <CardHeader className="border-b border-zinc-200/90 px-5 pb-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-[15px] font-semibold tracking-tight text-zinc-950">
              Expense ledger
            </CardTitle>
            <p className="text-[12px] leading-relaxed text-zinc-600">
              Every spend line you have logged. Use filters for project, category,{" "}
              <span className="font-medium text-zinc-700">recurring vs one-time</span>, and dates.
            </p>
          </div>
          <LogEventDialog projects={projectModels} defaultEventType="cost">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-md border-zinc-300 text-[12px] font-medium"
            >
              Log expense
            </Button>
          </LogEventDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-4">
        <div className="grid gap-2 md:grid-cols-5">
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
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
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
              <SelectTrigger className="mt-1">
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
              <SelectTrigger className="mt-1">
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
        <div className="grid gap-2 md:grid-cols-5">
          <div className="md:col-span-2" />
          <div>
            <Label className="text-[11px] font-medium text-zinc-600">From</Label>
            <Input
              type="date"
              className="mt-1"
              value={from}
              onChange={(e) => apply({ from: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-[11px] font-medium text-zinc-600">To</Label>
            <Input
              type="date"
              className="mt-1"
              value={to}
              onChange={(e) => apply({ to: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setQuery("");
                apply({ q: "", project: "all", category: "all", type: "all", from: "", to: "" });
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-white text-zinc-600 ring-1 ring-zinc-200/80">
              <CreditCard className="size-5" strokeWidth={1.6} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-zinc-900">No expenses in this view</p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
                Log an expense to build your ledger. Try widening filters if you expected rows here.
              </p>
            </div>
            <LogEventDialog projects={projectModels} defaultEventType="cost">
              <Button className="rounded-lg">Log expense</Button>
            </LogEventDialog>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200/90">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-zinc-50/70"
                    onClick={() => router.push(`/projects/${row.project_id}?tab=timeline`)}
                  >
                    <TableCell className="text-zinc-600">
                      {format(new Date(row.entry_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium text-zinc-900">{row.project_name}</TableCell>
                    <TableCell className="capitalize text-zinc-700">
                      {row.category ?? "uncategorized"}
                    </TableCell>
                    <TableCell className="max-w-[420px] truncate text-zinc-600">
                      {row.description || row.title}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-zinc-950">
                      {money.format(row.amount)}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {row.is_recurring ? "Recurring" : "One-time"}
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
    <section className="space-y-4">
      <div className="border-b border-zinc-200/90 pb-2">
        <h2 className="text-[13px] font-semibold text-zinc-900">This month at a glance</h2>
        <p className="mt-0.5 text-[12px] text-zinc-500">
          Quick totals from calendar-month expenses — same data as the ledger, rolled up.
        </p>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Total spend this month
            </p>
            <p className="mt-2 tabular-nums text-[1.5rem] font-semibold text-zinc-950">
              {money.format(summary.totalSpendThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Recurring subscriptions
            </p>
            <p className="mt-2 tabular-nums text-[1.5rem] font-semibold text-zinc-950">
              {money.format(summary.recurringSubscriptionsThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              One-time spend
            </p>
            <p className="mt-2 tabular-nums text-[1.5rem] font-semibold text-zinc-950">
              {money.format(summary.oneTimeSpendThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
              Estimated take-home impact
            </p>
            <p className="mt-2 tabular-nums text-[1.5rem] font-semibold text-zinc-950">
              {money.format(summary.estimatedTakeHomeImpact)}
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
        {ledgerCard}
        {monthSnapshot}
      </div>
    </div>
  );
}
