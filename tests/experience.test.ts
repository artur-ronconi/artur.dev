import { describe, expect, it } from "vitest";

import { mediaKindFromMime, mediaKindFromUrl, youtubeId } from "@/lib/media";
import { experienceSchema, technologySchema } from "@/server/validation/schemas";

const experience = {
  company: "UTMify",
  role: "DevOps Pleno",
  startDate: "Mar/2024",
  current: false,
  order: 0,
  visible: true,
};

describe("experienceSchema", () => {
  it("descarta tópicos em branco e mantém a ordem das entregas", () => {
    const parsed = experienceSchema.parse({
      ...experience,
      highlights: ["  Redução de 86% nos custos de rede ", "", "   ", "Deploy sem downtime"],
    });

    expect(parsed.highlights).toEqual(["Redução de 86% nos custos de rede", "Deploy sem downtime"]);
  });

  it("recebe tecnologias como ids, sem repetição", () => {
    const parsed = experienceSchema.parse({ ...experience, technologyIds: ["a", "b", "a"] });

    expect(parsed.technologyIds).toEqual(["a", "b"]);
    expect(parsed).not.toHaveProperty("technologies");
  });

  it("aceita ícone e mídias enviados (caminho local) ou por link", () => {
    const parsed = experienceSchema.parse({
      ...experience,
      logoUrl: "/uploads/2026-10-12/logo.png",
      media: [
        { kind: "IMAGE", url: "/uploads/2026-10-12/foto.png", caption: " Painel " },
        { kind: "VIDEO", url: "https://youtu.be/dQw4w9WgXcQ", caption: "" },
      ],
    });

    expect(parsed.logoUrl).toBe("/uploads/2026-10-12/logo.png");
    expect(parsed.media).toEqual([
      { kind: "IMAGE", url: "/uploads/2026-10-12/foto.png", caption: "Painel" },
      { kind: "VIDEO", url: "https://youtu.be/dQw4w9WgXcQ", caption: null },
    ]);
  });

  it("usa listas vazias quando nada é informado", () => {
    const parsed = experienceSchema.parse(experience);

    expect(parsed).toMatchObject({ highlights: [], technologyIds: [], media: [], logoUrl: null });
  });

  it("rejeita mídia com URL ou tipo inválidos", () => {
    const withMedia = (media: unknown) => experienceSchema.safeParse({ ...experience, media: [media] }).success;

    expect(withMedia({ kind: "IMAGE", url: "javascript:alert(1)" })).toBe(false);
    expect(withMedia({ kind: "AUDIO", url: "/uploads/som.mp3" })).toBe(false);
  });
});

describe("technologySchema", () => {
  const technology = { name: "Node.js", slug: "nodejs", featured: false, order: 0 };

  it("basta nome e cor para cadastrar", () => {
    const parsed = technologySchema.parse({ ...technology, color: "#8cc84b" });

    expect(parsed).toMatchObject({ name: "Node.js", color: "#8cc84b", iconSlug: null, categoryId: null });
  });

  it("aceita cor vazia e rejeita o que não é hexadecimal", () => {
    expect(technologySchema.parse({ ...technology, color: "" }).color).toBeNull();
    expect(technologySchema.safeParse({ ...technology, color: "verde" }).success).toBe(false);
    expect(technologySchema.safeParse({ ...technology, color: "red; background:url(x)" }).success).toBe(false);
  });
});

describe("mídia", () => {
  it("reconhece links do YouTube em seus formatos", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?list=abc&v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?t=10",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(youtubeId(url), url).toBe("dQw4w9WgXcQ");
    }
    expect(youtubeId("https://exemplo.com/video.mp4")).toBeNull();
  });

  it("deduz o tipo pelo link ou pelo arquivo enviado", () => {
    expect(mediaKindFromUrl("https://cdn.exemplo.com/demo.MP4?v=2")).toBe("VIDEO");
    expect(mediaKindFromUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("VIDEO");
    expect(mediaKindFromUrl("/uploads/2026-10-12/foto.png")).toBe("IMAGE");
    expect(mediaKindFromMime("video/webm")).toBe("VIDEO");
    expect(mediaKindFromMime("image/png")).toBe("IMAGE");
  });
});
