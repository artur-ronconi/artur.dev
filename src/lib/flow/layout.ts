import type { FlowDirection, FlowEdge, FlowGraph, FlowNode } from "@/lib/flow/parse";

/**
 * Layout em camadas (estilo Sugiyama, simplificado) para os fluxogramas:
 *
 *  1. arestas que fecham ciclos são separadas e desenhadas por fora do grafo;
 *  2. cada nó recebe uma camada (caminho mais longo a partir das origens);
 *  3. arestas que atravessam mais de uma camada ganham pontos intermediários;
 *  4. a ordem dentro das camadas é ajustada por baricentro para reduzir cruzamentos;
 *  5. as posições são relaxadas em direção aos vizinhos.
 *
 * Tudo é calculado em dois eixos abstratos — `rank` (sentido do fluxo) e `cross`
 * — e só no final vira x/y, então o mesmo código serve para LR e TB.
 */

export type Point = { x: number; y: number };

export type Rect = Point & { w: number; h: number };

/** Comando de caminho SVG e seus pontos. */
type Segment = ["M" | "L" | "C" | "Q", ...Point[]];

type Route = { segments: Segment[]; end: Point; labelAt: Point };

export type LaidOutNode = FlowNode & Rect & { lines: string[] };

export type LaidOutEdge = FlowEdge & {
  /** Caminho SVG (atributo `d`). */
  path: string;
  /** Ponta da seta. */
  end: Point;
  labelAt: Point | null;
  labelWidth: number;
};

export type LaidOutGroup = { id: string; label: string } & Rect;

export type FlowLayout = {
  direction: FlowDirection;
  width: number;
  height: number;
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  groups: LaidOutGroup[];
};

const CHAR_WIDTH = 7.5; // JetBrains Mono a 12.5px
const LABEL_CHAR_WIDTH = 6.4; // rótulo de aresta a 10.5px
const NODE_PADDING_X = 14;
const ICON_SLOT = 30;
const LINE_HEIGHT = 16;
const MAX_LINE = 20;
const CROSS_GAP = 22;
const GROUP_PADDING = 16;
const GROUP_HEADER = 26;
const LANE_GAP = 16;
/** Quanto uma aresta de retorno se afasta do nó antes de virar para a faixa externa. */
const LANE_STUB = 22;
const CORNER = 10;
const MARGIN = 24;

function wrapLabel(label: string): string[] {
  if (label.length <= MAX_LINE) return [label];

  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > MAX_LINE) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

type Item = {
  id: string;
  dummy: boolean;
  group: string | null;
  layer: number;
  /** Tamanho ao longo do fluxo / perpendicular a ele. */
  rankSize: number;
  crossSize: number;
  rank: number;
  cross: number;
};

