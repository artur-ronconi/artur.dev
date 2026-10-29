import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { DynamicIcon } from "@/components/icons/dynamic-icon";
import { ArchitectureDiagram } from "@/components/project/architecture-diagram";
import { TechIcon } from "@/components/icons/tech-icon";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import type { FullProject } from "@/server/modules/projects";

/**
 * "Experiência e resultados": highlights one published project with real
 * metrics. Everything here is admin-editable content, nothing is hardcoded.
 */
export function ExperienceHighlight({ project }: { project: FullProject }) {
  const diagram = project.diagrams[0];
  const technologies = project.technologies.slice(0, 6);

  return (
    <Section id="destaque">
      <div className="panel relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-[90px]"
        />

        <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
          <div className="flex flex-col">
            <Reveal>
              <p className="rule-label flex items-center gap-2 text-accent">
                <Sparkles size={13} />
                Destaque da minha experiência
              </p>
            </Reveal>

            <Reveal delay={60}>
              <h2 className="mt-3 text-2xl font-semibold text-ink sm:text-[1.75rem]">{project.title}</h2>
              {project.subtitle ? (
                <p className="mt-1.5 text-sm text-ink-faint">{project.subtitle}</p>
              ) : null}
              <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-ink-muted">{project.summary}</p>
            </Reveal>

            {project.metrics.length > 0 ? (
              <Reveal delay={120}>
                <dl className="mt-7 grid gap-3 sm:grid-cols-3">
                  {project.metrics.slice(0, 3).map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-lg border border-line bg-base-850 p-3.5"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/25 bg-accent-soft text-accent">
                        <DynamicIcon name={metric.icon} size={14} fallback="trending-up" />
                      </span>
                      <dd className="mt-2.5 font-display text-xl font-semibold text-ink">{metric.value}</dd>
                      <dt className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{metric.label}</dt>
                      {metric.description ? (
                        <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{metric.description}</p>
                      ) : null}
                    </div>
                  ))}
                </dl>
              </Reveal>
            ) : null}

            {technologies.length > 0 ? (
              <Reveal delay={160}>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {technologies.map(({ technology }) => (
                    <li
                      key={technology.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-base-800 px-2.5 py-1 text-[12px] text-ink-muted"
                    >
                      <TechIcon
                        slug={technology.iconSlug ?? technology.slug}
                        name={technology.name}
                        color={technology.color}
                        size={14}
                      />
                      {technology.name}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            <Reveal delay={200} className="mt-7">
              <ButtonLink href={`/projetos/${project.slug}`} variant="secondary">
                Ver detalhes do projeto
                <ArrowRight size={16} />
              </ButtonLink>
            </Reveal>
          </div>

          <Reveal delay={120} className="min-w-0">
            {project.coverImageUrl ? (
              <Link
                href={`/projetos/${project.slug}`}
                className="group relative block aspect-[16/10] h-full min-h-[240px] w-full overflow-hidden rounded-xl border border-line bg-base-900"
              >
                <Image
                  src={project.coverImageUrl}
                  alt={project.coverImageAlt ?? `Captura do projeto ${project.title}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </Link>
            ) : diagram ? (
              <ArchitectureDiagram
                source={diagram.source}
                title={diagram.title}
                description={diagram.description}
                className="h-full"
              />
            ) : (
              <div className="panel grid-backdrop flex h-full min-h-[240px] items-center justify-center p-6 text-center">
                <p className="max-w-xs text-[13px] text-ink-faint">
                  Cadastre uma imagem de capa ou um diagrama neste projeto para exibi-lo aqui.
                </p>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
