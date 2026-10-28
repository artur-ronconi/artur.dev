# Publicação na AWS (EC2 t4g.nano)

A aplicação roda numa única instância **t4g.nano** (ARM64, 512 MB de RAM) em **us-east-1**:

```
GitHub Actions ──(chaves IAM)──> S3 (releases/<imagem>.tar.gz)
      │                                  │
      └──(SSM Run Command)──> EC2 t4g.nano ◄── docker load
                               ├─ Caddy  :80/:443  (HTTPS automático com domínio)
                               ├─ app    :3000     (Next.js standalone, ~140 MB de RAM)
                               ├─ /data/app.db     (SQLite)  ──backup diário──> S3 (db/)
                               └─ role da instância ──> Secrets Manager · S3
```

- **Sem SSH.** Não há porta 22; o acesso administrativo é por SSM
  (`aws ssm start-session --target <instance_id>`).
- **Sem registry (ECR).** A imagem é construída no GitHub e enviada como arquivo para o S3; a
  instância a carrega com `docker load`.
- **Variáveis de ambiente** ficam num segredo do Secrets Manager (`artur-dev/prod`, um JSON) que
  **você cria à mão**. A role da instância o lê no deploy; nada é versionado no repositório.
- **Uploads do painel** vão para um bucket S3 (`STORAGE_DRIVER=s3`) usando as credenciais da role.
- **Swap de 1 GB** e limites de memória nos containers protegem os 512 MB de RAM.

## O que o Terraform cria (`infra/`)

| Arquivo | Conteúdo |
| --- | --- |
| `main.tf` | Security group (80/443), IP elástico e a instância (na VPC e subnet padrão) |
| `iam.tf` | Role e instance profile da instância (lê o segredo, usa o S3, aceita SSM) |
| `s3.tf` | Bucket de **mídia** (leitura pública só em `uploads/*`) e bucket de **backups/releases** |
| `cloud-init.yaml.tftpl`, `files/` | Primeiro boot: Docker, swap, scripts `artur-deploy` e `artur-backup` |

Nada é executado na sua máquina: o Terraform roda só na pipeline. Antes, você cria **três coisas à
mão no console da AWS** (passo 1) e cadastra as chaves no GitHub (passo 2).

## 1. Criar no console da AWS (região us-east-1)

Anote o **ID da conta** (12 dígitos, canto superior direito do console). Os nomes abaixo são fixos.

### 1.1 Bucket do estado do Terraform

**S3 → Create bucket**

- Nome: **`artur-dev-tfstate-<ID_DA_CONTA>`**, região **us-east-1**
- Block all public access: **ligado**
- Bucket Versioning: **Enable**
- Default encryption: SSE-S3 (padrão)

### 1.2 Usuário IAM da pipeline

**IAM → Users → Create user**

- Nome: `artur-dev-github` (sem acesso ao console)
- Permissions: anexe **AdministratorAccess** (o stack cria IAM, EC2, S3 e security group)
- Depois de criado: **Security credentials → Create access key → Application running outside AWS**
  e copie o *Access key ID* e o *Secret access key* (o segredo só aparece agora)

> Essas chaves valem para os dois workflows (Terraform e Deploy) e dão poder total sobre a conta.
> Por isso: use uma conta AWS dedicada ao projeto, gire a chave de tempos em tempos e, se quiser,
> troque o AdministratorAccess por uma política restrita a IAM, EC2, S3, SSM e Secrets Manager.

### 1.3 Segredo com as variáveis de ambiente

**Secrets Manager → Store a new secret**

- Secret type: **Other type of secret** → aba **Plaintext**
- Secret name: **`artur-dev/prod`** (exatamente esse nome, na região us-east-1)
- Encryption key: `aws/secretsmanager` (padrão)
- Rotation: desligada

Conteúdo (JSON) — troque os valores entre `< >`:

```json
{
  "DATABASE_URL": "file:/data/app.db",
  "AUTH_SECRET": "<32+ caracteres aleatórios>",
  "SESSION_TTL_DAYS": "7",
  "NEXT_PUBLIC_SITE_URL": "<https://seu-dominio  ou  http://IP_ELASTICO>",
  "STORAGE_DRIVER": "s3",
  "S3_BUCKET": "artur-dev-media-<ID_DA_CONTA>",
  "S3_REGION": "us-east-1",
  "S3_PUBLIC_URL": "https://artur-dev-media-<ID_DA_CONTA>.s3.us-east-1.amazonaws.com",
  "ADMIN_EMAIL": "<seu e-mail>",
  "ADMIN_NAME": "<seu nome>",
  "ADMIN_PASSWORD": "<senha inicial: 10+ caracteres, com maiúscula, minúscula e número>"
}
```

