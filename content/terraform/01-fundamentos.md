---
title: "Terraform Fundamentos: HCL, Providers, Recursos y Ciclo de Vida"
category: "terraform"
tags: ["fundamentos", "hcl", "providers", "recursos", "plan", "apply"]
keywords: ["que es terraform", "como funciona terraform", "hcl sintaxis", "provider terraform", "recurso terraform", "terraform init", "terraform plan", "terraform apply", "terraform destroy", "ciclo de vida terraform", "infraestructura como codigo", "iac", "bloque terraform", "resource block"]
description: "Conceptos base de Terraform: sintaxis HCL, configuración de providers, ciclo completo de plan/apply/destroy y gestión del ciclo de vida de recursos."
---

# Terraform Fundamentos

## Contenido

- [¿Qué es Terraform?](#qué-es-terraform)
- [Sintaxis HCL](#sintaxis-hcl)
- [Configuración del bloque terraform](#configuración-del-bloque-terraform)
- [Providers](#providers)
- [Ciclo de vida completo](#ciclo-de-vida-completo)
- [Lifecycle rules](#lifecycle-rules)
- [Dependencias](#dependencias)
- [Targets — apply/destroy selectivo](#targets-—-apply/destroy-selectivo)
- [terraform console — REPL para probar expresiones](#terraform-console-—-repl-para-probar-expresiones)

---

## ¿Qué es Terraform?

Terraform es una herramienta de Infraestructura como Código (IaC) que permite definir, provisionar y gestionar infraestructura cloud en archivos de texto declarativos. Terraform calcula la diferencia entre el estado deseado (tu código) y el estado real (la nube) y aplica solo los cambios necesarios.

---

## Sintaxis HCL

```hcl
# Comentario de línea

/*
  Comentario
  de bloque
*/

# Bloque básico: tipo "nombre_tipo" "nombre_local" { ... }
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}

# Referencia a otro recurso: tipo.nombre.atributo
resource "aws_eip" "web_ip" {
  instance = aws_instance.web.id
}
```

Tipos de bloques principales:

| Bloque | Para qué sirve |
|---|---|
| `terraform {}` | Configuración global: versión, backend, providers requeridos |
| `provider {}` | Configurar un proveedor (AWS, GCP, Azure...) |
| `resource {}` | Crear/gestionar un recurso de infraestructura |
| `data {}` | Leer datos existentes sin crear nada |
| `variable {}` | Declarar inputs parametrizables |
| `output {}` | Exponer valores tras el apply |
| `locals {}` | Variables locales calculadas |
| `module {}` | Reutilizar código empaquetado |

---

## Configuración del bloque terraform

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"    # permite 5.x, bloquea 6.x
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket  = "mi-empresa-tfstate"
    key     = "prod/main.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
```

---

## Providers

```hcl
# Provider básico
provider "aws" {
  region = "us-east-1"
}

# Múltiples providers del mismo tipo (alias)
provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_central"
  region = "eu-central-1"
}

# Usar provider con alias
resource "aws_instance" "web_eu" {
  provider      = aws.eu_central
  ami           = "ami-..."
  instance_type = "t3.micro"
}
```

---

## Ciclo de vida completo

```bash
# 1. Inicializar — descarga providers y módulos
terraform init

# Reinicializar tras cambiar backend o providers
terraform init -upgrade

# 2. Formatear código
terraform fmt
terraform fmt -recursive    # también en subdirectorios

# 3. Validar sintaxis y referencias
terraform validate

# 4. Ver qué va a cambiar (no toca nada)
terraform plan

# Guardar el plan para aplicar exactamente ese snapshot
terraform plan -out=tfplan

# 5. Aplicar los cambios
terraform apply

# Aplicar el plan guardado (recomendado en CI/CD)
terraform apply tfplan

# Aplicar sin confirmación interactiva
terraform apply -auto-approve

# 6. Destruir infraestructura
terraform destroy
terraform destroy -auto-approve

# Destruir solo un recurso específico
terraform destroy -target=aws_instance.web
```

---

## Lifecycle rules

Controlan comportamientos especiales en el ciclo de vida de un recurso:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    # Crear el nuevo recurso antes de destruir el viejo (zero-downtime)
    create_before_destroy = true

    # Impedir que terraform destroy afecte este recurso
    prevent_destroy = true

    # Ignorar cambios en estos atributos (ej: modificados externamente)
    ignore_changes = [
      ami,
      tags["LastModified"],
    ]

    # Condición custom que debe cumplirse para aplicar
    precondition {
      condition     = var.instance_type != "t2.micro"
      error_message = "t2.micro no está permitido en producción."
    }
  }
}
```

---

## Dependencias

Terraform infiere dependencias automáticamente por referencias. También se pueden declarar explícitamente:

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "mi-app-logs"
}

resource "aws_instance" "web" {
  ami           = "ami-..."
  instance_type = "t3.micro"

  # Dependencia explícita — web se crea después de que exista el bucket
  depends_on = [aws_s3_bucket.logs]
}
```

---

## Targets — apply/destroy selectivo

```bash
# Aplicar solo un recurso
terraform apply -target=aws_instance.web

# Aplicar solo un módulo
terraform apply -target=module.networking

# Destruir solo un recurso
terraform destroy -target=aws_security_group.old

# Planear múltiples targets
terraform plan \
  -target=aws_instance.web \
  -target=aws_security_group.web_sg
```

> Usar targets solo para emergencias o bootstrapping inicial. En condiciones normales, Terraform debe gestionar todo el grafo de dependencias.

---

## terraform console — REPL para probar expresiones

```bash
terraform console
```

```hcl
> "hello ${var.environment}"
"hello production"

> length(["a", "b", "c"])
3

> cidrsubnet("10.0.0.0/16", 8, 1)
"10.0.1.0/24"
```
