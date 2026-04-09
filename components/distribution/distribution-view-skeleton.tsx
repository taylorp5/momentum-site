import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export function DistributionViewSkeleton() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Growth"
        title="Distribution"
        description="Loading your ledger…"
      />
      <Card className="rounded-[11px] border-zinc-200/90 bg-white py-0 shadow-[0_1px_2px_rgba(15,23,42,0.035)] ring-0">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center">
            <div className="h-9 flex-1 animate-pulse rounded-lg bg-zinc-100 lg:max-w-md" />
            <div className="flex gap-2">
              <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-100 sm:w-[196px]" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-100 sm:w-[196px]" />
            </div>
          </div>
          <div className="h-[260px] animate-pulse rounded-lg bg-zinc-50/80" />
        </CardContent>
      </Card>
    </div>
  );
}
