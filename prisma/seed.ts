import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { slugify } from "../src/lib/utils";

/**
 * Seed do portfólio.
 *
 *  - Conteúdo profissional (perfil, experiências, stack) vem do currículo do
 *    Artur e é marcado como conteúdo real (isDemo = false).
 *  - Projetos marcados com isDemo = true são conteúdo de DEMONSTRAÇÃO, criados
 *    apenas para avaliar o layout. Remova-os com `npm run demo:clear` ou pelo
 *    botão "Remover dados de demonstração" no painel administrativo.
 */

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "[seed] ADMIN_EMAIL/ADMIN_PASSWORD não definidos — nenhum administrador criado. Use `npm run admin:create`.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      name: process.env.ADMIN_NAME ?? "Administrador",
      passwordHash,
    },
    update: {},
  });

  console.log(`[seed] administrador garantido: ${email}`);
}

const TECH_CATEGORIES = [
  {
    slug: "backend",
    name: "Backend",
    icon: "server",
    accent: "#8cc84b",
    order: 0,
    description:
      "APIs REST e GraphQL, microsserviços e arquitetura orientada a eventos.",
    technologies: [
      {
        name: "Node.js",
        slug: "nodejs",
        iconSlug: "nodedotjs",
        description: "Runtime principal em produção",
        featured: true,
      },
      {
        name: "TypeScript",
        slug: "typescript",
        iconSlug: "typescript",
        description: "Tipagem em todo o backend",
        featured: true,
      },
      {
        name: "NestJS",
        slug: "nestjs",
        iconSlug: "nestjs",
        description: "Estrutura modular de APIs",
        featured: true,
      },
      {
        name: "Express",
        slug: "express",
        iconSlug: "express",
        description: "APIs e serviços HTTP",
      },
      {
        name: "GraphQL",
        slug: "graphql",
        iconSlug: "graphql",
        description: "Consultas tipadas",
      },
      {
        name: "APIs REST",
        slug: "apis-rest",
        iconSlug: "rest-api",
        description: "Integrações e webservices",
      },
    ],
  },
  {
    slug: "cloud-devops",
    name: "Cloud & DevOps",
    icon: "cloud",
    accent: "#fbbf24",
    order: 1,
    description: "Linux · CI/CD · IaC · Serverless",
    technologies: [
      {
        name: "AWS",
        slug: "aws",
        iconSlug: "aws",
        description: "EC2, Lambda, S3, VPC, IAM, ALB",
        featured: true,
      },
      {
        name: "Docker",
        slug: "docker",
        iconSlug: "docker",
        description: "Containers e ambientes locais",
        featured: true,
      },
      {
        name: "Kubernetes",
        slug: "kubernetes",
        iconSlug: "kubernetes",
        description: "Orquestração de workloads",
      },
      {
        name: "Terraform",
        slug: "terraform",
        iconSlug: "terraform",
        description: "Infraestrutura como código",
        featured: true,
      },
      {
        name: "GitHub Actions",
        slug: "github-actions",
        iconSlug: "githubactions",
        description: "Pipelines de CI/CD",
        featured: true,
      },
      {
        name: "Datadog",
        slug: "datadog",
        iconSlug: "datadog",
        description: "Logs, métricas e traces",
      },
      {
        name: "Linux",
        slug: "linux",
        iconSlug: "linux",
        description: "Operação de servidores",
      },
    ],
  },
  {
    slug: "frontend",
    name: "Frontend",
    icon: "layers",
    accent: "#8b7bf7",
    order: 2,
    description: "Interfaces para produtos e painéis internos.",
    technologies: [
      {
        name: "React",
        slug: "react",
        iconSlug: "react",
        description: "Componentes de interface",
      },
      {
        name: "Next.js",
        slug: "nextjs",
        iconSlug: "nextdotjs",
        description: "Aplicações full stack",
      },
      {
        name: "Svelte",
        slug: "svelte",
        iconSlug: "svelte",
        description: "Interfaces leves",
      },
      {
        name: "HTML",
        slug: "html",
        iconSlug: "html5",
        description: "Marcação semântica",
      },
      {
        name: "CSS",
        slug: "css",
        iconSlug: "css",
        description: "Layouts responsivos",
      },
    ],
  },
  {
    slug: "dados-mensageria",
    name: "Dados & Mensageria",
    icon: "database",
    accent: "#34d399",
    order: 3,
    description: "Modelagem, performance e processamento assíncrono.",
    technologies: [
      {
        name: "PostgreSQL",
        slug: "postgresql",
        iconSlug: "postgresql",
        description: "Dados relacionais",
        featured: true,
      },
      {
        name: "MongoDB",
        slug: "mongodb",
        iconSlug: "mongodb",
        description: "Modelagem e performance",
      },
      {
        name: "Redis",
        slug: "redis",
        iconSlug: "redis",
        description: "Cache e filas",
      },
      {
        name: "DynamoDB",
        slug: "dynamodb",
        iconSlug: "amazon-dynamodb",
        description: "NoSQL gerenciado na AWS",
      },
      {
        name: "ClickHouse",
        slug: "clickhouse",
        iconSlug: "clickhouse",
        description: "Análise de grandes volumes",
      },
      {
        name: "Filas e eventos",
        slug: "filas-e-eventos",
        iconSlug: "event-driven",
        description: "Processamento assíncrono",
      },
    ],
  },
] as const;

