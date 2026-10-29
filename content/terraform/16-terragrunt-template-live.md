---
title: "Terragrunt _template / live: entornos como datos con env.hcl"
category: "terraform"
tags: ["terragrunt", "template", "env.hcl", "read_terragrunt_config", "cidrsubnet", "naming"]
keywords: ["terragrunt template live", "env.hcl", "read_terragrunt_config", "exclude block terragrunt", "terragrunt catalog", "configuracion como datos", "cidrsubnet cidrhost", "plan de direccionamiento", "naming convention terraform", "default_tags", "TODO placeholder terragrunt", "crear nuevo entorno terragrunt", "image catalog"]
description: "Patrón avanzado de Terragrunt donde cada entorno es una copia de un _template con un env.hcl de datos: archivos .hcl de configuración por componente, exclude para que el template nunca se aplique, direccionamiento con cidrsubnet/cidrhost, naming y tags uniformes."
---

# Terragrunt `_template` / `live`

## Idea

Separar **qué se despliega** (estructura de units, igual en todos los entornos) de **con qué valores** (un `env.hcl` por entorno). Crear un entorno nuevo = copiar el template y completar datos.

```text
infra/
├── root.hcl                       # backend + provider generados a partir de env.hcl
├── modules/                       # oci-vcn-core, oci-compute-fleet, oci-load-balancer, oci-waf,
│                                  # oci-bastion, oci-dns, oci-iam, oci-db-vm, oci-volume-backup-policies...
├── _template/
│   ├── tenancy-root/              # compartment raíz del producto
│   ├── tenancy/                   # compartment + grupos + dynamic groups + policies del entorno
│   └── dc1/
│       ├── env.hcl                # TODOS los datos del entorno (con TODO_ placeholders)
│       ├── object-storage-backend/
│       ├── iam/
│       ├── network/{vcn-core,security-lists,service-gateway,waf}/
│       ├── compute/
│       │   ├── instances.hcl      # catálogo de VMs (datos)
│       │   ├── image-catalog/images.hcl
│       │   ├── network-security-groups/groups.hcl
│       │   ├── load-balancer/{lb,listeners,rules}.hcl
│       │   └── backend-sets/backend-sets.hcl
│       ├── database/sqlserver-db-vm/db.hcl
│       ├── dns/oci-dns/{zones,records,endpoints}.hcl
│       ├── security/{bastion,os-management-hub}/
│       └── backup/volume-policies/
└── live/
    ├── preprod/{tenancy,dc1}/     # copia del template con env.hcl completo
    └── prod/{tenancy,dc1}/
```

---

## El template nunca se aplica

Cada unit del template lleva:

```hcl
exclude {
  if      = true
  actions = ["all"]
}
```

Al copiarlo a `live/<env>/`, se borra (o se cambia a `if = false`). Así un `run --all` desde la raíz no intenta desplegar placeholders.

Defensa adicional: el `root.hcl` detecta `TODO_` y cae a backend local en vez de apuntar a un bucket inexistente.

---

## `env.hcl`: el entorno como datos

```hcl
locals {
  environment = "qa"
  region      = "sa-saopaulo-1"
  region_role = "primary"
  dc          = "dc1"
  app_name    = "producto-icas"
  name_prefix = "${local.app_name}-${local.environment}"

  oci = {
    region       = local.region
    profile      = "producto-qa"            # perfil de ~/.oci/config
    tenancy_ocid = "ocid1.tenancy.oc1..<id>"
  }

  vcn_cidr       = "10.40.0.0/16"
  peer_vcn_cidrs = []
  vpn            = { client_cidr = "10.240.0.0/24" }
  admin_cidrs    = ["203.0.113.0/24"]        # oficina

  admin_ssh_pubkeys = ["ssh-ed25519 AAAA... admin@example"]

  ports = {
    http = 80, https = 443, sqlserver = 1433, rdp = 3389, ssh = 22
    winrm = 5985, smb = 445, ag_endpoint = 5022
    rpc_dynamic_from = 49152, rpc_dynamic_to = 65535
    node_exporter = 9100, elastic = 9200, kibana = 5601, apm = 8200
  }

  default_tags = {
    Environment = local.environment
    Application = local.app_name
    Region      = local.region
    RegionRole  = local.region_role
    DataCenter  = local.dc
    ManagedBy   = "Terragrunt"
  }

  tfstate = {
    bucket   = "${local.app_name}-tfstate-${local.region}"
    endpoint = "https://<namespace>.compat.objectstorage.${local.region}.oraclecloud.com"
  }
}
```

