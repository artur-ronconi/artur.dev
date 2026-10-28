#!/usr/bin/env bash
# Backup diário do SQLite para o S3 (acionado por artur-backup.timer).
# Restaurar: baixe o .gz, descompacte em /data/app.db e reinicie o container "app".
set -euo pipefail

# shellcheck disable=SC1091
source /etc/artur-dev/config.env

DB=/data/app.db
if [ ! -f "$DB" ]; then
  echo "[artur-backup] $DB ainda não existe — nada a fazer"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# .backup usa a API de backup do SQLite: copia consistente mesmo com a app escrevendo.
sqlite3 "$DB" ".backup '$TMP/app.db'"
gzip -9 "$TMP/app.db"

KEY="db/app-$(date -u +%F).db.gz"
aws s3 cp "$TMP/app.db.gz" "s3://$BACKUP_BUCKET/$KEY" --region "$AWS_REGION" --only-show-errors
echo "[artur-backup] enviado: s3://$BACKUP_BUCKET/$KEY"
