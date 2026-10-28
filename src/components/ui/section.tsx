import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

export function SectionHeading({
  label,
  title,
  description,
  action,
  className,
}: {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {label ? (
          <p className="rule-label mb-3 flex items-center gap-2">
            <span aria-hidden className="inline-block h-px w-6 bg-accent/60" />
            {label}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-[15px]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Reveal>
  );
}

export function Section({
  id,
  children,
  className,
  bordered = true,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20 lg:px-10",
        bordered && "border-t border-line",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}
