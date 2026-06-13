import { z } from "zod";

export const feedbackSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(80),
  email: z
    .union([z.string().trim().email("Enter a valid email"), z.literal("")])
    .optional(),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  message: z
    .string()
    .trim()
    .min(5, "A little more detail, please")
    .max(1000),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
