"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ChevronRight, FileCode2, Play, Terminal as TerminalIcon } from "lucide-react";

import { FILES, tokenize, type WorkbenchFile } from "@/components/home/workbench/files";
import { setTheme } from "@/components/site/theme";
import { cn } from "@/lib/utils";

export type WorkbenchData = {
  name: string;
  headline: string;
  location: string | null;
  email: string | null;
  availability: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  projects: Array<{ slug: string; title: string; category: string | null }>;
  stack: Array<{ category: string; items: string[] }>;
};

type Tone = "plain" | "ok" | "muted" | "accent" | "warn" | "error";

type Line = {
  id: number;
  text: string;
  tone?: Tone;
  /** Linha clicável: executa este comando. */
  command?: string;
  prompt?: boolean;
};

const TONE_CLASS: Record<Tone, string> = {
  plain: "text-ink",
  ok: "text-accent",
  muted: "text-ink-faint",
  accent: "text-emerald",
  warn: "text-amber",
  error: "text-rose",
};

const TOKEN_CLASS = {
  keyword: "text-violet",
  string: "text-amber",
  comment: "text-ink-faint italic",
  fn: "text-accent",
  meta: "text-emerald",
  number: "text-rose",
} as const;

const SECTIONS: Record<string, string> = {
  stack: "tecnologias",
  tecnologias: "tecnologias",
  destaque: "destaque",
  lab: "laboratorio",
  laboratorio: "laboratorio",
  projetos: "projetos",
  experiencia: "experiencia",
  certificacoes: "certificacoes",
  sobre: "sobre",
  contato: "contato",
};

const SUGGESTIONS = ["help", "whoami", "projects", "stack", "run", "theme"];

const COMMANDS = ["help", "whoami", "ls", "cat", "run", "projects", "open", "stack", "contact", "goto", "theme", "clear"];

const HELP: Array<[string, string]> = [
  ["whoami", "quem sou e no que trabalho"],
  ["ls · cat <arquivo>", "lista e abre os arquivos do editor"],
  ["run [arquivo]", "executa o arquivo aberto (saída simulada)"],
  ["projects · open <slug>", "lista os projetos e abre um estudo de caso"],
  ["stack", "tecnologias por categoria"],
  ["goto <seção>", "rola até uma seção da página"],
  ["contact", "e-mail e perfis"],
  ["theme [dark|light]", "troca o tema"],
  ["clear", "limpa o terminal"],
];

const fileName = (file: WorkbenchFile) => file.path.split("/").at(-1)!;

const findFile = (query: string) =>
  FILES.find((file) => file.path === query || fileName(file) === query) ??
  FILES.find((file) => file.path.toLowerCase().includes(query.toLowerCase()));

/**
 * Hero interativo: um mini-IDE. O visitante troca de arquivo, "executa" o que
 * está aberto e usa um terminal de verdade — os comandos respondem com o
 * conteúdo real do portfólio (perfil, projetos e stack cadastrados no painel).
 */
