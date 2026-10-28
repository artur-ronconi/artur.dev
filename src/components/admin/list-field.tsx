"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

/** Remove o marcador que vem junto quando se cola uma lista ("- ", "• ", "1. "). */
const stripBullet = (line: string) => line.replace(/^\s*(?:[-•*–·]|\d+[.)])\s+/, "").trim();

/**
 * Editor de lista (bullet points): um campo por item. Enter cria o próximo
 * item, Backspace em um item vazio o remove, e colar várias linhas vira vários
 * itens.
 */
export function ListField({
  id,
  items,
  onChange,
  placeholder = "Descreva o item",
  addLabel = "Adicionar item",
}: {
  id?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const fields = useRef<Array<HTMLTextAreaElement | null>>([]);
  /** Item que deve receber o foco depois da próxima renderização. */
  const focusNext = useRef<number | null>(null);

  useEffect(() => {
    // Cada campo cresce para caber o texto, sem barra de rolagem interna.
    for (const field of fields.current) {
      if (!field) continue;
      field.style.height = "auto";
      field.style.height = `${field.scrollHeight}px`;
    }

    if (focusNext.current !== null) {
      const field = fields.current[focusNext.current];
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
      focusNext.current = null;
    }
  }, [items]);

  const replace = (index: number, ...values: string[]) => {
    const next = [...items];
    next.splice(index, 1, ...values);
    onChange(next);
  };

  const insertAfter = (index: number) => {
    const next = [...items];
    next.splice(index + 1, 0, "");
    focusNext.current = index + 1;
    onChange(next);
  };

  const remove = (index: number) => {
    focusNext.current = items.length > 1 ? Math.max(0, index - 1) : null;
    onChange(items.filter((_, position) => position !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved ?? "");
    focusNext.current = target;
    onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      insertAfter(index);
    } else if (event.key === "Backspace" && items[index] === "") {
      event.preventDefault();
      remove(index);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>, index: number) => {
    const lines = event.clipboardData.getData("text").split(/\r?\n/).map(stripBullet).filter(Boolean);
    if (lines.length < 2) return;

    event.preventDefault();
    const [first = "", ...rest] = lines;
    focusNext.current = index + rest.length;
    replace(index, `${items[index] ?? ""}${first}`, ...rest);
  };

  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-base-900/60 px-4 py-4 text-center text-[13px] text-ink-faint">
          Nenhum item ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span aria-hidden className="mt-[15px] h-1.5 w-1.5 shrink-0 rounded-sm bg-accent" />
              <textarea
                ref={(element) => {
                  fields.current[index] = element;
                }}
                id={index === 0 ? id : undefined}
                rows={1}
                value={item}
                placeholder={placeholder}
                aria-label={`Item ${index + 1}`}
                onChange={(event) => replace(index, event.target.value.replace(/\n/g, " "))}
                onKeyDown={(event) => onKeyDown(event, index)}
                onPaste={(event) => onPaste(event, index)}
                className="min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-line bg-base-900 px-3 py-2 text-sm leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
              <span className="mt-1 flex shrink-0 gap-0.5">
                <RowButton label="Mover para cima" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ChevronUp size={13} />
                </RowButton>
                <RowButton label="Mover para baixo" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                  <ChevronDown size={13} />
                </RowButton>
                <RowButton label="Remover item" onClick={() => remove(index)} danger>
                  <X size={13} />
                </RowButton>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => insertAfter(items.length - 1)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded border border-line p-1.5 text-ink-faint transition-colors disabled:opacity-30 ${
        danger ? "hover:text-rose" : "hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
