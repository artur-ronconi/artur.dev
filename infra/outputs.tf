output "public_ip" {
  description = "IP elástico. Com domínio, crie um registro A apontando para ele."
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "Para abrir um shell sem SSH: aws ssm start-session --target <id>"
  value       = aws_instance.app.id
}

output "media_bucket" {
  description = "Valor de S3_BUCKET no segredo."
  value       = aws_s3_bucket.media.bucket
}

output "media_public_url" {
  description = "Valor de S3_PUBLIC_URL no segredo."
  value       = "https://${aws_s3_bucket.media.bucket_regional_domain_name}"
}

output "backup_bucket" {
  description = "Backups do SQLite (db/) e imagens de deploy (releases/)."
  value       = aws_s3_bucket.backups.bucket
}
