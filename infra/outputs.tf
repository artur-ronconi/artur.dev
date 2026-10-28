output "public_ip" {
  description = "IP elástico. Com domínio, crie um registro A apontando para ele."
  value       = aws_eip.app.public_ip
}

output "site_url" {
  value = local.site_url
}

output "instance_id" {
  description = "Para abrir um shell sem SSH: aws ssm start-session --target <id>"
  value       = aws_instance.app.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "secret_name" {
  description = "Segredo com as variáveis de ambiente (JSON)."
  value       = aws_secretsmanager_secret.app.name
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.bucket
}
