"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTimelineEntryAction } from "@/app/actions/timeline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  entryId: string;
  projectId: string;
  /** Shown in the confirmation copy (e.g. entry title). */
  previewTitle: string;
  disabled?: boolean;
  onDeleted: () => void;
};

export function DeleteTimelineEntryDialog({
  entryId,
  projectId,
  previewTitle,
  disabled = false,
  onDeleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (disabled) return;
    setDeleting(true);
    try {
      const res = await deleteTimelineEntryAction({
        id: entryId,
        project_id: projectId,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Event deleted");
      setOpen(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  const short =
    previewTitle.trim().length > 120
      ? `${previewTitle.trim().slice(0, 117)}…`
      : previewTitle.trim() || "this event";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-lg border-red-200/90 text-[12px] text-red-700 hover:bg-red-50 hover:text-red-800"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1 size-3.5" strokeWidth={1.75} />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this timeline event?</DialogTitle>
            <DialogDescription className="pt-1 text-[14px] leading-relaxed text-zinc-600">
              <span className="font-medium text-zinc-800">{short}</span> will be
              removed permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              disabled={deleting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-lg bg-red-600 hover:bg-red-700"
              disabled={deleting || disabled}
              onClick={() => void handleDelete()}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
