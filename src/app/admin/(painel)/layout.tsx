import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/shell";
import { CsrfProvider } from "@/components/admin/csrf";
import { ToastProvider } from "@/components/admin/toast";
import { logoutAction } from "@/server/actions/auth";
import { getCsrfToken, getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

// Admin pages read live data and must never be cached.
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  // The login page renders its own layout; everything else requires a session.
  if (!user) redirect("/admin/login");

  const [csrfToken, unreadMessages] = await Promise.all([
    getCsrfToken(),
    prisma.contactMessage.count({ where: { read: false } }),
  ]);

  return (
    <CsrfProvider token={csrfToken}>
      <ToastProvider>
        <AdminShell user={user} unreadMessages={unreadMessages} logout={logoutAction}>
          {children}
        </AdminShell>
      </ToastProvider>
    </CsrfProvider>
  );
}
