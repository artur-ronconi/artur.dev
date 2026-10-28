import "server-only";

import { cache } from "react";

import { prisma } from "@/server/db/prisma";

export const getTechnologyCategories = cache(async (includeHidden = false) =>
  prisma.technologyCategory.findMany({
    where: includeHidden ? {} : { visible: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      technologies: { orderBy: [{ order: "asc" }, { name: "asc" }] },
    },
  }),
);

export const getTechnologies = cache(async () =>
  prisma.technology.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { projects: true, experiences: true } },
    },
  }),
);

export const getProjectCategories = cache(async () =>
  prisma.projectCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { projects: true } } },
  }),
);

/**
 * Stack da home: categorias visíveis com suas tecnologias e, para cada uma, os
 * projetos publicados em que ela foi usada (e o papel dela em cada projeto).
 */
export const getStackWithUsage = cache(async () =>
  prisma.technologyCategory.findMany({
    where: { visible: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      technologies: {
        orderBy: [{ order: "asc" }, { name: "asc" }],
        include: {
          projects: {
            where: { project: { status: "PUBLISHED" } },
            orderBy: { project: { order: "asc" } },
            select: { role: true, project: { select: { slug: true, title: true } } },
          },
        },
      },
    },
  }),
);
