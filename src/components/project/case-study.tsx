import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  PlayCircle,
  UserRound,
} from "lucide-react";

import { BrandIcon } from "@/components/icons/brand-icons";
import { DynamicIcon } from "@/components/icons/dynamic-icon";
import { CaseNav, type CaseNavItem } from "@/components/project/case-nav";
import { CodeBlock } from "@/components/project/code-block";
import { EndpointsTable } from "@/components/project/endpoints-table";
import { Gallery } from "@/components/project/gallery";
import { ArchitectureDiagram } from "@/components/project/architecture-diagram";
import { ProjectCard } from "@/components/project/project-card";
import { TechMatrix } from "@/components/project/tech-matrix";
import { Badge } from "@/components/ui/badge";
import { ExternalButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { renderMarkdown, stripMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { getRelatedProjects, type FullProject } from "@/server/modules/projects";

const SECTION_META: Record<string, { label: string; icon: string }> = {
  CONTEXT: { label: "Contexto e problema", icon: "network" },
  OBJECTIVES: { label: "Objetivos", icon: "gauge" },
  CONTRIBUTION: { label: "Minha contribuição", icon: "code" },
  SOLUTION: { label: "Solução implementada", icon: "layers" },
  ARCHITECTURE: { label: "Arquitetura", icon: "workflow" },
  CHALLENGES: { label: "Desafios técnicos", icon: "shield" },
  DECISIONS: { label: "Decisões de engenharia", icon: "settings" },
  RESULTS: { label: "Resultados", icon: "trending-up" },
  LEARNINGS: { label: "Aprendizados", icon: "award" },
  CUSTOM: { label: "Detalhes", icon: "boxes" },
};

/**
 * Estudo de caso completo de um projeto. Compartilhado entre a página pública
 * (/projetos/[slug]) e a pré-visualização autenticada (/preview/[id]), para que
 * a prévia reproduza exatamente o layout publicado.
 */
export async function CaseStudy({
  project,
  isPreview = false,
}: {
  project: FullProject;
  isPreview?: boolean;
}) {
  const related = await getRelatedProjects({ id: project.id, categoryId: project.categoryId });

  const screenshots = project.images.filter((image) => image.kind !== "DIAGRAM");
  const diagramImages = project.images.filter((image) => image.kind === "DIAGRAM");

  const navItems: CaseNavItem[] = [
    ...(project.metrics.length > 0 ? [{ id: "resultados-chave", label: "Resultados-chave" }] : []),
    ...project.sections.map((section) => ({
      id: `secao-${section.id}`,
      label: section.title,
    })),
    ...(project.diagrams.length > 0 || diagramImages.length > 0
      ? [{ id: "arquitetura", label: "Arquitetura" }]
      : []),
    ...(project.technologies.length > 0 ? [{ id: "tecnologias", label: "Tecnologias" }] : []),
    ...(project.features.length > 0 ? [{ id: "funcionalidades", label: "Funcionalidades" }] : []),
    ...(project.endpoints.length > 0 ? [{ id: "endpoints", label: "Endpoints" }] : []),
    ...(project.codeBlocks.length > 0 ? [{ id: "codigo", label: "Código" }] : []),
    ...(screenshots.length > 0 ? [{ id: "galeria", label: "Galeria" }] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: stripMarkdown(project.summary),
    ...(project.coverImageUrl ? { image: project.coverImageUrl } : {}),
    dateCreated: project.startedAt?.toISOString(),
    dateModified: project.updatedAt.toISOString(),
    keywords: project.technologies.map(({ technology }) => technology.name).join(", "),
  };

  return (
    <article className="pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {isPreview ? (
        <div className="sticky top-16 z-40 border-b border-amber/30 bg-amber/10 px-5 py-2.5 text-center text-[13px] text-amber sm:px-8">
          <span className="inline-flex items-center gap-2">
            <Eye size={14} />
            Pré-visualização — reproduz exatamente o layout público do projeto.
            <Link href={`/admin/projetos/${project.id}`} className="underline underline-offset-2">
              Editar projeto
            </Link>
          </span>
        </div>
      ) : null}

      {/* -------------------------------------------------------- cabeçalho */}
      <header className="relative overflow-hidden border-b border-line px-5 pb-12 pt-10 sm:px-8 lg:px-10">
        <div
          aria-hidden
          className="grid-backdrop pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-[110px]"
        />

        <div className="relative mx-auto w-full max-w-7xl">
          <Link
            href="/projetos"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-accent"
          >
            <ArrowLeft size={14} /> Voltar para projetos
          </Link>

          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {project.category ? <Badge tone="accent" mono>{project.category.name}</Badge> : null}
                {project.period ? (
                  <Badge mono>
                    <CalendarDays size={11} /> {project.period}
                  </Badge>
                ) : null}
                {!project.period && project.startedAt ? (
                  <Badge mono>
                    <CalendarDays size={11} /> {formatDate(project.startedAt)}
                    {project.finishedAt ? ` — ${formatDate(project.finishedAt)}` : ""}
                  </Badge>
                ) : null}
                {project.role ? (
                  <Badge mono>
                    <UserRound size={11} /> {project.role}
                  </Badge>
                ) : null}
              </div>

              <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
                {project.title}
              </h1>

              {project.subtitle ? (
                <p className="mt-3 text-lg text-ink-muted">{project.subtitle}</p>
              ) : null}

              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{project.summary}</p>

              {project.links.length > 0 ? (
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {project.links.map((link) => (
                    <ExternalButtonLink
                      key={link.id}
                      href={link.url}
                      variant={link.type === "REPOSITORY" ? "secondary" : link.type === "DEMO" ? "primary" : "outline"}
                      size="sm"
                    >
                      {link.type === "REPOSITORY" ? <BrandIcon name="github" size={14} /> : null}
                      {link.type === "DEMO" ? <ExternalLink size={14} /> : null}
                      {link.type === "DOCS" ? <FileText size={14} /> : null}
                      {link.type === "VIDEO" ? <PlayCircle size={14} /> : null}
                      {link.label}
                    </ExternalButtonLink>
                  ))}
                </div>
              ) : null}
            </div>

            {project.coverImageUrl ? (
              <Reveal className="panel overflow-hidden">
                <div className="relative aspect-[16/10] w-full bg-base-900">
                  <Image
                    src={project.coverImageUrl}
                    alt={project.coverImageAlt ?? `Capa do projeto ${project.title}`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover"
                  />
                </div>
              </Reveal>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 pt-12 sm:px-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:px-10">
        <aside className="hidden lg:block">
          <CaseNav items={navItems} />
        </aside>

        <div className="min-w-0 space-y-14">
          {/* ------------------------------------------------- resultados */}
          {project.metrics.length > 0 ? (
            <section id="resultados-chave" className="scroll-mt-28">
              <h2 className="rule-label mb-4">Resultados-chave</h2>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {project.metrics.map((metric, index) => (
                  <Reveal key={metric.id} delay={index * 60} className="panel p-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent">
                      <DynamicIcon name={metric.icon} size={15} fallback="trending-up" />
                    </span>
                    <dd className="mt-3 font-display text-2xl font-semibold text-ink">{metric.value}</dd>
                    <dt className="mt-1 text-[13.5px] text-ink-muted">{metric.label}</dt>
                    {metric.description ? (
                      <p className="mt-1.5 text-[12.5px] leading-snug text-ink-faint">{metric.description}</p>
                    ) : null}
                  </Reveal>
                ))}
              </dl>
            </section>
          ) : null}

          {/* ----------------------------------------------- texto do caso */}
          {project.sections.map((section) => {
            const meta = SECTION_META[section.type] ?? SECTION_META.CUSTOM!;
            return (
              <Reveal key={section.id} as="section" className="scroll-mt-28">
                <div id={`secao-${section.id}`} className="scroll-mt-28">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-base-850 text-accent">
                      <DynamicIcon name={meta.icon} size={15} />
                    </span>
                    <h2 className="text-xl font-semibold text-ink">{section.title}</h2>
                  </div>
                  <div
                    className="prose-portfolio max-w-3xl text-[14.5px]"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(section.body) }}
                  />
                </div>
              </Reveal>
            );
          })}

          {/* -------------------------------------------------- arquitetura */}
          {project.diagrams.length > 0 || diagramImages.length > 0 ? (
            <section id="arquitetura" className="scroll-mt-28">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-base-850 text-accent">
                  <DynamicIcon name="workflow" size={15} />
                </span>
                <h2 className="text-xl font-semibold text-ink">Arquitetura</h2>
              </div>

              <div className="space-y-5">
                {project.diagrams.map((diagram) => (
                  <ArchitectureDiagram
                    key={diagram.id}
                    source={diagram.source}
                    title={diagram.title}
                    description={diagram.description}
                  />
                ))}

                {diagramImages.length > 0 ? (
                  <Gallery
                    images={diagramImages.map((image) => ({
                      id: image.id,
                      url: image.url,
                      alt: image.alt,
                      caption: image.caption,
                    }))}
                    columns={2}
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {/* -------------------------------------------------- tecnologias */}
          {project.technologies.length > 0 ? (
            <section id="tecnologias" className="scroll-mt-28">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-base-850 text-accent">
                  <Layers size={15} aria-hidden />
                </span>
                <h2 className="text-xl font-semibold text-ink">Tecnologias utilizadas</h2>
              </div>
              <TechMatrix entries={project.technologies} />
            </section>
          ) : null}

          {/* ----------------------------------------------- funcionalidades */}
          {project.features.length > 0 ? (
            <section id="funcionalidades" className="scroll-mt-28">
              <h2 className="rule-label mb-4">Principais funcionalidades</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {project.features.map((feature, index) => (
                  <Reveal key={feature.id} as="li" delay={index * 50} className="panel flex gap-3 p-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-base-850 text-accent">
                      <DynamicIcon name={feature.icon} size={14} fallback="zap" />
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-medium text-ink">{feature.title}</span>
                      {feature.description ? (
                        <span className="mt-1 block text-[12.5px] leading-snug text-ink-muted">
                          {feature.description}
                        </span>
                      ) : null}
                    </span>
                  </Reveal>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ----------------------------------------------------- endpoints */}
          {project.endpoints.length > 0 ? (
            <section id="endpoints" className="scroll-mt-28">
              <h2 className="rule-label mb-4">Endpoints e integrações</h2>
              <EndpointsTable endpoints={project.endpoints} />
            </section>
          ) : null}

          {/* --------------------------------------------------------- código */}
          {project.codeBlocks.length > 0 ? (
            <section id="codigo" className="scroll-mt-28">
              <h2 className="rule-label mb-4">Trechos de código</h2>
              <div className="space-y-5">
                {project.codeBlocks.map((block) => (
                  <CodeBlock
                    key={block.id}
                    code={block.code}
                    language={block.language}
                    title={block.title}
                    description={block.description}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* -------------------------------------------------------- galeria */}
          {screenshots.length > 0 ? (
            <section id="galeria" className="scroll-mt-28">
              <h2 className="rule-label mb-4">Imagens e demonstrações</h2>
              <Gallery
                images={screenshots.map((image) => ({
                  id: image.id,
                  url: image.url,
                  alt: image.alt,
                  caption: image.caption,
                }))}
              />
            </section>
          ) : null}

          {project.description ? (
            <section className="scroll-mt-28">
              <h2 className="rule-label mb-4">Sobre o projeto</h2>
              <div
                className="prose-portfolio max-w-3xl text-[14.5px]"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(project.description) }}
              />
            </section>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------ outros projetos */}
      {related.length > 0 ? (
        <section className="mt-16 border-t border-line px-5 py-14 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <h2 className="text-xl font-semibold text-ink">Outros projetos</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {related.map((item, index) => (
                <ProjectCard key={item.id} project={item} delay={index * 60} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
