---
title: "Módulos en Terraform: Estructura, Reutilización y Registry"
category: "terraform"
tags: ["modulos", "reutilizacion", "estructura", "registry"]
keywords: ["modulo terraform", "crear modulo terraform", "estructura modulo", "reutilizar codigo terraform", "terraform registry", "modulo publico", "fuente modulo", "source modulo", "versionar modulo", "llamar modulo", "module terraform", "modulo aws vpc", "modulo git source"]
description: "Creación de módulos reutilizables, estructura recomendada, uso de módulos públicos del registry y versionado de módulos propios en Git."
---

# Módulos en Terraform

## Contenido

- [Estructura de un módulo](#estructura-de-un-módulo)
- [Llamar un módulo](#llamar-un-módulo)
- [Sources de módulos](#sources-de-módulos)
- [Módulos públicos del Terraform Registry](#módulos-públicos-del-terraform-registry)
- [Versionado de módulos propios](#versionado-de-módulos-propios)
- [Estructura de proyecto completa](#estructura-de-proyecto-completa)
- [Pasar providers a módulos](#pasar-providers-a-módulos)

---

Un módulo es cualquier directorio con archivos `.tf`. El directorio raíz donde corrés `terraform apply` es el módulo raíz. Todo lo demás son módulos hijos.

---

## Estructura de un módulo

```
modules/
└── networking/
    ├── main.tf          # recursos principales
    ├── variables.tf     # inputs del módulo
    ├── outputs.tf       # valores que expone hacia afuera
    ├── versions.tf      # required_providers y required_version
    └── README.md        # documentación (qué hace, variables, outputs)
```

```hcl
# modules/networking/versions.tf
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# modules/networking/variables.tf
variable "vpc_cidr" {
  type        = string
  description = "CIDR block del VPC"
}

variable "environment" {
  type        = string
  description = "Nombre del entorno"
}

variable "availability_zones" {
  type        = list(string)
  description = "Lista de AZs donde crear subnets"
}

# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-${count.index + 1}"
    Tier = "private"
  }
}

# modules/networking/outputs.tf
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID del VPC creado"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "IDs de las subnets privadas"
}
```

---

## Llamar un módulo

```hcl
# environments/prod/main.tf
module "networking" {
  source = "../../modules/networking"   # path relativo

  vpc_cidr           = "10.0.0.0/16"
  environment        = "prod"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Usar outputs del módulo
module "compute" {
  source     = "../../modules/compute"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}
```

```bash
# Tras agregar o cambiar un módulo, siempre init primero
terraform init
terraform plan
```

---

## Sources de módulos

```hcl
# Path local
source = "../../modules/networking"

# Registry público de Terraform
source  = "terraform-aws-modules/vpc/aws"
version = "~> 5.0"

# Repositorio Git (tag)
source = "git::https://github.com/mi-org/tf-modules.git//networking?ref=v1.2.0"

# Repositorio Git (rama — no recomendado en prod)
source = "git::https://github.com/mi-org/tf-modules.git//networking?ref=main"

# SSH
source = "git::git@github.com:mi-org/tf-modules.git//networking?ref=v1.2.0"

# GitHub shorthand
source = "github.com/mi-org/tf-modules//networking"

# Subdirecotrio dentro del repo (notar la doble barra //)
source = "git::https://github.com/mi-org/tf-modules.git//modules/networking?ref=v2.0"
```

---

## Módulos públicos del Terraform Registry

```hcl
# VPC de AWS (el más usado)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "prod-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false   # uno por AZ en prod

  tags = local.common_tags
}

# EKS
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "prod-cluster"
  cluster_version = "1.29"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
}
```

---

## Versionado de módulos propios

Para módulos en un repo Git de la empresa:

```bash
# Taggear una versión del módulo
git tag -a v1.2.0 -m "feat(networking): add VPC flow logs support"
git push origin v1.2.0
```

```hcl
# Fijar versión — siempre en producción
module "networking" {
  source = "git::git@github.com:mi-org/tf-modules.git//networking?ref=v1.2.0"
  # ...
}
```

---

## Estructura de proyecto completa

```
infra/
├── modules/                     # módulos reutilizables internos
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── versions.tf
│   ├── compute/
│   └── database/
│
├── environments/                # un directorio = un state
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── dev.auto.tfvars
│   ├── staging/
│   └── prod/
│
└── global/                      # recursos compartidos entre entornos
    ├── iam/
    └── dns/
```

---

## Pasar providers a módulos

```hcl
# Módulo que necesita un provider con alias
module "replica_eu" {
  source = "../../modules/database"

  providers = {
    aws = aws.eu_central    # pasamos el provider con alias
  }
}
```

```hcl
# Dentro del módulo, declarar que acepta providers externos
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.0"
      configuration_aliases = [aws]
    }
  }
}
```
