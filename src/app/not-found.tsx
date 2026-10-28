import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/icons/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="grid-backdrop panel w-full max-w-lg p-10 text-center">
        <Logo className="mx-auto" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-faint">Erro 404</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Página não encontrada</h1>
        <p className="mt-3 text-sm text-ink-muted">
          O endereço acessado não existe ou o conteúdo não está mais publicado.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Voltar ao início</ButtonLink>
          <Link
            href="/projetos"
            className="inline-flex h-10 items-center rounded-lg border border-line-strong px-4 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Ver projetos
          </Link>
        </div>
      </div>
    </main>
  );
}
