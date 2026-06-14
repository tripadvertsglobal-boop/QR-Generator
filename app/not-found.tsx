import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        The page you’re looking for doesn’t exist.
      </p>
      <Link href="/dashboard" className="mt-2 text-sm text-blue-600 underline">
        Go to dashboard
      </Link>
    </main>
  );
}
