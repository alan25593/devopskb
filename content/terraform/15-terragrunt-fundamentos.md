---
title: "Terragrunt: root.hcl, include, dependency, generate y run --all"
category: "terraform"
tags: ["terragrunt", "dry", "dependency", "remote-state", "generate", "run-all"]
keywords: ["terragrunt", "root.hcl", "terragrunt.hcl", "find_in_parent_folders", "path_relative_to_include", "get_terragrunt_dir", "dependency terragrunt", "mock_outputs", "generate provider terragrunt", "remote_state terragrunt", "run-all apply", "terragrunt run --all", "extra_arguments", "terragrunt-cache", "bootstrap backend terragrunt", "include expose"]
description: "Guía práctica de Terragrunt para estructurar infraestructura multi-entorno y multi-cliente: root.hcl con remote_state y providers generados, units con dependency y mock_outputs, extra_arguments, run --all y orden de bootstrap."
---

# Terragrunt Fundamentos

## Qué resuelve

Terraform puro obliga a repetir backend, provider e inputs comunes en cada directorio. Terragrunt agrega:

| Problema | Solución Terragrunt |
|----------|---------------------|
| Backend copiado en cada entorno | `remote_state` en un `root.hcl` con `key` derivada del path |
| Provider repetido | `generate "provider"` |
| Pasar outputs entre states | `dependency` |
| Aplicar 20 directorios en orden | `terragrunt run --all` con grafo de dependencias |
| Inputs comunes (proyecto, tags, AMIs) | `inputs` en `root.hcl` + `include` |

---

## Estructura multi-cliente

```text
terraform/
├── aws/
│   ├── modules/                       # Terraform puro, reutilizable, sin saber de entornos
│   │   ├── backend/                   # bucket de state + tabla de locks
│   │   ├── networking/                # VPC, subnets, NAT, SGs
│   │   ├── webserver/                 # EC2 Windows + IIS
│   │   ├── database/{mssql,oracle}/
│   │   ├── load-balancer/  waf/  dns/  wireguard/
│   └── partners/
│       ├── cliente-a/
│       │   ├── root.hcl               # state, región, AMIs, tags del cliente
│       │   ├── backend/terragrunt.hcl # bootstrap (state local)
│       │   ├── vpc/terragrunt.hcl     # red: 1 state
│       │   ├── wireguard/terragrunt.hcl
│       │   └── environments/<producto>/<env>/<componente>/terragrunt.hcl
│       └── cliente-b/ ...
└── oci/
    ├── modules/ (vcn, compute-instance, compute-instance-windows, ...)
    └── partners/...
```

**Una unit = un directorio con `terragrunt.hcl` = un state.** Separar red, base de datos, web, LB y WAF en states distintos reduce el radio de impacto de cada apply.

---

## `root.hcl`

```hcl
remote_state {
  backend = "s3"
  config = {
    bucket         = "cliente-a-tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks-table"
    # Cada unit tiene su key según su ruta: environments/pls/qa/web/terraform.tfstate
    key            = "${path_relative_to_include()}/terraform.tfstate"
  }
}

terraform {
  # Plan sin refresh opcional (validar sin consultar la nube)
  extra_arguments "plan_no_refresh" {
    arguments = get_env("TG_SKIP_REFRESH", "") == "1" ? ["-refresh=false"] : []
    commands  = ["plan"]
  }
}

inputs = {
  project_name  = "clientea"
  billing_tag   = "ClienteA"
  aws_region    = "us-east-1"
  key_pair_name = "devops"

  # AMIs centralizadas por cliente/región
  amis = {
    ubuntu_24    = "ami-xxxxxxxxxxxxxxxxx"
    windows_2022 = "ami-yyyyyyyyyyyyyyyyy"
  }
}
```

> Si los módulos declaran `backend "s3" {}` vacío, Terragrunt completa la config. Si Terragrunt **genera** el backend (`remote_state.generate`), el módulo **no** debe declararlo: `Duplicate 'backend' configuration block`.

---

## Unit típica

