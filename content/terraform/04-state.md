---
title: "Terraform State: Backends, Import, Manipulación y Locks"
category: "terraform"
tags: ["state", "backend", "s3", "dynamodb", "import", "lock"]
keywords: ["terraform state", "backend s3 terraform", "dynamodb lock terraform", "terraform import", "state bloqueado", "force unlock terraform", "terraform state list", "terraform state mv", "terraform state rm", "migrar backend terraform", "remote state", "state corrupto", "importar recurso existente terraform", "state show"]
description: "Gestión del state file: configuración de backend remoto con S3+DynamoDB, importar recursos existentes, manipulación del state y resolución de locks."
---

# Terraform State

## Contenido

- [Backend remoto — S3 + DynamoDB](#backend-remoto-—-s3-+-dynamodb)
- [Otros backends](#otros-backends)
- [Comandos de manipulación del state](#comandos-de-manipulación-del-state)
- [Importar recursos existentes](#importar-recursos-existentes)
- [Resolver locks](#resolver-locks)
- [Refrescar el state contra la realidad](#refrescar-el-state-contra-la-realidad)
- [Migrar backend](#migrar-backend)
- [Workspaces](#workspaces)

---

El state file (`terraform.tfstate`) es la fuente de verdad de Terraform — mapea los recursos del código con los recursos reales en el proveedor. **Nunca editarlo a mano.**

---

## Backend remoto — S3 + DynamoDB

El backend por defecto es local (`terraform.tfstate`). En equipos siempre se usa remoto.

```hcl
# versions.tf
terraform {
  backend "s3" {
    bucket         = "mi-empresa-terraform-state"
    key            = "prod/main.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

Crear el bucket y la tabla (bootstrapping — solo una vez):

```bash
# Bucket con versionado y encriptación
aws s3api create-bucket \
  --bucket mi-empresa-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket mi-empresa-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket mi-empresa-terraform-state \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Tabla DynamoDB para locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## Otros backends

```hcl
# Terraform Cloud / HCP Terraform
terraform {
  cloud {
    organization = "mi-empresa"
    workspaces {
      name = "prod-infrastructure"
    }
  }
}

# Azure Blob Storage
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "miempresatfstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}

# GCS
terraform {
  backend "gcs" {
    bucket = "mi-empresa-terraform-state"
    prefix = "prod/main"
  }
}
```

---

## Comandos de manipulación del state

```bash
# Listar todos los recursos en el state
terraform state list

# Ver detalles completos de un recurso
terraform state show aws_instance.web
terraform state show 'module.networking.aws_vpc.main'

# Mover/renombrar un recurso en el state
terraform state mv aws_instance.old_name aws_instance.new_name

# Mover un recurso a un módulo
terraform state mv aws_instance.web 'module.compute.aws_instance.web'

# Mover recurso entre states (con -state-out)
terraform state mv \
  -state=./old.tfstate \
  -state-out=./new.tfstate \
  aws_instance.web aws_instance.web

# Eliminar un recurso del state SIN borrar el recurso real
terraform state rm aws_instance.temporal
terraform state rm 'module.compute.aws_instance.web[0]'
```

---

## Importar recursos existentes

Para recursos creados manualmente o fuera de Terraform:

### CLI (Terraform < 1.5)

```bash
terraform import aws_instance.web i-1234567890abcdef0
terraform import aws_s3_bucket.assets mi-bucket-nombre
terraform import 'aws_subnet.private[0]' subnet-abc123
terraform import 'module.networking.aws_vpc.main' vpc-xyz789
```

### Import block (Terraform >= 1.5 — recomendado)

```hcl
# import.tf
import {
  to = aws_instance.web
  id = "i-1234567890abcdef0"
}

import {
  to = aws_s3_bucket.assets
  id = "mi-bucket-nombre"
}
```

```bash
# Previsualizar qué código generaría Terraform para el recurso importado
terraform plan -generate-config-out=generated.tf

# Aplicar el import
terraform apply
```

---

## Resolver locks

Si un `apply` falló a mitad y dejó el lock colgado:

```bash
# El error muestra el Lock ID, o buscarlo en DynamoDB
terraform force-unlock LOCK_ID

# Si DynamoDB no libera el lock manualmente
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID":{"S":"mi-empresa-terraform-state/prod/main.tfstate"}}'
```

---

## Refrescar el state contra la realidad

```bash
# Ver qué cambió en la infra real sin aplicar nada
terraform plan -refresh-only

# Actualizar el state para que refleje la realidad actual (sin cambiar infra)
terraform apply -refresh-only
```

---

## Migrar backend

```bash
# Cambiar la configuración del backend en versions.tf, luego:
terraform init -migrate-state

# Copiar el state local a S3 sin perder nada
terraform init -migrate-state -backend-config="bucket=mi-nuevo-bucket"
```

---

## Workspaces

Permiten tener múltiples states dentro del mismo backend con el mismo código.

```bash
terraform workspace list
terraform workspace new staging
terraform workspace select prod
terraform workspace show           # workspace actual
terraform workspace delete staging
```

```hcl
# Usar el workspace en el código
resource "aws_instance" "web" {
  instance_type = terraform.workspace == "prod" ? "t3.medium" : "t3.micro"

  tags = {
    Environment = terraform.workspace
  }
}
```

En S3 el key queda como `env:/staging/prod/main.tfstate`.

> **Workspaces vs directorios:** Para entornos con configuraciones muy diferentes, preferir directorios separados. Workspaces es mejor cuando el código es casi idéntico y solo cambian algunos valores.
