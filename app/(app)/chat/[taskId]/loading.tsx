import { Skeleton } from "@/components/ui/skeleton";

export default function ChatThreadLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border bg-card">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-hidden p-5">
        {[
          "w-1/2",
          "w-2/3 ml-auto",
          "w-1/3",
          "w-3/5 ml-auto",
          "w-2/5",
        ].map((w, i) => (
          <Skeleton key={i} className={`h-12 rounded-2xl ${w}`} />
        ))}
      </div>

      {/* Composer */}
      <div className="border-t p-4">
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
