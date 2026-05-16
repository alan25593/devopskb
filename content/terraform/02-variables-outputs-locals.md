---
title: "Variables, Outputs y Locals en Terraform"
category: "terraform"
tags: ["variables", "outputs", "locals", "tfvars", "tipos"]
keywords: ["variable terraform", "output terraform", "locals terraform", "tfvars", "variable sensible", "sensitive terraform", "tipo variable", "validacion variable", "pasar variable terraform", "TF_VAR", "variable de entorno terraform", "default variable", "output entre modulos", "local variable terraform"]
description: "Declaración y uso de variables de entrada, locals para evitar repetición, outputs para exponer valores y manejo seguro de variables sensibles."
---

# Variables, Outputs y Locals

## Contenido

- [Variables de entrada](#variables-de-entrada)
- [Formas de pasar valores a variables](#formas-de-pasar-valores-a-variables)
- [Locals](#locals)
- [Outputs](#outputs)

---

## Variables de entrada

```hcl
# Declaración básica
variable "instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
  default     = "t3.micro"
}

# Variable sin default — Terraform la pide interactivamente
variable "environment" {
  description = "Entorno de despliegue (dev, staging, prod)"
  type        = string
}

# Variable sensible — no se muestra en plan/apply/logs
variable "db_password" {
  description = "Password de la base de datos"
  type        = string
  sensitive   = true
}
```

### Tipos disponibles

```hcl
# Primitivos
variable "nombre"    { type = string }
variable "puerto"    { type = number }
variable "habilitado" { type = bool }

# Colecciones
variable "zonas" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

variable "tags" {
  type = map(string)
  default = {
    Project = "mi-app"
    Team    = "infra"
  }
}

variable "instancias" {
  type = set(string)
}

# Objeto con forma fija
variable "db_config" {
  type = object({
    host     = string
    port     = number
    name     = string
    replicas = optional(number, 1)
  })
}

# Tuple
variable "reglas" {
  type = tuple([string, number, bool])
}

# Any — sin validación de tipo
variable "config" {
  type = any
}
```

### Validaciones

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "El entorno debe ser dev, staging o prod."
  }
}

variable "instance_type" {
  type = string

  validation {
    condition     = can(regex("^t[23]\\.", var.instance_type))
    error_message = "Solo se permiten instancias t2 o t3."
  }
}

variable "cidr_block" {
  type = string

  validation {
    condition     = can(cidrnetmask(var.cidr_block))
    error_message = "El valor debe ser un CIDR válido."
  }
}
```

---

## Formas de pasar valores a variables

Orden de precedencia (mayor a menor):

```bash
# 1. Flag -var en la línea de comandos
terraform apply -var="environment=prod" -var="instance_type=t3.small"

# 2. Archivo -var-file
terraform apply -var-file="prod.tfvars"

# 3. Archivos automáticos (cargados siempre sin especificar)
#    terraform.tfvars
#    terraform.tfvars.json
#    *.auto.tfvars
#    *.auto.tfvars.json

# 4. Variables de entorno con prefijo TF_VAR_
export TF_VAR_environment=prod
export TF_VAR_db_password=supersecret
terraform apply

# 5. Default en la declaración de la variable
```

### Archivos .tfvars

```hcl
# terraform.tfvars — se carga automáticamente
environment   = "prod"
instance_type = "t3.medium"
region        = "us-east-1"

db_config = {
  host     = "db.interno.empresa.com"
  port     = 5432
  name     = "appdb"
  replicas = 3
}

tags = {
  Project     = "mi-app"
  Environment = "prod"
  CostCenter  = "CC-1234"
}
```

```bash
# Un .tfvars por entorno
terraform apply -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

---

## Locals

Valores calculados reutilizables dentro de un módulo. No son inputs ni outputs — son internos.

```hcl
locals {
  # Prefijo estándar para todos los recursos
  name_prefix = "${var.project}-${var.environment}"

  # Tags comunes aplicados a todo
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    CreatedAt   = timestamp()
  }

  # Cálculos reutilizables
  is_production  = var.environment == "prod"
  instance_count = local.is_production ? 3 : 1

  # Construcción de ARNs o nombres complejos
  bucket_name = "${local.name_prefix}-assets-${data.aws_caller_identity.current.account_id}"
}

resource "aws_instance" "web" {
  count         = local.instance_count
  ami           = var.ami_id
  instance_type = local.is_production ? "t3.medium" : "t3.micro"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-${count.index + 1}"
  })
}
```

---

## Outputs

Exponen valores del módulo hacia afuera — el módulo padre puede usarlos, o se muestran tras el apply.

```hcl
# outputs.tf
output "instance_id" {
  description = "ID de la instancia EC2"
  value       = aws_instance.web.id
}

output "public_ip" {
  description = "IP pública de la instancia"
  value       = aws_instance.web.public_ip
}

# Output sensible — no se muestra en consola
output "db_connection_string" {
  description = "String de conexión a la base de datos"
  value       = "postgresql://${var.db_user}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}

# Output de una lista de valores
output "subnet_ids" {
  description = "IDs de todas las subnets creadas"
  value       = aws_subnet.private[*].id
}
```

```bash
# Ver outputs tras el apply
terraform output

# Ver un output específico (en texto plano, útil en scripts)
terraform output public_ip

# Ver outputs en JSON (para parsear en CI)
terraform output -json
```

### Outputs entre módulos

```hcl
# modules/networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

# environments/prod/main.tf
module "networking" {
  source = "../../modules/networking"
  cidr   = "10.0.0.0/16"
}

module "compute" {
  source            = "../../modules/compute"
  vpc_id            = module.networking.vpc_id
  subnet_ids        = module.networking.private_subnet_ids
}
```
