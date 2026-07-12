import Skeleton from "../../_components/Skeleton";

// Shown while a QR code's details, scan chart, and geography load.
export default function QrDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </header>

      <Skeleton className="mb-8 h-52 w-full rounded-xl" />
      <Skeleton className="mb-8 h-80 w-full rounded-xl" />

      <div className="grid gap-6 sm:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </main>
  );
}
