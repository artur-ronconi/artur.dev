import "server-only";

import { cache } from "react";

import { prisma } from "@/server/db/prisma";

export const SETTINGS_ID = "singleton";

/** SQLite guarda listas de texto como JSON; aqui voltam a ser `string[]`. */
function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export type PortfolioSettingsView = Awaited<ReturnType<typeof getSettings>>;

/** Content shown when the admin has not filled the portfolio yet. */
const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  fullName: "Artur Hamann Ronconi",
  headline: "Engenheiro de Software · Backend · Cloud · DevOps",
  heroBadge: "Software Engineer",
  heroTitle: "Olá, eu sou",
  heroHighlight: "Artur Hamann Ronconi",
  heroSubtitle: "Backend · AWS · Arquitetura de sistemas · DevOps",
  heroDescription: null,
  shortBio: null,
  about: null,
  summaryItems: [] as string[],
  avatarUrl: null,
  resumeUrl: null,
  email: null,
  phone: null,
  location: null,
  available: true,
  availabilityNote: null,
  githubUrl: null,
  linkedinUrl: null,
  siteUrl: null,
  metaTitle: null,
  metaDescription: null,
  ogImageUrl: null,
  contactHeading: null,
  contactText: null,
  footerNote: null,
  updatedAt: new Date(0),
};

export const getSettings = cache(async () => {
  const stored = await prisma.portfolioSettings.findUnique({ where: { id: SETTINGS_ID } });
  return stored
    ? { ...stored, summaryItems: toStringList(stored.summaryItems) }
    : DEFAULT_SETTINGS;
});

export const getSocialLinks = cache(async (includeHidden = false) =>
  prisma.socialLink.findMany({
    where: includeHidden ? {} : { visible: true },
    orderBy: [{ order: "asc" }, { label: "asc" }],
  }),
);

export const getExperiences = cache(async (includeHidden = false) => {
  const experiences = await prisma.professionalExperience.findMany({
    where: includeHidden ? {} : { visible: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      technologies: {
        orderBy: { order: "asc" },
        select: {
          technology: { select: { id: true, name: true, slug: true, iconSlug: true, color: true } },
        },
      },
      media: { orderBy: { order: "asc" } },
    },
  });

  return experiences.map((experience) => ({
    ...experience,
    highlights: toStringList(experience.highlights),
  }));
});

export const getCertifications = cache(async (includeHidden = false) =>
  prisma.certification.findMany({
    where: includeHidden ? {} : { visible: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  }),
);

export const HOME_SECTION_KEYS = [
  "hero",
  "stack",
  "highlight",
  "lab",
  "projects",
  "experience",
  "certifications",
  "about",
  "contact",
] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  hero: "Hero",
  stack: "Tecnologias e ferramentas",
  highlight: "Destaque de experiência",
  lab: "Laboratório de servidores (simulação)",
  projects: "Projetos em destaque",
  experience: "Experiência profissional",
  certifications: "Certificações",
  about: "Sobre mim",
  contact: "Contato",
};

export const getHomeSections = cache(async () => {
  const stored = await prisma.homeSection.findMany({ orderBy: { order: "asc" } });
  const byKey = new Map(stored.map((section) => [section.key, section]));

  return HOME_SECTION_KEYS.map((key, index) => {
    const section = byKey.get(key);
    return {
      key,
      label: section?.label ?? HOME_SECTION_LABELS[key],
      visible: section?.visible ?? true,
      order: section?.order ?? index,
    };
  }).sort((a, b) => a.order - b.order);
});

export const getContactMessages = cache(async () =>
  prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
);