### Una unit lee datos, no define valores

```hcl
# dc1/network/vcn-core/terragrunt.hcl
include "root" { path = find_in_parent_folders("root.hcl") }

terraform { source = "../../../../modules/oci-vcn-core" }

dependency "tenancy" {
  config_path = "../../../tenancy"
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "destroy"]
  mock_outputs = { compartment_id = "ocid1.compartment.oc1..mock" }
}

locals {
  cfg     = read_terragrunt_config("${get_terragrunt_dir()}/vcn.hcl")
  env_cfg = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

inputs = {
  compartment_id     = dependency.tenancy.outputs.compartment_id
  tags               = local.cfg.locals.common_tags
  vcn                = local.cfg.locals.vcn
  subnets            = local.cfg.locals.subnets
  public_route_table = local.cfg.locals.public_route_table
  admin_cidrs = compact(concat(
    [try(local.env_cfg.locals.vcn_cidr, ""), try(local.env_cfg.locals.vpn.client_cidr, "")],
    try(local.env_cfg.locals.peer_vcn_cidrs, [])
  ))
}
```

---

## Plan de direccionamiento con `cidrsubnet` / `cidrhost`

Las subnets y las IPs fijas se **derivan** del CIDR de la VCN: cambiar `vcn_cidr` re-numera todo de forma consistente.

```hcl
# vcn.hcl
locals {
  env_cfg  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  _cidr    = local.env_cfg.locals.vcn_cidr          # 10.40.0.0/16
  _prefix  = local.env_cfg.locals.name_prefix

  subnets = {
    public_a     = { name = "${local._prefix}-sub-pub-a",      cidr_block = cidrsubnet(local._cidr, 8, 1),  prohibit_public_ip_on_vnic = false, dns_label = "puba" }
    public_b     = { name = "${local._prefix}-sub-pub-b",      cidr_block = cidrsubnet(local._cidr, 8, 2),  prohibit_public_ip_on_vnic = false, dns_label = "pubb" }
    private_11_a = { name = "${local._prefix}-sub-priv-11-a",  cidr_block = cidrsubnet(local._cidr, 8, 11), prohibit_public_ip_on_vnic = true,  dns_label = "priv11a" }
    private_12_b = { name = "${local._prefix}-sub-priv-12-b",  cidr_block = cidrsubnet(local._cidr, 8, 12), prohibit_public_ip_on_vnic = true,  dns_label = "priv12b" }
    private_13_a = { name = "${local._prefix}-sub-priv-13-a",  cidr_block = cidrsubnet(local._cidr, 8, 13), prohibit_public_ip_on_vnic = true,  dns_label = "priv13a" }
  }
}
```

| Expresión | Resultado (vcn `10.40.0.0/16`) |
|-----------|-------------------------------|
| `cidrsubnet(cidr, 8, 1)` | `10.40.1.0/24` (pública A) |
| `cidrsubnet(cidr, 8, 11)` | `10.40.11.0/24` (privada app A) |
| `cidrsubnet(cidr, 8, 13)` | `10.40.13.0/24` (privada DB A) |
| `cidrhost(cidrsubnet(cidr, 8, 13), 10)` | `10.40.13.10` (IP fija del SQL primario) |

Convención: el número de subnet codifica la capa (1x privadas, 0x públicas) y la letra el AD/fault domain.

