"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { adminAction } from "@/server/actions/guard";
import { fieldErrorsFrom, type ActionResult } from "@/server/actions/result";
import { SETTINGS_ID, HOME_SECTION_LABELS, type HomeSectionKey } from "@/server/modules/portfolio";
import {
  certificationSchema,
  experienceSchema,
  homeSectionOrderSchema,
  settingsSchema,
  socialLinkSchema,
} from "@/server/validation/schemas";

function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}

export async function saveSettingsAction(csrfToken: string, input: unknown): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    await prisma.portfolioSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...parsed.data },
      update: parsed.data,
    });

    revalidateAll();
    return { ok: true, message: "Informações do portfólio atualizadas." };
  });
}

export async function saveExperienceAction(
  csrfToken: string,
  payload: { id?: string; input: unknown },
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const parsed = experienceSchema.safeParse(payload.input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    const { technologyIds, media, ...fields } = parsed.data;

    // Tecnologias e mídias são regravadas a cada salvamento: assim a ordem, as
    // inclusões e as remoções ficam sempre iguais ao que está no formulário.
    const relations = {
      technologies: {
        create: technologyIds.map((technologyId, order) => ({ technologyId, order })),
      },
      media: { create: media.map((item, order) => ({ ...item, order })) },
    };

    if (payload.id) {
      const id = payload.id;
      await prisma.$transaction([
        prisma.experienceTechnology.deleteMany({ where: { experienceId: id } }),
        prisma.experienceMedia.deleteMany({ where: { experienceId: id } }),
        prisma.professionalExperience.update({ where: { id }, data: { ...fields, ...relations } }),
      ]);
    } else {
      await prisma.professionalExperience.create({ data: { ...fields, ...relations } });
    }

    revalidateAll();
    return { ok: true, message: "Experiência salva." };
  });
}

export async function deleteExperienceAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.professionalExperience.delete({ where: { id } });
    revalidateAll();
    return { ok: true, message: "Experiência removida." };
  });
}

export async function saveCertificationAction(
  csrfToken: string,
  payload: { id?: string; input: unknown },
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const parsed = certificationSchema.safeParse(payload.input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    if (payload.id) {
      await prisma.certification.update({ where: { id: payload.id }, data: parsed.data });
    } else {
      await prisma.certification.create({ data: parsed.data });
    }

    revalidateAll();
    return { ok: true, message: "Certificação salva." };
  });
}

export async function deleteCertificationAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.certification.delete({ where: { id } });
    revalidateAll();
    return { ok: true, message: "Certificação removida." };
  });
}

export async function saveSocialLinkAction(
  csrfToken: string,
  payload: { id?: string; input: unknown },
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const parsed = socialLinkSchema.safeParse(payload.input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    if (payload.id) {
      await prisma.socialLink.update({ where: { id: payload.id }, data: parsed.data });
    } else {
      await prisma.socialLink.create({ data: parsed.data });
    }

    revalidateAll();
    return { ok: true, message: "Link salvo." };
  });
}

export async function deleteSocialLinkAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.socialLink.delete({ where: { id } });
    revalidateAll();
    return { ok: true, message: "Link removido." };
  });
}

export async function saveHomeSectionsAction(csrfToken: string, input: unknown): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const parsed = homeSectionOrderSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Não foi possível salvar a ordem das seções." };
    }

    await prisma.$transaction(
      parsed.data.sections.map((section) =>
        prisma.homeSection.upsert({
          where: { key: section.key },
          create: {
            key: section.key,
            label: HOME_SECTION_LABELS[section.key as HomeSectionKey] ?? section.key,
            visible: section.visible,
            order: section.order,
          },
          update: { visible: section.visible, order: section.order },
        }),
      ),
    );

    revalidateAll();
    return { ok: true, message: "Seções da página inicial atualizadas." };
  });
}

export async function markMessageReadAction(
  csrfToken: string,
  id: string,
  read: boolean,
): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.contactMessage.update({ where: { id }, data: { read } });
    revalidatePath("/admin/mensagens");
    return { ok: true };
  });
}

export async function deleteMessageAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    await prisma.contactMessage.delete({ where: { id } });
    revalidatePath("/admin/mensagens");
    return { ok: true, message: "Mensagem removida." };
  });
}

export async function deleteMediaAction(csrfToken: string, id: string): Promise<ActionResult> {
  return adminAction(csrfToken, async () => {
    const { deleteMedia } = await import("@/server/modules/media");
    await deleteMedia(id);
    revalidatePath("/admin/midia");
    return { ok: true, message: "Imagem removida." };
  });
}
