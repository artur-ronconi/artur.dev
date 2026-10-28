"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Generic ordered list editor used by every repeatable block of the project
 * form (sections, metrics, links, diagrams, …).
 */
export function Repeatable<T>({
  items,
  onChange,
  create,
  render,
  addLabel,
  emptyLabel,
  itemLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  addLabel: string;
  emptyLabel: string;
  itemLabel: (item: T, index: number) => string;
}) {
  const update = (index: number, patch: Partial<T>) => {
    onChange(items.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, position) => position !== index));

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-base-900/60 px-4 py-6 text-center text-[13px] text-ink-faint">
          {emptyLabel}
        </p>
      ) : null}

      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-line bg-base-900 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="truncate font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              {String(index + 1).padStart(2, "0")} · {itemLabel(item, index)}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Mover para cima"
                className="rounded border border-line p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label="Mover para baixo"
                className="rounded border border-line p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
              >
                <ChevronDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Remover item"
                className="rounded border border-line p-1 text-ink-faint transition-colors hover:text-rose"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {render(item, (patch) => update(index, patch), index)}
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...items, create()])}>
        <Plus size={14} /> {addLabel}
      </Button>
    </div>
  );
}
