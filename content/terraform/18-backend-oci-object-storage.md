---
title: "Backend de State en OCI Object Storage (API S3-compatible)"
category: "terraform"
tags: ["backend", "state", "oci", "object-storage", "s3-compatible", "use_lockfile"]
keywords: ["backend oci terraform", "oci object storage state", "s3 compatible backend", "customer secret key", "skip_s3_checksum", "use_lockfile", "use_path_style", "NotImplemented aws chunked encoding", "aws-chunked oci", "backend s3 sin dynamodb", "state oci bucket", "endpoints s3 terraform", "backend local fallback"]
description: "Cómo usar OCI Object Storage como backend de Terraform vía la API S3-compatible: Customer Secret Keys, flags skip_* necesarios, locking con use_lockfile, el error de aws-chunked encoding y un root.hcl que elige backend remoto o local automáticamente."
---

# Backend en OCI Object Storage

OCI no tiene backend nativo en Terraform (más allá del backend `oci` reciente); lo habitual es el backend **`s3`** apuntando al endpoint S3-compatible de Object Storage.

## Requisitos

1. **Bucket** privado y versionado en un compartment del entorno.
2. **Customer Secret Key** (Identity → Users → *Customer Secret Keys*): par Access Key / Secret que imita credenciales de AWS.
3. **Namespace** del tenancy: `oci os ns get`.
4. Endpoint: `https://<namespace>.compat.objectstorage.<region>.oraclecloud.com`.

```ini
# ~/.aws/credentials (sí, de AWS: el backend s3 los lee de ahí)
[producto-qa]
aws_access_key_id = <customer-secret-key-access>
aws_secret_access_key = <customer-secret-key-secret>
```

---

## Configuración del backend

```hcl
terraform {
  backend "s3" {
    bucket   = "producto-tfstate-qa-sa-saopaulo-1"
    key      = "dc1/network/vcn-core/terraform.tfstate"
    region   = "sa-saopaulo-1"
    profile  = "producto-qa"
    shared_credentials_files = ["~/.aws/credentials"]

    endpoints      = { s3 = "https://<namespace>.compat.objectstorage.sa-saopaulo-1.oraclecloud.com" }
    use_path_style = true                 # OCI no soporta virtual-host style

    skip_credentials_validation = true    # no hay STS
    skip_metadata_api_check     = true    # no hay IMDS de AWS
    skip_region_validation      = true    # región no es de AWS
    skip_requesting_account_id  = true
    skip_s3_checksum            = true    # ← clave, ver abajo

    use_lockfile = true                   # lock con objeto .tflock (Terraform ≥ 1.10), sin DynamoDB
  }
}
```

| Flag | Por qué |
|------|---------|
| `use_path_style` | El endpoint de OCI espera `endpoint/bucket/key` |
| `skip_credentials_validation` / `skip_requesting_account_id` | Evitan llamadas a STS/IAM de AWS que no existen |
| `skip_region_validation` | Las regiones OCI no están en la lista de AWS |
| `skip_s3_checksum` | Evita el checksum trailer con `aws-chunked` encoding |
| `use_lockfile` | Locking sin DynamoDB (OCI no lo tiene) |

---

## El error de `aws-chunked`

```
Error: Failed to save state
NotImplemented: AWS chunked encoding not supported
```

Desde 2025 los SDK de AWS (y botocore/aws-cli) envían por defecto un **checksum trailer con `aws-chunked` encoding** en `PutObject`/`UploadPart`. OCI no lo implementa.

| Herramienta | Solución |
|-------------|----------|
| Terraform backend `s3` | `skip_s3_checksum = true` (versiones de Terraform que lo soportan) |
| Terraform viejo sin ese flag | Backend `local` para esa unit, o actualizar Terraform |
| aws-cli | `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` / `request_checksum_calculation = when_required` en `~/.aws/config` |
| Uploads grandes desde scripts | `rclone` (backend `s3`, provider `Other`), que usa su propio cliente y maneja multipart y reintentos |

