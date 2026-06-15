import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cover + avatar */}
      <div className="relative rounded-2xl border bg-card overflow-hidden">
        <Skeleton className="h-32 w-full rounded-none" />
        <div className="px-6 pb-6">
          <Skeleton className="-mt-10 h-20 w-20 rounded-full border-4 border-card" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Reputation stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Skills + reviews */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
