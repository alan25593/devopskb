---
title: "Terraform Complementos: Terragrunt, Infracost, tfenv, OpenTofu y más"
category: "terraform"
tags: ["terragrunt", "infracost", "tfenv", "opentofu", "tfsec", "terratest"]
keywords: ["terragrunt", "infracost", "tfenv", "opentofu", "terratest", "costo infraestructura terraform", "version terraform", "DRY terraform", "terraform testing", "alternativa terraform", "instalar version terraform", "estimar costo cloud", "pruebas infraestructura", "herramientas terraform", "complementos terraform"]
description: "Herramientas que potencian Terraform: Terragrunt para eliminar repetición, Infracost para estimar costos, tfenv para manejar versiones, OpenTofu como fork open-source y Terratest para tests de infraestructura."
---

# Complementos de Terraform

## Contenido

- [tfenv — gestión de versiones de Terraform](#tfenv-—-gestión-de-versiones-de-terraform)
- [Terragrunt — DRY para Terraform](#terragrunt-—-dry-para-terraform)
- [Infracost — estimación de costos antes del apply](#infracost-—-estimación-de-costos-antes-del-apply)
- [OpenTofu — el fork open-source de Terraform](#opentofu-—-el-fork-open-source-de-terraform)
- [Terratest — tests de infraestructura](#terratest-—-tests-de-infraestructura)
- [Resumen: cuándo usar cada herramienta](#resumen-cuándo-usar-cada-herramienta)

---

## tfenv — gestión de versiones de Terraform

Como nvm para Node o pyenv para Python. Permite tener múltiples versiones de Terraform instaladas y cambiar entre ellas por proyecto.

```bash
# Instalar tfenv
brew install tfenv          # Mac
git clone https://github.com/tfutils/tfenv.git ~/.tfenv   # Linux

# Ver versiones disponibles
tfenv list-remote

# Instalar una versión específica
tfenv install 1.7.0
tfenv install 1.6.6
tfenv install latest

# Seleccionar versión activa globalmente
tfenv use 1.7.0

# Seleccionar versión por proyecto (crea archivo .terraform-version)
echo "1.7.0" > .terraform-version
tfenv use

# Ver versiones instaladas
tfenv list

# Desinstalar
tfenv uninstall 1.5.0
```

Cuando tenés `.terraform-version` en el repo, cualquier integrante que use tfenv automáticamente usa la versión correcta.

---

## Terragrunt — DRY para Terraform

Terragrunt es un wrapper de Terraform que elimina la repetición de backends, providers y configuraciones comunes entre múltiples módulos/entornos.

### El problema que resuelve

Sin Terragrunt, cada entorno tiene un `versions.tf` casi idéntico:

```hcl
# copy-paste en dev/versions.tf, staging/versions.tf, prod/versions.tf
terraform {
  backend "s3" {
    bucket         = "mi-empresa-tfstate"
    key            = "environments/prod/main.tfstate"   # solo cambia esto
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

### Solución con Terragrunt

```
infra/
├── terragrunt.hcl              # configuración raíz compartida
└── environments/
    ├── dev/
    │   ├── terragrunt.hcl      # solo overrides de dev
    │   └── networking/
    │       └── terragrunt.hcl
    ├── staging/
    └── prod/
        ├── terragrunt.hcl
        └── networking/
            └── terragrunt.hcl
```

```hcl
# terragrunt.hcl (raíz)
locals {
  account_id  = get_aws_account_id()
  region      = "us-east-1"
  environment = basename(get_terragrunt_dir())
}

remote_state {
  backend = "s3"
  config = {
    bucket         = "mi-empresa-${local.account_id}-tfstate"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = local.region
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite"
  contents  = <<EOF
provider "aws" {
  region = "${local.region}"
}
EOF
}
```

```hcl
# environments/prod/networking/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules//networking"
}

inputs = {
  vpc_cidr           = "10.0.0.0/16"
  environment        = "prod"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

```bash
# Comandos Terragrunt (equivalentes a Terraform)
terragrunt plan
terragrunt apply
terragrunt destroy

# Ejecutar en todos los módulos de un directorio
terragrunt run-all plan
terragrunt run-all apply

# Ver el grafo de dependencias
terragrunt graph-dependencies
```

### Dependencias entre módulos

```hcl
# environments/prod/compute/terragrunt.hcl
dependency "networking" {
  config_path = "../networking"

  mock_outputs = {
    vpc_id             = "vpc-mock"
    private_subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}

inputs = {
  vpc_id     = dependency.networking.outputs.vpc_id
  subnet_ids = dependency.networking.outputs.private_subnet_ids
}
```

---

## Infracost — estimación de costos antes del apply

Muestra el costo estimado de los cambios de infraestructura en el Pull Request, antes de aplicarlos.

```bash
# Instalar
brew install infracost

# Autenticación (registro gratuito)
infracost auth login

# Estimar costo del directorio actual
infracost breakdown --path .

# Comparar costo antes y después de un cambio
infracost diff --path . --compare-to infracost-base.json

# Formato tabla en terminal
infracost breakdown --path . --format table

# JSON para CI
infracost breakdown --path . --format json --out-file infracost.json
```

### GitHub Actions con Infracost

```yaml
- name: Setup Infracost
  uses: infracost/actions/setup@v2
  with:
    api-key: ${{ secrets.INFRACOST_API_KEY }}

- name: Generate Infracost baseline (main branch)
  run: infracost breakdown --path . --format json --out-file /tmp/infracost-base.json
  env:
    INFRACOST_TERRAFORM_WORKSPACE: prod

- name: Generate Infracost diff
  run: infracost diff --path . --format json --compare-to /tmp/infracost-base.json --out-file /tmp/infracost-diff.json

- name: Post Infracost comment
  run: infracost comment github --path /tmp/infracost-diff.json --repo $GITHUB_REPOSITORY --pull-request $PR_NUMBER --github-token $GITHUB_TOKEN --behavior update
```

El PR muestra algo como:
```
Monthly cost will increase by $127.50 (+18%)

  aws_instance.web          $45.00 → $90.00 (+$45.00)  t3.micro → t3.medium
  aws_db_instance.main      $82.50 → $165.00 (+$82.50) db.t3.small → db.t3.medium
```

---

## OpenTofu — el fork open-source de Terraform

Tras el cambio de licencia de Terraform a BSL en 2023, la comunidad creó OpenTofu (fork de Terraform 1.5.x) bajo la Linux Foundation con licencia MPL-2.0.

```bash
# Instalar con tfenv (soporta OpenTofu desde v0.24)
TFENV_TERRAFORM_VERSION=opentofu-1.7.0 tfenv install

# O instalar directamente con tofu
brew install opentofu

# Uso idéntico a Terraform
tofu init
tofu plan
tofu apply
```

**Compatibilidad:** OpenTofu 1.x es compatible con Terraform 1.5.x. Módulos y providers funcionan igual. Si estás evaluando migrar, es drop-in para la mayoría de los casos.

---

## Terratest — tests de infraestructura

Framework en Go para escribir tests de integración que realmente despliegan y validan infraestructura.

```go
// test/vpc_test.go
package test

import (
  "testing"
  "github.com/gruntwork-io/terratest/modules/terraform"
  "github.com/gruntwork-io/terratest/modules/aws"
  "github.com/stretchr/testify/assert"
)

func TestVPCModule(t *testing.T) {
  t.Parallel()

  opts := &terraform.Options{
    TerraformDir: "../modules/networking",
    Vars: map[string]interface{}{
      "vpc_cidr":           "10.99.0.0/16",
      "environment":        "test",
      "availability_zones": []string{"us-east-1a"},
    },
  }

  // destroy al terminar el test
  defer terraform.Destroy(t, opts)

  terraform.InitAndApply(t, opts)

  vpcID     := terraform.Output(t, opts, "vpc_id")
  subnetIDs := terraform.OutputList(t, opts, "private_subnet_ids")

  assert.NotEmpty(t, vpcID)
  assert.Equal(t, 1, len(subnetIDs))

  // Validar en AWS directamente
  vpc := aws.GetVpcById(t, vpcID, "us-east-1")
  assert.Equal(t, "10.99.0.0/16", aws.GetTagValue(vpc, "Name"))
}
```

```bash
# Correr tests (despliega infra real en AWS)
go test -v -timeout 30m ./test/...

# Solo un test específico
go test -v -timeout 30m -run TestVPCModule ./test/...
```

---

## Resumen: cuándo usar cada herramienta

| Herramienta | Para qué |
|---|---|
| **tfenv** | Manejar múltiples versiones de Terraform en el mismo equipo |
| **Terragrunt** | Eliminar copy-paste de backend/provider en proyectos con muchos entornos o módulos |
| **Infracost** | Visibilidad de costos en PRs antes de aprobar cambios de infra |
| **tflint** | Detectar errores de configuración y convenciones antes del plan |
| **checkov / tfsec** | Análisis de seguridad y compliance en el pipeline |
| **Terratest** | Tests de integración que validan que la infra realmente funciona |
| **OpenTofu** | Alternativa open-source si la licencia BSL es un problema |
