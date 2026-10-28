"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Copy,
  CornerDownLeft,
  Download,
  ExternalLink,
  FolderGit2,
  Hash,
  Search,
  SunMoon,
} from "lucide-react";

import { toggleTheme } from "@/components/site/theme";
import { cn } from "@/lib/utils";

export type PaletteData = {
  sections: Array<{ href: string; label: string }>;
  projects: Array<{ slug: string; title: string; category: string | null }>;
  email: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
};

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Paleta de comandos (⌘K / Ctrl+K / "/"): busca e navegação por teclado entre
 * seções, projetos e ações rápidas como trocar o tema ou copiar o e-mail.
 */
export function CommandPalette({ data }: { data: PaletteData }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);

  const close = () => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  };

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const external = (href: string) => () => window.open(href, "_blank", "noopener,noreferrer");

    return [
      ...data.sections.map((section) => ({
        id: `secao:${section.href}`,
        group: "Navegar",
        label: section.label,
        icon: <Hash size={15} />,
        run: go(section.href),
      })),
      ...data.projects.map((project) => ({
        id: `projeto:${project.slug}`,
        group: "Projetos",
        label: project.title,
        hint: project.category ?? undefined,
        icon: <FolderGit2 size={15} />,
        run: go(`/projetos/${project.slug}`),
      })),
      {
        id: "acao:tema",
        group: "Ações",
        label: "Alternar tema claro / escuro",
        icon: <SunMoon size={15} />,
        run: () => toggleTheme({ x: window.innerWidth / 2, y: window.innerHeight / 3 }),
      },
      ...(data.email
        ? [
            {
              id: "acao:email",
              group: "Ações",
              label: copied ? "E-mail copiado" : "Copiar e-mail",
              hint: data.email,
              icon: <Copy size={15} />,
              run: () => {
                void navigator.clipboard?.writeText(data.email!).then(() => setCopied(true));
              },
            },
          ]
        : []),
      ...(data.resumeUrl
        ? [{ id: "acao:cv", group: "Ações", label: "Baixar currículo", icon: <Download size={15} />, run: external(data.resumeUrl) }]
        : []),
      ...(data.githubUrl
        ? [{ id: "acao:github", group: "Ações", label: "Abrir GitHub", icon: <ExternalLink size={15} />, run: external(data.githubUrl) }]
        : []),
      ...(data.linkedinUrl
        ? [{ id: "acao:linkedin", group: "Ações", label: "Abrir LinkedIn", icon: <ExternalLink size={15} />, run: external(data.linkedinUrl) }]
        : []),
    ];
  }, [copied, data, router]);

  const results = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return commands.filter((command) => {
      const haystack = normalize(`${command.label} ${command.hint ?? ""} ${command.group}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [commands, query]);

  const active = Math.min(cursor, Math.max(0, results.length - 1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]");
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const execute = (command: Command) => {
    command.run();
    // Copiar o e-mail mantém a paleta aberta para mostrar a confirmação.
    if (command.id !== "acao:email") close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir busca e comandos"
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
      >
        <Search size={15} aria-hidden />
        <span className="hidden text-[12.5px] xl:inline">Buscar</span>
        <span className="hidden items-center gap-0.5 md:flex" aria-hidden>
          <kbd className="kbd">Ctrl</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-start justify-center bg-base-950/70 p-4 pt-[12vh] backdrop-blur-sm"
              onClick={close}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Busca e comandos"
                className="panel line-in w-full max-w-xl overflow-hidden shadow-[var(--shadow-float)]"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") close();
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    const step = event.key === "ArrowDown" ? 1 : -1;
                    setCursor((active + step + results.length) % Math.max(1, results.length));
                  }
                  if (event.key === "Enter") {
                    const command = results[active];
                    if (command) execute(command);
                  }
                }}
              >
                <div className="flex items-center gap-3 border-b border-line px-4">
                  <Search size={16} className="shrink-0 text-accent" aria-hidden />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setCursor(0);
                    }}
                    role="combobox"
                    aria-expanded
                    aria-controls="paleta-resultados"
                    aria-activedescendant={results[active] ? `paleta-${results[active].id}` : undefined}
                    aria-label="Buscar seções, projetos e ações"
                    placeholder="Buscar seções, projetos e ações…"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
                  />
                  <kbd className="kbd">Esc</kbd>
                </div>

                <div
                  ref={listRef}
                  id="paleta-resultados"
                  role="listbox"
                  aria-label="Resultados"
                  className="scrollbar-thin max-h-[50vh] overflow-y-auto p-2"
                >
                  {results.length === 0 ? (
                    <p className="px-3 py-8 text-center text-[13px] text-ink-faint">Nada encontrado para “{query}”.</p>
                  ) : (
                    results.map((command, index) => (
                      <div key={command.id}>
                        {command.group !== results[index - 1]?.group ? (
                          <p className="rule-label px-3 pb-1 pt-3">{command.group}</p>
                        ) : null}
                        <button
                          type="button"
                          id={`paleta-${command.id}`}
                          role="option"
                          aria-selected={index === active}
                          tabIndex={-1}
                          onClick={() => execute(command)}
                          onPointerMove={() => setCursor(index)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors",
                            index === active ? "bg-accent-soft text-ink" : "text-ink-muted",
                          )}
                        >
                          <span className={index === active ? "text-accent" : "text-ink-faint"} aria-hidden>
                            {command.icon}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{command.label}</span>
                          {command.hint ? (
                            <span className="hidden shrink-0 truncate font-mono text-[11px] text-ink-faint sm:block">
                              {command.hint}
                            </span>
                          ) : null}
                          {index === active ? <ArrowRight size={14} className="shrink-0 text-accent" aria-hidden /> : null}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-4 border-t border-line bg-base-900/60 px-4 py-2 font-mono text-[10.5px] text-ink-faint">
                  <span className="flex items-center gap-1">
                    <kbd className="kbd">↑</kbd>
                    <kbd className="kbd">↓</kbd> navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="kbd">
                      <CornerDownLeft size={10} />
                    </kbd>{" "}
                    abrir
                  </span>
                  <span className="ml-auto">{results.length} resultado(s)</span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
