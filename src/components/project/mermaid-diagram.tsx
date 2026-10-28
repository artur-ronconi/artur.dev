"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Maximize2, X } from "lucide-react";

import { useTheme } from "@/components/site/theme";
import { cn } from "@/lib/utils";

/**
 * Renders a Mermaid architecture diagram.
 *
 * Mermaid is loaded dynamically so it never enters the initial bundle, and it
 * runs with securityLevel "strict" (no raw HTML, no click handlers) because the
 * source is stored content.
 */
export function MermaidDiagram({
  source,
  title,
  description,
  className,
}: {
  source: string;
  title?: string | null;
  description?: string | null;
  className?: string;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  // Trocar o tema refaz o diagrama com as cores novas.
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;

        // O Mermaid precisa de cores literais, então lemos os tokens do tema atual.
        const styles = getComputedStyle(document.documentElement);
        const token = (name: string) => styles.getPropertyValue(`--color-${name}`).trim();

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          themeVariables: {
            background: token("base-850"),
            primaryColor: token("base-800"),
            primaryTextColor: token("ink"),
            primaryBorderColor: token("base-500"),
            lineColor: token("accent"),
            secondaryColor: token("base-700"),
            tertiaryColor: token("base-850"),
            clusterBkg: token("base-900"),
            clusterBorder: token("base-600"),
            edgeLabelBackground: token("base-850"),
            fontSize: "14px",
          },
          flowchart: { padding: 14, nodeSpacing: 42, rankSpacing: 56, useMaxWidth: true },
        });

        const { svg: rendered } = await mermaid.render(`mermaid-${reactId}-${theme}`, source);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : "Não foi possível renderizar o diagrama.",
          );
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [reactId, source, theme]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  return (
    <figure className={cn("panel overflow-hidden", className)}>
      {(title || description) && (
        <figcaption className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            {title ? <p className="text-sm font-semibold text-ink">{title}</p> : null}
            {description ? <p className="mt-1 text-[13px] text-ink-muted">{description}</p> : null}
          </div>
          {svg ? (
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Ampliar diagrama"
              className="shrink-0 rounded-md border border-line p-1.5 text-ink-faint transition-colors hover:text-accent"
            >
              <Maximize2 size={14} />
            </button>
          ) : null}
        </figcaption>
      )}

      <div className="grid-backdrop overflow-x-auto p-5">
        {error ? (
          <p className="flex items-center gap-2 font-mono text-[12px] text-amber">
            <AlertTriangle size={15} />
            Diagrama inválido: {error}
          </p>
        ) : svg ? (
          <div
            ref={containerRef}
            className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
            // Mermaid output is generated locally with securityLevel "strict".
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex h-40 items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
            <span className="sr-only">Carregando diagrama…</span>
          </div>
        )}
      </div>

      {zoomed && svg ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title ?? "Diagrama"}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-base-950/92 p-4 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-5 top-5 rounded-lg border border-line bg-base-850 p-2 text-ink-muted hover:text-ink"
            onClick={() => setZoomed(false)}
          >
            <X size={18} />
          </button>
          <div
            className="max-h-full w-full max-w-5xl overflow-auto rounded-xl border border-line bg-base-900 p-6 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full"
            onClick={(event) => event.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      ) : null}
    </figure>
  );
}
