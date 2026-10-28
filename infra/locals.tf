data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# AMI Amazon Linux 2023 para ARM64, sempre a mais recente no momento do apply.
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

locals {
  account_id = data.aws_caller_identity.current.account_id

  secret_name   = "${var.project_name}/prod"
  media_bucket  = "${var.project_name}-media-${local.account_id}"
  backup_bucket = "${var.project_name}-backups-${local.account_id}"

  # Com domínio: HTTPS automático (Caddy). Sem domínio: HTTP pelo IP elástico.
  site_url     = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_eip.app.public_ip}"
  site_address = var.domain_name != "" ? var.domain_name : ":80"

  ecr_registry = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}
