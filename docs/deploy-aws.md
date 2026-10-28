# Publicação na AWS (EC2 t4g.nano)

A aplicação roda numa única instância **t4g.nano** (ARM64, 512 MB de RAM) em **us-east-1**:

```
GitHub Actions ──(OIDC)──> ECR  ◄── docker pull ──┐
      │                                           │
      └──(SSM Run Command)──> EC2 t4g.nano ───────┘
                               ├─ Caddy  :80/:443  (HTTPS automático com domínio)
                               ├─ app    :3000     (Next.js standalone, ~140 MB de RAM)
                               ├─ /data/app.db     (SQLite)  ──backup diário──> S3 (backups)
                               └─ role da instância ──> Secrets Manager · S3 (mídia) · ECR
```

- **Sem SSH.** Não há porta 22; o acesso administrativo é por SSM
  (`aws ssm start-session --target <instance_id>`).
- **Variáveis de ambiente** ficam no Secrets Manager (`artur-dev/prod`, um JSON). A role da
  instância lê o segredo no deploy; nada é versionado no repositório.
- **Uploads do painel** vão para um bucket S3 (`STORAGE_DRIVER=s3`) usando as credenciais da role.
- **Swap de 1 GB** e limites de memória nos containers protegem os 512 MB de RAM.

## O que existe em `infra/`

| Arquivo | Conteúdo |
| --- | --- |
| `main.tf` | Security group (80/443), IP elástico e a instância |
| `iam.tf` | Role e instance profile da instância |
| `github.tf` | Role de deploy do GitHub Actions (OIDC, privilégio mínimo) |
| `secrets.tf` | Segredo com as variáveis de ambiente (já com `AUTH_SECRET` e senha do admin gerados) |
| `s3.tf` | Bucket de mídia (leitura pública só em `uploads/*`) e bucket de backups |
| `ecr.tf` | Repositório da imagem |
| `cloud-init.yaml.tftpl`, `files/` | Primeiro boot: Docker, swap, scripts `artur-deploy` e `artur-backup` |

Nada é executado na sua máquina: o Terraform roda só na pipeline. Antes, você cria **três coisas à
mão no console da AWS** (passo 1), porque a pipeline precisa delas para existir.

## 1. Pré-requisitos no console da AWS (região us-east-1)

Anote o **ID da conta** (12 dígitos, canto superior direito do console). Os nomes abaixo são fixos:
os workflows os montam a partir do ID da conta.

### 1.1 Bucket do estado do Terraform

**S3 → Create bucket**

- Nome: `artur-dev-tfstate-<ID_DA_CONTA>`, região **us-east-1**
- Block all public access: **ligado**
- Bucket Versioning: **Enable**
- Default encryption: SSE-S3 (padrão)

### 1.2 Provedor OIDC do GitHub

**IAM → Identity providers → Add provider**

- Provider type: **OpenID Connect**
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### 1.3 Role do Terraform

**IAM → Roles → Create role → Custom trust policy**, cole (troque `<ID_DA_CONTA>`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ID_DA_CONTA>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:artur-ronconi/artur.dev:pull_request",
            "repo:artur-ronconi/artur.dev:ref:refs/heads/main",
            "repo:artur-ronconi/artur.dev:environment:production"
          ]
        }
      }
    }
  ]
}
```

- Permissions: **AdministratorAccess** (o stack cria IAM, EC2, S3, ECR e Secrets Manager; dá para
  trocar por uma política mais restrita depois)
- Role name: **`artur-dev-github-terraform`** (exatamente esse nome)

A role de **deploy** (`artur-dev-github-deploy`) você **não** cria: o próprio Terraform a cria no
`apply`, com privilégio mínimo e válida só para a branch `main`.

## 2. Configurar o repositório no GitHub

**Settings → Secrets and variables → Actions → Variables** (não há secrets)

| Variável | Valor |
| --- | --- |
| `AWS_ACCOUNT_ID` | ID da conta (12 dígitos) |
| `ADMIN_EMAIL` | e-mail do primeiro administrador |
| `DOMAIN_NAME` | *(opcional)* domínio do site, ex.: `artur.dev` |
| `ACME_EMAIL` | *(opcional)* e-mail para o Let's Encrypt |

**Settings → Environments → New environment → `production`**: adicione a si mesmo em *Required
reviewers*. Os jobs `apply` e `destroy` esperam essa aprovação.

## 3. Criar a infraestrutura

**Actions → Terraform → Run workflow**

1. `action: plan` — confira o resumo do plano.
2. `action: apply` — aprove o environment `production`. Ao final o resumo mostra `public_ip`,
   `instance_id` e o nome do segredo.

Se usar domínio, crie um registro **A** apontando para o `public_ip` (o IP é elástico: não muda).
Sem domínio, o site responde em `http://<public_ip>` (sem HTTPS).

