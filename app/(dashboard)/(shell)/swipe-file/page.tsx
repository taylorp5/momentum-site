import type { Metadata } from "next";
import { StickyNote } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Swipe File",
};

export default function SwipeFilePlaceholderPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Roadmap"
        title="Swipe File"
        description="Save hooks, landing patterns, and references — tagged and searchable across your portfolio."
      />
      <Card className="rounded-[11px] border border-dashed border-zinc-200/90 bg-zinc-50/30 py-0 shadow-none ring-0">
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-white text-zinc-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-zinc-200/80">
            <StickyNote className="size-6" strokeWidth={1.5} />
          </div>
          <p className="max-w-md text-[14px] leading-relaxed text-zinc-600">
            Planned as first-class content with project links and Supabase
            Storage for captures.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
