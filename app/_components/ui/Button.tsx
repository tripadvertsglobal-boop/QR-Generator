import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import Spinner from "@/app/_components/Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-none font-extrabold whitespace-nowrap " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:bg-brand-hover active:bg-accent-700",
  secondary:
    "border border-border text-foreground hover:bg-foreground/[0.07] active:bg-foreground/[0.14]",
  ghost: "text-brand hover:bg-brand/10 active:bg-brand/[0.18]",
  // The system has one red, so destructive takes the deepest step of the ramp —
  // same family as primary, visibly heavier, never mistaken for it.
  danger: "bg-accent-700 text-brand-foreground hover:bg-accent-800",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

// Shared class recipe so links styled as buttons stay identical to <Button>.
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