## 4. Primeiro deploy

O deploy é **sempre manual**: **Actions → Deploy → Run workflow** (branch `main`). Fazer push não publica nada. O workflow:

1. roda typecheck, lint e testes;
2. constrói a imagem `linux/arm64` num runner ARM nativo e publica no ECR (`<sha>` e `latest`);
3. executa `artur-deploy <sha>` na instância via SSM: lê o segredo, puxa a imagem, aplica as
   migrations, cria o administrador (se ainda não existir) e troca o container.

A senha inicial do administrador foi gerada pelo Terraform. Leia-a no console
(**Secrets Manager → `artur-dev/prod` → Retrieve secret value**) ou no CloudShell:

```bash
aws secretsmanager get-secret-value --secret-id artur-dev/prod \
  --query SecretString --output text | jq -r '.ADMIN_EMAIL, .ADMIN_PASSWORD'
```

Entre em `/admin`, troque a senha em `/admin/conta` (redeploys **não** a sobrescrevem) e cadastre o
conteúdo. Para carregar o conteúdo de demonstração inicial, uma vez:

```bash
aws ssm start-session --target <instance_id>
sudo docker exec app node dist-scripts/seed.cjs
```

## Alterar variáveis de ambiente

Os comandos `aws` deste guia rodam no **AWS CloudShell** (ícone no topo do console), sem instalar nada. As variáveis também podem ser editadas no console: **Secrets Manager → `artur-dev/prod` → Retrieve secret value → Edit**.

Edite o segredo e faça um novo deploy (as variáveis só são lidas no deploy):

```bash
aws secretsmanager get-secret-value --secret-id artur-dev/prod --query SecretString --output text > /tmp/s.json
# edite /tmp/s.json
aws secretsmanager put-secret-value --secret-id artur-dev/prod --secret-string file:///tmp/s.json
shred -u /tmp/s.json
```

Depois, **Actions → Deploy → Run workflow**. O Terraform não sobrescreve o segredo depois de criado
(`ignore_changes`). Se você mudar o domínio no Terraform, atualize `NEXT_PUBLIC_SITE_URL` no segredo.

## Backup e restauração

Um timer systemd (`artur-backup.timer`, 05:00 UTC) envia `app.db` compactado para
`s3://artur-dev-backups-<conta>/db/app-AAAA-MM-DD.db.gz`, com retenção de 30 dias.

Restaurar (na instância, via SSM):

```bash
aws s3 cp s3://<bucket-de-backups>/db/app-AAAA-MM-DD.db.gz /tmp/app.db.gz
sudo docker stop app
gunzip -c /tmp/app.db.gz | sudo tee /data/app.db >/dev/null
sudo chown 1001:1001 /data/app.db
sudo docker start app
```

## Destruir

**Actions → Terraform → Run workflow** com `action: destroy`, `confirm: destroy` e aprovação do
environment `production`.

- Destruir **apaga o disco da instância e, com ele, o SQLite**. Os backups continuam no S3.
- Os buckets de mídia e de backups só são removidos se estiverem vazios. Marque `delete_buckets`
  para apagá-los mesmo com objetos (irreversível).
- O segredo é removido sem janela de recuperação.

## Observações

- **Mudanças em `cloud-init`/`files/` não recriam a instância** (`ignore_changes = [user_data, ami]`),
  para não perder o SQLite sem querer. Para aplicá-las de propósito:
  **Actions → Terraform → Run workflow** com `action: apply` e `replace_instance` marcado, e restaure o último backup.
- **Memória:** a imagem usa ~140 MB em repouso; os containers têm limite (app 400 MB, Caddy 96 MB)
  e o heap do Node é limitado a 256 MB. O Next só gera imagens em WebP (sem AVIF) para poupar CPU.
- **Build:** nunca na instância. O `next build` precisa de bem mais que 512 MB; o workflow
  `deploy.yml` constrói num runner ARM do GitHub (`ubuntu-24.04-arm`).
- **Downtime:** o deploy recria o container (alguns segundos de indisponibilidade). Se o health
  check falhar, o workflow termina com erro e mostra os últimos logs.
- **Sessões e tráfego:** o SQLite é suficiente para um único administrador; não há réplicas nem
  balanceador.
