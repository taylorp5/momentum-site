"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg rounded-xl border-red-200/80 bg-white">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <div className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="size-5" strokeWidth={1.75} />
        </div>
        <CardTitle className="text-lg font-semibold text-zinc-900">
          Something went wrong
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-[14px] leading-relaxed text-zinc-600">
        <p>
          This page hit an unexpected error. You can retry or go back to the
          dashboard.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => reset()}
            className="rounded-[10px] bg-zinc-900 hover:bg-zinc-800"
          >
            Try again
          </Button>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-[10px]")}
          >
            Dashboard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
