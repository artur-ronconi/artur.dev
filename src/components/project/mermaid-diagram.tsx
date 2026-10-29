"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { AlertTriangle, Maximize2, Scan, X, ZoomIn, ZoomOut } from "lucide-react";

import { useTheme } from "@/components/site/theme";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 8;

/** Área estilo canvas: scroll amplia em torno do cursor, arrastar move. */
function PanZoom({ children, className }: { children: ReactNode; className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });

  const zoomAt = (factor: number, px: number, py: number) =>
    setView((current) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
      return { k, x: px - ((px - current.x) / current.k) * k, y: py - ((py - current.y) / current.k) * k };
    });

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  const zoomCenter = (factor: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (rect) zoomAt(factor, rect.width / 2, rect.height / 2);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const origin = drag.current;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  };

  const tool =
    "rounded-md border border-line bg-base-850 p-1.5 text-ink-muted transition-colors hover:text-accent disabled:opacity-40";

  return (
    <div className={cn("grid-backdrop relative overflow-hidden", className)}>
      <div
        ref={frameRef}
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          className="flex min-h-full w-full origin-top-left items-center p-5 [&>*]:w-full"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          {children}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex gap-1" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Reduzir" className={tool} onClick={() => zoomCenter(1 / 1.25)} disabled={view.k <= MIN_ZOOM}>
          <ZoomOut size={14} />
        </button>
        <button type="button" aria-label="Ampliar" className={tool} onClick={() => zoomCenter(1.25)} disabled={view.k >= MAX_ZOOM}>
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          aria-label="Enquadrar"
          className={tool}
          onClick={() => setView({ k: 1, x: 0, y: 0 })}
          disabled={view.k === 1 && view.x === 0 && view.y === 0}
        >
          <Scan size={14} />
        </button>
      </div>
    </div>
  );
}

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

      {error ? (
        <p className="flex items-center gap-2 p-5 font-mono text-[12px] text-amber">
          <AlertTriangle size={15} />
          Diagrama inválido: {error}
        </p>
      ) : svg ? (
        <PanZoom className="h-[440px]">
          <div
            ref={containerRef}
            className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
            // Mermaid output is generated locally with securityLevel "strict".
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </PanZoom>
      ) : (
        <div className="grid-backdrop flex h-40 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span className="sr-only">Carregando diagrama…</span>
        </div>
      )}

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
          <div className="w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <PanZoom className="h-[85vh] rounded-xl border border-line bg-base-900">
              <div
                className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </PanZoom>
          </div>
        </div>
      ) : null}
    </figure>
  );
}
