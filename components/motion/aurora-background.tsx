import { cn } from "@/lib/utils";

/**
 * Animated aurora / mesh-gradient backdrop. CSS-only animation (reduced-motion
 * safe via the global media rule). Render as the FIRST child of a `relative
 * overflow-hidden` container, then place content in a `relative` wrapper so it
 * paints on top.
 */
export function AuroraBackground({
  className,
  blobs = true,
}: {
  className?: string;
  blobs?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-mesh opacity-70" />
      {blobs && (
        <>
          <div
            className="absolute -left-24 -top-20 h-72 w-72 rounded-full blur-3xl animate-blob"
            style={{ backgroundColor: "hsl(var(--brand-1) / 0.30)" }}
          />
          <div
            className="absolute right-0 top-10 h-80 w-80 rounded-full blur-3xl animate-blob [animation-delay:3s]"
            style={{ backgroundColor: "hsl(var(--brand-2) / 0.28)" }}
          />
          <div
            className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl animate-blob [animation-delay:6s]"
            style={{ backgroundColor: "hsl(var(--brand-3) / 0.26)" }}
          />
        </>
      )}
    </div>
  );
}