export function layoutFlow(graph: FlowGraph, direction: FlowDirection = graph.direction): FlowLayout {
  const horizontal = direction === "LR";
  // Na horizontal os rótulos das arestas ficam no vão entre as camadas.
  const longestLabel = Math.max(0, ...graph.edges.map((edge) => edge.label?.length ?? 0));
  const rankGap = horizontal ? Math.max(96, Math.round(longestLabel * LABEL_CHAR_WIDTH) + 52) : 58;

  const sizes = new Map<string, { w: number; h: number; lines: string[] }>();
  for (const node of graph.nodes) {
    const lines = wrapLabel(node.label);
    const longest = Math.max(...lines.map((line) => line.length));
    sizes.set(node.id, {
      w: Math.max(104, Math.round(longest * CHAR_WIDTH + ICON_SLOT + NODE_PADDING_X * 2)),
      h: 30 + lines.length * LINE_HEIGHT,
      lines,
    });
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const groupIds = new Set(graph.groups.map((group) => group.id));

  // ------------------------------------------------- 1. ciclos e arestas de grupo
  const nodeEdges = graph.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to);
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of nodeEdges) outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);

  const backEdges = new Set<string>();
  const state = new Map<string, "open" | "done">();
  const visit = (id: string) => {
    state.set(id, "open");
    for (const edge of outgoing.get(id) ?? []) {
      const seen = state.get(edge.to);
      if (seen === "open") backEdges.add(edge.id);
      else if (!seen) visit(edge.to);
    }
    state.set(id, "done");
  };
  for (const node of graph.nodes) if (!state.has(node.id)) visit(node.id);

  const forward = nodeEdges.filter((edge) => !backEdges.has(edge.id));

  // ------------------------------------------------------------- 2. camadas
  const layer = new Map<string, number>(graph.nodes.map((node) => [node.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of forward) {
      const wanted = layer.get(edge.from)! + 1;
      if (wanted > layer.get(edge.to)!) {
        layer.set(edge.to, wanted);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Origens ficam coladas no primeiro destino, em vez de todas na camada 0.
  const hasIncoming = new Set(forward.map((edge) => edge.to));
  for (const node of graph.nodes) {
    if (hasIncoming.has(node.id)) continue;
    const targets = forward.filter((edge) => edge.from === node.id).map((edge) => layer.get(edge.to)!);
    if (targets.length > 0) layer.set(node.id, Math.min(...targets) - 1);
  }

  // ---------------------------------------- 3. pontos intermediários (dummies)
  const items = new Map<string, Item>();
  for (const node of graph.nodes) {
    const size = sizes.get(node.id)!;
    items.set(node.id, {
      id: node.id,
      dummy: false,
      group: node.group,
      layer: layer.get(node.id)!,
      rankSize: horizontal ? size.w : size.h,
      crossSize: horizontal ? size.h : size.w,
      rank: 0,
      cross: 0,
    });
  }

  /** Cadeia de itens percorrida por cada aresta "para frente". */
  const chains = new Map<string, string[]>();
  for (const edge of forward) {
    const chain = [edge.from];
    for (let at = layer.get(edge.from)! + 1; at < layer.get(edge.to)!; at++) {
      const id = `${edge.id}@${at}`;
      items.set(id, { id, dummy: true, group: null, layer: at, rankSize: 0, crossSize: 14, rank: 0, cross: 0 });
      chain.push(id);
    }
    chain.push(edge.to);
    chains.set(edge.id, chain);
  }

  const layerCount = Math.max(...[...items.values()].map((item) => item.layer)) + 1;
  const layers: Item[][] = Array.from({ length: layerCount }, () => []);
  for (const item of items.values()) layers[item.layer]!.push(item);

  const neighborsBefore = new Map<string, string[]>();
  const neighborsAfter = new Map<string, string[]>();
  for (const chain of chains.values()) {
    chain.slice(1).forEach((b, index) => {
      const a = chain[index]!;
      neighborsAfter.set(a, [...(neighborsAfter.get(a) ?? []), b]);
      neighborsBefore.set(b, [...(neighborsBefore.get(b) ?? []), a]);
    });
  }

  // ------------------------------------------------ 4. ordem (baricentro)
  const position = new Map<string, number>();
  const reindex = (list: Item[]) => list.forEach((item, index) => position.set(item.id, index));
  layers.forEach(reindex);

  const sortLayer = (list: Item[], neighbors: Map<string, string[]>) => {
    const score = new Map<string, number>();
    for (const item of list) {
      const around = neighbors.get(item.id) ?? [];
      score.set(
        item.id,
        around.length > 0
          ? around.reduce((sum, id) => sum + position.get(id)!, 0) / around.length
          : position.get(item.id)!,
      );
    }
    list.sort((a, b) => score.get(a.id)! - score.get(b.id)!);

    // Membros de um mesmo subgrafo ficam juntos.
    const firstSeen = new Map<string, number>();
    list.forEach((item, index) => {
      const key = item.group ?? `#${item.id}`;
      if (!firstSeen.has(key)) firstSeen.set(key, index);
    });
    const order = new Map(list.map((item, index) => [item.id, index]));
    list.sort(
      (a, b) =>
        firstSeen.get(a.group ?? `#${a.id}`)! - firstSeen.get(b.group ?? `#${b.id}`)! ||
        order.get(a.id)! - order.get(b.id)!,
    );
    reindex(list);
  };

  for (let sweep = 0; sweep < 6; sweep++) {
    for (const list of layers.slice(1)) sortLayer(list, neighborsBefore);
    for (const list of layers.slice(0, -1).reverse()) sortLayer(list, neighborsAfter);
  }

  // ------------------------------------------------------ 5. coordenadas
  let rankCursor = 0;
  for (const list of layers) {
    const thickness = Math.max(...list.map((item) => item.rankSize), 0);
    for (const item of list) item.rank = rankCursor + thickness / 2;
    rankCursor += thickness + rankGap;
  }

  const gapBetween = (a: Item, b: Item) =>
    a.crossSize / 2 + b.crossSize / 2 + CROSS_GAP + (a.group !== b.group ? GROUP_PADDING + GROUP_HEADER / 2 : 0);

  const place = (list: Item[], desired: (item: Item) => number) => {
    if (list.length === 0) return;
    const wanted = list.map(desired);
    let drift = 0;
    let previous: Item | null = null;
    list.forEach((item, index) => {
      const target = wanted[index]!;
      item.cross = previous ? Math.max(target, previous.cross + gapBetween(previous, item)) : target;
      drift += item.cross - target;
      previous = item;
    });
    // Reparte o deslocamento acumulado, para a camada não "escorregar" para um lado.
    for (const item of list) item.cross -= drift / list.length;
  };

  for (const list of layers) {
    let cursor = 0;
    place(list, (item) => {
      const at = cursor + item.crossSize / 2;
      cursor += item.crossSize + CROSS_GAP;
      return at;
    });
    const center = list.length > 0 ? (list[0]!.cross + list.at(-1)!.cross) / 2 : 0;
    for (const item of list) item.cross -= center;
  }

  const meanOf = (ids: string[], fallback: number) =>
    ids.length > 0 ? ids.reduce((sum, id) => sum + items.get(id)!.cross, 0) / ids.length : fallback;

  for (let pass = 0; pass < 8; pass++) {
    for (const list of layers.slice(1)) {
      place(list, (item) => meanOf(neighborsBefore.get(item.id) ?? [], item.cross));
    }
    for (const list of layers.slice(0, -1).reverse()) {
      place(list, (item) => meanOf(neighborsAfter.get(item.id) ?? [], item.cross));
    }
  }

  // --------------------------------------------------- 6. geometria final
  const toPoint = (rank: number, cross: number): Point => (horizontal ? { x: rank, y: cross } : { x: cross, y: rank });

  const rects = new Map<string, Rect>();
  for (const node of graph.nodes) {
    const item = items.get(node.id)!;
    const size = sizes.get(node.id)!;
    const center = toPoint(item.rank, item.cross);
    rects.set(node.id, { x: center.x - size.w / 2, y: center.y - size.h / 2, w: size.w, h: size.h });
  }

  // Subgrafos: caixa que envolve os membros (incluindo os de subgrafos internos).
  const depthOf = (id: string): number => {
    const children = graph.groups.filter((group) => group.parent === id);
    return children.length === 0 ? 0 : 1 + Math.max(...children.map((child) => depthOf(child.id)));
  };
  const belongsTo = (group: string | null, target: string): boolean => {
    for (let at = group; at; at = graph.groups.find((candidate) => candidate.id === at)?.parent ?? null) {
      if (at === target) return true;
    }
    return false;
  };

  const groups: LaidOutGroup[] = [];
  for (const group of graph.groups) {
    const members = graph.nodes.filter((node) => belongsTo(node.group, group.id)).map((node) => rects.get(node.id)!);
    if (members.length === 0) continue;

    const pad = GROUP_PADDING + depthOf(group.id) * (GROUP_PADDING + 4);
    const left = Math.min(...members.map((rect) => rect.x)) - pad;
    const top = Math.min(...members.map((rect) => rect.y)) - pad - GROUP_HEADER;
    const right = Math.max(...members.map((rect) => rect.x + rect.w)) + pad;
    const bottom = Math.max(...members.map((rect) => rect.y + rect.h)) + pad;
    const rect = { x: left, y: top, w: right - left, h: bottom - top };
    groups.push({ id: group.id, label: group.label, ...rect });
    rects.set(group.id, rect);
  }

  // Lados de saída/entrada de um retângulo no sentido do fluxo.
  const exit = (rect: Rect): Point =>
    horizontal ? { x: rect.x + rect.w, y: rect.y + rect.h / 2 } : { x: rect.x + rect.w / 2, y: rect.y + rect.h };
  const entry = (rect: Rect): Point =>
    horizontal ? { x: rect.x, y: rect.y + rect.h / 2 } : { x: rect.x + rect.w / 2, y: rect.y };

  /** Curva suave que sai e chega alinhada ao sentido do fluxo. */
  const curve = (from: Point, to: Point): Segment => {
    if (horizontal) {
      const mid = (from.x + to.x) / 2;
      return ["C", { x: mid, y: from.y }, { x: mid, y: to.y }, to];
    }
    const mid = (from.y + to.y) / 2;
    return ["C", { x: from.x, y: mid }, { x: to.x, y: mid }, to];
  };

  const allRects = [...rects.values()];
  const crossMin = Math.min(...allRects.map((rect) => (horizontal ? rect.y : rect.x)));
  const crossMax = Math.max(...allRects.map((rect) => (horizontal ? rect.y + rect.h : rect.x + rect.w)));
  let lanesBefore = 0;
  let lanesAfter = 0;

  /** Contorna o grafo por fora: usado nas arestas de retorno e nas que apontam para trás. */
  const laneRoute = (from: Rect, to: Rect): Route => {
    const start = exit(from);
    const finish = entry(to);
    const startCross = horizontal ? start.y : start.x;
    const finishCross = horizontal ? finish.y : finish.x;
    const middle = (startCross + finishCross) / 2;
    const lane =
      crossMax - middle <= middle - crossMin
        ? crossMax + 26 + LANE_GAP * lanesAfter++
        : crossMin - 26 - LANE_GAP * lanesBefore++;

    const out = (horizontal ? start.x : start.y) + LANE_STUB;
    const into = (horizontal ? finish.x : finish.y) - LANE_STUB;
    const corners = [toPoint(out, startCross), toPoint(out, lane), toPoint(into, lane), toPoint(into, finishCross)];

    const segments: Segment[] = [["M", start]];
    let previous = start;
    corners.forEach((corner, index) => {
      const next = corners[index + 1] ?? finish;
      const before = towards(corner, previous, Math.min(CORNER, distance(corner, previous) / 2));
      const beyond = towards(corner, next, Math.min(CORNER, distance(corner, next) / 2));
      segments.push(["L", before], ["Q", corner, beyond]);
      previous = corner;
    });
    segments.push(["L", finish]);

    return { segments, end: finish, labelAt: toPoint((out + into) / 2, lane) };
  };

  const routed: Array<{ edge: FlowEdge; route: Route; labelWidth: number }> = [];
  for (const edge of graph.edges) {
    const from = rects.get(edge.from);
    const to = rects.get(edge.to);
    if (!from || !to || edge.from === edge.to) continue;

    const labelWidth = edge.label ? Math.round(edge.label.length * LABEL_CHAR_WIDTH + 16) : 0;
    const chain = chains.get(edge.id);
    let route: Route;

    if (chain) {
      const points = chain.map((id, index) => {
        if (index === 0) return exit(from);
        if (index === chain.length - 1) return entry(to);
        const item = items.get(id)!;
        return toPoint(item.rank, item.cross);
      });
      const first = points[0]!;
      route = {
        segments: [["M", first], ...points.slice(1).map((point, index) => curve(points[index]!, point))],
        end: points.at(-1)!,
        labelAt: midpoint(first, points[1]!),
      };
    } else {
      const start = exit(from);
      const finish = entry(to);
      const ahead = horizontal ? finish.x - start.x : finish.y - start.y;
      const involvesGroup = groupIds.has(edge.from) || groupIds.has(edge.to);

      route =
        involvesGroup && ahead > 30
          ? { segments: [["M", start], curve(start, finish)], end: finish, labelAt: midpoint(start, finish) }
          : laneRoute(from, to);
    }

    routed.push({ edge, route, labelWidth });
  }

  // ------------------------------------- 7. normaliza para a origem (0, 0)
  const xs: number[] = [];
  const ys: number[] = [];
  for (const rect of allRects) {
    xs.push(rect.x, rect.x + rect.w);
    ys.push(rect.y, rect.y + rect.h);
  }
  for (const { edge, route, labelWidth } of routed) {
    for (const [, ...points] of route.segments) {
      for (const point of points) {
        xs.push(point.x);
        ys.push(point.y);
      }
    }
    if (edge.label) {
      xs.push(route.labelAt.x - labelWidth / 2, route.labelAt.x + labelWidth / 2);
      ys.push(route.labelAt.y - 10, route.labelAt.y + 10);
    }
  }

  const dx = MARGIN - Math.min(...xs);
  const dy = MARGIN - Math.min(...ys);
  const move = (point: Point): Point => ({ x: round(point.x + dx), y: round(point.y + dy) });

  return {
    direction,
    width: Math.round(Math.max(...xs) + dx + MARGIN),
    height: Math.round(Math.max(...ys) + dy + MARGIN),
    nodes: graph.nodes.map((node) => {
      const rect = rects.get(node.id)!;
      return { ...node, ...move(rect), w: rect.w, h: rect.h, lines: sizes.get(node.id)!.lines };
    }),
    edges: routed.map(({ edge, route, labelWidth }) => ({
      ...edge,
      path: route.segments
        .map(([command, ...points]) => `${command} ${points.map(move).map((point) => `${point.x} ${point.y}`).join(" ")}`)
        .join(" "),
      end: move(route.end),
      labelAt: edge.label ? move(route.labelAt) : null,
      labelWidth,
    })),
    groups: groups.map((group) => ({ ...group, ...move(group) })),
  };
}

const round = (value: number) => Math.round(value * 10) / 10;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Ponto a `length` de `from`, na direção de `to`. */
function towards(from: Point, to: Point, length: number): Point {
  const total = distance(from, to) || 1;
  return { x: from.x + ((to.x - from.x) / total) * length, y: from.y + ((to.y - from.y) / total) * length };
}
