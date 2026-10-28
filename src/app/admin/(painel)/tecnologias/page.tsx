import { PageHeader } from "@/components/admin/shell";
import { TechnologiesManager } from "@/components/admin/technologies-manager";
import {
  getProjectCategories,
  getTechnologies,
  getTechnologyCategories,
} from "@/server/modules/technologies";

export default async function AdminTechnologiesPage() {
  const [technologies, categories, projectCategories] = await Promise.all([
    getTechnologies(),
    getTechnologyCategories(true),
    getProjectCategories(),
  ]);

  return (
    <>
      <PageHeader
        title="Tecnologias e categorias"
        description="Gerencie a stack exibida na home e as categorias usadas por projetos e tecnologias."
      />

      <TechnologiesManager
        technologies={technologies.map((technology) => ({
          id: technology.id,
          name: technology.name,
          slug: technology.slug,
          iconSlug: technology.iconSlug ?? "",
          categoryId: technology.categoryId ?? "",
          categoryName: technology.category?.name ?? null,
          description: technology.description ?? "",
          color: technology.color ?? "",
          url: technology.url ?? "",
          order: technology.order,
          featured: technology.featured,
          projectCount: technology._count.projects,
          experienceCount: technology._count.experiences,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon ?? "",
          accent: category.accent ?? "",
          description: category.description ?? "",
          order: category.order,
          visible: category.visible,
          technologyCount: category.technologies.length,
        }))}
        projectCategories={projectCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          accent: category.accent ?? "",
          order: category.order,
          projectCount: category._count.projects,
        }))}
      />
    </>
  );
}
