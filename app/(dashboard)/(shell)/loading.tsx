import { Card, CardContent } from "@/components/ui/card";

export default function ShellLoading() {
  return (
    <div className="space-y-8 p-1">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-md bg-zinc-200/80" />
        <div className="h-9 max-w-md animate-pulse rounded-lg bg-zinc-100" />
        <div className="h-4 max-w-xl animate-pulse rounded-md bg-zinc-100" />
      </div>
      <Card className="rounded-xl border-zinc-200/70 bg-white">
        <CardContent className="p-6">
          <div className="h-[320px] animate-pulse rounded-[10px] bg-zinc-50" />
        </CardContent>
      </Card>
    </div>
  );
}
