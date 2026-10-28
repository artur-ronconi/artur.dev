import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/footer";
import { SiteHeader, type NavItem } from "@/components/site/header";
import { getPaletteData } from "@/server/modules/navigation";
import { getSettings } from "@/server/modules/portfolio";

// O conteúdo vem do banco e muda pelo painel: nada é pré-renderizado no build
// (a imagem Docker nem tem banco nessa hora).
export const dynamic = "force-dynamic";

const NAV_ITEMS: NavItem[] = [
  { href: "/#inicio", label: "Início" },
  { href: "/projetos", label: "Projetos" },
  { href: "/#experiencia", label: "Experiência" },
  { href: "/#certificacoes", label: "Certificações" },
  { href: "/#sobre", label: "Sobre" },
  { href: "/#contato", label: "Contato" },
];

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [settings, palette] = await Promise.all([getSettings(), getPaletteData()]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent-strong focus:px-4 focus:py-2 focus:text-sm focus:text-base-950"
      >
        Pular para o conteúdo
      </a>

      <SiteHeader
        items={NAV_ITEMS}
        githubUrl={settings.githubUrl}
        linkedinUrl={settings.linkedinUrl}
        resumeUrl={settings.resumeUrl}
        palette={palette}
      />

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <SiteFooter
        note={settings.footerNote}
        githubUrl={settings.githubUrl}
        linkedinUrl={settings.linkedinUrl}
        email={settings.email}
        updatedAt={settings.updatedAt}
      />
    </div>
  );
}
