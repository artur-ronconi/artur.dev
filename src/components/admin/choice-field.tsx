"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Search, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChoiceOption = { value: string; label: string; color?: string | null; group?: string | null };

/**
 * Seleção múltipla em "chips", agrupada e com busca. Usada para escolher as
 * tecnologias de uma experiência entre as que já estão cadastradas.
 */
export function ChoiceField({
  options,
  value,
  onChange,
  manage,
  emptyLabel = "Nenhuma opção cadastrada.",
}: {
  options: ChoiceOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Link para a tela onde as opções são criadas. */
  manage?: { href: string; label: string };
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const map = new Map<string, ChoiceOption[]>();
    for (const option of options) {
      if (term && !option.label.toLowerCase().includes(term)) continue;
      const key = option.group ?? "Outras";
      map.set(key, [...(map.get(key) ?? []), option]);
    }
    return [...map.entries()];
  }, [options, query]);

  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter((entry) => entry !== id) : [...value, id]);

  const manageLink = manage ? (
    <Link
      href={manage.href}
      target="_blank"
      className="inline-flex items-center gap-1.5 text-[12px] text-accent transition-opacity hover:opacity-80"
    >
      <Settings2 size={12} /> {manage.label}
    </Link>
  ) : null;

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-base-900/60 px-4 py-4 text-center text-[13px] text-ink-faint">
        <p>{emptyLabel}</p>
        {manageLink ? <p className="mt-2">{manageLink}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-base-900 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="relative block min-w-[180px] flex-1">
          <span className="sr-only">Filtrar opções</span>
          <Search size={13} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar…"
            className="w-full rounded-md border border-line bg-base-850 py-1.5 pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
        </label>
        <span className="font-mono text-[11px] text-ink-faint">{value.length} selecionada(s)</span>
        {manageLink}
      </div>

      {groups.length === 0 ? (
        <p className="py-2 text-center text-[12.5px] text-ink-faint">Nada encontrado para “{query}”.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([group, items]) => (
            <div key={group}>
              <p className="rule-label mb-1.5">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((option) => {
                  const active = selected.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(option.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12.5px] transition-colors",
                        active
                          ? "border-accent/60 bg-accent-soft text-ink"
                          : "border-line bg-base-850 text-ink-muted hover:border-accent/40 hover:text-ink",
                      )}
                    >
                      {active ? (
                        <Check size={12} className="text-accent" aria-hidden />
                      ) : (
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full bg-base-500"
                          style={option.color ? { backgroundColor: option.color } : undefined}
                        />
                      )}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
