"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onboardingSchema, type OnboardingInput } from "../schema";
import { completeOnboarding } from "../actions";

export function OnboardingForm({
  defaultName,
  defaultEmail,
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { fullName: defaultName ?? "", yearOfStudy: 1, skills: [] },
  });

  async function onSubmit(values: OnboardingInput) {
    setSubmitting(true);
    const result = await completeOnboarding(values);
    if (result.ok) {
      toast.success("Profile complete — welcome to CampusGig! 🎉");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error("Couldn't save profile", { description: result.error });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Field label="Full name" error={errors.fullName?.message}>
        <Input placeholder="Aarav Sharma" {...register("fullName")} />
      </Field>

      {defaultEmail && (
        <Field label="Email">
          <Input value={defaultEmail} disabled />
        </Field>
      )}

      <Field label="Phone number" error={errors.phone?.message}>
        <Input placeholder="+91 98765 43210" type="tel" {...register("phone")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="College" error={errors.college?.message}>
          <Input placeholder="BMS College" {...register("college")} />
        </Field>
        <Field label="Course" error={errors.course?.message}>
          <Input placeholder="B.E. CSE" {...register("course")} />
        </Field>
      </div>

      <Field label="Year of study" error={errors.yearOfStudy?.message}>
        <select
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          {...register("yearOfStudy")}
        >
          {[1, 2, 3, 4, 5, 6].map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </select>
      </Field>

      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Complete profile
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
