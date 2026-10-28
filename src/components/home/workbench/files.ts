/**
 * Arquivos de exemplo exibidos no editor do hero. São trechos ilustrativos do
 * tipo de código que escrevo (API, infraestrutura, container e pipeline) — o
 * "resultado" de cada um é uma saída simulada, exibida no terminal ao executar.
 */

export type Language = "typescript" | "hcl" | "dockerfile" | "yaml";

export type WorkbenchFile = {
  path: string;
  language: Language;
  code: string;
  /** Comando mostrado no terminal e a saída simulada, linha a linha. */
  run: { command: string; output: Array<{ text: string; tone?: "ok" | "muted" | "accent" | "warn" }> };
};

export const FILES: WorkbenchFile[] = [
  {
    path: "src/main.ts",
    language: "typescript",
    code: `// Backend, infraestrutura e entrega contínua
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks(); // deploy sem derrubar requisições
  await app.listen(3000);
}

bootstrap();`,
    run: {
      command: "npm run start",
      output: [
        { text: "[Nest] LOG [NestFactory] Starting Nest application...", tone: "muted" },
        { text: "[Nest] LOG [InstanceLoader] AppModule dependencies initialized", tone: "muted" },
        { text: "[Nest] LOG [RoutesResolver] WebhookController {/webhooks}", tone: "muted" },
        { text: "[Nest] LOG [NestApplication] Nest application successfully started", tone: "ok" },
        { text: "→ escutando em http://localhost:3000", tone: "accent" },
      ],
    },
  },
  {
    path: "src/webhook.controller.ts",
    language: "typescript",
    code: `@Controller('webhooks')
export class WebhookController {
  constructor(private readonly queue: QueueService) {}

  @Post()
  @HttpCode(202)
  async receive(@Body() event: WebhookEvent) {
    // responde rápido ao produtor; o processamento é assíncrono
    await this.queue.publish('events', event, {
      deduplicationId: event.id,
    });

    return { queued: true };
  }
}`,
    run: {
      command: `curl -i -X POST localhost:3000/webhooks -d '{"id":"evt_1","type":"order.paid"}'`,
      output: [
        { text: "HTTP/1.1 202 Accepted", tone: "ok" },
        { text: "content-type: application/json", tone: "muted" },
        { text: "" },
        { text: '{"queued":true}' },
        { text: "→ evento na fila; um worker consome em seguida", tone: "accent" },
      ],
    },
  },
  {
    path: "infra/main.tf",
    language: "hcl",
    code: `# Fila principal com fila de erros (DLQ)
resource "aws_sqs_queue" "dlq" {
  name = "events-dlq"
}

resource "aws_sqs_queue" "events" {
  name                       = "events"
  visibility_timeout_seconds = 60

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_lambda_event_source_mapping" "worker" {
  event_source_arn = aws_sqs_queue.events.arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = 10
}`,
    run: {
      command: "terraform plan",
      output: [
        { text: "Terraform will perform the following actions:", tone: "muted" },
        { text: "  + aws_sqs_queue.dlq", tone: "ok" },
        { text: "  + aws_sqs_queue.events", tone: "ok" },
        { text: "  + aws_lambda_event_source_mapping.worker", tone: "ok" },
        { text: "" },
        { text: "Plan: 3 to add, 0 to change, 0 to destroy.", tone: "accent" },
      ],
    },
  },
  {
    path: "Dockerfile",
    language: "dockerfile",
    code: `# Build em estágios: imagem final só com o necessário
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node", "dist/main.js"]`,
    run: {
      command: "docker build -t api .",
      output: [
        { text: "[build 1/6] FROM node:22-alpine", tone: "muted" },
        { text: "[build 4/6] RUN npm ci", tone: "muted" },
        { text: "[build 6/6] RUN npm run build", tone: "muted" },
        { text: "[stage-1 4/4] COPY --from=build /app/dist ./dist", tone: "muted" },
        { text: "=> exporting to image", tone: "ok" },
        { text: "=> naming to docker.io/library/api:latest", tone: "accent" },
      ],
    },
  },
  {
    path: ".github/workflows/deploy.yml",
    language: "yaml",
    code: `name: deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
      - run: docker build -t $IMAGE .
      - run: docker push $IMAGE
      # rolling update: sobe a versão nova antes de drenar a antiga
      - run: aws ecs update-service --force-new-deployment`,
    run: {
      command: "git push origin main",
      output: [
        { text: "→ workflow deploy disparado", tone: "muted" },
        { text: "  ✓ checkout", tone: "ok" },
        { text: "  ✓ npm ci && npm test", tone: "ok" },
        { text: "  ✓ docker build", tone: "ok" },
        { text: "  ✓ docker push", tone: "ok" },
        { text: "  ✓ ecs update-service (rolling, sem downtime)", tone: "accent" },
      ],
    },
  },
];

type Tone = "keyword" | "string" | "comment" | "fn" | "meta" | "number";
export type Token = { text: string; tone?: Tone };

const KEYWORDS: Record<Language, string[]> = {
  typescript: ["import", "from", "export", "class", "constructor", "private", "readonly", "async", "await", "function", "const", "return", "new"],
  hcl: ["resource", "variable", "output", "module", "provider"],
  dockerfile: ["FROM", "AS", "WORKDIR", "COPY", "RUN", "ENV", "USER", "CMD", "EXPOSE"],
  yaml: ["name", "on", "push", "branches", "jobs", "steps", "uses", "run", "runs-on", "deploy"],
};

const COMMENT: Record<Language, string> = { typescript: "//", hcl: "#", dockerfile: "#", yaml: "#" };

/** Realce de sintaxe mínimo, suficiente para os trechos acima. */
export function tokenize(line: string, language: Language): Token[] {
  const marker = COMMENT[language];
  const commentAt = line.trimStart().startsWith(marker) ? line.indexOf(marker) : line.indexOf(` ${marker} `);
  const code = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const comment = commentAt >= 0 ? line.slice(commentAt) : "";

  const keywords = KEYWORDS[language].map((word) => word.replace("-", "\\-")).join("|");
  const pattern = new RegExp(
    `("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(@\\w+|\\$\\w+)|(?<![\\w.-])(${keywords})(?![\\w-])|\\b(\\d+)\\b|\\b([A-Za-z_]\\w*)(?=\\()`,
    "g",
  );

  const tokens: Token[] = [];
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    if (match.index > last) tokens.push({ text: code.slice(last, match.index) });
    const tone: Tone = match[1] ? "string" : match[2] ? "meta" : match[3] ? "keyword" : match[4] ? "number" : "fn";
    tokens.push({ text: match[0], tone });
    last = match.index + match[0].length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last) });
  if (comment) tokens.push({ text: comment, tone: "comment" });
  return tokens;
}
