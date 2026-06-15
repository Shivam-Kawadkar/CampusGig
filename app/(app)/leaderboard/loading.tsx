import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Podium */}
      <div className="flex flex-col items-center justify-center pt-8 sm:flex-row sm:items-end sm:gap-6 max-w-3xl mx-auto">
        {[48, 60, 40].map((h, i) => (
          <div
            key={i}
            className="w-full max-w-[200px] rounded-xl border bg-card p-5 flex flex-col items-center gap-3 mt-6 sm:mt-0"
          >
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="w-full rounded-md" style={{ height: h }} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="rounded-xl border bg-card divide-y">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
