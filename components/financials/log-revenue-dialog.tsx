"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { createLogEventAction } from "@/app/actions/timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTriggerMerge } from "@/components/ui/dialog-trigger-merge";
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
import { logEventSchema } from "@/lib/validations/timeline";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import type { Project } from "@/types/momentum";
import { toast } from "sonner";

function productProjectsSorted(projects: Project[]): Project[] {
  return [...projects]
    .filter((p) => !p.is_overhead)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
}

type LogRevenueDialogProps = {
  projects: Project[];
  /** When set (and valid), preselect this project when the dialog opens. */
  defaultProjectId?: string | null;
  children: ReactElement<Record<string, unknown>>;
};

export function LogRevenueDialog({
  projects,
  defaultProjectId,
  children,
}: LogRevenueDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const productProjects = useMemo(
    () => productProjectsSorted(projects),
    [projects]
  );

  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [source, setSource] = useState("");
  const [revenueKind, setRevenueKind] = useState<"one_time" | "recurring">(
    "one_time"
  );
  const [recurrenceLabel, setRecurrenceLabel] = useState("");
  const [notes, setNotes] = useState("");

  const selectedProject = productProjects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    setEntryDate(today);
    setAmount("");
    setSource("");
    setRevenueKind("one_time");
    setRecurrenceLabel("");
    setNotes("");
    const preferred =
      defaultProjectId &&
      productProjects.some((p) => p.id === defaultProjectId)
        ? defaultProjectId
        : productProjects[0]?.id ?? "";
    setProjectId(preferred);
  }, [open, defaultProjectId, productProjects]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured() || isMockDataMode()) {
      toast.error(
        isMockDataMode()
          ? "Preview mode is read-only."
          : "Connect Supabase to save revenue."
      );
      return;
    }
    const n = Number(amount.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (!projectId) {
      toast.error("Choose a project.");
      return;
    }
    const recurring = revenueKind === "recurring";
    if (recurring && !recurrenceLabel.trim()) {
      toast.error("Add a recurrence label (e.g. monthly).");
      return;
    }

    const payload = {
      type: "revenue" as const,
      project_id: projectId,
      entry_date: entryDate,
      amount: n,
      source: source.trim(),
      linked_distribution_entry_id: null as null,
      image_storage_path: null as null,
      description: notes.trim(),
      is_recurring: recurring,
      recurrence_label: recurring ? recurrenceLabel.trim() : null,
    };

    const parsed = logEventSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Check the form and try again.");
      return;
    }

    setPending(true);
    try {
      const res = await createLogEventAction(parsed.data);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Revenue logged", {
        description: "Financials and your project timeline are updated.",
      });
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const emptyPortfolio = productProjects.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerMerge>{children}</DialogTriggerMerge>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Log revenue
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-zinc-600">
            Record income against a project. It appears on the timeline and in
            Financials.
          </DialogDescription>
        </DialogHeader>
        {emptyPortfolio ? (
          <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[13px] text-amber-950">
            Create a product project first. Overhead is for shared expenses only.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="log-rev-project">Project</Label>
              <Select
                value={projectId || undefined}
                onValueChange={(v) => {
                  if (v) setProjectId(v);
                }}
              >
                <SelectTrigger id="log-rev-project" className="w-full">
                  <SelectValue placeholder="Choose project">
                    {selectedProject?.name ?? "Choose project"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {productProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-rev-amount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-zinc-500">
                  $
                </span>
                <Input
                  id="log-rev-amount"
                  inputMode="decimal"
                  className="pl-7 font-medium tabular-nums"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-rev-date">Date</Label>
              <Input
                id="log-rev-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-rev-source">
                Source{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </Label>
              <Input
                id="log-rev-source"
                placeholder="e.g. Gumroad, Stripe"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={revenueKind}
                onValueChange={(v) =>
                  setRevenueKind(v === "recurring" ? "recurring" : "one_time")
                }
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {revenueKind === "recurring" ? "Recurring" : "One-time"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {revenueKind === "recurring" ? (
              <div className="space-y-2">
                <Label htmlFor="log-rev-recurrence">Recurrence</Label>
                <Input
                  id="log-rev-recurrence"
                  placeholder="e.g. Monthly subscription"
                  value={recurrenceLabel}
                  onChange={(e) => setRecurrenceLabel(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="log-rev-notes">
                Notes{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </Label>
              <Textarea
                id="log-rev-notes"
                className="min-h-[88px] resize-y"
                placeholder="Context, invoice ref, or details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={pending}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save revenue"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
