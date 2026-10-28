"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical, Trash2 } from "lucide-react";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { removeDemoContentAction } from "@/server/actions/projects";

/** Lets the admin wipe every record flagged as demo content in one click. */
export function DemoDataCard({ count }: { count: number }) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  return (
    <section className="panel mt-6 flex flex-wrap items-center justify-between gap-4 border-amber/30 bg-amber/5 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber/30 bg-amber/10 text-amber">
          <FlaskConical size={17} aria-hidden />
        </span>
        <div>
          <h2 className="text-[14.5px] font-semibold text-ink">Dados de demonstração</h2>
          <p className="mt-1 max-w-xl text-[13px] text-ink-muted">
            {count === 1
              ? "Há 1 projeto de demonstração publicado, criado apenas para avaliar o layout."
              : `Há ${count} projetos de demonstração publicados, criados apenas para avaliar o layout.`}{" "}
            Remova-os quando o portfólio estiver com o conteúdo definitivo.
          </p>
        </div>
      </div>

      <ConfirmButton
        variant="danger"
        size="md"
        title="Remover dados de demonstração?"
        description="Todos os projetos, tecnologias e experiências marcados como demonstração serão excluídos. Esta ação não pode ser desfeita."
        confirmLabel="Remover tudo"
        onConfirm={async () => {
          const result = await removeDemoContentAction(csrf);
          if (result.ok) {
            toast.success(result.message ?? "Dados de demonstração removidos.");
            setRemoved(true);
            router.refresh();
          } else {
            toast.error(result.message);
          }
        }}
      >
        <Trash2 size={15} /> Remover dados de demonstração
      </ConfirmButton>
    </section>
  );
}