---

## Catálogo de instancias como datos

```hcl
# compute/instances.hcl
locals {
  env_cfg  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  _prefix  = local.env_cfg.locals.name_prefix
  _priv_11 = cidrsubnet(local.env_cfg.locals.vcn_cidr, 8, 11)

  # Ignorar claves con placeholder
  _ssh_pubkeys  = [for k in local.env_cfg.locals.admin_ssh_pubkeys : k if !strcontains(k, "TODO_")]
  _ssh_metadata = length(local._ssh_pubkeys) > 0 ? { ssh_authorized_keys = join("\n", local._ssh_pubkeys) } : {}

  instances = {
    iis_web = {
      name         = "${local._prefix}-vm-iis-web"
      image_alias  = "windows_2022"
      shape        = "VM.Standard3.Flex"
      shape_config = { ocpus = 4, memory_in_gbs = 32 }
      subnet_key   = "private_11_a"
      nsg_keys     = ["priv_group"]
      private_ip   = cidrhost(local._priv_11, 20)
    }
    vpn = {
      name                   = "${local._prefix}-vm-openvpn"
      image_alias            = "oracle_linux_9"
      shape                  = "VM.Standard.E4.Flex"
      shape_config           = { ocpus = 1, memory_in_gbs = 8 }
      subnet_key             = "public_a"
      skip_source_dest_check = true             # necesario para rutear tráfico de la VPN
      metadata               = merge(local._ssh_metadata, { user_data = local._openvpn_cloud_init })
    }
  }
}
```

El módulo `oci-compute-fleet` recibe el mapa y hace `for_each`; la unit traduce `subnet_key`/`nsg_keys`/`image_alias` a IDs usando outputs de dependencias.

### Catálogo de imágenes

```hcl
# compute/image-catalog/images.hcl
locals {
  catalog = {
    windows_2022   = { operating_system = "Windows",      operating_system_version = "Server 2022 Standard", shape = "VM.Standard3.Flex", sort_by = "TIMECREATED", sort_order = "DESC" }
    oracle_linux_9 = { operating_system = "Oracle Linux", operating_system_version = "9",                    shape = "VM.Standard3.Flex", sort_by = "TIMECREATED", sort_order = "DESC" }
  }
}
```

Alias estables (`windows_2022`) en vez de OCIDs que varían por región y caducan.

---

## Naming y tags

| Recurso | Patrón | Ejemplo |
|---------|--------|---------|
| Prefijo | `<app>-<env>` | `producto-icas-qa` |
| VCN | `<prefijo>-vcn` | `producto-icas-qa-vcn` |
| Subnet | `<prefijo>-sub-<pub\|priv>-<n>-<ad>` | `producto-icas-qa-sub-priv-11-a` |
| VM | `<prefijo>-vm-<rol>` | `producto-icas-qa-vm-iis-web` |
| Bucket de state | `<app>-tfstate-<env>-<región>` | |
| IAM | `<prefijo>-admins`, `<prefijo>-instances`, `<prefijo>-policies` | |

Tags (`default_tags`) definidos una sola vez en `env.hcl` y aplicados por todos los módulos: entorno, aplicación, región, rol de región (primary/dr), DC y `ManagedBy = Terragrunt`.

---

## Crear un entorno nuevo

```bash
cp -r infra/_template/dc1 infra/live/qa/dc1
cp -r infra/_template/tenancy infra/live/qa/tenancy
grep -rl "TODO_" infra/live/qa                           # completar todo lo listado
grep -rl 'exclude' infra/live/qa | xargs sed -i 's/if      = true/if      = false/'

cd infra/live/qa
terragrunt run --all -- validate
terragrunt run --all -- plan
terragrunt run --all -- apply
```

Orden que resuelve el grafo: `tenancy` → `object-storage-backend` → `iam` → `network/*` → `compute/*` / `database/*` → `dns`, `waf`, `backup`.
