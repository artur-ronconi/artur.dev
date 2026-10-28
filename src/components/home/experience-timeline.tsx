import Image from "next/image";
import { Briefcase, ExternalLink } from "lucide-react";

import { ExperienceMedia } from "@/components/home/experience-media";
import { resolveTechGlyph, TechIcon } from "@/components/icons/tech-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import { isExternalUrl } from "@/lib/media";
import type { getExperiences } from "@/server/modules/portfolio";

type Experiences = Awaited<ReturnType<typeof getExperiences>>;

export function ExperienceTimeline({ experiences }: { experiences: Experiences }) {
  return (
    <Section id="experiencia">
      <SectionHeading
        label="Trajetória"
        title="Experiência profissional"
        description="Empresas, responsabilidades e entregas técnicas ao longo da minha carreira."
      />

      {experiences.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Briefcase size={20} />}
          title="Nenhuma experiência cadastrada"
          description="Adicione suas experiências profissionais pelo painel administrativo."
        />
      ) : (
        <ol className="mt-9 space-y-4">
          {experiences.map((experience, index) => (
            <Reveal key={experience.id} as="li" delay={index * 70}>
              <article className="panel panel-hover relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`h-2 w-2 rounded-full ${experience.current ? "bg-accent" : "bg-base-500"}`}
                    />
                    <span className="font-mono text-[11.5px] text-ink-faint">
                      {experience.startDate} — {experience.current ? "Atual" : (experience.endDate ?? "—")}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    {experience.logoUrl ? (
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-base-850">
                        <Image
                          src={experience.logoUrl}
                          alt={`Ícone de ${experience.company}`}
                          fill
                          sizes="48px"
                          unoptimized={isExternalUrl(experience.logoUrl)}
                          className="object-cover"
                        />
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-ink">{experience.company}</h3>
                      <p className="mt-0.5 text-[13.5px] text-accent">{experience.role}</p>
                    </div>
                  </div>
                  {experience.location ? (
                    <p className="mt-1 text-[12px] text-ink-faint">{experience.location}</p>
                  ) : null}
                  {experience.companyUrl ? (
                    <a
                      href={experience.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-accent"
                    >
                      site <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>

                <div className="lg:border-l lg:border-line lg:pl-6">
                  {experience.description ? (
                    <p className="text-[13.5px] leading-relaxed text-ink-muted">{experience.description}</p>
                  ) : null}

                  {experience.highlights.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {experience.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-muted">
                          <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm bg-accent/70" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {experience.technologies.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {experience.technologies.map(({ technology }) => {
                        const slug = technology.iconSlug ?? technology.slug;
                        return (
                          <li
                            key={technology.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-base-800 px-2.5 py-1 font-mono text-[11px] tracking-wide text-ink-muted"
                          >
                            {/* Logo oficial quando existe; senão, um ponto na cor cadastrada. */}
                            {resolveTechGlyph(slug) ? (
                              <TechIcon slug={slug} name={technology.name} color={technology.color} size={13} />
                            ) : (
                              <span
                                aria-hidden
                                className="h-2 w-2 rounded-full bg-accent"
                                style={technology.color ? { backgroundColor: technology.color } : undefined}
                              />
                            )}
                            {technology.name}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  <ExperienceMedia
                    company={experience.company}
                    items={experience.media.map(({ kind, url, caption }) => ({ kind, url, caption }))}
                  />
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
      )}
    </Section>
  );
}
