import Skeleton from "../../_components/Skeleton";

// Shown while a QR code's details, scan chart, and geography load.
export default function QrDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Skeleton className="h-4 w-32" />

      <header className="mt-4 mb-8 flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-40" />
      </header>

      <section className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start">
        <Skeleton className="h-44 w-44 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
      </section>

      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </main>
  );
}
