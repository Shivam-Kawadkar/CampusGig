"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error tracking service in production
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      {/* Decorative */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative space-y-8 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-card shadow-lift">
            <AlertTriangle className="size-10 text-destructive" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We hit an unexpected error. This has been logged and we&apos;ll look into it.
            {error.digest && (
              <span className="block mt-2 font-mono text-xs text-muted-foreground/60">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="brand" className="gap-2">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <Home className="size-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
