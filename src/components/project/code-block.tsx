import { codeToHtml } from "shiki";

import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

/** Os dois temas saem como variáveis CSS; globals.css escolhe qual aplicar. */
const THEMES = { light: "github-light-default", dark: "github-dark-default" } as const;

const SUPPORTED = new Set([
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "bash",
  "shell",
  "sql",
  "yaml",
  "hcl",
  "terraform",
  "dockerfile",
  "go",
  "python",
  "php",
  "graphql",
  "http",
  "ini",
  "markdown",
]);

/**
 * Server-rendered syntax highlighting: Shiki runs at build/request time on the
 * server, so no highlighting library is shipped to the browser.
 */
export async function CodeBlock({
  code,
  language = "typescript",
  title,
  description,
  className,
}: {
  code: string;
  language?: string;
  title?: string | null;
  description?: string | null;
  className?: string;
}) {
  const normalized = language.toLowerCase();
  const lang = SUPPORTED.has(normalized) ? normalized : "text";

  let html: string;
  try {
    html = await codeToHtml(code, { lang, themes: THEMES, defaultColor: false });
  } catch {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = `<pre class="shiki"><code>${escaped}</code></pre>`;
  }

  return (
    <figure className={cn("panel overflow-hidden", className)}>
      {(title || description) && (
        <figcaption className="border-b border-line px-5 py-3">
          {title ? <p className="text-sm font-semibold text-ink">{title}</p> : null}
          {description ? <p className="mt-1 text-[13px] text-ink-muted">{description}</p> : null}
        </figcaption>
      )}
      <div className="flex items-center justify-between border-b border-line bg-base-800/50 px-4 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">{lang}</span>
        <CopyButton text={code} />
      </div>
      <div
        className="overflow-x-auto p-4 text-[12.5px] leading-6 [&_pre]:!bg-transparent [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}
