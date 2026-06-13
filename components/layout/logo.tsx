import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  /** Size scale for the logo mark and typography */
  size?: "sm" | "md" | "lg";
  /** Invert colors for use on dark/colored backgrounds */
  invert?: boolean;
}

export function Logo({
  className,
  showText = true,
  size = "md",
  invert = false,
}: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      {/* SVG Icon Mark */}
      <svg
        viewBox="0 0 32 32"
        className={cn(
          size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9",
          "shrink-0 select-none shadow-sm rounded-lg"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#D946EF" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
        {/* Stylized graduation cap */}
        <path d="M6 14L16 9L26 14L16 19L6 14Z" fill="white" />
        <path
          d="M11 16.5V21.5C11 22.5 13 24.5 16 24.5C19 24.5 21 22.5 21 21.5V16.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Stylized lightning bolt / G sparkle */}
        <path
          d="M15 13L17 16H13.5L15.5 19.5"
          stroke="url(#logo-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span
          className={cn(
            "font-sans font-extrabold tracking-tight select-none",
            size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl"
          )}
        >
          <span className={cn(invert ? "text-white" : "text-foreground")}>Campus</span>
          <span
            className={cn(
              invert
                ? "text-white/95"
                : "bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-fuchsia-400"
            )}
          >
            Gig
          </span>
        </span>
      )}
    </Link>
  );
}
