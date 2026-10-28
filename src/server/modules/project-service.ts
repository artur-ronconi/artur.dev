import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/server/db/errors";
import { slugify } from "@/lib/utils";
import type { ProjectInput } from "@/server/validation/schemas";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Guarantees a unique slug, appending -2, -3… when needed. */
export async function ensureUniqueSlug(desired: string, ignoreId?: string): Promise<string> {
  const base = slugify(desired) || "projeto";
  let candidate = base;
  let suffix = 2;

  for (;;) {
    const existing = await prisma.project.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

function nestedCreateData(input: ProjectInput) {
  return {
    technologies: {
      create: input.technologies.map((item, index) => ({
        technologyId: item.technologyId,
        role: item.role ?? null,
        order: index,
      })),
    },
    sections: {
      create: input.sections.map((section, index) => ({
        type: section.type,
        title: section.title,
        body: section.body,
        visible: section.visible,
        order: index,
      })),
    },
    metrics: {
      create: input.metrics.map((metric, index) => ({
        label: metric.label,
        value: metric.value,
        description: metric.description ?? null,
        icon: metric.icon ?? null,
        order: index,
      })),
    },
    features: {
      create: input.features.map((feature, index) => ({
        title: feature.title,
        description: feature.description ?? null,
        icon: feature.icon ?? null,
        order: index,
      })),
    },
    links: {
      create: input.links.map((link, index) => ({
        type: link.type,
        label: link.label,
        url: link.url,
        order: index,
      })),
    },
    images: {
      create: input.images.map((image, index) => ({
        url: image.url,
        alt: image.alt,
        caption: image.caption ?? null,
        kind: image.kind,
        order: index,
      })),
    },
    diagrams: {
      create: input.diagrams.map((diagram, index) => ({
        title: diagram.title,
        description: diagram.description ?? null,
        source: diagram.source,
        order: index,
      })),
    },
    codeBlocks: {
      create: input.codeBlocks.map((block, index) => ({
        title: block.title ?? null,
        description: block.description ?? null,
        language: block.language,
        code: block.code,
        order: index,
      })),
    },
    endpoints: {
      create: input.endpoints.map((endpoint, index) => ({
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description ?? null,
        auth: endpoint.auth ?? null,
        order: index,
      })),
    },
  };
}

function scalarData(input: ProjectInput) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    summary: input.summary,
    description: input.description,
    categoryId: input.categoryId,
    status: input.status,
    featured: input.featured,
    order: input.order,
    period: input.period,
    role: input.role,
    client: input.client,
    startedAt: parseDate(input.startedAt),
    finishedAt: parseDate(input.finishedAt),
    coverImageUrl: input.coverImageUrl,
    coverImageAlt: input.coverImageAlt,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    ogImageUrl: input.ogImageUrl,
    indexable: input.indexable,
  };
}

async function assertTechnologiesExist(input: ProjectInput) {
  if (input.technologies.length === 0) return;

  const ids = [...new Set(input.technologies.map((item) => item.technologyId))];
  const found = await prisma.technology.count({ where: { id: { in: ids } } });
  if (found !== ids.length) {
    throw new DomainError("Uma ou mais tecnologias selecionadas não existem mais.", "technologies");
  }
}

export async function createProject(input: ProjectInput) {
  await assertTechnologiesExist(input);
  const slug = await ensureUniqueSlug(input.slug);

  return prisma.project.create({
    data: {
      ...scalarData(input),
      slug,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      ...nestedCreateData(input),
    },
  });
}

/**
 * Replaces the whole project aggregate in one transaction: children are
 * rewritten so ordering, removals and additions stay consistent.
 */
export async function updateProject(id: string, input: ProjectInput) {
  await assertTechnologiesExist(input);

  const current = await prisma.project.findUnique({ where: { id }, select: { status: true, publishedAt: true } });
  if (!current) throw new DomainError("Projeto não encontrado.");

  const slug = await ensureUniqueSlug(input.slug, id);
  const publishedAt =
    input.status === "PUBLISHED" ? (current.publishedAt ?? new Date()) : current.publishedAt;

  return prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.projectTechnology.deleteMany({ where: { projectId: id } }),
      tx.projectSection.deleteMany({ where: { projectId: id } }),
      tx.projectMetric.deleteMany({ where: { projectId: id } }),
      tx.projectFeature.deleteMany({ where: { projectId: id } }),
      tx.projectLink.deleteMany({ where: { projectId: id } }),
      tx.projectImage.deleteMany({ where: { projectId: id } }),
      tx.projectDiagram.deleteMany({ where: { projectId: id } }),
      tx.projectCodeBlock.deleteMany({ where: { projectId: id } }),
      tx.projectEndpoint.deleteMany({ where: { projectId: id } }),
    ]);

    return tx.project.update({
      where: { id },
      data: { ...scalarData(input), slug, publishedAt, ...nestedCreateData(input) },
    });
  });
}

