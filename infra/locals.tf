data "aws_caller_identity" "current" {}

# AMI Amazon Linux 2023 para ARM64, sempre a mais recente no momento do apply.
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

locals {
  account_id = data.aws_caller_identity.current.account_id

  # Segredo criado à mão no console (docs/deploy-aws.md); aqui só o nome e a permissão de leitura.
  secret_name   = "${var.project_name}/prod"
  media_bucket  = "${var.project_name}-media-${local.account_id}"
  backup_bucket = "${var.project_name}-backups-${local.account_id}"

  # Com domínio: HTTPS automático (Caddy). Sem domínio: HTTP pelo IP elástico.
  site_address = var.domain_name != "" ? var.domain_name : ":80"
}
