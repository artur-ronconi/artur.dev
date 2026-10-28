import type { Metadata } from "next";

import { About } from "@/components/home/about";
import { Certifications } from "@/components/home/certifications";
import { Contact } from "@/components/home/contact";
import { ExperienceHighlight } from "@/components/home/experience-highlight";
import { ExperienceTimeline } from "@/components/home/experience-timeline";
import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { ServerLab } from "@/components/home/server-lab";
import { TechStack } from "@/components/home/tech-stack";
import {
  getCertifications,
  getExperiences,
  getHomeSections,
  getSettings,
} from "@/server/modules/portfolio";
import { getProjectBySlug, getPublishedProjects } from "@/server/modules/projects";
import { getStackWithUsage } from "@/server/modules/technologies";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: settings.metaTitle ?? `${settings.fullName} · ${settings.headline}`,
    description: settings.metaDescription ?? settings.shortBio ?? undefined,
    openGraph: {
      title: settings.metaTitle ?? `${settings.fullName} · ${settings.headline}`,
      description: settings.metaDescription ?? settings.shortBio ?? undefined,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
    },
  };
}

export default async function HomePage() {
  const [settings, sections, categories, projects, experiences, certifications] = await Promise.all([
    getSettings(),
    getHomeSections(),
    getStackWithUsage(),
    getPublishedProjects(),
    getExperiences(),
    getCertifications(),
  ]);

  const featured = projects.filter((project) => project.featured).slice(0, 6);

  // The highlight block reuses the first featured project that has metrics,
  // so the numbers shown are always real, admin-managed content.
  const highlightCandidate = featured.find((project) => project.metrics.length > 0) ?? featured[0];
  const highlight = highlightCandidate ? await getProjectBySlug(highlightCandidate.slug) : null;

  const ordered = sections.filter((section) => section.visible);

  const blocks: Record<string, React.ReactNode> = {
    hero: (
      <Hero
        key="hero"
        settings={settings}
        projects={projects.map((project) => ({
          slug: project.slug,
          title: project.title,
          category: project.category?.name ?? null,
        }))}
        stack={categories
          .filter((category) => category.technologies.length > 0)
          .map((category) => ({
            category: category.name,
            items: category.technologies.map((technology) => technology.name),
          }))}
      />
    ),
    stack: <TechStack key="stack" categories={categories} />,
    highlight: highlight ? <ExperienceHighlight key="highlight" project={highlight} /> : null,
    lab: <ServerLab key="lab" />,
    projects: <FeaturedProjects key="projects" projects={featured} />,
    experience: <ExperienceTimeline key="experience" experiences={experiences} />,
    certifications: <Certifications key="certifications" certifications={certifications} />,
    about: <About key="about" settings={settings} />,
    contact: (
      <Contact
        key="contact"
        heading={settings.contactHeading}
        text={settings.contactText}
        email={settings.email}
        phone={settings.phone}
        location={settings.location}
        available={settings.available}
        availabilityNote={settings.availabilityNote}
      />
    ),
  };

  return <>{ordered.map((section) => blocks[section.key] ?? null)}</>;
}
