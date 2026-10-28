resource "aws_security_group" "app" {
  name        = "${var.project_name}-web"
  description = "HTTP/HTTPS publico. Sem SSH: o acesso administrativo e via SSM."
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP (Lets Encrypt e redirecionamento)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = { Name = var.project_name }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_instance" "app" {
  ami                    = nonsensitive(data.aws_ssm_parameter.al2023_arm64.value)
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    region        = var.aws_region
    project       = var.project_name
    secret_id     = local.secret_name
    site_address  = local.site_address
    acme_email    = var.acme_email
    backup_bucket = aws_s3_bucket.backups.bucket
    swap_size_mb  = var.swap_size_mb

    deploy_script_b64 = filebase64("${path.module}/files/artur-deploy.sh")
    backup_script_b64 = filebase64("${path.module}/files/artur-backup.sh")
  })

  # IMDSv2 obrigatório. O limite de 2 saltos deixa o container (rede bridge do Docker)
  # alcançar as credenciais da role, usadas pelo SDK para gravar no S3.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    encrypted             = true
    delete_on_termination = true
  }

  tags = { Name = var.project_name }

  # Trocar user_data ou a AMI recriaria a instância — e com ela o SQLite em /data.
  # Para aplicar essas mudanças de propósito: terraform apply -replace=aws_instance.app
  lifecycle {
    ignore_changes = [user_data, ami]
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
