# ------------------------------------------------------------- mídia (uploads do painel)

resource "aws_s3_bucket" "media" {
  bucket        = local.media_bucket
  force_destroy = var.force_destroy_buckets
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false # leitura pública só do prefixo uploads/ (policy abaixo)
  restrict_public_buckets = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "media_public_read" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadUploads"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.media.arn}/uploads/*"
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.media]
}

# --------------------------------------- backups do SQLite (db/) e imagens de deploy (releases/)

resource "aws_s3_bucket" "backups" {
  bucket        = local.backup_bucket
  force_destroy = var.force_destroy_buckets
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    filter {
      prefix = "db/"
    }

    expiration {
      days = var.backup_retention_days
    }
  }

  # Imagens de deploy (tar.gz) só precisam existir até a instância carregá-las.
  rule {
    id     = "expire-releases"
    status = "Enabled"

    filter {
      prefix = "releases/"
    }

    expiration {
      days = 7
    }
  }
}
