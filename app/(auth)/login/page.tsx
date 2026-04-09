import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSessionUser } from "@/lib/auth/user";
import { isMockDataMode, isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
};

function pickString(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s === "" ? undefined : s;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const sp = await searchParams;
  const err = pickString(sp.error);
  const callbackErrorMessage =
    err === "config"
      ? "Email sign-in could not finish — check that Supabase URL and anon key are set on the server."
      : err === "auth"
        ? "That sign-in link expired or was already used. Request a new one."
        : null;

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      {callbackErrorMessage ? (
        <Alert className="rounded-xl border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Sign-in issue</AlertTitle>
          <AlertDescription>{callbackErrorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {isMockDataMode() ? (
        <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-950">
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            You are viewing sample data. Set{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_USE_MOCK_DATA=false
            </code>{" "}
            and configure Supabase to use a real account.
          </AlertDescription>
        </Alert>
      ) : null}
      {!isSupabaseConfigured() && !isMockDataMode() ? (
        <Alert className="rounded-xl border-zinc-200 bg-white">
          <AlertTitle>Configure Supabase</AlertTitle>
          <AlertDescription className="text-zinc-600">
            Copy{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
              .env.example
            </code>{" "}
            to{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
              .env.local
            </code>{" "}
            and add your project URL and anon key. For a UI-only preview, set{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_USE_MOCK_DATA=true
            </code>
            .
          </AlertDescription>
        </Alert>
      ) : null}
      <LoginForm />
    </div>
  );
}
