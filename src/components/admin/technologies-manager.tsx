"use client";

import { CrudManager, type FieldDef } from "@/components/admin/crud-manager";
import { ICON_NAMES } from "@/components/icons/dynamic-icon";
import { Badge } from "@/components/ui/badge";
import {
  deleteProjectCategoryAction,
  deleteTechnologyAction,
  deleteTechnologyCategoryAction,
  saveProjectCategoryAction,
  saveTechnologyAction,
  saveTechnologyCategoryAction,
} from "@/server/actions/taxonomy";

type Category = { id: string; name: string };

export function TechnologiesManager({
  technologies,
  categories,
  projectCategories,
}: {
  technologies: Array<Record<string, unknown> & { id: string }>;
  categories: Array<Record<string, unknown> & { id: string }>;
  projectCategories: Array<Record<string, unknown> & { id: string }>;
}) {
  const categoryOptions = [
    { value: "", label: "Sem categoria" },
    ...categories.map((category) => ({
      value: category.id,
      label: (category as unknown as Category).name,
    })),
  ];

  const technologyFields: FieldDef[] = [
    { name: "name", label: "Nome", type: "text", required: true, placeholder: "Node.js" },
    {
      name: "color",
      label: "Cor",
      type: "color",
      description: "Usada no ícone e na etiqueta da tecnologia.",
    },
    {
      name: "slug",
      label: "Slug",
      type: "slug",
      required: true,
      slugFrom: "name",
      placeholder: "nodejs",
      description: "Preenchido sozinho a partir do nome.",
    },
    {
      name: "iconSlug",
      label: "Ícone (slug simple-icons)",
      type: "text",
      description: "Ex.: nodedotjs, typescript, docker, terraform. Marcas AWS usam aws, aws-lambda, amazon-s3…",
      placeholder: "nodedotjs",
    },
    { name: "categoryId", label: "Categoria", type: "select", options: categoryOptions },
    { name: "description", label: "Descrição curta", type: "text", placeholder: "Runtime principal em produção" },
    { name: "url", label: "Site oficial", type: "url", placeholder: "https://nodejs.org" },
    { name: "order", label: "Ordem", type: "number" },
    { name: "featured", label: "Destacar", type: "checkbox" },
  ];

  const technologyCategoryFields: FieldDef[] = [
    { name: "name", label: "Nome", type: "text", required: true, placeholder: "Backend" },
    { name: "slug", label: "Slug", type: "slug", required: true, slugFrom: "name" },
    {
      name: "icon",
      label: "Ícone",
      type: "select",
      options: [{ value: "", label: "Padrão" }, ...ICON_NAMES.map((name) => ({ value: name, label: name }))],
    },
    { name: "accent", label: "Cor de destaque", type: "text", placeholder: "#8cc84b" },
    { name: "description", label: "Descrição", type: "text", full: true },
    { name: "order", label: "Ordem", type: "number" },
    { name: "visible", label: "Visível no site", type: "checkbox" },
  ];

  const projectCategoryFields: FieldDef[] = [
    { name: "name", label: "Nome", type: "text", required: true, placeholder: "Infraestrutura" },
    { name: "slug", label: "Slug", type: "slug", required: true, slugFrom: "name" },
    { name: "accent", label: "Cor de destaque", type: "text", placeholder: "#fbbf24" },
    { name: "order", label: "Ordem", type: "number" },
  ];

  return (
    <div className="space-y-5">
      <CrudManager
        title="Tecnologias"
        description="Para cadastrar basta nome e cor. Depois é só selecioná-las nos projetos e nas experiências; as que têm categoria também aparecem na stack da home."
        addLabel="Nova tecnologia"
        items={technologies}
        fields={technologyFields}
        emptyValue={{
          name: "",
          slug: "",
          iconSlug: "",
          categoryId: "",
          description: "",
          color: "",
          url: "",
          order: 0,
          featured: false,
        }}
        onSave={(csrf, payload) => saveTechnologyAction(csrf, payload)}
        onDelete={deleteTechnologyAction}
        renderItem={(item) => (
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-full border border-line bg-base-500"
              style={item.color ? { backgroundColor: String(item.color) } : undefined}
            />
            <span className="text-[13.5px] text-ink">{String(item.name)}</span>
            <span className="font-mono text-[11.5px] text-ink-faint">{String(item.slug)}</span>
            {item.categoryName ? <Badge mono>{String(item.categoryName)}</Badge> : null}
            {item.projectCount ? (
              <span className="text-[11.5px] text-ink-faint">{String(item.projectCount)} projeto(s)</span>
            ) : null}
            {item.experienceCount ? (
              <span className="text-[11.5px] text-ink-faint">{String(item.experienceCount)} experiência(s)</span>
            ) : null}
          </div>
        )}
      />

      <CrudManager
        title="Categorias de tecnologia"
        description="Agrupam as tecnologias na seção de stack."
        addLabel="Nova categoria"
        items={categories}
        fields={technologyCategoryFields}
        emptyValue={{ name: "", slug: "", icon: "", accent: "", description: "", order: 0, visible: true }}
        onSave={(csrf, payload) => saveTechnologyCategoryAction(csrf, payload)}
        onDelete={deleteTechnologyCategoryAction}
        renderItem={(item) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] text-ink">{String(item.name)}</span>
            {item.visible ? null : <Badge mono>oculta</Badge>}
            <span className="text-[11.5px] text-ink-faint">{String(item.technologyCount ?? 0)} tecnologias</span>
          </div>
        )}
      />

      <CrudManager
        title="Categorias de projeto"
        description="Usadas para filtrar a listagem de projetos."
        addLabel="Nova categoria"
        items={projectCategories}
        fields={projectCategoryFields}
        emptyValue={{ name: "", slug: "", accent: "", order: 0 }}
        onSave={(csrf, payload) => saveProjectCategoryAction(csrf, payload)}
        onDelete={deleteProjectCategoryAction}
        renderItem={(item) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] text-ink">{String(item.name)}</span>
            <span className="text-[11.5px] text-ink-faint">{String(item.projectCount ?? 0)} projeto(s)</span>
          </div>
        )}
      />
    </div>
  );
}
