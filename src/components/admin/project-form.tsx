"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ExternalLink, Eye, Save, Sparkles } from "lucide-react";

import { ImageField } from "@/components/admin/image-field";
import { Repeatable } from "@/components/admin/repeatable";
import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { ICON_NAMES } from "@/components/icons/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn, slugify } from "@/lib/utils";
import { saveProjectAction } from "@/server/actions/projects";
import type { ProjectInput } from "@/server/validation/schemas";

type Technology = { id: string; name: string; categoryName: string | null };
type Category = { id: string; name: string };

const TABS = [
  { id: "geral", label: "Geral" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "tecnologias", label: "Tecnologias" },
  { id: "arquitetura", label: "Arquitetura" },
  { id: "midia", label: "Mídia" },
  { id: "resultados", label: "Resultados e links" },
  { id: "seo", label: "SEO" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SECTION_TYPES: Array<{ value: ProjectInput["sections"][number]["type"]; label: string }> = [
  { value: "CONTEXT", label: "Contexto e problema" },
  { value: "OBJECTIVES", label: "Objetivos" },
  { value: "CONTRIBUTION", label: "Minha contribuição" },
  { value: "SOLUTION", label: "Solução implementada" },
  { value: "ARCHITECTURE", label: "Arquitetura" },
  { value: "CHALLENGES", label: "Desafios técnicos" },
  { value: "DECISIONS", label: "Decisões de engenharia" },
  { value: "RESULTS", label: "Resultados" },
  { value: "LEARNINGS", label: "Aprendizados" },
  { value: "CUSTOM", label: "Seção personalizada" },
];

const LINK_TYPES: Array<{ value: ProjectInput["links"][number]["type"]; label: string }> = [
  { value: "REPOSITORY", label: "Repositório" },
  { value: "DEMO", label: "Demonstração" },
  { value: "DOCS", label: "Documentação" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "ARTICLE", label: "Artigo" },
  { value: "OTHER", label: "Outro" },
];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "WS"] as const;

export const EMPTY_PROJECT: ProjectInput = {
  title: "",
  slug: "",
  subtitle: null,
  summary: "",
  description: null,
  categoryId: null,
  status: "DRAFT",
  featured: false,
  order: 0,
  period: null,
  role: null,
  client: null,
  startedAt: null,
  finishedAt: null,
  coverImageUrl: null,
  coverImageAlt: null,
  metaTitle: null,
  metaDescription: null,
  ogImageUrl: null,
  indexable: true,
  technologies: [],
  sections: [],
  metrics: [],
  features: [],
  links: [],
  images: [],
  diagrams: [],
  codeBlocks: [],
  endpoints: [],
};

export function ProjectForm({
  projectId,
  initial,
  technologies,
  categories,
}: {
  projectId?: string;
  initial: ProjectInput;
  technologies: Technology[];
  categories: Category[];
}) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("geral");
  const [form, setForm] = useState<ProjectInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const technologyGroups = useMemo(() => {
    const groups = new Map<string, Technology[]>();
    for (const technology of technologies) {
      const key = technology.categoryName ?? "Outras";
      groups.set(key, [...(groups.get(key) ?? []), technology]);
    }
    return [...groups.entries()];
  }, [technologies]);

  const selectedTechnologies = new Map(form.technologies.map((item) => [item.technologyId, item]));

  const toggleTechnology = (technologyId: string) => {
    if (selectedTechnologies.has(technologyId)) {
      set(
        "technologies",
        form.technologies.filter((item) => item.technologyId !== technologyId),
      );
    } else {
      set("technologies", [...form.technologies, { technologyId, role: null }]);
    }
  };

  const save = async (status?: ProjectInput["status"]) => {
    setSaving(true);
    setErrors({});

    const payload: ProjectInput = { ...form, status: status ?? form.status };

    try {
      const result = await saveProjectAction(csrf, { id: projectId, input: payload });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }

      setForm(payload);
      toast.success(result.message ?? "Projeto salvo.");

      if (!projectId && result.data) {
        router.push(`/admin/projetos/${result.data.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const error = (key: string) => errors[key];
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- barra fixa */}
      <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-base-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[11px]",
              form.status === "PUBLISHED"
                ? "border-emerald/30 bg-emerald/10 text-emerald"
                : "border-line bg-base-800 text-ink-muted",
            )}
          >
            {form.status === "PUBLISHED" ? "publicado" : "rascunho"}
          </span>
          {form.slug ? (
            <span className="truncate font-mono text-[12px] text-ink-faint">/projetos/{form.slug}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {projectId ? (
            <Link
              href={`/preview/${projectId}`}
              target="_blank"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] text-ink-muted transition-colors hover:text-accent"
            >
              <Eye size={14} /> Pré-visualizar
            </Link>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => save("DRAFT")}
          >
            Salvar rascunho
          </Button>

          <Button type="button" size="sm" disabled={saving} onClick={() => save("PUBLISHED")}>
            <Save size={14} /> {saving ? "Salvando…" : "Salvar e publicar"}
          </Button>
        </div>
      </div>

      {hasErrors ? (
        <p role="alert" className="rounded-lg border border-rose/30 bg-rose/10 px-3.5 py-2.5 text-[13px] text-rose">
          Existem campos inválidos. Verifique as abas destacadas antes de salvar.
        </p>
      ) : null}

      {/* -------------------------------------------------------------- abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-line pb-px">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "true" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3.5 py-2 text-[13.5px] transition-colors",
              tab === item.id
                ? "border-accent text-accent"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* -------------------------------------------------------------- geral */}
      {tab === "geral" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="panel space-y-4 p-5">
            <Field label="Título" htmlFor="title" required error={error("title")}>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((current) => ({
                    ...current,
                    title,
                    slug: slugTouched ? current.slug : slugify(title),
                  }));
                }}
                placeholder="Migração de infraestrutura para AWS"
              />
            </Field>

            <Field
              label="Slug (URL)"
              htmlFor="slug"
              required
              error={error("slug")}
              description="Endereço público do projeto: /projetos/<slug>"
            >
              <Input
                id="slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", slugify(event.target.value));
                }}
                placeholder="migracao-aws"
              />
            </Field>

            <Field label="Subtítulo" htmlFor="subtitle" error={error("subtitle")}>
              <Input
                id="subtitle"
                value={form.subtitle ?? ""}
                onChange={(event) => set("subtitle", event.target.value || null)}
                placeholder="Estabilidade, custo e escala"
              />
            </Field>

            <Field
              label="Descrição curta"
              htmlFor="summary"
              required
              error={error("summary")}
              description="Usada nos cards e como resumo no topo da página do projeto."
            >
              <Textarea
                id="summary"
                value={form.summary}
                onChange={(event) => set("summary", event.target.value)}
                rows={3}
              />
            </Field>

            <Field
              label="Descrição complementar"
              htmlFor="description"
              error={error("description")}
              description="Texto opcional exibido ao final da página. Aceita Markdown simples."
            >
              <Textarea
                id="description"
                value={form.description ?? ""}
                onChange={(event) => set("description", event.target.value || null)}
                rows={4}
              />
            </Field>
          </div>

          <div className="panel space-y-4 p-5">
            <Field label="Categoria" htmlFor="categoryId" error={error("categoryId")}>
              <Select
                id="categoryId"
                value={form.categoryId ?? ""}
                onChange={(event) => set("categoryId", event.target.value || null)}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Período" htmlFor="period" error={error("period")} description="Ex.: Mar/2024 — Ago/2025">
              <Input
                id="period"
                value={form.period ?? ""}
                onChange={(event) => set("period", event.target.value || null)}
              />
            </Field>

            <Field label="Meu papel" htmlFor="role" error={error("role")}>
              <Input
                id="role"
                value={form.role ?? ""}
                onChange={(event) => set("role", event.target.value || null)}
                placeholder="Platform Engineer"
              />
            </Field>

            <Field label="Cliente / empresa" htmlFor="client" error={error("client")}>
              <Input
                id="client"
                value={form.client ?? ""}
                onChange={(event) => set("client", event.target.value || null)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Início" htmlFor="startedAt" error={error("startedAt")}>
                <Input
                  id="startedAt"
                  type="date"
                  value={form.startedAt?.slice(0, 10) ?? ""}
                  onChange={(event) => set("startedAt", event.target.value || null)}
                />
              </Field>
              <Field label="Fim" htmlFor="finishedAt" error={error("finishedAt")}>
                <Input
                  id="finishedAt"
                  type="date"
                  value={form.finishedAt?.slice(0, 10) ?? ""}
                  onChange={(event) => set("finishedAt", event.target.value || null)}
                />
              </Field>
            </div>

            <Field label="Ordem de exibição" htmlFor="order" error={error("order")}>
              <Input
                id="order"
                type="number"
                min={0}
                value={form.order}
                onChange={(event) => set("order", Number(event.target.value))}
              />
            </Field>

            <Checkbox
              label="Destacar na página inicial"
              description="Projetos destacados aparecem na home."
              checked={form.featured}
              onChange={(event) => set("featured", event.target.checked)}
            />
          </div>
        </div>
      ) : null}

      {/* ----------------------------------------------------------- conteúdo */}
      {tab === "conteudo" ? (
        <div className="panel p-5">
          <h2 className="text-[15px] font-semibold text-ink">Seções do estudo de caso</h2>
          <p className="mb-4 mt-1 text-[12.5px] text-ink-faint">
            Cada seção vira um bloco na página do projeto. Aceita Markdown simples: <code>**negrito**</code>,{" "}
            <code>`código`</code>, listas com <code>-</code> e links.
          </p>

          <Repeatable
            items={form.sections}
            onChange={(sections) => set("sections", sections)}
            create={() => ({ type: "CUSTOM" as const, title: "", body: "", visible: true })}
            addLabel="Adicionar seção"
            emptyLabel="Nenhuma seção cadastrada. Adicione contexto, contribuição, solução, desafios e resultados."
            itemLabel={(section) => section.title || "nova seção"}
            render={(section, update) => (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
                  <Field label="Tipo">
                    <Select
                      value={section.type}
                      onChange={(event) =>
                        update({ type: event.target.value as typeof section.type })
                      }
                    >
                      {SECTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Título">
                    <Input
                      value={section.title}
                      onChange={(event) => update({ title: event.target.value })}
                      placeholder="Contexto e problema"
                    />
                  </Field>
                </div>
                <Field label="Conteúdo">
                  <Textarea
                    value={section.body}
                    onChange={(event) => update({ body: event.target.value })}
                    rows={7}
                  />
                </Field>
                <Checkbox
                  label="Seção visível"
                  checked={section.visible}
                  onChange={(event) => update({ visible: event.target.checked })}
                />
              </div>
            )}
          />
        </div>
      ) : null}

      {/* -------------------------------------------------------- tecnologias */}
      {tab === "tecnologias" ? (
        <div className="space-y-5">
          <div className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-ink">Tecnologias do projeto</h2>
              <Link href="/admin/tecnologias" className="text-[13px] text-accent hover:opacity-80">
                Cadastrar nova tecnologia →
              </Link>
            </div>
            <p className="mb-4 mt-1 text-[12.5px] text-ink-faint">
              Selecione as tecnologias e descreva o papel de cada uma neste projeto.
            </p>

            <div className="space-y-4">
              {technologyGroups.map(([group, items]) => (
                <div key={group}>
                  <p className="rule-label mb-2">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((technology) => {
                      const selected = selectedTechnologies.has(technology.id);
                      return (
                        <button
                          key={technology.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleTechnology(technology.id)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-colors",
                            selected
                              ? "border-accent/40 bg-accent-soft text-accent"
                              : "border-line bg-base-900 text-ink-muted hover:text-ink",
                          )}
                        >
                          {technology.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {form.technologies.length > 0 ? (
            <div className="panel p-5">
              <h3 className="text-[14px] font-semibold text-ink">Papel de cada tecnologia</h3>
              <ul className="mt-3 space-y-2.5">
                {form.technologies.map((item, index) => {
                  const technology = technologies.find((entry) => entry.id === item.technologyId);
                  return (
                    <li key={item.technologyId} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <span className="pt-2.5 text-[13px] text-ink">{technology?.name ?? "—"}</span>
                      <Input
                        value={item.role ?? ""}
                        placeholder="Ex.: fila de eventos e retentativas"
                        aria-label={`Papel de ${technology?.name ?? "tecnologia"}`}
                        onChange={(event) =>
                          set(
                            "technologies",
                            form.technologies.map((entry, position) =>
                              position === index ? { ...entry, role: event.target.value || null } : entry,
                            ),
                          )
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* -------------------------------------------------------- arquitetura */}
      {tab === "arquitetura" ? (
        <div className="space-y-5">
          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold text-ink">Diagramas (Mermaid)</h2>
            <p className="mb-4 mt-1 text-[12.5px] text-ink-faint">
              Use a sintaxe Mermaid (ex.: <code>flowchart LR</code>). O diagrama é renderizado na página do
              projeto com o tema do site.
            </p>

            <Repeatable
              items={form.diagrams}
              onChange={(diagrams) => set("diagrams", diagrams)}
              create={() => ({
                title: "",
                description: null,
                source: "flowchart LR\n  A[Cliente] --> B[API]\n  B --> C[(Banco)]",
              })}
              addLabel="Adicionar diagrama"
              emptyLabel="Nenhum diagrama cadastrado."
              itemLabel={(diagram) => diagram.title || "novo diagrama"}
              render={(diagram, update) => (
                <div className="space-y-3">
                  <Field label="Título">
                    <Input value={diagram.title} onChange={(event) => update({ title: event.target.value })} />
                  </Field>
                  <Field label="Descrição">
                    <Input
                      value={diagram.description ?? ""}
                      onChange={(event) => update({ description: event.target.value || null })}
                    />
                  </Field>
                  <Field label="Código Mermaid">
                    <Textarea
                      value={diagram.source}
                      onChange={(event) => update({ source: event.target.value })}
                      rows={8}
                      className="font-mono text-[12.5px]"
                    />
                  </Field>
                </div>
              )}
            />
          </div>

          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold text-ink">Endpoints e integrações</h2>
            <div className="mt-4">
              <Repeatable
                items={form.endpoints}
                onChange={(endpoints) => set("endpoints", endpoints)}
                create={() => ({ method: "GET" as const, path: "", description: null, auth: null })}
                addLabel="Adicionar endpoint"
                emptyLabel="Nenhum endpoint cadastrado."
                itemLabel={(endpoint) => `${endpoint.method} ${endpoint.path || "/"}`}
                render={(endpoint, update) => (
                  <div className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)]">
                    <Field label="Método">
                      <Select
                        value={endpoint.method}
                        onChange={(event) => update({ method: event.target.value as typeof endpoint.method })}
                      >
                        {METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="grid gap-3">
                      <Field label="Rota">
                        <Input
                          value={endpoint.path}
                          onChange={(event) => update({ path: event.target.value })}
                          placeholder="/v1/recurso"
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Descrição">
                          <Input
                            value={endpoint.description ?? ""}
                            onChange={(event) => update({ description: event.target.value || null })}
                          />
                        </Field>
                        <Field label="Autenticação">
                          <Input
                            value={endpoint.auth ?? ""}
                            onChange={(event) => update({ auth: event.target.value || null })}
                            placeholder="Bearer, HMAC…"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold text-ink">Blocos de código</h2>
            <div className="mt-4">
              <Repeatable
                items={form.codeBlocks}
                onChange={(codeBlocks) => set("codeBlocks", codeBlocks)}
                create={() => ({ title: null, description: null, language: "typescript", code: "" })}
                addLabel="Adicionar bloco de código"
                emptyLabel="Nenhum bloco de código cadastrado."
                itemLabel={(block) => block.title || block.language}
                render={(block, update) => (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                      <Field label="Título">
                        <Input
                          value={block.title ?? ""}
                          onChange={(event) => update({ title: event.target.value || null })}
                        />
                      </Field>
                      <Field label="Linguagem">
                        <Input
                          value={block.language}
                          onChange={(event) => update({ language: event.target.value })}
                          placeholder="typescript"
                        />
                      </Field>
                    </div>
                    <Field label="Código">
                      <Textarea
                        value={block.code}
                        onChange={(event) => update({ code: event.target.value })}
                        rows={8}
                        className="font-mono text-[12.5px]"
                      />
                    </Field>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- mídia */}
      {tab === "midia" ? (
        <div className="space-y-5">
          <div className="panel space-y-4 p-5">
            <h2 className="text-[15px] font-semibold text-ink">Imagem de capa</h2>
            <ImageField
              value={form.coverImageUrl}
              onChange={(url) => set("coverImageUrl", url)}
              label="capa"
              id="coverImageUrl"
            />
            <Field
              label="Texto alternativo da capa"
              htmlFor="coverImageAlt"
              description="Descreva a imagem para leitores de tela."
              error={error("coverImageAlt")}
            >
              <Input
                id="coverImageAlt"
                value={form.coverImageAlt ?? ""}
                onChange={(event) => set("coverImageAlt", event.target.value || null)}
              />
            </Field>
          </div>

          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold text-ink">Screenshots, galeria e diagramas em imagem</h2>
            <div className="mt-4">
              <Repeatable
                items={form.images}
                onChange={(images) => set("images", images)}
                create={() => ({ url: "", alt: "", caption: null, kind: "SCREENSHOT" as const })}
                addLabel="Adicionar imagem"
                emptyLabel="Nenhuma imagem cadastrada."
                itemLabel={(image) => image.alt || image.url || "nova imagem"}
                render={(image, update) => (
                  <div className="space-y-3">
                    <ImageField value={image.url || null} onChange={(url) => update({ url: url ?? "" })} />
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
                      <Field label="Texto alternativo">
                        <Input value={image.alt} onChange={(event) => update({ alt: event.target.value })} />
                      </Field>
                      <Field label="Tipo">
                        <Select
                          value={image.kind}
                          onChange={(event) => update({ kind: event.target.value as typeof image.kind })}
                        >
                          <option value="SCREENSHOT">Screenshot</option>
                          <option value="GALLERY">Galeria</option>
                          <option value="DIAGRAM">Diagrama</option>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Legenda">
                      <Input
                        value={image.caption ?? ""}
                        onChange={(event) => update({ caption: event.target.value || null })}
                      />
                    </Field>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* --------------------------------------------------- resultados/links */}
      {tab === "resultados" ? (
        <div className="space-y-5">
          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold text-ink">Métricas e resultados</h2>
            <p className="mb-4 mt-1 text-[12.5px] text-ink-faint">
              Números reais do projeto. Aparecem em destaque no card e no topo do estudo de caso.
            </p>
            <Repeatable
              items={form.metrics}
              onChange={(metrics) => set("metrics", metrics)}
              create={() => ({ label: "", value: "", description: null, icon: null })}
              addLabel="Adicionar métrica"
              emptyLabel="Nenhuma métrica cadastrada."
              itemLabel={(metric) => metric.label || "nova métrica"}
              render={(metric, update) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Valor">
                    <Input
                      value={metric.value}
                      onChange={(event) => update({ value: event.target.value })}
                      placeholder="86%"
                    />
                  </Field>
                  <Field label="Rótulo">
                    <Input
                      value={metric.label}
                      onChange={(event) => update({ label: event.target.value })}
                      placeholder="redução nos custos de rede"
                    />
                  </Field>
                  <Field label="Descrição">
                    <Input
                      value={metric.description ?? ""}
                      onChange={(event) => update({ description: event.target.value || null })}
                    />
                  </Field>
                  <Field label="Ícone">
                    <Select
                      value={metric.icon ?? ""}
                      onChange={(event) => update({ icon: event.target.value || null })}
                    >
                      <option value="">Padrão</option>
                      {ICON_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
            />
          </div>

          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold text-ink">Principais funcionalidades</h2>
            <div className="mt-4">
              <Repeatable
                items={form.features}
                onChange={(features) => set("features", features)}
                create={() => ({ title: "", description: null, icon: null })}
                addLabel="Adicionar funcionalidade"
                emptyLabel="Nenhuma funcionalidade cadastrada."
                itemLabel={(feature) => feature.title || "nova funcionalidade"}
                render={(feature, update) => (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
                    <Field label="Título">
                      <Input value={feature.title} onChange={(event) => update({ title: event.target.value })} />
                    </Field>
                    <Field label="Descrição">
                      <Input
                        value={feature.description ?? ""}
                        onChange={(event) => update({ description: event.target.value || null })}
                      />
                    </Field>
                    <Field label="Ícone">
                      <Select
                        value={feature.icon ?? ""}
                        onChange={(event) => update({ icon: event.target.value || null })}
                      >
                        <option value="">Padrão</option>
                        {ICON_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                )}
              />
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="text-[15px] font-semibold text-ink">Links</h2>
            <div className="mt-4">
              <Repeatable
                items={form.links}
                onChange={(links) => set("links", links)}
                create={() => ({ type: "REPOSITORY" as const, label: "Repositório", url: "" })}
                addLabel="Adicionar link"
                emptyLabel="Nenhum link cadastrado."
                itemLabel={(link) => link.label || link.url || "novo link"}
                render={(link, update) => (
                  <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)_minmax(0,1.4fr)]">
                    <Field label="Tipo">
                      <Select
                        value={link.type}
                        onChange={(event) => update({ type: event.target.value as typeof link.type })}
                      >
                        {LINK_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Rótulo">
                      <Input value={link.label} onChange={(event) => update({ label: event.target.value })} />
                    </Field>
                    <Field label="URL">
                      <Input
                        value={link.url}
                        onChange={(event) => update({ url: event.target.value })}
                        placeholder="https://"
                      />
                    </Field>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- SEO */}
      {tab === "seo" ? (
        <div className="panel max-w-2xl space-y-4 p-5">
          <Field
            label="Meta title"
            htmlFor="metaTitle"
            error={error("metaTitle")}
            description="Se vazio, usa o título do projeto."
          >
            <Input
              id="metaTitle"
              value={form.metaTitle ?? ""}
              onChange={(event) => set("metaTitle", event.target.value || null)}
            />
          </Field>

          <Field
            label="Meta description"
            htmlFor="metaDescription"
            error={error("metaDescription")}
            description="Até ~160 caracteres. Se vazio, usa a descrição curta."
          >
            <Textarea
              id="metaDescription"
              value={form.metaDescription ?? ""}
              onChange={(event) => set("metaDescription", event.target.value || null)}
              rows={3}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink">Imagem Open Graph</p>
            <ImageField value={form.ogImageUrl} onChange={(url) => set("ogImageUrl", url)} label="imagem OG" />
          </div>

          <Checkbox
            label="Permitir indexação por buscadores"
            description="Desmarque para publicar sem aparecer no Google."
            checked={form.indexable}
            onChange={(event) => set("indexable", event.target.checked)}
          />

          {projectId && form.slug ? (
            <p className="flex items-center gap-1.5 border-t border-line pt-4 text-[12.5px] text-ink-faint">
              <ExternalLink size={13} />
              <Link href={`/projetos/${form.slug}`} target="_blank" className="text-accent">
                /projetos/{form.slug}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {!projectId ? (
        <p className="flex items-center gap-2 text-[12.5px] text-ink-faint">
          <Sparkles size={13} className="text-accent" />
          Salve como rascunho para liberar a pré-visualização da página do projeto.
        </p>
      ) : null}
    </div>
  );
}
