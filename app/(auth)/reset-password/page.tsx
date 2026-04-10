import type { Metadata } from "next";
import { ResetPasswordSessionBridge } from "@/components/auth/reset-password-session-bridge";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <ResetPasswordSessionBridge />
      <ResetPasswordForm />
    </div>
  );
}
