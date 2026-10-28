"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] erro não tratado:", error);
  }, [error]);

  return (
    <div className="panel max-w-lg p-6">
      <h1 className="text-lg font-semibold text-ink">Não foi possível carregar esta tela</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        Verifique a conexão com o banco de dados e tente novamente. Se o erro persistir, confira as
        variáveis de ambiente da aplicação.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11.5px] text-ink-faint">digest: {error.digest}</p>
      ) : null}
      <Button onClick={reset} className="mt-5" size="sm">
        <RefreshCw size={14} /> Tentar novamente
      </Button>
    </div>
  );
}
