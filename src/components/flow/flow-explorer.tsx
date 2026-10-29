"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  Box,
  CircleDot,
  Cloud,
  Cpu,
  CreditCard,
  Database,
  FileText,
  GitBranch,
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  Monitor,
  MousePointerClick,
  Pause,
  Play,
  Plug,
  Radar,
  RotateCcw,
  Scan,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Waypoints,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

import { layoutFlow, type FlowLayout } from "@/lib/flow/layout";
import type { FlowGraph, FlowNode } from "@/lib/flow/parse";
import { buildWaves } from "@/lib/flow/simulate";
import { cn } from "@/lib/utils";

const MAX_CANVAS_HEIGHT = 560;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 8;
const WAVE_MS = 1100;

/** Ícone do nó: primeiro pelo que o rótulo diz, depois pela forma usada no diagrama. */
const ICON_BY_KEYWORD: Array<[RegExp, LucideIcon]> = [
  [/\b(fila|queue|sqs|kafka|rabbit|dlq|topico)/, Layers],
  [/\b(banco|base|database|postgres|mysql|dynamo|redis|sql|bucket|s3)/, Database],
  [/\b(worker|lambda|funcao|consumer|job|reprocess|processa)/, Cpu],
  [/\b(pipeline|ci|cd|actions|deploy|gitops)/, Workflow],
  [/\b(evento|event|barramento|bus|sns|notifica)/, Waypoints],
  [/\b(api|gateway|endpoint|ingest)/, Plug],
  [/\b(painel|dashboard|ui|front|cliente|client|usuario|browser|app)/, Monitor],
  [/\b(conta|aws|cloud|nuvem)/, Cloud],
  [/\b(relatorio|report|log)/, FileText],
  [/\b(politica|compliance|seguranca|auth|fraude|antifraude)/, ShieldCheck],
  [/\b(integra|extern|webhook|parceiro)/, Globe],
  [/\b(coletor|collector|scan)/, Radar],
  [/\b(liquida|pagamento|payment|cobranca)/, CreditCard],
];

const ICON_BY_SHAPE: Partial<Record<FlowNode["shape"], LucideIcon>> = {
  database: Database,
  hexagon: Waypoints,
  diamond: GitBranch,
  circle: CircleDot,
  stadium: CircleDot,
};

function iconFor(node: FlowNode): LucideIcon {
  const text = node.label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return ICON_BY_KEYWORD.find(([pattern]) => pattern.test(text))?.[1] ?? ICON_BY_SHAPE[node.shape] ?? Box;
}

type Playback = { step: number; animating: number | null; playing: boolean };

type PlaybackAction =
  | { type: "play"; total: number }
  | { type: "pause" }
  | { type: "next"; total: number }
  | { type: "jump"; step: number }
  | { type: "waveDone"; total: number };

function playback(state: Playback, action: PlaybackAction): Playback {
  switch (action.type) {
    case "play": {
      if (action.total === 0) return state;
      const from = state.step >= action.total ? 0 : state.step;
      return { step: from, animating: from, playing: true };
    }
    case "pause":
      return { ...state, playing: false };
    case "next":
      if (state.animating !== null || state.step >= action.total) return state;
      return { ...state, animating: state.step, playing: false };
    case "jump":
      return { step: action.step, animating: null, playing: false };
    case "waveDone": {
      if (state.animating === null) return state;
      const step = state.animating + 1;
      const more = state.playing && step < action.total;
      return { step, animating: more ? step : null, playing: more };
    }
  }
}

/**
 * Explorador interativo de fluxo: o visitante clica nos componentes para ver
 * quem conversa com quem, simula uma requisição percorrendo a arquitetura passo
 * a passo, e pode ampliar, arrastar e abrir em tela cheia.
 */
