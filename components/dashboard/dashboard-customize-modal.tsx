"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { applyDashboardLayoutAction } from "@/app/actions/dashboard-preferences";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DASHBOARD_CUSTOMIZE_WIDGET_IDS,
  DASHBOARD_WIDGET_LABELS,
  type DashboardWidgetId,
} from "@/lib/dashboard-preferences";
import { cn } from "@/lib/utils";

type Props = {
  hiddenWidgets: string[];
  hiddenInsights: string[];
};

function ToggleRow({
  label,
  on,
  onToggle,
  disabled,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[13px] text-zinc-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "relative h-7 w-11 shrink-0 rounded-full transition-colors duration-200",
          on ? "bg-zinc-900" : "bg-zinc-200",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform duration-200",
            on ? "left-[calc(100%-1.625rem)]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

export function DashboardCustomizeModal({
  hiddenWidgets: initialHiddenWidgets,
  hiddenInsights: initialHiddenInsights,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const customizeIds = useMemo(
    () => new Set<string>(DASHBOARD_CUSTOMIZE_WIDGET_IDS),
    []
  );

  const [hidden, setHidden] = useState(() => new Set(initialHiddenWidgets));

  function resetFromProps() {
    setHidden(new Set(initialHiddenWidgets));
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) resetFromProps();
  }

  function toggleWidget(id: DashboardWidgetId) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSave() {
    setPending(true);
    try {
      const merged = new Set(
        initialHiddenWidgets.filter((id) => !customizeIds.has(id))
      );
      for (const id of DASHBOARD_CUSTOMIZE_WIDGET_IDS) {
        if (hidden.has(id)) merged.add(id);
        else merged.delete(id);
      }

      const res = await applyDashboardLayoutAction({
        hidden_widgets: [...merged],
        hidden_insights: [...initialHiddenInsights],
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Dashboard updated");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-lg border-[#eeeeee] text-[13px] font-medium text-zinc-700 shadow-none transition-colors hover:bg-zinc-50"
        onClick={() => onOpenChange(true)}
      >
        Customize dashboard
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md"
          showCloseButton
        >
          <DialogHeader className="border-b border-zinc-100 px-5 py-4 text-left">
            <DialogTitle className="text-[15px] font-semibold text-zinc-950">
              Customize dashboard
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Choose which sections appear. Hidden cards stay in your preferences
              until you show them again.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-zinc-100 px-5">
            {DASHBOARD_CUSTOMIZE_WIDGET_IDS.map((id) => (
              <ToggleRow
                key={id}
                label={DASHBOARD_WIDGET_LABELS[id]}
                on={!hidden.has(id)}
                onToggle={() => toggleWidget(id)}
                disabled={pending}
              />
            ))}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg text-[13px]"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-lg bg-zinc-900 text-[13px] hover:bg-zinc-800"
              disabled={pending}
              onClick={() => void onSave()}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
