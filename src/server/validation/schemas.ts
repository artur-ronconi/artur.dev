import { z } from "zod";

/**
 * Validation contract shared by the admin forms (client) and the server
 * actions (server). A single source of truth keeps both sides consistent.
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Campo de texto opcional: ausente, vazio ou só espaços viram `null`. */
const emptyToNull = (value: unknown) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const optionalText = z.preprocess(emptyToNull, z.string().nullable());

const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .nullable()
    .refine(
      (value) => value === null || /^(https?:\/\/|\/)/.test(value),
      "Informe uma URL válida (https://… ou /caminho).",
    ),
);

const optionalColor = z.preprocess(
  emptyToNull,
  z
    .string()
    .nullable()
    .refine(
      (value) => value === null || /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value),
      "Informe a cor em hexadecimal, como #8cc84b.",
    ),
);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "O slug precisa ter ao menos 2 caracteres.")
  .max(80, "O slug é muito longo.")
  .regex(SLUG_REGEX, "Use apenas letras minúsculas, números e hifens.");

export const projectStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const projectSectionTypeSchema = z.enum([
  "CONTEXT",
  "OBJECTIVES",
  "CONTRIBUTION",
  "SOLUTION",
  "ARCHITECTURE",
  "CHALLENGES",
  "DECISIONS",
  "RESULTS",
  "LEARNINGS",
  "CUSTOM",
]);

export const projectLinkTypeSchema = z.enum([
  "REPOSITORY",
  "DEMO",
  "DOCS",
  "VIDEO",
  "ARTICLE",
  "OTHER",
]);

export const projectImageKindSchema = z.enum(["SCREENSHOT", "GALLERY", "DIAGRAM"]);

export const projectBasicsSchema = z.object({
  title: z.string().trim().min(2, "Informe o título do projeto.").max(120),
  slug: slugSchema,
  subtitle: optionalText,
  summary: z
    .string()
    .trim()
    .min(10, "Escreva uma descrição curta com ao menos 10 caracteres.")
    .max(400, "A descrição curta deve ter no máximo 400 caracteres."),
  description: optionalText,
  categoryId: optionalText,
  status: projectStatusSchema,
  featured: z.boolean(),
  order: z.coerce.number().int().min(0).max(9999),
  period: optionalText,
  role: optionalText,
  client: optionalText,
  startedAt: optionalText,
  finishedAt: optionalText,
});

export const projectMediaSchema = z.object({
  coverImageUrl: optionalUrl,
  coverImageAlt: optionalText,
});

export const projectSeoSchema = z.object({
  metaTitle: optionalText,
  metaDescription: optionalText,
  ogImageUrl: optionalUrl,
  indexable: z.boolean(),
});

export const projectSectionSchema = z.object({
  id: z.string().optional(),
  type: projectSectionTypeSchema,
  title: z.string().trim().min(2, "Informe o título da seção.").max(120),
  body: z.string().trim().min(1, "O conteúdo da seção não pode ficar vazio."),
  visible: z.boolean().default(true),
});

export const projectMetricSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Informe o rótulo da métrica.").max(80),
  value: z.string().trim().min(1, "Informe o valor da métrica.").max(40),
  description: optionalText,
  icon: optionalText,
});

export const projectFeatureSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Informe a funcionalidade.").max(120),
  description: optionalText,
  icon: optionalText,
});

export const projectLinkSchema = z.object({
  id: z.string().optional(),
  type: projectLinkTypeSchema,
  label: z.string().trim().min(1, "Informe o rótulo do link.").max(60),
  url: z.string().trim().url("Informe uma URL válida."),
});

export const projectImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().min(1, "Informe a URL da imagem."),
  alt: z.string().trim().min(2, "Descreva a imagem (texto alternativo)."),
  caption: optionalText,
  kind: projectImageKindSchema,
});

export const projectDiagramSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Informe o título do diagrama.").max(120),
  description: optionalText,
  source: z.string().trim().min(5, "Informe o código Mermaid do diagrama."),
});

export const projectCodeBlockSchema = z.object({
  id: z.string().optional(),
  title: optionalText,
  description: optionalText,
  language: z.string().trim().min(1).max(24).default("typescript"),
  code: z.string().trim().min(1, "O bloco de código não pode ficar vazio."),
});

export const projectEndpointSchema = z.object({
  id: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "WS"]),
  path: z.string().trim().min(1, "Informe o caminho do endpoint.").max(160),
  description: optionalText,
  auth: optionalText,
});

export const projectTechnologySchema = z.object({
  technologyId: z.string().min(1),
  role: optionalText,
});

