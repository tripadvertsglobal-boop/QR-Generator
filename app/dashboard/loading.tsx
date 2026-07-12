import Skeleton from "../_components/Skeleton";

// Shown while the dashboard's QR codes, folders, and tags are fetched.
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex w-full flex-col gap-2 lg:w-56">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-8 w-64 rounded-full" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
