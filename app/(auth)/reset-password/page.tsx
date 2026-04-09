import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <ResetPasswordForm />
    </div>
  );
}
