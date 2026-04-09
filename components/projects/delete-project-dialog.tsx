"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  deleteProjectAction,
  type DeleteProjectActionResult,
} from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTriggerMerge } from "@/components/ui/dialog-trigger-merge";
import { Label } from "@/components/ui/label";
import { isMockDataMode } from "@/lib/env";
import type { Project } from "@/types/momentum";
import { toast } from "sonner";

type Props = {
  project: Project;
};

export function DeleteProjectDialog({ project }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmed(false);
    }
  }

  async function handleDelete() {
    if (!confirmed) return;
    if (isMockDataMode()) {
      toast.error("Demo mode is read-only. Turn off mock data to delete projects.");
      return;
    }
    setDeleting(true);
    try {
      const res: DeleteProjectActionResult = await deleteProjectAction({
        id: project.id,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Project deleted");
      setOpen(false);
      router.push("/projects");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTriggerMerge>
        <Button
          variant="outline"
          className="h-10 rounded-[10px] border-red-200/90 bg-white px-4 text-[13px] font-semibold text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 className="mr-1.5 size-3.5" />
          Delete project
        </Button>
      </DialogTriggerMerge>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this project?</DialogTitle>
          <DialogDescription className="pt-1 text-[14px] leading-relaxed text-zinc-600">
            You are about to permanently delete{" "}
            <span className="font-semibold text-zinc-900">{project.name}</span>. All timeline posts,
            distribution entries, work sessions, and other data tied to this project will be
            removed. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3.5">
          <input
            id="delete-project-confirm"
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <Label
            htmlFor="delete-project-confirm"
            className="cursor-pointer text-left text-[13px] font-normal leading-snug text-zinc-700"
          >
            I understand this project and all of its data will be permanently deleted.
          </Label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-lg"
            disabled={!confirmed || deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                Deleting…
              </span>
            ) : (
              "Delete project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
