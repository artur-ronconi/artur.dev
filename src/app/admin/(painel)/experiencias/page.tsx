import { PageHeader } from "@/components/admin/shell";
import { ExperiencesManager } from "@/components/admin/experiences-manager";
import { getExperiences } from "@/server/modules/portfolio";
import { getTechnologies } from "@/server/modules/technologies";

export default async function AdminExperiencesPage() {
  const [experiences, technologies] = await Promise.all([getExperiences(true), getTechnologies()]);

  return (
    <>
      <PageHeader
        title="Experiência profissional"
        description="Empresas, cargos, entregas, tecnologias e mídias exibidos na linha do tempo."
      />

      <ExperiencesManager
        technologies={technologies.map((technology) => ({
          value: technology.id,
          label: technology.name,
          color: technology.color,
          group: technology.category?.name ?? "Sem categoria",
        }))}
        experiences={experiences.map((experience) => ({
          id: experience.id,
          company: experience.company,
          role: experience.role,
          startDate: experience.startDate,
          endDate: experience.endDate ?? "",
          current: experience.current,
          location: experience.location ?? "",
          companyUrl: experience.companyUrl ?? "",
          logoUrl: experience.logoUrl ?? "",
          description: experience.description ?? "",
          highlights: experience.highlights,
          technologyIds: experience.technologies.map(({ technology }) => technology.id),
          media: experience.media.map(({ kind, url, caption }) => ({ kind, url, caption })),
          order: experience.order,
          visible: experience.visible,
        }))}
      />
    </>
  );
}
