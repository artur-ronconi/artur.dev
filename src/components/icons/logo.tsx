import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Hexágono: a forma do logo do Node.js, com os sinais de código dentro. */}
      <svg aria-hidden viewBox="0 0 32 32" width="32" height="32" className="shrink-0 text-accent">
        <path
          d="M16 2.6 27.6 9.3v13.4L16 29.4 4.4 22.7V9.3L16 2.6Z"
          className="fill-accent-soft"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="m13 12.2-3.8 3.8 3.8 3.8M19 12.2l3.8 3.8-3.8 3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact ? (
        <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
          Artur<span className="text-accent">.dev</span>
        </span>
      ) : null}
    </span>
  );
}
