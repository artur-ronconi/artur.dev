"use client";

import { useMemo } from "react";

import { FlowExplorer } from "@/components/flow/flow-explorer";
import { MermaidDiagram } from "@/components/project/mermaid-diagram";
import { parseFlowchart } from "@/lib/flow/parse";

/**
 * Diagrama de arquitetura cadastrado no painel (texto Mermaid).
 *
 * Fluxogramas viram o explorador interativo; qualquer outro tipo de diagrama
 * (sequência, classes, ER…) continua sendo renderizado pelo Mermaid.
 */
export function ArchitectureDiagram({
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
  const graph = useMemo(() => parseFlowchart(source), [source]);

  return graph ? (
    <FlowExplorer graph={graph} title={title} description={description} className={className} />
  ) : (
    <MermaidDiagram source={source} title={title} description={description} className={className} />
  );
}
