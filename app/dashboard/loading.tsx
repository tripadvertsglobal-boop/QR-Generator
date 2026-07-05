import Skeleton from "../_components/Skeleton";

// Shown while the dashboard's QR codes, folders, and tags are fetched.
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </header>

      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="flex w-full flex-col gap-2 sm:w-48">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-6">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-8 w-64" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
