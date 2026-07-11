import Skeleton from "../../_components/Skeleton";

// Shown while the audit log is fetched — mirrors the grouped-card layout.
export default function AuditLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Skeleton className="h-4 w-32" />
      <header className="mt-4 mb-8 flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>

      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, g) => (
          <section key={g}>
            <Skeleton className="mb-2 h-3 w-24" />
            <div className="divide-y divide-black/[0.07] overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3.5">
                  <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-3 w-14" />
                    </div>
                    <Skeleton className="mt-2 h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