export function HeroWorkbench({ data }: { data: WorkbenchData }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const history = useRef<string[]>([]);
  const historyAt = useRef(-1);

  const [active, setActive] = useState(0);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { id: 0, text: "Terminal interativo — digite um comando ou clique em uma sugestão.", tone: "muted" },
  ]);

  const file = FILES[active] ?? FILES[0]!;

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const print = (entries: Array<Omit<Line, "id">>) =>
    setLines((current) => [...current, ...entries.map((entry) => ({ ...entry, id: nextId.current++ }))].slice(-120));

  /** Imprime a saída aos poucos, como um processo escrevendo no terminal. */
  const stream = (entries: Array<Omit<Line, "id">>, interval = 260) => {
    setRunning(true);
    entries.forEach((entry, index) => {
      timers.current.push(
        window.setTimeout(() => {
          print([entry]);
          if (index === entries.length - 1) setRunning(false);
        }, interval * (index + 1)),
      );
    });
  };

  const openFile = (target: WorkbenchFile) => setActive(FILES.indexOf(target));

  const runFile = (target: WorkbenchFile) => {
    openFile(target);
    print([{ text: target.run.command, prompt: true }]);
    stream(target.run.output.map((line) => ({ text: line.text, tone: line.tone ?? "plain" })));
  };

  const execute = (raw: string) => {
    const text = raw.trim();
    if (!text || running) return;

    history.current = [text, ...history.current.filter((entry) => entry !== text)].slice(0, 30);
    historyAt.current = -1;

    const [name = "", ...args] = text.split(/\s+/);
    const arg = args.join(" ");
    const command = name.toLowerCase();

    // `run` e `clear` montam a própria saída; os demais ecoam o comando antes.
    if (command === "clear") {
      setLines([]);
      return;
    }
    if (command === "run" || command === "npm" || command === "node") {
      const target = command === "run" && arg ? findFile(arg) : file;
      if (!target) {
        print([{ text, prompt: true }, { text: `run: arquivo não encontrado: ${arg}`, tone: "error" }]);
        return;
      }
      runFile(target);
      return;
    }

    const out: Array<Omit<Line, "id">> = [{ text, prompt: true }];

    switch (command) {
      case "help":
      case "?":
        out.push(...HELP.map(([usage, about]) => ({ text: `  ${usage.padEnd(24)} ${about}`, tone: "plain" as const })));
        out.push({ text: "  dica: Tab completa o comando, ↑ e ↓ percorrem o histórico", tone: "muted" });
        break;

      case "whoami":
        out.push({ text: data.name, tone: "ok" });
        out.push({ text: data.headline });
        if (data.location) out.push({ text: `local: ${data.location}`, tone: "muted" });
        if (data.availability) out.push({ text: `status: ${data.availability}`, tone: "accent" });
        break;

      case "ls":
        out.push(...FILES.map((entry) => ({ text: `  ${entry.path}`, command: `cat ${fileName(entry)}` })));
        break;

      case "cat":
      case "code":
      case "vim":
      case "nano": {
        const target = arg ? findFile(arg) : null;
        if (target) {
          openFile(target);
          out.push({ text: `${target.path} aberto no editor`, tone: "ok" });
        } else {
          out.push({ text: arg ? `cat: ${arg}: arquivo não encontrado` : "uso: cat <arquivo>", tone: "error" });
        }
        break;
      }

      case "projects":
      case "projetos":
        if (data.projects.length === 0) {
          out.push({ text: "nenhum projeto publicado ainda", tone: "muted" });
        } else {
          out.push(
            ...data.projects.map((project) => ({
              text: `  ${project.slug.padEnd(28)} ${project.title}`,
              command: `open ${project.slug}`,
            })),
          );
          out.push({ text: "  clique em um projeto ou use: open <slug>", tone: "muted" });
        }
        break;

      case "open":
      case "cd": {
        const slug = arg.replace(/^\/?projetos\//, "").replace(/\/$/, "");
        const project = data.projects.find((entry) => entry.slug === slug) ??
          data.projects.find((entry) => slug && entry.slug.includes(slug.toLowerCase()));
        const target = arg ? findFile(arg) : null;

        if (project) {
          out.push({ text: `abrindo /projetos/${project.slug} …`, tone: "ok" });
          router.push(`/projetos/${project.slug}`);
        } else if (slug === "projetos" || slug === "projects") {
          out.push({ text: "abrindo /projetos …", tone: "ok" });
          router.push("/projetos");
        } else if (target) {
          openFile(target);
          out.push({ text: `${target.path} aberto no editor`, tone: "ok" });
        } else {
          out.push({ text: arg ? `open: nada encontrado para "${arg}"` : "uso: open <slug>", tone: "error" });
        }
        break;
      }

      case "stack":
      case "tecnologias":
        if (data.stack.length === 0) out.push({ text: "nenhuma tecnologia cadastrada ainda", tone: "muted" });
        for (const group of data.stack) {
          out.push({ text: group.category, tone: "ok" });
          out.push({ text: `  ${group.items.join(" · ")}` });
        }
        break;

      case "contact":
      case "contato":
        if (data.email) out.push({ text: `  e-mail    ${data.email}` });
        if (data.githubUrl) out.push({ text: `  github    ${data.githubUrl}` });
        if (data.linkedinUrl) out.push({ text: `  linkedin  ${data.linkedinUrl}` });
        out.push({ text: "  formulário: goto contato", command: "goto contato", tone: "muted" });
        break;

      case "goto": {
        const id = SECTIONS[arg.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")];
        const section = id ? document.getElementById(id) : null;
        if (section) {
          out.push({ text: `rolando até #${id} …`, tone: "ok" });
          section.scrollIntoView({ behavior: "smooth" });
        } else {
          out.push({ text: `seções: ${[...new Set(Object.values(SECTIONS))].join(", ")}`, tone: arg ? "error" : "muted" });
        }
        break;
      }

      case "theme": {
        const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
        const wanted = arg === "light" || arg === "claro" ? "light" : arg === "dark" || arg === "escuro" ? "dark" : current === "dark" ? "light" : "dark";
        const rect = logRef.current?.getBoundingClientRect();
        setTheme(wanted, rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
        out.push({ text: `tema ${wanted === "dark" ? "escuro" : "claro"} aplicado`, tone: "ok" });
        break;
      }

      case "sudo":
        out.push({ text: "visitante não está no arquivo sudoers. Este incidente será relatado.", tone: "warn" });
        break;

      case "exit":
        out.push({ text: "você pode ficar — ainda há projetos para ver: digite projects", tone: "muted" });
        break;

      default:
        out.push({ text: `comando não encontrado: ${name} — digite help`, tone: "error" });
    }

    print(out);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    execute(input);
    setInput("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const at = Math.max(-1, Math.min(history.current.length - 1, historyAt.current + (event.key === "ArrowUp" ? 1 : -1)));
      historyAt.current = at;
      setInput(history.current[at] ?? "");
      return;
    }

    if (event.key === "Tab" && input.trim()) {
      const [name = "", ...rest] = input.split(/\s+/);
      const partial = rest.join(" ");
      const options =
        rest.length === 0
          ? COMMANDS
          : ["cat", "run"].includes(name)
            ? FILES.map(fileName)
            : name === "open"
              ? data.projects.map((project) => project.slug)
              : name === "goto"
                ? [...new Set(Object.values(SECTIONS))]
                : name === "theme"
                  ? ["dark", "light"]
                  : [];
      const match = options.find((option) => option.startsWith(rest.length === 0 ? name : partial));
      if (match) {
        event.preventDefault();
        setInput(rest.length === 0 ? `${match} ` : `${name} ${match}`);
      }
      return;
    }

    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-16 h-56 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="panel relative overflow-hidden shadow-[var(--shadow-float)]">
        {/* barra de título */}
        <div className="flex items-center gap-3 border-b border-line bg-base-800/60 px-4 py-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-rose/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-faint">
            ~/artur.dev — {file.path}
          </span>
          <button
            type="button"
            onClick={() => runFile(file)}
            disabled={running}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent-strong px-2.5 font-mono text-[11px] font-semibold text-base-950 transition-colors hover:bg-accent disabled:opacity-60"
          >
            <Play size={11} fill="currentColor" />
            {running ? "executando" : "executar"}
          </button>
        </div>

        {/* abas de arquivo */}
        <div role="tablist" aria-label="Arquivos de exemplo" className="scrollbar-thin flex overflow-x-auto border-b border-line bg-base-900/60">
          {FILES.map((entry, index) => (
            <button
              key={entry.path}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 border-r border-line px-3 py-2 font-mono text-[11.5px] transition-colors",
                index === active ? "bg-base-850 text-ink" : "text-ink-faint hover:text-ink-muted",
              )}
            >
              <FileCode2 size={12} className={index === active ? "text-accent" : undefined} />
              {fileName(entry)}
              {index === active ? <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-accent" /> : null}
            </button>
          ))}
        </div>

        {/* editor */}
        <pre
          key={file.path}
          role="tabpanel"
          aria-label={file.path}
          tabIndex={0}
          className="scrollbar-thin h-[236px] overflow-auto py-3 font-mono text-[12px] leading-[1.65] sm:h-[258px] sm:text-[12.5px]"
        >
          <code className="block min-w-max">
            {file.code.split("\n").map((line, index) => (
              <span
                key={index}
                className="line-in group/line flex px-1 hover:bg-accent-soft/40"
                style={{ animationDelay: `${index * 28}ms` }}
              >
                <span aria-hidden className="w-9 shrink-0 select-none pr-3 text-right text-ink-faint/60 group-hover/line:text-accent">
                  {index + 1}
                </span>
                <span className="pr-4">
                  {line.length === 0
                    ? " "
                    : tokenize(line, file.language).map((token, tokenIndex) => (
                        <span key={tokenIndex} className={token.tone ? TOKEN_CLASS[token.tone] : "text-ink"}>
                          {token.text}
                        </span>
                      ))}
                </span>
              </span>
            ))}
          </code>
        </pre>

        {/* terminal */}
        <div
          className="border-t border-line bg-base-950/70"
          onClick={(event) => {
            // Clicar em qualquer ponto do terminal foca o prompt (menos ao selecionar texto).
            if (!(event.target as HTMLElement).closest("button") && !window.getSelection()?.toString()) {
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        >
          <div className="flex items-center gap-2 border-b border-line px-4 py-1.5">
            <TerminalIcon size={12} className="text-accent" aria-hidden />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">terminal</span>
            <span className="ml-auto hidden font-mono text-[10.5px] text-ink-faint sm:block">
              <span className="kbd">Tab</span> completa · <span className="kbd">↑</span> histórico
            </span>
          </div>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label="Saída do terminal"
            className="scrollbar-thin h-[150px] overflow-y-auto px-4 pt-2.5 font-mono text-[12px] leading-[1.7]"
          >
            {lines.map((line) => {
              const content = (
                <>
                  {line.prompt ? <span className="text-accent">❯ </span> : null}
                  {line.text || " "}
                </>
              );
              const tone = TONE_CLASS[line.tone ?? "plain"];

              return line.command ? (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => execute(line.command!)}
                  className={cn("line-in block w-full whitespace-pre text-left underline-offset-4 hover:text-accent hover:underline", tone)}
                >
                  {content}
                </button>
              ) : (
                <p key={line.id} className={cn("line-in whitespace-pre-wrap break-words", tone)}>
                  {content}
                </p>
              );
            })}

            <form onSubmit={onSubmit} className="flex items-center gap-2 pb-2.5">
              <label htmlFor="terminal-input" className="shrink-0 text-accent">
                <span className="sr-only">Comando</span>
                <span aria-hidden className="text-ink-faint">visitante@artur.dev</span>
                <ChevronRight size={13} className="inline -translate-y-px" aria-hidden />
              </label>
              <input
                id="terminal-input"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={running ? "" : "digite help"}
                className="min-w-0 flex-1 bg-transparent text-ink caret-accent outline-none placeholder:text-ink-faint/60"
              />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-2">
            <span className="font-mono text-[10.5px] text-ink-faint">experimente:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => execute(suggestion)}
                disabled={running}
                className="rounded-md border border-line bg-base-850 px-2 py-0.5 font-mono text-[11px] text-ink-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
