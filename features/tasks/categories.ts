/** Mirrors the seeded categories in 0002_tasks.sql for UI use (filters, post form). */
export const TASK_CATEGORIES = [
  { name: "Design", slug: "design" },
  { name: "Coding", slug: "coding" },
  { name: "Writing", slug: "writing" },
  { name: "Tutoring", slug: "tutoring" },
  { name: "Photography", slug: "photography" },
  { name: "Marketing", slug: "marketing" },
  { name: "Data Entry", slug: "data-entry" },
  { name: "Translation", slug: "translation" },
] as const;

export type CategorySlug = (typeof TASK_CATEGORIES)[number]["slug"];
