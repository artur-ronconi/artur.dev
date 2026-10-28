import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2 } from "lucide-react";

import { ProjectCard } from "@/components/project/project-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import { getPublishedProjects } from "@/server/modules/projects";
import { getProjectCategories } from "@/server/modules/technologies";
import { prisma } from "@/server/db/prisma";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Projetos",
  description:
    "Estudos de caso de engenharia de software: backend, infraestrutura AWS, automações DevOps e sistemas distribuídos.",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const [projects, categories, totalPublished] = await Promise.all([
    getPublishedProjects({ categorySlug: categoria }),
    getProjectCategories(),
    prisma.project.count({ where: { status: "PUBLISHED" } }),
  ]);

  const activeCategories = categories.filter((category) => category._count.projects > 0);

  return (
    <div className="px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <Reveal>
          <p className="rule-label flex items-center gap-2">
            <span aria-hidden className="inline-block h-px w-6 bg-accent/60" />
            Portfólio
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Projetos</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            Cada projeto tem uma página própria com contexto, arquitetura, decisões técnicas e resultados.
          </p>
        </Reveal>

        {activeCategories.length > 0 ? (
          <Reveal delay={80} className="mt-8">
            <nav aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
              <Link
                href="/projetos"
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
                  !categoria
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-line bg-base-850 text-ink-muted hover:text-ink",
                )}
              >
                Todos ({totalPublished})
              </Link>
              {activeCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/projetos?categoria=${category.slug}`}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
                    categoria === category.slug
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-line bg-base-850 text-ink-muted hover:text-ink",
                  )}
                >
                  {category.name} ({category._count.projects})
                </Link>
              ))}
            </nav>
          </Reveal>
        ) : null}

        {projects.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={<FolderGit2 size={20} />}
            title={categoria ? "Nenhum projeto nesta categoria" : "Nenhum projeto publicado"}
            description={
              categoria
                ? "Experimente outra categoria ou volte para a listagem completa."
                : "Os projetos aparecem aqui assim que forem publicados no painel administrativo."
            }
            action={
              categoria ? (
                <Link href="/projetos" className="text-sm text-accent hover:opacity-80">
                  Ver todos os projetos
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                delay={index * 60}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
