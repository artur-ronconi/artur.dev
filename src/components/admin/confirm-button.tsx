"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Destructive action with an explicit confirmation step — no window.confirm,
 * and the dialog traps Escape so it is keyboard friendly.
 */
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  children,
  className,
  variant = "ghost",
  size = "sm",
}: {
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  children: ReactNode;
  className?: string;
  variant?: "ghost" | "danger" | "secondary" | "outline";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass(variant, size, className)}>
        {children}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-base-950/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn("panel w-full max-w-md p-6 outline-none")}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-2 text-[13.5px] text-ink-muted">{description}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Processando…" : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
