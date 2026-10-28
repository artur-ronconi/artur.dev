import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 " +
  "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-strong text-base-950 hover:bg-accent shadow-[0_8px_24px_-12px_var(--color-accent-strong)]",
  secondary: "bg-base-700 text-ink hover:bg-base-600 border border-line-strong",
  outline: "border border-line-strong text-ink hover:border-accent hover:text-accent bg-transparent",
  ghost: "text-ink-muted hover:text-ink hover:bg-base-800",
  danger: "bg-rose/15 text-rose border border-rose/40 hover:bg-rose/25",
};

const sizes: Record<Size, string> = {
  sm: "text-[13px] h-8 px-3",
  md: "text-sm h-10 px-4",
  lg: "text-[15px] h-12 px-6",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

type ExternalButtonLinkProps = ComponentProps<"a"> & {
  variant?: Variant;
  size?: Size;
};

export function ExternalButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ExternalButtonLinkProps) {
  return (
    <a
      {...props}
      target={props.target ?? "_blank"}
      rel={props.rel ?? "noopener noreferrer"}
      className={buttonClass(variant, size, className)}
    />
  );
}
