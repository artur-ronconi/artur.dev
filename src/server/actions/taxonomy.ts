"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { adminAction } from "@/server/actions/guard";
import { fieldErrorsFrom, type ActionResult } from "@/server/actions/result";
import {
  projectCategorySchema,
  technologyCategorySchema,
  technologySchema,
} from "@/server/validation/schemas";

function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}

export async function saveTechnologyAction(
  csrfToken: string,
  payload: { id?: string; input: unknown },
): Promise<ActionResult<{ id: string }>> {
  return adminAction(csrfToken, async () => {
    const parsed = technologySchema.safeParse(payload.input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    const data = parsed.data;
    const technology = payload.id
      ? await prisma.technology.update({ where: { id: payload.id }, data })
      : await prisma.technology.create({ data });

    revalidateAll();
    return { ok: true, data: { id: technology.id }, message: "Tecnologia salva." };
  });
}

export async function deleteTechnologyAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.technology.delete({ where: { id } });
    revalidateAll();
    return { ok: true, message: "Tecnologia removida." };
  });
}

export async function saveTechnologyCategoryAction(
  csrfToken: string,
  payload: { id?: string; input: unknown },
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const parsed = technologyCategorySchema.safeParse(payload.input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    if (payload.id) {
      await prisma.technologyCategory.update({ where: { id: payload.id }, data: parsed.data });
    } else {
      await prisma.technologyCategory.create({ data: parsed.data });
    }

    revalidateAll();
    return { ok: true, message: "Categoria salva." };
  });
}

export async function deleteTechnologyCategoryAction(
  csrfToken: string,
  id: string,
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.technologyCategory.delete({ where: { id } });
    revalidateAll();
    return { ok: true, message: "Categoria removida." };
  });
}

export async function saveProjectCategoryAction(
  csrfToken: string,
  payload: { id?: string; input: unknown },
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const parsed = projectCategorySchema.safeParse(payload.input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    if (payload.id) {
      await prisma.projectCategory.update({ where: { id: payload.id }, data: parsed.data });
    } else {
      await prisma.projectCategory.create({ data: parsed.data });
    }

    revalidateAll();
    return { ok: true, message: "Categoria salva." };
  });
}

export async function deleteProjectCategoryAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.projectCategory.delete({ where: { id } });
    revalidateAll();
    return { ok: true, message: "Categoria removida." };
  });
}
