import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Surface container — a 2px ruled box on the page ground. The rule is what
// separates it, not lift. Padding is left to the caller so cards can hold both
// padded content and edge-to-edge lists.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-2 border-border bg-background", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b-2 border-border bg-surface px-5 py-4", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