const EXPERIENCES = [
  {
    company: "Trino Pagamentos",
    role: "Desenvolvedor Backend Sênior",
    startDate: "Ago/2026",
    endDate: "Out/2026",
    current: false,
    order: 0,
    description:
      "APIs para fintech de crédito consignado, antecipação salarial e PIX.",
    highlights: [
      "Integração com averbadoras de consignado e parceiros bancários",
      "Suporte a múltiplas matrículas na consulta de margem e na antecipação",
      "Notificações em tempo real via WebSocket no fluxo de antecipação",
      "Desenvolvimento do novo produto Saque PIX (limite e validação de chave)",
      "Proteção contra força bruta no login com bloqueio de conta",
    ],
    technologies: [
      "Node.js",
      "TypeScript",
      "NestJS",
      "Prisma",
      "PostgreSQL",
      "Redis",
      "WebSocket",
      "AWS",
    ],
  },
  {
    company: "Motorista PX",
    role: "Platform Engineer",
    startDate: "Set/2025",
    endDate: "Ago/2026",
    current: false,
    order: 1,
    description:
      "Plataforma interna, automação de infraestrutura e governança em múltiplas contas AWS e GCP.",
    highlights: [
      "Investigação de falhas de infraestrutura com DataDog e CloudWatch, prevenindo prejuízos acima de USD 2.000",
      "Redução de custos em mais de 14 contas AWS e GCP com revisão arquitetural e otimização de recursos",
      "Arquitetura e criação de ambientes AWS do zero com Terraform e GitOps",
      "Pipelines no GitHub Actions para automação de processos críticos e deploy seguro",
      "APIs em Node.js para gerenciar permissões em bancos, EC2 e Kubernetes via Teleport",
      "Plataforma interna para inventário contínuo e relatórios automatizados de recursos AWS",
      "Políticas de backup, compliance e governança automatizadas em múltiplas contas AWS",
    ],
    technologies: [
      "AWS",
      "GitHub Actions",
      "Terraform",
      "ECS",
      "Kubernetes",
      "DataDog",
      "PHP",
      "Node.js",
    ],
  },
  {
    company: "UTMify",
    role: "DevOps Pleno",
    startDate: "Mar/2024",
    endDate: "Ago/2025",
    current: false,
    order: 2,
    description:
      "Migração para AWS, pipelines de entrega contínua e processamento resiliente de webhooks em alta volumetria.",
    highlights: [
      "Redução de 86% nos custos de rede com reestruturação de VPC",
      "Migração de aplicações para AWS com foco em estabilidade e escalabilidade",
      "Pipelines CI/CD com deploy sem downtime",
      "Filas resilientes para processamento de webhooks com alta disponibilidade",
      "Mitigação de incidentes e ataques em ambiente de alta volumetria",
      "Apoio à transição arquitetural para microsserviços",
    ],
    technologies: [
      "Node.js",
      "TypeScript",
      "Express",
      "AWS",
      "MongoDB",
      "Svelte",
    ],
  },
  {
    company: "Workmize",
    role: "Desenvolvedor Back End Sênior Node.js",
    startDate: "Dez/2021",
    endDate: "Mai/2024",
    current: false,
    order: 3,
    description:
      "Evolução de sistema crítico, APIs e reestruturação de ambientes AWS.",
    highlights: [
      "Migração e reestruturação de ambientes AWS",
      "Redução de mais de 90% nos custos operacionais",
      "Desenvolvimento de APIs com Node.js, NestJS e GraphQL",
      "Evolução de sistema crítico com mais de 1.300 testes automatizados, aplicando TDD, Clean Code e SOLID",
    ],
    technologies: [
      "Node.js",
      "NestJS",
      "TypeScript",
      "GraphQL",
      "MongoDB",
      "Redis",
      "AWS",
    ],
  },
] as const;

