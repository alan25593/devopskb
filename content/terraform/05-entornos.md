---
title: "Terraform: Gestión de Entornos y Separación de Estado"
category: "terraform"
tags: ["entornos", "workspaces", "dev", "staging", "prod", "estructura"]
keywords: ["multiples entornos terraform", "separar dev staging prod", "terraform por entorno", "workspace vs directorio", "tfvars por entorno", "estado separado por entorno", "ambiente terraform", "promote terraform", "estructura multi entorno", "backend por entorno"]
description: "Estrategias para gestionar múltiples entornos (dev/staging/prod) con Terraform: directorios separados, workspaces, backends independientes y promoción de cambios entre entornos."
---

# Gestión de Entornos en Terraform

## Contenido

- [Estrategia A — Directorios separados (recomendada)](#estrategia-a-—-directorios-separados-recomendada)
- [Estrategia B — Workspaces](#estrategia-b-—-workspaces)
- [tfvars por entorno](#tfvars-por-entorno)
- [Cuentas AWS separadas por entorno](#cuentas-aws-separadas-por-entorno)
- [Flujo de promoción entre entornos](#flujo-de-promoción-entre-entornos)
- [Proteger recursos en producción](#proteger-recursos-en-producción)

---

Hay dos estrategias principales. La elección depende de cuán diferentes son los entornos entre sí.

---

## Estrategia A — Directorios separados (recomendada)

Un directorio por entorno = un state file independiente. Total aislamiento.

```
infra/
├── modules/
│   ├── networking/
│   ├── compute/
│   └── database/
│
└── environments/
    ├── dev/
    │   ├── main.tf           # llama módulos
    │   ├── versions.tf       # backend apunta a dev
    │   ├── variables.tf
    │   └── dev.auto.tfvars   # valores para dev
    ├── staging/
    │   ├── main.tf
    │   ├── versions.tf
    │   ├── variables.tf
    │   └── staging.auto.tfvars
    └── prod/
        ├── main.tf
        ├── versions.tf
        ├── variables.tf
        └── prod.auto.tfvars
```

Cada entorno tiene su propio backend:

```hcl
# environments/prod/versions.tf
terraform {
  backend "s3" {
    bucket = "mi-empresa-tfstate"
    key    = "environments/prod/main.tfstate"   # key diferente por entorno
    region = "us-east-1"
  }
}

# environments/dev/versions.tf
terraform {
  backend "s3" {
    bucket = "mi-empresa-tfstate"
    key    = "environments/dev/main.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Operar en dev
cd environments/dev
terraform init && terraform plan

# Operar en prod
cd environments/prod
terraform init && terraform plan
```

### Ventajas

- Un blast radius acotado — un `destroy` en dev no toca prod
- Permite diferencias grandes entre entornos (distintos módulos, distintos recursos)
- Historial del state por separado

---

## Estrategia B — Workspaces

Mismo código, mismo backend, distintos states. Útil cuando dev/staging/prod son casi idénticos.

```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

terraform workspace select prod
terraform plan -var-file="prod.tfvars"
```

```hcl
locals {
  instance_count = {
    dev     = 1
    staging = 1
    prod    = 3
  }

  instance_type = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}

resource "aws_instance" "app" {
  count         = local.instance_count[terraform.workspace]
  instance_type = local.instance_type[terraform.workspace]
}
```

### Cuándo NO usar workspaces

- Entornos con recursos muy diferentes (dev no tiene RDS, prod sí)
- Distintas cuentas AWS por entorno (la forma correcta para prod)
- Equipos grandes donde se necesita RBAC por entorno

---

## tfvars por entorno

```hcl
# variables.tf — declaración
variable "environment"     { type = string }
variable "instance_type"   { type = string }
variable "db_instance_class" { type = string }
variable "min_capacity"    { type = number }
variable "max_capacity"    { type = number }
variable "enable_deletion_protection" { type = bool }
```

```hcl
# dev.tfvars
environment                = "dev"
instance_type              = "t3.micro"
db_instance_class          = "db.t3.micro"
min_capacity               = 1
max_capacity               = 2
enable_deletion_protection = false
```

```hcl
# prod.tfvars
environment                = "prod"
instance_type              = "t3.large"
db_instance_class          = "db.r6g.large"
min_capacity               = 3
max_capacity               = 10
enable_deletion_protection = true
```

---

## Cuentas AWS separadas por entorno

La forma más segura: cada entorno en una cuenta AWS diferente.

```hcl
# provider.tf
provider "aws" {
  alias  = "dev"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
  }
}

provider "aws" {
  alias  = "prod"
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::999999999999:role/TerraformRole"
  }
}

module "dev_infra" {
  source    = "../../modules/app"
  providers = { aws = aws.dev }
}

module "prod_infra" {
  source    = "../../modules/app"
  providers = { aws = aws.prod }
}
```

---

## Flujo de promoción entre entornos

```bash
# 1. Aplicar en dev primero
cd environments/dev
terraform apply -var-file="dev.tfvars"

# 2. Validar manualmente o con tests (Terratest)

# 3. Promover a staging
cd environments/staging
terraform apply -var-file="staging.tfvars"

# 4. Validar staging

# 5. Aplicar en prod con plan guardado
cd environments/prod
terraform plan -out=tfplan -var-file="prod.tfvars"
# revisar el plan
terraform apply tfplan
```

---

## Proteger recursos en producción

```hcl
resource "aws_db_instance" "prod" {
  # ...
  lifecycle {
    prevent_destroy = true      # terraform destroy falla hasta que se quite esto
  }
}

resource "aws_s3_bucket" "assets" {
  # ...
  lifecycle {
    prevent_destroy = true
  }
}
```

```hcl
# También a nivel de backend — policies de S3 para bloquear delete del state
resource "aws_s3_bucket_policy" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  policy = jsonencode({
    Statement = [{
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:DeleteObject"
      Resource  = "${aws_s3_bucket.tfstate.arn}/*"
      Condition = {
        StringNotEquals = {
          "aws:PrincipalArn" = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
      }
    }]
  })
}
```
