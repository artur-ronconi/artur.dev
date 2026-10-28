import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import {
  createProject,
  deleteProject,
  duplicateProject,
  ensureUniqueSlug,
  removeDemoContent,
  reorderProjects,
  setProjectStatus,
  toggleProjectFeatured,
  updateProject,
} from "@/server/modules/project-service";
import { projectInputSchema, type ProjectInput } from "@/server/validation/schemas";

/**
 * Integração com o banco real (mesmo DATABASE_URL do desenvolvimento).
 * Todos os registros criados usam o prefixo abaixo e são removidos no final.
 */
const PREFIX = "teste-integracao";

const createdIds: string[] = [];
let technologyId: string;

// Os overrides usam o tipo de ENTRADA do schema (campos opcionais podem faltar).
function input(overrides: Record<string, unknown> = {}): ProjectInput {
  return projectInputSchema.parse({
    title: `${PREFIX} projeto`,
    slug: `${PREFIX}-projeto`,
    summary: "Resumo do projeto usado nos testes de integração do serviço.",
    status: "DRAFT",
    featured: false,
    order: 0,
    indexable: true,
    ...overrides,
  });
}

beforeAll(async () => {
  const technology = await prisma.technology.upsert({
    where: { slug: `${PREFIX}-tech` },
    create: { name: `${PREFIX} tech`, slug: `${PREFIX}-tech` },
    update: {},
  });
  technologyId = technology.id;
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.technology.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe("createProject", () => {
  it("cria o projeto com conteúdo aninhado e ordena os filhos", async () => {
    const project = await createProject(
      input({
        slug: `${PREFIX}-completo`,
        technologies: [{ technologyId, role: "Runtime" }],
        sections: [
          { type: "CONTEXT", title: "Contexto", body: "Texto", visible: true },
          { type: "RESULTS", title: "Resultados", body: "Números", visible: true },
        ],
        metrics: [{ label: "webhooks", value: "100 mil" }],
        links: [{ type: "REPOSITORY", label: "Repo", url: "https://github.com/exemplo/repo" }],
        diagrams: [{ title: "Fluxo", source: "flowchart LR\n A-->B" }],
      }),
    );
    createdIds.push(project.id);

    const stored = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: { sections: { orderBy: { order: "asc" } }, technologies: true, metrics: true, diagrams: true },
    });

    expect(stored.status).toBe("DRAFT");
    expect(stored.publishedAt).toBeNull();
    expect(stored.sections.map((section) => section.title)).toEqual(["Contexto", "Resultados"]);
    expect(stored.sections[1]?.order).toBe(1);
    expect(stored.technologies[0]?.role).toBe("Runtime");
    expect(stored.metrics).toHaveLength(1);
    expect(stored.diagrams).toHaveLength(1);
  });

  it("define publishedAt ao criar já publicado", async () => {
    const project = await createProject(input({ slug: `${PREFIX}-publicado`, status: "PUBLISHED" }));
    createdIds.push(project.id);
    expect(project.publishedAt).toBeInstanceOf(Date);
  });

  it("recusa tecnologia inexistente", async () => {
    await expect(
      createProject(
        input({ slug: `${PREFIX}-tech-invalida`, technologies: [{ technologyId: "nao-existe", role: null }] }),
      ),
    ).rejects.toThrow(/tecnologias/i);
  });
});

describe("ensureUniqueSlug", () => {
  it("gera sufixo quando o slug já existe", async () => {
    const project = await createProject(input({ slug: `${PREFIX}-unico` }));
    createdIds.push(project.id);

    expect(await ensureUniqueSlug(`${PREFIX}-unico`)).toBe(`${PREFIX}-unico-2`);
    expect(await ensureUniqueSlug(`${PREFIX}-unico`, project.id)).toBe(`${PREFIX}-unico`);
  });
});

