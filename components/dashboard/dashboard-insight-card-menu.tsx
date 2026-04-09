"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { hideDashboardInsightAction } from "@/app/actions/dashboard-preferences";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  insightId: string;
};

export function DashboardInsightCardMenu({ insightId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onHide() {
    setPending(true);
    try {
      const res = await hideDashboardInsightAction(insightId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Insight hidden");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-400/40 disabled:pointer-events-none disabled:opacity-50"
        )}
        aria-label="Insight options"
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
  );
}
