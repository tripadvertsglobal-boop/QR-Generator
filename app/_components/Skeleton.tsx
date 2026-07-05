// Pulsing placeholder block for content that is still loading. Size and shape
// it with `className` (height, width, rounding) at each call site.
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-black/10 dark:bg-white/10 ${className}`}
    />
  );
}
