/**
 * Parser de um subconjunto de fluxogramas Mermaid (`flowchart` / `graph`).
 *
 * Os diagramas são cadastrados no painel como texto Mermaid. Para os fluxogramas
 * este parser extrai nós, arestas e subgrafos, e o site desenha um explorador
 * interativo próprio. Tudo que ele não entende (outros tipos de diagrama,
 * sintaxes menos comuns) devolve `null`, e a página usa o Mermaid como reserva.
 */

export type FlowShape =
  | "rect"
  | "round"
  | "stadium"
  | "subroutine"
  | "database"
  | "circle"
  | "diamond"
  | "hexagon";

export type FlowDirection = "LR" | "TB";

export type FlowNode = { id: string; label: string; shape: FlowShape; group: string | null };

export type FlowEdge = {
  id: string;
  /** Id de um nó ou de um grupo (subgrafo). */
  from: string;
  to: string;
  label: string | null;
  style: "solid" | "dotted" | "thick";
};

export type FlowGroup = { id: string; label: string; parent: string | null };

export type FlowGraph = {
  direction: FlowDirection;
  nodes: FlowNode[];
  edges: FlowEdge[];
  groups: FlowGroup[];
};

const HEADER = /^(?:flowchart|graph)(?:\s+(LR|TB|TD))?\s*$/i;
const IGNORED = /^(?:classDef|class|style|linkStyle|click|direction)\b/;
const ID = /^[\p{L}\p{N}_]+/u;

/** Delimitadores de forma, do mais longo para o mais curto. */
const SHAPES: Array<{ open: string; close: string; shape: FlowShape }> = [
  { open: "([", close: "])", shape: "stadium" },
  { open: "[[", close: "]]", shape: "subroutine" },
  { open: "[(", close: ")]", shape: "database" },
  { open: "((", close: "))", shape: "circle" },
  { open: "{{", close: "}}", shape: "hexagon" },
  { open: "[", close: "]", shape: "rect" },
  { open: "(", close: ")", shape: "round" },
  { open: "{", close: "}", shape: "diamond" },
];

/** Ligações com texto embutido: `-- texto -->`, `-. texto .->`, `== texto ==>`. */
const TEXT_LINKS: Array<{ pattern: RegExp; style: FlowEdge["style"]; both?: boolean }> = [
  { pattern: /^<--\s*([^-|>\s][^|>]*?)\s*-{2,}>/, style: "solid", both: true },
  { pattern: /^<-\.\s*([^.|>\s][^|>]*?)\s*\.-+>/, style: "dotted", both: true },
  { pattern: /^<==\s*([^=|>\s][^|>]*?)\s*={2,}>/, style: "thick", both: true },
  { pattern: /^--\s*([^-|>\s][^|>]*?)\s*-{2,}>/, style: "solid" },
  { pattern: /^-\.\s*([^.|>\s][^|>]*?)\s*\.-+>/, style: "dotted" },
  { pattern: /^==\s*([^=|>\s][^|>]*?)\s*={2,}>/, style: "thick" },
];

const PLAIN_LINKS: Array<{ pattern: RegExp; style: FlowEdge["style"]; both?: boolean }> = [
  { pattern: /^<-\.+->/, style: "dotted", both: true },
  { pattern: /^<={2,}>/, style: "thick", both: true },
  { pattern: /^<-{2,}>/, style: "solid", both: true },
  { pattern: /^-\.+->/, style: "dotted" },
  { pattern: /^-\.+-/, style: "dotted" },
  { pattern: /^={2,}>/, style: "thick" },
  { pattern: /^={3,}/, style: "thick" },
  { pattern: /^-{2,}>/, style: "solid" },
  { pattern: /^-{3,}/, style: "solid" },
];

function cleanLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/^`([\s\S]*)`$/, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

class Unsupported extends Error {}

export function parseFlowchart(source: string): FlowGraph | null {
  try {
    return parse(source);
  } catch (error) {
    if (error instanceof Unsupported) return null;
    throw error;
  }
}

