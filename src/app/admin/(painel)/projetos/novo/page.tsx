import { PageHeader } from "@/components/admin/shell";
import { EMPTY_PROJECT, ProjectForm } from "@/components/admin/project-form";
import { getProjectCategories, getTechnologies } from "@/server/modules/technologies";

export default async function NewProjectPage() {
  const [technologies, categories] = await Promise.all([getTechnologies(), getProjectCategories()]);

  return (
    <>
      <PageHeader
        title="Novo projeto"
        description="Monte o estudo de caso por etapas. Você pode salvar como rascunho a qualquer momento."
      />

      <ProjectForm
        initial={EMPTY_PROJECT}
        technologies={technologies.map((technology) => ({
          id: technology.id,
          name: technology.name,
          categoryName: technology.category?.name ?? null,
        }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
    </>
  );
}
