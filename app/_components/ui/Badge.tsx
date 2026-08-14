import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "gray" | "brand" | "emerald" | "blue" | "rose" | "amber";

// Square, flat, unringed — the system carries state in fill and ink, not in
// outline. `emerald` is the live state and so takes the accent; `blue` is the
// loudest non-live state and inverts to solid ink.
const TONES: Record<BadgeTone, string> = {
  gray: "bg-neutral-200 text-neutral-800",
  brand: "bg-accent-100 text-accent-800",
  emerald: "bg-accent-100 text-accent-800",
  blue: "bg-foreground text-background",
  rose: "bg-accent-200 text-accent-800",
  amber: "bg-neutral-300 text-neutral-900",
};

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean };

const DOTS: Record<BadgeTone, string> = {
  gray: "bg-neutral-600",
  brand: "bg-brand",
  emerald: "bg-brand",
  blue: "bg-background",
  rose: "bg-accent-700",
  amber: "bg-neutral-700",
};

export default function Badge({ tone = "gray", dot = false, className, children, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.02em]",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}
