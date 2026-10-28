#!/usr/bin/env bash
# Sobe (ou atualiza) a aplicação nesta instância.
#
#   artur-deploy [tag]     tag da imagem no ECR (padrão: latest)
#
# Chamado pelo workflow de deploy via SSM e uma vez no primeiro boot. As variáveis de
# ambiente vêm do Secrets Manager, lidas com a role da instância; o arquivo temporário
# com elas fica em /run (tmpfs, modo 600) e é apagado ao final.
set -euo pipefail

export HOME="${HOME:-/root}"
# shellcheck disable=SC1091
source /etc/artur-dev/config.env
export AWS_DEFAULT_REGION="$AWS_REGION"

TAG="${1:-latest}"
IMAGE="$ECR_REGISTRY/$ECR_REPOSITORY:$TAG"
CONFIG_DIR=/opt/artur-dev

log() { printf '[artur-deploy] %s\n' "$*"; }

ENV_FILE="$(mktemp /run/artur-dev.env.XXXXXX)"
trap 'rm -f "$ENV_FILE"' EXIT

log "lendo o segredo $SECRET_ID"
aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --query SecretString --output text |
  jq -r 'to_entries[] | "\(.key)=\(.value)"' >"$ENV_FILE"

log "baixando $IMAGE"
aws ecr get-login-password | docker login --username AWS --password-stdin "$ECR_REGISTRY" >/dev/null
docker pull "$IMAGE"

docker network inspect web >/dev/null 2>&1 || docker network create web >/dev/null
mkdir -p /data "$CONFIG_DIR"
chown 1001:1001 /data

log "iniciando a aplicação"
docker rm -f app >/dev/null 2>&1 || true
docker run -d --name app --restart unless-stopped --network web \
  --memory 400m --memory-swap 800m \
  -e NODE_OPTIONS=--max-old-space-size=256 \
  -v /data:/data --env-file "$ENV_FILE" \
  "$IMAGE" >/dev/null

# Caddy: HTTPS automático quando SITE_ADDRESS é um domínio; HTTP puro em ":80".
{
  if [ -n "${ACME_EMAIL:-}" ]; then printf '{\n\temail %s\n}\n\n' "$ACME_EMAIL"; fi
  printf '%s {\n\tencode zstd gzip\n\treverse_proxy app:3000\n}\n' "$SITE_ADDRESS"
} >"$CONFIG_DIR/Caddyfile"

if [ "$(docker inspect -f '{{.State.Running}}' caddy 2>/dev/null || echo false)" = true ]; then
  docker exec caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null || docker restart caddy >/dev/null
else
  docker rm -f caddy >/dev/null 2>&1 || true
  docker run -d --name caddy --restart unless-stopped --network web \
    --memory 96m -p 80:80 -p 443:443 \
    -v "$CONFIG_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" -v caddy_data:/data \
    caddy:2-alpine >/dev/null
fi

log "aguardando a aplicação responder"
for _ in $(seq 1 60); do
  if docker exec app wget -q -O /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    log "no ar: $IMAGE"
    # Mantém só as 3 imagens mais recentes da aplicação (o disco da nano é pequeno).
    docker images "$ECR_REGISTRY/$ECR_REPOSITORY" --format '{{.ID}}' | awk '!seen[$0]++' | tail -n +4 |
      xargs -r docker rmi >/dev/null 2>&1 || true
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

log "a aplicação não respondeu em 120s — últimos logs:"
docker logs --tail 60 app >&2 || true
exit 1