describe("updateProject", () => {
  it("substitui o conteúdo aninhado sem duplicar registros", async () => {
    const project = await createProject(
      input({
        slug: `${PREFIX}-update`,
        sections: [{ type: "CONTEXT", title: "Antigo", body: "Texto", visible: true }],
      }),
    );
    createdIds.push(project.id);

    await updateProject(
      project.id,
      input({
        slug: `${PREFIX}-update`,
        title: "Título novo",
        sections: [
          { type: "SOLUTION", title: "Novo", body: "Outro texto", visible: true },
          { type: "RESULTS", title: "Resultados", body: "Mais texto", visible: false },
        ],
      }),
    );

    const stored = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    expect(stored.title).toBe("Título novo");
    expect(stored.sections).toHaveLength(2);
    expect(stored.sections[0]?.title).toBe("Novo");
  });

  it("preserva publishedAt ao despublicar e republicar", async () => {
    const project = await createProject(input({ slug: `${PREFIX}-status`, status: "PUBLISHED" }));
    createdIds.push(project.id);

    const unpublished = await setProjectStatus(project.id, "DRAFT");
    expect(unpublished.status).toBe("DRAFT");
    expect(unpublished.publishedAt).toBeNull();

    const republished = await setProjectStatus(project.id, "PUBLISHED");
    expect(republished.publishedAt).toBeInstanceOf(Date);
  });
});

describe("duplicateProject", () => {
  it("cria uma cópia em rascunho com os filhos", async () => {
    const project = await createProject(
      input({
        slug: `${PREFIX}-original`,
        status: "PUBLISHED",
        featured: true,
        sections: [{ type: "CONTEXT", title: "Contexto", body: "Texto", visible: true }],
        technologies: [{ technologyId, role: null }],
      }),
    );
    createdIds.push(project.id);

    const copy = await duplicateProject(project.id);
    createdIds.push(copy.id);

    const stored = await prisma.project.findUniqueOrThrow({
      where: { id: copy.id },
      include: { sections: true, technologies: true },
    });

    expect(stored.slug).toBe(`${PREFIX}-original-copia`);
    expect(stored.status).toBe("DRAFT");
    expect(stored.featured).toBe(false);
    expect(stored.sections).toHaveLength(1);
    expect(stored.technologies).toHaveLength(1);
  });
});

describe("ordenação e destaque", () => {
  it("reordena e alterna destaque", async () => {
    const first = await createProject(input({ slug: `${PREFIX}-ordem-1`, order: 5 }));
    const second = await createProject(input({ slug: `${PREFIX}-ordem-2`, order: 9 }));
    createdIds.push(first.id, second.id);

    await reorderProjects([second.id, first.id]);

    const stored = await prisma.project.findMany({
      where: { id: { in: [first.id, second.id] } },
      select: { id: true, order: true },
    });

    expect(stored.find((item) => item.id === second.id)?.order).toBe(0);
    expect(stored.find((item) => item.id === first.id)?.order).toBe(1);

    const toggled = await toggleProjectFeatured(first.id);
    expect(toggled.featured).toBe(true);
    expect((await toggleProjectFeatured(first.id)).featured).toBe(false);
  });
});

describe("exclusão e dados de demonstração", () => {
  it("exclui o projeto e seus filhos em cascata", async () => {
    const project = await createProject(
      input({
        slug: `${PREFIX}-excluir`,
        sections: [{ type: "CONTEXT", title: "Contexto", body: "Texto", visible: true }],
      }),
    );

    await deleteProject(project.id);

    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
    expect(await prisma.projectSection.count({ where: { projectId: project.id } })).toBe(0);
  });

  it("remove somente o conteúdo marcado como demonstração", async () => {
    const demo = await createProject(input({ slug: `${PREFIX}-demo` }));
    await prisma.project.update({ where: { id: demo.id }, data: { isDemo: true } });

    const real = await createProject(input({ slug: `${PREFIX}-real` }));
    createdIds.push(real.id);

    const removed = await removeDemoContent();

    expect(removed.projects).toBeGreaterThanOrEqual(1);
    expect(await prisma.project.findUnique({ where: { id: demo.id } })).toBeNull();
    expect(await prisma.project.findUnique({ where: { id: real.id } })).not.toBeNull();
  });
});
