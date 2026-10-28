# As variáveis de ambiente da aplicação vivem em UM segredo (JSON). A instância lê esse
# segredo pela role no deploy e o entrega ao container; nada fica no repositório.

resource "random_password" "auth_secret" {
  length  = 64
  special = false
}

# Atende à regra de senha do painel (10+ caracteres, maiúscula, minúscula e número).
resource "random_password" "admin" {
  length      = 20
  special     = false
  min_upper   = 2
  min_lower   = 2
  min_numeric = 2
}

resource "aws_secretsmanager_secret" "app" {
  name                    = local.secret_name
  description             = "Variáveis de ambiente de ${var.project_name} (lidas pela instância no deploy)."
  recovery_window_in_days = 0 # permite destroy + apply sem esperar a janela de recuperação
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DATABASE_URL         = "file:/data/app.db"
    AUTH_SECRET          = random_password.auth_secret.result
    SESSION_TTL_DAYS     = "7"
    NEXT_PUBLIC_SITE_URL = local.site_url

    STORAGE_DRIVER = "s3"
    S3_BUCKET      = aws_s3_bucket.media.bucket
    S3_REGION      = var.aws_region
    S3_PUBLIC_URL  = "https://${aws_s3_bucket.media.bucket_regional_domain_name}"

    ADMIN_EMAIL    = var.admin_email
    ADMIN_NAME     = var.admin_name
    ADMIN_PASSWORD = random_password.admin.result
  })

  # Depois da criação o segredo é seu: edite no console/CLI (aws secretsmanager
  # put-secret-value) sem que o Terraform volte a sobrescrever.
  lifecycle {
    ignore_changes = [secret_string]
  }
}
