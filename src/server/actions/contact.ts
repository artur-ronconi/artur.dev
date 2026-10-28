"use server";

import { prisma } from "@/server/db/prisma";
import { clientIp } from "@/server/auth/session";
import { contactMessageSchema } from "@/server/validation/schemas";
import { fieldErrorsFrom, type ActionResult } from "@/server/actions/result";
import { toUserMessage } from "@/server/db/errors";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;

/** Public contact form: validated, honeypot-protected and rate limited by IP. */
export async function submitContactMessageAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = contactMessageSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject") ?? undefined,
    message: formData.get("message"),
    website: formData.get("website") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  if (parsed.data.website) {
    // Honeypot hit: pretend success so bots do not learn anything.
    return { ok: true, message: "Mensagem enviada. Obrigado pelo contato!" };
  }

  try {
    const ip = await clientIp();
    const recent = await prisma.contactMessage.count({
      where: { ip, createdAt: { gte: new Date(Date.now() - WINDOW_MS) } },
    });

    if (recent >= MAX_PER_WINDOW) {
      return { ok: false, message: "Muitas mensagens enviadas. Tente novamente mais tarde." };
    }

    await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        subject: parsed.data.subject?.trim() || null,
        message: parsed.data.message,
        ip,
      },
    });

    return { ok: true, message: "Mensagem enviada. Obrigado pelo contato!" };
  } catch (error) {
    return { ok: false, message: toUserMessage(error) };
  }
}
