"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp, Save } from "lucide-react";

import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { saveHomeSectionsAction } from "@/server/actions/portfolio";

type Section = { key: string; label: string; visible: boolean; order: number };

/** Controls which home sections appear and in which order. */
export function HomeSectionsForm({ sections }: { sections: Section[] }) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(sections);
  const [saving, setSaving] = useState(false);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    setItems(next);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const result = await saveHomeSectionsAction(csrf, {
        sections: items.map((item, index) => ({ key: item.key, visible: item.visible, order: index })),
      });
      if (result.ok) {
        toast.success(result.message ?? "Seções atualizadas.");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel p-5">
      <h2 className="text-[15px] font-semibold text-ink">Seções da página inicial</h2>
      <p className="mt-1 text-[12.5px] text-ink-faint">Defina a ordem e a visibilidade de cada bloco da home.</p>

      <ul className="mt-4 divide-y divide-line">
        {items.map((section, index) => (
          <li key={section.key} className="flex items-center justify-between gap-3 py-2.5">
            <label className="flex flex-1 items-center gap-2.5">
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((item) =>
                      item.key === section.key ? { ...item, visible: event.target.checked } : item,
                    ),
                  )
                }
                className="h-4 w-4 rounded border-line bg-base-900 accent-[var(--color-accent-strong)]"
              />
              <span className="text-[13.5px] text-ink">{section.label}</span>
              <span className="font-mono text-[11px] text-ink-faint">{section.key}</span>
            </label>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Mover ${section.label} para cima`}
                className="rounded border border-line p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`Mover ${section.label} para baixo`}
                className="rounded border border-line p-1 text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" onClick={submit} disabled={saving}>
          <Save size={14} /> {saving ? "Salvando…" : "Salvar ordem"}
        </Button>
      </div>
    </section>
  );
}
