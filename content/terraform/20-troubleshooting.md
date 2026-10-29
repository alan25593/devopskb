---
title: "Troubleshooting Terraform y Terragrunt: errores reales y cómo resolverlos"
category: "terraform"
tags: ["troubleshooting", "errores", "terragrunt", "state", "lock", "oci", "aws"]
keywords: ["error terraform", "duplicate backend configuration block", "backend configuration changed", "init -reconfigure", "migrate-state", "error acquiring the state lock", "force-unlock", "terragrunt mock outputs error", "unknown output dependency", "NotImplemented chunked", "instancia sin internet oci", "ami not found", "invalid ami id", "terragrunt cache", "provider produced inconsistent result", "forces replacement", "TF_LOG debug", "infracost"]
description: "Catálogo de errores frecuentes de Terraform y Terragrunt con causa y solución: backend duplicado o cambiado, locks colgados, dependencias sin outputs, mocks, problemas de red en OCI/AWS, recreaciones inesperadas y cómo depurar."
---

# Troubleshooting Terraform y Terragrunt

## Diagnóstico general

```bash
export TF_LOG=DEBUG                 # TRACE para todavía más detalle
export TF_LOG_PATH=./tf-debug.log
terragrunt plan --log-level debug

terraform providers                 # qué providers/versión usa cada módulo
terraform state list
terraform show -json | jq '.values.root_module.resources[].address'
```

---

## Backend e init

| Error | Causa | Solución |
|-------|-------|----------|
| `Duplicate 'backend' configuration block` | El módulo declara `backend` y Terragrunt también lo genera | Sacar el bloque `backend` del módulo (o no usar `generate` en `remote_state`) |
| `Backend configuration changed` | Cambió bucket/key/región | `terragrunt init -reconfigure` (sin migrar) o `-migrate-state` (migrar) |
| `Initializing the backend...` pide input / falla con key equivocada (`vpc/terraform.tfstate`) | Cache de init de otra configuración | `terragrunt init -reconfigure`; borrar `.terragrunt-cache` |
| `NoSuchBucket` | Backend apuntado antes de crear el bucket | Aplicar primero la unit `backend/` (state local) |
| `NotImplemented: AWS chunked encoding not supported` | Backend S3 contra OCI Object Storage | `skip_s3_checksum = true`; ver [Backend en OCI](/article/terraform/18-backend-oci-object-storage/) |
| State "desaparece" en cada run (backend local) | `path` relativo → queda en `.terragrunt-cache` | `path = "${get_terragrunt_dir()}/terraform.tfstate"` |
| Key con `\` en el bucket | `path_relative_to_include()` en Windows | `replace(path_relative_to_include(), "\\", "/")` |

---

## Locks

```
Error: Error acquiring the state lock
Lock Info:
  ID:        88bf5ef1-....
  Operation: OperationTypeApply
  Who:       user@host
```

1. Confirmar que **nadie** está corriendo un apply (CI, otro operador).
2. Liberar:
   ```bash
   terragrunt force-unlock 88bf5ef1-....
   ```
3. Con `use_lockfile`, el lock es un objeto `<key>.tflock` en el bucket; si `force-unlock` falla se puede borrar ese objeto.

> Un apply interrumpido (Ctrl+C dos veces, VM de CI muerta) es la causa típica. No hacer `force-unlock` con un apply en curso: se corrompe el state.

---

## Dependencias de Terragrunt

| Error | Causa | Solución |
|-------|-------|----------|
| `... is a dependency of ... but detected no outputs` | La dependencia nunca se aplicó | Aplicarla o agregar `mock_outputs` para `validate`/`plan` |
| `Unsupported attribute` sobre `dependency.x.outputs.y` | El output no existe (renombrado) o los mocks no lo incluyen | Agregar el output al módulo y a `mock_outputs` |
| Apply crea recursos con `subnet-mock` | Mocks permitidos en `apply` | `mock_outputs_allowed_terraform_commands = ["validate", "plan"]` |
| `run --all` aplica en orden incorrecto | Falta `dependency`/`dependencies` | Declarar dependencias explícitas (`dependencies { paths = [...] }`) |
| Data source falla en plan con ID mock (`ocid1...mock`) | El provider consulta la API | En el módulo: `count = strcontains(var.compartment_id, "mock") ? 0 : 1` |
| Cambios de un módulo local no se ven | Cache | `terragrunt plan --source-update` o borrar `.terragrunt-cache` |

```bash
# Limpiar caches de todo el árbol
find . -type d -name ".terragrunt-cache" -prune -exec rm -rf {} +
```

---

## Recreaciones inesperadas (`forces replacement`)

| Atributo | Por qué cambia | Fix |
|----------|----------------|-----|
| `user_data` / `metadata` | Se editó el template de bootstrap | `ignore_changes = [metadata["user_data"]]` |
| `source_id` / `ami` | Data source "latest" encontró una imagen nueva | `ignore_changes` o pinear la imagen |
| `availability_domain` | Lista de ADs devuelta en otro orden | Fijar el AD por variable |
| Renombre de recurso o `count` → `for_each` | Cambió la dirección en el state | Bloque `moved` ([Refactoring](/article/terraform/10-refactoring-y-drift/)) |
| `tags` con valores calculados en apply | `timestamp()` en tags | No usar funciones no deterministas en tags |

Siempre buscar `# forces replacement` en el plan antes de aprobar.