function parse(source: string): FlowGraph {
  const lines = source
    .split(/\r?\n|;/)
    .map((line) => line.replace(/%%.*$/, "").trim())
    .filter(Boolean);

  const header = lines.shift()?.match(HEADER);
  if (!header) throw new Unsupported();

  const direction: FlowDirection = header[1]?.toUpperCase() === "LR" ? "LR" : "TB";
  const nodes = new Map<string, FlowNode & { explicit: boolean }>();
  const groups = new Map<string, FlowGroup>();
  const edges: FlowEdge[] = [];
  const stack: string[] = [];

  const touch = (id: string, label?: string, shape?: FlowShape) => {
    const existing = nodes.get(id);
    if (existing) {
      if (label !== undefined && shape) {
        existing.label = label;
        existing.shape = shape;
        existing.explicit = true;
      }
      // Citado antes fora de um subgrafo e declarado depois dentro de um: vale o subgrafo.
      existing.group ??= stack.at(-1) ?? null;
      return;
    }
    nodes.set(id, {
      id,
      label: label ?? id,
      shape: shape ?? "rect",
      group: stack.at(-1) ?? null,
      explicit: label !== undefined,
    });
  };

  for (const line of lines) {
    if (IGNORED.test(line)) continue;

    if (/^end$/i.test(line)) {
      if (!stack.pop()) throw new Unsupported();
      continue;
    }

    const subgraph = line.match(/^subgraph\s+(?<rest>.+)$/i)?.groups;
    if (subgraph) {
      const rest = subgraph.rest!.trim();
      const titled = rest.match(/^(?<id>[\p{L}\p{N}_]+)\s*\[(?<title>.+)\]$/u)?.groups;
      const id = titled?.id ?? (rest.match(ID)?.[0] === rest ? rest : `grupo_${groups.size + 1}`);
      const label = cleanLabel(titled?.title ?? rest);
      groups.set(id, { id, label, parent: stack.at(-1) ?? null });
      stack.push(id);
      continue;
    }

    parseStatement(line, touch, edges);
  }

  if (stack.length > 0) throw new Unsupported();

  // Um id usado como ponta de aresta que é, na verdade, um subgrafo.
  for (const id of groups.keys()) {
    const node = nodes.get(id);
    if (node && !node.explicit) nodes.delete(id);
    else if (node) throw new Unsupported();
  }

  if (nodes.size === 0) throw new Unsupported();

  return {
    direction,
    nodes: [...nodes.values()].map(({ id, label, shape, group }) => ({ id, label, shape, group })),
    edges,
    groups: [...groups.values()],
  };
}

function parseStatement(
  line: string,
  touch: (id: string, label?: string, shape?: FlowShape) => void,
  edges: FlowEdge[],
) {
  let rest = line;
  const skip = () => {
    rest = rest.trimStart();
  };

  const readNode = (): string => {
    const id = rest.match(ID)?.[0];
    if (!id) throw new Unsupported();
    rest = rest.slice(id.length);

    const shape = SHAPES.find((candidate) => rest.startsWith(candidate.open));
    if (!shape) {
      touch(id);
      return id;
    }

    const start = shape.open.length;
    const quoted = rest[start] === '"';
    const end = quoted
      ? rest.indexOf(`"${shape.close}`, start + 1) + 1
      : rest.indexOf(shape.close, start);
    if (end <= start - (quoted ? 0 : 1)) throw new Unsupported();

    touch(id, cleanLabel(rest.slice(start, end)), shape.shape);
    rest = rest.slice(end + shape.close.length);
    return id;
  };

  const readGroup = (): string[] => {
    const ids = [readNode()];
    skip();
    while (rest.startsWith("&")) {
      rest = rest.slice(1);
      skip();
      ids.push(readNode());
      skip();
    }
    return ids;
  };

  const readLink = (): { label: string | null; style: FlowEdge["style"]; both: boolean } => {
    for (const { pattern, style, both } of TEXT_LINKS) {
      const match = rest.match(pattern);
      if (match) {
        rest = rest.slice(match[0].length);
        return { label: cleanLabel(match[1] ?? ""), style, both: Boolean(both) };
      }
    }

    for (const { pattern, style, both } of PLAIN_LINKS) {
      const match = rest.match(pattern);
      if (!match) continue;
      rest = rest.slice(match[0].length);
      skip();

      const piped = rest.match(/^\|([^|]*)\|/);
      if (piped) rest = rest.slice(piped[0].length);
      return { label: piped ? cleanLabel(piped[1] ?? "") || null : null, style, both: Boolean(both) };
    }

    throw new Unsupported();
  };

  skip();
  let sources = readGroup();

  while (rest.length > 0) {
    const link = readLink();
    skip();
    const targets = readGroup();

    const { both, ...edge } = link;
    for (const from of sources) {
      for (const to of targets) {
        edges.push({ id: `e${edges.length}`, from, to, ...edge });
        // Seta nos dois sentidos: uma aresta de ida e outra de volta.
        if (both) edges.push({ id: `e${edges.length}`, from: to, to: from, ...edge });
      }
    }
    sources = targets;
  }
}
