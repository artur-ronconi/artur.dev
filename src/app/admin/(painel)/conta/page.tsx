import { PageHeader } from "@/components/admin/shell";
import { PasswordForm } from "@/components/admin/password-form";
import { formatDateTime } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export default async function AdminAccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [account, sessions] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, createdAt: true, lastLoginAt: true },
    }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, expiresAt: true, ip: true, userAgent: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Conta" description="Credenciais de acesso e sessões ativas." />

      <div className="space-y-5">
        <section className="panel max-w-lg p-5">
          <h2 className="text-[15px] font-semibold text-ink">Administrador</h2>
          <dl className="mt-4 space-y-2.5 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Nome</dt>
              <dd className="text-ink">{account?.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">E-mail</dt>
              <dd className="text-ink">{account?.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-faint">Último acesso</dt>
              <dd className="text-ink">
                {account?.lastLoginAt ? formatDateTime(account.lastLoginAt) : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <PasswordForm />

        <section className="panel p-5">
          <h2 className="text-[15px] font-semibold text-ink">Sessões ativas</h2>
          <ul className="mt-4 divide-y divide-line text-[12.5px]">
            {sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span className="truncate text-ink-muted">{session.userAgent ?? "Dispositivo desconhecido"}</span>
                <span className="font-mono text-[11.5px] text-ink-faint">
                  {session.ip ?? "ip desconhecido"} · expira {formatDateTime(session.expiresAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
