import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getCurrentUser } from "@/server/auth/session";
import { getPaletteData } from "@/server/modules/navigation";
import { getSettings } from "@/server/modules/portfolio";

export const metadata: Metadata = {
  title: "Pré-visualização",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Prévia autenticada: usa o mesmo cabeçalho/rodapé do site público para que o
 * administrador veja exatamente o resultado final antes de publicar.
 */
export default async function PreviewLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [settings, palette] = await Promise.all([getSettings(), getPaletteData()]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        items={[
          { href: "/", label: "Site" },
          { href: "/projetos", label: "Projetos" },
          { href: "/admin/projetos", label: "Painel" },
        ]}
        githubUrl={settings.githubUrl}
        linkedinUrl={settings.linkedinUrl}
        resumeUrl={settings.resumeUrl}
        palette={palette}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter
        note={settings.footerNote}
        githubUrl={settings.githubUrl}
        linkedinUrl={settings.linkedinUrl}
        email={settings.email}
      />
    </div>
  );
}
