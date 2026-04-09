"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Pencil, Upload, X } from "lucide-react";
import {
  updateProjectAction,
  type UpdateProjectActionResult,
} from "@/app/actions/projects";
import { ProjectAvatar } from "@/components/projects/project-avatar";
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
import { createClient } from "@/lib/supabase/client";
import { updateProjectSchema } from "@/lib/validations/project";
import type { Project, ProjectStatus } from "@/types/momentum";
import { toast } from "sonner";
import type { z } from "zod";

type Props = {
  project: Project;
};

export function EditProjectDialog({ project }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  type FormValues = z.input<typeof updateProjectSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      logo_url: project.logo_url,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      logo_url: project.logo_url,
    });
    setLogoFile(null);
    setLogoRemoved(false);
  }, [open, project, form]);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    project.logo_url ?? null
  );
  useEffect(() => {
    if (logoRemoved) {
      setLogoPreviewUrl(null);
      return;
    }
    if (!logoFile) {
      setLogoPreviewUrl(form.watch("logo_url") ?? project.logo_url ?? null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoRemoved, logoFile, project.logo_url, form]);

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      let logoUrl = logoRemoved ? null : (values.logo_url ?? null);
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
        const objectPath = `${user.id}/${project.id}/${Date.now()}-${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from("project-logos")
          .upload(objectPath, logoFile, { upsert: false, cacheControl: "3600" });
        if (uploadErr) {
          toast.error(uploadErr.message);
          return;
        }
        logoUrl = supabase.storage.from("project-logos").getPublicUrl(objectPath).data.publicUrl;
      }

      const res: UpdateProjectActionResult = await updateProjectAction({
        id: project.id,
        name: values.name,
        description: values.description ?? "",
        status: values.status,
        logo_url: logoUrl,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Project updated");
      setOpen(false);
      router.refresh();
    } finally {
      setUploadingLogo(false);
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTriggerMerge>
        <Button variant="outline" className="h-10 rounded-[10px] border-zinc-200/90 px-4 text-[13px] font-semibold">
          <Pencil className="mr-1.5 size-3.5" />
          Edit project
        </Button>
      </DialogTriggerMerge>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>Refine details and personalize your project identity.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">Name</Label>
            <Input id="edit-project-name" className="rounded-lg border-zinc-200" {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-project-description">Description</Label>
            <Textarea id="edit-project-description" className="min-h-[80px] rounded-lg border-zinc-200" {...form.register("description")} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as ProjectStatus)}>
              <SelectTrigger className="rounded-lg border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Logo (optional)</Label>
            <div className="flex items-center gap-3">
              <ProjectAvatar name={form.watch("name") || project.name} logoUrl={logoPreviewUrl} size="md" />
              <div className="flex flex-wrap gap-2">
                <Label htmlFor="edit-project-logo-file" className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50">
                  <Upload className="size-3.5" />
                  Upload logo
                </Label>
                {(logoFile || (!logoRemoved && (form.watch("logo_url") || project.logo_url))) ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg text-[12px]"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoRemoved(true);
                      form.setValue("logo_url", null);
                    }}
                  >
                    <X className="mr-1 size-3.5" />
                    Remove
                  </Button>
                ) : null}
                <Input
                  id="edit-project-logo-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setLogoFile(file);
                    setLogoRemoved(false);
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg" disabled={pending || uploadingLogo}>
              {pending || uploadingLogo ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  {uploadingLogo ? "Uploading logo…" : "Saving…"}
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
