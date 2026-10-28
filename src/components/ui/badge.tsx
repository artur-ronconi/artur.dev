import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "emerald" | "amber" | "violet" | "rose";

const tones: Record<Tone, string> = {
  neutral: "bg-base-800 text-ink-muted border-line",
  accent: "bg-accent-soft text-accent border-accent/30",
  emerald: "bg-emerald/10 text-emerald border-emerald/30",
  amber: "bg-amber/10 text-amber border-amber/30",
  violet: "bg-violet/10 text-violet border-violet/30",
  rose: "bg-rose/10 text-rose border-rose/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  mono,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
        mono && "font-mono text-[11px] tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
