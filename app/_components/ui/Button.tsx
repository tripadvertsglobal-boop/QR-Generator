import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import Spinner from "@/app/_components/Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 " +
  "focus-visible:ring-offset-1 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground shadow-card hover:bg-brand-hover",
  secondary: "border border-border bg-surface text-foreground shadow-card hover:bg-black/[0.03]",
  ghost: "text-muted hover:bg-black/[0.05] hover:text-foreground",
  danger: "bg-rose-600 text-white shadow-card hover:bg-rose-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
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
