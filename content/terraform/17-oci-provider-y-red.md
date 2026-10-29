---
title: "Terraform en OCI: provider, compartments, VCN, NAT y NSG"
category: "terraform"
tags: ["oci", "oracle-cloud", "vcn", "nsg", "nat-gateway", "compartment"]
keywords: ["terraform oci", "oracle cloud terraform", "provider oci", "config_file_profile", "compartment terraform", "oci_core_vcn", "oci internet gateway", "oci nat gateway", "subnet privada oci sin internet", "network security group oci", "security list vs nsg", "oci_core_images", "shape flex", "oci iptables ubuntu", "service gateway", "oci vs aws diferencias"]
description: "Cómo trabajar Terraform contra Oracle Cloud (OCI): configuración del provider, compartments, VCN con subnets públicas y privadas, la diferencia clave de Internet Gateway vs NAT respecto de AWS, NSGs, imágenes por data source y shapes Flex."
---

# Terraform en OCI

## Equivalencias con AWS

| AWS | OCI | Nota |
|-----|-----|------|
| Cuenta / OU | **Compartment** | Todo recurso vive en un compartment (OCID) |
| VPC | **VCN** | Puede tener varios `cidr_blocks` |
| Security Group | **NSG** (Network Security Group) | Se asocia a la VNIC |
| NACL | **Security List** | Se asocia a la subnet |
| Internet Gateway | Internet Gateway | **Solo enruta instancias con IP pública propia** |
| NAT Gateway | NAT Gateway | Obligatorio para salida de subnets privadas |
| VPC Endpoint (S3) | **Service Gateway** | Acceso a Object Storage y servicios Oracle sin internet |
| AMI | Image (por región) | Buscar con `oci_core_images` |
| Instance type | **Shape** (Flex: OCPU/RAM a medida) | 1 OCPU = 2 vCPU |
| S3 | Object Storage | API S3-compatible con Customer Secret Keys |
| IAM Role de instancia | **Dynamic Group + Policy** (instance principal) | |
| Transit Gateway | DRG | |

---

## Provider

```hcl
terraform {
  required_providers {
    oci = { source = "oracle/oci" }
  }
}

provider "oci" {
  region              = "sa-saopaulo-1"
  config_file_profile = "producto-qa"     # sección de ~/.oci/config
}
```

```ini
# ~/.oci/config
[producto-qa]
user=ocid1.user.oc1..<id>
fingerprint=aa:bb:...
tenancy=ocid1.tenancy.oc1..<id>
region=sa-saopaulo-1
key_file=~/.oci/producto-qa.pem
```

Generado por Terragrunt para no repetirlo (ver [Terragrunt fundamentos](/article/terraform/15-terragrunt-fundamentos/)):

```hcl
generate "provider" {
  path      = "provider.auto.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "oci" {
  region = "${local.oci_region}"
${local._tenancy_line}${local._oci_profile_line}
}
EOF
}
```

> IAM (compartments, grupos, policies) **solo se puede modificar en la home region** del tenancy. Si se despliega en otra región, la unit de IAM necesita un provider propio con `region = <home region>`.

---

## Compartments e IAM por entorno

```hcl
resource "oci_identity_compartment" "env" {
  compartment_id = var.parent_compartment_id
  name           = "producto-icas-qa"
  description    = "Entorno QA"
  enable_delete  = true
}

resource "oci_identity_dynamic_group" "instances" {
  compartment_id = var.tenancy_ocid
  name           = "producto-icas-qa-instances"
  description    = "Todas las instancias del compartment QA"
  matching_rule  = "ALL {instance.compartment.id = '${oci_identity_compartment.env.id}'}"
}

resource "oci_identity_policy" "instances" {
  compartment_id = var.tenancy_ocid
  name           = "producto-icas-qa-policies"
  description    = "Permisos de instance principal"
  statements = [
    "Allow dynamic-group producto-icas-qa-instances to read objects in compartment id ${oci_identity_compartment.env.id}",
    "Allow dynamic-group producto-icas-qa-instances to use secret-family in compartment id ${oci_identity_compartment.env.id}",
  ]
}
```

Separar en compartments propios lo que es infraestructura interna (DRP, herramientas DevOps) de lo de cada cliente: costos y permisos no se mezclan.

---

## VCN pública + privada

```hcl
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  cidr_blocks    = [var.vcn_cidr, var.private_subnet_cidr]   # varios bloques permitidos
  display_name   = "${var.project_name}-vcn"
  dns_label      = replace(var.project_name, "-", "")         # solo alfanumérico, máx. 15
}

resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-igw"
}

resource "oci_core_nat_gateway" "nat" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-nat"
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.igw.id
  }
}

resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.nat.id
  }
}

resource "oci_core_subnet" "private" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.main.id
  cidr_block                 = var.private_subnet_cidr
  route_table_id             = oci_core_route_table.private.id
  prohibit_public_ip_on_vnic = true
  dns_label                  = "private"
}
```

