"use client";

import { CrudManager, type FieldDef } from "@/components/admin/crud-manager";
import { Badge } from "@/components/ui/badge";
import { deleteSocialLinkAction, saveSocialLinkAction } from "@/server/actions/portfolio";

const FIELDS: FieldDef[] = [
  { name: "label", label: "Rótulo", type: "text", required: true, placeholder: "GitHub" },
  { name: "url", label: "URL", type: "url", required: true, placeholder: "https://github.com/usuario" },
  { name: "iconSlug", label: "Ícone (slug)", type: "text", placeholder: "github" },
  { name: "order", label: "Ordem", type: "number" },
  { name: "visible", label: "Visível", type: "checkbox" },
];

export function SocialLinksManager({ links }: { links: Array<Record<string, unknown> & { id: string }> }) {
  return (
    <CrudManager
      title="Links sociais"
      description="Perfis profissionais exibidos no rodapé e no cabeçalho."
      addLabel="Novo link"
      items={links}
      fields={FIELDS}
      emptyValue={{ label: "", url: "", iconSlug: "", order: 0, visible: true }}
      onSave={(csrf, payload) => saveSocialLinkAction(csrf, payload)}
      onDelete={deleteSocialLinkAction}
      renderItem={(item) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] text-ink">{String(item.label)}</span>
          <span className="truncate font-mono text-[11.5px] text-ink-faint">{String(item.url)}</span>
          {item.visible ? null : <Badge mono>oculto</Badge>}
        </div>
      )}
    />
  );
}
