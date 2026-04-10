"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateTimelineEntryAction } from "@/app/actions/timeline";
import { DeleteTimelineEntryDialog } from "@/components/timeline/delete-timeline-entry-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DISTRIBUTION_PLATFORM_LABELS } from "@/lib/constants";
import { PLATFORM_ORDER } from "@/lib/platform-config";
import type { BuildProgressKind } from "@/lib/validations/timeline";
import type {
  CostBillingType,
  DistributionPlatform,
  TimelineEntry,
} from "@/types/momentum";

const COST_CATEGORIES = [
  "ads",
  "tools",
  "subscriptions",
  "contractor",
  "other",
] as const;

function buildSubtypeToKind(
  st: string | null | undefined
): BuildProgressKind {
  switch (st) {
    case "build_idea":
      return "idea";
    case "build_milestone":
      return "milestone";
    case "ship_update":
      return "shipped";
    case "build_note":
    default:
      return "progress";
  }
}

export type TimelineEntryForEdit = TimelineEntry & {
  image_signed_url: string | null;
};

function initialEntryDateOnForm(e: TimelineEntryForEdit): string {
  if (e.type !== "cost") return e.entry_date.slice(0, 10);
  const rec =
    e.billing_type === "monthly" ||
    e.billing_type === "yearly" ||
    Boolean(e.is_recurring);
  if (rec) {
    return (
      e.recurring_start_date?.slice(0, 10) ?? e.entry_date.slice(0, 10)
    );
  }
  return e.entry_date.slice(0, 10);
}

function initialCostBilling(e: TimelineEntryForEdit): CostBillingType {
  if (e.type !== "cost") return "one_time";
  if (e.billing_type === "yearly") return "yearly";
  if (e.billing_type === "monthly" || e.is_recurring) return "monthly";
  return "one_time";
}

export type ExpenseProjectOption = {
  id: string;
  name: string;
  is_overhead?: boolean;
};

type Props = {
  entry: TimelineEntryForEdit;
  /** When set, cost entries can be reassigned to another project (e.g. overhead). */
  expenseProjectOptions?: ExpenseProjectOption[];
  disabled?: boolean;
  onCancel: () => void;
  onSaved: () => void;
  /** Called after a successful delete (dialog already shows a toast). */
  onDeleted: () => void;
};

