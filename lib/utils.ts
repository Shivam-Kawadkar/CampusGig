import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format integer paise as Indian Rupees. Money is ALWAYS stored as integer paise. */
export function formatINR(paise: number, opts?: { decimals?: boolean }): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(rupees);
}

/** Relative deadline label, e.g. "2d left", "5h left", "Overdue". */
export function deadlineLabel(deadline: Date | string): string {
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "Overdue";
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
