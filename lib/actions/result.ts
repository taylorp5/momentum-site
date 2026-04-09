import type { ZodError } from "zod";

export type ActionResult =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string[]> };

export const READ_ONLY_MOCK_ERROR =
  "Demo mode is read-only. Configure Supabase and set NEXT_PUBLIC_USE_MOCK_DATA=false.";

export const SUPABASE_REQUIRED_ERROR =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export function validationError(
  error: ZodError
): ActionResult & { error: string } {
  return {
    error: "Validation failed",
    fieldErrors: zodFieldErrors(error),
  };
}
