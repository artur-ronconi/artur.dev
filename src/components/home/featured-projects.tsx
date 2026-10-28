import { ArrowRight, FolderGit2 } from "lucide-react";

import { ProjectCard } from "@/components/project/project-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section, SectionHeading } from "@/components/ui/section";
import type { ProjectCard as ProjectCardData } from "@/server/modules/projects";

export function FeaturedProjects({ projects }: { projects: ProjectCardData[] }) {
  return (
    <Section id="projetos">
      <SectionHeading
        label="Portfólio"
        title="Projetos em destaque"
        description="Sistemas e automações que representam como trabalho: arquitetura, decisões técnicas e resultados."
        action={
          <ButtonLink href="/projetos" variant="outline" size="sm">
            Ver todos os projetos
            <ArrowRight size={15} />
          </ButtonLink>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<FolderGit2 size={20} />}
          title="Nenhum projeto publicado ainda"
          description="Cadastre projetos no painel administrativo e marque-os como destaque para exibi-los aqui."
        />
      ) : (
        <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} delay={index * 80} priority={index === 0} />
          ))}
        </div>
      )}
    </Section>
  );
}
