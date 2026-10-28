"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import {
  deleteProjectAction,
  duplicateProjectAction,
  reorderProjectsAction,
  setProjectStatusAction,
  toggleFeaturedAction,
} from "@/server/actions/projects";

type Row = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  featured: boolean;
  order: number;
  isDemo: boolean;
  updatedAt: string;
  category: string | null;
  technologies: string[];
  counts: { images: number; sections: number; diagrams: number };
};

export function ProjectsTable({ projects }: { projects: Row[] }) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // A lista vem do servidor; a reordenação local só vale enquanto a resposta do
  // servidor ainda reflete a ordem anterior (assinatura igual à de quando moveu).
  const signature = projects.map((project) => project.id).join(",");
  const [override, setOverride] = useState<{ signature: string; rows: Row[] } | null>(null);
  const rows = override?.signature === signature ? override.rows : projects;

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
    const result = await action();
    if (result.ok) {
      toast.success(result.message ?? "Operação concluída.");
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? "Não foi possível concluir a operação.");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;

    const next = [...rows];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    setOverride({ signature, rows: next });

    await run(() => reorderProjectsAction(csrf, next.map((row) => row.id)));
  };

  return (
    <div className="panel overflow-hidden" aria-busy={pending}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <caption className="sr-only">Projetos cadastrados</caption>
          <thead>
            <tr className="border-b border-line bg-base-800/40">
              <th scope="col" className="w-20 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Ordem
              </th>
              <th scope="col" className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Projeto
              </th>
              <th scope="col" className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Status
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-ink-faint lg:table-cell">
                Conteúdo
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((project, index) => (
              <tr key={project.id} className="border-b border-line last:border-0 hover:bg-base-850/40">
                <td className="px-3 py-3 align-top">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Mover ${project.title} para cima`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="rounded border border-line p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover ${project.title} para baixo`}
                      disabled={index === rows.length - 1}
                      onClick={() => move(index, 1)}
                      className="rounded border border-line p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </td>

                <td className="px-3 py-3 align-top">
                  <Link href={`/admin/projetos/${project.id}`} className="font-medium text-ink hover:text-accent">
                    {project.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-[11.5px] text-ink-faint">/projetos/{project.slug}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {project.category ? <Badge mono>{project.category}</Badge> : null}
                    {project.isDemo ? <Badge tone="amber" mono>demonstração</Badge> : null}
                    {project.technologies.slice(0, 3).map((technology) => (
                      <span key={technology} className="text-[11.5px] text-ink-faint">
                        {technology}
                      </span>
                    ))}
                  </p>
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge tone={project.status === "PUBLISHED" ? "emerald" : "neutral"} mono>
                      {project.status === "PUBLISHED" ? "publicado" : "rascunho"}
                    </Badge>
                    {project.featured ? (
                      <Badge tone="amber" mono>
                        <Star size={10} /> destaque
                      </Badge>
                    ) : null}
                    <span className="font-mono text-[11px] text-ink-faint">{timeAgo(project.updatedAt)}</span>
                  </div>
                </td>

                <td className="hidden px-3 py-3 align-top text-[12px] text-ink-muted lg:table-cell">
                  <span className="block">{project.counts.sections} seções</span>
                  <span className="block">{project.counts.images} imagens</span>
                  <span className="block">{project.counts.diagrams} diagramas</span>
                </td>

                <td className="px-3 py-3 align-top">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Link
                      href={`/admin/projetos/${project.id}`}
                      aria-label={`Editar ${project.title}`}
                      className="rounded border border-line p-1.5 text-ink-muted transition-colors hover:text-accent"
                    >
                      <Pencil size={14} />
                    </Link>

                    <Link
                      href={
                        project.status === "PUBLISHED"
                          ? `/projetos/${project.slug}`
                          : `/preview/${project.id}`
                      }
                      target="_blank"
                      aria-label={`Pré-visualizar ${project.title}`}
                      className="rounded border border-line p-1.5 text-ink-muted transition-colors hover:text-accent"
                    >
                      <ExternalLink size={14} />
                    </Link>

                    <button
                      type="button"
                      aria-label={project.featured ? "Remover destaque" : "Destacar projeto"}
                      onClick={() => run(() => toggleFeaturedAction(csrf, project.id))}
                      className={`rounded border border-line p-1.5 transition-colors hover:text-amber ${
                        project.featured ? "text-amber" : "text-ink-muted"
                      }`}
                    >
                      <Star size={14} />
                    </button>

                    <button
                      type="button"
                      aria-label={project.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                      onClick={() =>
                        run(() =>
                          setProjectStatusAction(
                            csrf,
                            project.id,
                            project.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                          ),
                        )
                      }
                      className="rounded border border-line p-1.5 text-ink-muted transition-colors hover:text-emerald"
                    >
                      {project.status === "PUBLISHED" ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>

                    <button
                      type="button"
                      aria-label={`Duplicar ${project.title}`}
                      onClick={() => run(() => duplicateProjectAction(csrf, project.id))}
                      className="rounded border border-line p-1.5 text-ink-muted transition-colors hover:text-ink"
                    >
                      <Copy size={14} />
                    </button>

                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      className="!px-1.5 text-ink-muted hover:text-rose"
                      title={`Excluir "${project.title}"?`}
                      description="O projeto e todo o seu conteúdo (seções, imagens, diagramas, métricas) serão removidos permanentemente."
                      confirmLabel="Excluir projeto"
                      onConfirm={() => run(() => deleteProjectAction(csrf, project.id))}
                    >
                      <Trash2 size={14} />
                    </ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
