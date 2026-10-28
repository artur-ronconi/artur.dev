"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  FlaskConical,
  Gauge,
  Minus,
  Network,
  Plus,
  Power,
  Rocket,
  RotateCcw,
  Server,
  Timer,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeading } from "@/components/ui/section";
import {
  MAX_INSTANCES,
  MAX_RPS,
  MIN_INSTANCES,
  changeDesired,
  createCluster,
  killInstance,
  setAutoscale,
  setRps,
  startDeploy,
  tick,
  triggerBurst,
  type Cluster,
  type Instance,
} from "@/lib/lab/cluster";
import { cn } from "@/lib/utils";

const TICK_SECONDS = 0.25;
const SLOTS = MAX_INSTANCES + 1; // +1: instância extra durante o rolling update

type Action =
  | { type: "tick" }
  | { type: "rps"; value: number }
  | { type: "burst" }
  | { type: "kill"; id: string }
  | { type: "autoscale"; value: boolean }
  | { type: "desired"; delta: number }
  | { type: "deploy" }
  | { type: "reset" };

function reducer(cluster: Cluster, action: Action): Cluster {
  switch (action.type) {
    case "tick":
      return tick(cluster, TICK_SECONDS);
    case "rps":
      return setRps(cluster, action.value);
    case "burst":
      return triggerBurst(cluster);
    case "kill":
      return killInstance(cluster, action.id);
    case "autoscale":
      return setAutoscale(cluster, action.value);
    case "desired":
      return changeDesired(cluster, action.delta);
    case "deploy":
      return startDeploy(cluster);
    case "reset":
      return createCluster();
  }
}

type Point = { x: number; y: number };
/** Trajetos em linha reta (com cantos) por onde as requisições correm. */
type Wiring = { trunk: Point[]; routes: Record<string, Point[]> };

const toPath = (points: Point[]) => points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

/** Ponto a uma fração `t` (0–1) do comprimento total de uma linha quebrada. */
function pointAlong(points: Point[], t: number): Point {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index]!.x, point.y - points[index]!.y));
  let remaining = Math.max(0, Math.min(1, t)) * lengths.reduce((sum, length) => sum + length, 0);

  for (const [index, length] of lengths.entries()) {
    const from = points[index]!;
    const to = points[index + 1]!;
    if (remaining <= length || index === lengths.length - 1) {
      const ratio = length > 0 ? Math.min(1, remaining / length) : 0;
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
    remaining -= length;
  }
  return points[0] ?? { x: 0, y: 0 };
}

const STATE_LABEL: Record<Instance["state"], string> = {
  booting: "iniciando",
  healthy: "saudável",
  down: "sem resposta",
  draining: "drenando",
};

/**
 * Laboratório de servidores: um cluster simulado que o visitante opera — aumenta
 * o tráfego, derruba instâncias, liga o auto scaling e dispara um deploy — e vê
 * o balanceador, os health checks e o rolling update reagindo.
 */
