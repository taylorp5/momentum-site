"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateTimelineEntryAction } from "@/app/actions/timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { FinancialRevenueEntry } from "@/lib/data/financial-intelligence";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";
import { toast } from "sonner";

type Props = {
  entry: FinancialRevenueEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function EditRevenueDialog({
  entry,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [source, setSource] = useState("");
  const [revenueKind, setRevenueKind] = useState<"one_time" | "recurring">(
    "one_time"
  );
  const [recurrenceLabel, setRecurrenceLabel] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!entry || !open) return;
    setAmount(String(entry.amount));
    setEntryDate(entry.entry_date.slice(0, 10));
    setSource(entry.revenue_source ?? "");
    setRevenueKind(entry.is_recurring ? "recurring" : "one_time");
    setRecurrenceLabel(entry.recurrence_label ?? "");
    setNotes(entry.description ?? "");
  }, [entry, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    if (!isSupabaseConfigured() || isMockDataMode()) {
      toast.error(
        isMockDataMode()
          ? "Preview mode is read-only."
          : "Connect Supabase to save changes."
      );
      return;
    }
    const n = Number(amount.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const recurring = revenueKind === "recurring";
    if (recurring && !recurrenceLabel.trim()) {
      toast.error("Add a recurrence label for recurring revenue.");
      return;
    }

    setPending(true);
    try {
      const res = await updateTimelineEntryAction({
        id: entry.id,
        project_id: entry.project_id,
        entry_date: entryDate,
        amount: n,
        revenue_source: source.trim(),
        is_recurring: recurring,
        recurrence_label: recurring ? recurrenceLabel.trim() : null,
        description: notes.trim(),
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Revenue updated");
      onOpenChange(false);
      onSaved();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Edit revenue
          </DialogTitle>
          <DialogDescription className="text-[13px] text-zinc-600">
            Changes apply to this timeline entry and Financials totals.
          </DialogDescription>
        </DialogHeader>
        {entry ? (
          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-1 rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2 text-[13px] text-zinc-700">
              <span className="font-medium text-zinc-900">Project</span>
              <p>{entry.project_name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rev-amount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-zinc-500">
                  $
                </span>
                <Input
                  id="edit-rev-amount"
                  inputMode="decimal"
                  className="pl-7 font-medium tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rev-date">Date</Label>
              <Input
                id="edit-rev-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rev-source">
                Source{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </Label>
              <Input
                id="edit-rev-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={pending}
                placeholder="e.g. Gumroad"
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
                <Label htmlFor="edit-rev-recurrence">Recurrence</Label>
                <Input
                  id="edit-rev-recurrence"
                  value={recurrenceLabel}
                  onChange={(e) => setRecurrenceLabel(e.target.value)}
                  disabled={pending}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="edit-rev-notes">
                Notes{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </Label>
              <Textarea
                id="edit-rev-notes"
                className="min-h-[88px] resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={pending}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
