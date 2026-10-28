"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";

import type { ChoiceOption } from "@/components/admin/choice-field";
import { CrudManager, type FieldDef } from "@/components/admin/crud-manager";
import { Badge } from "@/components/ui/badge";
import { isExternalUrl, type MediaItem } from "@/lib/media";
import { deleteExperienceAction, saveExperienceAction } from "@/server/actions/portfolio";

export function ExperiencesManager({
  experiences,
  technologies,
}: {
  experiences: Array<Record<string, unknown> & { id: string }>;
  /** Tecnologias cadastradas em /admin/tecnologias, para seleção. */
  technologies: ChoiceOption[];
}) {
  const fields: FieldDef[] = [
    { name: "company", label: "Empresa", type: "text", required: true },
    { name: "role", label: "Cargo", type: "text", required: true },
    { name: "startDate", label: "Início", type: "text", required: true, placeholder: "Mar/2024" },
    { name: "endDate", label: "Fim", type: "text", placeholder: "Ago/2025" },
    { name: "current", label: "Emprego atual", type: "checkbox" },
    { name: "location", label: "Local", type: "text", placeholder: "Remoto" },
    { name: "companyUrl", label: "Site da empresa", type: "url" },
    { name: "order", label: "Ordem", type: "number" },
    {
      name: "logoUrl",
      label: "Ícone",
      type: "image",
      shape: "square",
      description: "Foto quadrada (ex.: 256×256 px), exibida ao lado do nome da empresa.",
      full: true,
    },
    { name: "description", label: "Descrição", type: "textarea" },
    {
      name: "highlights",
      label: "Principais entregas",
      type: "list",
      placeholder: "Ex.: Redução de 86% nos custos de rede",
      addLabel: "Adicionar entrega",
      description: "Um tópico por item. Enter cria o próximo; colar várias linhas vira vários tópicos.",
    },
    {
      name: "technologyIds",
      label: "Tecnologias utilizadas",
      type: "choices",
      options: technologies,
      manage: { href: "/admin/tecnologias", label: "Gerenciar tecnologias" },
      placeholder: "Nenhuma tecnologia cadastrada ainda.",
      description: "Selecione entre as tecnologias cadastradas na aba Tecnologias.",
    },
    {
      name: "media",
      label: "Fotos e vídeos",
      type: "media",
      description: "Aparecem como galeria no cartão desta experiência.",
    },
    { name: "visible", label: "Visível no site", type: "checkbox" },
  ];

  return (
    <CrudManager
      title="Experiências profissionais"
      description="Exibidas na linha do tempo da página inicial."
      addLabel="Nova experiência"
      items={experiences}
      fields={fields}
      emptyValue={{
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        current: false,
        location: "",
        companyUrl: "",
        logoUrl: "",
        description: "",
        highlights: [],
        technologyIds: [],
        media: [],
        order: 0,
        visible: true,
      }}
      onSave={(csrf, payload) => saveExperienceAction(csrf, payload)}
      onDelete={deleteExperienceAction}
      renderItem={(item) => {
        const logo = item.logoUrl ? String(item.logoUrl) : null;
        const counts = [
          [(item.highlights as string[]).length, "entrega(s)"],
          [(item.technologyIds as string[]).length, "tecnologia(s)"],
          [(item.media as MediaItem[]).length, "mídia(s)"],
        ] as const;

        return (
          <div className="flex items-start gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-base-900 text-ink-faint">
              {logo ? (
                <Image src={logo} alt="" fill sizes="40px" unoptimized={isExternalUrl(logo)} className="object-cover" />
              ) : (
                <Building2 size={16} aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[13.5px] text-ink">
                {String(item.company)}
                <span className="text-ink-muted">· {String(item.role)}</span>
                {item.current ? <Badge tone="emerald" mono>atual</Badge> : null}
                {item.visible ? null : <Badge mono>oculta</Badge>}
              </p>
              <p className="mt-0.5 font-mono text-[11.5px] text-ink-faint">
                {String(item.startDate)} — {item.current ? "Atual" : String(item.endDate || "—")}
                {counts
                  .filter(([count]) => count > 0)
                  .map(([count, label]) => ` · ${count} ${label}`)
                  .join("")}
              </p>
            </div>
          </div>
        );
      }}
    />
  );
}
