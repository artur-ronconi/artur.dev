"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, ExternalLink, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ExplorerTechnology = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  featured: boolean;
  /** Logos renderizados no servidor (o pacote de ícones não vai para o navegador). */
  icon: ReactNode;
  largeIcon: ReactNode;
  projects: Array<{ slug: string; title: string; role: string | null }>;
};

export type ExplorerCategory = {
  id: string;
  name: string;
  description: string | null;
  icon: ReactNode;
  technologies: ExplorerTechnology[];
};

/**
 * Stack interativa: filtra por categoria e, ao escolher uma tecnologia, mostra
 * em quais projetos ela foi usada (e com qual papel) e destaca na grade as
 * tecnologias que aparecem junto com ela nesses projetos.
 */
export function TechExplorer({ categories }: { categories: ExplorerCategory[] }) {
  const all = useMemo(() => categories.flatMap((category) => category.technologies), [categories]);
  const initial = all.find((technology) => technology.featured && technology.projects.length > 0) ?? all[0];

  const [filter, setFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(initial?.id ?? null);

  const selected = all.find((technology) => technology.id === selectedId) ?? null;
  const selectedCategory = categories.find((category) => category.technologies.some((entry) => entry.id === selectedId));

  /** Tecnologias que dividem ao menos um projeto com a selecionada. */
  const companions = useMemo(() => {
    if (!selected) return [];
    const slugs = new Set(selected.projects.map((project) => project.slug));
    return all.filter(
      (technology) => technology.id !== selected.id && technology.projects.some((project) => slugs.has(project.slug)),
    );
  }, [all, selected]);
  const companionIds = new Set(companions.map((technology) => technology.id));

  const visible = filter ? categories.filter((category) => category.id === filter) : categories;

  return (
    <div className="mt-9">
      <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
        <FilterButton active={filter === null} onClick={() => setFilter(null)} count={all.length}>
          Todas
        </FilterButton>
        {categories.map((category) => (
          <FilterButton
            key={category.id}
            active={filter === category.id}
            onClick={() => setFilter(filter === category.id ? null : category.id)}
            count={category.technologies.length}
            icon={category.icon}
          >
            {category.name}
          </FilterButton>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {visible.map((category) => (
            <div key={category.id} className="line-in">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <span className="text-accent" aria-hidden>
                    {category.icon}
                  </span>
                  {category.name}
                </h3>
                {category.description ? (
                  <p className="hidden truncate font-mono text-[11px] text-ink-faint md:block">{category.description}</p>
                ) : null}
              </div>

              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {category.technologies.map((technology) => {
                  const active = technology.id === selectedId;
                  const companion = companionIds.has(technology.id);

                  return (
                    <li key={technology.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(technology.id)}
                        aria-pressed={active}
                        className={cn(
                          "panel panel-hover relative flex w-full items-center gap-2.5 px-3 py-2.5 text-left",
                          active && "!border-accent bg-accent-soft/40 shadow-[var(--shadow-panel)]",
                          !active && companion && "!border-accent/45 border-dashed",
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-base-850">
                          {technology.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink">{technology.name}</span>
                          <span className="block truncate font-mono text-[10.5px] text-ink-faint">
                            {technology.projects.length > 0
                              ? `${technology.projects.length} projeto${technology.projects.length > 1 ? "s" : ""}`
                              : "ferramenta do dia a dia"}
                          </span>
                        </span>
                        {!active && companion ? (
                          <Link2 size={12} aria-label="Usada junto com a tecnologia selecionada" className="absolute right-2 top-2 text-accent" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <aside aria-live="polite" className="lg:sticky lg:top-24 lg:self-start">
          {selected ? (
            <div key={selected.id} className="panel line-in overflow-hidden">
              <div className="grid-backdrop flex items-center gap-4 border-b border-line p-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-base-850">
                  {selected.largeIcon}
                </span>
                <div className="min-w-0">
                  <p className="rule-label text-accent">{selectedCategory?.name}</p>
                  <h3 className="mt-1 truncate text-xl font-semibold text-ink">{selected.name}</h3>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {selected.description ? (
                  <p className="text-[13.5px] leading-relaxed text-ink-muted">{selected.description}</p>
                ) : null}

                <div>
                  <p className="rule-label">usada em</p>
                  {selected.projects.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {selected.projects.map((project) => (
                        <li key={project.slug}>
                          <Link
                            href={`/projetos/${project.slug}`}
                            className="group/link flex items-start justify-between gap-3 rounded-lg border border-line bg-base-850 px-3 py-2 transition-colors hover:border-accent/50"
                          >
                            <span className="min-w-0">
                              <span className="block text-[13px] font-medium text-ink group-hover/link:text-accent">
                                {project.title}
                              </span>
                              {project.role ? (
                                <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{project.role}</span>
                              ) : null}
                            </span>
                            <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-ink-faint group-hover/link:text-accent" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[12.5px] text-ink-faint">
                      Ainda não está associada a um estudo de caso publicado.
                    </p>
                  )}
                </div>

                {companions.length > 0 ? (
                  <div>
                    <p className="rule-label">aparece junto com</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {companions.map((technology) => (
                        <button
                          key={technology.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(technology.id);
                            setFilter(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-base-850 px-2 py-1 text-[12px] text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
                        >
                          <span className="flex h-4 w-4 items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5">
                            {technology.icon}
                          </span>
                          {technology.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selected.url ? (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-accent transition-opacity hover:opacity-80"
                  >
                    Site oficial <ExternalLink size={12} aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  count,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors",
        active
          ? "border-accent/60 bg-accent-soft text-accent"
          : "border-line bg-base-900 text-ink-muted hover:border-accent/40 hover:text-ink",
      )}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
      <span className={cn("font-mono text-[10.5px]", active ? "text-accent/80" : "text-ink-faint")}>{count}</span>
    </button>
  );
}
