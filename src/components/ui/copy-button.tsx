"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/** Copia um texto para a área de transferência e confirma por alguns segundos. */
export function CopyButton({ text, label = "Copiar", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
      aria-live="polite"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 font-mono text-[11px] transition-colors",
        copied ? "border-accent/50 text-accent" : "text-ink-faint hover:border-accent/50 hover:text-accent",
        className,
      )}
    >
      {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
      {copied ? "Copiado" : label}
    </button>
  );
}
