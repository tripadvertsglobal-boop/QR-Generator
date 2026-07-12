import Skeleton from "../../_components/Skeleton";

// Shown while API keys are fetched.
export default function KeysLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </header>

      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
