import Link from "next/link";
import { Mail } from "lucide-react";

import { BrandIcon } from "@/components/icons/brand-icons";

import { Logo } from "@/components/icons/logo";

export function SiteFooter({
  note,
  githubUrl,
  linkedinUrl,
  email,
  updatedAt,
}: {
  note?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  updatedAt?: Date | null;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-base-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-ink-faint">
            {note ?? "Código, infraestrutura e boas ideias."}
          </p>
        </div>

        <nav aria-label="Links do rodapé" className="flex flex-wrap items-center gap-5 text-sm">
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-accent"
            >
              <BrandIcon name="github" size={16} /> GitHub
            </a>
          ) : null}
          {linkedinUrl ? (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-accent"
            >
              <BrandIcon name="linkedin" size={16} /> LinkedIn
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-accent"
            >
              <Mail size={16} /> E-mail
            </a>
          ) : null}
          <Link href="/projetos" className="text-ink-muted transition-colors hover:text-accent">
            Projetos
          </Link>
        </nav>

        <div className="text-xs text-ink-faint lg:text-right">
          <p>© {year} Artur Hamann Ronconi</p>
          {updatedAt && updatedAt.getTime() > 0 ? (
            <p className="mt-1 font-mono">
              Atualizado em {new Intl.DateTimeFormat("pt-BR").format(updatedAt)}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
