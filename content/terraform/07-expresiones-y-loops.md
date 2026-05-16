---
title: "Terraform: Expresiones, Loops y Dynamic Blocks"
category: "terraform"
tags: ["for-each", "count", "dynamic", "expresiones", "funciones", "condicionales"]
keywords: ["for_each terraform", "count terraform", "dynamic block terraform", "loop terraform", "condicional terraform", "for expression terraform", "splat operator", "funciones terraform", "toset terraform", "zipmap terraform", "lookup terraform", "for_each map", "crear multiples recursos terraform", "iterar recursos terraform"]
description: "Meta-argumentos count y for_each, dynamic blocks, expresiones for, operadores ternarios y las funciones HCL más útiles para escribir código Terraform expresivo y DRY."
---

# Expresiones, Loops y Dynamic Blocks

## Contenido

- [count — crear N copias de un recurso](#count-—-crear-n-copias-de-un-recurso)
- [for_each — crear recursos desde un mapa o set](#for_each-—-crear-recursos-desde-un-mapa-o-set)
- [Expresiones for](#expresiones-for)
- [Dynamic blocks](#dynamic-blocks)
- [Operador ternario y condicionales](#operador-ternario-y-condicionales)
- [Funciones HCL más útiles](#funciones-hcl-más-útiles)

---

## count — crear N copias de un recurso

```hcl
# Crear 3 instancias
resource "aws_instance" "web" {
  count         = 3
  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name = "web-${count.index + 1}"   # web-1, web-2, web-3
  }
}

# Condicional — crear el recurso solo en prod
resource "aws_cloudwatch_alarm" "high_cpu" {
  count = var.environment == "prod" ? 1 : 0

  alarm_name = "high-cpu-prod"
  # ...
}

# Referencia a una instancia específica
output "first_instance_id" {
  value = aws_instance.web[0].id
}

# Referencia a todos
output "all_instance_ids" {
  value = aws_instance.web[*].id   # splat operator
}
```

**Problema con count:** si eliminás el ítem del medio de una lista, Terraform recrea todos los recursos posteriores porque se indexan por posición.

---

## for_each — crear recursos desde un mapa o set

Más robusto que `count` — cada recurso tiene una clave estable.

```hcl
# Desde un set de strings
resource "aws_iam_user" "team" {
  for_each = toset(["alice", "bob", "carol"])
  name     = each.value
}

# Desde un mapa
variable "buckets" {
  type = map(object({
    versioning = bool
    region     = string
  }))
  default = {
    assets  = { versioning = true,  region = "us-east-1" }
    backups = { versioning = true,  region = "us-west-2" }
    logs    = { versioning = false, region = "us-east-1" }
  }
}

resource "aws_s3_bucket" "buckets" {
  for_each = var.buckets
  bucket   = "${var.project}-${each.key}"

  tags = {
    Name   = each.key
    Region = each.value.region
  }
}

resource "aws_s3_bucket_versioning" "buckets" {
  for_each = { for k, v in var.buckets : k => v if v.versioning }
  bucket   = aws_s3_bucket.buckets[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}

# Referencia a un recurso específico
output "assets_bucket_arn" {
  value = aws_s3_bucket.buckets["assets"].arn
}
```

---

## Expresiones for

Transformar y filtrar colecciones:

```hcl
# Lista → lista transformada
locals {
  upper_names = [for name in var.names : upper(name)]

  # Solo los mayores de 18
  adults = [for person in var.people : person if person.age >= 18]
}

# Lista → mapa
locals {
  # { "alice" = "arn:...", "bob" = "arn:..." }
  user_arns = { for user in aws_iam_user.team : user.name => user.arn }
}

# Mapa → mapa filtrado y transformado
locals {
  prod_instances = {
    for k, v in var.instances : k => v
    if v.environment == "prod"
  }
}

# Mapa → lista de valores
locals {
  all_subnet_ids = [for subnet in aws_subnet.private : subnet.id]
}
```

---

## Dynamic blocks

Generan bloques repetidos dentro de un recurso:

```hcl
variable "ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    { port = 80,  protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { port = 443, protocol = "tcp", cidr_blocks = ["0.0.0.0/0"] },
    { port = 22,  protocol = "tcp", cidr_blocks = ["10.0.0.0/8"] },
  ]
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = var.vpc_id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Dynamic blocks anidados:

```hcl
resource "aws_wafv2_rule_group" "example" {
  dynamic "rule" {
    for_each = var.waf_rules
    content {
      name     = rule.value.name
      priority = rule.key

      dynamic "statement" {
        for_each = rule.value.statements
        content {
          # ...
        }
      }
    }
  }
}
```

---

## Operador ternario y condicionales

```hcl
# condition ? valor_si_true : valor_si_false
instance_type = var.environment == "prod" ? "t3.large" : "t3.micro"

# Condicional para habilitar/deshabilitar un recurso
resource "aws_waf_web_acl" "main" {
  count = var.enable_waf ? 1 : 0
  # ...
}

# Valor con fallback
local {
  db_port = var.db_port != null ? var.db_port : 5432
  # equivalente con coalesce:
  db_port = coalesce(var.db_port, 5432)
}
```

---

## Funciones HCL más útiles

```hcl
# Strings
upper("hello")                    # "HELLO"
lower("HELLO")                    # "hello"
replace("hello world", " ", "-")  # "hello-world"
format("web-%02d", 3)             # "web-03"
trimspace("  hola  ")             # "hola"
split(",", "a,b,c")               # ["a", "b", "c"]
join("-", ["a", "b", "c"])        # "a-b-c"
startswith("prod-vpc", "prod")    # true

# Listas
length(["a", "b", "c"])           # 3
concat(["a"], ["b", "c"])         # ["a", "b", "c"]
flatten([["a", "b"], ["c"]])      # ["a", "b", "c"]
distinct(["a", "b", "a"])         # ["a", "b"]
slice(["a","b","c","d"], 1, 3)    # ["b", "c"]
toset(["a", "b", "a"])            # { "a", "b" }

# Mapas
merge({a=1}, {b=2})               # { a=1, b=2 }
lookup({a="x", b="y"}, "a", "z") # "x" (z es el default)
keys({a=1, b=2})                  # ["a", "b"]
values({a=1, b=2})                # [1, 2]
zipmap(["a","b"], [1, 2])         # { a=1, b=2 }

# Networking
cidrsubnet("10.0.0.0/16", 8, 1)  # "10.0.1.0/24"
cidrhost("10.0.1.0/24", 5)       # "10.0.1.5"
cidrnetmask("10.0.0.0/16")       # "255.255.0.0"

# Encoding
jsonencode({name = "valor"})      # "{\"name\":\"valor\"}"
jsondecode("{\"name\":\"valor\"}") # { name = "valor" }
base64encode("hola")              # "aG9sYQ=="
base64decode("aG9sYQ==")          # "hola"

# Ficheros
file("${path.module}/scripts/init.sh")
templatefile("${path.module}/configs/app.conf.tpl", { port = 8080 })

# Tipos
tostring(42)                      # "42"
tonumber("42")                    # 42
tobool("true")                    # true
can(regex("^v\\d+", "v1.2.0"))    # true (no lanza error)
try(var.config.port, 8080)        # 8080 si config.port no existe
```
