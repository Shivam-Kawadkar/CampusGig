import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-primary-foreground shadow-soft">
        <GraduationCap className="size-5" />
      </div>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Campus<span className="text-gradient-brand">Gig</span>
        </span>
      )}
    </Link>
  );
}
