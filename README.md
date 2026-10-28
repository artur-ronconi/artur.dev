# Artur.dev — Portfólio de Engenharia de Software

Portfólio profissional full stack com **painel administrativo completo**: todo o conteúdo do site
(projetos, estudos de caso, stack, experiências, certificações, textos, imagens e SEO) é gerenciado
pelo `/admin` e persistido em SQLite (um arquivo, sem servidor de banco). Nenhuma informação pública vem de arrays estáticos.

- **Site público:** hero com mini-IDE e terminal de verdade, stack explorável, fluxo de arquitetura
  simulável passo a passo, laboratório de servidores, projetos em destaque, linha do tempo,
  certificações, sobre e contato funcional — em **tema claro e escuro**.
- **Estudo de caso por projeto:** `/projetos/<slug>` com contexto, contribuição, solução,
  arquitetura (diagramas Mermaid), tecnologias com papel, desafios, métricas, funcionalidades,
  endpoints, blocos de código, galeria e projetos relacionados — cada seção aparece somente quando
  preenchida.
- **Painel:** CRUD completo de projetos (rascunho/publicado, destaque, ordenação, duplicação,
  exclusão), tecnologias e categorias, experiências (ícone, entregas em tópicos, tecnologias
  selecionadas do cadastro e galeria de fotos e vídeos), certificações, biblioteca de mídia,
  mensagens de contato, conteúdo da home (ordem e visibilidade das seções) e conta do administrador.

> O briefing original do projeto está em [`docs/briefing.md`](docs/briefing.md).
> O guia de publicação na AWS está em [`docs/deploy-aws.md`](docs/deploy-aws.md).

---

## Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Aplicação | **Next.js 15 (App Router) + React 19 + TypeScript** | Full stack em um único deploy, Server Components para leitura e Server Actions para escrita |
| Estilo | **Tailwind CSS v4** com tokens de design em `src/styles/globals.css` | Identidade própria (verde Node.js, temas claro e escuro) sem biblioteca de componentes genérica |
| Banco | **SQLite + Prisma** (migrations, índices, constraints) | Dados relacionais com N:N entre projetos e tecnologias, sem processo extra — cabe numa t4g.nano |
| Validação | **Zod** (`src/server/validation/schemas.ts`) | Mesmo contrato no formulário (cliente) e na Server Action (servidor) |
| Autenticação | Sessão própria em cookie `httpOnly` + sessões no banco + **bcrypt** | Revogação real de sessão, hash forte, sem dependência extra |
| Imagens e vídeos | Driver **local** (dev) ou **S3-compatível** (produção) | Mesmo código em dev e em produção (AWS S3, R2, MinIO) |
| Diagramas | Explorador de fluxo próprio + **Mermaid** (sob demanda) | Fluxogramas cadastrados em texto Mermaid viram um diagrama interativo; os demais tipos usam o Mermaid |
| Código | **Shiki** (no servidor) | Destaque de sintaxe sem enviar highlighter para o navegador |
| Ícones | **lucide-react** (interface) + **simple-icons** (logos, apenas no servidor) | Logos oficiais sem inflar o bundle |
| Testes | **Vitest** (unidade + integração com banco) e **Playwright** (smoke e2e) | Cobre regras de negócio e os fluxos principais |

---

## Como executar localmente

### Atalho: `start.sh` e `destroy.sh`

```bash
./start.sh             # prepara tudo e sobe a aplicação (Ctrl+C encerra)
./start.sh -d          # idem, em segundo plano (log em .run/dev.log)
./destroy.sh           # para a aplicação e o container do banco (dados preservados)
./destroy.sh --data    # também apaga o banco e public/uploads (pede confirmação)
./destroy.sh --all     # --data + caches de build + node_modules
```

O `start.sh` cria o `.env` se não existir, instala as dependências, aplica as migrations no
SQLite (`prisma/dev.db`) e roda o seed apenas com o banco vazio (`--seed` força). Os passos abaixo descrevem o mesmo processo
manualmente.

### 1. Pré-requisitos

- Node.js 22+

### 2. Banco de dados

SQLite: nada a instalar. A `DATABASE_URL` (`file:./dev.db`) aponta para um arquivo em `prisma/`
criado pelas migrations (passo 4).

