import { notFound } from "next/navigation";

import { CaseStudy } from "@/components/project/case-study";
import { getProjectById } from "@/server/modules/projects";

export const dynamic = "force-dynamic";

/** Prévia de qualquer projeto (inclusive rascunhos) para administradores. */
export default async function ProjectPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) notFound();

  return <CaseStudy project={project} isPreview />;
}