Lecturas (`GetObject`, `ListObjects`) no se ven afectadas: `aws s3 ls/cp` desde OCI hacia local funciona.

```bash
# aws-cli contra OCI
aws s3 ls s3://<bucket>/ --endpoint-url https://<ns>.compat.objectstorage.<region>.oraclecloud.com --region <region>

# rclone sin archivo de config, solo env vars
export RCLONE_CONFIG_OCI_TYPE=s3
export RCLONE_CONFIG_OCI_PROVIDER=Other
export RCLONE_CONFIG_OCI_ENDPOINT=https://<ns>.compat.objectstorage.<region>.oraclecloud.com
export RCLONE_CONFIG_OCI_ACCESS_KEY_ID=...
export RCLONE_CONFIG_OCI_SECRET_ACCESS_KEY=...
rclone copyto backup.zip oci:<bucket>/carpeta/backup.zip --retries 5 --low-level-retries 10
```

---

## `root.hcl` que elige backend automáticamente

Si el `env.hcl` todavía tiene placeholders o no define bucket, usa backend local en vez de fallar:

```hcl
locals {
  _env_cfg  = try(read_terragrunt_config(find_in_parent_folders("env.hcl")), { locals = {} })
  _tfstate  = try(local._env_cfg.locals.tfstate, {})
  _bucket   = try(local._tfstate.bucket, "")
  _endpoint = try(local._tfstate.endpoint, "")
  _region   = try(local._env_cfg.locals.oci.region, "")
  _key      = replace("${path_relative_to_include()}/terraform.tfstate", "\\", "/")  # Windows-safe

  _backend_remote = <<-EOT
    terraform {
      backend "s3" {
        bucket                      = "${local._bucket}"
        key                         = "${local._key}"
        region                      = "${local._region}"
        profile                     = "${try(local._tfstate.aws_profile, "default")}"
        endpoints                   = { s3 = "${local._endpoint}" }
        use_path_style              = true
        skip_credentials_validation = true
        skip_metadata_api_check     = true
        skip_region_validation      = true
        skip_requesting_account_id  = true
        skip_s3_checksum            = true
        use_lockfile                = true
      }
    }
  EOT

  _backend_local = <<-EOT
    terraform {
      backend "local" {}
    }
  EOT

  _use_remote = local._bucket != "" && local._endpoint != "" && !strcontains(local._bucket, "TODO_")
}

generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite_terragrunt"
  contents  = local._use_remote ? local._backend_remote : local._backend_local
}
```

> `replace(..., "\\", "/")`: en Windows `path_relative_to_include()` devuelve barras invertidas y la key del objeto quedaría con `\`.

---

## Módulo del bucket de state

```hcl
data "oci_objectstorage_namespace" "this" {
  compartment_id = var.compartment_id
}

resource "oci_objectstorage_bucket" "tfstate" {
  compartment_id = var.compartment_id
  namespace      = data.oci_objectstorage_namespace.this.namespace
  name           = var.bucket_name
  access_type    = "NoPublicAccess"
  storage_tier   = "Standard"
  versioning     = "Enabled"
  freeform_tags  = merge(var.tags, { Name = var.bucket_name })

  lifecycle {
    prevent_destroy = true
  }
}
```

Bootstrap: la unit `object-storage-backend` corre primero con backend local (el bucket aún no existe); luego se completa `tfstate.bucket` en `env.hcl` y se migra:

```bash
cd live/qa/dc1/object-storage-backend
terragrunt apply                       # state local
# completar env.hcl → tfstate.bucket / endpoint
terragrunt init -migrate-state         # sube el state local al bucket
```

---

## ¿Remoto o local?

| Caso | Backend |
|------|---------|
| Equipo, CI, varios entornos | Remoto con lock |
| Un único operador, entorno efímero (prueba de DRP) | Local con `path = "${get_terragrunt_dir()}/terraform.tfstate"` + respaldo manual |
| Validación en CI sin credenciales | Local (fallback automático) |

Ver también [Disaster Recovery del state](/article/terraform/14-disaster-recovery/).