### 3. Variáveis de ambiente

```bash
cp .env.example .env
# gere um segredo de sessão:
openssl rand -base64 48
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Arquivo SQLite: `file:./dev.db` (relativo a `prisma/`) em desenvolvimento, `file:/data/app.db` em produção |
| `AUTH_SECRET` | sim | 32+ caracteres aleatórios; assina o hash do token de sessão |
| `SESSION_TTL_DAYS` | não | Validade da sessão (padrão: 7) |
| `NEXT_PUBLIC_SITE_URL` | sim em produção | URL pública (metadados, sitemap, Open Graph) |
| `STORAGE_DRIVER` | não | `local` (padrão, grava em `public/uploads`) ou `s3` |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | se `STORAGE_DRIVER=s3` | Credenciais do bucket |
| `S3_ENDPOINT`, `S3_PUBLIC_URL`, `S3_FORCE_PATH_STYLE` | não | Para provedores compatíveis (R2, MinIO) ou CDN |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | só no seed | Criam o primeiro administrador |
| `DATABASE_URL_TEST` | não | Banco usado por `npm test` (ex.: `file:./test.db`; aplique `prisma migrate deploy` nele antes — recomendado para não tocar no banco de desenvolvimento) |

Em produção as variáveis vêm do AWS Secrets Manager (o Terraform cria o segredo e a role da
instância o lê no deploy) — nunca versionar o `.env`.

### 4. Instalação, migrations e seed

```bash
npm install
npm run db:migrate     # cria o schema
npm run db:seed        # conteúdo inicial + primeiro administrador
npm run dev            # http://localhost:3000
```

O painel fica em **http://localhost:3000/admin** (login com `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

> **Troque a senha** no primeiro acesso em `/admin/conta`. Não existe cadastro público de
> administradores: novos usuários são criados por `npm run admin:create`.

### Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` / `npm start` | Build e execução em produção |
| `npm run typecheck` | TypeScript em modo estrito |
| `npm run lint` | ESLint (configuração do Next) |
| `npm test` | Vitest (unidade + integração; use `DATABASE_URL_TEST` para um banco separado) |
| `npm run test:e2e` | Smoke test Playwright (precisa da aplicação rodando) |
| `npm run db:migrate` / `db:deploy` / `db:studio` / `db:seed` | Prisma |
| `npm run admin:create` | Cria ou atualiza um administrador |
| `npm run demo:clear` | Remove todo o conteúdo marcado como demonstração |

---

## Interatividade e temas

O verde do Node.js é a cor predominante, e todo o site funciona em **tema claro e escuro**: o botão
no cabeçalho alterna (com uma transição circular a partir do botão), a escolha fica salva no
navegador e, na primeira visita, vale a preferência do sistema. Os tokens ficam em
`src/styles/globals.css` — o tema claro apenas redefine as mesmas variáveis, então nenhum
componente precisa de variantes `dark:`.

| Onde | O que o visitante faz | Código |
| --- | --- | --- |
| Hero | Troca de arquivo num mini-IDE, "executa" o código e usa um **terminal de verdade** (`help`, `whoami`, `projects`, `open <slug>`, `stack`, `goto`, `theme`…), com Tab e histórico. As respostas vêm do conteúdo cadastrado no painel | `src/components/home/workbench/` |
| Tecnologias | Filtra por categoria e clica em uma tecnologia para ver em quais projetos ela foi usada, com qual papel, e com quais outras aparece junto | `src/components/home/tech-explorer.tsx` |
| Fluxo de arquitetura | Clica nos componentes para inspecionar conexões, **simula uma requisição** percorrendo o fluxo etapa por etapa (play, pausa, avançar, velocidade, "simular a partir daqui"), amplia, arrasta e abre em tela cheia | `src/components/flow/`, `src/lib/flow/` |
| Laboratório | Opera um **cluster simulado**: ajusta o tráfego, dispara um pico, derruba instâncias, liga/desliga o auto scaling e faz um rolling update, vendo balanceador, health checks e métricas reagirem | `src/components/home/server-lab.tsx`, `src/lib/lab/` |
| Página de projeto | Endpoints filtráveis com exemplo de chamada copiável; blocos de código com botão de copiar | `src/components/project/` |
| Site inteiro | **Paleta de comandos** (`Ctrl+K`, `⌘K` ou `/`) para navegar entre seções e projetos; holofote que segue o cursor nos cartões; barra de progresso de leitura | `src/components/site/` |

