import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { env } from "@/lib/env";
import { prisma } from "@/server/db/prisma";

export const SESSION_COOKIE = "artur_session";
export const CSRF_COOKIE = "artur_csrf";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(`${token}${env().AUTH_SECRET}`).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const ttlMs = env().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  const headerList = await headers();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
      ip: clientIpFrom(headerList),
    },
  });

  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });

  // Double-submit CSRF token: readable by the admin client, echoed on mutations.
  store.set(CSRF_COOKIE, randomBytes(24).toString("base64url"), {
    httpOnly: false,
    sameSite: "strict",
    secure,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  store.delete(SESSION_COOKIE);
  store.delete(CSRF_COOKIE);
}

/** Resolves the logged-in admin for the current request (memoized per render). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return { id: session.user.id, name: session.user.name, email: session.user.email };
});

/** Throws when there is no authenticated admin — used by every server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function assertCsrf(submitted: string | undefined | null): Promise<void> {
  const store = await cookies();
  const expected = store.get(CSRF_COOKIE)?.value;
  if (!expected || !submitted) throw new Error("CSRF_INVALID");

  const a = Buffer.from(expected);
  const b = Buffer.from(submitted);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("CSRF_INVALID");
}

export async function getCsrfToken(): Promise<string> {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value ?? "";
}

export function clientIpFrom(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

export async function clientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

export async function purgeExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
