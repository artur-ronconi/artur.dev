import "server-only";

import { Prisma } from "@prisma/client";
import { cache } from "react";

import { prisma } from "@/server/db/prisma";

/** Everything a case-study page needs, in display order. */
const fullProjectInclude = {
  category: true,
  technologies: {
    orderBy: [{ order: "asc" as const }],
    include: { technology: { include: { category: true } } },
  },
  sections: { where: { visible: true }, orderBy: { order: "asc" as const } },
  images: { orderBy: { order: "asc" as const } },
  diagrams: { orderBy: { order: "asc" as const } },
  metrics: { orderBy: { order: "asc" as const } },
  features: { orderBy: { order: "asc" as const } },
  links: { orderBy: { order: "asc" as const } },
  codeBlocks: { orderBy: { order: "asc" as const } },
  endpoints: { orderBy: { order: "asc" as const } },
} satisfies Prisma.ProjectInclude;

const cardInclude = {
  category: true,
  technologies: {
    orderBy: [{ order: "asc" as const }],
    take: 6,
    include: { technology: true },
  },
  metrics: { orderBy: { order: "asc" as const }, take: 3 },
  links: { orderBy: { order: "asc" as const } },
  _count: { select: { images: true, diagrams: true } },
} satisfies Prisma.ProjectInclude;

export type ProjectCard = Prisma.ProjectGetPayload<{ include: typeof cardInclude }>;
export type FullProject = Prisma.ProjectGetPayload<{ include: typeof fullProjectInclude }>;

export const getPublishedProjects = cache(
  async (options: { featuredOnly?: boolean; take?: number; categorySlug?: string } = {}) =>
    prisma.project.findMany({
      where: {
        status: "PUBLISHED",
        ...(options.featuredOnly ? { featured: true } : {}),
        ...(options.categorySlug ? { category: { slug: options.categorySlug } } : {}),
      },
      orderBy: [{ order: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: options.take,
      include: cardInclude,
    }),
);

export const getProjectBySlug = cache(async (slug: string, includeDrafts = false) =>
  prisma.project.findFirst({
    where: { slug, ...(includeDrafts ? {} : { status: "PUBLISHED" }) },
    include: fullProjectInclude,
  }),
);

export const getProjectById = cache(async (id: string) =>
  prisma.project.findUnique({ where: { id }, include: fullProjectInclude }),
);

/** Other published projects, preferring ones that share a category or stack. */
export const getRelatedProjects = cache(async (project: { id: string; categoryId: string | null }) => {
  const sameCategory = project.categoryId
    ? await prisma.project.findMany({
        where: { status: "PUBLISHED", id: { not: project.id }, categoryId: project.categoryId },
        orderBy: [{ featured: "desc" }, { order: "asc" }],
        take: 3,
        include: cardInclude,
      })
    : [];

  if (sameCategory.length >= 3) return sameCategory;

  const fillers = await prisma.project.findMany({
    where: {
      status: "PUBLISHED",
      id: { notIn: [project.id, ...sameCategory.map((item) => item.id)] },
    },
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    take: 3 - sameCategory.length,
    include: cardInclude,
  });

  return [...sameCategory, ...fillers];
});

export const getPublishedProjectSlugs = cache(async () =>
  prisma.project.findMany({
    where: { status: "PUBLISHED", indexable: true },
    select: { slug: true, updatedAt: true },
  }),
);

// ----------------------------------------------------------------- admin

export const listProjectsForAdmin = cache(
  async (filters: { status?: "DRAFT" | "PUBLISHED"; query?: string } = {}) =>
    prisma.project.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.query
          ? {
              OR: [
                { title: { contains: filters.query } },
                { slug: { contains: filters.query } },
                { summary: { contains: filters.query } },
              ],
            }
          : {}),
      },
      orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
      include: {
        category: true,
        technologies: { include: { technology: true }, take: 6, orderBy: { order: "asc" } },
        _count: { select: { images: true, sections: true, diagrams: true } },
      },
    }),
);

export const getDashboardStats = cache(async () => {
  const [total, published, drafts, featured, demo, technologies, experiences, certifications, messages] =
    await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: "PUBLISHED" } }),
      prisma.project.count({ where: { status: "DRAFT" } }),
      prisma.project.count({ where: { featured: true, status: "PUBLISHED" } }),
      prisma.project.count({ where: { isDemo: true } }),
      prisma.technology.count(),
      prisma.professionalExperience.count(),
      prisma.certification.count(),
      prisma.contactMessage.count({ where: { read: false } }),
    ]);

  const recent = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, slug: true, status: true, updatedAt: true, featured: true },
  });

  const incomplete = await prisma.project.findMany({
    where: { status: "PUBLISHED", OR: [{ coverImageUrl: null }, { sections: { none: {} } }] },
    select: { id: true, title: true, slug: true, coverImageUrl: true, _count: { select: { sections: true } } },
    take: 5,
  });

  return {
    total,
    published,
    drafts,
    featured,
    demo,
    technologies,
    experiences,
    certifications,
    unreadMessages: messages,
    recent,
    incomplete,
  };
});
