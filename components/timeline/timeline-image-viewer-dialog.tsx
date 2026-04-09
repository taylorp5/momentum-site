"use client";

import { useCallback, useState } from "react";
import { Download, ExternalLink, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function filenameFromStoragePath(path: string | null | undefined): string {
  if (!path?.trim()) return "momentum-image.png";
  const seg = path.split("/").pop()?.trim();
  if (!seg) return "momentum-image.png";
  return seg.includes(".") ? seg : `${seg}.png`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Signed URL for display and download */
  imageUrl: string;
  /** Storage path (e.g. bucket object key) for download filename */
  imageStoragePath: string | null;
  title: string;
  description: string | null;
  entryDate: string;
};

export function TimelineImageViewerDialog({
  open,
  onOpenChange,
  imageUrl,
  imageStoragePath,
  title,
  description,
  entryDate,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const dateLabel = format(new Date(entryDate), "MMMM d, yyyy");
  const downloadName = filenameFromStoragePath(imageStoragePath);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch(imageUrl, { mode: "cors" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn’t download the image. Try “Open full image”.");
    } finally {
      setDownloading(false);
    }
  }, [imageUrl, downloadName]);

  const handleOpenFull = useCallback(() => {
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }, [imageUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[min(92vh,900px)] gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1024px)]",
          "rounded-2xl border-zinc-200/90"
        )}
      >
        <DialogHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-zinc-100 bg-zinc-50/90 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 space-y-1 pr-2 text-left">
            <DialogTitle className="text-base font-semibold leading-snug text-zinc-900 sm:text-lg">
              {title.trim() || "Timeline image"}
            </DialogTitle>
            <p className="text-[12px] font-medium tabular-nums text-zinc-500">{dateLabel}</p>
            {description?.trim() ? (
              <p className="max-h-24 overflow-y-auto text-[13px] leading-relaxed text-zinc-600">
                {description.trim()}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg text-[12px]"
              disabled={downloading}
              onClick={() => void handleDownload()}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
              )}
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg text-[12px]"
              onClick={handleOpenFull}
            >
              <ExternalLink className="mr-1.5 size-3.5" strokeWidth={1.75} />
              Open full image
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="size-4" strokeWidth={1.75} />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex max-h-[min(75vh,720px)] min-h-[200px] items-center justify-center bg-zinc-950/5 px-3 py-4 sm:px-6 sm:py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title.trim() || "Timeline image"}
            className="max-h-[min(75vh,720px)] w-auto max-w-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