async function seedTaxonomies() {
  for (const category of TECH_CATEGORIES) {
    const created = await prisma.technologyCategory.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        accent: category.accent,
        order: category.order,
        description: category.description,
      },
      update: {
        name: category.name,
        icon: category.icon,
        accent: category.accent,
        order: category.order,
      },
    });

    for (const [index, technology] of category.technologies.entries()) {
      await prisma.technology.upsert({
        where: { slug: technology.slug },
        create: {
          name: technology.name,
          slug: technology.slug,
          iconSlug: technology.iconSlug,
          description: technology.description,
          featured:
            "featured" in technology ? Boolean(technology.featured) : false,
          order: index,
          categoryId: created.id,
        },
        update: {
          categoryId: created.id,
          iconSlug: technology.iconSlug,
          order: index,
        },
      });
    }
  }

  const projectCategories = [
    {
      slug: "infraestrutura",
      name: "Infraestrutura",
      accent: "#fbbf24",
      order: 0,
    },
    { slug: "backend", name: "Backend", accent: "#8cc84b", order: 1 },
    { slug: "plataforma", name: "Plataforma", accent: "#8b7bf7", order: 2 },
    { slug: "full-stack", name: "Full Stack", accent: "#34d399", order: 3 },
  ];

  for (const category of projectCategories) {
    await prisma.projectCategory.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name,
        accent: category.accent,
        order: category.order,
      },
    });
  }
}

async function seedSettings() {
  await prisma.portfolioSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      fullName: "Artur Hamann Ronconi",
      headline: "Engenheiro de Software Sênior · Backend · Cloud · DevOps",
      heroBadge: "Software Engineer",
      heroTitle: "Olá, eu sou",
      heroHighlight: "Artur Hamann Ronconi",
      heroSubtitle: "Backend · AWS · Arquitetura de sistemas · DevOps",
      avatarUrl: "/images/foto.jpeg",
      heroDescription:
        "Engenheiro de Software Sênior com mais de 6 anos de experiência construindo soluções em Node.js e TypeScript, com atuação em sistemas críticos de produção, microsserviços e arquiteturas orientadas a eventos — além de AWS, Docker, Kubernetes, Terraform e observabilidade.",
      shortBio:
        "Backend, cloud e plataforma: Node.js, TypeScript, AWS, Terraform e entrega contínua.",
      about:
        "Engenheiro de Software Sênior com mais de 6 anos de experiência no desenvolvimento de soluções utilizando **Node.js** e **TypeScript**, com atuação em sistemas críticos de produção, microsserviços e arquiteturas orientadas a eventos.\n\nExperiência sólida em **AWS**, **Docker**, **Kubernetes** e **Terraform**, além de observabilidade com Datadog e CloudWatch, análise de incidentes e identificação de causas-raiz, com foco em confiabilidade, desempenho e escalabilidade.\n\nAtuação em liderança técnica e arquitetura de soluções, contribuindo para decisões de design, definição de padrões de engenharia e evolução de arquiteturas escaláveis, em colaboração com equipes de desenvolvimento, QA e infraestrutura.",
      summaryItems: [
        "Mais de 6 anos desenvolvendo software com Node.js e TypeScript",
        "Sistemas críticos em produção, microsserviços e arquitetura orientada a eventos",
        "AWS, Docker, Kubernetes e Terraform com boas práticas de IaC",
        "Observabilidade com Datadog e CloudWatch, análise de incidentes e causas-raiz",
        "Pipelines de CI/CD com GitHub Actions e deploy seguro",
        "Liderança técnica, mentoria e decisões de arquitetura",
      ],
      email: "arturhronconi@gmail.com",
      phone: "(49) 99941-7835",
      linkedinUrl: "https://www.linkedin.com/in/arturhr",
      available: true,
      availabilityNote: "Aberto a novas oportunidades",
      contactHeading: "Vamos conversar",
      contactText:
        "Aberto a oportunidades em backend, cloud e plataforma. Envie uma mensagem e retorno em breve.",
      footerNote: "Código, infraestrutura e boas ideias.",
      metaTitle: "Artur Hamann Ronconi · Engenheiro de Software",
      metaDescription:
        "Portfólio técnico: backend com Node.js e TypeScript, AWS, Terraform, CI/CD e arquitetura de sistemas distribuídos.",
    },
  });
}

