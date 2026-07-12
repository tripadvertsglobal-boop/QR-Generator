import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// Shared field styling for text-like controls: hairline border, soft focus ring,
// comfortable height, muted placeholder.
const CONTROL =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground " +
  "placeholder:text-muted-2 shadow-[inset_0_1px_1px_rgba(16,16,40,0.02)] " +
  "transition-colors focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, "h-9 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-[13px] font-medium text-foreground", className)} {...props}>
      {children}
    </label>
  );
}

// Label + control + optional hint/error, stacked. Keeps forms consistent.
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
