import { describe, expect, it } from "vitest";

import {
  contactMessageSchema,
  loginSchema,
  projectInputSchema,
  settingsSchema,
  slugSchema,
  technologySchema,
} from "@/server/validation/schemas";

const baseProject = {
  title: "Projeto",
  slug: "projeto",
  summary: "Um resumo com tamanho suficiente para passar na validação.",
  status: "DRAFT" as const,
  featured: false,
  order: 0,
  indexable: true,
};

describe("projectInputSchema", () => {
  it("aceita um projeto mínimo e aplica defaults nas listas", () => {
    const parsed = projectInputSchema.parse(baseProject);
    expect(parsed.sections).toEqual([]);
    expect(parsed.technologies).toEqual([]);
    expect(parsed.subtitle).toBeNull();
  });

  it("rejeita slug inválido", () => {
    const result = projectInputSchema.safeParse({ ...baseProject, slug: "Projeto Inválido" });
    expect(result.success).toBe(false);
  });

  it("rejeita resumo curto demais", () => {
    const result = projectInputSchema.safeParse({ ...baseProject, summary: "curto" });
    expect(result.success).toBe(false);
  });

  it("exige URL válida nos links", () => {
    const result = projectInputSchema.safeParse({
      ...baseProject,
      links: [{ type: "REPOSITORY", label: "Repo", url: "nao-e-url" }],
    });
    expect(result.success).toBe(false);
  });

  it("transforma strings vazias em null", () => {
    const parsed = projectInputSchema.parse({ ...baseProject, period: "", metaTitle: "  " });
    expect(parsed.period).toBeNull();
    expect(parsed.metaTitle).toBeNull();
  });

  it("valida seções e diagramas aninhados", () => {
    const parsed = projectInputSchema.parse({
      ...baseProject,
      sections: [{ type: "CONTEXT", title: "Contexto", body: "Texto", visible: true }],
      diagrams: [{ title: "Fluxo", source: "flowchart LR\n A-->B" }],
    });
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.diagrams[0]?.description).toBeNull();
  });
});

describe("slugSchema", () => {
  it.each(["aws", "migracao-aws", "projeto-2"])("aceita %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(["com espaco", "-inicio", "fim-", "acentuação", "a"])("rejeita %s", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });

  it("normaliza maiúsculas", () => {
    expect(slugSchema.parse("AWS-Lambda")).toBe("aws-lambda");
  });
});

describe("loginSchema", () => {
  it("normaliza o e-mail", () => {
    const parsed = loginSchema.parse({ email: "  ADMIN@Example.COM ", password: "x" });
    expect(parsed.email).toBe("admin@example.com");
  });

  it("rejeita e-mail inválido", () => {
    expect(loginSchema.safeParse({ email: "sem-arroba", password: "x" }).success).toBe(false);
  });
});

describe("contactMessageSchema", () => {
  it("exige mensagem com conteúdo", () => {
    const result = contactMessageSchema.safeParse({
      name: "Fulano",
      email: "fulano@exemplo.com",
      message: "curta",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita honeypot preenchido", () => {
    const result = contactMessageSchema.safeParse({
      name: "Bot",
      email: "bot@exemplo.com",
      message: "mensagem suficientemente longa",
      website: "http://spam",
    });
    expect(result.success).toBe(false);
  });
});

describe("technologySchema e settingsSchema", () => {
  it("valida tecnologia", () => {
    const parsed = technologySchema.parse({
      name: "Node.js",
      slug: "nodejs",
      featured: true,
      order: 1,
    });
    expect(parsed.iconSlug).toBeNull();
  });

  it("rejeita e-mail inválido nas configurações", () => {
    const result = settingsSchema.safeParse({
      fullName: "Artur",
      headline: "Engenheiro",
      available: true,
      email: "invalido",
    });
    expect(result.success).toBe(false);
  });

  it("aceita e-mail vazio nas configurações", () => {
    const parsed = settingsSchema.parse({
      fullName: "Artur",
      headline: "Engenheiro",
      available: true,
      email: "",
    });
    expect(parsed.email).toBeNull();
  });
});