O explorador de fluxo é gerado a partir do **mesmo texto Mermaid** cadastrado no painel: um parser
próprio lê os fluxogramas (`flowchart` / `graph`, com subgrafos e rótulos), um layout em camadas
posiciona os nós e escolhe a orientação que melhor cabe na tela. Diagramas de outros tipos
(sequência, ER…) continuam sendo renderizados pelo Mermaid.

O laboratório é uma **simulação didática que roda no navegador** — os números exibidos ali não são
métricas de produção, e a própria seção avisa isso. Ele pode ser ocultado ou reordenado em
`/admin/perfil`, como qualquer outra seção da home.

Todas as animações respeitam `prefers-reduced-motion`.

---

## Conteúdo real x conteúdo de demonstração

O seed cadastra **dados profissionais reais** (perfil, resumo, stack e as quatro experiências do
currículo) e **dois estudos de caso** escritos a partir do currículo e do briefing — revise os
textos no painel antes de publicar.

Além disso, existe **um projeto de demonstração**, prefixado com `[Demo]` e marcado com
`isDemo = true` no banco, criado apenas para avaliar o layout com conteúdo rico (endpoints, bloco de
código, diagrama). Para remover todo o conteúdo fictício:

- no painel: botão **“Remover dados de demonstração”** no Dashboard; ou
- no terminal: `npm run demo:clear`.

Nenhuma certificação foi cadastrada — a seção fica com estado vazio até você adicionar as suas em
`/admin/certificacoes`.

---

## Arquitetura

```
src/
├── app/
│   ├── (site)/              # site público (home, listagem e página de projeto)
│   ├── (preview)/preview/   # prévia autenticada de rascunhos (layout idêntico ao público)
│   ├── admin/(painel)/      # painel protegido (layout com guarda de sessão)
│   ├── admin/login/         # login (fora da guarda)
│   └── api/admin/upload/    # upload autenticado de imagens
├── components/              # UI (ui/, site/, home/, project/, admin/, icons/)
├── lib/                     # utilidades puras (slug, datas, markdown seguro, env, tema)
│   ├── flow/                # parser, layout e simulação dos fluxogramas
│   └── lab/                 # motor da simulação do laboratório de servidores
├── server/
│   ├── actions/             # Server Actions = controladores finos (auth + CSRF + validação)
│   ├── auth/                # sessão, senha, rate limit
│   ├── db/                  # Prisma client e tradução de erros
│   ├── modules/             # consultas e regras de negócio por domínio
│   ├── storage/             # driver de arquivos (local | S3)
│   └── validation/          # schemas Zod compartilhados
└── styles/globals.css       # design system (tokens, componentes, utilitários)
```

**Fluxo de escrita:** formulário (cliente) → Server Action → `adminAction()` (exige sessão + token
CSRF) → schema Zod → serviço de domínio → Prisma → `revalidatePath` nas páginas afetadas.

**Fluxo de leitura:** Server Component → módulo de consulta (`src/server/modules`) → Prisma.
As páginas públicas são renderizadas sob demanda (`force-dynamic` no layout do site): o conteúdo vem
do SQLite e a imagem Docker nem tem banco na hora do build. Slugs inexistentes respondem **404 de verdade**.

### Modelo de dados (Prisma)

`Project` concentra o estudo de caso e tem relação 1:N com `ProjectSection`, `ProjectImage`,
`ProjectDiagram`, `ProjectMetric`, `ProjectFeature`, `ProjectLink`, `ProjectCodeBlock` e
`ProjectEndpoint`, além de N:N com `Technology` através de `ProjectTechnology` (que guarda o papel
da tecnologia naquele projeto). O perfil fica em `PortfolioSettings` (linha única),
`ProfessionalExperience` (com `ExperienceTechnology` ligando às tecnologias cadastradas e
`ExperienceMedia` para fotos e vídeos), `Certification`, `SocialLink` e `HomeSection`. A autenticação usa
`AdminUser`, `Session` e `LoginAttempt`. Uploads ficam em `MediaAsset`.

