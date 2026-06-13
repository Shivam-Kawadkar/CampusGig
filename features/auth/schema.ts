import { z } from "zod";

export const onboardingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(60, "Name is too long"),
  college: z.string().trim().min(2, "College is required").max(120),
  course: z.string().trim().min(2, "Course is required").max(120),
  yearOfStudy: z.coerce.number().int().min(1).max(6),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
  skills: z.array(z.string().trim().min(1)).max(15).default([]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
