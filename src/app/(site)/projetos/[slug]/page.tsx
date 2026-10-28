import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseStudy } from "@/components/project/case-study";
import { stripMarkdown } from "@/lib/markdown";
import { truncate } from "@/lib/utils";
import { getProjectBySlug } from "@/server/modules/projects";

// Renderização sob demanda: é a única forma de um slug inexistente responder
// 404 de verdade (rotas pré-renderizadas devolvem a página 404 com status 200).
// A consulta é um único SELECT com joins, então o custo por requisição é baixo.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) return { title: "Projeto não encontrado" };

  const description = project.metaDescription ?? truncate(stripMarkdown(project.summary), 160);

  return {
    title: project.metaTitle ?? project.title,
    description,
    alternates: { canonical: `/projetos/${project.slug}` },
    robots: project.indexable ? undefined : { index: false, follow: false },
    openGraph: {
      type: "article",
      title: project.metaTitle ?? project.title,
      description,
      images: project.ogImageUrl
        ? [{ url: project.ogImageUrl }]
        : project.coverImageUrl
          ? [{ url: project.coverImageUrl }]
          : undefined,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  // Rascunhos não existem publicamente: a prévia autenticada fica em /preview/[id].
  if (!project) notFound();

  return <CaseStudy project={project} />;
}
