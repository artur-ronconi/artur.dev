"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";

import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

const METHOD_TONE: Record<string, string> = {
  GET: "text-accent border-accent/30 bg-accent-soft",
  POST: "text-emerald border-emerald/30 bg-emerald/10",
  PUT: "text-amber border-amber/30 bg-amber/10",
  PATCH: "text-amber border-amber/30 bg-amber/10",
  DELETE: "text-rose border-rose/30 bg-rose/10",
  WS: "text-violet border-violet/30 bg-violet/10",
};

type Endpoint = {
  id: string;
  method: string;
  path: string;
  description: string | null;
  auth: string | null;
};

/** Monta um exemplo de chamada a partir do método, da rota e do tipo de autenticação. */
function exampleFor(endpoint: Endpoint): string {
  const path = endpoint.path.replace(/:(\w+)/g, "{$1}");
  if (endpoint.method === "WS") return `wscat -c "$WS_URL${path}"`;

  const lines = [`curl -X ${endpoint.method} "$API_URL${path}"`];
  if (endpoint.auth) {
    const scheme = /bearer|jwt|token/i.test(endpoint.auth) ? "Bearer $TOKEN" : "$CREDENCIAL";
    lines.push(`  -H "Authorization: ${scheme}"`);
  }
  if (["POST", "PUT", "PATCH"].includes(endpoint.method)) {
    lines.push(`  -H "Content-Type: application/json"`, `  -d '{ ... }'`);
  }
  return lines.join(" \\\n");
}

/**
 * Explorador de endpoints: filtra por método e expande cada rota para mostrar
 * um exemplo de chamada pronto para copiar.
 */
export function EndpointsTable({ endpoints }: { endpoints: Endpoint[] }) {
  const [method, setMethod] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  if (endpoints.length === 0) return null;

  const methods = [...new Set(endpoints.map((endpoint) => endpoint.method))];
  const visible = method ? endpoints.filter((endpoint) => endpoint.method === method) : endpoints;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-base-800/50 px-4 py-2.5">
        <FilterChip active={method === null} onClick={() => setMethod(null)}>
          todos
        </FilterChip>
        {methods.map((entry) => (
          <FilterChip key={entry} active={method === entry} onClick={() => setMethod(method === entry ? null : entry)}>
            {entry}
          </FilterChip>
        ))}
        <span className="ml-auto font-mono text-[11px] text-ink-faint">
          {visible.length} de {endpoints.length} rota(s)
        </span>
      </div>

      <ul>
        {visible.map((endpoint) => {
          const expanded = open === endpoint.id;
          const example = exampleFor(endpoint);

          return (
            <li key={endpoint.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : endpoint.id)}
                aria-expanded={expanded}
                aria-controls={`endpoint-${endpoint.id}`}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_18px] items-start gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-accent-soft/30 sm:grid-cols-[72px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(64px,auto)_18px]"
              >
                <span
                  className={cn(
                    "inline-flex w-fit rounded border px-2 py-0.5 font-mono text-[11px] font-semibold",
                    METHOD_TONE[endpoint.method] ?? "border-line bg-base-800 text-ink-muted",
                  )}
                >
                  {endpoint.method}
                </span>
                <span className="break-all font-mono text-[12.5px] text-ink">
                  {endpoint.path.split(/(:\w+)/).map((part, index) =>
                    part.startsWith(":") ? (
                      <span key={index} className="text-amber">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
                </span>
                <span className="col-span-2 col-start-2 text-[13px] text-ink-muted sm:col-span-1 sm:col-start-3">
                  {endpoint.description ?? "—"}
                </span>
                <span className="col-start-2 inline-flex items-center gap-1 font-mono text-[11px] text-ink-faint sm:col-start-4 sm:mt-0.5">
                  {endpoint.auth ? (
                    <>
                      <Lock size={11} aria-hidden /> {endpoint.auth}
                    </>
                  ) : (
                    "público"
                  )}
                </span>
                <ChevronDown
                  size={15}
                  aria-hidden
                  className={cn(
                    "col-start-3 row-start-1 mt-0.5 text-ink-faint transition-transform sm:col-start-5",
                    expanded && "rotate-180 text-accent",
                  )}
                />
              </button>

              {expanded ? (
                <div id={`endpoint-${endpoint.id}`} className="line-in border-t border-line bg-base-950/50 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
                      exemplo de chamada · gerado a partir da rota
                    </p>
                    <CopyButton text={example} />
                  </div>
                  <pre className="scrollbar-thin overflow-x-auto font-mono text-[12px] leading-relaxed text-ink">
                    <code>{example}</code>
                  </pre>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
        active ? "border-accent/50 bg-accent-soft text-accent" : "border-line text-ink-muted hover:border-accent/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
