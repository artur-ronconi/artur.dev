import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-lg border border-line bg-base-900 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 " +
  "disabled:opacity-60 aria-[invalid=true]:border-rose/60";

export function Label({ children, htmlFor, hint, required }: {
  children: ReactNode;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[13px] font-medium text-ink">
        {children}
        {required ? <span className="ml-1 text-rose">*</span> : null}
      </span>
      {hint ? <span className="text-[11.5px] text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-[12.5px] text-rose">
      {children}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  description,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <Label htmlFor={htmlFor} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {description && !error ? (
        <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">{description}</p>
      ) : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(controlClass, className)} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(controlClass, "min-h-[110px] resize-y", className)} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select {...props} className={cn(controlClass, "appearance-none pr-8", className)}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; description?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5", className)}>
      <input
        type="checkbox"
        {...props}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line bg-base-900 accent-[var(--color-accent-strong)]"
      />
      <span>
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description ? <span className="block text-[12px] text-ink-faint">{description}</span> : null}
      </span>
    </label>
  );
}