export function TimelineEntryEditForm({
  entry,
  expenseProjectOptions,
  disabled = false,
  onCancel,
  onSaved,
  onDeleted,
}: Props) {
  const [pending, setPending] = useState(false);
  const [entryDate, setEntryDate] = useState(() =>
    initialEntryDateOnForm(entry)
  );
  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description ?? "");
  const [externalUrl, setExternalUrl] = useState(entry.external_url ?? "");
  const [platform, setPlatform] = useState<DistributionPlatform>(
    (entry.platform ?? "other") as DistributionPlatform
  );
  const [subreddit, setSubreddit] = useState(entry.subreddit ?? "");
  const [amount, setAmount] = useState(
    entry.amount != null ? String(entry.amount) : ""
  );
  const [category, setCategory] = useState(entry.category ?? "");
  const [revenueSource, setRevenueSource] = useState(entry.revenue_source ?? "");
  const [revenueRecurring, setRevenueRecurring] = useState(
    Boolean(entry.is_recurring)
  );
  const [revenueRecurrenceLabel, setRevenueRecurrenceLabel] = useState(
    entry.recurrence_label ?? ""
  );
  const [partnerName, setPartnerName] = useState(entry.partner_name ?? "");
  const [sharePct, setSharePct] = useState(
    entry.revenue_share_percentage != null
      ? String(entry.revenue_share_percentage)
      : ""
  );
  const [costTitleOverride, setCostTitleOverride] = useState("");
  const [workDurationSec, setWorkDurationSec] = useState(() => {
    if (entry.type !== "work") return "3600";
    const m = entry.event_metadata as Record<string, unknown> | null | undefined;
    const d =
      m && typeof m.duration_seconds === "number"
        ? m.duration_seconds
        : 3600;
    return String(Math.max(60, d));
  });
  const [workKind, setWorkKind] = useState<
    "timer_session" | "manual_time_entry"
  >(
    entry.event_subtype === "timer_session"
      ? "timer_session"
      : "manual_time_entry"
  );
  const [buildKind, setBuildKind] = useState<BuildProgressKind>(() =>
    entry.type === "build" ? buildSubtypeToKind(entry.event_subtype) : "progress"
  );
  const [costProjectId, setCostProjectId] = useState(entry.project_id);
  const [costBilling, setCostBilling] = useState<CostBillingType>(() =>
    initialCostBilling(entry)
  );
  const [costRecurringEnd, setCostRecurringEnd] = useState(
    entry.type === "cost"
      ? (entry.recurring_end_date?.slice(0, 10) ?? "")
      : ""
  );
  const [costRecurringActive, setCostRecurringActive] = useState(
    entry.type === "cost" ? entry.recurring_active !== false : true
  );

  useEffect(() => {
    setCostProjectId(entry.project_id);
  }, [entry.id, entry.project_id]);

  useEffect(() => {
    setEntryDate(initialEntryDateOnForm(entry));
    setCostBilling(initialCostBilling(entry));
    if (entry.type === "cost") {
      setCostRecurringEnd(entry.recurring_end_date?.slice(0, 10) ?? "");
      setCostRecurringActive(entry.recurring_active !== false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gate on id/updated_at so parent entry ref identity does not reset the form
  }, [entry.id, entry.updated_at, entry.type]);

  useEffect(() => {
    setRevenueRecurring(Boolean(entry.is_recurring));
    setRevenueRecurrenceLabel(entry.recurrence_label ?? "");
    setRevenueSource(entry.revenue_source ?? "");
  }, [entry.id, entry.is_recurring, entry.recurrence_label, entry.revenue_source]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setPending(true);
    try {
      const base = {
        id: entry.id,
        project_id: entry.project_id,
        entry_date: entryDate,
        description,
      };

      let payload: Record<string, unknown> = base;

      switch (entry.type) {
        case "note":
        case "insight":
        case "snapshot":
          payload = { ...base, title: title.trim() };
          break;
        case "build": {
          const desc = description.trim();
          if (!desc) {
            toast.error("Add a description.");
            return;
          }
          payload = {
            ...base,
            description: desc,
            build_kind: buildKind,
            ...(title.trim() ? { title: title.trim() } : {}),
          };
          break;
        }
        case "link":
        case "experiment":
          payload = {
            ...base,
            title: title.trim(),
            external_url: externalUrl.trim(),
          };
          break;
        case "distribution":
          payload = {
            ...base,
            title: title.trim(),
            external_url: externalUrl.trim(),
            platform,
            subreddit: platform === "reddit" ? subreddit.trim() || null : null,
          };
          break;
        case "cost": {
          const n = Number(amount.replace(/[$,\s]/g, ""));
          if (!Number.isFinite(n) || n < 0) {
            toast.error("Enter a valid amount.");
            return;
          }
          const targetPid = expenseProjectOptions?.length
            ? costProjectId
            : entry.project_id;
          if (
            expenseProjectOptions?.length &&
            !expenseProjectOptions.some((p) => p.id === targetPid)
          ) {
            toast.error("Choose a valid project.");
            return;
          }
          if (costBilling !== "one_time" && !entryDate.trim()) {
            toast.error("Start date is required for subscriptions.");
            return;
          }
          const endTrim = costRecurringEnd.trim();
          if (entryDate && endTrim && endTrim < entryDate) {
            toast.error("End date must be on or after start.");
            return;
          }
          payload = {
            ...base,
            entry_date: entryDate,
            project_id: targetPid,
            amount: n,
            category: category.trim(),
            cost_title_override: costTitleOverride.trim() || undefined,
            billing_type: costBilling,
            recurring_start_date:
              costBilling === "one_time" ? null : entryDate,
            recurring_end_date:
              costBilling !== "one_time" && endTrim ? endTrim : null,
            recurring_active:
              costBilling === "one_time" ? true : costRecurringActive,
          };
          break;
        }
        case "revenue": {
          const n = Number(amount);
          if (!Number.isFinite(n) || n < 0) {
            toast.error("Enter a valid amount.");
            return;
          }
          if (revenueRecurring && !revenueRecurrenceLabel.trim()) {
            toast.error("Add a recurrence label for recurring revenue.");
            return;
          }
          payload = {
            ...base,
            amount: n,
            revenue_source: revenueSource.trim(),
            is_recurring: revenueRecurring,
            recurrence_label: revenueRecurring
              ? revenueRecurrenceLabel.trim()
              : null,
          };
          break;
        }
        case "deal": {
          const n = Number(sharePct);
          if (!Number.isFinite(n) || n < 0 || n > 100) {
            toast.error("Value must be between 0 and 100.");
            return;
          }
          payload = {
            ...base,
            partner_name: partnerName.trim(),
            revenue_share_percentage: n,
          };
          break;
        }
        case "work": {
          const secs = Math.floor(Number(workDurationSec) || 0);
          if (!Number.isFinite(secs) || secs < 60) {
            toast.error("Duration must be at least 60 seconds (1 minute).");
            return;
          }
          payload = {
            ...base,
            title: title.trim(),
            duration_seconds: secs,
            work_session_kind: workKind,
          };
          break;
        }
        default:
          toast.error("This event type cannot be edited here.");
          return;
      }

      const res = await updateTimelineEntryAction(payload);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      onSaved();
    } finally {
      setPending(false);
    }
  }

  const showTitle =
    entry.type === "work" ||
    entry.type === "note" ||
    entry.type === "insight" ||
    entry.type === "snapshot" ||
    entry.type === "build" ||
    entry.type === "link" ||
    entry.type === "experiment" ||
    entry.type === "distribution";

  const showUrl =
    entry.type === "link" ||
    entry.type === "experiment" ||
    entry.type === "distribution";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-3 rounded-lg border border-zinc-200/90 bg-zinc-50/50 p-3"
    >
      <div className="space-y-1">
        <Label className="text-[11px] text-zinc-600">Date</Label>
        <Input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          disabled={disabled || pending}
          required
        />
      </div>

      {showTitle ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-600">
            Title
            {entry.type === "build" ? (
              <span className="font-normal text-zinc-400"> (optional)</span>
            ) : null}
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled || pending}
            required={entry.type !== "build"}
          />
        </div>
      ) : null}

      {entry.type === "build" ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-600">Kind</Label>
          <Select
            value={buildKind}
            onValueChange={(v) => setBuildKind(v as BuildProgressKind)}
            disabled={disabled || pending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {entry.type === "work" ? (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Duration (seconds)</Label>
            <Input
              type="number"
              min={60}
              step={60}
              value={workDurationSec}
              onChange={(e) => setWorkDurationSec(e.target.value)}
              disabled={disabled || pending}
              required
            />
            <p className="text-[11px] text-zinc-500">
              Minimum 60 seconds. Title usually stays in &quot;Worked 1h 30m&quot; form.
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Entry type</Label>
            <Select
              value={workKind}
              onValueChange={(v) =>
                setWorkKind(v as "timer_session" | "manual_time_entry")
              }
              disabled={disabled || pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timer_session">Timer session</SelectItem>
                <SelectItem value="manual_time_entry">Manual time entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}

      {entry.type === "distribution" ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-600">Platform</Label>
          <Select
            value={platform}
            onValueChange={(v) => setPlatform(v as DistributionPlatform)}
            disabled={disabled || pending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_ORDER.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {DISTRIBUTION_PLATFORM_LABELS[opt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {entry.type === "distribution" && platform === "reddit" ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-600">
            Subreddit <span className="font-normal text-zinc-400">(optional)</span>
          </Label>
          <Input
            value={subreddit}
            onChange={(e) => setSubreddit(e.target.value)}
            placeholder="e.g. SaaS"
            disabled={disabled || pending}
          />
        </div>
      ) : null}

      {showUrl ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-600">
            {entry.type === "distribution" ? "Post URL" : "URL"}
          </Label>
          <Input
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            disabled={disabled || pending}
            required={entry.type === "link" || entry.type === "distribution"}
          />
        </div>
      ) : null}

      {entry.type === "cost" ? (
        <>
          {expenseProjectOptions?.length ? (
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-600">Project</Label>
              <Select
                value={costProjectId}
                onValueChange={(v) => setCostProjectId(v ?? entry.project_id)}
                disabled={disabled || pending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Project">
                    {expenseProjectOptions.find((p) => p.id === costProjectId)
                      ?.name ?? "Project"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {expenseProjectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-zinc-500">
                $
              </span>
              <Input
                className="pl-7"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={disabled || pending}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Category</Label>
            <Select
              value={category || undefined}
              onValueChange={(v) => setCategory(v ?? "")}
              disabled={disabled || pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Billing type</Label>
            <Select
              value={costBilling}
              onValueChange={(v) => setCostBilling(v as CostBillingType)}
              disabled={disabled || pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {costBilling !== "one_time" ? (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] text-zinc-600">
                  End date{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={costRecurringEnd}
                  onChange={(e) => setCostRecurringEnd(e.target.value)}
                  disabled={disabled || pending}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-800">
                <input
                  type="checkbox"
                  className="size-4 rounded border-zinc-300"
                  checked={costRecurringActive}
                  onChange={(e) => setCostRecurringActive(e.target.checked)}
                  disabled={disabled || pending}
                />
                Active
              </label>
            </>
          ) : null}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">
              Custom title <span className="font-normal text-zinc-400">(optional)</span>
            </Label>
            <Input
              value={costTitleOverride}
              onChange={(e) => setCostTitleOverride(e.target.value)}
              placeholder="Overrides auto title from amount + category"
              disabled={disabled || pending}
            />
          </div>
        </>
      ) : null}

      {entry.type === "revenue" ? (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Amount</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled || pending}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">
              Source{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </Label>
            <Input
              value={revenueSource}
              onChange={(e) => setRevenueSource(e.target.value)}
              placeholder="e.g. Gumroad"
              disabled={disabled || pending}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Type</Label>
            <Select
              value={revenueRecurring ? "recurring" : "one_time"}
              onValueChange={(v) => setRevenueRecurring(v === "recurring")}
              disabled={disabled || pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {revenueRecurring ? (
            <div className="space-y-1">
              <Label className="text-[11px] text-zinc-600">Recurrence</Label>
              <Input
                value={revenueRecurrenceLabel}
                onChange={(e) => setRevenueRecurrenceLabel(e.target.value)}
                placeholder="e.g. Monthly"
                disabled={disabled || pending}
                required
              />
            </div>
          ) : null}
        </>
      ) : null}

      {entry.type === "deal" ? (
        <>
          <p className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-600">
            Revenue share modeling is coming soon. Edits here still update your timeline entry.
          </p>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Deal name</Label>
            <Input
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              disabled={disabled || pending}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-600">Revenue share % · Coming soon</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={sharePct}
              onChange={(e) => setSharePct(e.target.value)}
              disabled={disabled || pending}
              required
            />
          </div>
        </>
      ) : null}

      <div className="space-y-1">
        <Label className="text-[11px] text-zinc-600">Description / notes</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled || pending}
          rows={4}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <DeleteTimelineEntryDialog
          entryId={entry.id}
          projectId={entry.project_id}
          previewTitle={entry.title}
          disabled={disabled || pending}
          onDeleted={onDeleted}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={disabled || pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
