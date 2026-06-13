import { z } from "zod";

/** Budget entered in rupees by the user; converted to integer paise for storage. */
export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(120, "Title is too long"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the task in at least 20 characters")
    .max(5000, "Description is too long"),
  categorySlug: z.string().min(1, "Pick a category"),
  budgetRupees: z.coerce
    .number()
    .min(10, "Minimum budget is ₹10")
    .max(50000, "Maximum budget is ₹50,000"),
  deadline: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), "Deadline must be in the future"),
  skills: z.array(z.string().trim().min(1)).max(8).default([]),
  attachmentUrls: z.array(z.string().url()).max(5).default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const taskFiltersSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  minBudget: z.coerce.number().optional(),
  maxBudget: z.coerce.number().optional(),
  sort: z.enum(["newest", "budget_high", "budget_low", "deadline"]).default("newest"),
});

export type TaskFilters = z.infer<typeof taskFiltersSchema>;

export const createProposalSchema = z.object({
  bidAmountRupees: z.coerce
    .number()
    .min(10, "Minimum bid is ₹10")
    .max(100000, "Maximum bid is ₹1,00,000"),
  message: z
    .string()
    .trim()
    .max(1000, "Message is too long")
    .optional(),
  estimatedDelivery: z.coerce
    .date()
    .refine((d) => d.getTime() > Date.now(), "Delivery date must be in the future"),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;

