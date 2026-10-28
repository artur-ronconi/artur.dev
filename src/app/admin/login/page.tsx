import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/icons/logo";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div
        aria-hidden
        className="grid-backdrop pointer-events-none fixed inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />
      <div className="panel relative w-full max-w-sm p-7">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold text-ink">Painel administrativo</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">
          Acesso restrito. Entre com suas credenciais de administrador.
        </p>

        <LoginForm />

        <p className="mt-6 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-faint">
          Não há cadastro público. Novos administradores são criados pelo comando{" "}
          <code className="font-mono text-accent">npm run admin:create</code>.
        </p>
      </div>
    </main>
  );
}
