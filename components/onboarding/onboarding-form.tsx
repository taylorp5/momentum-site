"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { completeOnboardingAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({
  display_name: z.string().min(1, "Add your name").max(80),
});

type FormValues = z.infer<typeof schema>;

export function OnboardingForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: initialName },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const res = await completeOnboardingAction(values);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("You are all set.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="rounded-2xl border-zinc-200/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Your name</CardTitle>
        <CardDescription>
          Shown in the header and on shared exports later on.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            className="rounded-lg border-zinc-200"
            {...form.register("display_name")}
          />
          {form.formState.errors.display_name ? (
            <p className="text-xs text-red-600">
              {form.formState.errors.display_name.message}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 hover:bg-zinc-800"
            disabled={pending}
          >
            {pending ? "Saving…" : "Continue to dashboard"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
