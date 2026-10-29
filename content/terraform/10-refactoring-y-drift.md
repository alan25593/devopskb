---
title: "Refactoring y Drift: moved, import, removed e ignore_changes"
category: "terraform"
tags: ["refactoring", "drift", "moved", "import", "removed", "lifecycle"]
keywords: ["terraform moved block", "renombrar recurso terraform", "terraform state mv", "terraform import block", "removed block terraform", "drift terraform", "detectar drift", "refresh-only", "ignore_changes", "cambios manuales consola", "terraform plan -detailed-exitcode", "count a for_each migrar", "mover recurso a modulo"]
description: "Cómo refactorizar código Terraform sin destruir recursos (moved, import, removed), detectar y corregir drift, y cuándo usar ignore_changes para atributos que cambian fuera de Terraform."
---

# Refactoring y Drift

## Bloques declarativos vs comandos de state

| Necesidad | Declarativo (recomendado, queda en Git) | CLI (imperativo) |
|-----------|------------------------------------------|------------------|
| Renombrar / mover un recurso | `moved {}` (≥ 1.1) | `terraform state mv` |
| Traer un recurso existente | `import {}` (≥ 1.5) | `terraform import` |
| Dejar de gestionar sin destruir | `removed {}` (≥ 1.7) | `terraform state rm` |

Los bloques se revisan en un PR y se aplican igual en todos los entornos. Con Terragrunt y muchos states, esto evita tener que correr comandos a mano en cada unit.

---

## `moved`: renombrar sin recrear

```hcl
resource "aws_instance" "web_primary" {
  ami           = var.ami_id
  instance_type = "t3.small"
}

moved {
  from = aws_instance.servidor_web_1
  to   = aws_instance.web_primary
}
```

### Casos frecuentes

```hcl
# Recurso → dentro de un módulo
moved {
  from = aws_security_group.app
  to   = module.networking.aws_security_group.app
}

# count → for_each (índice numérico → clave)
moved {
  from = aws_subnet.public[0]
  to   = aws_subnet.public["a"]
}
moved {
  from = aws_subnet.public[1]
  to   = aws_subnet.public["b"]
}
```

El plan debe mostrar `has moved to` y **0 to destroy**. Los bloques `moved` se pueden borrar después de que todos los entornos hayan aplicado.

---

## `import`: adoptar recursos creados a mano

```hcl
import {
  to = aws_s3_bucket.logs
  id = "mi-bucket-logs"
}
```

```bash
# Generar el código del recurso importado (revisarlo y limpiarlo después)
terraform plan -generate-config-out=generated.tf
terraform apply
```

En OCI el `id` es el OCID del recurso:

```hcl
import {
  to = oci_core_vcn.main
  id = "ocid1.vcn.oc1.<region>.<id>"
}
```

---

## `removed`: dejar de gestionar sin borrar

```hcl
removed {
  from = aws_instance.legacy

  lifecycle {
    destroy = false     # el recurso sigue existiendo en la nube
  }
}
```

Útil al mover un recurso a otro state/unit: `removed` en el origen + `import` en el destino.

---

## Drift: cambios hechos fuera de Terraform

```bash
# Ver solo diferencias entre state y realidad, sin proponer cambios de código
terraform plan -refresh-only

# Aceptar la realidad en el state (no toca la infraestructura)
terraform apply -refresh-only

# Para CI: exit 0 = sin cambios, 1 = error, 2 = hay cambios
terraform plan -detailed-exitcode
```

| Situación | Acción |
|-----------|--------|
| Cambio manual correcto (hotfix en consola) | Llevarlo al código y aplicar → el plan queda limpio |
| Cambio manual incorrecto | `terraform apply` para volver al estado del código |
| Atributo que **siempre** cambia afuera | `lifecycle { ignore_changes = [...] }` |

Detección programada con Terragrunt (todas las units, sin pedir input):

```bash
terragrunt run --all -- plan -detailed-exitcode -input=false -lock=false
```

---

## `ignore_changes` bien usado

Casos reales donde es la decisión correcta:

```hcl
resource "oci_core_instance" "drp" {
  # ...
  metadata = {
    user_data = base64encode(templatefile("${path.module}/templates/cloud-init.yaml.tpl", { ... }))
  }

  # cloud-init corre una sola vez en el primer boot: editar el template
  # no debe forzar el reemplazo de una instancia que ya tiene datos.
  lifecycle {
    ignore_changes = [metadata["user_data"]]
  }
}
```

```hcl
resource "oci_core_instance" "this" {
  for_each = var.instances
  # ...
  lifecycle {
    ignore_changes = [
      source_details[0].source_id,          # el data source de imagen devuelve la más nueva → evitar recreación
      source_details[0].boot_volume_size_in_gbs,
      create_vnic_details[0].assign_public_ip,
      metadata,
    ]
  }
}
```

| Atributo | Por qué ignorarlo |
|----------|-------------------|
| `user_data` / `metadata` | Solo se usa en el primer boot; cambiarlo recrea la VM |
| ID de imagen "latest" | Una imagen nueva publicada por el proveedor no debe recrear la VM |
| Tags agregados por otras herramientas | Backup, costos, escáneres |
| `desired_count` de un ASG/servicio | Lo maneja el autoscaler |

> No usar `ignore_changes = all` para "silenciar" un plan ruidoso: esconde drift real.
