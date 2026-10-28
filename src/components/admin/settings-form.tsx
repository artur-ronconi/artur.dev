"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";

import { ImageField } from "@/components/admin/image-field";
import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { saveSettingsAction } from "@/server/actions/portfolio";

export type SettingsValues = {
  fullName: string;
  headline: string;
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroDescription: string;
  shortBio: string;
  about: string;
  summaryItems: string[];
  avatarUrl: string | null;
  resumeUrl: string | null;
  email: string;
  phone: string;
  location: string;
  available: boolean;
  availabilityNote: string;
  githubUrl: string;
  linkedinUrl: string;
  siteUrl: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string | null;
  contactHeading: string;
  contactText: string;
  footerNote: string;
};

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();

  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      const result = await saveSettingsAction(csrf, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(result.message ?? "Salvo.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const error = (key: keyof SettingsValues) => errors[key];

  return (
    <div className="space-y-5">
      <div className="panel space-y-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink">Identidade profissional</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" htmlFor="fullName" required error={error("fullName")}>
            <Input id="fullName" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Título profissional" htmlFor="headline" required error={error("headline")}>
            <Input id="headline" value={values.headline} onChange={(e) => set("headline", e.target.value)} />
          </Field>
        </div>

        <Field label="Resumo curto" htmlFor="shortBio" error={error("shortBio")} description="Usado em metadados e no rodapé.">
          <Input id="shortBio" value={values.shortBio} onChange={(e) => set("shortBio", e.target.value)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink">Foto / avatar</p>
            <ImageField
              value={values.avatarUrl}
              onChange={(url) => set("avatarUrl", url)}
              label="avatar"
              shape="circle"
            />
            <p className="mt-1.5 text-[12px] leading-snug text-ink-faint">
              Exibida em recorte circular no topo da home e em “Sobre mim”. Prefira uma foto quadrada.
            </p>
          </div>
          <Field
            label="Currículo (URL)"
            htmlFor="resumeUrl"
            error={error("resumeUrl")}
            description="Link do PDF exibido no botão “Baixar CV”."
          >
            <Input id="resumeUrl" value={values.resumeUrl ?? ""} onChange={(e) => set("resumeUrl", e.target.value || null)} />
          </Field>
        </div>
      </div>

      <div className="panel space-y-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink">Hero da página inicial</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Selo" htmlFor="heroBadge" error={error("heroBadge")}>
            <Input id="heroBadge" value={values.heroBadge} onChange={(e) => set("heroBadge", e.target.value)} placeholder="Software Engineer" />
          </Field>
          <Field label="Linha de abertura" htmlFor="heroTitle" error={error("heroTitle")}>
            <Input id="heroTitle" value={values.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} placeholder="Olá, eu sou" />
          </Field>
        </div>

        <Field
          label="Nome em destaque"
          htmlFor="heroHighlight"
          error={error("heroHighlight")}
          description="Texto grande do hero. Se vazio, usa o nome completo."
        >
          <Input
            id="heroHighlight"
            value={values.heroHighlight}
            onChange={(e) => set("heroHighlight", e.target.value)}
          />
        </Field>

        <Field
          label="Subtítulo"
          htmlFor="heroSubtitle"
          error={error("heroSubtitle")}
          description="Separe as áreas com “·” para exibir divisores."
        >
          <Input id="heroSubtitle" value={values.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} />
        </Field>

        <Field label="Descrição" htmlFor="heroDescription" error={error("heroDescription")}>
          <Textarea id="heroDescription" rows={4} value={values.heroDescription} onChange={(e) => set("heroDescription", e.target.value)} />
        </Field>
      </div>

      <div className="panel space-y-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink">Sobre mim</h2>

        <Field
          label="Texto"
          htmlFor="about"
          error={error("about")}
          description="Aceita Markdown simples: **negrito**, listas com - e links."
        >
          <Textarea id="about" rows={8} value={values.about} onChange={(e) => set("about", e.target.value)} />
        </Field>

        <Field
          label="Resumo profissional (um item por linha)"
          htmlFor="summaryItems"
          error={error("summaryItems")}
        >
          <Textarea
            id="summaryItems"
            rows={6}
            value={values.summaryItems.join("\n")}
            onChange={(e) =>
              set(
                "summaryItems",
                e.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
              )
            }
          />
        </Field>
      </div>

      <div className="panel space-y-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink">Contato e links</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" htmlFor="email" error={error("email")}>
            <Input id="email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Telefone" htmlFor="phone" error={error("phone")}>
            <Input id="phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Localização" htmlFor="location" error={error("location")}>
            <Input id="location" value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="Cidade, Estado — País" />
          </Field>
          <Field label="GitHub" htmlFor="githubUrl" error={error("githubUrl")}>
            <Input id="githubUrl" value={values.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/usuario" />
          </Field>
          <Field label="LinkedIn" htmlFor="linkedinUrl" error={error("linkedinUrl")}>
            <Input id="linkedinUrl" value={values.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
          </Field>
          <Field label="Site pessoal" htmlFor="siteUrl" error={error("siteUrl")}>
            <Input id="siteUrl" value={values.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} />
          </Field>
        </div>

        <Checkbox
          label="Disponível para novas oportunidades"
          checked={values.available}
          onChange={(e) => set("available", e.target.checked)}
        />

        <Field label="Texto de disponibilidade" htmlFor="availabilityNote" error={error("availabilityNote")}>
          <Input id="availabilityNote" value={values.availabilityNote} onChange={(e) => set("availabilityNote", e.target.value)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título da seção de contato" htmlFor="contactHeading" error={error("contactHeading")}>
            <Input id="contactHeading" value={values.contactHeading} onChange={(e) => set("contactHeading", e.target.value)} />
          </Field>
          <Field label="Texto da seção de contato" htmlFor="contactText" error={error("contactText")}>
            <Input id="contactText" value={values.contactText} onChange={(e) => set("contactText", e.target.value)} />
          </Field>
        </div>

        <Field label="Nota do rodapé" htmlFor="footerNote" error={error("footerNote")}>
          <Input id="footerNote" value={values.footerNote} onChange={(e) => set("footerNote", e.target.value)} />
        </Field>
      </div>

      <div className="panel space-y-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink">SEO da página inicial</h2>

        <Field label="Meta title" htmlFor="metaTitle" error={error("metaTitle")}>
          <Input id="metaTitle" value={values.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
        </Field>

        <Field label="Meta description" htmlFor="metaDescription" error={error("metaDescription")}>
          <Textarea id="metaDescription" rows={3} value={values.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
        </Field>

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Imagem Open Graph</p>
          <ImageField value={values.ogImageUrl} onChange={(url) => set("ogImageUrl", url)} label="imagem OG" />
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="button" onClick={submit} disabled={saving}>
          <Save size={15} /> {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
