import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <ForgotPasswordForm />
    </div>
  );
}