export function ServerLab() {
  const [cluster, dispatch] = useReducer(reducer, undefined, createCluster);
  const [wiring, setWiring] = useState<Wiring | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const balancerRef = useRef<HTMLDivElement>(null);
  const instanceRefs = useRef(new Map<string, HTMLElement>());
  const packetLayer = useRef<SVGGElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const live = useRef({ cluster, wiring });

  useEffect(() => {
    live.current = { cluster, wiring };
  }, [cluster, wiring]);

  // A simulação só avança enquanto a seção está na tela.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let timer = 0;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      window.clearInterval(timer);
      if (visible) timer = window.setInterval(() => dispatch({ type: "tick" }), TICK_SECONDS * 1000);
    });
    observer.observe(stage);

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, []);

  // Mede onde estão os cartões para ligar cliente → balanceador → instâncias.
  const layoutKey = cluster.instances.map((instance) => instance.id).join(",");
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const origin = stage.getBoundingClientRect();
      const client = clientRef.current?.getBoundingClientRect();
      const balancer = balancerRef.current?.getBoundingClientRect();
      if (!client || !balancer) return;

      // Empilhado (telas estreitas) ou lado a lado: os trajetos saem por lados diferentes.
      const stacked = balancer.top >= client.bottom - 4;
      const box = (rect: DOMRect) => ({
        left: rect.left - origin.left,
        right: rect.right - origin.left,
        top: rect.top - origin.top,
        bottom: rect.bottom - origin.top,
        x: rect.left + rect.width / 2 - origin.left,
        y: rect.top + rect.height / 2 - origin.top,
      });
      const from = box(client);
      const hub = box(balancer);

      const routes: Record<string, Point[]> = {};
      for (const [id, element] of instanceRefs.current) {
        const target = box(element.getBoundingClientRect());
        if (stacked) {
          // Desce por um trilho à esquerda da lista e entra em cada instância pela lateral.
          const rail = target.left - 14;
          const turn = hub.bottom + 14;
          routes[id] = [
            { x: hub.x, y: hub.bottom },
            { x: hub.x, y: turn },
            { x: rail, y: turn },
            { x: rail, y: target.y },
            { x: target.left, y: target.y },
          ];
        } else {
          const mid = (hub.right + target.left) / 2;
          routes[id] = [
            { x: hub.right, y: hub.y },
            { x: mid, y: hub.y },
            { x: mid, y: target.y },
            { x: target.left, y: target.y },
          ];
        }
      }

      const next: Wiring = {
        trunk: stacked
          ? [{ x: from.x, y: from.bottom }, { x: hub.x, y: hub.top }]
          : [{ x: from.right, y: from.y }, { x: hub.left, y: hub.y }],
        routes,
      };
      setWiring((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [layoutKey]);

  // Pacotes: bolinhas desenhadas direto no SVG, fora do ciclo de render do React.
  useEffect(() => {
    const layer = packetLayer.current;
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    type Packet = { dot: SVGCircleElement; born: number; via: Point[]; duration: number; fails: boolean };
    const packets: Packet[] = [];
    let frame = 0;
    let last = performance.now();
    let owed = 0;
    let turn = 0;

    const loop = (now: number) => {
      const { cluster: state, wiring: wires } = live.current;
      const elapsed = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (wires && !document.hidden) {
        // Uma amostra do tráfego: no máximo ~16 bolinhas por segundo.
        owed += elapsed * Math.min(16, state.metrics.demand / 22);
        const routed = state.instances.filter((instance) => instance.routed && wires.routes[instance.id]);

        while (owed >= 1) {
          owed -= 1;
          const target = routed.length > 0 ? routed[turn++ % routed.length] : undefined;
          // Sem alvo, ou recusada por sobrecarga: a requisição morre no balanceador.
          const refused = !target || (target.state !== "down" && Math.random() < state.metrics.errorRate);
          const route = target && !refused ? wires.routes[target.id] : undefined;

          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          layer.appendChild(dot);
          packets.push({
            dot,
            born: now,
            via: route ? [...wires.trunk, ...route] : wires.trunk,
            duration: route ? 900 : 380,
            fails: refused || target?.state === "down",
          });
        }
      }

      for (let index = packets.length - 1; index >= 0; index--) {
        const packet = packets[index]!;
        const progress = (now - packet.born) / packet.duration;

        if (progress >= 1.3) {
          packet.dot.remove();
          packets.splice(index, 1);
          continue;
        }

        const point = pointAlong(packet.via, progress);
        packet.dot.setAttribute("cx", String(point.x));
        packet.dot.setAttribute("cy", String(point.y));

        // Chegou: some aos poucos; se falhou, fica vermelha e maior.
        const arrived = progress >= 1;
        packet.dot.setAttribute("class", arrived && packet.fails ? "fill-rose" : "fill-accent");
        packet.dot.setAttribute("r", arrived && packet.fails ? "5.5" : "3.5");
        packet.dot.setAttribute("opacity", arrived ? String(Math.max(0, 1 - (progress - 1) * 3.4)) : "1");
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      packets.forEach((packet) => packet.dot.remove());
    };
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [cluster.events.length]);

  const healthy = cluster.instances.filter((instance) => instance.state === "healthy").length;
  const { metrics } = cluster;
  const errorTone = metrics.errorRate > 0.02 ? "rose" : metrics.errorRate > 0 ? "amber" : "accent";
  const latencyTone = metrics.latency > 400 ? "rose" : metrics.latency > 120 ? "amber" : "accent";

  return (
    <Section id="laboratorio">
      <SectionHeading
        label="Laboratório"
        title="Derrube um servidor. Eu espero."
        description="Um cluster simulado rodando no seu navegador. Aumente o tráfego, derrube uma instância ou dispare um deploy e veja balanceamento, health checks, auto scaling e rolling update reagindo em tempo real."
      />

      <Reveal className="panel mt-9 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-base-800/50 px-4 py-2.5 sm:px-5">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            <FlaskConical size={13} aria-hidden /> simulação interativa
          </span>
          <span className="text-[12px] text-ink-faint">
            Modelo didático: os números são gerados aqui, não são métricas de produção.
          </span>
        </div>

        {/* métricas */}
        <dl className="grid grid-cols-2 border-b border-line lg:grid-cols-4">
          <Metric
            icon={<Activity size={14} />}
            label="Throughput"
            value={Math.round(metrics.throughput).toLocaleString("pt-BR")}
            unit="req/s"
            series={cluster.history.map((sample) => sample.throughput)}
          />
          <Metric
            icon={<Timer size={14} />}
            label="Latência média"
            value={Math.round(metrics.latency).toLocaleString("pt-BR")}
            unit="ms"
            tone={latencyTone}
            series={cluster.history.map((sample) => sample.latency)}
          />
          <Metric
            icon={<TriangleAlert size={14} />}
            label="Erros (5xx)"
            value={(metrics.errorRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            unit="%"
            tone={errorTone}
            series={cluster.history.map((sample) => sample.errorRate)}
          />
          <Metric
            icon={<Gauge size={14} />}
            label="CPU média"
            value={String(Math.round(metrics.cpu * 100))}
            unit="%"
            tone={metrics.cpu > 0.85 ? "rose" : metrics.cpu > 0.75 ? "amber" : "accent"}
            series={[]}
            bar={metrics.cpu}
          />
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* topologia */}
          <div ref={stageRef} className="dot-backdrop relative flex items-center p-4 sm:p-6">
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
              {wiring ? (
                <>
                  <path d={toPath(wiring.trunk)} fill="none" strokeWidth={1.5} className="stroke-accent/50" />
                  {cluster.instances.map((instance) => {
                    const route = wiring.routes[instance.id];
                    if (!route) return null;
                    return (
                      <path
                        key={instance.id}
                        d={toPath(route)}
                        fill="none"
                        strokeWidth={1.5}
                        strokeLinejoin="round"
                        strokeDasharray={instance.routed ? undefined : "4 6"}
                        className={cn(
                          "transition-colors duration-300",
                          !instance.routed && "stroke-base-500",
                          instance.routed && (instance.state === "down" ? "stroke-rose/70" : "stroke-accent/50"),
                        )}
                      />
                    );
                  })}
                </>
              ) : null}
              <g ref={packetLayer} />
            </svg>

            <div className="relative grid w-full grid-cols-1 items-center gap-9 lg:grid-cols-[150px_150px_minmax(0,1fr)] lg:gap-12 xl:gap-16">
              <div ref={clientRef} className="panel mx-auto w-full max-w-[220px] p-3.5 lg:max-w-none">
                <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
                  <Users size={13} className="text-accent" aria-hidden /> clientes
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">
                  {Math.round(metrics.demand).toLocaleString("pt-BR")}
                  <span className="ml-1 font-mono text-[11px] font-normal text-ink-faint">req/s</span>
                </p>
                <p className={cn("mt-0.5 font-mono text-[10.5px]", cluster.burst > 0 ? "text-amber" : "text-ink-faint")}>
                  {cluster.burst > 0 ? `pico · ${Math.ceil(cluster.burst)}s` : "tráfego normal"}
                </p>
              </div>

              <div ref={balancerRef} className="panel mx-auto w-full max-w-[220px] p-3.5 lg:max-w-none">
                <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
                  <Network size={13} className="text-accent" aria-hidden /> balanceador
                </p>
                <p className="mt-2 text-[13px] font-medium text-ink">round robin</p>
                <p className="mt-0.5 font-mono text-[10.5px] text-ink-faint">
                  {cluster.instances.filter((instance) => instance.routed).length} alvo(s) em rotação
                </p>
              </div>

              <ul className="space-y-2 pl-6 lg:pl-0">
                {Array.from({ length: SLOTS }, (_, index) => {
                  const instance = cluster.instances[index];
                  if (!instance) {
                    return (
                      <li
                        key={`vaga-${index}`}
                        aria-hidden
                        className="flex h-11 items-center justify-center rounded-lg border border-dashed border-line font-mono text-[10.5px] text-ink-faint/60"
                      >
                        vaga
                      </li>
                    );
                  }

                  const canKill = instance.state === "healthy" || instance.state === "booting";
                  const tone =
                    instance.state === "healthy"
                      ? "text-accent"
                      : instance.state === "booting"
                        ? "text-amber"
                        : instance.state === "down"
                          ? "text-rose"
                          : "text-ink-faint";

                  return (
                    <li key={instance.id}>
                      <button
                        type="button"
                        ref={(element) => {
                          if (element) instanceRefs.current.set(instance.id, element);
                          else instanceRefs.current.delete(instance.id);
                        }}
                        onClick={() => dispatch({ type: "kill", id: instance.id })}
                        disabled={!canKill}
                        aria-label={`Instância ${instance.id}, ${STATE_LABEL[instance.state]}. ${canKill ? "Clique para derrubar." : ""}`}
                        className={cn(
                          "line-in group/instance relative flex h-11 w-full items-center gap-3 rounded-lg border bg-base-850 px-3 text-left transition-colors",
                          instance.state === "healthy" && "border-accent/40 hover:border-rose/70",
                          instance.state === "booting" && "border-amber/50 hover:border-rose/70",
                          instance.state === "down" && "border-rose/60 bg-rose/10",
                          instance.state === "draining" && "border-line opacity-60",
                        )}
                      >
                        <Server
                          size={14}
                          aria-hidden
                          className={cn("shrink-0", tone, instance.state === "booting" && "animate-[boot_1s_ease-in-out_infinite]")}
                        />
                        <span className="w-[92px] shrink-0 font-mono text-[11.5px] text-ink">
                          {instance.id}
                          <span className="ml-1.5 text-[10px] text-ink-faint">v1.{instance.version}</span>
                        </span>
                        <span className={cn("hidden w-[84px] shrink-0 font-mono text-[10.5px] sm:block", tone)}>
                          {STATE_LABEL[instance.state]}
                        </span>
                        <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-base-700">
                          <span
                            className={cn(
                              "block h-full rounded-full transition-[width,background-color] duration-300",
                              instance.cpu > 0.85 ? "bg-rose" : instance.cpu > 0.75 ? "bg-amber" : "bg-accent",
                            )}
                            style={{ width: `${Math.round(instance.cpu * 100)}%` }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-faint">
                          {Math.round(instance.cpu * 100)}%
                        </span>

                        {canKill ? (
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 rounded-lg bg-base-950/85 font-mono text-[11px] font-semibold text-rose opacity-0 transition-opacity group-hover/instance:opacity-100 group-focus-visible/instance:opacity-100">
                            <Power size={13} aria-hidden /> derrubar instância
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* controles + eventos */}
          <div className="flex flex-col border-t border-line lg:border-l lg:border-t-0">
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <label htmlFor="lab-rps" className="flex items-center justify-between text-[12.5px] text-ink-muted">
                  Tráfego
                  <span className="font-mono text-[11.5px] tabular-nums text-ink">{cluster.rps} req/s</span>
                </label>
                <input
                  id="lab-rps"
                  type="range"
                  min={0}
                  max={MAX_RPS}
                  step={10}
                  value={cluster.rps}
                  onChange={(event) => dispatch({ type: "rps", value: Number(event.target.value) })}
                  style={{ "--fill": `${(cluster.rps / MAX_RPS) * 100}%` } as React.CSSProperties}
                  className="range mt-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <LabButton onClick={() => dispatch({ type: "burst" })} disabled={cluster.burst > 0} icon={<Zap size={13} />}>
                  Pico de tráfego
                </LabButton>
                <LabButton onClick={() => dispatch({ type: "deploy" })} disabled={cluster.deploying} icon={<Rocket size={13} />}>
                  {cluster.deploying ? "Em deploy…" : "Novo deploy"}
                </LabButton>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-ink-muted">Auto scaling</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cluster.autoscale}
                  aria-label="Auto scaling"
                  onClick={() => dispatch({ type: "autoscale", value: !cluster.autoscale })}
                  className={cn(
                    "relative h-6 w-11 rounded-full border transition-colors",
                    cluster.autoscale ? "border-accent-strong bg-accent-strong" : "border-line-strong bg-base-700",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-base-950 transition-transform",
                      cluster.autoscale && "translate-x-5",
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-ink-muted">
                  Instâncias
                  <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
                    {healthy} saudáveis / {cluster.desired} desejadas
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <StepButton
                    label="Remover instância"
                    onClick={() => dispatch({ type: "desired", delta: -1 })}
                    disabled={cluster.autoscale || cluster.desired <= MIN_INSTANCES}
                  >
                    <Minus size={13} />
                  </StepButton>
                  <StepButton
                    label="Adicionar instância"
                    onClick={() => dispatch({ type: "desired", delta: 1 })}
                    disabled={cluster.autoscale || cluster.desired >= MAX_INSTANCES}
                  >
                    <Plus size={13} />
                  </StepButton>
                </span>
              </div>
              {cluster.autoscale ? (
                <p className="-mt-2 text-[11.5px] leading-snug text-ink-faint">
                  Com o auto scaling ligado a capacidade é ajustada sozinha. Desligue para controlar manualmente.
                </p>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col border-t border-line bg-base-950/60">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">eventos</span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "reset" })}
                  className="inline-flex items-center gap-1 font-mono text-[10.5px] text-ink-faint transition-colors hover:text-accent"
                >
                  <RotateCcw size={11} aria-hidden /> reiniciar
                </button>
              </div>
              <div
                ref={logRef}
                role="log"
                aria-live="polite"
                aria-label="Eventos do cluster"
                className="scrollbar-thin h-40 overflow-y-auto px-4 pb-3 font-mono text-[11px] leading-[1.75] lg:h-auto lg:max-h-48 lg:min-h-40 lg:flex-1"
              >
                {cluster.events.map((event) => (
                  <p
                    key={event.id}
                    className={cn(
                      "line-in",
                      event.tone === "ok" && "text-accent",
                      event.tone === "info" && "text-ink-muted",
                      event.tone === "warn" && "text-amber",
                      event.tone === "error" && "text-rose",
                    )}
                  >
                    <span className="text-ink-faint">{`${event.at.toFixed(1).padStart(6, " ")}s `}</span>
                    {event.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
  series,
  tone = "accent",
  bar,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  series: number[];
  tone?: "accent" | "amber" | "rose";
  bar?: number;
}) {
  const peak = Math.max(...series, 1e-6);
  const points = series
    .map((sample, index) => `${(index / Math.max(1, series.length - 1)) * 100},${26 - (sample / peak) * 22}`)
    .join(" ");
  const color = tone === "rose" ? "text-rose" : tone === "amber" ? "text-amber" : "text-accent";

  return (
    <div className="border-line p-4 odd:border-r sm:px-5 lg:border-r lg:last:border-r-0 [&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0">
      <dt className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
        <span className={color} aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 flex items-end justify-between gap-3">
        <span className={cn("font-display text-2xl font-semibold tabular-nums transition-colors", tone === "accent" ? "text-ink" : color)}>
          {value}
          <span className="ml-1 font-mono text-[11px] font-normal text-ink-faint">{unit}</span>
        </span>

        {bar !== undefined ? (
          <span aria-hidden className="mb-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-base-700">
            <span
              className={cn("block h-full rounded-full transition-[width] duration-300", tone === "rose" ? "bg-rose" : tone === "amber" ? "bg-amber" : "bg-accent")}
              style={{ width: `${Math.round(bar * 100)}%` }}
            />
          </span>
        ) : series.length > 1 ? (
          <svg aria-hidden viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-7 w-20", color)}>
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          </svg>
        ) : null}
      </dd>
    </div>
  );
}

function LabButton({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-base-800 px-2 text-[12.5px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:pointer-events-none disabled:opacity-50"
    >
      <span aria-hidden>{icon}</span>
      {children}
    </button>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-line-strong text-ink-muted transition-colors hover:border-accent/60 hover:text-accent disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
