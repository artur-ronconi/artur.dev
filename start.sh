#!/usr/bin/env bash
# Sobe o ambiente de desenvolvimento: .env, dependências, migrations (SQLite), seed e `next dev`.
#
#   ./start.sh          aplicação em primeiro plano (Ctrl+C encerra)
#   ./start.sh -d       aplicação em segundo plano (log em .run/dev.log; encerre com ./destroy.sh)
#   ./start.sh --seed   roda o seed mesmo com o banco já populado
#
# A porta pode ser trocada com PORT=3001 ./start.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

RUN_DIR=".run"
PID_FILE="$RUN_DIR/dev.pid"
LOG_FILE="$RUN_DIR/dev.log"
PORT="${PORT:-3000}"

DETACH=0
FORCE_SEED=0

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
port_open() { (exec 3<>"/dev/tcp/$1/$2") 2>/dev/null; }

for arg in "$@"; do
  case "$arg" in
    -d | --detach) DETACH=1 ;;
    --seed) FORCE_SEED=1 ;;
    -h | --help) sed -n '2,8p' "$(basename "${BASH_SOURCE[0]}")" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Opção desconhecida: $arg (use --help)" ;;
  esac
done

command -v node >/dev/null || die "Node.js não encontrado (necessário 22+)."
command -v npm >/dev/null || die "npm não encontrado."

if [[ -f $PID_FILE ]]; then
  if kill -0 "$(<"$PID_FILE")" 2>/dev/null; then
    die "A aplicação já está em execução (PID $(<"$PID_FILE")). Encerre com ./destroy.sh"
  fi
  rm -f "$PID_FILE"
fi

port_open localhost "$PORT" && die "A porta $PORT já está em uso. Libere-a ou use PORT=<outra> ./start.sh"

# ---------------------------------------------------------------- .env
if [[ ! -f .env ]]; then
  step "Criando .env a partir do .env.example"
  secret="$(node -e 'console.log(require("node:crypto").randomBytes(48).toString("base64"))')"
  sed "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$secret\"|" .env.example >.env
  warn "Defina ADMIN_EMAIL / ADMIN_PASSWORD no .env para criar o administrador."
fi

# -------------------------------------------------------- dependências
if [[ ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  step "Instalando dependências"
  npm install
fi

# --------------------------------------------------------------- banco
# SQLite: um arquivo (DATABASE_URL=file:./dev.db → prisma/dev.db). Não há servidor para subir.
node -e 'require("dotenv/config"); process.exit(/^file:/.test(process.env.DATABASE_URL ?? "") ? 0 : 1)' ||
  die "DATABASE_URL ausente ou inválida no .env (esperado: file:./dev.db)"

step "Aplicando migrations"
npx prisma generate
npx prisma migrate deploy

# O seed recria conteúdo removido pelo painel, então só roda sozinho com o banco vazio.
settings_count="$(node -e '
  require("dotenv/config");
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  prisma.portfolioSettings
    .count()
    .then((count) => console.log(count))
    .finally(() => prisma.$disconnect());
')"

if [[ $FORCE_SEED == 1 || $settings_count == 0 ]]; then
  step "Populando o banco (seed)"
  npm run db:seed
fi

# ----------------------------------------------------------- aplicação
mkdir -p "$RUN_DIR"
export PORT

if [[ $DETACH == 1 ]]; then
  step "Iniciando a aplicação em segundo plano"
  nohup npm run dev >"$LOG_FILE" 2>&1 &
  pid=$!
  echo "$pid" >"$PID_FILE"

  for _ in $(seq 1 60); do
    port_open localhost "$PORT" && break
    kill -0 "$pid" 2>/dev/null || { rm -f "$PID_FILE"; die "A aplicação encerrou ao iniciar — veja $LOG_FILE"; }
    sleep 1
  done
  port_open localhost "$PORT" || die "A aplicação não respondeu na porta $PORT — veja $LOG_FILE"

  printf '\n  Site:   http://localhost:%s\n  Painel: http://localhost:%s/admin\n  Log:    %s\n  Parar:  ./destroy.sh\n\n' \
    "$PORT" "$PORT" "$LOG_FILE"
else
  step "Iniciando a aplicação (Ctrl+C encerra) — painel em http://localhost:$PORT/admin"
  echo "$$" >"$PID_FILE"
  trap 'rm -f "$PID_FILE"' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  npm run dev
fi
