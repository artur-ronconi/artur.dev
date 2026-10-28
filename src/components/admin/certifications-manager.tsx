"use client";

import { CrudManager, type FieldDef } from "@/components/admin/crud-manager";
import { Badge } from "@/components/ui/badge";
import { deleteCertificationAction, saveCertificationAction } from "@/server/actions/portfolio";

const FIELDS: FieldDef[] = [
  { name: "name", label: "Nome", type: "text", required: true, placeholder: "AWS Certified Developer – Associate" },
  { name: "issuer", label: "Emissor", type: "text", required: true, placeholder: "Amazon Web Services" },
  { name: "issuedAt", label: "Emitida em", type: "text", placeholder: "Jan/2026" },
  { name: "expiresAt", label: "Válida até", type: "text", placeholder: "Jan/2029" },
  { name: "credentialId", label: "ID da credencial", type: "text" },
  { name: "credentialUrl", label: "Link de verificação", type: "url" },
  { name: "iconSlug", label: "Ícone (slug)", type: "text", placeholder: "aws" },
  { name: "order", label: "Ordem", type: "number" },
  { name: "visible", label: "Visível no site", type: "checkbox" },
];

export function CertificationsManager({
  certifications,
}: {
  certifications: Array<Record<string, unknown> & { id: string }>;
}) {
  return (
    <CrudManager
      title="Certificações"
      description="Exibidas na seção de certificações da página inicial."
      addLabel="Nova certificação"
      items={certifications}
      fields={FIELDS}
      emptyValue={{
        name: "",
        issuer: "",
        issuedAt: "",
        expiresAt: "",
        credentialId: "",
        credentialUrl: "",
        iconSlug: "",
        order: 0,
        visible: true,
      }}
      onSave={(csrf, payload) => saveCertificationAction(csrf, payload)}
      onDelete={deleteCertificationAction}
      renderItem={(item) => (
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] text-ink">
            {String(item.name)}
            {item.visible ? null : <Badge mono>oculta</Badge>}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-faint">
            {String(item.issuer)}
            {item.issuedAt ? ` · ${String(item.issuedAt)}` : ""}
          </p>
        </div>
      )}
    />
  );
}
