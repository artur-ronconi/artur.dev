import { describe, expect, it } from "vitest";

import { layoutFlow } from "@/lib/flow/layout";
import { parseFlowchart } from "@/lib/flow/parse";
import { buildWaves } from "@/lib/flow/simulate";

const WEBHOOKS = `flowchart LR
  P[Integrações externas] -->|POST /webhooks| API[API de ingestão]
  API -->|enfileira| Q[(Fila)]
  Q --> W1[Worker]
  Q --> W2[Worker]
  W1 --> DB[(Banco de dados)]
  W2 --> DB
  W1 -. falhas .-> DLQ[(Fila de erros)]
  DLQ --> R[Reprocessamento]
  DB --> UI[Painel]`;

const INVENTORY = `flowchart TD
  subgraph Contas
    A1[Conta AWS 1]
    A2[Conta AWS 2]
  end
  A1 --> C[Coletor]
  A2 --> C
  C --> S[(Base)]
  S --> G[Políticas]
  G -->|Terraform + GitOps| Contas
  P[Pipelines] --> G`;

describe("parseFlowchart", () => {
  it("extrai nós, formas, rótulos e estilos de aresta", () => {
    const graph = parseFlowchart(WEBHOOKS)!;

    expect(graph.direction).toBe("LR");
    expect(graph.nodes.map((node) => node.id)).toEqual(["P", "API", "Q", "W1", "W2", "DB", "DLQ", "R", "UI"]);
    expect(graph.nodes.find((node) => node.id === "Q")).toMatchObject({ label: "Fila", shape: "database" });
    expect(graph.edges[0]).toMatchObject({ from: "P", to: "API", label: "POST /webhooks", style: "solid" });
    expect(graph.edges.find((edge) => edge.to === "DLQ")).toMatchObject({ label: "falhas", style: "dotted" });
  });

  it("trata subgrafos e arestas que apontam para um subgrafo", () => {
    const graph = parseFlowchart(INVENTORY)!;

    expect(graph.direction).toBe("TB");
    expect(graph.groups).toEqual([{ id: "Contas", label: "Contas", parent: null }]);
    expect(graph.nodes.filter((node) => node.group === "Contas").map((node) => node.id)).toEqual(["A1", "A2"]);
    expect(graph.nodes.some((node) => node.id === "Contas")).toBe(false);
    expect(graph.edges.find((edge) => edge.to === "Contas")?.label).toBe("Terraform + GitOps");
  });

  it("aceita cadeias, `&`, formas variadas e texto entre aspas", () => {
    const graph = parseFlowchart(
      'graph TD\n  A([Início]) --> B{{Barramento}} --> C{"Válido?"}\n  C -- sim --> D & E\n  C == não ==> F((Fim))',
    )!;

    expect(graph.nodes.map((node) => node.shape)).toEqual(["stadium", "hexagon", "diamond", "rect", "rect", "circle"]);
    expect(graph.nodes[2]?.label).toBe("Válido?");
    expect(graph.edges.map((edge) => `${edge.from}>${edge.to}:${edge.label ?? ""}:${edge.style}`)).toEqual([
      "A>B::solid",
      "B>C::solid",
      "C>D:sim:solid",
      "C>E:sim:solid",
      "C>F:não:thick",
    ]);
  });

  it("devolve null para o que não é um fluxograma suportado", () => {
    expect(parseFlowchart("sequenceDiagram\n  A->>B: oi")).toBeNull();
    expect(parseFlowchart("flowchart RL\n  A --> B")).toBeNull();
    expect(parseFlowchart("flowchart LR\n  A <--> B")).toBeNull();
    expect(parseFlowchart("flowchart LR\n  subgraph X\n  A --> B")).toBeNull();
  });
});

describe("layoutFlow", () => {
  it("posiciona os nós em camadas no sentido do fluxo, sem sobreposição", () => {
    const layout = layoutFlow(parseFlowchart(WEBHOOKS)!);
    const at = (id: string) => layout.nodes.find((node) => node.id === id)!;

    expect(at("P").x).toBeLessThan(at("API").x);
    expect(at("API").x).toBeLessThan(at("Q").x);
    expect(at("Q").x).toBeLessThan(at("W1").x);
    expect(at("W1").x).toBe(at("W2").x);

    for (const a of layout.nodes) {
      for (const b of layout.nodes) {
        if (a.id >= b.id) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.id} x ${b.id}`).toBe(false);
      }
    }

    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.x + node.w).toBeLessThanOrEqual(layout.width);
      expect(node.y + node.h).toBeLessThanOrEqual(layout.height);
    }
  });

  it("desenha o mesmo grafo na vertical quando pedido", () => {
    const layout = layoutFlow(parseFlowchart(WEBHOOKS)!, "TB");
    const at = (id: string) => layout.nodes.find((node) => node.id === id)!;

    expect(at("P").y).toBeLessThan(at("API").y);
    expect(layout.height).toBeGreaterThan(layout.width);
  });

  it("envolve os membros no subgrafo e roteia a aresta de retorno", () => {
    const layout = layoutFlow(parseFlowchart(INVENTORY)!);
    const group = layout.groups[0]!;

    for (const id of ["A1", "A2"]) {
      const node = layout.nodes.find((candidate) => candidate.id === id)!;
      expect(node.x).toBeGreaterThan(group.x);
      expect(node.y).toBeGreaterThan(group.y);
      expect(node.x + node.w).toBeLessThan(group.x + group.w);
      expect(node.y + node.h).toBeLessThan(group.y + group.h);
    }

    const back = layout.edges.find((edge) => edge.to === "Contas")!;
    expect(back.path.startsWith("M ")).toBe(true);
    expect(back.path).not.toMatch(/NaN|e-/);
    expect(layout.edges).toHaveLength(6);
  });
});

describe("buildWaves", () => {
  it("propaga o fluxo em ondas a partir das origens", () => {
    const graph = parseFlowchart(WEBHOOKS)!;
    const waves = buildWaves(graph);

    expect(waves.start).toEqual(["P"]);
    expect(waves.steps.map((step) => step.map((hop) => `${hop.from}>${hop.to}`))).toEqual([
      ["P>API"],
      ["API>Q"],
      ["Q>W1", "Q>W2"],
      ["W1>DB", "W2>DB", "W1>DLQ"],
      ["DLQ>R", "DB>UI"],
    ]);
  });

  it("percorre cada aresta uma única vez, mesmo com ciclos e subgrafos", () => {
    const graph = parseFlowchart(INVENTORY)!;
    const waves = buildWaves(graph);
    const hops = waves.steps.flat();

    expect(waves.start.sort()).toEqual(["A1", "A2", "P"]);
    expect(new Set(hops.map((hop) => hop.id)).size).toBe(graph.edges.length);
    expect(hops.find((hop) => hop.to === "Contas")?.reached.sort()).toEqual(["A1", "A2"]);
  });

  it("pode começar de um nó específico", () => {
    const waves = buildWaves(parseFlowchart(WEBHOOKS)!, ["Q"]);

    expect(waves.steps[0]?.map((hop) => hop.to)).toEqual(["W1", "W2"]);
    expect(waves.steps.flat().some((hop) => hop.from === "P")).toBe(false);
  });
});
