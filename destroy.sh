#!/usr/bin/env bash
# Encerra o ambiente de desenvolvimento iniciado pelo ./start.sh.
#
#   ./destroy.sh           para a aplicação (dados preservados)
#   ./destroy.sh --data    também APAGA os dados: arquivos SQLite (prisma/*.db) e public/uploads
#   ./destroy.sh --clean   também remove os caches de build (.next, tsconfig.tsbuildinfo)
#   ./destroy.sh --all     --data + --clean + node_modules
#   -y, --yes              não pede confirmação ao apagar dados
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

RUN_DIR=".run"
PID_FILE="$RUN_DIR/dev.pid"

WIPE_DATA=0
CLEAN=0
WIPE_MODULES=0
ASSUME_YES=0

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*" >&2; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$child" "$2"; done
  kill "-$2" "$1" 2>/dev/null || true
}

for arg in "$@"; do
  case "$arg" in
    --data) WIPE_DATA=1 ;;
    --clean) CLEAN=1 ;;
    --all) WIPE_DATA=1 CLEAN=1 WIPE_MODULES=1 ;;
    -y | --yes) ASSUME_YES=1 ;;
    -h | --help) sed -n '2,8p' "$(basename "${BASH_SOURCE[0]}")" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Opção desconhecida: $arg (use --help)" ;;
  esac
done

if [[ $WIPE_DATA == 1 ]]; then
  echo "Isto vai APAGAR permanentemente:"
  echo "  - os bancos SQLite em prisma/ (dev.db, test.db e arquivos -journal/-wal/-shm)"
  echo "  - os arquivos enviados em public/uploads"

  if [[ $ASSUME_YES != 1 ]]; then
    read -r -p "Continuar? [s/N] " answer
    [[ $answer =~ ^[sSyY]$ ]] || die "Cancelado."
  fi
fi

# ----------------------------------------------------------- aplicação
if [[ -f $PID_FILE ]]; then
  pid="$(<"$PID_FILE")"
  # Confere o comando para não matar outro processo que tenha reaproveitado o PID.
  if kill -0 "$pid" 2>/dev/null && ps -o args= -p "$pid" | grep -Eq 'start\.sh|npm|next'; then
    step "Parando a aplicação (PID $pid)"
    kill_tree "$pid" TERM
    for _ in $(seq 1 50); do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.1
    done
    kill -0 "$pid" 2>/dev/null && kill_tree "$pid" KILL
  fi
  rm -f "$PID_FILE"
else
  echo "Nenhuma aplicação iniciada pelo ./start.sh em execução."
fi

# --------------------------------------------------------------- dados
if [[ $WIPE_DATA == 1 ]]; then
  step "Removendo os bancos SQLite"
  rm -f prisma/*.db prisma/*.db-journal prisma/*.db-wal prisma/*.db-shm
fi

if [[ $WIPE_DATA == 1 ]]; then
  step "Removendo public/uploads"
  rm -rf public/uploads
fi

# -------------------------------------------------------------- caches
if [[ $CLEAN == 1 ]]; then
  step "Removendo caches de build"
  rm -rf .next tsconfig.tsbuildinfo "$RUN_DIR"
fi

if [[ $WIPE_MODULES == 1 ]]; then
  step "Removendo node_modules"
  rm -rf node_modules
fi

printf '\n✓ Ambiente encerrado.\n'
