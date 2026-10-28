"use server";

import { revalidatePath } from "next/cache";

import { adminAction } from "@/server/actions/guard";
import { fieldErrorsFrom, type ActionResult } from "@/server/actions/result";
import {
  createProject,
  deleteProject,
  duplicateProject,
  removeDemoContent,
  reorderProjects,
  setProjectStatus,
  toggleProjectFeatured,
  updateProject,
} from "@/server/modules/project-service";
import { projectInputSchema } from "@/server/validation/schemas";

/** Public pages are statically rendered; mutations refresh the affected paths. */
function revalidatePublic(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/projetos");
  if (slug) revalidatePath(`/projetos/${slug}`);
  revalidatePath("/admin", "layout");
}

export async function saveProjectAction(
  csrfToken: string,
  payload: { id?: string; input: unknown },
): Promise<ActionResult<{ id: string; slug: string }>> {
  return adminAction(csrfToken, async () => {
    const parsed = projectInputSchema.safeParse(payload.input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Corrija os campos destacados antes de salvar.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const project = payload.id
      ? await updateProject(payload.id, parsed.data)
      : await createProject(parsed.data);

    revalidatePublic(project.slug);

    return {
      ok: true,
      data: { id: project.id, slug: project.slug },
      message: payload.id ? "Projeto atualizado." : "Projeto criado.",
    };
  });
}

export async function setProjectStatusAction(
  csrfToken: string,
  id: string,
  status: "DRAFT" | "PUBLISHED",
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const project = await setProjectStatus(id, status);
    revalidatePublic(project.slug);
    return { ok: true, message: status === "PUBLISHED" ? "Projeto publicado." : "Projeto despublicado." };
  });
}

export async function toggleFeaturedAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const project = await toggleProjectFeatured(id);
    revalidatePublic(project.slug);
    return { ok: true, message: project.featured ? "Projeto destacado." : "Destaque removido." };
  });
}

export async function deleteProjectAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const project = await deleteProject(id);
    revalidatePublic(project.slug);
    return { ok: true, message: "Projeto excluído." };
  });
}

export async function duplicateProjectAction(
  csrfToken: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return adminAction(csrfToken, async () => {
    const project = await duplicateProject(id);
    revalidatePublic();
    return { ok: true, data: { id: project.id }, message: "Projeto duplicado como rascunho." };
  });
}

export async function reorderProjectsAction(csrfToken: string, ids: string[]): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await reorderProjects(ids);
    revalidatePublic();
    return { ok: true, message: "Ordem atualizada." };
  });
}

export async function removeDemoContentAction(csrfToken: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const removed = await removeDemoContent();
    revalidatePublic();
    return {
      ok: true,
      message: `Dados de demonstração removidos (${removed.projects} projetos, ${removed.technologies} tecnologias, ${removed.experiences} experiências).`,
    };
  });
}
