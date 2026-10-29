---
title: "Testing en Terraform: terraform test, mocks y validación sin costo"
category: "terraform"
tags: ["testing", "terraform-test", "mock", "validate", "terragrunt"]
keywords: ["terraform test", "tftest.hcl", "mock_provider", "override_resource", "testear modulo terraform", "run block assert", "command plan test", "validar sin crear recursos", "terragrunt validate", "mock_outputs", "plan sin refresh", "TG_SKIP_REFRESH", "backend local para validar"]
description: "Estrategia de testing para Terraform y Terragrunt: validate, plan sin refresh y con backend local para validar sin tocar la nube, terraform test con assert, mock_provider y overrides."
---

# Testing en Terraform

## Pirámide de validación

| Nivel | Comando | Contacto con la nube | Costo |
|-------|---------|----------------------|-------|
| Formato | `terraform fmt -check -recursive` | Ninguno | Cero |
| Sintaxis y referencias | `terraform validate` / `terragrunt run --all -- validate` | Ninguno | Cero |
| Plan sin refresh + backend local | `plan -refresh=false` | Ninguno (con mocks) | Cero |
| Tests de módulo con mocks | `terraform test` + `mock_provider` | Ninguno | Cero |
| Tests de módulo reales | `terraform test` (`command = apply`) | Crea y destruye | Bajo |
| End-to-end | Terratest | Crea y destruye | Medio |

---

## Validar un stack Terragrunt sin tocar la nube

### 1. validate en todas las units

```bash
cd infra/live/qa
terragrunt run --all -- validate
```

Funciona antes del primer apply gracias a los `mock_outputs` de las dependencias:

```hcl
dependency "vcn" {
  config_path = "../vcn"
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    private_subnet_id = "ocid1.subnet.oc1..mock"
  }
}
```

### 2. Plan sin refresh

Habilitado desde el `root.hcl` con una variable de entorno:

```hcl
terraform {
  extra_arguments "plan_no_refresh" {
    arguments = get_env("TG_SKIP_REFRESH", "") == "1" ? ["-refresh=false"] : []
    commands  = ["plan"]
  }
}
```

```bash
export TG_SKIP_REFRESH=1
terragrunt run --all --non-interactive -- plan -input=false
```

### 3. Backend local para CI sin credenciales

Un `root-local.hcl` con los mismos `inputs` pero `remote_state { backend = "local" }`, o mejor, generar el backend condicionalmente (ver [Terragrunt fundamentos](/article/terraform/15-terragrunt-fundamentos/)): si el bucket no está configurado, se usa local.

### 4. Módulos que toleran compartments/IDs mock

Los data sources fallan con IDs falsos. Patrón para que el plan funcione con mocks:

```hcl
locals {
  is_mock = strcontains(var.compartment_id, "mock")
}

data "oci_identity_availability_domains" "ads" {
  count          = local.is_mock ? 0 : 1
  compartment_id = var.compartment_id
}

locals {
  default_ad = local.is_mock ? "MOCKAD:REGION-AD-1" : data.oci_identity_availability_domains.ads[0].availability_domains[0].name
}
```

---

## `terraform test`

Archivos `*.tftest.hcl` en `tests/` del módulo.

```hcl
# modules/vcn/tests/vcn.tftest.hcl
variables {
  compartment_id      = "ocid1.compartment.oc1..test"
  project_name        = "kb-test"
  vcn_cidr            = "192.168.250.0/24"
  public_subnet_cidr  = "192.168.250.0/24"
  private_subnet_cidr = "192.168.251.0/24"
}

mock_provider "oci" {}            # ≥ 1.7: no llama a la API

run "subred_privada_sin_ip_publica" {
  command = plan

  assert {
    condition     = oci_core_subnet.private.prohibit_public_ip_on_vnic == true
    error_message = "La subnet privada no debe permitir IPs públicas."
  }
}

run "privada_sale_por_nat" {
  command = plan

  assert {
    condition     = length(oci_core_route_table.private.route_rules) == 1
    error_message = "La subnet privada necesita una ruta 0.0.0.0/0 al NAT Gateway."
  }
}

run "cidr_invalido_falla" {
  command = plan
  variables {
    vcn_cidr = "no-es-un-cidr"
  }
  expect_failures = [var.vcn_cidr]
}
```

```bash
cd modules/vcn
terraform init
terraform test
terraform test -filter=tests/vcn.tftest.hcl -verbose
```

### Overrides: fijar valores de data sources

```hcl
override_data {
  target = data.oci_core_images.ubuntu
  values = {
    images = [{ id = "ocid1.image.oc1..fake" }]
  }
}
```

### Tests contra la nube real

```hcl
run "crea_bucket" {
  command = apply                 # crea; terraform test destruye al final
  assert {
    condition     = oci_objectstorage_bucket.tfstate.versioning == "Enabled"
    error_message = "Versionado deshabilitado."
  }
}
```

Correrlos en un compartment/cuenta de sandbox y con `TF_VAR_*` de prueba.

---

## Qué testear en un módulo propio

- Recursos que **no** deben tener IP pública / puertos abiertos.
- Naming: `display_name` / tags con `project_name` y `environment`.
- Que `for_each` sobre un mapa vacío no rompa.
- Que inputs inválidos fallen con un mensaje claro (`expect_failures`).
- Outputs que consumen otras units (si cambia un nombre de output se rompen dependencias de Terragrunt).