```hcl
# environments/pls/qa/web/terragrunt.hcl
locals {
  # "environments/pls/qa/web" → "environments-pls-qa-web": nombre único derivado del path
  env = replace(path_relative_to_include(), "/", "-")
}

include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true                  # permite leer include.root.inputs.*
}

terraform {
  source = "../../../../../../modules/webserver"
}

dependency "networking" {
  config_path = "../../../../vpc"

  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    public_subnet_id = "subnet-mock"
    public_sg_id     = "sg-mock"
  }
}

inputs = {
  environment      = local.env
  instance_type    = "t3.small"
  ami_id           = include.root.inputs.amis["windows_2022"]
  public_subnet_id = dependency.networking.outputs.public_subnet_id
  public_sg_id     = dependency.networking.outputs.public_sg_id
  custom_ports     = [9000, 9020]
}
```

### `dependency` y mocks

- Lee los **outputs del state** de otra unit (por eso los nombres de outputs son un contrato).
- `mock_outputs` permite `validate`/`plan` antes de que la dependencia exista.
- Restringir mocks con `mock_outputs_allowed_terraform_commands`: nunca dejar que un `apply` use un ID falso.
- Varias dependencias en una unit (ej. el LB depende de `web`, `cache` y `game-engine`): Terragrunt ordena el `run --all` según ese grafo.

---

## `generate`: provider y backend

```hcl
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "oci" {
  region = "sa-saopaulo-1"
}
EOF
}
```

Override de backend en una unit puntual (por ejemplo, state local para un único operador):

```hcl
remote_state {
  backend = "local"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    # get_terragrunt_dir() = la carpeta real, NO el directorio efímero de .terragrunt-cache
    path = "${get_terragrunt_dir()}/terraform.tfstate"
  }
}
```

> Sin `get_terragrunt_dir()`, un backend local escribe el state dentro de `.terragrunt-cache/…`, que se regenera: el state "desaparece".

---

## Comandos

```bash
# Una unit
cd environments/pls/qa/web
terragrunt init
terragrunt plan
terragrunt apply
terragrunt output -json

# Todas las units bajo el directorio actual, en orden de dependencias
terragrunt run --all -- plan
terragrunt run --all -- apply
terragrunt run --all -- destroy          # orden inverso

# Sin prompts (CI)
terragrunt run --all --non-interactive -- apply -input=false

# Grafo de dependencias
terragrunt dag graph | dot -Tpng > graph.png

# Formatear .hcl de Terragrunt
terragrunt hcl fmt
```

> Versiones viejas usan `terragrunt run-all apply` y flags `--terragrunt-*`. En Terragrunt ≥ 0.73 la forma es `terragrunt run --all -- <cmd>` y las variables `TG_*`.

---

## Bootstrap: el huevo y la gallina del backend

El bucket del state no puede guardarse en sí mismo antes de existir.

1. **`backend/`** — sin `include` de `root.hcl` (state local): crea bucket + tabla de locks.
   ```hcl
   terraform { source = "../../../modules/backend" }
   inputs = {
     bucket_name         = "cliente-a-tfstate"
     dynamodb_table_name = "terraform-locks-table"
     iam_principal_arn   = "arn:aws:iam::<ACCOUNT_ID>:user/terraform"
   }
   ```
2. **`vpc/`** — una sola vez por cliente.
3. **`wireguard/`** (acceso) y luego **`environments/...`**.

```bash
cd partners/cliente-a/backend && terragrunt apply
cd .. && terragrunt run --all -- apply
```

Despliegue manual por capas, de adentro hacia afuera, si se prefiere control:

| Orden | Units |
|-------|-------|
| 1 | `database`, `database-replica`, `master-cache`, `slave-cache` |
| 2 | `apm`, `game-engine` |
| 3 | `web` |
| 4 | `load-balancer`, `waf`, `dns` |

---

## `.gitignore` obligatorio

```gitignore
.terragrunt-cache/
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
tfplan*
backend.tf          # si se genera
provider.auto.tf
```

> Commitear `.terragrunt-cache` mete copias de los módulos (y a veces secretos renderizados) en el repo.

Siguiente: [Patrón _template / live](/article/terraform/16-terragrunt-template-live/).
