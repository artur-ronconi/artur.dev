import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/shell";
import { ProjectForm } from "@/components/admin/project-form";
import { getProjectById } from "@/server/modules/projects";
import { getProjectCategories, getTechnologies } from "@/server/modules/technologies";
import type { ProjectInput } from "@/server/validation/schemas";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, technologies, categories] = await Promise.all([
    getProjectById(id),
    getTechnologies(),
    getProjectCategories(),
  ]);

  if (!project) notFound();

  const initial: ProjectInput = {
    title: project.title,
    slug: project.slug,
    subtitle: project.subtitle,
    summary: project.summary,
    description: project.description,
    categoryId: project.categoryId,
    status: project.status,
    featured: project.featured,
    order: project.order,
    period: project.period,
    role: project.role,
    client: project.client,
    startedAt: project.startedAt ? project.startedAt.toISOString().slice(0, 10) : null,
    finishedAt: project.finishedAt ? project.finishedAt.toISOString().slice(0, 10) : null,
    coverImageUrl: project.coverImageUrl,
    coverImageAlt: project.coverImageAlt,
    metaTitle: project.metaTitle,
    metaDescription: project.metaDescription,
    ogImageUrl: project.ogImageUrl,
    indexable: project.indexable,
    technologies: project.technologies.map((item) => ({
      technologyId: item.technologyId,
      role: item.role,
    })),
    sections: project.sections.map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title,
      body: section.body,
      visible: section.visible,
    })),
    metrics: project.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metric.value,
      description: metric.description,
      icon: metric.icon,
    })),
    features: project.features.map((feature) => ({
      id: feature.id,
      title: feature.title,
      description: feature.description,
      icon: feature.icon,
    })),
    links: project.links.map((link) => ({
      id: link.id,
      type: link.type,
      label: link.label,
      url: link.url,
    })),
    images: project.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      caption: image.caption,
      kind: image.kind,
    })),
    diagrams: project.diagrams.map((diagram) => ({
      id: diagram.id,
      title: diagram.title,
      description: diagram.description,
      source: diagram.source,
    })),
    codeBlocks: project.codeBlocks.map((block) => ({
      id: block.id,
      title: block.title,
      description: block.description,
      language: block.language,
      code: block.code,
    })),
    endpoints: project.endpoints.map((endpoint) => ({
      id: endpoint.id,
      method: endpoint.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "WS",
      path: endpoint.path,
      description: endpoint.description,
      auth: endpoint.auth,
    })),
  };

  return (
    <>
      <PageHeader
        title={project.title}
        description={`Editando o projeto · /projetos/${project.slug}`}
      />

      <ProjectForm
        projectId={project.id}
        initial={initial}
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