---

## Red

| Síntoma | Causa | Solución |
|---------|-------|----------|
| OCI: VM privada sin internet (`Unable to connect to the remote server` en el bootstrap) | El IGW no sirve a instancias sin IP pública | Route table de la subnet privada → **NAT Gateway** |
| OCI: NSG abierto pero el puerto no responde | `iptables` de la imagen Ubuntu solo permite 22 | Abrir en cloud-init (`iptables -I INPUT ...` + `netfilter-persistent save`) |
| AWS: instancia privada sin salida | Falta ruta `0.0.0.0/0` → NAT GW / NAT instance | Revisar `aws_route` y asociación de la route table |
| Tráfico a un partner por VPN se pierde sin error | CIDR de la VPC/VCN o de una red Docker solapa el del partner | Re-numerar la red propia; en Docker, `network_mode: host` o `default-address-pools` |
| VM que rutea VPN no reenvía tráfico | Source/dest check | OCI: `skip_source_dest_check = true`; AWS: `source_dest_check = false` |
| No llega por RDP a Windows privada | Por diseño | Túnel SSH por el host público/bastion: `ssh -L 3389:<ip-privada>:3389 admin@<bastion>` |

---

## Imágenes y shapes

| Error | Causa | Solución |
|-------|-------|----------|
| `InvalidAMIID.NotFound` / `InvalidAMIID.Malformed` | AMI de otra región o con typo (un carácter de más) | AMIs por región en un mapa central; validar con `aws ec2 describe-images --image-ids` |
| OCI `images[0]` index out of range | Filtro de `operating_system_version` no coincide (ej. `"Windows Server 2022 Standard"` en vez de `"Server 2022 Standard"`) o imagen incompatible con el shape | Probar el filtro con `oci compute image list` |
| `Out of host capacity` (OCI) | Sin capacidad del shape en ese AD | Otro AD o shape (E4 ↔ E5 ↔ Standard3) |
| `shape_config` ignorado | Shape no Flex | Usar `*.Flex` |

---

## Credenciales

| Error | Causa | Solución |
|-------|-------|----------|
| `No valid credential sources found` (AWS) | Perfil no exportado | `export AWS_PROFILE=...` / `aws sso login` |
| OCI `401-NotAuthenticated` | Fingerprint/clave del `~/.oci/config` no coinciden | `oci iam region list --profile <p>` para probar |
| OCI `404-NotAuthorizedOrNotFound` | Falta policy o compartment equivocado | Revisar policies del grupo; OCI no distingue "no existe" de "no autorizado" |
| `apply` pide `var.admin_password` | Variable sin default y sin `TF_VAR_` | `export TF_VAR_admin_password=...` |
| IAM de OCI falla fuera de la home region | Cambios de IAM solo en home region | Provider con `region = <home>` para la unit de IAM |

---

## Providers y versiones

| Error | Solución |
|-------|----------|
| `Inconsistent dependency lock file` | `terraform init -upgrade` y commitear `.terraform.lock.hcl` |
| `Provider produced inconsistent result after apply` | Bug del provider: re-ejecutar `apply`; si persiste, actualizar provider |
| Lock file con hashes solo de Windows y CI en Linux | `terraform providers lock -platform=linux_amd64 -platform=windows_amd64` |
| Sintaxis de Terragrunt deprecada (`run-all`, `--terragrunt-*`) | Migrar a `terragrunt run --all -- <cmd>` y variables `TG_*` |

---

## Costos antes de aplicar

```bash
terragrunt plan -out tfplan.binary
terragrunt show -json tfplan.binary > plan.json
infracost breakdown --path plan.json
```

---

## WireGuard levantado con Terraform

```bash
# Ver la salida de consola (clave pública/config generada por el user_data)
aws ec2 get-console-output --instance-id <id> --latest --output text

# Agregar un peer
wg genkey | tee client2.key | wg pubkey > client2.pub
sudo wg set wg0 peer "$(cat client2.pub)" allowed-ips 10.20.0.3/32
sudo wg-quick save wg0
```
