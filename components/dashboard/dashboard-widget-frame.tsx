"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { hideDashboardWidgetAction } from "@/app/actions/dashboard-preferences";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardWidgetId } from "@/lib/dashboard-preferences";
import { cn } from "@/lib/utils";

type Props = {
  widgetId: DashboardWidgetId;
  children: React.ReactNode;
  className?: string;
};

export function DashboardWidgetFrame({ widgetId, children, className }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onHide() {
    setPending(true);
    try {
      const res = await hideDashboardWidgetAction(widgetId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Card hidden — restore from the bottom of the dashboard or Customize.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("group/dw relative rounded-[inherit]", className)}>
      <div className="pointer-events-none absolute right-2 top-2 z-20 opacity-0 transition-opacity duration-200 group-hover/dw:pointer-events-auto group-hover/dw:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={pending}
            className={cn(
              "pointer-events-auto inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200/90 bg-white/95 text-zinc-600 shadow-sm backdrop-blur-sm outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400/40 disabled:pointer-events-none disabled:opacity-50"
            )}
            aria-label="Card options"
          >
            <MoreHorizontal className="size-4" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem
              className="rounded-lg text-[13px]"
              onClick={() => void onHide()}
            >
              Hide this card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
    </div>
  );
}
