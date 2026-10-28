#!/bin/sh
# Entrypoint da imagem: migrations → (opcional) administrador → servidor.
set -e

# SQLite é um arquivo; o diretório precisa existir e ser gravável pelo usuário da app.
mkdir -p "$(dirname "${DATABASE_URL#file:}")"

echo "[entrypoint] aplicando migrations"
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy

# Cria o administrador (só se ainda não existir) a partir das variáveis do Secrets Manager.
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[entrypoint] garantindo o administrador $ADMIN_EMAIL"
  ADMIN_NAME="${ADMIN_NAME:-Administrador}" ADMIN_ONLY_IF_MISSING=1 node dist-scripts/create-admin.cjs
fi

exec node server.js
