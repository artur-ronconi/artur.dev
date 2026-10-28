import type { FlowEdge, FlowGraph } from "@/lib/flow/parse";

/** Uma aresta percorrida em uma etapa da simulação. */
export type Hop = FlowEdge & {
  /** Nós alcançados: o destino, ou todos os membros quando o destino é um subgrafo. */
  reached: string[];
};

export type Waves = { start: string[]; steps: Hop[][] };

/**
 * Transforma o grafo em "ondas": a etapa 1 percorre as arestas que saem das
 * origens, a etapa 2 as que saem dos nós alcançados na etapa 1, e assim por
 * diante. Cada aresta é percorrida uma única vez, então ciclos terminam.
 */
export function buildWaves(graph: FlowGraph, startIds?: string[]): Waves {
  const parentOf = new Map(graph.groups.map((group) => [group.id, group.parent]));
  const groupsOf = (group: string | null) => {
    const chain: string[] = [];
    for (let at = group; at; at = parentOf.get(at) ?? null) chain.push(at);
    return chain;
  };

  const members = new Map<string, string[]>();
  for (const node of graph.nodes) {
    for (const group of groupsOf(node.group)) members.set(group, [...(members.get(group) ?? []), node.id]);
  }
  const expand = (id: string) => members.get(id) ?? (parentOf.has(id) ? [] : [id]);

  const targeted = new Set(graph.edges.map((edge) => edge.to));
  const sources = graph.nodes.filter((node) => !targeted.has(node.id)).map((node) => node.id);
  const start = startIds?.length ? startIds : sources.length > 0 ? sources : graph.nodes.slice(0, 1).map((node) => node.id);

  const active = new Set(start);
  const traversed = new Set<string>();
  const steps: Hop[][] = [];
  let frontier = new Set(start);

  while (frontier.size > 0) {
    const hops: Hop[] = [];
    for (const edge of graph.edges) {
      if (traversed.has(edge.id) || !expand(edge.from).some((id) => frontier.has(id))) continue;
      traversed.add(edge.id);
      hops.push({ ...edge, reached: expand(edge.to) });
    }
    if (hops.length === 0) break;

    steps.push(hops);
    frontier = new Set(hops.flatMap((hop) => hop.reached).filter((id) => !active.has(id)));
    for (const id of frontier) active.add(id);
  }

  return { start, steps };
}