export const projectInputSchema = projectBasicsSchema
  .merge(projectMediaSchema)
  .merge(projectSeoSchema)
  .extend({
    technologies: z.array(projectTechnologySchema).default([]),
    sections: z.array(projectSectionSchema).default([]),
    metrics: z.array(projectMetricSchema).default([]),
    features: z.array(projectFeatureSchema).default([]),
    links: z.array(projectLinkSchema).default([]),
    images: z.array(projectImageSchema).default([]),
    diagrams: z.array(projectDiagramSchema).default([]),
    codeBlocks: z.array(projectCodeBlockSchema).default([]),
    endpoints: z.array(projectEndpointSchema).default([]),
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const technologySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da tecnologia.").max(60),
  slug: slugSchema,
  iconSlug: optionalText,
  color: optionalColor,
  description: optionalText,
  url: optionalUrl,
  categoryId: optionalText,
  featured: z.boolean(),
  order: z.coerce.number().int().min(0).max(9999),
});

export const technologyCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria.").max(60),
  slug: slugSchema,
  description: optionalText,
  icon: optionalText,
  accent: optionalText,
  order: z.coerce.number().int().min(0).max(9999),
  visible: z.boolean(),
});

export const projectCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria.").max(60),
  slug: slugSchema,
  accent: optionalText,
  order: z.coerce.number().int().min(0).max(9999),
});

export const experienceSchema = z.object({
  company: z.string().trim().min(1, "Informe a empresa.").max(120),
  role: z.string().trim().min(1, "Informe o cargo.").max(120),
  startDate: z.string().trim().min(1, "Informe a data de início.").max(40),
  endDate: optionalText,
  current: z.boolean(),
  location: optionalText,
  description: optionalText,
  companyUrl: optionalUrl,
  logoUrl: optionalUrl,
  // Linhas em branco deixadas no editor de lista são descartadas.
  highlights: z
    .array(z.string().trim().max(400, "Cada entrega pode ter até 400 caracteres."))
    .max(40)
    .default([])
    .transform((items) => items.filter(Boolean)),
  /** Ids das tecnologias cadastradas, na ordem de exibição. */
  technologyIds: z
    .array(z.string().min(1))
    .max(60)
    .default([])
    .transform((ids) => [...new Set(ids)]),
  media: z
    .array(
      z.object({
        kind: z.enum(["IMAGE", "VIDEO"]),
        url: z
          .string()
          .trim()
          .regex(/^(https?:\/\/|\/)/, "Informe uma URL válida (https://… ou /caminho)."),
        caption: optionalText,
      }),
    )
    .max(40)
    .default([]),
  order: z.coerce.number().int().min(0).max(9999),
  visible: z.boolean(),
});

export const certificationSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da certificação.").max(140),
  issuer: z.string().trim().min(1, "Informe o emissor.").max(120),
  issuedAt: optionalText,
  expiresAt: optionalText,
  credentialId: optionalText,
  credentialUrl: optionalUrl,
  iconSlug: optionalText,
  order: z.coerce.number().int().min(0).max(9999),
  visible: z.boolean(),
});

export const socialLinkSchema = z.object({
  label: z.string().trim().min(1, "Informe o rótulo.").max(60),
  url: z.string().trim().url("Informe uma URL válida."),
  iconSlug: optionalText,
  order: z.coerce.number().int().min(0).max(9999),
  visible: z.boolean(),
});

export const settingsSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo.").max(120),
  headline: z.string().trim().min(2, "Informe o título profissional.").max(160),
  heroBadge: optionalText,
  heroTitle: optionalText,
  heroHighlight: optionalText,
  heroSubtitle: optionalText,
  heroDescription: optionalText,
  shortBio: optionalText,
  about: optionalText,
  summaryItems: z.array(z.string().trim().min(1)).default([]),
  avatarUrl: optionalUrl,
  resumeUrl: optionalUrl,
  email: z.preprocess(
    emptyToNull,
    z
      .string()
      .nullable()
      .refine(
        (value) => value === null || z.string().email().safeParse(value).success,
        "E-mail inválido.",
      ),
  ),
  phone: optionalText,
  location: optionalText,
  available: z.boolean(),
  availabilityNote: optionalText,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  siteUrl: optionalUrl,
  metaTitle: optionalText,
  metaDescription: optionalText,
  ogImageUrl: optionalUrl,
  contactHeading: optionalText,
  contactText: optionalText,
  footerNote: optionalText,
});

export const homeSectionOrderSchema = z.object({
  sections: z
    .array(z.object({ key: z.string().min(1), visible: z.boolean(), order: z.number().int().min(0) }))
    .min(1),
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido."),
  subject: z.string().trim().max(160).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Escreva uma mensagem com ao menos 10 caracteres.")
    .max(4000, "A mensagem é muito longa."),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(10, "A nova senha precisa ter ao menos 10 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });
