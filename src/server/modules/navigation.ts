import "server-only";

import type { PaletteData } from "@/components/site/command-palette";
import { getSettings } from "@/server/modules/portfolio";
import { getPublishedProjects } from "@/server/modules/projects";

/** Tudo que a paleta de comandos (Ctrl+K) do site consegue abrir. */
export async function getPaletteData(): Promise<PaletteData> {
  const [settings, projects] = await Promise.all([getSettings(), getPublishedProjects()]);

  return {
    sections: [
      { href: "/#inicio", label: "Início" },
      { href: "/#tecnologias", label: "Tecnologias e ferramentas" },
      { href: "/#destaque", label: "Destaque: fluxo da arquitetura" },
      { href: "/#laboratorio", label: "Laboratório de servidores" },
      { href: "/projetos", label: "Todos os projetos" },
      { href: "/#experiencia", label: "Experiência profissional" },
      { href: "/#certificacoes", label: "Certificações" },
      { href: "/#sobre", label: "Sobre mim" },
      { href: "/#contato", label: "Contato" },
    ],
    projects: projects.map((project) => ({
      slug: project.slug,
      title: project.title,
      category: project.category?.name ?? null,
    })),
    email: settings.email,
    githubUrl: settings.githubUrl,
    linkedinUrl: settings.linkedinUrl,
    resumeUrl: settings.resumeUrl,
  };
}
