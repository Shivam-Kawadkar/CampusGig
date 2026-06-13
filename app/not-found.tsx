import Link from "next/link";
import { Search, Home, ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative space-y-8 max-w-md">
        {/* 404 Number */}
        <div className="relative">
          <p className="text-[8rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card border shadow-lift">
              <Compass className="size-10 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Looks like this gig went missing! The page you&apos;re looking for doesn&apos;t
            exist or may have been removed.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="brand" className="gap-2">
            <Link href="/dashboard">
              <Home className="size-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/tasks">
              <Search className="size-4" />
              Browse Tasks
            </Link>
          </Button>
        </div>

        <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
          <Link href="javascript:history.back()">
            <ArrowLeft className="size-4" />
            Go back
          </Link>
        </Button>
      </div>
    </div>
  );
}
