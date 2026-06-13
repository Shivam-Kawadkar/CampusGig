import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-36 rounded-lg" />

      {/* Cover + avatar card */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Skeleton className="h-32 w-full" />
        <div className="relative px-6 pb-6">
          <div className="absolute -top-12 left-6">
            <Skeleton className="h-24 w-24 rounded-full border-4 border-card" />
          </div>
          <div className="pt-16 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 md:col-span-1">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <Skeleton className="h-4 w-28" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b last:border-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <Skeleton className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6 md:col-span-2">
          {/* Bio */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Skills */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-16" />
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-44" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