> **Gotcha #1 de OCI:** una instancia sin IP pública en una subnet que rutea al Internet Gateway **no tiene salida a internet**. Síntoma típico: el bootstrap falla al primer download (`Unable to connect to the remote server`). Solución: subnet privada → route table → **NAT Gateway**.

### Elegir CIDRs que no choquen

Si los hosts se conectan por VPN a redes de terceros, revisar rangos antes de elegir el CIDR de la VCN. Un `/24` local siempre gana a la ruta empujada por la VPN, y el tráfico hacia ese tercero se rompe **sin error visible**. En la práctica: evitar `172.16.0.0/12` si los partners lo usan, y documentarlo en la variable:

```hcl
variable "vcn_cidr" {
  description = "CIDR de la VCN. NO usar 172.16.0.0/12: se solapa con redes de partners alcanzadas por VPN."
  type        = string
  default     = "192.168.250.0/24"
}
```

---

## NSG por rol

```hcl
resource "oci_core_network_security_group" "app" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project_name}-app-nsg"
}

resource "oci_core_network_security_group_security_rule" "ssh_admin" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "INGRESS"
  protocol                  = "6"            # TCP (ICMP = "1", UDP = "17", todo = "all")
  source                    = var.admin_cidr
  source_type               = "CIDR_BLOCK"
  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_ports" {
  for_each = toset(["8080", "3000"])

  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = var.admin_cidr
  source_type               = "CIDR_BLOCK"
  description               = "App ${each.value}"
  tcp_options {
    destination_port_range {
      min = tonumber(each.value)
      max = tonumber(each.value)
    }
  }
}
```

Buenas prácticas:

- Un NSG por **rol** (público, app privada, DB, agente de build), no uno compartido: una VM privada no debe heredar reglas `0.0.0.0/0` de la pública.
- RDP/SSH a VMs privadas: solo desde el CIDR de la VCN (vía bastion o túnel SSH), nunca desde internet.
- Para SQL Server Always On / WSFC se necesitan 1433, 5022, 135, 445, 3343 y el rango RPC dinámico 49152-65535 entre nodos.

> **Gotcha #2:** las imágenes Ubuntu de OCI traen `iptables` con una regla que solo permite el 22. Aunque el NSG esté abierto, el puerto queda bloqueado en el host. Abrirlo en cloud-init:
>
> ```yaml
> runcmd:
>   - |
>     for p in 8080 3000; do iptables -I INPUT 1 -p tcp --dport "$p" -m state --state NEW -j ACCEPT; done
>   - netfilter-persistent save
> ```
>
> En Oracle Linux se usa `firewalld` (`firewall-cmd --permanent --add-port=8080/tcp`).

---

## Instancias: imagen, shape, IP

```hcl
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = var.shape            # filtra imágenes compatibles con el shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "host" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "${var.project_name}-host"
  shape               = "VM.Standard.E4.Flex"

  shape_config {
    ocpus         = 4        # = 8 vCPU
    memory_in_gbs = 32
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = 150
  }

  create_vnic_details {
    subnet_id        = var.subnet_id
    assign_public_ip = false
    private_ip       = var.private_ip   # fija si otra config la referencia
    nsg_ids          = var.nsg_ids
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(templatefile("${path.module}/templates/cloud-init.yaml.tpl", { ... }))
  }

  lifecycle {
    ignore_changes = [metadata["user_data"], source_details[0].source_id]
  }
}
```

| Valor de `operating_system_version` | Coincide con |
|-------------------------------------|--------------|
| `"24.04"` (Canonical Ubuntu) | Ubuntu 24.04 |
| `"Server 2022 Standard"` (Windows) | Windows Server 2022 Standard con GUI |
| `"9"` (Oracle Linux) | Oracle Linux 9 |

> El usuario por defecto es `ubuntu` en Ubuntu y `opc` en Oracle Linux. Windows genera una password inicial que se obtiene con `oci compute instance get-windows-initial-creds`.

Agent plugins útiles a habilitar en `agent_config`: *Bastion*, *OS Management Service Agent*, *Compute Instance Run Command*, *Compute Instance Monitoring*, *Vulnerability Scanning*, *Block Volume Management*.

---

## CLI útil

```bash
oci iam compartment list --compartment-id-in-subtree true --all --query 'data[].{name:name,id:id}' --output table
oci compute image list -c <compartment> --operating-system "Windows" --shape VM.Standard3.Flex --sort-by TIMECREATED --limit 3
oci compute instance list -c <compartment> --lifecycle-state RUNNING --output table
oci os ns get                                     # namespace de Object Storage
oci compute instance get-windows-initial-creds --instance-id <ocid>
```
