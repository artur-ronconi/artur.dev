"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { clientIp, createSession, destroySession, requireUser } from "@/server/auth/session";
import { checkLoginRateLimit, recordLoginAttempt } from "@/server/auth/rate-limit";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/auth/password";
import { changePasswordSchema, loginSchema } from "@/server/validation/schemas";
import { fieldErrorsFrom, type ActionResult } from "@/server/actions/result";
import { adminAction } from "@/server/actions/guard";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados informados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { email, password } = parsed.data;
  const ip = await clientIp();

  const limit = await checkLoginRateLimit(email, ip);
  if (limit.blocked) {
    return {
      ok: false,
      message: `Muitas tentativas de login. Tente novamente em ${limit.retryAfterMinutes} minutos.`,
    };
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  // Always run a comparison so the response time does not reveal valid e-mails.
  const fallbackHash = "$2a$12$1qAzBkK1kMLmhUgQrPz4xeK7tV1h0Lx9bqHcs3P4oZ1vhkMZcxrkK";
  const valid = await verifyPassword(password, user?.passwordHash ?? fallbackHash);

  if (!user || !user.isActive || !valid) {
    await recordLoginAttempt(email, ip, false);
    return { ok: false, message: "E-mail ou senha inválidos." };
  }

  await recordLoginAttempt(email, ip, true);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(
  csrfToken: string,
  input: { currentPassword: string; newPassword: string; confirmPassword: string },
): Promise<ActionResult> {
  return adminAction(csrfToken, async (sessionUser) => {
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Verifique os dados informados.", fieldErrors: fieldErrorsFrom(parsed.error) };
    }

    const strengthError = validatePasswordStrength(parsed.data.newPassword);
    if (strengthError) {
      return { ok: false, message: strengthError, fieldErrors: { newPassword: strengthError } };
    }

    const user = await prisma.adminUser.findUnique({ where: { id: sessionUser.id } });
    if (!user) return { ok: false, message: "Usuário não encontrado." };

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return { ok: false, message: "Senha atual incorreta.", fieldErrors: { currentPassword: "Senha atual incorreta." } };
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    // Invalidate other sessions after a credential change.
    await prisma.session.deleteMany({ where: { userId: user.id } });

    return { ok: true, message: "Senha atualizada. Faça login novamente." };
  });
}

export async function requireAdminUser() {
  return requireUser();
}
