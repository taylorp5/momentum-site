"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseMisconfigurationMessage } from "@/lib/supabase/json-response-errors";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(8, "Use at least 8 characters."),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

const authInputClass =
  "h-11 w-full rounded-xl border-zinc-200 bg-white px-3.5 text-[15px] shadow-sm placeholder:text-zinc-400 focus-visible:border-primary/55 focus-visible:ring-[3px] focus-visible:ring-primary/18 md:text-[15px]";

export function ResetPasswordForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. You can sign in now.");
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      const misconfig = getSupabaseMisconfigurationMessage(e);
      if (misconfig) {
        toast.error(misconfig);
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to reset password.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.25)] backdrop-blur-sm">
      <CardHeader className="space-y-2 px-8 pb-0 pt-9 text-center sm:text-left">
        <CardTitle className="text-[1.65rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[1.75rem]">
          Set a new password
        </CardTitle>
        <CardDescription className="text-[13px] leading-relaxed text-zinc-500">
          Choose a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-8 pb-9 pt-8">
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-[13px] font-medium text-zinc-700">
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={authInputClass}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-[13px] font-medium text-zinc-700">
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={authInputClass}
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm ? (
              <p className="text-xs text-red-600">{form.formState.errors.confirm.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl text-[15px] font-semibold"
          >
            {submitting ? "Saving…" : "Update password"}
          </Button>
        </form>
        <p className="border-t border-zinc-100 pt-6 text-center text-[14px] text-zinc-500">
          Need a new link?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Send another reset email
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
