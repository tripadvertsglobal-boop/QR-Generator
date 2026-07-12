import Skeleton from "../../_components/Skeleton";

// Shown while the account page (user email) loads.
export default function AccountLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8 sm:px-8">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </header>
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
    </main>
  );
}
