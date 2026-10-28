terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }

  # Estado remoto no S3 (criado à mão no console: docs/deploy-aws.md). O bucket é informado na hora:
  #   terraform init -backend-config="bucket=<bucket-de-estado>"
  backend "s3" {
    key          = "artur-dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}
