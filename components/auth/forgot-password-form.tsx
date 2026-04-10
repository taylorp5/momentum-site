"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseMisconfigurationMessage } from "@/lib/supabase/json-response-errors";
import { isSupabaseConfigured } from "@/lib/env";
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

const schema = z.object({
  email: z.string().email("Enter a valid email."),
});

type FormValues = z.infer<typeof schema>;

const authInputClass =
  "h-11 w-full rounded-xl border-zinc-200 bg-white px-3.5 text-[15px] shadow-sm placeholder:text-zinc-400 focus-visible:border-primary/55 focus-visible:ring-[3px] focus-visible:ring-primary/18 md:text-[15px]";

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!isSupabaseConfigured()) {
      toast.error(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env, then restart."
      );
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}&type=recovery`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password reset link sent. Check your email.");
      form.reset({ email: "" });
    } catch (e) {
      const misconfig = getSupabaseMisconfigurationMessage(e);
      if (misconfig) {
        toast.error(misconfig);
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to send reset email.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.25)] backdrop-blur-sm">
      <CardHeader className="space-y-2 px-8 pb-0 pt-9 text-center sm:text-left">
        <CardTitle className="text-[1.65rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[1.75rem]">
          Reset your password
        </CardTitle>
        <CardDescription className="text-[13px] leading-relaxed text-zinc-500">
          Enter your account email and we will send a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-8 pb-9 pt-8">
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-[13px] font-medium text-zinc-700">
              Email
            </Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={authInputClass}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl text-[15px] font-semibold"
          >
            {submitting ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
        <p className="border-t border-zinc-100 pt-6 text-center text-[14px] text-zinc-500">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
