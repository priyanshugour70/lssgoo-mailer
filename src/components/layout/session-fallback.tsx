import { Skeleton } from "@/components/ui/skeleton";

export function SessionFallback() {
  return (
    <div role="status" aria-label="Loading workspace" className="flex min-h-svh md:pl-sidebar">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