async function seedExperiences() {
  for (const experience of EXPERIENCES) {
    const existing = await prisma.professionalExperience.findFirst({
      where: { company: experience.company, role: experience.role },
    });
    if (existing) continue;

    // As tecnologias são vínculos com o cadastro; as que ainda não existem são
    // criadas sem categoria (não aparecem na stack da home até serem categorizadas).
    const technologyIds: string[] = [];
    for (const name of experience.technologies) {
      const technology =
        (await prisma.technology.findFirst({
          where: { OR: [{ name: { equals: name } }, { slug: slugify(name) }] },
        })) ?? (await prisma.technology.create({ data: { name, slug: slugify(name) } }));
      if (!technologyIds.includes(technology.id)) technologyIds.push(technology.id);
    }

    await prisma.professionalExperience.create({
      data: {
        company: experience.company,
        role: experience.role,
        startDate: experience.startDate,
        endDate: experience.endDate,
        current: experience.current,
        description: experience.description,
        highlights: [...experience.highlights],
        technologies: {
          create: technologyIds.map((technologyId, order) => ({ technologyId, order })),
        },
        order: experience.order,
      },
    });
  }
}

async function seedSocialLinks() {
  const links = [
    {
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/arturhr",
      iconSlug: "linkedin",
      order: 0,
    },
  ];

  for (const link of links) {
    const existing = await prisma.socialLink.findFirst({
      where: { url: link.url },
    });
    if (!existing) await prisma.socialLink.create({ data: link });
  }
}

async function technologyIds(slugs: string[]) {
  const technologies = await prisma.technology.findMany({
    where: { slug: { in: slugs } },
  });
  const bySlug = new Map(
    technologies.map((technology) => [technology.slug, technology.id]),
  );
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((id): id is string => Boolean(id));
}

/** Evita recriar um projeto já cadastrado (o seed é idempotente por slug). */
async function projectExists(slug: string) {
  return Boolean(
    await prisma.project.findUnique({ where: { slug }, select: { id: true } }),
  );
}

