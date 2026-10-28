import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";
import { getPublishedProjectSlugs } from "@/server/modules/projects";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  let projects: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    projects = await getPublishedProjectSlugs();
  } catch {
    // Sitemap must never break the build when the database is unavailable.
  }

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/projetos`, changeFrequency: "weekly", priority: 0.9 },
    ...projects.map((project) => ({
      url: `${base}/projetos/${project.slug}`,
      lastModified: project.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