export function FlowExplorer({
  graph,
  title,
  description,
  className,
}: {
  graph: FlowGraph;
  title?: string | null;
  description?: string | null;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const packetRefs = useRef(new Map<string, SVGGElement>());
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const dragEndedAt = useRef(0);

  const [frameWidth, setFrameWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [startIds, setStartIds] = useState<string[] | null>(null);
  const [speed, setSpeed] = useState(1);
  const [{ step, animating, playing }, dispatch] = useReducer(playback, { step: 0, animating: null, playing: false });

  // ------------------------------------------------------------- layout
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setFrameWidth(entry.contentRect.width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const layouts = useMemo(
    () => ({ LR: layoutFlow(graph, "LR"), TB: layoutFlow(graph, "TB") }),
    [graph],
  );

  // Escolhe a orientação em que o diagrama fica mais legível no espaço disponível,
  // preferindo a que foi cadastrada quando a diferença é pequena.
  const layout: FlowLayout = useMemo(() => {
    const declared = layouts[graph.direction];
    if (!frameWidth) return declared;

    const other = layouts[graph.direction === "LR" ? "TB" : "LR"];
    const fit = (candidate: FlowLayout) =>
      Math.min(frameWidth / candidate.width, MAX_CANVAS_HEIGHT / candidate.height, 1);
    return fit(declared) >= fit(other) * 0.85 ? declared : other;
  }, [frameWidth, graph.direction, layouts]);

  const scale = frameWidth ? Math.min(frameWidth / layout.width, MAX_CANVAS_HEIGHT / layout.height, 1.1) : 1;
  const canvasHeight = Math.max(220, Math.round(layout.height * scale));

  // --------------------------------------------------------- simulação
  const waves = useMemo(() => buildWaves(graph, startIds ?? undefined), [graph, startIds]);
  const total = waves.steps.length;
  const started = step > 0 || animating !== null;

  const labelOf = useMemo(() => {
    const labels = new Map<string, string>();
    for (const node of graph.nodes) labels.set(node.id, node.label);
    for (const group of graph.groups) labels.set(group.id, group.label);
    return (id: string) => labels.get(id) ?? id;
  }, [graph]);

  const { lit, fresh, doneEdges } = useMemo(() => {
    const litNodes = new Set<string>(started ? waves.start : []);
    const edgesDone = new Set<string>();
    waves.steps.slice(0, step).forEach((hops) => {
      for (const hop of hops) {
        edgesDone.add(hop.id);
        for (const id of hop.reached) litNodes.add(id);
      }
    });
    const latest = step > 0 ? (waves.steps[step - 1] ?? []).flatMap((hop) => hop.reached) : started ? waves.start : [];
    // O anel pulsante marca onde o fluxo está parado; no fim da simulação ele some.
    const pulsing = animating === null && step < waves.steps.length ? latest : [];
    return { lit: litNodes, fresh: new Set(pulsing), doneEdges: edgesDone };
  }, [animating, started, step, waves]);

  const movingHops = useMemo(() => (animating === null ? [] : waves.steps[animating] ?? []), [animating, waves]);
  const movingEdges = useMemo(() => new Set(movingHops.map((hop) => hop.id)), [movingHops]);

  useEffect(() => {
    if (movingHops.length === 0) return;

    const duration = WAVE_MS / speed;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tracks = movingHops.map((hop) => {
      const path = pathRefs.current.get(hop.id);
      return { path, length: path?.getTotalLength() ?? 0, packet: packetRefs.current.get(hop.id) };
    });

    const begin = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      // O pacote viaja nos primeiros 80% e descansa no destino antes da próxima etapa.
      const progress = instant ? 1 : Math.min(1, (now - begin) / duration);
      const travel = Math.min(1, progress / 0.8);
      const eased = travel < 0.5 ? 2 * travel * travel : 1 - (-2 * travel + 2) ** 2 / 2;

      for (const { path, length, packet } of tracks) {
        if (!path || !packet) continue;
        const point = path.getPointAtLength(length * eased);
        packet.setAttribute("transform", `translate(${point.x} ${point.y})`);
        packet.style.opacity = "1";
      }

      if (progress < 1) frame = requestAnimationFrame(tick);
      else dispatch({ type: "waveDone", total });
    });

    return () => cancelAnimationFrame(frame);
  }, [movingHops, speed, total]);

  // ------------------------------------------------------- foco / hover
  const focus = hovered ?? selected;
  const selectedNode = graph.nodes.find((node) => node.id === selected) ?? null;

  const groupsOf = useMemo(() => {
    const parents = new Map(graph.groups.map((group) => [group.id, group.parent]));
    const byNode = new Map<string, Set<string>>();
    for (const node of graph.nodes) {
      const chain = new Set<string>();
      for (let at = node.group; at; at = parents.get(at) ?? null) chain.add(at);
      byNode.set(node.id, chain);
    }
    return (id: string) => byNode.get(id) ?? new Set<string>();
  }, [graph]);

  /** A aresta toca o nó diretamente ou através de um subgrafo que o contém. */
  const touches = useCallback(
    (endpoint: string, node: string) => endpoint === node || groupsOf(node).has(endpoint),
    [groupsOf],
  );

  const related = useMemo(() => {
    if (!focus) return null;
    const edges = graph.edges.filter((edge) => touches(edge.from, focus) || touches(edge.to, focus));
    const nodes = new Set<string>([focus]);
    for (const edge of edges) {
      for (const endpoint of [edge.from, edge.to]) {
        nodes.add(endpoint);
        for (const node of graph.nodes) if (groupsOf(node.id).has(endpoint)) nodes.add(node.id);
      }
    }
    return { edges: new Set(edges.map((edge) => edge.id)), nodes };
  }, [focus, graph, groupsOf, touches]);

  const incoming = selected ? graph.edges.filter((edge) => touches(edge.to, selected)) : [];
  const outgoing = selected ? graph.edges.filter((edge) => touches(edge.from, selected)) : [];

  const simulateFrom = (ids: string[] | null) => {
    setStartIds(ids);
    dispatch({ type: "jump", step: 0 });
    // As ondas mudam junto com a origem; a reprodução começa no próximo quadro.
    requestAnimationFrame(() => dispatch({ type: "play", total: buildWaves(graph, ids ?? undefined).steps.length }));
  };

  // ------------------------------------------------------- zoom / pan
  const zoomBy = (factor: number) =>
    setView((current) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
      // Mantém o centro do diagrama no lugar ao ampliar.
      const cx = layout.width / 2;
      const cy = layout.height / 2;
      return { k, x: cx - ((cx - current.x) / current.k) * k, y: cy - ((cy - current.y) / current.k) * k };
    });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Como num canvas: o scroll amplia e reduz em torno do cursor.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((current) => {
        const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * Math.exp(-event.deltaY * 0.0015)));
        const rect = svg.getBoundingClientRect();
        const unit = Math.max(layout.width / rect.width, layout.height / rect.height);
        const px = layout.width / 2 + (event.clientX - rect.left - rect.width / 2) * unit;
        const py = layout.height / 2 + (event.clientY - rect.top - rect.height / 2) * unit;
        return { k, x: px - ((px - current.x) / current.k) * k, y: py - ((py - current.y) / current.k) * k };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [layout.height, layout.width]);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const origin = drag.current;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (!origin.moved && Math.hypot(dx, dy) < 4) return;

    if (!origin.moved) event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const unit = Math.max(layout.width / rect.width, layout.height / rect.height);
    drag.current = { x: event.clientX, y: event.clientY, moved: true };
    setView((current) => ({ ...current, x: current.x + dx * unit, y: current.y + dy * unit }));
  };

  const onPointerUp = () => {
    if (drag.current?.moved) dragEndedAt.current = performance.now();
    drag.current = null;
  };

  /** O clique que encerra um arrasto não deve selecionar nem limpar a seleção. */
  const endsDrag = () => performance.now() - dragEndedAt.current < 250;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const activate = (event: KeyboardEvent, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelected((current) => (current === id ? null : id));
  };

  const horizontal = layout.direction === "LR";
  const currentStep = animating !== null ? animating + 1 : step;

  return (
    <>
      {expanded ? (
        <div
          aria-hidden
          className="fixed inset-0 z-[69] bg-base-950/85 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      ) : null}

      <figure
        style={{ "--canvas-h": `${canvasHeight}px` } as CSSProperties}
        className={cn(
          "panel @container flex flex-col overflow-hidden",
          expanded && "fixed inset-3 z-[70] shadow-[var(--shadow-float)] sm:inset-6",
          className,
        )}
      >
        <figcaption className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="truncate">{title ?? "Fluxo da arquitetura"}</span>
            </p>
            {description ? <p className="mt-1 text-[13px] text-ink-muted">{description}</p> : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ToolButton label="Reduzir" onClick={() => zoomBy(1 / 1.25)} disabled={view.k <= MIN_ZOOM}>
              <ZoomOut size={14} />
            </ToolButton>
            <ToolButton label="Ampliar" onClick={() => zoomBy(1.25)} disabled={view.k >= MAX_ZOOM}>
              <ZoomIn size={14} />
            </ToolButton>
            <ToolButton
              label="Enquadrar"
              onClick={() => setView({ k: 1, x: 0, y: 0 })}
              disabled={view.k === 1 && view.x === 0 && view.y === 0}
            >
              <Scan size={14} />
            </ToolButton>
            <ToolButton label={expanded ? "Sair da tela cheia" : "Tela cheia"} onClick={() => setExpanded((value) => !value)}>
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </ToolButton>
          </div>
        </figcaption>

        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 @3xl:grid-cols-[minmax(0,1fr)_320px]",
            expanded && "overflow-y-auto @3xl:grid-rows-[minmax(0,1fr)] @3xl:overflow-hidden",
          )}
        >
          <div ref={frameRef} className="dot-backdrop flex h-full min-w-0 flex-col overflow-hidden">
            <svg
              ref={svgRef}
              role="group"
              aria-label={`Diagrama interativo: ${title ?? "fluxo da arquitetura"}`}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              preserveAspectRatio="xMidYMid meet"
              style={expanded ? { minHeight: 280 } : { height: canvasHeight }}
              className={cn(
                "block w-full cursor-grab touch-pan-y select-none active:cursor-grabbing",
                expanded && "min-h-0 flex-1",
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={() => {
                if (!endsDrag()) setSelected(null);
              }}
            >
              <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                {layout.groups.map((group) => (
                  <g key={group.id}>
                    <rect
                      x={group.x}
                      y={group.y}
                      width={group.w}
                      height={group.h}
                      rx={14}
                      strokeDasharray="6 5"
                      className="fill-base-900/60 stroke-line-strong"
                    />
                    <text
                      x={group.x + 14}
                      y={group.y + 18}
                      className="fill-ink-faint font-mono text-[10.5px] uppercase tracking-[0.14em]"
                    >
                      {group.label}
                    </text>
                  </g>
                ))}

                {layout.edges.map((edge) => {
                  const moving = movingEdges.has(edge.id);
                  const done = doneEdges.has(edge.id);
                  const dimmed = related ? !related.edges.has(edge.id) : false;
                  const emphasised = moving || done || (related?.edges.has(edge.id) ?? false);
                  const tone = edge.style === "dotted" ? "amber" : "accent";
                  const arrow = horizontal
                    ? `${edge.end.x},${edge.end.y} ${edge.end.x - 8},${edge.end.y - 4.5} ${edge.end.x - 8},${edge.end.y + 4.5}`
                    : `${edge.end.x},${edge.end.y} ${edge.end.x - 4.5},${edge.end.y - 8} ${edge.end.x + 4.5},${edge.end.y - 8}`;

                  return (
                    <g
                      key={edge.id}
                      className={cn("transition-opacity duration-200", dimmed && "opacity-20")}
                    >
                      <path
                        ref={(element) => {
                          if (element) pathRefs.current.set(edge.id, element);
                          else pathRefs.current.delete(edge.id);
                        }}
                        d={edge.path}
                        fill="none"
                        strokeWidth={edge.style === "thick" ? 2.6 : 1.6}
                        strokeDasharray={edge.style === "dotted" ? "5 5" : undefined}
                        strokeLinecap="round"
                        className={cn(
                          "transition-colors duration-300",
                          !emphasised && "stroke-ink-faint/70",
                          emphasised && (tone === "amber" ? "stroke-amber" : "stroke-accent"),
                        )}
                      />
                      {moving ? (
                        <path
                          d={edge.path}
                          fill="none"
                          strokeWidth={3}
                          strokeDasharray="4 14"
                          strokeLinecap="round"
                          className={cn("animate-dash opacity-70", tone === "amber" ? "stroke-amber" : "stroke-accent")}
                        />
                      ) : null}
                      <polygon
                        points={arrow}
                        className={cn(
                          "transition-colors duration-300",
                          !emphasised && "fill-ink-faint",
                          emphasised && (tone === "amber" ? "fill-amber" : "fill-accent"),
                        )}
                      />
                      {edge.labelAt ? (
                        <g transform={`translate(${edge.labelAt.x} ${edge.labelAt.y})`}>
                          <rect
                            x={-edge.labelWidth / 2}
                            y={-9.5}
                            width={edge.labelWidth}
                            height={19}
                            rx={9.5}
                            className={cn(
                              "fill-base-900 transition-colors duration-300",
                              emphasised ? (tone === "amber" ? "stroke-amber/60" : "stroke-accent/60") : "stroke-line-strong",
                            )}
                          />
                          <text
                            y={3.6}
                            textAnchor="middle"
                            className={cn("font-mono text-[10.5px]", emphasised ? "fill-ink" : "fill-ink-muted")}
                          >
                            {edge.label}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}

                {layout.nodes.map((node) => {
                  const Icon = iconFor(node);
                  const isSelected = selected === node.id;
                  const isLit = lit.has(node.id);
                  const dimmed = related ? !related.nodes.has(node.id) : false;
                  const firstBaseline = node.h / 2 - (node.lines.length - 1) * 8 + 4;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x} ${node.y})`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${node.label}: inspecionar conexões`}
                      className={cn(
                        "group/node cursor-pointer outline-none transition-opacity duration-200",
                        dimmed && "opacity-25",
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!endsDrag()) setSelected((current) => (current === node.id ? null : node.id));
                      }}
                      onKeyDown={(event) => activate(event, node.id)}
                      onPointerEnter={() => setHovered(node.id)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => setHovered(node.id)}
                      onBlur={() => setHovered(null)}
                    >
                      {fresh.has(node.id) ? (
                        <rect
                          width={node.w}
                          height={node.h}
                          rx={11}
                          fill="none"
                          strokeWidth={2}
                          className="animate-ring origin-center stroke-accent [transform-box:fill-box]"
                        />
                      ) : null}
                      <rect
                        width={node.w}
                        height={node.h}
                        rx={11}
                        strokeWidth={isSelected || isLit ? 1.8 : 1.2}
                        className={cn(
                          "transition-colors duration-300 group-hover/node:stroke-accent group-focus-visible/node:stroke-accent",
                          isLit ? "fill-accent-soft stroke-accent" : "fill-base-850 stroke-line-strong",
                          isSelected && "stroke-accent",
                        )}
                      />
                      <rect
                        x={9}
                        y={node.h / 2 - 12}
                        width={24}
                        height={24}
                        rx={7}
                        className={cn(
                          "transition-colors duration-300",
                          isLit ? "fill-accent-strong" : "fill-base-700",
                        )}
                      />
                      <Icon
                        x={14}
                        y={node.h / 2 - 7}
                        size={14}
                        aria-hidden
                        className={cn("transition-colors duration-300", isLit ? "text-base-950" : "text-accent")}
                      />
                      <text className="fill-ink font-mono text-[12.5px]">
                        {node.lines.map((line, index) => (
                          <tspan key={index} x={42} y={firstBaseline + index * 16}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}

                {movingHops.map((hop) => (
                  <g
                    key={`${animating}-${hop.id}`}
                    ref={(element) => {
                      if (element) packetRefs.current.set(hop.id, element);
                      else packetRefs.current.delete(hop.id);
                    }}
                    style={{ opacity: 0 }}
                    className={cn("pointer-events-none", hop.style === "dotted" ? "text-amber" : "text-accent")}
                  >
                    <circle r={10} fill="currentColor" opacity={0.22} />
                    <circle r={4.5} fill="currentColor" />
                  </g>
                ))}
              </g>
            </svg>

            <p className="pointer-events-none hidden items-center gap-1.5 px-3 pb-2 font-mono text-[10.5px] text-ink-faint sm:flex">
              <MousePointerClick size={12} aria-hidden />
              clique em um componente · arraste para mover · scroll para zoom
            </p>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-col border-t border-line @3xl:border-l @3xl:border-t-0",
              !expanded && "@3xl:max-h-[var(--canvas-h)]",
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2.5">
              <ToolButton
                label="Etapa anterior"
                onClick={() => dispatch({ type: "jump", step: Math.max(0, step - 1) })}
                disabled={step === 0 && animating === null}
              >
                <SkipBack size={14} />
              </ToolButton>

              <button
                type="button"
                onClick={() => dispatch(playing ? { type: "pause" } : { type: "play", total })}
                disabled={total === 0}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-accent-strong px-2 text-[12.5px] font-semibold text-base-950 transition-colors hover:bg-accent disabled:opacity-50"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
                {playing ? "Pausar" : step >= total && total > 0 ? "Repetir" : started ? "Continuar" : "Simular fluxo"}
              </button>

              <ToolButton
                label="Próxima etapa"
                onClick={() => dispatch({ type: "next", total })}
                disabled={animating !== null || step >= total}
              >
                <SkipForward size={14} />
              </ToolButton>
              <ToolButton
                label="Reiniciar"
                onClick={() => {
                  setStartIds(null);
                  dispatch({ type: "jump", step: 0 });
                }}
                disabled={!started && startIds === null}
              >
                <RotateCcw size={14} />
              </ToolButton>
              <button
                type="button"
                onClick={() => setSpeed((value) => (value === 1 ? 2 : value === 2 ? 0.5 : 1))}
                aria-label={`Velocidade ${speed}x — alterar`}
                className="h-8 rounded-md border border-line px-2 font-mono text-[11px] text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
              >
                {speed}x
              </button>
            </div>

            <div
              className="scrollbar-thin max-h-72 min-h-0 flex-1 overflow-y-auto p-3 @3xl:max-h-none"
            >
              {selectedNode ? (
                <div className="line-in mb-3 rounded-lg border border-accent/35 bg-accent-soft/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="rule-label text-accent">componente</p>
                      <p className="mt-1 text-[13.5px] font-semibold text-ink">{selectedNode.label}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      aria-label="Fechar inspeção"
                      className="rounded p-1 text-ink-faint transition-colors hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <Connections title="Recebe de" empty="Ponto de entrada do fluxo">
                    {incoming.map((edge) => (
                      <Chip
                        key={edge.id}
                        label={labelOf(edge.from)}
                        note={edge.label}
                        onClick={graph.nodes.some((node) => node.id === edge.from) ? () => setSelected(edge.from) : undefined}
                      />
                    ))}
                  </Connections>
                  <Connections title="Envia para" empty="Fim do fluxo">
                    {outgoing.map((edge) => (
                      <Chip
                        key={edge.id}
                        label={labelOf(edge.to)}
                        note={edge.label}
                        onClick={graph.nodes.some((node) => node.id === edge.to) ? () => setSelected(edge.to) : undefined}
                      />
                    ))}
                  </Connections>

                  {outgoing.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => simulateFrom([selectedNode.id])}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-accent/40 px-2.5 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent-soft"
                    >
                      <Play size={12} /> Simular a partir daqui
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="mb-2 flex items-center justify-between">
                <p className="rule-label">passo a passo</p>
                <p className="font-mono text-[11px] text-ink-faint" aria-live="polite">
                  etapa {currentStep}/{total}
                </p>
              </div>

              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={step}
                aria-label="Progresso da simulação"
                className="mb-3 h-1 overflow-hidden rounded-full bg-base-700"
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${total ? (currentStep / total) * 100 : 0}%` }}
                />
              </div>

              <ol className="space-y-1">
                <li>
                  <StepRow
                    index={0}
                    state={!started ? "idle" : currentStep === 0 ? "current" : "done"}
                    onClick={() => dispatch({ type: "jump", step: 0 })}
                  >
                    <span className="text-ink-muted">Origem:</span> {waves.start.map(labelOf).join(", ")}
                  </StepRow>
                </li>
                {waves.steps.map((hops, index) => (
                  <li key={index}>
                    <StepRow
                      index={index + 1}
                      state={index + 1 === currentStep && started ? "current" : index < step ? "done" : "idle"}
                      onClick={() => dispatch({ type: "jump", step: index + 1 })}
                    >
                      {hops.map((hop) => (
                        <span key={hop.id} className="block">
                          {labelOf(hop.from)} <span className="text-accent">→</span> {labelOf(hop.to)}
                          {hop.label ? <span className="text-ink-faint"> · {hop.label}</span> : null}
                        </span>
                      ))}
                    </StepRow>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </figure>
    </>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:border-accent/50 hover:text-accent disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Connections({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="mt-2.5">
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">{title}</p>
      {children.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
      ) : (
        <p className="mt-1 text-[12px] text-ink-muted">{empty}</p>
      )}
    </div>
  );
}

function Chip({ label, note, onClick }: { label: string; note: string | null; onClick?: () => void }) {
  const content = (
    <>
      {label}
      {note ? <span className="text-ink-faint"> · {note}</span> : null}
    </>
  );
  const className = "rounded-md border border-line bg-base-850 px-2 py-1 text-left text-[11.5px] text-ink";

  return onClick ? (
    <button type="button" onClick={onClick} className={cn(className, "transition-colors hover:border-accent/50 hover:text-accent")}>
      {content}
    </button>
  ) : (
    <span className={className}>{content}</span>
  );
}

function StepRow({
  index,
  state,
  onClick,
  children,
}: {
  index: number;
  state: "idle" | "current" | "done";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-md border px-2 py-1.5 text-left font-mono text-[11.5px] leading-relaxed transition-colors",
        state === "current" && "border-accent/40 bg-accent-soft/60 text-ink",
        state === "done" && "border-transparent text-ink-muted hover:bg-base-800",
        state === "idle" && "border-transparent text-ink-faint hover:bg-base-800 hover:text-ink-muted",
      )}
    >
      <span
        className={cn(
          "mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[10px] font-semibold",
          state === "idle" ? "bg-base-700 text-ink-faint" : "bg-accent-strong text-base-950",
        )}
      >
        {index}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}
