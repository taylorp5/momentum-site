"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
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
import { AuthOAuthDivider, GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

const authInputClass =
  "h-11 w-full rounded-xl border-zinc-200 bg-white px-3.5 text-[15px] shadow-sm placeholder:text-zinc-400 focus-visible:border-primary/55 focus-visible:ring-[3px] focus-visible:ring-primary/18 md:text-[15px]";

export function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!isSupabaseConfigured()) {
      toast.error(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env, then restart the dev server."
      );
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      const misconfig = getSupabaseMisconfigurationMessage(e);
      if (misconfig) {
        toast.error(misconfig);
        return;
      }
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.25)] backdrop-blur-sm">
      <CardHeader className="space-y-2 px-8 pb-0 pt-9 text-center sm:text-left">
        <CardTitle className="text-[1.65rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[1.75rem]">
          Welcome back
        </CardTitle>
        <CardDescription className="text-[13px] leading-relaxed text-zinc-500">
          Sign in to continue building momentum on your projects.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8 px-8 pb-9 pt-8">
        <div className="space-y-5">
          <GoogleOAuthButton
            disabled={submitting}
            next="/dashboard"
            idleLabel="Sign in with Google"
            loadingLabel="Signing in with Google…"
            ariaLabel="Sign in with Google"
            onBusyChange={setOauthBusy}
          />
          <AuthOAuthDivider />
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] font-medium text-zinc-700">
              Email
            </Label>
            <Input
              id="email"
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className="text-[13px] font-medium text-zinc-700">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-[12px] font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={cn(authInputClass, "pr-11")}
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" strokeWidth={1.75} />
                ) : (
                  <Eye className="size-[18px]" strokeWidth={1.75} />
                )}
              </button>
            </div>
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={submitting || oauthBusy}
            className="mt-1 h-12 w-full rounded-xl text-[15px] font-semibold shadow-sm shadow-black/[0.06]"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="border-t border-zinc-100 pt-7 text-center text-[14px] text-zinc-500">
          No account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
