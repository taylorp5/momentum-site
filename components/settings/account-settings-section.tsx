"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { updateProfileDisplayNameAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  displayName: string;
  email: string | null;
};

export function AccountSettingsSection({ displayName, email }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(displayName);
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setValue(displayName.trim() || "");
    setOpen(true);
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Add your name.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfileDisplayNameAction({
        display_name: trimmed,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Display name updated.");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const shown = displayName.trim() ? displayName.trim() : "—";

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Display name
            </p>
            <p className="text-[15px] font-medium text-zinc-950">{shown}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 rounded-lg text-[13px]"
            onClick={openEdit}
          >
            Edit
          </Button>
        </div>
        <div className="h-px bg-zinc-100" />
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Email
          </p>
          <p className="text-[15px] font-medium text-zinc-950">{email ?? "—"}</p>
          <p className="text-[12px] text-zinc-500">Email is managed by your sign-in provider.</p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit display name</DialogTitle>
            <DialogDescription>
              This is how you&apos;ll appear across Momentum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="settings-display-name">Display name</Label>
            <Input
              id="settings-display-name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={80}
              className="rounded-xl"
              autoComplete="name"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-lg"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
