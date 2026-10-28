"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erro não tratado:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="panel w-full max-w-lg p-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-rose">Erro inesperado</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Algo deu errado</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Não foi possível carregar este conteúdo. Tente novamente em instantes.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11px] text-ink-faint">digest: {error.digest}</p>
        ) : null}
        <Button onClick={reset} className="mt-7">
          <RefreshCw size={15} /> Tentar novamente
        </Button>
      </div>
    </main>
  );
}