async function seedProjects() {
  const categories = await prisma.projectCategory.findMany();
  const categoryId = (slug: string) =>
    categories.find((category) => category.slug === slug)?.id ?? null;

  // ---------------------------------------------------------------- UTMify
  const utmifyTech = await technologyIds([
    "nodejs",
    "typescript",
    "express",
    "aws",
    "mongodb",
    "filas-e-eventos",
    "svelte",
  ]);

  if (!(await projectExists("migracao-aws-utmify")))
    await prisma.project.create({
      data: {
        title: "Migração de infraestrutura para AWS na UTMify",
        slug: "migracao-aws-utmify",
        subtitle: "Estabilidade, custo e escala para processamento de webhooks",
        summary:
          "Participei da migração da infraestrutura da UTMify para a AWS, contribuindo para suportar aproximadamente 100 mil webhooks mensais com filas resilientes, deploy sem downtime e redução de custos de rede.",
        status: "PUBLISHED",
        featured: true,
        order: 0,
        period: "Mar/2024 — Ago/2025",
        role: "DevOps Pleno",
        client: "UTMify",
        categoryId: categoryId("infraestrutura"),
        coverImageUrl: "/images/covers/aws-migration.svg",
        coverImageAlt:
          "Ilustração abstrata da arquitetura de processamento de webhooks na AWS",
        publishedAt: new Date(),
        metaTitle: "Migração para AWS na UTMify · Estudo de caso",
        metaDescription:
          "Como a migração para AWS sustentou cerca de 100 mil webhooks mensais, com filas resilientes, CI/CD sem downtime e 86% de redução nos custos de rede.",
        technologies: {
          create: utmifyTech.map((technologyId, index) => ({
            technologyId,
            order: index,
            role: [
              "Serviços e workers de processamento",
              "Tipagem de ponta a ponta no backend",
              "APIs HTTP de ingestão",
              "Infraestrutura, rede e serviços gerenciados",
              "Persistência dos eventos",
              "Processamento assíncrono e retentativas",
              "Painéis internos",
            ][index],
          })),
        },
        metrics: {
          create: [
            {
              label: "webhooks processados por mês",
              value: "~100 mil",
              icon: "zap",
              order: 0,
            },
            {
              label: "redução nos custos de rede",
              value: "86%",
              description: "Reestruturação da VPC",
              icon: "trending-down",
              order: 1,
            },
            {
              label: "deploys sem downtime",
              value: "CI/CD",
              description: "Pipelines de entrega contínua",
              icon: "rocket",
              order: 2,
            },
          ],
        },
        sections: {
          create: [
            {
              type: "CONTEXT",
              title: "Contexto e problema",
              order: 0,
              body: "A operação dependia de um volume alto e contínuo de webhooks recebidos de integrações externas. Em um ambiente de alta volumetria, picos de tráfego, indisponibilidades momentâneas de terceiros e falhas pontuais de rede se traduziam diretamente em perda de eventos e em custo de infraestrutura mal distribuído.\n\nO desafio era migrar as aplicações para a AWS mantendo a operação de pé, ganhando estabilidade e escalabilidade, sem aumentar o custo total do ambiente.",
            },
            {
              type: "CONTRIBUTION",
              title: "Minha contribuição",
              order: 1,
              body: "Atuei como DevOps na migração das aplicações e na reestruturação do ambiente:\n\n- Migração das aplicações para a AWS com foco em estabilidade e escalabilidade\n- Reestruturação da VPC, com redução de **86% nos custos de rede**\n- Pipelines de CI/CD com deploy sem downtime\n- Filas resilientes para processamento de webhooks com alta disponibilidade\n- Mitigação de incidentes e ataques em ambiente de alta volumetria\n- Apoio à transição arquitetural para microsserviços",
            },
            {
              type: "SOLUTION",
              title: "Solução implementada",
              order: 2,
              body: "A ingestão de webhooks foi separada do processamento: a API de entrada responde rapidamente e publica o evento em fila, enquanto workers consomem a fila em ritmo controlado, com retentativas e isolamento de falhas.\n\nEssa separação permite absorver picos sem derrubar a ingestão e torna o reprocessamento previsível quando uma dependência externa falha.",
            },
            {
              type: "CHALLENGES",
              title: "Desafios técnicos",
              order: 3,
              body: "- **Alta volumetria com terceiros instáveis:** retentativas com backoff e isolamento por fila evitam que uma integração lenta contamine as demais.\n- **Custo de rede:** o desenho original concentrava tráfego entre zonas e serviços; a reestruturação da VPC reduziu esse custo em 86%.\n- **Migração sem parar a operação:** a entrega foi feita por etapas, com pipelines de deploy sem downtime.\n- **Incidentes e ataques:** monitoramento e mitigação em ambiente exposto a tráfego hostil.",
            },
            {
              type: "RESULTS",
              title: "Resultados",
              order: 4,
              body: "- Infraestrutura preparada para sustentar aproximadamente **100 mil webhooks mensais**\n- **86% de redução** nos custos de rede após a reestruturação da VPC\n- Deploys sem downtime por meio de pipelines de CI/CD\n- Base pronta para a transição arquitetural rumo a microsserviços",
            },
          ],
        },
        diagrams: {
          create: [
            {
              title: "Fluxo de ingestão e processamento de webhooks",
              description:
                "Ingestão desacoplada do processamento, com fila, workers e fila de erros.",
              order: 0,
              source:
                "flowchart LR\n  P[Integrações externas] -->|POST /webhooks| API[API de ingestão]\n  API -->|enfileira| Q[(Fila)]\n  Q --> W1[Worker]\n  Q --> W2[Worker]\n  W1 --> DB[(Banco de dados)]\n  W2 --> DB\n  W1 -. falhas .-> DLQ[(Fila de erros)]\n  DLQ --> R[Reprocessamento]\n  DB --> UI[Painel]",
            },
          ],
        },
        features: {
          create: [
            {
              title: "Ingestão desacoplada",
              description:
                "Resposta rápida ao produtor e processamento assíncrono.",
              icon: "zap",
              order: 0,
            },
            {
              title: "Retentativas e fila de erros",
              description: "Eventos com falha são isolados e reprocessados.",
              icon: "workflow",
              order: 1,
            },
            {
              title: "Deploy sem downtime",
              description: "Pipelines de CI/CD com entrega contínua.",
              icon: "rocket",
              order: 2,
            },
            {
              title: "Rede otimizada",
              description: "VPC reestruturada para reduzir custo de tráfego.",
              icon: "network",
              order: 3,
            },
          ],
        },
        links: { create: [] },
      },
    });

  // ------------------------------------------------------------ Motorista PX
  const platformTech = await technologyIds([
    "aws",
    "terraform",
    "github-actions",
    "nodejs",
    "kubernetes",
    "datadog",
  ]);

  if (!(await projectExists("plataforma-inventario-governanca-aws")))
    await prisma.project.create({
      data: {
        title: "Plataforma interna de inventário e governança AWS",
        slug: "plataforma-inventario-governanca-aws",
        subtitle:
          "Automação de compliance, backup e custos em múltiplas contas",
        summary:
          "Plataforma interna para inventário contínuo de recursos AWS, relatórios automatizados e políticas de backup, compliance e governança aplicadas em múltiplas contas — apoiada por Terraform, GitOps e pipelines no GitHub Actions.",
        status: "PUBLISHED",
        featured: true,
        order: 1,
        period: "Set/2025 — Ago/2026",
        role: "Platform Engineer",
        client: "Motorista PX",
        categoryId: categoryId("plataforma"),
        coverImageUrl: "/images/covers/platform-engineering.svg",
        coverImageAlt:
          "Ilustração abstrata de pipeline e governança em múltiplas contas AWS",
        publishedAt: new Date(),
        technologies: {
          create: platformTech.map((technologyId, index) => ({
            technologyId,
            order: index,
            role: [
              "Contas, recursos e serviços inventariados",
              "Provisionamento declarativo dos ambientes",
              "Automação dos pipelines e das rotinas",
              "APIs internas de permissões e relatórios",
              "Workloads orquestrados",
              "Observabilidade e investigação de incidentes",
            ][index],
          })),
        },
        metrics: {
          create: [
            {
              label: "contas AWS e GCP com custos revisados",
              value: "14+",
              icon: "trending-down",
              order: 0,
            },
            {
              label: "prejuízo evitado em falha de infraestrutura",
              value: "USD 2.000+",
              description: "Investigação com DataDog e CloudWatch",
              icon: "shield",
              order: 1,
            },
            {
              label: "ambientes criados do zero",
              value: "Terraform + GitOps",
              icon: "iac",
              order: 2,
            },
          ],
        },
        sections: {
          create: [
            {
              type: "CONTEXT",
              title: "Contexto e problema",
              order: 0,
              body: "Com múltiplas contas AWS e GCP em uso, o time perdia visibilidade do que existia em cada ambiente: recursos ociosos, políticas de backup inconsistentes e permissões concedidas de forma manual.\n\nSem inventário contínuo, qualquer revisão de custo ou de compliance virava um trabalho manual e repetido.",
            },
            {
              type: "CONTRIBUTION",
              title: "Minha contribuição",
              order: 1,
              body: "- Arquitetura e criação de ambientes AWS do zero com **Terraform** e GitOps\n- Plataforma interna para inventário contínuo e relatórios automatizados de recursos AWS\n- Políticas de backup, compliance e governança automatizadas em múltiplas contas\n- APIs em Node.js para gerenciar permissões em bancos, EC2 e Kubernetes via Teleport\n- Pipelines no GitHub Actions para automação de processos críticos e deploy seguro\n- Investigação de falhas de infraestrutura com DataDog e CloudWatch",
            },
            {
              type: "SOLUTION",
              title: "Solução implementada",
              order: 2,
              body: "As rotinas de coleta percorrem as contas, consolidam o inventário e alimentam relatórios automatizados. A partir desse inventário, políticas de backup e compliance são aplicadas de forma declarativa, e o acesso a bancos, instâncias e clusters passa por APIs internas integradas ao Teleport.",
            },
            {
              type: "DECISIONS",
              title: "Decisões de engenharia",
              order: 3,
              body: "- **Infraestrutura como código em primeiro lugar:** ambientes descritos em Terraform, versionados e aplicados via GitOps.\n- **Automação sobre documentação:** políticas aplicadas por pipeline em vez de checklists manuais.\n- **Acesso auditável:** permissões concedidas por API e por fluxo, não por ajuste manual no console.",
            },
            {
              type: "RESULTS",
              title: "Resultados",
              order: 4,
              body: "- Redução de custos em **mais de 14 contas** AWS e GCP após revisão arquitetural\n- Falhas de infraestrutura identificadas antes de gerarem prejuízo acima de **USD 2.000**\n- Backup, compliance e governança aplicados de forma automatizada em múltiplas contas",
            },
          ],
        },
        diagrams: {
          create: [
            {
              title: "Coleta, consolidação e aplicação de políticas",
              order: 0,
              source:
                "flowchart TD\n  subgraph Contas\n    A1[Conta AWS 1]\n    A2[Conta AWS 2]\n    A3[Conta AWS n]\n  end\n  A1 --> C[Coletor de inventário]\n  A2 --> C\n  A3 --> C\n  C --> S[(Base de inventário)]\n  S --> R[Relatórios automatizados]\n  S --> G[Políticas de backup e compliance]\n  G -->|Terraform + GitOps| Contas\n  P[Pipelines GitHub Actions] --> G",
            },
          ],
        },
        features: {
          create: [
            {
              title: "Inventário contínuo",
              description:
                "Recursos de várias contas consolidados automaticamente.",
              icon: "database",
              order: 0,
            },
            {
              title: "Relatórios automatizados",
              description: "Visão recorrente de recursos e custos.",
              icon: "dashboard",
              order: 1,
            },
            {
              title: "Backup e compliance como código",
              description: "Políticas aplicadas por pipeline.",
              icon: "shield",
              order: 2,
            },
            {
              title: "Acesso via Teleport",
              description: "Permissões em bancos, EC2 e Kubernetes por API.",
              icon: "lock",
              order: 3,
            },
          ],
        },
      },
    });

  // ------------------------------------------------------- projeto DEMO
  const demoTech = await technologyIds([
    "nodejs",
    "typescript",
    "nestjs",
    "postgresql",
    "aws",
    "filas-e-eventos",
  ]);

  if (!(await projectExists("demo-api-pagamentos-event-driven")))
    await prisma.project.create({
      data: {
        title: "[Demo] API de pagamentos orientada a eventos",
        slug: "demo-api-pagamentos-event-driven",
        subtitle: "Conteúdo de demonstração para avaliação do layout",
        summary:
          "Projeto de DEMONSTRAÇÃO criado apenas para avaliar o layout das páginas de estudo de caso. Os dados não representam um trabalho real e podem ser removidos pelo painel administrativo.",
        status: "PUBLISHED",
        featured: true,
        order: 2,
        isDemo: true,
        period: "Demonstração",
        categoryId: categoryId("backend"),
        coverImageUrl: "/images/covers/demo-events.svg",
        coverImageAlt:
          "Ilustração abstrata de arquitetura orientada a eventos (demonstração)",
        publishedAt: new Date(),
        indexable: false,
        technologies: {
          create: demoTech.map((technologyId, index) => ({
            technologyId,
            order: index,
          })),
        },
        metrics: {
          create: [
            {
              label: "exemplo de métrica",
              value: "99,9%",
              description: "Valor fictício",
              icon: "gauge",
              order: 0,
            },
            {
              label: "exemplo de throughput",
              value: "1,2k req/s",
              description: "Valor fictício",
              icon: "zap",
              order: 1,
            },
          ],
        },
        sections: {
          create: [
            {
              type: "CONTEXT",
              title: "Contexto e problema",
              order: 0,
              body: "Este é um **projeto de demonstração**. O texto existe apenas para mostrar como a página de estudo de caso se comporta com conteúdo real: seções, diagramas, endpoints e blocos de código.\n\nRemova este projeto pelo painel administrativo (`Remover dados de demonstração`) quando não precisar mais dele.",
            },
            {
              type: "SOLUTION",
              title: "Solução implementada",
              order: 1,
              body: "Uma API recebe requisições de cobrança, grava a intenção de pagamento e publica um evento. Consumidores independentes cuidam de antifraude, liquidação e notificação, cada um com sua própria fila.",
            },
          ],
        },
        diagrams: {
          create: [
            {
              title: "Arquitetura de referência (demonstração)",
              order: 0,
              source:
                "flowchart LR\n  C[Cliente] --> API[API de pagamentos]\n  API --> DB[(PostgreSQL)]\n  API --> EV{{Barramento de eventos}}\n  EV --> F[Antifraude]\n  EV --> L[Liquidação]\n  EV --> N[Notificações]\n  L --> DB",
            },
          ],
        },
        endpoints: {
          create: [
            {
              method: "POST",
              path: "/v1/payments",
              description: "Cria uma intenção de pagamento",
              auth: "Bearer",
              order: 0,
            },
            {
              method: "GET",
              path: "/v1/payments/:id",
              description: "Consulta o status do pagamento",
              auth: "Bearer",
              order: 1,
            },
            {
              method: "POST",
              path: "/v1/webhooks/psp",
              description: "Recebe confirmações do provedor",
              auth: "HMAC",
              order: 2,
            },
          ],
        },
        codeBlocks: {
          create: [
            {
              title: "Publicação de evento após a criação do pagamento",
              language: "typescript",
              order: 0,
              code: "async function createPayment(input: CreatePaymentInput) {\n  const payment = await repository.create(input);\n\n  await events.publish('payment.created', {\n    id: payment.id,\n    amount: payment.amount,\n    currency: payment.currency,\n  });\n\n  return payment;\n}",
            },
          ],
        },
        features: {
          create: [
            {
              title: "Idempotência",
              description: "Requisições repetidas não duplicam cobranças.",
              icon: "shield",
              order: 0,
            },
            {
              title: "Consumidores independentes",
              description: "Cada domínio consome o evento no seu ritmo.",
              icon: "workflow",
              order: 1,
            },
          ],
        },
      },
    });

  console.log(
    "[seed] projetos garantidos (1 de demonstração marcado com [Demo]).",
  );
}

async function main() {
  await seedAdmin();
  await seedTaxonomies();
  await seedSettings();
  await seedExperiences();
  await seedSocialLinks();
  await seedProjects();
  console.log("[seed] concluído.");
}

main()
  .catch((error) => {
    console.error("[seed] falhou:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
