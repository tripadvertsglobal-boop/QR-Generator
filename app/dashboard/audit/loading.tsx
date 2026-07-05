import Skeleton from "../../_components/Skeleton";

// Shown while the audit log is fetched.
export default function AuditLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Skeleton className="h-4 w-32" />
      <header className="mt-4 mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </main>
  );
}
