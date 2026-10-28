# Bootstrap (aplicar UMA vez, localmente, com credenciais de administrador):
#
#   cd infra/bootstrap
#   terraform init
#   terraform apply -var github_repository=OWNER/REPO
#
# Cria o que os workflows precisam antes de existir qualquer coisa:
#   - bucket S3 do estado do Terraform
#   - provedor OIDC do GitHub Actions
#   - role "terraform" (plan/apply/destroy) e role "deploy" (ECR + SSM, privilégio mínimo)
# O estado deste diretório é local (terraform.tfstate, ignorado pelo git) — guarde-o.

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "artur-dev"
}

variable "github_repository" {
  description = "Repositório que pode assumir as roles, no formato OWNER/REPO."
  type        = string
}

variable "terraform_role_policy_arn" {
  description = "Política anexada à role do Terraform. Ela cria IAM, EC2, S3, ECR e Secrets Manager; restrinja se quiser."
  type        = string
  default     = "arn:aws:iam::aws:policy/AdministratorAccess"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform-bootstrap"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  secret_arn = "arn:aws:secretsmanager:${var.aws_region}:${local.account_id}:secret:${var.project_name}/prod-*"
  ecr_repo   = "arn:aws:ecr:${var.aws_region}:${local.account_id}:repository/${var.project_name}"
  repo_claim = "repo:${var.github_repository}"
}

# ------------------------------------------------------------------ estado remoto

resource "aws_s3_bucket" "state" {
  bucket = "${var.project_name}-tfstate-${local.account_id}"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

# ------------------------------------------------------------------ GitHub OIDC

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "terraform_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # plan em PRs, jobs na main e jobs do environment "production" (apply/destroy).
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "${local.repo_claim}:pull_request",
        "${local.repo_claim}:ref:refs/heads/main",
        "${local.repo_claim}:environment:production",
      ]
    }
  }
}

resource "aws_iam_role" "terraform" {
  name               = "${var.project_name}-github-terraform"
  assume_role_policy = data.aws_iam_policy_document.terraform_trust.json
}

resource "aws_iam_role_policy_attachment" "terraform" {
  role       = aws_iam_role.terraform.name
  policy_arn = var.terraform_role_policy_arn
}

data "aws_iam_policy_document" "deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${local.repo_claim}:ref:refs/heads/main"]
    }
  }
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [local.ecr_repo]
  }

  # O build precisa de S3_PUBLIC_URL (embutido no next.config) e NEXT_PUBLIC_SITE_URL.
  statement {
    sid       = "ReadBuildConfig"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [local.secret_arn]
  }

  statement {
    sid       = "FindInstance"
    actions   = ["ec2:DescribeInstances", "ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
    resources = ["*"]
  }

  statement {
    sid       = "RunDeployDocument"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript"]
  }

  statement {
    sid       = "RunOnProjectInstance"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${var.aws_region}:${local.account_id}:instance/*"]

    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Project"
      values   = [var.project_name]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${var.project_name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.deploy_trust.json
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

# ------------------------------------------------------------------ saídas

output "state_bucket" {
  description = "Repo variable TF_STATE_BUCKET"
  value       = aws_s3_bucket.state.bucket
}

output "terraform_role_arn" {
  description = "Repo variable AWS_TERRAFORM_ROLE_ARN"
  value       = aws_iam_role.terraform.arn
}

output "deploy_role_arn" {
  description = "Repo variable AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.deploy.arn
}