| Chave | Observação |
| --- | --- |
| `AUTH_SECRET` | Gere no CloudShell: `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | Com domínio: `https://artur.dev`. Sem domínio, use `http://<public_ip>` (o IP só é conhecido depois do `apply`; edite o segredo então) |
| `S3_BUCKET`, `S3_PUBLIC_URL` | O bucket de mídia é criado pelo Terraform com o nome `artur-dev-media-<ID_DA_CONTA>` |
| `ADMIN_*` | Usados só para criar o primeiro administrador (se ainda não existir) |

O segredo precisa existir **antes do primeiro deploy** (não antes do `apply`).

## 2. Configurar o repositório no GitHub

**Settings → Secrets and variables → Actions**

Aba **Secrets** (*New repository secret*):

| Secret | Valor |
| --- | --- |
| `TERRAFORM_AWS_ACCESS_KEY_ID` | Access key ID do usuário `artur-dev-github` |
| `TERRAFORM_AWS_ACCESS_SECRET_KEY` | Secret access key do mesmo usuário |

Aba **Variables**:

| Variável | Valor |
| --- | --- |
| `DOMAIN_NAME` | *(opcional)* domínio do site, ex.: `artur.dev` |
| `ACME_EMAIL` | *(opcional)* e-mail para o Let's Encrypt |

As chaves precisam ser **secrets**, não variáveis: variáveis não são mascaradas nos logs.

**Settings → Environments → New environment → `production`**: adicione a si mesmo em *Required
reviewers*. Os jobs `apply` e `destroy` esperam essa aprovação.

## 3. Criar a infraestrutura

**Actions → Terraform → Run workflow**

1. `action: plan` — confira o resumo do plano.
2. `action: apply` — aprove o environment `production`. Ao final o resumo mostra `public_ip`,
   `instance_id`, `media_bucket` e `backup_bucket`.

Se usar domínio, crie um registro **A** (Route 53 ou onde estiver o DNS) apontando para o
`public_ip` — o IP é elástico e não muda. Sem domínio, o site responde em `http://<public_ip>`
(sem HTTPS); nesse caso ajuste `NEXT_PUBLIC_SITE_URL` no segredo.

> Defina `DOMAIN_NAME` **antes do primeiro `apply`**. Trocá-lo depois exige recriar a instância
> (o Caddy lê o domínio do `user_data`): `apply` com `replace_instance`.

## 4. Deploy

O deploy é **sempre manual**: **Actions → Deploy → Run workflow** (branch `main`). Fazer push não
publica nada. O workflow:

1. roda typecheck, lint e testes;
2. constrói a imagem `linux/arm64` num runner ARM nativo e a envia ao S3
   (`releases/artur-dev-<sha>.tar.gz`, expira em 7 dias);
3. executa `artur-deploy <sha>` na instância via SSM: lê o segredo, carrega a imagem, aplica as
   migrations, cria o administrador (se ainda não existir) e troca o container.

Entre em `/admin` com `ADMIN_EMAIL`/`ADMIN_PASSWORD` do segredo, troque a senha em `/admin/conta`
(redeploys **não** a sobrescrevem) e cadastre o conteúdo. Para carregar o conteúdo de demonstração
inicial, uma vez (no CloudShell):

```bash
aws ssm start-session --target <instance_id>
sudo docker exec app node dist-scripts/seed.cjs
```

## Alterar variáveis de ambiente

Os comandos `aws` deste guia rodam no **AWS CloudShell** (ícone no topo do console), sem instalar
nada. Edite o segredo em **Secrets Manager → `artur-dev/prod` → Retrieve secret value → Edit** e
rode **Actions → Deploy → Run workflow** (as variáveis só são lidas no deploy).

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
- O segredo `artur-dev/prod`, o bucket de estado e o usuário IAM **não** são do Terraform: apague-os
  à mão no console se quiser remover tudo.

## Observações

- **Mudanças em `cloud-init`/`files/` não recriam a instância** (`ignore_changes = [user_data, ami]`),
  para não perder o SQLite sem querer. Para aplicá-las de propósito:
  **Actions → Terraform → Run workflow** com `action: apply` e `replace_instance` marcado, e
  restaure o último backup. Depois rode o Deploy.
- **Memória:** a imagem usa ~140 MB em repouso; os containers têm limite (app 400 MB, Caddy 96 MB)
  e o heap do Node é limitado a 256 MB. O Next só gera imagens em WebP (sem AVIF) para poupar CPU.
- **Build:** nunca na instância. O `next build` precisa de bem mais que 512 MB; o workflow
  `deploy.yml` constrói num runner ARM do GitHub (`ubuntu-24.04-arm`).
- **Downtime:** o deploy recria o container (alguns segundos de indisponibilidade). Se o health
  check falhar, o workflow termina com erro e mostra os últimos logs.
- **Sessões e tráfego:** o SQLite é suficiente para um único administrador; não há réplicas nem
  balanceador.
