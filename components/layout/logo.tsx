import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  // Full wordmark (mark + "CampusGig" + tagline)
  if (showText) {
    return (
      <Link href="/" className={cn("flex items-center", className)}>
        <Image
          src="/logo.png"
          alt="CampusGig"
          width={160}
          height={65}
          priority
          className="h-9 w-auto"
        />
      </Link>
    );
  }

  // Compact G-mark only
  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <Image
        src="/icon.png"
        alt="CampusGig"
        width={36}
        height={36}
        priority
        className="h-9 w-9 rounded-lg shadow-soft"
      />
    </Link>
  );
}
