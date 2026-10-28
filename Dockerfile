# syntax=docker/dockerfile:1

# ----------------------------------------------------------------- deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --------------------------------------------------------- prisma (CLI)
# CLI isolado, só para `prisma migrate deploy` no entrypoint (traz as próprias dependências).
FROM node:22-alpine AS prisma-cli
RUN apk add --no-cache openssl
WORKDIR /opt/prisma-cli
COPY package-lock.json /tmp/package-lock.json
RUN npm init -y >/dev/null \
 && npm install --omit=dev --no-audit --no-fund \
      "prisma@$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")"

# ---------------------------------------------------------------- build
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O build não consulta o banco (as páginas públicas são dinâmicas); os valores abaixo
# só existem para gerar o Prisma Client e satisfazer a validação de variáveis.
ARG DATABASE_URL="file:/tmp/build.db"
ARG AUTH_SECRET="build-time-placeholder-secret-value-32-chars"
# O next.config.ts embute `images.remotePatterns` no build: a origem pública do bucket
# precisa estar disponível aqui, não só em runtime.
ARG S3_PUBLIC_URL=""
ENV DATABASE_URL=$DATABASE_URL AUTH_SECRET=$AUTH_SECRET S3_PUBLIC_URL=$S3_PUBLIC_URL
RUN npx prisma generate && npm run build
# Seed e criação de administrador sem precisar do tsx/TypeScript em produção.
RUN npx esbuild scripts/create-admin.ts --bundle --platform=node --format=cjs \
      --external:@prisma/client --outfile=dist-scripts/create-admin.cjs \
 && npx esbuild prisma/seed.ts --bundle --platform=node --format=cjs \
      --external:@prisma/client --outfile=dist-scripts/seed.cjs

# ----------------------------------------------------------------- run
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/app.db PRISMA_HIDE_UPDATE_MESSAGE=1 CHECKPOINT_DISABLE=1
# O motor do Prisma precisa do OpenSSL.
RUN apk add --no-cache openssl \
 && addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 \
 && mkdir /data && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma Client (o standalone não traz o motor de consultas) + migrations + CLI.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=prisma-cli /opt/prisma-cli/node_modules /opt/prisma-cli/node_modules
COPY --from=builder /app/dist-scripts ./dist-scripts
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

USER nextjs
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["entrypoint.sh"]
