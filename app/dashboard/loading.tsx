import Skeleton from "../_components/Skeleton";

// Shown while the dashboard's QR codes, folders, and tags are fetched. Mirrors
// the ledger's bands so the page does not reflow when the data lands.
export default function DashboardLoading() {
  return (
    <main>
      <div className="flex flex-col gap-2 border-b-2 border-border px-5 py-6 sm:px-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stat band */}
      <div className="grid grid-cols-2 border-b-2 border-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 border-border px-5 py-4 sm:px-8 lg:px-5 ${
              i % 2 === 0 ? "border-r" : ""
            } ${i === 1 ? "lg:border-r" : ""} ${i < 2 ? "border-b lg:border-b-0" : ""}`}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Create row */}
      <div className="flex flex-col gap-3 border-b-2 border-border bg-surface px-5 py-4 sm:px-8 lg:flex-row lg:items-end">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 lg:w-40" />
        <Skeleton className="h-9 lg:w-44" />
        <Skeleton className="h-9 lg:w-52" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Bulk bar + rows */}
      <div className="border-b border-border px-5 py-3 sm:px-8">
        <Skeleton className="h-5 w-28" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-border px-5 py-3 sm:px-8">
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </main>
  );
}