export async function setProjectStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  return prisma.project.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });
}

export async function toggleProjectFeatured(id: string) {
  const project = await prisma.project.findUnique({ where: { id }, select: { featured: true } });
  if (!project) throw new DomainError("Projeto não encontrado.");

  return prisma.project.update({ where: { id }, data: { featured: !project.featured } });
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}

/** Deep-copies a project as a new draft, including every child record. */
export async function duplicateProject(id: string) {
  const source = await prisma.project.findUnique({
    where: { id },
    include: {
      technologies: true,
      sections: true,
      metrics: true,
      features: true,
      links: true,
      images: true,
      diagrams: true,
      codeBlocks: true,
      endpoints: true,
    },
  });

  if (!source) throw new DomainError("Projeto não encontrado.");

  const slug = await ensureUniqueSlug(`${source.slug}-copia`);

  return prisma.project.create({
    data: {
      title: `${source.title} (cópia)`,
      slug,
      subtitle: source.subtitle,
      summary: source.summary,
      description: source.description,
      status: "DRAFT",
      featured: false,
      order: source.order,
      startedAt: source.startedAt,
      finishedAt: source.finishedAt,
      period: source.period,
      role: source.role,
      client: source.client,
      categoryId: source.categoryId,
      coverImageUrl: source.coverImageUrl,
      coverImageAlt: source.coverImageAlt,
      metaTitle: source.metaTitle,
      metaDescription: source.metaDescription,
      ogImageUrl: source.ogImageUrl,
      indexable: source.indexable,
      isDemo: source.isDemo,
      technologies: {
        create: source.technologies.map(({ technologyId, role, order }) => ({ technologyId, role, order })),
      },
      sections: {
        create: source.sections.map(({ type, title, body, order, visible }) => ({
          type,
          title,
          body,
          order,
          visible,
        })),
      },
      metrics: {
        create: source.metrics.map(({ label, value, description, icon, order }) => ({
          label,
          value,
          description,
          icon,
          order,
        })),
      },
      features: {
        create: source.features.map(({ title, description, icon, order }) => ({
          title,
          description,
          icon,
          order,
        })),
      },
      links: {
        create: source.links.map(({ type, label, url, order }) => ({ type, label, url, order })),
      },
      images: {
        create: source.images.map(({ url, alt, caption, kind, width, height, order }) => ({
          url,
          alt,
          caption,
          kind,
          width,
          height,
          order,
        })),
      },
      diagrams: {
        create: source.diagrams.map(({ title, description, source: code, order }) => ({
          title,
          description,
          source: code,
          order,
        })),
      },
      codeBlocks: {
        create: source.codeBlocks.map(({ title, description, language, code, order }) => ({
          title,
          description,
          language,
          code,
          order,
        })),
      },
      endpoints: {
        create: source.endpoints.map(({ method, path, description, auth, order }) => ({
          method,
          path,
          description,
          auth,
          order,
        })),
      },
    },
  });
}

export async function reorderProjects(ids: string[]) {
  await prisma.$transaction(
    ids.map((id, index) => prisma.project.update({ where: { id }, data: { order: index } })),
  );
}

/** Removes everything flagged as demo content (projects, stack, experiences…). */
export async function removeDemoContent() {
  const [projects, technologies, technologyCategories, projectCategories, experiences, certifications] =
    await prisma.$transaction([
      prisma.project.deleteMany({ where: { isDemo: true } }),
      prisma.technology.deleteMany({ where: { isDemo: true } }),
      prisma.technologyCategory.deleteMany({ where: { isDemo: true } }),
      prisma.projectCategory.deleteMany({ where: { isDemo: true } }),
      prisma.professionalExperience.deleteMany({ where: { isDemo: true } }),
      prisma.certification.deleteMany({ where: { isDemo: true } }),
    ]);

  return {
    projects: projects.count,
    technologies: technologies.count,
    technologyCategories: technologyCategories.count,
    projectCategories: projectCategories.count,
    experiences: experiences.count,
    certifications: certifications.count,
  };
}
