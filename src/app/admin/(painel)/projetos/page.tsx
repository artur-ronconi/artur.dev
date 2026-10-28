import Link from "next/link";
import { FolderGit2, PlusCircle } from "lucide-react";

import { PageHeader } from "@/components/admin/shell";
import { ProjectsTable } from "@/components/admin/projects-table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { listProjectsForAdmin } from "@/server/modules/projects";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const parsedStatus = status === "PUBLISHED" || status === "DRAFT" ? status : undefined;
  const projects = await listProjectsForAdmin({ status: parsedStatus, query: q });

  const filters = [
    { label: "Todos", href: "/admin/projetos", active: !parsedStatus },
    { label: "Publicados", href: "/admin/projetos?status=PUBLISHED", active: parsedStatus === "PUBLISHED" },
    { label: "Rascunhos", href: "/admin/projetos?status=DRAFT", active: parsedStatus === "DRAFT" },
  ];

  return (
    <>
      <PageHeader
        title="Projetos"
        description="Crie, edite, publique e ordene os estudos de caso do portfólio."
        action={
          <ButtonLink href="/admin/projetos/novo" size="sm">
            <PlusCircle size={15} /> Novo projeto
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Filtrar projetos" className="flex gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.href}
              href={filter.href}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
                filter.active
                  ? "border-accent/40 bg-accent-soft text-accent"
                  : "border-line bg-base-850 text-ink-muted hover:text-ink",
              )}
            >
              {filter.label}
            </Link>
          ))}
        </nav>

        <form action="/admin/projetos" className="ml-auto flex gap-2">
          {parsedStatus ? <input type="hidden" name="status" value={parsedStatus} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por título ou slug…"
            aria-label="Buscar projetos"
            className="h-9 w-56 rounded-lg border border-line bg-base-900 px-3 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="h-9 rounded-lg border border-line px-3 text-[13px] text-ink-muted transition-colors hover:text-ink"
          >
            Buscar
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={20} />}
          title={q || parsedStatus ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}
          description={
            q || parsedStatus
              ? "Ajuste os filtros ou limpe a busca."
              : "Crie o primeiro estudo de caso do portfólio."
          }
          action={
            <ButtonLink href="/admin/projetos/novo" size="sm">
              <PlusCircle size={15} /> Novo projeto
            </ButtonLink>
          }
        />
      ) : (
        <ProjectsTable
          projects={projects.map((project) => ({
            id: project.id,
            title: project.title,
            slug: project.slug,
            status: project.status,
            featured: project.featured,
            order: project.order,
            isDemo: project.isDemo,
            updatedAt: project.updatedAt.toISOString(),
            category: project.category?.name ?? null,
            technologies: project.technologies.map((item) => item.technology.name),
            counts: project._count,
          }))}
        />
      )}
    </>
  );
}