Ao salvar um projeto, os blocos filhos são regravados dentro de uma transação — assim ordem,
inclusões e remoções ficam sempre consistentes.

---

## Segurança

- Senhas com **bcrypt** (custo 12) e política mínima de força no servidor.
- Sessão opaca em cookie `httpOnly` + `SameSite=Lax` (`Secure` em produção); o banco guarda apenas o
  **hash** do token, então é possível revogar sessões (trocar a senha encerra todas).
- Toda rota administrativa é protegida **no servidor** (layout com guarda + `requireUser()` em cada
  Server Action) — não há proteção apenas no cliente.
- **CSRF**: token double-submit em cookie legível, conferido com comparação de tempo constante em
  todas as mutações e no endpoint de upload.
- **Força bruta**: tentativas de login registradas por e-mail e por IP, com bloqueio temporário;
  o tempo de resposta não revela se o e-mail existe.
- **XSS**: todo conteúdo em Markdown é escapado antes da conversão (`src/lib/markdown.ts`); o
  Mermaid roda com `securityLevel: "strict"`.
- Formulário de contato com honeypot, validação e limite por IP.
- Cabeçalhos de segurança (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS) e `no-store` no
  `/admin` configurados em `next.config.ts`.
- Upload restrito a imagens (até 8 MB) e vídeos MP4/WebM (até 64 MB), com nome de arquivo gerado no
  servidor.
- `/admin` e `/preview` ficam fora do `robots.txt` e do sitemap.

---

## Qualidade

```bash
npm run typecheck && npm run lint && npm test
npm run build
npm run dev          # em outro terminal:
npm run test:e2e
```

- **Unidade:** utilidades, Markdown seguro, schemas de validação, política de senha, parser/layout dos
  fluxogramas e o motor de simulação do laboratório.
- **Integração (banco real):** criação/atualização de projeto com blocos aninhados, unicidade de
  slug, publicação, duplicação, reordenação, exclusão em cascata e remoção dos dados de demonstração.
- **E2E (Playwright):** site público, terminal do hero, troca de tema, simulação do fluxo, laboratório,
  diagrama renderizado, bloqueio do `/admin`, login, todas as
  telas do painel, criação de rascunho, prévia autenticada, 404 do rascunho para visitantes,
  publicação e exclusão.

Acessibilidade e desempenho: HTML semântico, navegação por teclado com foco visível, `aria-*` nos
componentes interativos, respeito a `prefers-reduced-motion`, contraste alto nos dois temas,
imagens via `next/image` e ~104 kB de JS compartilhado (o Mermaid só carrega quando o diagrama não é
um fluxograma).

---

## Publicação

Produção roda em **uma instância EC2 t4g.nano** (us-east-1) com a imagem Docker da aplicação, Caddy
(HTTPS automático) e o SQLite em disco, com backup diário no S3. Tudo é provisionado por Terraform
(`infra/`) e entregue por dois workflows do GitHub Actions:

| Workflow | Quando | O que faz |
| --- | --- | --- |
| `.github/workflows/terraform.yml` | PRs em `infra/` (plan) e manualmente (plan / apply / destroy) | Cria ou destrói a infraestrutura |
| `.github/workflows/deploy.yml` | manualmente (Run workflow, na `main`) | typecheck, lint e testes; build ARM64; push no ECR; atualiza a instância via SSM |

As variáveis de ambiente vêm do **Secrets Manager** (segredo `artur-dev/prod`, lido pela role da
instância). O passo a passo (bootstrap, variáveis do repositório, primeiro deploy, backup/restore)
está em [`docs/deploy-aws.md`](docs/deploy-aws.md).

```bash
docker build -t artur-dev .
docker run --rm -p 3000:3000 -v artur-data:/data \
  -e AUTH_SECRET="$(openssl rand -base64 48)" \
  -e NEXT_PUBLIC_SITE_URL="http://localhost:3000" \
  artur-dev
```

O entrypoint da imagem aplica as migrations e, se `ADMIN_EMAIL` e `ADMIN_PASSWORD` estiverem
definidos, cria o administrador quando ele ainda não existe.
