import { describe, expect, it } from "vitest";

import { formatDate, slugify, timeAgo, truncate } from "@/lib/utils";
import { renderMarkdown, stripMarkdown } from "@/lib/markdown";

describe("slugify", () => {
  it("normaliza acentos e espaços", () => {
    expect(slugify("Migração de Infraestrutura para AWS")).toBe("migracao-de-infraestrutura-para-aws");
  });

  it("remove caracteres especiais e hifens nas pontas", () => {
    expect(slugify("  --API @ REST!!  ")).toBe("api-rest");
  });

  it("limita o tamanho", () => {
    expect(slugify("a".repeat(120)).length).toBeLessThanOrEqual(80);
  });
});

describe("truncate", () => {
  it("mantém textos curtos", () => {
    expect(truncate("curto", 10)).toBe("curto");
  });

  it("corta textos longos com reticências", () => {
    expect(truncate("texto bem maior que o limite", 10)).toHaveLength(10);
  });
});

describe("renderMarkdown", () => {
  it("escapa HTML malicioso vindo do banco", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("converte negrito, código, listas e links", () => {
    const html = renderMarkdown("- item **forte** com `codigo`\n- [link](https://exemplo.com)");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>forte</strong>");
    expect(html).toContain("<code>codigo</code>");
    expect(html).toContain('href="https://exemplo.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("não cria links para protocolos perigosos", () => {
    const html = renderMarkdown("[x](javascript:alert(1))");
    expect(html).not.toContain("<a ");
  });

  it("transforma parágrafos e títulos", () => {
    const html = renderMarkdown("## Titulo\n\nParágrafo");
    expect(html).toContain("<h3>Titulo</h3>");
    expect(html).toContain("<p>Parágrafo</p>");
  });
});

describe("stripMarkdown", () => {
  it("remove marcação para uso em meta tags", () => {
    expect(stripMarkdown("**Resultado** com `100%` e [link](https://x.com)")).toBe(
      "Resultado com 100% e link",
    );
  });
});

describe("datas", () => {
  it("formata datas em pt-BR", () => {
    expect(formatDate(new Date("2025-03-10T12:00:00Z"))).toMatch(/2025/);
  });

  it("calcula tempo relativo", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    expect(timeAgo(new Date("2026-01-10T11:30:00Z"), now)).toBe("há 30 min");
    expect(timeAgo(new Date("2026-01-09T13:00:00Z"), now)).toBe("há 23 h");
    expect(timeAgo(new Date("2026-01-09T12:00:00Z"), now)).toBe("há 1 d");
  });
});
