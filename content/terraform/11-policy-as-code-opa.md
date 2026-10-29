---
title: "Policy as Code: OPA/Conftest, Checkov y Validaciones Nativas"
category: "terraform"
tags: ["policy-as-code", "opa", "rego", "conftest", "checkov", "gobernanza"]
keywords: ["opa terraform", "open policy agent", "rego terraform", "conftest terraform", "politicas terraform", "validar plan json", "terraform show -json", "deny puerto 22", "tags obligatorios terraform", "checkov custom policy", "precondition postcondition", "check block terraform", "gobernanza infraestructura"]
description: "Cómo aplicar reglas de gobernanza sobre Terraform: validaciones nativas (validation, precondition, check), políticas Rego evaluadas con Conftest sobre el plan JSON, y su integración en CI."
---

# Policy as Code

## Tres niveles de control

| Nivel | Herramienta | Qué valida | Cuándo corre |
|-------|-------------|-----------|--------------|
| Módulo | `validation`, `precondition`, `postcondition`, `check` | Inputs y supuestos del propio módulo | `plan` / `apply` |
| Organización | OPA / Conftest (Rego) | Reglas transversales sobre el **plan** | CI, antes del apply |
| Seguridad estática | Checkov, tfsec/Trivy | Misconfiguraciones conocidas sobre el **código** | CI / pre-commit |

---

## Validaciones nativas

```hcl
variable "vcn_cidr" {
  type = string

  validation {
    condition     = can(cidrhost(var.vcn_cidr, 0))
    error_message = "vcn_cidr debe ser un CIDR válido."
  }

  # Evitar solaparse con redes de terceros alcanzadas por VPN
  validation {
    condition     = !startswith(var.vcn_cidr, "172.")
    error_message = "No usar 172.16.0.0/12: se solapa con redes de clientes alcanzadas por VPN."
  }
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "qa", "stg", "preprod", "prod"], var.environment)
    error_message = "environment inválido."
  }
}
```

```hcl
resource "oci_core_instance" "this" {
  # ...
  lifecycle {
    precondition {
      condition     = length(data.oci_core_images.windows.images) > 0
      error_message = "No hay imagen Windows disponible para ese shape en esta región."
    }
  }
}

# check: no bloquea el apply, emite warning
check "state_bucket_versioned" {
  assert {
    condition     = oci_objectstorage_bucket.tfstate.versioning == "Enabled"
    error_message = "El bucket del state debería tener versionado."
  }
}
```

---

## Conftest (OPA) sobre el plan

```bash
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
conftest test tfplan.json -p policy/
```

Con Terragrunt, el plan JSON se genera por unit:

```bash
terragrunt run --all -- plan -out=tfplan
terragrunt run --all -- show -json tfplan > /dev/null   # o iterar units y guardar cada json
```

### Políticas de ejemplo (`policy/terraform.rego`)

```rego
package main

import rego.v1

# 1. Tags obligatorios en instancias (AWS tags / OCI freeform_tags)
required_tags := {"Environment", "ManagedBy"}

deny contains msg if {
  rc := input.resource_changes[_]
  rc.type in {"aws_instance", "oci_core_instance"}
  "create" in rc.change.actions
  tags := object.union(object.get(rc.change.after, "tags", {}), object.get(rc.change.after, "freeform_tags", {}))
  missing := required_tags - {k | tags[k]}
  count(missing) > 0
  msg := sprintf("%s: faltan tags %v", [rc.address, missing])
}

# 2. Nada de SSH/RDP abierto a internet (AWS SG)
deny contains msg if {
  rc := input.resource_changes[_]
  rc.type == "aws_security_group"
  ing := rc.change.after.ingress[_]
  ing.from_port <= 22
  ing.to_port >= 22
  "0.0.0.0/0" in ing.cidr_blocks
  msg := sprintf("%s: SSH abierto a 0.0.0.0/0", [rc.address])
}

# 3. Mismo control para NSG de OCI
deny contains msg if {
  rc := input.resource_changes[_]
  rc.type == "oci_core_network_security_group_security_rule"
  rc.change.after.direction == "INGRESS"
  rc.change.after.source == "0.0.0.0/0"
  opt := rc.change.after.tcp_options[_].destination_port_range[_]
  opt.min <= 3389
  opt.max >= 3389
  msg := sprintf("%s: RDP abierto a internet", [rc.address])
}

# 4. Warning (no bloquea): instancias con IP pública
warn contains msg if {
  rc := input.resource_changes[_]
  rc.type == "oci_core_instance"
  rc.change.after.create_vnic_details[_].assign_public_ip == true
  msg := sprintf("%s: tiene IP pública, confirmar que es intencional", [rc.address])
}
```

### Testear las políticas

```rego
# policy/terraform_test.rego
package main
import rego.v1

test_ssh_abierto_denegado if {
  count(deny) > 0 with input as {"resource_changes": [{
    "address": "aws_security_group.x", "type": "aws_security_group",
    "change": {"actions": ["create"], "after": {"ingress": [{"from_port": 22, "to_port": 22, "cidr_blocks": ["0.0.0.0/0"]}]}}
  }]}
}
```

```bash
conftest verify -p policy/
```

---

## Excepciones explícitas

Las reglas que se rompen a propósito (por ejemplo, paneles expuestos durante una prueba de DRP) deben quedar **documentadas en el código**, no en la memoria del equipo:

```hcl
# Ingreso público a Jenkins/Grafana: decisión explícita para la prueba de DRP.
# Retirar esta regla cuando deje de ser un test puntual.
resource "oci_core_network_security_group_security_rule" "apps_ingress" {
  for_each = toset(["8080", "3000"])
  # ...
}
```

En Checkov, la excepción va inline con justificación:

```hcl
resource "aws_security_group" "vpn" {
  # checkov:skip=CKV_AWS_24: puerto UDP de WireGuard expuesto por diseño
}
```

---

## Integración en CI

```yaml
- name: Policy check
  run: |
    terraform plan -out=tfplan -input=false
    terraform show -json tfplan > tfplan.json
    conftest test tfplan.json -p policy/ --output github
```

`deny` → falla el pipeline. `warn` → se muestra pero no bloquea. Ver [Terraform en CI/CD](/article/terraform/08-ci-cd-y-herramientas/).
