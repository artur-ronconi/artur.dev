import { DynamicIcon } from "@/components/icons/dynamic-icon";
import { TechIcon } from "@/components/icons/tech-icon";
import { TechExplorer, type ExplorerCategory } from "@/components/home/tech-explorer";
import { EmptyState } from "@/components/ui/empty-state";
import { Section, SectionHeading } from "@/components/ui/section";
import type { getStackWithUsage } from "@/server/modules/technologies";

type Categories = Awaited<ReturnType<typeof getStackWithUsage>>;

export function TechStack({ categories }: { categories: Categories }) {
  // Os logos são renderizados aqui, no servidor, e entregues prontos ao explorador.
  const populated: ExplorerCategory[] = categories
    .filter((category) => category.technologies.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: <DynamicIcon name={category.icon} size={15} />,
      technologies: category.technologies.map((technology) => {
        const logo = { slug: technology.iconSlug ?? technology.slug, name: technology.name, color: technology.color };
        return {
          id: technology.id,
          name: technology.name,
          description: technology.description,
          url: technology.url,
          featured: technology.featured,
          icon: <TechIcon {...logo} size={18} />,
          largeIcon: <TechIcon {...logo} size={30} />,
          projects: technology.projects.map(({ role, project }) => ({ slug: project.slug, title: project.title, role })),
        };
      }),
    }));

  return (
    <Section id="tecnologias">
      <SectionHeading
        label="Stack"
        title="Tecnologias e ferramentas"
        description="Clique em uma tecnologia para ver em quais projetos ela foi usada, com qual papel, e com o que ela costuma aparecer junto."
      />

      {populated.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<DynamicIcon name="layers" size={20} />}
          title="Nenhuma tecnologia cadastrada"
          description="Cadastre categorias e tecnologias no painel administrativo para exibi-las aqui."
        />
      ) : (
        <TechExplorer categories={populated} />
      )}
    </Section>
  );
}
