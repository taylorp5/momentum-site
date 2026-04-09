"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Upload, X } from "lucide-react";
import {
  createProjectAction,
  type CreateProjectActionResult,
} from "@/app/actions/projects";
import { ProjectAvatar } from "@/components/projects/project-avatar";
import { createProjectSchema } from "@/lib/validations/project";
import type { z } from "zod";
import { isMockDataMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import type { ProjectStatus } from "@/types/momentum";
import { toast } from "sonner";

type CreateProjectDialogProps = {
  triggerLabel?: string;
};

export function CreateProjectDialog({
  triggerLabel = "New project",
}: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  type ProjectFormValues = z.input<typeof createProjectSchema>;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "idea",
      logo_url: null,
      color: "#6366f1",
      icon: "",
    },
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      document.getElementById("create-project-name")?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  async function onSubmit(values: ProjectFormValues) {
    setPending(true);
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        setUploadingLogo(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You need to be signed in to upload a logo.");
          return;
        }
        const safeName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const objectPath = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from("project-logos")
          .upload(objectPath, logoFile, { upsert: false, cacheControl: "3600" });
        if (uploadErr) {
          toast.error(uploadErr.message);
          return;
        }
        const { data: pub } = supabase.storage.from("project-logos").getPublicUrl(objectPath);
        logoUrl = pub.publicUrl;
        setUploadingLogo(false);
      }

      const parsed = createProjectSchema.safeParse({
        ...values,
        logo_url: logoUrl,
        icon: values.icon?.trim() ? values.icon.trim() : null,
      });
      if (!parsed.success) {
        toast.error("Please fix the highlighted fields.");
        return;
      }
      const res: CreateProjectActionResult = await createProjectAction(
        parsed.data
      );
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Project created");
      setOpen(false);
      form.reset();
      setLogoFile(null);
      setLogoPreviewUrl(null);
      router.push(`/projects/${res.projectId}?new=1`);
      router.refresh();
    } finally {
      setUploadingLogo(false);
      setPending(false);
    }
  }

  const canSubmit =
    form.watch("name")?.trim().length > 0 && !pending && !uploadingLogo;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerMerge>
        <Button
          size="lg"
          className="h-9 rounded-lg px-4 text-[13px] font-semibold"
          disabled={isMockDataMode()}
          title={
            isMockDataMode()
              ? "Disable NEXT_PUBLIC_USE_MOCK_DATA to create projects"
              : undefined
          }
        >
          {triggerLabel}
        </Button>
      </DialogTriggerMerge>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            This can be an app, idea, or product.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="create-project-name">Name</Label>
            <Input
              id="create-project-name"
              autoComplete="off"
              className="rounded-lg border-zinc-200"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-red-600">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">One-liner</Label>
            <Textarea
              id="description"
              className="min-h-[80px] rounded-lg border-zinc-200"
              placeholder="What is it, and who is it for?"
              {...form.register("description")}
            />
          </div>
          <div className="space-y-2">
            <Label>Logo (optional)</Label>
            <div className="flex items-center gap-3">
              <ProjectAvatar
                name={form.watch("name") || "Project"}
                logoUrl={logoPreviewUrl}
                size="md"
              />
              <div className="flex flex-wrap gap-2">
                <Label
                  htmlFor="project-logo-file"
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Upload className="size-3.5" />
                  Upload logo
                </Label>
                {logoFile ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg text-[12px]"
                    onClick={() => setLogoFile(null)}
                  >
                    <X className="mr-1 size-3.5" />
                    Remove
                  </Button>
                ) : null}
                <Input
                  id="project-logo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) =>
                  form.setValue("status", v as ProjectStatus)
                }
              >
                <SelectTrigger className="rounded-lg border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Accent</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded-lg border-zinc-200 p-1"
                  value={form.watch("color")}
                  onChange={(e) => form.setValue("color", e.target.value)}
                />
                <Input
                  className="rounded-lg border-zinc-200 font-mono text-xs"
                  value={form.watch("color")}
                  onChange={(e) => form.setValue("color", e.target.value)}
                />
              </div>
              {form.formState.errors.color ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.color.message}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg" disabled={!canSubmit}>
              {pending || uploadingLogo ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  {uploadingLogo ? "Uploading logo…" : "Creating…"}
                </span>
              ) : (
                "Create & open"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
