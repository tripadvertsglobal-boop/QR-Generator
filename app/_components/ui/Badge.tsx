import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "gray" | "brand" | "emerald" | "blue" | "rose" | "amber";

const TONES: Record<BadgeTone, string> = {
  gray: "bg-black/[0.06] text-muted ring-black/10",
  brand: "bg-brand-tint text-brand ring-brand/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

type Props = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean };

const DOTS: Record<BadgeTone, string> = {
  gray: "bg-muted-2",
  brand: "bg-brand",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  rose: "bg-rose-500",
  amber: "bg-amber-500",
};

export default function Badge({ tone = "gray", dot = false, className, children, ...props }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
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
