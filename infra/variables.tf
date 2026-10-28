variable "aws_region" {
  description = "Região da AWS (N. Virginia)."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefixo dos recursos e valor da tag Project."
  type        = string
  default     = "artur-dev"
}

variable "instance_type" {
  description = "Tipo da instância (Graviton/ARM64)."
  type        = string
  default     = "t4g.nano"
}

variable "root_volume_size_gb" {
  description = "Tamanho do disco raiz (gp3). Guarda o SQLite em /data."
  type        = number
  default     = 16
}

variable "domain_name" {
  description = "Domínio do site (ex.: artur.dev). Vazio = HTTP puro pelo IP, sem HTTPS."
  type        = string
  default     = ""
}

variable "acme_email" {
  description = "E-mail para o Let's Encrypt (avisos de expiração). Só vale com domain_name."
  type        = string
  default     = ""
}

variable "swap_size_mb" {
  description = "Swap em arquivo: a t4g.nano só tem 512 MB de RAM."
  type        = number
  default     = 1024
}

variable "backup_retention_days" {
  description = "Por quantos dias manter os backups diários do SQLite."
  type        = number
  default     = 30
}

variable "force_destroy_buckets" {
  description = "Permite destruir os buckets (mídia e backups) mesmo com objetos dentro."
  type        = bool
  default     = false
}

variable "vpc_cidr" {
  description = "Bloco CIDR da VPC criada para o projeto."
  type        = string
  default     = "10.20.0.0/16"
}
