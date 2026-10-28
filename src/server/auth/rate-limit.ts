import "server-only";

import { prisma } from "@/server/db/prisma";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS_PER_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 15;

export type RateLimitResult = { blocked: boolean; retryAfterMinutes: number };

/** Counts recent failed logins for the e-mail and the origin IP. */
export async function checkLoginRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { email, success: false, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);

  return {
    blocked: byEmail >= MAX_ATTEMPTS_PER_EMAIL || byIp >= MAX_ATTEMPTS_PER_IP,
    retryAfterMinutes: WINDOW_MINUTES,
  };
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await prisma.loginAttempt.create({ data: { email, ip, success } });

  if (success) {
    await prisma.loginAttempt.deleteMany({ where: { email, success: false } });
  }

  // Housekeeping: attempts older than a day are irrelevant.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
