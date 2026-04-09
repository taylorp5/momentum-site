import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSessionUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      {!isSupabaseConfigured() ? (
        <Alert className="rounded-xl border-zinc-200 bg-white">
          <AlertTitle>Configure Supabase</AlertTitle>
          <AlertDescription className="text-zinc-600">
            Add your Supabase URL and anon key to{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
              .env.local
            </code>{" "}
            before signing up.
          </AlertDescription>
        </Alert>
      ) : null}
      <SignupForm />
    </div>
  );
}
