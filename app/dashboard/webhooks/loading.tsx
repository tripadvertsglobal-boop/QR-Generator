import Skeleton from "../../_components/Skeleton";

// Shown while webhooks are fetched.
export default function WebhooksLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Skeleton className="h-4 w-32" />
      <header className="mt-4 mb-8 flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </header>

      <Skeleton className="h-36 w-full rounded-lg" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </main>
  );
}
