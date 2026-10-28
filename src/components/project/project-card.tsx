import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, ImageIcon, Star } from "lucide-react";

import { BrandIcon } from "@/components/icons/brand-icons";

import { TechIcon } from "@/components/icons/tech-icon";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";
import type { ProjectCard as ProjectCardData } from "@/server/modules/projects";

export function ProjectCard({
  project,
  delay = 0,
  priority = false,
}: {
  project: ProjectCardData;
  delay?: number;
  priority?: boolean;
}) {
  const repo = project.links.find((link) => link.type === "REPOSITORY");
  const demo = project.links.find((link) => link.type === "DEMO");

  return (
    <Reveal delay={delay} className="h-full">
      <article className="panel panel-hover group flex h-full flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            {project.category ? (
              <Badge tone="accent" mono>
                {project.category.name}
              </Badge>
            ) : null}
            {project.featured ? (
              <Badge tone="amber" mono>
                <Star size={11} /> destaque
              </Badge>
            ) : null}
          </div>
          {project.period ? (
            <span className="shrink-0 font-mono text-[11px] text-ink-faint">{project.period}</span>
          ) : null}
        </div>

        <div className="px-5">
          <h3 className="text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
            <Link href={`/projetos/${project.slug}`} className="after:absolute after:inset-0">
              {project.title}
            </Link>
          </h3>
          {project.subtitle ? (
            <p className="mt-1 text-[13px] text-ink-faint">{project.subtitle}</p>
          ) : null}
          <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-ink-muted">{project.summary}</p>
        </div>

        {project.technologies.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5 px-5">
            {project.technologies.map(({ technology }) => (
              <li
                key={technology.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-base-800 px-2 py-1 text-[11.5px] text-ink-muted"
              >
                <TechIcon
                  slug={technology.iconSlug ?? technology.slug}
                  name={technology.name}
                  color={technology.color}
                  size={13}
                />
                {technology.name}
              </li>
            ))}
          </ul>
        ) : null}

        {project.metrics.length > 0 ? (
          <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line bg-base-850">
            {project.metrics.map((metric) => (
              <div key={metric.id} className="min-w-0 px-3 py-2.5">
                <dt className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  {metric.label}
                </dt>
                <dd className="mt-0.5 truncate text-sm font-semibold text-accent">{metric.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className={cn("relative mt-4 aspect-[16/9] w-full overflow-hidden border-t border-line bg-base-900")}>
          {project.coverImageUrl ? (
            <Image
              src={project.coverImageUrl}
              alt={project.coverImageAlt ?? `Captura do projeto ${project.title}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid-backdrop flex h-full w-full items-center justify-center text-ink-faint opacity-60">
              <ImageIcon size={22} aria-hidden />
              <span className="sr-only">Projeto sem imagem de capa</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 px-5 py-3.5">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
            Detalhes
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>

          <span className="relative z-10 flex items-center gap-3">
            {demo ? (
              <a
                href={demo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
              >
                <ExternalLink size={14} /> Demo
              </a>
            ) : null}
            {repo ? (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-ink"
              >
                <BrandIcon name="github" size={14} /> GitHub
              </a>
            ) : null}
          </span>
        </div>
      </article>
    </Reveal>
  );
}
